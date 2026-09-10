"""
Waiver Routes Module — DocuSeal integration for TJB client enrollment documents.

Flow (Phase 2 plumbing, proven against TEST path before any real client):
  1. Client completes a DocuSeal submission (waiver/informed-consent).
  2. DocuSeal POSTs a webhook to  POST /api/webhooks/docuseal?secret=<DOCUSEAL_WEBHOOK_SECRET>
  3. This module fetches the signed PDF from the DocuSeal API, stores it (base64)
     in the `waiver_records` collection, and stamps the matching `users` record.
  4. Course access can later gate on  users.waiver_signed == True.

Storage pattern mirrors routes/uploads.py (base64 in-document), matching the
existing signed-contract approach (routes/contracts.py) so no new infra is needed.
"""

import base64
import hashlib
import hmac
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from .dependencies import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Waiver"])

# --- DocuSeal connection settings (set as env vars on the Railway service) ---
DOCUSEAL_API_URL = os.environ.get("DOCUSEAL_API_URL", "").rstrip("/")
DOCUSEAL_API_TOKEN = os.environ.get("DOCUSEAL_API_TOKEN", "")
DOCUSEAL_WEBHOOK_SECRET = os.environ.get("DOCUSEAL_WEBHOOK_SECRET", "")

# Pilot scope: only the participation-agreement template
WAIVER_TEMPLATE_ID = int(os.environ.get("WAIVER_TEMPLATE_ID", "1"))


def _docuseal_configured() -> bool:
    return bool(DOCUSEAL_API_URL and DOCUSEAL_API_TOKEN)


async def _docuseal_get(path: str) -> Any:
    """Authenticated GET against the TJB DocuSeal instance."""
    if not _docuseal_configured():
        raise HTTPException(status_code=503, detail="DocuSeal integration not configured")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{DOCUSEAL_API_URL}{path}",
            headers={"X-Auth-Token": DOCUSEAL_API_TOKEN},
        )
        resp.raise_for_status()
        return resp.json()


async def _download_pdf(url: str) -> bytes:
    """Download the signed PDF from a DocuSeal file URL."""
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        if not resp.content.startswith(b"%PDF"):
            raise HTTPException(status_code=502, detail="Signed document is not a valid PDF")
        return resp.content


def _find_submitter_email(payload: dict) -> Optional[str]:
    """DocuSeal webhook payloads carry submitter info in data.submitters (or data)."""
    data = payload.get("data") or {}
    submitters = data.get("submitters") or []
    for s in submitters:
        email = s.get("email") or ""
        if email and "example.com" not in email:
            return email.lower().strip()
    return None


@router.post("/webhooks/docuseal")
async def docuseal_webhook(request: Request, token: str = Query("", alias="token")):
    """
    DocuSeal webhook receiver.

    Auth: shared-secret query token (DOCUSEAL_WEBHOOK_SECRET) — DocuSeal OSS webhooks
    have no built-in signature headers, so URL secret + HTTPS is the gate.
    Handles event_type == 'form.completed'; stores the signed PDF.
    """
    if not DOCUSEAL_WEBHOOK_SECRET or not hmac.compare_digest(token, DOCUSEAL_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid webhook token")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    event_type = payload.get("event_type") or payload.get("event") or ""
    data = payload.get("data") or {}
    submission_id = data.get("submission_id")

    # Always ack quickly for non-completed events
    if event_type not in ("form.completed", "submission.completed"):
        return {"ok": True, "ignored": event_type}

    logger.info(f"DocuSeal form.completed: submission_id={submission_id}")

    # 1) Pull authoritative state from the DocuSeal API (never trust webhook body for content)
    try:
        submitters_resp = await _docuseal_get(f"/api/submitters?submission_id={submission_id}")
        submitters_list = submitters_resp.get("data") or submitters_resp
        submitter = submitters_list[0] if submitters_list else {}
    except Exception as e:
        logger.error(f"DocuSeal API fetch failed for submission {submission_id}: {e}")
        raise HTTPException(status_code=502, detail="DocuSeal API unreachable")

    status = submitter.get("status")
    if status != "completed":
        return {"ok": True, "ignored": f"submitter status={status}"}

    # 2) Download + validate the signed PDF
    documents = submitter.get("documents") or []
    if not documents or not documents[0].get("url"):
        raise HTTPException(status_code=502, detail="No signed document on submission")
    pdf_bytes = await _download_pdf(documents[0]["url"])
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

    # 3) Identify the client by submitter email (order email == submission email)
    email = (submitter.get("email") or "").lower().strip() or None
    if email and "example.com" in email:
        email = None  # test/example addresses never link to a real user
    now = datetime.utcnow()
    record = {
        "submission_id": submission_id,
        "submitter_id": submitter.get("id"),
        "template_id": data.get("template_id") or WAIVER_TEMPLATE_ID,
        "email": email,
        "signer_name": submitter.get("name"),
        "status": status,
        "completed_at": submitter.get("completed_at"),
        "pdf_b64": pdf_b64,
        "pdf_sha256": pdf_sha256,
        "pdf_size": len(pdf_bytes),
        "source": "docuseal",
        "stored_at": now,
        "values": {
            v.get("field"): v.get("value")
            for v in (submitter.get("values") or [])
            if v.get("field") and v.get("field") != "signature"
        },
    }

    # 4) Idempotent upsert on submission_id
    existing = await db.waiver_records.find_one({"submission_id": submission_id})
    if existing:
        await db.waiver_records.replace_one({"_id": existing["_id"]}, record)
        waiver_record_id = existing["_id"]
    else:
        result = await db.waiver_records.insert_one(record)
        waiver_record_id = result.inserted_id

    # 5) Stamp the user record (course-access gate reads this)
    user_update = {
        "waiver_signed": True,
        "waiver_completed_at": submitter.get("completed_at") or now,
        "waiver_submission_id": submission_id,
        "waiver_record_id": str(waiver_record_id),
    }
    user = None
    if email:
        user = await db.users.find_one(
            {"$or": [{"email": email}, {"email": email.split("+")[0]}]}
        )
    if user:
        await db.users.update_one({"_id": user["_id"]}, {"$set": user_update})
        stamped = user.get("email")
    else:
        # No user match yet (e.g. test submission, or user created after signing) —
        # record stays in waiver_records, keyed by email, and links later.
        stamped = None

    return {
        "ok": True,
        "submission_id": submission_id,
        "stored": True,
        "user_linked": stamped,
        "pdf_bytes": len(pdf_bytes),
        "pdf_sha256": pdf_sha256,
    }


@router.get("/waiver/status/{submission_id}")
async def waiver_status(submission_id: int):
    """Pilot/debug: check whether a submission's signed PDF landed."""
    rec = await db.waiver_records.find_one({"submission_id": submission_id})
    if not rec:
        raise HTTPException(status_code=404, detail="No waiver record for that submission")
    return {
        "submission_id": rec.get("submission_id"),
        "email": rec.get("email"),
        "completed_at": rec.get("completed_at"),
        "pdf_size": rec.get("pdf_size"),
        "pdf_sha256": rec.get("pdf_sha256"),
        "stored_at": rec.get("stored_at"),
        "has_pdf": bool(rec.get("pdf_b64")),
    }