"""
Informed-Choice Routes — backend for the master informed-choice document (Phase 3).

Endpoints (all auth-gated via check_role, mirroring contracts.py patterns):
  GET  /api/informed-choice/{state_code}          → rendered master doc for preview
  POST /api/informed-choice/{state_code}/create   → persist doc instance for a client
  POST /api/informed-choice/{doc_id}/sign         → mom/midwife signature; stamps
                                                    retention_until = signed_at + 10y
  GET  /api/informed-choice/client/{client_id}    → list docs for a client (midwife view)
  GET  /api/informed-choice/{doc_id}/pdf          → PDF export

Storage: `informed_choice_docs` collection, mirroring contracts.py storage pattern
(base64 PDF in-document; retention_until stamped at sign time).
"""
import base64
import io
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from .dependencies import check_role, db, get_now, User
from informed_choice_template import (
    assert_informed_choice_language,
    build_master_document,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/informed-choice", tags=["InformedChoice"])

RETENTION_YEARS = 10  # Chante: midwives retain 10 years for audit protection


class InformedChoiceCreate(BaseModel):
    client_id: str
    client_name: str
    midwife_id: str
    midwife_name: str
    state_code: Optional[str] = None
    decisions: dict = {}  # {procedure_key: {"choice": "opt_in"|"opt_out"|"undecided", "option": "oral"|"shot"|None}}


class SignatureIn(BaseModel):
    signer: str  # "mom" | "midwife"
    signature_name: str


def _render_pdf(doc: dict, decisions: dict) -> bytes:
    """Render the master document to PDF (reportlab, mirroring contracts.py style)."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    story = [Paragraph(doc["title"], styles["Title"]),
             Paragraph(doc["intro"].replace("\n\n", "<br/><br/>"), styles["BodyText"]),
             ]
    for item in doc["items"]:
        key = item["procedure_key"]
        d = decisions.get(key, {})
        choice = d.get("choice", "undecided")
        mark = {"opt_in": "[X]", "opt_out": "[ ]", "undecided": "[ ]"}.get(choice, "[ ]")
        mark2 = "[X]" if choice == "opt_out" else "[ ]"
        line = f"{mark} OPT IN  {mark2} OPT OUT — {item['label']}"
        if item.get("options") and choice == "opt_in":
            line += f" (option: {d.get('option', '—')})"
        story.append(Paragraph(line, styles["BodyText"]))
        if item.get("statute"):
            story.append(Paragraph(f"Statute: {item['statute']}", styles["Italic"]))
        if item.get("state_form_url"):
            story.append(Paragraph(f"State form: {item['state_form_url']}", styles["BodyText"]))
        elif item.get("state_form_note"):
            story.append(Paragraph(f"Note: {item['state_form_note']}", styles["BodyText"]))
    for block in doc["signature_block"]:
        story.append(Spacer(1, 0.3 * inch))
        story.append(Paragraph(block, styles["BodyText"]))
    pdf = SimpleDocTemplate(buf, pagesize=letter)
    pdf.build(story)
    return buf.getvalue()


def _doc_public(d: dict) -> dict:
    d.pop("_id", None)
    return d


@router.get("/{state_code}")
async def get_informed_choice_preview(state_code: str, user: User = Depends(check_role(["MIDWIFE", "DOULA", "MOM", "ADMIN"]))):
    """Rendered master document preview for a state (no persistence)."""
    try:
        doc = build_master_document(state_code.upper())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="not_configured")
    return doc


@router.post("/{state_code}/create")
async def create_informed_choice(state_code: str, payload: InformedChoiceCreate, user: User = Depends(check_role(["MIDWIFE", "ADMIN"]))):
    try:
        assert_informed_choice_language(payload.client_name + payload.midwife_name)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    doc = build_master_document(state_code.upper())
    now = get_now()
    record = {
        "doc_id": f"ic_{uuid.uuid4().hex[:12]}",
        "template_type": "informed_choice_master",
        "client_id": payload.client_id,
        "client_name": payload.client_name,
        "midwife_id": payload.midwife_id,
        "midwife_name": payload.midwife_name,
        "state_code": state_code.upper(),
        "snapshot_title": doc["title"],
        "snapshot_intro": doc["intro"],
        "items": doc["items"],
        "signature_block": doc["signature_block"],
        "decisions": payload.decisions,
        "mom_signed": None,
        "midwife_signed": None,
        "created_at": now.isoformat(),
        "retention_until": None,  # stamped at final signature
    }
    await db.informed_choice_docs.insert_one(record)
    return _doc_public(record)


@router.post("/{doc_id}/sign")
async def sign_informed_choice(doc_id: str, payload: SignatureIn, user: User = Depends(check_role(["MIDWIFE", "MOM", "ADMIN"]))):
    record = await db.informed_choice_docs.find_one({"doc_id": doc_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="not found")
    if record.get("retention_until"):
        raise HTTPException(status_code=400, detail="already fully signed")
    now = get_now()
    field = "mom_signed" if payload.signer == "mom" else "midwife_signed"
    await db.informed_choice_docs.update_one(
        {"doc_id": doc_id},
        {"$set": {field: {"name": payload.signature_name, "signed_at": now.isoformat()}}},
    )
    record = await db.informed_choice_docs.find_one({"doc_id": doc_id}, {"_id": 0})
    if record.get("mom_signed") and record.get("midwife_signed"):
        retention = now + timedelta(days=365 * RETENTION_YEARS)
        await db.informed_choice_docs.update_one(
            {"doc_id": doc_id}, {"$set": {"retention_until": retention.isoformat()}}
        )
        record["retention_until"] = retention.isoformat()
    return _doc_public(record)


@router.get("/client/{client_id}")
async def list_client_docs(client_id: str, user: User = Depends(check_role(["MIDWIFE", "ADMIN"]))):
    docs = []
    async for d in db.informed_choice_docs.find({"client_id": client_id}, {"_id": 0}):
        docs.append(d)
    return {"docs": docs, "count": len(docs)}


@router.get("/{doc_id}/pdf")
async def get_doc_pdf(doc_id: str, user: User = Depends(check_role(["MIDWIFE", "MOM", "ADMIN"]))):
    from fastapi.responses import Response
    record = await db.informed_choice_docs.find_one({"doc_id": doc_id}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="not found")
    pdf_bytes = _render_pdf(
        {"title": record["snapshot_title"], "intro": record["snapshot_intro"],
         "items": record["items"], "signature_block": record["signature_block"]},
        record.get("decisions", {}),
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=informed-choice-{doc_id}.pdf"},
    )