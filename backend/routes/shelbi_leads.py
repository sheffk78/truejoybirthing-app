"""
Shelbi Leads Routes Module

Manages conversation leads from the Shelbi AI assistant.
Two lead types: 'mom' (expecting/new moms) and 'provider' (doulas/midwives).
Public endpoint for lead submission; admin endpoints for management.

Follows the same patterns as admin_dashboard.py / admin_ambassador.py.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from .dependencies import db, get_now, generate_id, get_current_user, check_role, User
from .auth import check_rate_limit

# ------------------------------------------------------------------
# Routers
# ------------------------------------------------------------------
# Public router (mounted under /api via api_router — api_router already has /api prefix)
public_router = APIRouter(prefix="/shelbi-leads", tags=["Shelbi Leads"])
# Admin router (mounted directly on app so paths are /admin/api/shelbi-leads/*)
admin_router = APIRouter(prefix="/admin/api/shelbi-leads", tags=["Admin Shelbi Leads"])

# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------
COLLECTION = "shelbi_leads"
VALID_LEAD_TYPES = ["mom", "provider"]
VALID_PROVIDER_TYPES = ["doula", "midwife"]
VALID_STATUSES = ["new", "contacted", "scheduled", "completed", "declined"]


# ------------------------------------------------------------------
# Request models
# ------------------------------------------------------------------
class ShelbiLeadSubmit(BaseModel):
    lead_type: str  # 'mom' | 'provider'
    name: str
    email: str
    phone: Optional[str] = None
    provider_type: Optional[str] = None  # 'doula' | 'midwife' (only if lead_type is provider)
    topic: str
    source: Optional[str] = None


class ShelbiStatusUpdate(BaseModel):
    status: str


class ShelbiNoteCreate(BaseModel):
    text: str
    author: str


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def serialize_doc(doc):
    """Convert a MongoDB document to a JSON-serializable dict, handling ObjectId/datetime."""
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


# ------------------------------------------------------------------
# PUBLIC ENDPOINT — no auth
# ------------------------------------------------------------------
@public_router.post("")
async def submit_shelbi_lead(request: Request, body: ShelbiLeadSubmit):
    """Public endpoint for submitting a Shelbi conversation lead.

    No authentication required. Rate-limited to prevent abuse.
    Creates a lead with status 'new'.
    """
    await check_rate_limit(request, "shelbi-lead-submit", 10, 600)  # 10 per 10 min

    # --- Validation ---
    if body.lead_type not in VALID_LEAD_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"lead_type must be one of: {VALID_LEAD_TYPES}",
        )

    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name is required")
    if not body.email.strip():
        raise HTTPException(status_code=400, detail="email is required")
    if not body.topic.strip():
        raise HTTPException(status_code=400, detail="topic is required")

    # provider_type is only valid (and required) when lead_type is 'provider'
    if body.lead_type == "provider":
        if not body.provider_type:
            raise HTTPException(
                status_code=400,
                detail="provider_type is required when lead_type is 'provider'",
            )
        if body.provider_type not in VALID_PROVIDER_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"provider_type must be one of: {VALID_PROVIDER_TYPES}",
            )
    else:
        # provider_type must not be set for mom leads
        if body.provider_type is not None:
            raise HTTPException(
                status_code=400,
                detail="provider_type should only be set when lead_type is 'provider'",
            )

    # --- Create lead ---
    now = get_now()
    lead_id = generate_id("sl")

    lead_doc = {
        "lead_id": lead_id,
        "lead_type": body.lead_type,
        "name": body.name.strip(),
        "email": body.email.strip().lower(),
        "phone": body.phone.strip() if body.phone else None,
        "provider_type": body.provider_type if body.lead_type == "provider" else None,
        "topic": body.topic.strip(),
        "status": "new",
        "notes": [],
        "source": body.source or "shelbi",
        "created_at": now,
        "updated_at": now,
    }

    await db[COLLECTION].insert_one(lead_doc)
    lead_doc.pop("_id", None)

    return {
        "message": "Lead submitted successfully",
        "lead_id": lead_id,
        "lead": serialize_doc(lead_doc),
    }


# ------------------------------------------------------------------
# ADMIN ENDPOINTS — require ADMIN role
# ------------------------------------------------------------------
@admin_router.get("")
async def list_shelbi_leads(
    status: Optional[str] = Query(None, description="Filter by status"),
    lead_type: Optional[str] = Query(None, description="Filter by lead type"),
    search: Optional[str] = Query(None, description="Search name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    user: User = Depends(check_role(["ADMIN"])),
):
    """Get paginated list of Shelbi leads (admin only)."""
    query = {}

    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"status must be one of: {VALID_STATUSES}",
            )
        query["status"] = status

    if lead_type:
        if lead_type not in VALID_LEAD_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"lead_type must be one of: {VALID_LEAD_TYPES}",
            )
        query["lead_type"] = lead_type

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    total = await db[COLLECTION].count_documents(query)
    skip = (page - 1) * limit
    total_pages = max(1, (total + limit - 1) // limit)

    leads = await db[COLLECTION].find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "leads": [serialize_doc(l) for l in leads],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


@admin_router.get("/stats")
async def shelbi_leads_stats(user: User = Depends(check_role(["ADMIN"]))):
    """Get Shelbi lead counts by status and lead_type (admin only)."""
    # By status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_results = await db[COLLECTION].aggregate(status_pipeline).to_list(100)

    by_status = {s: 0 for s in VALID_STATUSES}
    total = 0
    for r in status_results:
        by_status[r["_id"]] = r["count"]
        total += r["count"]

    # By lead_type
    type_pipeline = [
        {"$group": {"_id": "$lead_type", "count": {"$sum": 1}}},
    ]
    type_results = await db[COLLECTION].aggregate(type_pipeline).to_list(100)

    by_lead_type = {t: 0 for t in VALID_LEAD_TYPES}
    for r in type_results:
        by_lead_type[r["_id"]] = r["count"]

    return {
        "total": total,
        "by_status": by_status,
        "by_lead_type": by_lead_type,
    }


@admin_router.get("/{lead_id}")
async def get_shelbi_lead(lead_id: str, user: User = Depends(check_role(["ADMIN"]))):
    """Get a single Shelbi lead by lead_id (admin only)."""
    lead = await db[COLLECTION].find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return serialize_doc(lead)


@admin_router.put("/{lead_id}/status")
async def update_shelbi_lead_status(
    lead_id: str,
    body: ShelbiStatusUpdate,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Update a Shelbi lead's status (admin only)."""
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of: {VALID_STATUSES}",
        )

    lead = await db[COLLECTION].find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = get_now()
    await db[COLLECTION].update_one(
        {"lead_id": lead_id},
        {"$set": {"status": body.status, "updated_at": now}},
    )

    return {"message": "Status updated", "lead_id": lead_id, "status": body.status}


@admin_router.post("/{lead_id}/notes")
async def add_shelbi_lead_note(
    lead_id: str,
    body: ShelbiNoteCreate,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Append a note to a Shelbi lead (admin only)."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    if not body.author.strip():
        raise HTTPException(status_code=400, detail="author is required")

    lead = await db[COLLECTION].find_one({"lead_id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = get_now()
    note = {
        "text": body.text.strip(),
        "author": body.author.strip(),
        "created_at": now,
    }

    await db[COLLECTION].update_one(
        {"lead_id": lead_id},
        {
            "$push": {"notes": note},
            "$set": {"updated_at": now},
        },
    )

    return {"message": "Note added", "lead_id": lead_id, "note": serialize_doc(note)}