"""
Admin Routes Module

Handles admin-only user management and content management.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============== ROUTES ==============

@router.get("/users")
async def get_all_users(user: User = Depends(check_role(["ADMIN"]))):
    """Get all users (admin only)"""
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).to_list(500)
    
    return users


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, admin: User = Depends(check_role(["ADMIN"]))):
    """Update a user's role (admin only)"""
    body = await request.json()
    new_role = body.get("role")
    
    if new_role and new_role.upper() not in ["MOM", "DOULA", "MIDWIFE", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": new_role.upper() if new_role else None, "updated_at": get_now()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User role updated"}


@router.get("/content")
async def get_admin_content(user: User = Depends(check_role(["ADMIN"]))):
    """Get all admin-managed content"""
    content = await db.admin_content.find(
        {},
        {"_id": 0}
    ).to_list(100)
    
    # If no content exists, return default structure
    if not content:
        return {
            "sections": [
                {"id": "weekly_tips", "name": "Weekly Tips", "items": []},
                {"id": "affirmations", "name": "Affirmations", "items": []},
                {"id": "resources", "name": "Resources", "items": []}
            ]
        }
    
    return {"sections": content}


@router.put("/content/{section_id}")
async def update_admin_content(section_id: str, request: Request, user: User = Depends(check_role(["ADMIN"]))):
    """Update a content section"""
    body = await request.json()
    now = get_now()
    
    # Upsert the content section
    await db.admin_content.update_one(
        {"id": section_id},
        {
            "$set": {
                "id": section_id,
                "name": body.get("name", section_id),
                "items": body.get("items", []),
                "updated_at": now
            }
        },
        upsert=True
    )
    
    return {"message": "Content updated"}
