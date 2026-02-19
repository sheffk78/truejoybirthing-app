"""
Messaging Routes Module

Handles real-time messaging between users (Mom <-> Provider, Provider <-> Provider).
All messages are now client-centric with auto-populated client_id.
Feature parity with original server.py messaging routes.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from .dependencies import db, generate_id, get_now, create_notification, ws_manager, get_current_user, check_role, User

router = APIRouter(prefix="/messages", tags=["Messages"])


# ============== REQUEST MODELS ==============

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    client_id: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

async def check_provider_can_message(provider_id: str, mom_id: str) -> bool:
    """Check if a provider has messaging permission with a mom"""
    # Check for accepted share request with can_message permission
    share_request = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_id,
        "status": "accepted"
    })
    
    if share_request:
        # Check if can_message permission is granted (defaults to True if not specified)
        return share_request.get("can_message", True)
    
    # Also check for linked clients
    client = await db.clients.find_one({
        "provider_id": provider_id,
        "linked_mom_id": mom_id
    })
    
    return client is not None


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
            result.append({
                "other_user_id": other_user_id,
                "other_user_name": other_user.get("full_name", "Unknown"),
                "other_user_role": other_user.get("role", ""),
                "other_user_picture": other_user.get("picture"),
                "last_message_content": last_msg.get("content", "")[:50] + ("..." if len(last_msg.get("content", "")) > 50 else ""),
                "last_message_time": last_msg.get("created_at"),
                "unread_count": conv["unread_count"],
                "is_sender": last_msg.get("sender_id") == user.user_id
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
    
    return {
        "messages": messages,
        "other_user": {
            "user_id": other_user_id,
            "full_name": other_user.get("full_name"),
            "role": other_user.get("role"),
            "picture": other_user.get("picture")
        }
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
    
    # Check messaging permissions based on roles
    sender_role = user.role
    receiver_role = receiver.get("role")
    
    # Mom <-> Provider messaging requires an active connection with can_message permission
    if sender_role == "MOM" and receiver_role in ["DOULA", "MIDWIFE"]:
        can_msg = await check_provider_can_message(message_data.receiver_id, user.user_id)
        if not can_msg:
            raise HTTPException(status_code=403, detail="You don't have an active connection with this provider")
    elif sender_role in ["DOULA", "MIDWIFE"] and receiver_role == "MOM":
        can_msg = await check_provider_can_message(user.user_id, message_data.receiver_id)
        if not can_msg:
            raise HTTPException(status_code=403, detail="You don't have an active connection with this client")
    # Doula <-> Midwife messaging only allowed if they share a common client
    elif sender_role in ["DOULA", "MIDWIFE"] and receiver_role in ["DOULA", "MIDWIFE"]:
        sender_clients = await db.share_requests.find({"provider_id": user.user_id, "status": "accepted"}).to_list(1000)
        receiver_clients = await db.share_requests.find({"provider_id": message_data.receiver_id, "status": "accepted"}).to_list(1000)
        sender_mom_ids = {c["mom_user_id"] for c in sender_clients}
        receiver_mom_ids = {c["mom_user_id"] for c in receiver_clients}
        shared_clients = sender_mom_ids & receiver_mom_ids
        if not shared_clients:
            raise HTTPException(status_code=403, detail="You can only message providers who share a common client with you")
    
    now = get_now()
    
    # Try to determine client_id from the conversation context
    resolved_client_id = message_data.client_id
    if not resolved_client_id:
        if sender_role in ["DOULA", "MIDWIFE"] and receiver_role == "MOM":
            # Provider -> Mom: find client by linked_mom_id
            client = await db.clients.find_one({
                "provider_id": user.user_id,
                "linked_mom_id": message_data.receiver_id
            })
            if client:
                resolved_client_id = client.get("client_id")
        elif sender_role == "MOM" and receiver_role in ["DOULA", "MIDWIFE"]:
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
        "created_at": now
    }
    
    await db.messages.insert_one(message_doc)
    message_doc.pop('_id', None)
    
    # Create notification for receiver
    await create_notification(
        user_id=message_data.receiver_id,
        notif_type="new_message",
        title="New Message",
        message=f"{user.full_name} sent you a message",
        data={"sender_id": user.user_id, "message_id": message_doc["message_id"]}
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
                "created_at": message_doc["created_at"].isoformat() if isinstance(message_doc["created_at"], datetime) else message_doc["created_at"]
            }
        }, message_data.receiver_id)
    
    return {"message": "Message sent", "data": message_doc}


# ============== PROVIDER CLIENT MESSAGES ==============

@router.get("/client/{client_id}")
async def get_client_messages(
    client_id: str,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
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
