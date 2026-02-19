"""
Notification Routes Module

Handles in-app notifications for users.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from .dependencies import db, generate_id, get_now

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ============== ROUTES ==============

@router.get("")
async def get_notifications(user_id: str, unread_only: bool = False):
    """Get notifications for the user"""
    query = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return notifications


@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user_id},
        {"$set": {"read": True, "read_at": get_now()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_notifications_read(user_id: str):
    """Mark all notifications as read for the user"""
    now = get_now()
    await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True, "read_at": now}}
    )
    
    return {"message": "All notifications marked as read"}
