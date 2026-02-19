"""
Notification Routes Module

Handles in-app notifications for users.
Feature parity with original server.py notification routes.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from .dependencies import db, get_now, get_current_user, User

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ============== ROUTES ==============

@router.get("")
async def get_notifications(
    user: User = Depends(get_current_user()),
    unread_only: bool = Query(False, description="Only return unread notifications")
):
    """Get user's notifications (with polling support)"""
    query = {"user_id": user.user_id}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    unread_count = await db.notifications.count_documents({"user_id": user.user_id, "read": False})
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: User = Depends(get_current_user())
):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_notifications_read(user: User = Depends(get_current_user())):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}
