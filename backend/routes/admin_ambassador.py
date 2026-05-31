"""
Admin Ambassador Routes Module

Handles CRUD operations for the TJB Ambassador program.
Follows the same patterns as admin_dashboard.py.
"""

import uuid
import random
import string

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/admin/api/ambassadors", tags=["Admin Ambassadors"])

VALID_ROLES = ["DOULA", "MIDWIFE"]
VALID_STATUSES = ["applied", "approved", "active", "paused"]


# ============== REQUEST MODELS ==============

class CreateAmbassadorRequest(BaseModel):
    email: str
    full_name: str
    role: str  # "DOULA" or "MIDWIFE"
    city: str = ""
    state: str = ""
    audience_size: str = ""


class UpdateAmbassadorRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    audience_size: Optional[str] = None
    coupon_code_apple: Optional[str] = None
    coupon_code_google: Optional[str] = None
    notes: Optional[str] = None
    referral_count: Optional[int] = None
    user_id: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict, handling ObjectId."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc


def generate_referral_code():
    """Generate a unique referral code: TJB-xxxxxx (6 random alphanumeric chars)."""
    chars = string.ascii_uppercase + string.digits
    code = ''.join(random.choices(chars, k=6))
    return f"TJB-{code}"


def generate_ambassador_id():
    """Generate a unique ambassador ID: amb_ + uuid hex[:8]."""
    return f"amb_{uuid.uuid4().hex[:8]}"


# ============== ROUTES ==============

@router.get("")
async def list_ambassadors(
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    user: User = Depends(check_role(["ADMIN"])),
):
    """List all ambassadors with optional status filter and pagination."""
    query = {}
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
        query["status"] = status

    total = await db.ambassadors.count_documents(query)
    skip = (page - 1) * limit

    cursor = db.ambassadors.find(query).sort("created_at", -1).skip(skip).limit(limit)
    ambassadors = await cursor.to_list(length=limit)

    return {
        "ambassadors": serialize_doc(ambassadors),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }


@router.post("")
async def create_ambassador(
    request: CreateAmbassadorRequest,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Create a new ambassador."""
    # Validate role
    if request.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")

    # Check for duplicate email
    existing = await db.ambassadors.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=409, detail="An ambassador with this email already exists")

    now = get_now()
    ambassador_id = generate_ambassador_id()
    referral_code = generate_referral_code()

    # Ensure referral_code is unique
    while await db.ambassadors.find_one({"referral_code": referral_code}):
        referral_code = generate_referral_code()

    # Check if there's a user with this email to link
    user_doc = await db.users.find_one({"email": request.email})
    linked_user_id = user_doc["user_id"] if user_doc else None

    ambassador_doc = {
        "ambassador_id": ambassador_id,
        "user_id": linked_user_id,
        "email": request.email,
        "full_name": request.full_name,
        "role": request.role,
        "status": "applied",
        "applied_at": now,
        "approved_at": None,
        "paused_at": None,
        "city": request.city,
        "state": request.state,
        "audience_size": request.audience_size,
        "coupon_code_apple": "",
        "coupon_code_google": "",
        "referral_code": referral_code,
        "referral_count": 0,
        "notes": "",
        "created_at": now,
        "updated_at": now,
    }

    await db.ambassadors.insert_one(ambassador_doc)

    return serialize_doc(ambassador_doc)


@router.get("/{ambassador_id}")
async def get_ambassador(
    ambassador_id: str,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Get a single ambassador by ambassador_id."""
    doc = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Ambassador not found")
    return serialize_doc(doc)


@router.put("/{ambassador_id}")
async def update_ambassador(
    ambassador_id: str,
    request: UpdateAmbassadorRequest,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Update ambassador fields."""
    existing = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ambassador not found")

    update_fields = {}
    for field, value in request.model_dump(exclude_unset=True).items():
        if field == "role" and value not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")
        if field == "status" and value not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
        update_fields[field] = value

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = get_now()

    await db.ambassadors.update_one(
        {"ambassador_id": ambassador_id},
        {"$set": update_fields},
    )

    updated_doc = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    return serialize_doc(updated_doc)


@router.put("/{ambassador_id}/approve")
async def approve_ambassador(
    ambassador_id: str,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Approve an ambassador — set status to 'approved' and approved_at."""
    existing = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ambassador not found")

    now = get_now()

    # Check if there's a user with this email to link user_id
    update_fields = {
        "status": "approved",
        "approved_at": now,
        "paused_at": None,
        "updated_at": now,
    }

    user_doc = await db.users.find_one({"email": existing["email"]})
    if user_doc:
        update_fields["user_id"] = user_doc["user_id"]

    await db.ambassadors.update_one(
        {"ambassador_id": ambassador_id},
        {"$set": update_fields},
    )

    updated_doc = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    return serialize_doc(updated_doc)


@router.put("/{ambassador_id}/pause")
async def pause_ambassador(
    ambassador_id: str,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Pause an ambassador — set status to 'paused' and paused_at."""
    existing = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ambassador not found")

    now = get_now()

    await db.ambassadors.update_one(
        {"ambassador_id": ambassador_id},
        {"$set": {
            "status": "paused",
            "paused_at": now,
            "updated_at": now,
        }},
    )

    updated_doc = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    return serialize_doc(updated_doc)


@router.delete("/{ambassador_id}")
async def delete_ambassador(
    ambassador_id: str,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Delete an ambassador."""
    existing = await db.ambassadors.find_one({"ambassador_id": ambassador_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ambassador not found")

    await db.ambassadors.delete_one({"ambassador_id": ambassador_id})

    return {"message": "Ambassador deleted", "ambassador_id": ambassador_id}