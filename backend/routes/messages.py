"""
Messaging Routes Module

Handles real-time messaging between users (Mom <-> Provider, Provider <-> Provider).
All messages are now client-centric with auto-populated client_id.

Pre-Acceptance Messaging (v1.1):
- A Mom can message any marketplace provider WITHOUT prior acceptance.
- The first Mom->Provider message auto-creates a `conversation_thread` with
  status="pre_acceptance".
- The provider can reply within the thread, and can "Accept as Client" or
  "Decline" from inside the chat.
- Accepting atomically creates the formal share_request + clients records,
  unlocking scheduling/contracts/birth-plan sharing.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from .dependencies import db, generate_id, get_now, create_notification, ws_manager, get_current_user, check_role, User
from .relationship_utils import (
    verify_active_relationship,
    get_active_mom_ids_for_provider,
    get_active_relationship,
    get_thread_between,
    get_active_thread_between,
)

router = APIRouter(prefix="/messages", tags=["Messages"])

PROVIDER_ROLES = ["DOULA", "MIDWIFE", "LACTATION"]


# ============== REQUEST MODELS ==============

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    client_id: Optional[str] = None


class DeclineRequest(BaseModel):
    reason: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

async def check_provider_can_message(provider_id: str, mom_id: str) -> bool:
    """Check if a provider has messaging permission with a mom"""
    # Check for active share request with can_message permission
    share_request = await get_active_relationship(provider_id, mom_id)

    if share_request:
        # Check if can_message permission is granted (defaults to True if not specified)
        return share_request.get("can_message", True)

    # Also check for linked clients
    client = await db.clients.find_one({
        "provider_id": provider_id,
        "linked_mom_id": mom_id
    })

    return client is not None


async def _resolve_thread(mom_user_id: str, provider_id: str) -> Optional[dict]:
    """Get the active thread between a mom and provider, or None."""
    return await get_active_thread_between(mom_user_id, provider_id)


async def _create_pre_acceptance_thread(mom_user_id: str, provider_id: str, first_message: str) -> dict:
    """
    Create a pre_acceptance conversation_thread between a mom and provider.
    Uses an upsert to guarantee a single thread per (mom, provider) pair.
    """
    now = get_now()
    thread = {
        "thread_id": f"thread_{uuid.uuid4().hex[:12]}",
        "mom_user_id": mom_user_id,
        "provider_id": provider_id,
        "status": "pre_acceptance",
        "source": "marketplace_message",
        "accepted_at": None,
        "accepted_by": None,
        "declined_at": None,
        "decline_reason": None,
        "created_at": now,
        "updated_at": now,
        "metadata": {
            "mom_first_message": first_message,
            "provider_first_reply": None,
            "lead_id": None,
        },
    }
    # Upsert on the unique (mom_user_id, provider_id) pair to avoid duplicates
    await db.conversation_threads.update_one(
        {"mom_user_id": mom_user_id, "provider_id": provider_id},
        {"$setOnInsert": thread},
        upsert=True,
    )
    return await db.conversation_threads.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": provider_id,
    })


async def _can_send_message(sender: User, receiver: dict) -> tuple[bool, Optional[str], Optional[dict]]:
    """
    Determine whether a message can be sent and what thread context applies.

    Returns (allowed, thread_status, thread).
    - thread_status: "accepted" | "pre_acceptance" | "declined" | "terminated" | None
    - thread: the conversation_thread doc if one exists/created, else None
    """
    sender_role = sender.role
    receiver_role = receiver.get("role")

    # Case 1: Mom <-> Provider
    if sender_role == "MOM" and receiver_role in PROVIDER_ROLES:
        # Existing formal relationship (accepted share_request or linked client)
        if await check_provider_can_message(receiver.get("user_id"), sender.user_id):
            return True, "accepted", None
        # Existing active thread
        thread = await _resolve_thread(sender.user_id, receiver.get("user_id"))
        if thread:
            return True, thread["status"], thread
        # Existing thread that is declined/terminated -> blocked
        existing = await get_thread_between(sender.user_id, receiver.get("user_id"))
        if existing:
            return False, existing["status"], existing
        # No relationship, no thread -> Mom initiates pre-acceptance
        return True, "create_pre_acceptance", None

    elif sender_role in PROVIDER_ROLES and receiver_role == "MOM":
        # Existing formal relationship
        if await check_provider_can_message(sender.user_id, receiver.get("user_id")):
            return True, "accepted", None
        # Existing active thread
        thread = await _resolve_thread(receiver.get("user_id"), sender.user_id)
        if thread:
            return True, thread["status"], thread
        # Existing declined/terminated thread -> blocked
        existing = await get_thread_between(receiver.get("user_id"), sender.user_id)
        if existing:
            return False, existing["status"], existing
        # Provider cannot cold-message a Mom who has not messaged them first
        return False, "no_thread", None

    # Case 2: Provider <-> Provider (requires shared common client)
    elif sender_role in PROVIDER_ROLES and receiver_role in PROVIDER_ROLES:
        sender_moms = set(await get_active_mom_ids_for_provider(sender.user_id))
        receiver_moms = set(await get_active_mom_ids_for_provider(receiver.get("user_id")))
        shared_clients = sender_moms & receiver_moms
        if not shared_clients:
            return False, "no_shared_client", None
        return True, "accepted", None

    # Case 3: Mom <-> Mom (not supported)
    return False, "unsupported", None


# ============== ROUTES ==============

@router.get("/conversations")
async def get_conversations(user: User = Depends(get_current_user())):
    """Get all conversations for the current user"""
    # Find all unique conversations where user is sender or receiver
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": user.user_id},
                    {"receiver_id": user.user_id}
                ]
            }
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", user.user_id]},
                        "$receiver_id",
                        "$sender_id"
                    ]
                },
                "last_message": {"$first": "$$ROOT"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$receiver_id", user.user_id]},
                                {"$eq": ["$read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            "$sort": {"last_message.created_at": -1}
        }
    ]

    conversations_cursor = db.messages.aggregate(pipeline)
    conversations = await conversations_cursor.to_list(100)

    # Enhance with user info
    result = []
    for conv in conversations:
        other_user_id = conv["_id"]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "password_hash": 0})

        if other_user:
            last_msg = conv["last_message"]
            # Determine thread status for this conversation
            thread_status = None
            source = None
            can_accept = False
            can_decline = False
            thread_id = None

            # If the other user is a provider and current user is a mom (or vice versa),
            # look up the thread to annotate pre-acceptance state.
            if other_user.get("role") in PROVIDER_ROLES and user.role == "MOM":
                thread = await get_thread_between(user.user_id, other_user_id)
                if thread:
                    thread_status = thread.get("status")
                    source = thread.get("source")
                    thread_id = thread.get("thread_id")
            elif other_user.get("role") == "MOM" and user.role in PROVIDER_ROLES:
                thread = await get_thread_between(other_user_id, user.user_id)
                if thread:
                    thread_status = thread.get("status")
                    source = thread.get("source")
                    thread_id = thread.get("thread_id")
                    can_accept = thread_status == "pre_acceptance"
                    can_decline = thread_status == "pre_acceptance"

            result.append({
                "other_user_id": other_user_id,
                "other_user_name": other_user.get("full_name", "Unknown"),
                "other_user_role": other_user.get("role", ""),
                "other_user_picture": other_user.get("picture"),
                "last_message_content": last_msg.get("content", "")[:50] + ("..." if len(last_msg.get("content", "")) > 50 else ""),
                "last_message_time": last_msg.get("created_at"),
                "unread_count": conv["unread_count"],
                "is_sender": last_msg.get("sender_id") == user.user_id,
                "thread_id": thread_id,
                "thread_status": thread_status,
                "source": source,
                "can_accept": can_accept,
                "can_decline": can_decline,
            })

    return {"conversations": result}


@router.get("/unread/count")
async def get_unread_count(user: User = Depends(get_current_user())):
    """Get count of unread messages"""
    count = await db.messages.count_documents({"receiver_id": user.user_id, "read": False})
    return {"unread_count": count}


@router.get("/{other_user_id}")
async def get_messages(
    other_user_id: str,
    user: User = Depends(get_current_user()),
    limit: int = Query(50, le=200)
):
    """Get messages between current user and another user"""
    # Verify the other user exists
    other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get messages in conversation (both directions)
    messages = await db.messages.find(
        {
            "$or": [
                {"sender_id": user.user_id, "receiver_id": other_user_id},
                {"sender_id": other_user_id, "receiver_id": user.user_id}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)

    # Mark received messages as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )

    # Reverse to show oldest first
    messages.reverse()

    # Determine thread context for pre-acceptance annotation
    thread_info = None
    if other_user.get("role") in PROVIDER_ROLES and user.role == "MOM":
        thread = await get_thread_between(user.user_id, other_user_id)
        if thread:
            thread_info = {
                "thread_id": thread.get("thread_id"),
                "status": thread.get("status"),
                "created_at": thread.get("created_at"),
                "accepted_at": thread.get("accepted_at"),
                "can_accept": False,
                "can_decline": False,
                "decline_reason": thread.get("decline_reason"),
            }
    elif other_user.get("role") == "MOM" and user.role in PROVIDER_ROLES:
        thread = await get_thread_between(other_user_id, user.user_id)
        if thread:
            thread_info = {
                "thread_id": thread.get("thread_id"),
                "status": thread.get("status"),
                "created_at": thread.get("created_at"),
                "accepted_at": thread.get("accepted_at"),
                "can_accept": thread.get("status") == "pre_acceptance",
                "can_decline": thread.get("status") == "pre_acceptance",
                "decline_reason": thread.get("decline_reason"),
            }

    return {
        "messages": messages,
        "other_user": {
            "user_id": other_user_id,
            "full_name": other_user.get("full_name"),
            "role": other_user.get("role"),
            "picture": other_user.get("picture")
        },
        "thread": thread_info,
    }


@router.post("")
async def send_message(message_data: MessageCreate, user: User = Depends(get_current_user())):
    """Send a message to another user"""
    # Verify receiver exists
    receiver = await db.users.find_one({"user_id": message_data.receiver_id}, {"_id": 0})
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found")

    if message_data.receiver_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    if not message_data.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    # Determine messaging permission + thread context
    allowed, thread_status, thread = await _can_send_message(user, receiver)

    if not allowed:
        if thread_status == "no_thread":
            raise HTTPException(status_code=403, detail="You can only message a provider who has contacted you first")
        if thread_status == "no_shared_client":
            raise HTTPException(status_code=403, detail="You can only message providers who share a common client with you")
        if thread_status in ("declined", "terminated"):
            raise HTTPException(status_code=403, detail="This conversation is no longer active")
        raise HTTPException(status_code=403, detail="You don't have an active connection with this user")

    # Auto-create a pre-acceptance thread if this is a Mom initiating first contact
    resolved_thread_id = None
    if thread_status == "create_pre_acceptance":
        thread = await _create_pre_acceptance_thread(
            user.user_id, message_data.receiver_id, message_data.content.strip()
        )
        resolved_thread_id = thread.get("thread_id")
    elif thread:
        resolved_thread_id = thread.get("thread_id")

    now = get_now()

    # Try to determine client_id from the conversation context
    resolved_client_id = message_data.client_id
    if not resolved_client_id:
        if user.role in PROVIDER_ROLES and receiver.get("role") == "MOM":
            # Provider -> Mom: find client by linked_mom_id
            client = await db.clients.find_one({
                "provider_id": user.user_id,
                "linked_mom_id": message_data.receiver_id
            })
            if client:
                resolved_client_id = client.get("client_id")
        elif user.role == "MOM" and receiver.get("role") in PROVIDER_ROLES:
            # Mom -> Provider: find client by linked_mom_id
            client = await db.clients.find_one({
                "provider_id": message_data.receiver_id,
                "linked_mom_id": user.user_id
            })
            if client:
                resolved_client_id = client.get("client_id")

    message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "sender_id": user.user_id,
        "sender_name": user.full_name,
        "sender_role": user.role,
        "receiver_id": message_data.receiver_id,
        "receiver_name": receiver.get("full_name", "Unknown"),
        "receiver_role": receiver.get("role", ""),
        "content": message_data.content.strip(),
        "read": False,
        "client_id": resolved_client_id,
        "thread_id": resolved_thread_id,
        "created_at": now
    }

    await db.messages.insert_one(message_doc)
    message_doc.pop('_id', None)

    # Update thread metadata on first provider reply
    if thread and thread.get("status") == "pre_acceptance" and user.role in PROVIDER_ROLES:
        if not thread.get("metadata", {}).get("provider_first_reply"):
            await db.conversation_threads.update_one(
                {"thread_id": thread["thread_id"]},
                {"$set": {"metadata.provider_first_reply": message_doc["content"], "updated_at": now}}
            )
    elif resolved_thread_id:
        await db.conversation_threads.update_one(
            {"thread_id": resolved_thread_id},
            {"$set": {"updated_at": now}}
        )

    # Create notification for receiver with sender name and conversation context
    message_body = message_data.content.strip()
    if len(message_body) > 100:
        message_body = message_body[:100] + "..."

    await create_notification(
        user_id=message_data.receiver_id,
        notif_type="message",
        title=user.full_name,
        message=message_body,
        data={
            "sender_id": user.user_id,
            "message_id": message_doc["message_id"],
            "conversationId": user.user_id,
            "type": "message",
            "thread_id": resolved_thread_id,
        }
    )

    # Send real-time WebSocket notification to receiver
    if ws_manager:
        await ws_manager.send_personal_message({
            "type": "new_message",
            "message": {
                "message_id": message_doc["message_id"],
                "sender_id": user.user_id,
                "sender_name": user.full_name,
                "sender_role": user.role,
                "content": message_doc["content"],
                "created_at": message_doc["created_at"].isoformat() if isinstance(message_doc["created_at"], datetime) else message_doc["created_at"],
                "thread_id": resolved_thread_id,
            }
        }, message_data.receiver_id)

    return {"message": "Message sent", "data": message_doc}


# ============== PRE-ACCEPTANCE THREAD ACTIONS ==============

@router.post("/threads/{thread_id}/accept")
async def accept_thread(thread_id: str, user: User = Depends(check_role(PROVIDER_ROLES))):
    """Provider accepts a Mom as a client from a pre-acceptance thread"""
    thread = await db.conversation_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if thread.get("provider_id") != user.user_id:
        raise HTTPException(status_code=403, detail="You don't have access to this thread")

    if thread.get("status") != "pre_acceptance":
        raise HTTPException(status_code=400, detail="Thread is not in pre-acceptance state")

    now = get_now()
    mom_user_id = thread["mom_user_id"]
    provider_id = thread["provider_id"]

    # 1. Update thread to accepted
    await db.conversation_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": now,
            "accepted_by": user.user_id,
            "updated_at": now,
        }}
    )

    # 2. Create/update share_request as accepted + active
    share_request = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_user_id,
    })
    if share_request:
        await db.share_requests.update_one(
            {"_id": share_request["_id"]},
            {"$set": {"status": "accepted", "relationship_status": "active", "responded_at": now}}
        )
        share_request_id = share_request.get("share_request_id") or str(share_request["_id"])
    else:
        share_request_id = f"share_{uuid.uuid4().hex[:12]}"
        await db.share_requests.insert_one({
            "share_request_id": share_request_id,
            "provider_id": provider_id,
            "mom_user_id": mom_user_id,
            "status": "accepted",
            "relationship_status": "active",
            "created_at": now,
            "responded_at": now,
        })

    # 3. Create/update clients record
    client = await db.clients.find_one({
        "provider_id": provider_id,
        "linked_mom_id": mom_user_id,
    })
    if client:
        await db.clients.update_one(
            {"_id": client["_id"]},
            {"$set": {"status": "Active", "updated_at": now}}
        )
        client_id = client.get("client_id")
    else:
        mom = await db.users.find_one({"user_id": mom_user_id}, {"_id": 0})
        client_id = f"client_{uuid.uuid4().hex[:12]}"
        await db.clients.insert_one({
            "client_id": client_id,
            "provider_id": provider_id,
            "linked_mom_id": mom_user_id,
            "name": (mom or {}).get("full_name", "Client"),
            "email": (mom or {}).get("email", ""),
            "status": "Active",
            "created_at": now,
            "updated_at": now,
        })

    # 4. Update leads if one exists for this pair
    await db.leads.update_many(
        {"provider_id": provider_id, "mom_user_id": mom_user_id, "status": {"$ne": "converted_to_client"}},
        {"$set": {"status": "converted_to_client", "updated_at": now}}
    )

    # 5. Notify the Mom
    provider = await db.users.find_one({"user_id": provider_id}, {"_id": 0})
    provider_name = (provider or {}).get("full_name", "Your provider")
    await create_notification(
        user_id=mom_user_id,
        notif_type="client_accepted",
        title="You're a client! 🎉",
        message=f"{provider_name} has accepted you as a client.",
        data={"thread_id": thread_id, "type": "client_accepted"},
    )

    return {
        "message": "Client accepted",
        "thread_id": thread_id,
        "client_id": client_id,
        "share_request_id": share_request_id,
    }


@router.post("/threads/{thread_id}/decline")
async def decline_thread(thread_id: str, body: DeclineRequest = None, user: User = Depends(check_role(PROVIDER_ROLES))):
    """Provider declines a Mom from a pre-acceptance thread"""
    thread = await db.conversation_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if thread.get("provider_id") != user.user_id:
        raise HTTPException(status_code=403, detail="You don't have access to this thread")

    if thread.get("status") != "pre_acceptance":
        raise HTTPException(status_code=400, detail="Thread is not in pre-acceptance state")

    now = get_now()
    reason = (body.reason if body else None) or thread.get("decline_reason")

    # 1. Update thread to declined
    await db.conversation_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {
            "status": "declined",
            "declined_at": now,
            "decline_reason": reason,
            "updated_at": now,
        }}
    )

    # 2. Update leads to declined
    await db.leads.update_many(
        {"provider_id": thread["provider_id"], "mom_user_id": thread["mom_user_id"], "status": {"$ne": "declined"}},
        {"$set": {"status": "declined", "updated_at": now}}
    )

    # 3. Notify the Mom
    provider = await db.users.find_one({"user_id": thread["provider_id"]}, {"_id": 0})
    provider_name = (provider or {}).get("full_name", "The provider")
    await create_notification(
        user_id=thread["mom_user_id"],
        notif_type="client_declined",
        title="Update from your provider",
        message=f"{provider_name} is unable to take on new clients at this time.",
        data={"thread_id": thread_id, "type": "client_declined"},
    )

    return {
        "message": "Conversation declined",
        "thread_id": thread_id,
    }


# ============== PROVIDER CLIENT MESSAGES ==============

@router.get("/client/{client_id}")
async def get_client_messages(
    client_id: str,
    user: User = Depends(check_role(PROVIDER_ROLES))
):
    """Get all messages associated with a specific client (client-centric view)"""
    # Verify the provider has access to this client
    client = await db.clients.find_one({"client_id": client_id, "provider_id": user.user_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Get messages that are tagged with this client_id
    # OR messages between the provider and the linked mom
    query = {"$or": [{"client_id": client_id}]}

    if client.get("linked_mom_id"):
        mom_id = client["linked_mom_id"]
        query["$or"].append({
            "$and": [
                {"$or": [{"sender_id": user.user_id}, {"receiver_id": user.user_id}]},
                {"$or": [{"sender_id": mom_id}, {"receiver_id": mom_id}]}
            ]
        })

    messages = await db.messages.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Ensure datetime is serializable
    for msg in messages:
        if isinstance(msg.get("created_at"), datetime):
            msg["created_at"] = msg["created_at"].isoformat()

    return messages
