"""
Push Notification Routes

Handles push token registration and management.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from .dependencies import db, get_current_user, User
from ..services.push_notifications import register_push_token, unregister_push_token

router = APIRouter(prefix="/push", tags=["Push Notifications"])


class RegisterPushTokenRequest(BaseModel):
    push_token: str
    device_type: Optional[str] = "unknown"  # ios, android, web


class UnregisterPushTokenRequest(BaseModel):
    push_token: str


@router.post("/register")
async def register_token(
    request: RegisterPushTokenRequest,
    user: User = Depends(get_current_user())
):
    """
    Register a push notification token for the current user.
    Called from the mobile app when push notification permission is granted.
    """
    success = await register_push_token(
        db,
        user.user_id,
        request.push_token,
        request.device_type
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to register push token. Invalid token format."
        )
    
    return {
        "success": True,
        "message": "Push token registered successfully",
        "device_type": request.device_type
    }


@router.post("/unregister")
async def unregister_token(
    request: UnregisterPushTokenRequest,
    user: User = Depends(get_current_user())
):
    """
    Unregister a push notification token (mark as inactive).
    Called when user logs out or disables notifications.
    """
    success = await unregister_push_token(
        db,
        user.user_id,
        request.push_token
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Push token not found"
        )
    
    return {
        "success": True,
        "message": "Push token unregistered successfully"
    }


@router.get("/status")
async def get_push_status(user: User = Depends(get_current_user())):
    """
    Get the user's push notification registration status.
    Returns the number of active push tokens.
    """
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"push_tokens": 1}
    )
    
    if not user_doc or "push_tokens" not in user_doc:
        return {
            "has_push_enabled": False,
            "active_devices": 0,
            "tokens": []
        }
    
    active_tokens = [
        {
            "device_type": token.get("device_type", "unknown"),
            "is_active": token.get("is_active", False),
            "created_at": token.get("created_at"),
            "last_verified": token.get("last_verified")
        }
        for token in user_doc.get("push_tokens", [])
        if token.get("is_active", True)
    ]
    
    return {
        "has_push_enabled": len(active_tokens) > 0,
        "active_devices": len(active_tokens),
        "tokens": active_tokens
    }
