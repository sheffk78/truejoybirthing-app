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
    email_quote: Optional[str] = None  # Verbatim quote from the email/message where the person asked to be contacted
    original_email_body: Optional[str] = None  # Full original email body for admin reference


class ShelbiStatusUpdate(BaseModel):
    status: str


class ShelbiNoteCreate(BaseModel):
    text: str
    author: str


class ShelbiLeadManualCreate(BaseModel):
    """Admin manually creates a lead with full context."""
    lead_type: str  # 'mom' | 'provider'
    name: str
    email: str
    phone: Optional[str] = None
    provider_type: Optional[str] = None
    topic: str
    email_quote: Optional[str] = None
    original_email_body: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = "new"


class PostmarkInboundPayload(BaseModel):
    """Postmark Inbound Webhook payload (simplified — only fields we use)."""
    From: Optional[str] = None
    FromName: Optional[str] = None
    Subject: Optional[str] = None
    TextBody: Optional[str] = None
    HtmlBody: Optional[str] = None
    ReplyTo: Optional[str] = None
    MailboxHash: Optional[str] = None
    Tag: Optional[str] = None
    To: Optional[str] = None


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
        "email_quote": body.email_quote.strip() if body.email_quote else None,
        "original_email_body": body.original_email_body.strip() if body.original_email_body else None,
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
# INBOUND EMAIL WEBHOOK (Postmark)
# ------------------------------------------------------------------
import re as _re
import logging as _logging

_logger = _logging.getLogger(__name__)

# Keywords that indicate the sender wants to talk to Shelbi
_SHELBI_KEYWORDS = [
    "talk to shelbi",
    "speak with shelbi",
    "connect with shelbi",
    "shelbi kohler",
    "consultation with shelbi",
    "call from shelbi",
    "shelbi reach out",
    "shelbi contact",
    "want to talk",
    "interested in working with",
    "learn more about your services",
    "schedule a call",
    "schedule a consultation",
    "phone number",
    "my number is",
    "call me at",
    "reach me at",
    "you can call me",
]

# US phone number patterns
_PHONE_PATTERNS = [
    r'\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b',  # 555-123-4567, 555.123.4567, 555 123 4567
    r'\b(\d{3}[-.\s]?\d{4})\b',  # 555-1234
    r'\(\d{3}\)\s*\d{3}[-.\s]?\d{4}',  # (555) 123-4567
    r'\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}',  # +1-555-123-4567
]


def _extract_phone(text: str) -> Optional[str]:
    """Extract a phone number from text."""
    if not text:
        return None
    for pattern in _PHONE_PATTERNS:
        match = _re.search(pattern, text)
        if match:
            return match.group(0) if match.groups() else match.group(0)
    return None


def _wants_shelbi_contact(text: str) -> bool:
    """Check if the email body indicates the sender wants to talk to Shelbi."""
    if not text:
        return False
    text_lower = text.lower()
    return any(kw in text_lower for kw in _SHELBI_KEYWORDS)


def _extract_email_quote(text: str, max_len: int = 500) -> Optional[str]:
    """Extract a meaningful quote from the email body that shows the contact request."""
    if not text:
        return None
    # Try to find the sentence containing a keyword
    sentences = _re.split(r'[.!?]\s+', text)
    for sentence in sentences:
        if _wants_shelbi_contact(sentence):
            quote = sentence.strip()
            if len(quote) > max_len:
                quote = quote[:max_len] + "..."
            return quote
    # Fallback: first 300 chars
    return text[:300].strip() if text.strip() else None


@public_router.post("/inbound-email")
async def handle_inbound_email(request: Request):
    """Postmark Inbound Webhook handler.

    When a provider or mom replies to an onboarding email, Postmark
    forwards the email to this endpoint. If the email indicates they
    want to talk to Shelbi, we create a shelbi_lead with:
    - Their email (from the From field)
    - Their phone (extracted from the body)
    - The email quote (the sentence where they asked to be contacted)
    - The full original email body

    No authentication — verified by Postmark's webhook signature.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    from_email = body.get("From", "") or body.get("ReplyTo", "")
    from_name = body.get("FromName", "") or ""
    subject = body.get("Subject", "") or ""
    text_body = body.get("TextBody", "") or ""
    html_body = body.get("HtmlBody", "") or ""

    if not from_email:
        _logger.warning("Inbound email with no From field")
        return {"status": "ignored", "reason": "no_from"}

    # Strip the name part if present: "John Doe <john@example.com>" → "john@example.com"
    email_match = _re.search(r'<([^>]+)>', from_email)
    if email_match:
        from_email = email_match.group(1)
    from_email = from_email.strip().lower()

    # Check if this is a provider (doula/midwife) by looking up the user
    user = await db.users.find_one(
        {"email": from_email, "role": {"$in": ["DOULA", "MIDWIFE"]}},
        {"_id": 0, "user_id": 1, "full_name": 1, "role": 1}
    )

    # Also check if they're a mom
    if not user:
        user = await db.users.find_one(
            {"email": from_email, "role": "MOM"},
            {"_id": 0, "user_id": 1, "full_name": 1, "role": 1}
        )

    # Determine lead type
    if user and user.get("role") in ["DOULA", "MIDWIFE"]:
        lead_type = "provider"
        provider_type = "doula" if user["role"] == "DOULA" else "midwife"
    else:
        lead_type = "mom"
        provider_type = None

    # Check if the email indicates they want to talk to Shelbi
    full_text = f"{subject}\n\n{text_body}"
    wants_contact = _wants_shelbi_contact(full_text)

    if not wants_contact:
        _logger.info(f"Inbound email from {from_email} — no Shelbi contact intent detected")
        return {"status": "ignored", "reason": "no_contact_intent"}

    # Extract phone number from the email body
    phone = _extract_phone(text_body) or _extract_phone(html_body)

    # Extract the relevant quote
    email_quote = _extract_email_quote(text_body)

    # Use the user's name from DB if available, otherwise from the email
    lead_name = user.get("full_name") if user else from_name or from_email.split("@")[0]

    # Check if a lead already exists for this email
    existing = await db[COLLECTION].find_one({"email": from_email})
    if existing:
        # Update existing lead with phone and email_quote if not present
        update_fields = {}
        if phone and not existing.get("phone"):
            update_fields["phone"] = phone
        if email_quote and not existing.get("email_quote"):
            update_fields["email_quote"] = email_quote
        if not existing.get("original_email_body") and text_body:
            update_fields["original_email_body"] = text_body[:5000]

        if update_fields:
            update_fields["updated_at"] = get_now()
            await db[COLLECTION].update_one(
                {"email": from_email},
                {"$set": update_fields}
            )
            _logger.info(f"Updated existing lead for {from_email} with phone/quote")
            return {"status": "updated", "lead_id": existing.get("lead_id")}

        _logger.info(f"Lead already exists for {from_email} with all fields populated")
        return {"status": "exists", "lead_id": existing.get("lead_id")}

    # Create new lead
    now = get_now()
    lead_id = generate_id("sl")

    lead_doc = {
        "lead_id": lead_id,
        "lead_type": lead_type,
        "name": lead_name,
        "email": from_email,
        "phone": phone,
        "provider_type": provider_type,
        "topic": subject or "Email reply — wants to talk to Shelbi",
        "status": "new",
        "notes": [],
        "source": "email_reply",
        "email_quote": email_quote,
        "original_email_body": text_body[:5000] if text_body else None,
        "created_at": now,
        "updated_at": now,
    }

    await db[COLLECTION].insert_one(lead_doc)
    lead_doc.pop("_id", None)

    _logger.info(f"Created new Shelbi lead from inbound email: {from_email} — {lead_id}")
    return {"status": "created", "lead_id": lead_id, "lead": serialize_doc(lead_doc)}


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
            {"phone": {"$regex": search, "$options": "i"}},
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


@admin_router.post("")
async def create_shelbi_lead_manual(
    body: ShelbiLeadManualCreate,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Admin manually creates a Shelbi lead with full context (email quote, phone, etc.)."""
    if body.lead_type not in VALID_LEAD_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"lead_type must be one of: {VALID_LEAD_TYPES}",
        )
    if body.lead_type == "provider" and body.provider_type:
        if body.provider_type not in VALID_PROVIDER_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"provider_type must be one of: {VALID_PROVIDER_TYPES}",
            )

    status = body.status if body.status in VALID_STATUSES else "new"
    now = get_now()
    lead_id = generate_id("sl")

    lead_doc = {
        "lead_id": lead_id,
        "lead_type": body.lead_type,
        "name": body.name.strip(),
        "email": body.email.strip().lower(),
        "phone": body.phone.strip() if body.phone and body.phone.strip() else None,
        "provider_type": body.provider_type if body.lead_type == "provider" else None,
        "topic": body.topic.strip(),
        "status": status,
        "notes": [],
        "source": body.source or "manual",
        "email_quote": body.email_quote.strip() if body.email_quote else None,
        "original_email_body": body.original_email_body.strip() if body.original_email_body else None,
        "created_at": now,
        "updated_at": now,
    }

    await db[COLLECTION].insert_one(lead_doc)
    lead_doc.pop("_id", None)

    return {
        "message": "Lead created",
        "lead_id": lead_id,
        "lead": serialize_doc(lead_doc),
    }