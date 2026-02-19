"""
Admin Routes Module

Handles admin-only user management and content management.
Feature parity with original server.py admin routes.
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from typing import Optional
import uuid

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/admin", tags=["Admin"])

# Valid roles constant (matches server.py)
ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]

# Birth plan sections for default content creation
BIRTH_PLAN_SECTIONS = [
    {"section_id": "labor_support", "title": "Labor Support"},
    {"section_id": "pain_management", "title": "Pain Management"},
    {"section_id": "birth_preferences", "title": "Birth Preferences"},
    {"section_id": "after_birth", "title": "After Birth"},
    {"section_id": "newborn_care", "title": "Newborn Care"},
]


# ============== ROUTES ==============

@router.get("/users")
async def get_all_users(
    user: User = Depends(check_role(["ADMIN"])), 
    role: Optional[str] = Query(None, description="Filter by role")
):
    """Get all users (admin only). Optionally filter by role."""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, admin: User = Depends(check_role(["ADMIN"]))):
    """Update a user's role"""
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ROLES}")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": new_role, "updated_at": get_now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {new_role}"}


@router.get("/content")
async def get_admin_content(user: User = Depends(check_role(["ADMIN"]))):
    """Get all content items. Creates defaults if none exist."""
    content = await db.admin_content.find({}, {"_id": 0}).to_list(100)
    
    # If no content exists, create defaults
    if not content:
        now = get_now()
        default_content = []
        for section in BIRTH_PLAN_SECTIONS:
            item = {
                "content_id": f"content_{uuid.uuid4().hex[:12]}",
                "section_id": section["section_id"],
                "explanatory_text": f"Information about {section['title']}",
                "video_url": None,
                "updated_by": user.user_id,
                "updated_at": now
            }
            await db.admin_content.insert_one(item)
            item.pop('_id', None)  # Remove ObjectId added by insert_one
            default_content.append(item)
        return default_content
    
    return content


@router.put("/content/{section_id}")
async def update_admin_content(section_id: str, request: Request, user: User = Depends(check_role(["ADMIN"]))):
    """Update content for a section"""
    body = await request.json()
    now = get_now()
    
    update_data = {
        "section_id": section_id,
        "explanatory_text": body.get("explanatory_text"),
        "video_url": body.get("video_url"),
        "updated_by": user.user_id,
        "updated_at": now
    }
    
    await db.admin_content.update_one(
        {"section_id": section_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Content updated"}
