"""
Messaging Routes Module

Handles real-time messaging between users (Mom <-> Provider, Provider <-> Provider).
All messages are now client-centric with auto-populated client_id.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from .dependencies import db, generate_id, get_now, create_notification, ws_manager

router = APIRouter(prefix="/messages", tags=["Messages"])


# ============== REQUEST MODELS ==============

class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str
    client_id: Optional[str] = None  # Optional, auto-populated if not provided


# ============== HELPER FUNCTIONS ==============

async def check_can_message(sender_id: str, receiver_id: str) -> tuple:
    """
    Check if sender can message receiver.
    Returns (can_message: bool, client_id: Optional[str])
    """
    # Check for share_request connection
    share_request = await db.share_requests.find_one({
        "$or": [
            {"mom_id": sender_id, "provider_id": receiver_id, "status": "accepted"},
            {"mom_id": receiver_id, "provider_id": sender_id, "status": "accepted"}
        ]
    })
    
    if share_request:
        # Get client_id from the share request context
        if share_request.get("mom_id") == sender_id:
            # Sender is mom, receiver is provider - find client record
            client = await db.clients.find_one({
                "linked_mom_id": sender_id,
                "provider_id": receiver_id
            })
        else:
            # Sender is provider, receiver is mom - find client record  
            client = await db.clients.find_one({
                "linked_mom_id": receiver_id,
                "provider_id": sender_id
            })
        
        client_id = client.get("client_id") if client else None
        return True, client_id
    
    # Check for client link (provider messaging linked mom)
    client = await db.clients.find_one({
        "$or": [
            {"linked_mom_id": sender_id, "provider_id": receiver_id},
            {"linked_mom_id": receiver_id, "provider_id": sender_id}
        ]
    })
    
    if client:
        return True, client.get("client_id")
    
    # Check for provider-to-provider (shared client)
    sender = await db.users.find_one({"user_id": sender_id})
    receiver = await db.users.find_one({"user_id": receiver_id})
    
    if sender and receiver:
        sender_role = sender.get("role", "").upper()
        receiver_role = receiver.get("role", "").upper()
        
        if sender_role in ["DOULA", "MIDWIFE"] and receiver_role in ["DOULA", "MIDWIFE"]:
            # Check if they share a client (both have the same linked_mom_id)
            sender_clients = await db.clients.find(
                {"provider_id": sender_id, "linked_mom_id": {"$ne": None}},
                {"linked_mom_id": 1}
            ).to_list(100)
            sender_moms = {c["linked_mom_id"] for c in sender_clients}
            
            shared_client = await db.clients.find_one({
                "provider_id": receiver_id,
                "linked_mom_id": {"$in": list(sender_moms)}
            })
            
            if shared_client:
                return True, shared_client.get("client_id")
    
    return False, None


# ============== ROUTES ==============

@router.get("/conversations")
async def get_conversations(user_id: str):
    """Get all message conversations for a user"""
    # Find all unique conversation partners
    sent = await db.messages.find(
        {"sender_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    received = await db.messages.find(
        {"receiver_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    all_messages = sent + received
    
    # Group by conversation partner
    conversations = {}
    for msg in all_messages:
        partner_id = msg["receiver_id"] if msg["sender_id"] == user_id else msg["sender_id"]
        
        if partner_id not in conversations:
            conversations[partner_id] = {
                "partner_id": partner_id,
                "messages": [],
                "unread_count": 0,
                "last_message": None,
                "last_message_time": None,
                "client_id": msg.get("client_id")
            }
        
        conversations[partner_id]["messages"].append(msg)
        
        # Count unread (messages TO this user that are not read)
        if msg["receiver_id"] == user_id and not msg.get("read", False):
            conversations[partner_id]["unread_count"] += 1
        
        # Track last message
        msg_time = msg.get("created_at")
        if msg_time:
            if not conversations[partner_id]["last_message_time"] or msg_time > conversations[partner_id]["last_message_time"]:
                conversations[partner_id]["last_message_time"] = msg_time
                conversations[partner_id]["last_message"] = msg
                # Update client_id if present
                if msg.get("client_id"):
                    conversations[partner_id]["client_id"] = msg["client_id"]
    
    # Enrich with partner info
    result = []
    for partner_id, conv in conversations.items():
        partner = await db.users.find_one({"user_id": partner_id}, {"_id": 0})
        if partner:
            conv["partner_name"] = partner.get("full_name", "Unknown")
            conv["partner_email"] = partner.get("email", "")
            conv["partner_role"] = partner.get("role", "")
            conv["partner_picture"] = partner.get("picture")
        
        # Get client name if client_id exists
        if conv.get("client_id"):
            client = await db.clients.find_one(
                {"client_id": conv["client_id"]},
                {"_id": 0, "name": 1}
            )
            if client:
                conv["client_name"] = client.get("name")
        
        conv["messages"] = len(conv["messages"])  # Just return count
        result.append(conv)
    
    # Sort by last message time
    result.sort(key=lambda x: x.get("last_message_time") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    
    return result


@router.get("/{other_user_id}")
async def get_messages(other_user_id: str, user_id: str, limit: int = 100):
    """Get messages between current user and another user"""
    messages = await db.messages.find(
        {"$or": [
            {"sender_id": user_id, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user_id}
        ]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(limit)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user_id, "read": False},
        {"$set": {"read": True, "read_at": get_now()}}
    )
    
    return messages


@router.post("")
async def send_message(msg_data: SendMessageRequest, user_id: str):
    """Send a message to another user"""
    # Check permission
    can_message, auto_client_id = await check_can_message(user_id, msg_data.receiver_id)
    
    if not can_message:
        raise HTTPException(
            status_code=403, 
            detail="You can only message providers you're connected with"
        )
    
    now = get_now()
    message_id = generate_id("msg")
    
    # Use provided client_id or auto-detected one
    client_id = msg_data.client_id or auto_client_id
    
    message = {
        "message_id": message_id,
        "sender_id": user_id,
        "receiver_id": msg_data.receiver_id,
        "content": msg_data.content,
        "client_id": client_id,
        "read": False,
        "created_at": now
    }
    
    await db.messages.insert_one(message)
    message.pop("_id", None)
    
    # Get sender info for notification
    sender = await db.users.find_one({"user_id": user_id})
    sender_name = sender.get("full_name", "Someone") if sender else "Someone"
    
    # Create notification
    await create_notification(
        msg_data.receiver_id,
        "new_message",
        f"New message from {sender_name}",
        msg_data.content[:100] + "..." if len(msg_data.content) > 100 else msg_data.content,
        {"sender_id": user_id, "message_id": message_id, "client_id": client_id}
    )
    
    # Send via WebSocket if receiver is connected
    if ws_manager:
        await ws_manager.send_personal_message(
            {
                "type": "new_message",
                "message": message,
                "sender_name": sender_name
            },
            msg_data.receiver_id
        )
    
    return message


@router.get("/unread/count")
async def get_unread_count(user_id: str):
    """Get count of unread messages for the user"""
    count = await db.messages.count_documents({
        "receiver_id": user_id,
        "read": False
    })
    return {"unread_count": count}
