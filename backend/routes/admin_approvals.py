"""
Admin Approvals Routes Module — TJB approval queue (Jeff directive 2026-09-22)

Human approve/decline system for brand + Shelbi decisions, hosted in the TJB
admin dashboard (truejoybirthing.com/admin → Approvals).

Design:
  - Anything Kit (or an automation) needs a human decision on is enqueued as an
    approval item with rich `payload` context.
  - Admin clicks Approve / Decline (+ optional note) in the admin UI.
  - On decision: item records decision + decider + timestamp, webhook fires
    (APPROVALS_WEBHOOK_URL) so automations unblock within seconds, and the
    requester service can claim the decision with its ingest token
    (APPROVALS_INGEST_TOKEN) instead of scraping Discord.
  - Optional notification email via the existing PostMark service.

Roles: ADMIN sees/decides everything. DOULA/MIDWIFE/LACTATION (e.g. Shelbi)
see only items whose audience includes their role.

Collections: approval_items, approval_decisions (audit trail).

Follows the same patterns as admin_dashboard.py / shelbi_leads.py.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os

import httpx

from .dependencies import (
    db, get_now, generate_id, check_role, User,
    send_notification_email,
)
from .auth import check_rate_limit

router = APIRouter(prefix="/admin/api/approvals", tags=["Admin Approvals"])

COLLECTION = "approval_items"
DECISIONS_COLLECTION = "approval_decisions"

VALID_STATES = ["pending", "decided", "resolved", "cancelled"]
VALID_DECISIONS = ["approved", "declined"]
VALID_URGENCY = ["low", "normal", "high", "critical"]
DEFAULT_AUDIENCE = ["ADMIN"]
DEFAULT_TTL_HOURS = 30 * 24  # pending items auto-expire after ~30 days

# Service ingest token (automations claiming decisions). Optional: when unset,
# claim endpoints are disabled (admin UI remains the only consumer).
INGEST_TOKEN = os.environ.get("APPROVALS_INGEST_TOKEN", "")
# Webhook fired on every decision (discourse-style JSON POST). Optional.
WEBHOOK_URL = os.environ.get("APPROVALS_WEBHOOK_URL", "")
# Optional notify-to email for critical items (brand inbox).
NOTIFY_EMAIL = os.environ.get("APPROVALS_NOTIFY_EMAIL", "")


# ------------------------------------------------------------------
# Request models
# ------------------------------------------------------------------

class ApprovalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    source: Optional[str] = None            # e.g. "kit", "cron:tjb-morning-brief"
    source_ref: Optional[str] = None        # dedupe key, e.g. "deploy-2026-09-22-design-refresh"
    kind: Optional[str] = None              # e.g. "deploy", "outreach", "content", "spend", "pricing"
    brand: Optional[str] = None             # e.g. "tjb"
    payload: Optional[dict] = None          # rich context for the human
    urgency: str = "normal"
    audience: Optional[List[str]] = None    # default ["ADMIN"]
    dedupe: bool = False                    # True: skip create if an identical pending source_ref exists


class ApprovalDecision(BaseModel):
    decision: str                            # "approved" | "declined"
    note: Optional[str] = None
    decided_by: Optional[str] = None         # display name override; defaults to admin user


class ApprovalRespond(BaseModel):
    message: str                             # Jeff's reply, relayed to Kit via Discord


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _serialize(doc: dict) -> dict:
    """Mongo doc -> JSON-safe dict."""
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _now() -> datetime:
    return datetime.now(timezone.utc)


DISCORD_WEBHOOK_URL = os.environ.get("TJB_DISCORD_WEBHOOK_URL", "")


async def _post_discord(message: str):
    """Post a plain message to the TJB Discord channel via webhook (best-effort)."""
    url = DISCORD_WEBHOOK_URL
    if not url or not url.startswith("http"):
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json={"content": message[:1900]})
            return resp.status_code in (200, 204)
    except Exception:
        return False


async def _fire_webhook(payload: dict):
    """Best-effort decision webhook. Never raises into the request path."""
    url = WEBHOOK_URL
    if not url or not url.startswith("http"):
        return
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(url, json=payload)
    except Exception:
        # Non-fatal: decision is already durably recorded; poller is the fallback.
        pass


# ------------------------------------------------------------------
# Admin routes (ADMIN role)
# ------------------------------------------------------------------

@router.post("/items")
async def create_item(
    body: ApprovalCreate,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Enqueue a new approval item (admin or automation proxy)."""
    if body.urgency not in VALID_URGENCY:
        raise HTTPException(status_code=400, detail=f"urgency must be one of {VALID_URGENCY}")
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="title is required")

    audience = body.audience or DEFAULT_AUDIENCE

    # Dedupe on pending items with same source_ref when requested
    if body.dedupe and body.source_ref:
        existing = await db[COLLECTION].find_one(
            {"source_ref": body.source_ref, "state": "pending"}
        )
        if existing:
            return _serialize(existing)

    now = _now()
    item = {
        "item_id": generate_id("apr"),
        "title": body.title.strip(),
        "description": body.description,
        "source": body.source or "kit",
        "source_ref": body.source_ref,
        "kind": body.kind,
        "brand": body.brand or "tjb",
        "payload": body.payload or {},
        "urgency": body.urgency,
        "audience": audience,
        "state": "pending",
        "decision": None,
        "decided_by": None,
        "decided_at": None,
        "decision_note": None,
        "resolved_at": None,
        "expires_at": now + timedelta(hours=DEFAULT_TTL_HOURS),
        "created_at": now,
        "updated_at": now,
        "urgency_rank": VALID_URGENCY.index(body.urgency),
    }
    await db[COLLECTION].insert_one(item)

    # Critical items optionally email the brand inbox (best-effort, async service)
    if body.urgency == "critical" and NOTIFY_EMAIL and send_notification_email:
        try:
            await send_notification_email(
                to=NOTIFY_EMAIL,
                subject=f"[TJB Approval] {item['title']}",
                html=(
                    f"<p><strong>Urgency:</strong> critical</p>"
                    f"<p><strong>Source:</strong> {item['source']}</p>"
                    f"<p>{body.description or ''}</p>"
                ),
            )
        except Exception:
            pass  # decision queue still works without email

    return _serialize(item)


@router.get("/items")
async def list_items(
    state: Optional[str] = Query("pending", description="pending|decided|resolved|cancelled|all"),
    kind: Optional[str] = Query(None),
    include_expired: bool = Query(False, description="Include pending items past expires_at"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user: User = Depends(check_role(["ADMIN", "DOULA", "MIDWIFE", "LACTATION"])),
):
    """List approval items visible to the current role.

    ADMIN: everything. DOULA/MIDWIFE/LACTATION (Shelbi): only items whose
    audience includes their role.
    """
    query: dict = {}
    if state == "all":
        pass
    elif state in VALID_STATES:
        query["state"] = state
    else:
        raise HTTPException(status_code=400, detail=f"state must be one of {VALID_STATES + ['all']}")
    if kind:
        query["kind"] = kind
    if user.role != "ADMIN":
        query["audience"] = user.role
    if state == "pending" and not include_expired:
        query["expires_at"] = {"$gt": _now()}

    skip = (page - 1) * limit
    cursor = (
        db[COLLECTION]
        .find(query, {"_id": 0})
        .sort([("urgency_rank", 1), ("created_at", -1)])
        .skip(skip)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    total = await db[COLLECTION].count_documents(query)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/items/{item_id}")
async def get_item(
    item_id: str,
    user: User = Depends(check_role(["ADMIN", "DOULA", "MIDWIFE", "LACTATION"])),
):
    doc = await db[COLLECTION].find_one({"item_id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval item not found")
    if user.role != "ADMIN" and user.role not in (doc.get("audience") or []):
        raise HTTPException(status_code=403, detail="Not permitted for this role")
    return doc


@router.post("/items/{item_id}/decide")
async def decide_item(
    item_id: str,
    body: ApprovalDecision,
    request: Request,
    user: User = Depends(check_role(["ADMIN", "DOULA", "MIDWIFE", "LACTATION"])),
):
    """Approve or decline a pending item. Records decision + fires webhook."""
    await check_rate_limit(request, "approval-decide", 30, 60)
    if body.decision not in VALID_DECISIONS:
        raise HTTPException(status_code=400, detail=f"decision must be one of {VALID_DECISIONS}")

    doc = await db[COLLECTION].find_one({"item_id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval item not found")
    if user.role != "ADMIN" and user.role not in (doc.get("audience") or []):
        raise HTTPException(status_code=403, detail="Not permitted for this role")
    if doc.get("state") != "pending":
        raise HTTPException(status_code=409, detail=f"Item is not pending (state={doc.get('state')})")

    now = _now()
    decided_by = (body.decided_by or user.full_name or user.email or "admin").strip()

    await db[COLLECTION].update_one(
        {"item_id": item_id, "state": "pending"},
        {
            "$set": {
                "state": "decided",
                "decision": body.decision,
                "decided_by": decided_by,
                "decided_at": now,
                "decision_note": body.note,
                "updated_at": now,
            }
        },
    )

    # Audit trail
    await db[DECISIONS_COLLECTION].insert_one(
        {
            "item_id": item_id,
            "decision": body.decision,
            "decided_by": decided_by,
            "decided_by_role": user.role,
            "note": body.note,
            "decided_at": now,
        }
    )

    updated = await db[COLLECTION].find_one({"item_id": item_id}, {"_id": 0})

    # Fire webhook so automations unblock immediately (best-effort)
    await _fire_webhook(_serialize(updated))

    return updated


@router.post("/items/{item_id}/respond")
async def respond_item(
    item_id: str,
    body: ApprovalRespond,
    request: Request,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Admin free-text response on an approval item, relayed to Kit in Discord.

    Jeff types a reply on the Approvals page; it is stored on the item and
    posted to the TJB Discord channel (#truejoybirthing-main) via webhook so
    Kit picks it up without Jeff ever opening Discord.
    """
    await check_rate_limit(request, "approval-respond", 20, 60)
    text = (body.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="message is required")
    if len(text) > 1800:
        raise HTTPException(status_code=400, detail="message too long (max 1800 chars)")

    doc = await db[COLLECTION].find_one({"item_id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Approval item not found")
    if doc.get("state") not in ("pending", "decided"):
        raise HTTPException(status_code=409, detail=f"Item is {doc.get('state')}; cannot respond")

    now = _now()
    respondent = (user.full_name or user.email or "admin").strip()
    entry = {"from": respondent, "message": text, "at": now.isoformat()}
    await db[COLLECTION].update_one(
        {"item_id": item_id},
        {
            "$set": {"updated_at": now},
            "$push": {"responses": entry},
        },
    )

    discord_ok = await _post_discord(
        f"📣 **Admin response — approval item**\n"
        f"**{doc.get('title')}** (`{item_id}`)\n"
        f"From: {respondent}\n"
        f"> {text}\n"
        f"_Kit: pick this up; process one item at a time._"
    )

    updated = await db[COLLECTION].find_one({"item_id": item_id}, {"_id": 0})
    return {**_serialize(updated), "discord_delivered": discord_ok}


@router.post("/items/{item_id}/cancel")
async def cancel_item(
    item_id: str,
    user: User = Depends(check_role(["ADMIN"])),
):
    """Withdraw a pending item (no longer needs a decision)."""
    now = _now()
    result = await db[COLLECTION].find_one_and_update(
        {"item_id": item_id, "state": "pending"},
        {"$set": {"state": "cancelled", "resolved_at": now, "updated_at": now}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="Item not found or not pending")
    return _serialize(result)


@router.get("/decisions")
async def list_decisions(
    item_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(check_role(["ADMIN"])),
):
    """Decision audit trail."""
    query: dict = {}
    if item_id:
        query["item_id"] = item_id
    skip = (page - 1) * limit
    cursor = (
        db[DECISIONS_COLLECTION]
        .find(query, {"_id": 0})
        .sort("decided_at", -1)
        .skip(skip)
        .limit(limit)
    )
    decisions = await cursor.to_list(length=limit)
    total = await db[DECISIONS_COLLECTION].count_documents(query)
    return {"decisions": decisions, "total": total, "page": page, "limit": limit}


@router.get("/stats")
async def approvals_stats(user: User = Depends(check_role(["ADMIN"]))):
    """Queue counters for nav badge + dashboard."""
    now = _now()
    pending_live = await db[COLLECTION].count_documents(
        {"state": "pending", "expires_at": {"$gt": now}}
    )
    by_urgency = {}
    for u in VALID_URGENCY:
        by_urgency[u] = await db[COLLECTION].count_documents(
            {"state": "pending", "urgency": u, "expires_at": {"$gt": now}}
        )
    decided_total = await db[COLLECTION].count_documents({"state": "decided"})
    resolved_total = await db[COLLECTION].count_documents({"state": "resolved"})
    return {
        "pending": pending_live,
        "by_urgency": by_urgency,
        "decided_total": decided_total,
        "resolved_total": resolved_total,
    }


# ------------------------------------------------------------------
# Service ingest endpoints (automation clients; X-Ingest-Token header)
# ------------------------------------------------------------------

def _require_ingest_token(request: Request):
    if not INGEST_TOKEN:
        raise HTTPException(status_code=503, detail="Ingest API disabled (no token configured)")
    token = request.headers.get("x-ingest-token", "")
    if token != INGEST_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid ingest token")


@router.get("/services/pending")
async def service_pending(
    request: Request,
    source_ref: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    """Automations poll their unresolved items (never expires-out pending ones
    that are still awaiting a human)."""
    _require_ingest_token(request)
    query: dict = {"state": "pending"}
    if source_ref:
        query["source_ref"] = source_ref
    if brand:
        query["brand"] = brand
    cursor = db[COLLECTION].find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"items": items, "total": len(items)}


@router.post("/services/items")
async def service_create(
    request: Request,
    body: ApprovalCreate,
):
    """Automations enqueue approval items with the ingest token."""
    _require_ingest_token(request)
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="title is required")
    if body.urgency not in VALID_URGENCY:
        raise HTTPException(status_code=400, detail=f"urgency must be one of {VALID_URGENCY}")

    if body.dedupe and body.source_ref:
        existing = await db[COLLECTION].find_one(
            {"source_ref": body.source_ref, "state": "pending"}
        )
        if existing:
            return _serialize(existing)

    now = _now()
    item = {
        "item_id": generate_id("apr"),
        "title": body.title.strip(),
        "description": body.description,
        "source": body.source or "automation",
        "source_ref": body.source_ref,
        "kind": body.kind,
        "brand": body.brand or "tjb",
        "payload": body.payload or {},
        "urgency": body.urgency,
        "audience": body.audience or DEFAULT_AUDIENCE,
        "state": "pending",
        "decision": None,
        "decided_by": None,
        "decided_at": None,
        "decision_note": None,
        "resolved_at": None,
        "expires_at": now + timedelta(hours=DEFAULT_TTL_HOURS),
        "created_at": now,
        "updated_at": now,
        "urgency_rank": VALID_URGENCY.index(body.urgency),
    }
    await db[COLLECTION].insert_one(item)
    return _serialize(item)


@router.post("/services/items/{item_id}/resolve")
async def service_resolve(
    item_id: str,
    request: Request,
):
    """Requester marks a decided item as resolved (it acted on the decision)."""
    _require_ingest_token(request)
    now = _now()
    result = await db[COLLECTION].find_one_and_update(
        {"item_id": item_id, "state": "decided"},
        {"$set": {"state": "resolved", "resolved_at": now, "updated_at": now}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=409, detail="Item not found in decided state")
    return _serialize(result)


@router.get("/services/decisions/latest")
async def service_latest_decision(
    request: Request,
    source_ref: str = Query(...),
):
    """Automations fetch the decision for their source_ref (idempotent unblock)."""
    _require_ingest_token(request)
    item = await db[COLLECTION].find_one(
        {"source_ref": source_ref}, {"_id": 0}
    ) if source_ref else None
    if not item:
        raise HTTPException(status_code=404, detail="No item with that source_ref")
    return {
        "item_id": item.get("item_id"),
        "state": item.get("state"),
        "decision": item.get("decision"),
        "decided_by": item.get("decided_by"),
        "decided_at": item.get("decided_at"),
        "decision_note": item.get("decision_note"),
    }