"""
Contracts Routes Module

Handles contract management for both Doula and Midwife providers, including:
- Contract CRUD operations
- Contract templates
- Contract defaults
- PDF generation
- E-signatures
- Email notifications
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from io import BytesIO
import uuid
import asyncio

from .dependencies import db, get_now, get_current_user, check_role, User

# Import contract templates and PDF generation
# These will be imported from the main module for now
import sys
sys.path.insert(0, '/app/backend')
from doula_contract_template import (
    get_contract_template,
    get_contract_html,
    generate_contract_text,
)
from midwife_contract_template import (
    get_midwife_contract_template,
    get_midwife_contract_html,
    generate_midwife_contract_text,
)

# Import ReportLab for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

router = APIRouter(tags=["Contracts"])

# Email sending will use dependencies
try:
    import resend
    resend.api_key = None  # Will be set from dependencies
except ImportError:
    resend = None


# ============== PYDANTIC MODELS ==============

class ContractCreate(BaseModel):
    client_id: str
    client_name: str
    doula_name: Optional[str] = None
    estimated_due_date: str
    total_fee: float
    retainer_amount: float
    remaining_balance: Optional[float] = None
    final_payment_due_description: str = "Day after birth"
    prenatal_visit_description: Optional[str] = None
    on_call_window_description: Optional[str] = None
    on_call_response_description: Optional[str] = None
    backup_doula_preferences: Optional[str] = None
    postpartum_visit_description: Optional[str] = None
    speak_for_client_exception: Optional[str] = None
    retainer_non_refundable_after_weeks: Optional[int] = 37
    cancellation_weeks_threshold: Optional[int] = 37
    final_payment_due_detail: Optional[str] = None
    cesarean_alternative_support_description: Optional[str] = None
    unreachable_timeframe_description: Optional[str] = None
    unreachable_remedy_description: Optional[str] = None
    precipitous_labor_definition: Optional[str] = None
    precipitous_labor_compensation_description: Optional[str] = None
    other_absence_policy: Optional[str] = None
    special_arrangements: Optional[str] = None


class MidwifeContractCreate(BaseModel):
    client_id: str
    midwife_practice_name: Optional[str] = None
    client_name: str
    partner_name: Optional[str] = None
    estimated_due_date: str
    planned_birth_location: str
    scope_description: Optional[str] = None
    total_fee: float
    retainer_amount: float
    remaining_balance: Optional[float] = None
    remaining_balance_due_description: Optional[str] = None
    fee_coverage_description: Optional[str] = None
    refund_policy_description: Optional[str] = None
    transfer_indications_description: Optional[str] = None
    client_refusal_of_transfer_note: Optional[str] = None
    midwife_withdrawal_reasons: Optional[str] = None
    no_refund_scenarios_description: Optional[str] = None
    on_call_window_description: Optional[str] = None
    backup_midwife_policy: Optional[str] = None
    contact_instructions_routine: Optional[str] = None
    contact_instructions_urgent: Optional[str] = None
    emergency_instructions: Optional[str] = None
    special_arrangements: Optional[str] = None


class ContractTemplateCreate(BaseModel):
    template_name: str
    template_type: str  # "doula" or "midwife"
    description: Optional[str] = None
    is_default: bool = False
    total_fee: Optional[float] = None
    retainer_amount: Optional[float] = None
    services_included: Optional[List[str]] = None
    terms_and_conditions: Optional[str] = None
    prenatal_visit_description: Optional[str] = None
    on_call_window_description: Optional[str] = None
    on_call_response_description: Optional[str] = None
    backup_doula_preferences: Optional[str] = None
    postpartum_visit_description: Optional[str] = None
    retainer_non_refundable_after_weeks: Optional[int] = None
    cancellation_weeks_threshold: Optional[int] = None
    cesarean_alternative_support_description: Optional[str] = None
    planned_birth_location: Optional[str] = None
    scope_description: Optional[str] = None
    remaining_balance_due_description: Optional[str] = None
    fee_coverage_description: Optional[str] = None
    refund_policy_description: Optional[str] = None
    transfer_indications_description: Optional[str] = None
    client_refusal_of_transfer_note: Optional[str] = None
    midwife_withdrawal_reasons: Optional[str] = None
    no_refund_scenarios_description: Optional[str] = None
    backup_midwife_policy: Optional[str] = None
    contact_instructions_routine: Optional[str] = None
    contact_instructions_urgent: Optional[str] = None
    emergency_instructions: Optional[str] = None


# ============== PDF GENERATION HELPERS ==============

def generate_doula_contract_pdf_bytes(contract: dict) -> bytes:
    """Generate PDF bytes for a doula contract using the new agreement format"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, alignment=1, spaceAfter=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=14, alignment=1, spaceAfter=10, textColor=colors.HexColor('#8B6F9C'))
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, spaceAfter=8, leading=14)
    
    elements = []
    elements.append(Paragraph("True Joy Birthing", title_style))
    elements.append(Paragraph("Doula Service Agreement", subtitle_style))
    elements.append(Spacer(1, 20))
    
    key_data = [
        ["Client", contract.get("client_name", "")],
        ["Doula", contract.get("doula_name", "")],
        ["Estimated Due Date", contract.get("estimated_due_date", "")],
        ["Total Fee", f"${contract.get('total_fee', 0):,.2f}"],
        ["Retainer Amount", f"${contract.get('retainer_amount', 0):,.2f}"],
        ["Remaining Balance", f"${contract.get('remaining_balance', 0):,.2f}"],
        ["Final Payment Due", contract.get("final_payment_due_description", "Day after birth")],
        ["Agreement Date", contract.get("agreement_date", "")],
    ]
    
    table = Table(key_data, colWidths=[150, 300])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    contract_text = contract.get("contract_text", "")
    if contract_text:
        elements.append(Paragraph("<b>Agreement Terms</b>", subtitle_style))
        paragraphs = contract_text.split('\n\n')
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.replace('\n', '<br/>'), body_style))
                elements.append(Spacer(1, 6))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<b>Signatures</b>", subtitle_style))
    
    sig_data = []
    if contract.get("doula_signature"):
        sig_data.append(["Doula Signature:", contract["doula_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["doula_signature"].get("signed_at", "")[:10] if contract["doula_signature"].get("signed_at") else ""])
    
    if contract.get("client_signature"):
        sig_data.append(["Client Signature:", contract["client_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["client_signature"].get("signed_at", "")[:10] if contract["client_signature"].get("signed_at") else ""])
    
    if sig_data:
        sig_table = Table(sig_data, colWidths=[150, 300])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(sig_table)
    
    doc.build(elements)
    return buffer.getvalue()


def generate_midwife_contract_pdf_bytes(contract: dict) -> bytes:
    """Generate PDF bytes for a midwife contract using the new agreement format"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, alignment=1, spaceAfter=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=14, alignment=1, spaceAfter=10, textColor=colors.HexColor('#5B8C7A'))
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, spaceAfter=8, leading=14)
    
    elements = []
    elements.append(Paragraph("True Joy Birthing", title_style))
    elements.append(Paragraph("Midwifery Services Agreement", subtitle_style))
    elements.append(Spacer(1, 20))
    
    key_data = [
        ["Practice/Midwife", contract.get("midwife_practice_name", "")],
        ["Client", contract.get("client_name", "")],
    ]
    if contract.get("partner_name") and contract.get("partner_name") != "N/A":
        key_data.append(["Partner/Support Person", contract["partner_name"]])
    key_data.extend([
        ["Estimated Due Date", contract.get("estimated_due_date", "")],
        ["Planned Birth Location", contract.get("planned_birth_location", "")],
        ["Total Fee", f"${contract.get('total_fee', 0):,.2f}"],
        ["Retainer Amount", f"${contract.get('retainer_amount', 0):,.2f}"],
        ["Remaining Balance", f"${contract.get('remaining_balance', 0):,.2f}"],
        ["Agreement Date", contract.get("agreement_date", "")],
    ])
    
    table = Table(key_data, colWidths=[150, 300])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    contract_text = contract.get("contract_text", "")
    if contract_text:
        elements.append(Paragraph("<b>Agreement Terms</b>", subtitle_style))
        paragraphs = contract_text.split('\n\n')
        for para in paragraphs:
            if para.strip():
                elements.append(Paragraph(para.replace('\n', '<br/>'), body_style))
                elements.append(Spacer(1, 6))
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("<b>Signatures</b>", subtitle_style))
    
    sig_data = []
    if contract.get("midwife_signature"):
        sig_data.append(["Midwife Signature:", contract["midwife_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["midwife_signature"].get("signed_at", "")[:10] if contract["midwife_signature"].get("signed_at") else ""])
    
    if contract.get("client_signature"):
        sig_data.append(["Client Signature:", contract["client_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["client_signature"].get("signed_at", "")[:10] if contract["client_signature"].get("signed_at") else ""])
    
    if contract.get("partner_name") and contract.get("partner_name") != "N/A":
        if contract.get("partner_signature"):
            sig_data.append(["Partner Signature:", contract["partner_signature"].get("signer_name", "")])
            sig_data.append(["Date Signed:", contract["partner_signature"].get("signed_at", "")[:10] if contract["partner_signature"].get("signed_at") else ""])
    
    if sig_data:
        sig_table = Table(sig_data, colWidths=[150, 300])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(sig_table)
    
    doc.build(elements)
    return buffer.getvalue()


# ============== EMAIL HELPERS ==============

# These will be initialized from dependencies
_resend_api_key = None
_sender_email = None
_create_notification = None

def init_contracts_deps(resend_key: str, sender_email: str, notification_func):
    """Initialize contract dependencies"""
    global _resend_api_key, _sender_email, _create_notification
    _resend_api_key = resend_key
    _sender_email = sender_email
    _create_notification = notification_func
    if resend and resend_key:
        resend.api_key = resend_key


async def send_signed_contract_email(contract_type: str, contract: dict, recipient_email: str, recipient_name: str, provider_name: str) -> bool:
    """Send signed contract PDF via email"""
    if not resend or not _resend_api_key:
        return False
    
    try:
        if contract_type == "midwife":
            pdf_bytes = generate_midwife_contract_pdf_bytes(contract)
            subject = f"Signed Midwifery Services Agreement - {contract.get('client_name', 'Client')}"
            filename = f"Midwifery_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}.pdf"
        else:
            pdf_bytes = generate_doula_contract_pdf_bytes(contract)
            subject = f"Signed Doula Service Agreement - {contract.get('client_name', 'Client')}"
            filename = f"Doula_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}.pdf"
        
        import base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        params = {
            "from": _sender_email,
            "to": recipient_email,
            "subject": subject,
            "html": f"""
            <h2>True Joy Birthing</h2>
            <p>Hi {recipient_name},</p>
            <p>The service agreement with {provider_name} has been signed by all parties.</p>
            <p>Please find the signed agreement attached to this email for your records.</p>
            <p>Best wishes,<br>True Joy Birthing</p>
            """,
            "attachments": [{
                "filename": filename,
                "content": pdf_base64
            }]
        }
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        print(f"Failed to send signed contract email: {e}")
        return False


# ============== DOULA CONTRACT ROUTES ==============

@router.get("/doula/contracts")
async def get_doula_contracts(user: User = Depends(check_role(["DOULA"]))):
    """Get all doula contracts"""
    contracts = await db.contracts.find(
        {"doula_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return contracts


@router.get("/doula/contract-template")
async def get_doula_contract_template_route(user: User = Depends(check_role(["DOULA"]))):
    """Get the True Joy Birthing contract template"""
    return get_contract_template()


@router.post("/doula/contracts")
async def create_doula_contract(contract_data: ContractCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new Doula Service Agreement"""
    client = await db.clients.find_one({"client_id": contract_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    remaining = contract_data.remaining_balance
    if remaining is None:
        remaining = contract_data.total_fee - contract_data.retainer_amount
    
    doula_name = contract_data.doula_name or user.full_name
    
    contract_fields = {
        "client_name": contract_data.client_name,
        "doula_name": doula_name,
        "estimated_due_date": contract_data.estimated_due_date,
        "total_fee": contract_data.total_fee,
        "retainer_amount": contract_data.retainer_amount,
        "remaining_balance": remaining,
        "final_payment_due_description": contract_data.final_payment_due_description,
        "prenatal_visit_description": contract_data.prenatal_visit_description,
        "on_call_window_description": contract_data.on_call_window_description,
        "on_call_response_description": contract_data.on_call_response_description,
        "backup_doula_preferences": contract_data.backup_doula_preferences,
        "postpartum_visit_description": contract_data.postpartum_visit_description,
        "speak_for_client_exception": contract_data.speak_for_client_exception,
        "retainer_non_refundable_after_weeks": contract_data.retainer_non_refundable_after_weeks,
        "cancellation_weeks_threshold": contract_data.cancellation_weeks_threshold,
        "final_payment_due_detail": contract_data.final_payment_due_detail,
        "cesarean_alternative_support_description": contract_data.cesarean_alternative_support_description,
        "unreachable_timeframe_description": contract_data.unreachable_timeframe_description,
        "unreachable_remedy_description": contract_data.unreachable_remedy_description,
        "precipitous_labor_definition": contract_data.precipitous_labor_definition,
        "precipitous_labor_compensation_description": contract_data.precipitous_labor_compensation_description,
        "other_absence_policy": contract_data.other_absence_policy,
        "special_arrangements": contract_data.special_arrangements,
        "agreement_date": now.strftime("%Y-%m-%d")
    }
    
    contract_text = generate_contract_text(contract_fields)
    
    contract = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "doula_id": user.user_id,
        "doula_name": doula_name,
        "client_id": contract_data.client_id,
        "client_name": contract_data.client_name,
        "estimated_due_date": contract_data.estimated_due_date,
        "total_fee": contract_data.total_fee,
        "retainer_amount": contract_data.retainer_amount,
        "remaining_balance": remaining,
        "final_payment_due_description": contract_data.final_payment_due_description,
        "agreement_date": now.strftime("%Y-%m-%d"),
        "prenatal_visit_description": contract_data.prenatal_visit_description,
        "on_call_window_description": contract_data.on_call_window_description,
        "on_call_response_description": contract_data.on_call_response_description,
        "backup_doula_preferences": contract_data.backup_doula_preferences,
        "postpartum_visit_description": contract_data.postpartum_visit_description,
        "speak_for_client_exception": contract_data.speak_for_client_exception,
        "retainer_non_refundable_after_weeks": contract_data.retainer_non_refundable_after_weeks,
        "cancellation_weeks_threshold": contract_data.cancellation_weeks_threshold,
        "final_payment_due_detail": contract_data.final_payment_due_detail,
        "cesarean_alternative_support_description": contract_data.cesarean_alternative_support_description,
        "unreachable_timeframe_description": contract_data.unreachable_timeframe_description,
        "unreachable_remedy_description": contract_data.unreachable_remedy_description,
        "precipitous_labor_definition": contract_data.precipitous_labor_definition,
        "precipitous_labor_compensation_description": contract_data.precipitous_labor_compensation_description,
        "other_absence_policy": contract_data.other_absence_policy,
        "special_arrangements": contract_data.special_arrangements,
        "contract_text": contract_text,
        "status": "Draft",
        "client_signature": None,
        "doula_signature": None,
        "sent_at": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.contracts.insert_one(contract)
    contract.pop('_id', None)
    return contract


@router.get("/contracts/{contract_id}")
async def get_contract_by_id(contract_id: str):
    """Get a doula contract by ID (public endpoint for viewing/signing)"""
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    client = await db.clients.find_one({"client_id": contract.get("client_id")}, {"_id": 0})
    doula = await db.users.find_one({"user_id": contract.get("doula_id")}, {"_id": 0, "password_hash": 0})
    doula_profile = await db.doula_profiles.find_one({"user_id": contract.get("doula_id")}, {"_id": 0})
    
    return {
        "contract": contract,
        "client": client,
        "doula": {
            "full_name": doula.get("full_name") if doula else None,
            "email": doula.get("email") if doula else None,
            "practice_name": doula_profile.get("practice_name") if doula_profile else None
        }
    }


@router.get("/contracts/{contract_id}/html")
async def get_contract_html_view(contract_id: str):
    """Get HTML version of doula contract for viewing/printing"""
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    html_content = get_contract_html(contract)
    return HTMLResponse(content=html_content)


@router.get("/contracts/{contract_id}/pdf")
async def get_contract_pdf(contract_id: str):
    """Generate and download PDF version of doula contract"""
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    pdf_bytes = generate_doula_contract_pdf_bytes(contract)
    buffer = BytesIO(pdf_bytes)
    
    filename = f"Doula_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}_{contract_id}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.put("/doula/contracts/{contract_id}")
async def update_doula_contract(contract_id: str, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Update a doula contract"""
    body = await request.json()
    
    protected_fields = ["contract_id", "doula_id", "created_at", "client_signature", "doula_signature", "signed_at"]
    update_data = {k: v for k, v in body.items() if k not in protected_fields}
    update_data["updated_at"] = get_now()
    
    if "total_fee" in update_data or "retainer_amount" in update_data:
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if contract:
            total = update_data.get("total_fee", contract.get("total_fee", 0))
            retainer = update_data.get("retainer_amount", contract.get("retainer_amount", 0))
            update_data["remaining_balance"] = total - retainer
    
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if contract:
        merged = {**contract, **update_data}
        contract_text = generate_contract_text(merged)
        update_data["contract_text"] = contract_text
    
    result = await db.contracts.update_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract updated"}


@router.post("/doula/contracts/{contract_id}/send")
async def send_doula_contract(contract_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send doula contract for signature"""
    now = get_now()
    
    contract = await db.contracts.find_one({"contract_id": contract_id, "doula_id": user.user_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    doula_signature = {
        "signer_type": "doula",
        "signer_name": user.full_name,
        "signed_at": now.isoformat()
    }
    
    await db.contracts.update_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"$set": {
            "status": "Sent",
            "doula_signature": doula_signature,
            "sent_at": now,
            "updated_at": now
        }}
    )
    
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Sent", "updated_at": now}}
    )
    
    client = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    email_sent = False
    if client and client.get("linked_mom_id") and resend and _sender_email:
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                signing_url = f"https://birth-timeline.preview.emergentagent.com/contract/{contract_id}"
                params = {
                    "from": _sender_email,
                    "to": mom["email"],
                    "subject": f"Doula Service Agreement from {user.full_name}",
                    "html": f"""
                    <h2>True Joy Birthing</h2>
                    <p>Hi {client['name']},</p>
                    <p>{user.full_name} has sent you a Doula Service Agreement to review and sign.</p>
                    <p><strong>Please review the agreement carefully and sign to confirm your services.</strong></p>
                    <p><a href="{signing_url}" style="background-color: #8B6F9C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View & Sign Contract</a></p>
                    <p>If you have any questions, please contact your doula directly.</p>
                    <p>Best wishes,<br>True Joy Birthing</p>
                    """
                }
                await asyncio.to_thread(resend.Emails.send, params)
                email_sent = True
            except Exception as e:
                print(f"Failed to send contract email: {e}")
    
    return {
        "message": "Contract sent",
        "email_sent": email_sent,
        "signing_url": f"/contract/{contract_id}"
    }


@router.post("/contracts/{contract_id}/sign")
async def sign_doula_contract(contract_id: str, request: Request):
    """Client signs the doula contract"""
    body = await request.json()
    signer_name = body.get("signer_name", "")
    signature_data = body.get("signature_data", "")
    
    if not signer_name.strip():
        raise HTTPException(status_code=400, detail="Signer name is required")
    
    now = get_now()
    
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") == "Signed":
        raise HTTPException(status_code=400, detail="Contract already signed")
    
    if contract.get("status") != "Sent":
        raise HTTPException(status_code=400, detail="Contract must be sent before signing")
    
    client_signature = {
        "signer_type": "client",
        "signer_name": signer_name.strip(),
        "signature_data": signature_data,
        "signed_at": now.isoformat()
    }
    
    await db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "status": "Signed",
            "client_signature": client_signature,
            "signed_at": now,
            "updated_at": now
        }}
    )
    
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Signed", "updated_at": now}}
    )
    
    # Send notification
    if _create_notification:
        await _create_notification(
            user_id=contract["doula_id"],
            notif_type="contract_signed",
            title="Contract Signed",
            message=f"{signer_name} has signed the Doula Service Agreement",
            data={"contract_id": contract_id}
        )
    
    updated_contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    doula = await db.users.find_one({"user_id": contract["doula_id"]}, {"_id": 0, "password_hash": 0})
    client_record = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    emails_sent = {"doula": False, "client": False}
    
    if doula and doula.get("email"):
        emails_sent["doula"] = await send_signed_contract_email(
            "doula", 
            updated_contract,
            doula["email"],
            doula.get("full_name", ""),
            doula.get("full_name", "")
        )
    
    if client_record and client_record.get("linked_mom_id"):
        mom = await db.users.find_one({"user_id": client_record["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            emails_sent["client"] = await send_signed_contract_email(
                "doula",
                updated_contract,
                mom["email"],
                contract.get("client_name", ""),
                doula.get("full_name", "") if doula else ""
            )
    
    return {"message": "Contract signed successfully", "emails_sent": emails_sent}


@router.delete("/doula/contracts/{contract_id}")
async def delete_doula_contract(contract_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Delete a draft doula contract"""
    contract = await db.contracts.find_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"_id": 0}
    )
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") != "Draft":
        raise HTTPException(status_code=400, detail="Only draft contracts can be deleted")
    
    await db.contracts.delete_one({"contract_id": contract_id, "doula_id": user.user_id})
    return {"message": "Contract deleted"}


@router.post("/doula/contracts/{contract_id}/duplicate")
async def duplicate_doula_contract(contract_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Duplicate an existing doula contract"""
    original = await db.contracts.find_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"_id": 0}
    )
    
    if not original:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    now = get_now()
    new_contract_id = f"contract_{uuid.uuid4().hex[:12]}"
    
    new_contract = {
        "contract_id": new_contract_id,
        "doula_id": user.user_id,
        "doula_name": original.get("doula_name", user.full_name),
        "client_id": None,
        "client_name": f"[Copy of {original.get('client_name', 'Contract')}]",
        "estimated_due_date": original.get("estimated_due_date", ""),
        "total_fee": original.get("total_fee", 0),
        "retainer_amount": original.get("retainer_amount", 0),
        "remaining_balance": original.get("remaining_balance", 0),
        "final_payment_due_description": original.get("final_payment_due_description", "Day after birth"),
        "agreement_date": now.strftime("%Y-%m-%d"),
        "prenatal_visit_description": original.get("prenatal_visit_description"),
        "on_call_window_description": original.get("on_call_window_description"),
        "on_call_response_description": original.get("on_call_response_description"),
        "backup_doula_preferences": original.get("backup_doula_preferences"),
        "postpartum_visit_description": original.get("postpartum_visit_description"),
        "speak_for_client_exception": original.get("speak_for_client_exception"),
        "retainer_non_refundable_after_weeks": original.get("retainer_non_refundable_after_weeks", 37),
        "cancellation_weeks_threshold": original.get("cancellation_weeks_threshold", 37),
        "final_payment_due_detail": original.get("final_payment_due_detail"),
        "cesarean_alternative_support_description": original.get("cesarean_alternative_support_description"),
        "unreachable_timeframe_description": original.get("unreachable_timeframe_description"),
        "unreachable_remedy_description": original.get("unreachable_remedy_description"),
        "precipitous_labor_definition": original.get("precipitous_labor_definition"),
        "precipitous_labor_compensation_description": original.get("precipitous_labor_compensation_description"),
        "other_absence_policy": original.get("other_absence_policy"),
        "special_arrangements": original.get("special_arrangements"),
        "contract_text": None,
        "status": "Draft",
        "client_signature": None,
        "doula_signature": None,
        "sent_at": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.contracts.insert_one(new_contract)
    del new_contract["_id"]
    
    return {
        "message": "Contract duplicated successfully",
        "contract": new_contract
    }


# ============== MIDWIFE CONTRACT ROUTES ==============

@router.get("/midwife/contracts")
async def get_midwife_contracts(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all midwife contracts"""
    contracts = await db.midwife_contracts.find(
        {"midwife_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return contracts


@router.get("/midwife/contract-template")
async def get_midwife_contract_template_endpoint(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get the Midwifery Services Agreement template"""
    return get_midwife_contract_template()


@router.post("/midwife/contracts")
async def create_midwife_contract(contract_data: MidwifeContractCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new Midwifery Services Agreement"""
    client = await db.clients.find_one(
        {"client_id": contract_data.client_id, "provider_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    remaining = contract_data.remaining_balance
    if remaining is None:
        remaining = contract_data.total_fee - contract_data.retainer_amount
    
    midwife_practice_name = contract_data.midwife_practice_name or user.full_name
    
    contract_fields = {
        "midwife_practice_name": midwife_practice_name,
        "client_name": contract_data.client_name,
        "partner_name": contract_data.partner_name or "N/A",
        "agreement_date": now.strftime("%B %d, %Y"),
        "estimated_due_date": contract_data.estimated_due_date,
        "planned_birth_location": contract_data.planned_birth_location,
        "scope_description": contract_data.scope_description,
        "total_fee": contract_data.total_fee,
        "retainer_amount": contract_data.retainer_amount,
        "remaining_balance": remaining,
        "remaining_balance_due_description": contract_data.remaining_balance_due_description,
        "fee_coverage_description": contract_data.fee_coverage_description,
        "refund_policy_description": contract_data.refund_policy_description,
        "transfer_indications_description": contract_data.transfer_indications_description,
        "client_refusal_of_transfer_note": contract_data.client_refusal_of_transfer_note,
        "midwife_withdrawal_reasons": contract_data.midwife_withdrawal_reasons,
        "no_refund_scenarios_description": contract_data.no_refund_scenarios_description,
        "on_call_window_description": contract_data.on_call_window_description,
        "backup_midwife_policy": contract_data.backup_midwife_policy,
        "contact_instructions_routine": contract_data.contact_instructions_routine,
        "contact_instructions_urgent": contract_data.contact_instructions_urgent,
        "emergency_instructions": contract_data.emergency_instructions,
        "special_arrangements": contract_data.special_arrangements
    }
    
    contract_text = generate_midwife_contract_text(contract_fields)
    
    contract = {
        "contract_id": f"mw_contract_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "midwife_practice_name": midwife_practice_name,
        "client_id": contract_data.client_id,
        "client_name": contract_data.client_name,
        "partner_name": contract_data.partner_name,
        "estimated_due_date": contract_data.estimated_due_date,
        "agreement_date": now.strftime("%Y-%m-%d"),
        "planned_birth_location": contract_data.planned_birth_location,
        "scope_description": contract_data.scope_description,
        "total_fee": contract_data.total_fee,
        "retainer_amount": contract_data.retainer_amount,
        "remaining_balance": remaining,
        "remaining_balance_due_description": contract_data.remaining_balance_due_description,
        "fee_coverage_description": contract_data.fee_coverage_description,
        "refund_policy_description": contract_data.refund_policy_description,
        "transfer_indications_description": contract_data.transfer_indications_description,
        "client_refusal_of_transfer_note": contract_data.client_refusal_of_transfer_note,
        "midwife_withdrawal_reasons": contract_data.midwife_withdrawal_reasons,
        "no_refund_scenarios_description": contract_data.no_refund_scenarios_description,
        "on_call_window_description": contract_data.on_call_window_description,
        "backup_midwife_policy": contract_data.backup_midwife_policy,
        "contact_instructions_routine": contract_data.contact_instructions_routine,
        "contact_instructions_urgent": contract_data.contact_instructions_urgent,
        "emergency_instructions": contract_data.emergency_instructions,
        "special_arrangements": contract_data.special_arrangements,
        "contract_text": contract_text,
        "status": "Draft",
        "client_signature": None,
        "midwife_signature": None,
        "partner_signature": None,
        "sent_at": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.midwife_contracts.insert_one(contract)
    contract.pop('_id', None)
    return contract


@router.get("/midwife/contracts/{contract_id}")
async def get_midwife_contract_detail(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific midwife contract"""
    contract = await db.midwife_contracts.find_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.get("/midwife-contracts/{contract_id}")
async def get_midwife_contract_by_id(contract_id: str):
    """Get a midwife contract by ID (public endpoint for viewing/signing)"""
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    client = await db.clients.find_one({"client_id": contract.get("client_id")}, {"_id": 0})
    midwife = await db.users.find_one({"user_id": contract.get("midwife_id")}, {"_id": 0, "password_hash": 0})
    midwife_profile = await db.midwife_profiles.find_one({"user_id": contract.get("midwife_id")}, {"_id": 0})
    
    return {
        "contract": contract,
        "client": client,
        "midwife": {
            "full_name": midwife.get("full_name") if midwife else None,
            "email": midwife.get("email") if midwife else None,
            "practice_name": midwife_profile.get("practice_name") if midwife_profile else None
        }
    }


@router.get("/midwife-contracts/{contract_id}/html")
async def get_midwife_contract_html_view(contract_id: str):
    """Get HTML version of midwife contract for viewing/printing"""
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    html_content = get_midwife_contract_html(contract)
    return HTMLResponse(content=html_content)


@router.get("/midwife-contracts/{contract_id}/pdf")
async def get_midwife_contract_pdf(contract_id: str):
    """Generate and download PDF version of midwife contract"""
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    pdf_bytes = generate_midwife_contract_pdf_bytes(contract)
    buffer = BytesIO(pdf_bytes)
    
    filename = f"Midwifery_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}_{contract_id}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.put("/midwife/contracts/{contract_id}")
async def update_midwife_contract(contract_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a midwife contract"""
    body = await request.json()
    
    protected_fields = ["contract_id", "midwife_id", "created_at", "client_signature", "midwife_signature", "signed_at"]
    update_data = {k: v for k, v in body.items() if k not in protected_fields}
    update_data["updated_at"] = get_now()
    
    if "total_fee" in update_data or "deposit" in update_data:
        contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if contract:
            total = update_data.get("total_fee", contract.get("total_fee", 0))
            deposit = update_data.get("deposit", contract.get("deposit", 0))
            update_data["remaining_balance"] = total - deposit
    
    result = await db.midwife_contracts.update_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract updated"}


@router.delete("/midwife/contracts/{contract_id}")
async def delete_midwife_contract(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a draft midwife contract"""
    contract = await db.midwife_contracts.find_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") != "Draft":
        raise HTTPException(status_code=400, detail="Only draft contracts can be deleted")
    
    await db.midwife_contracts.delete_one({"contract_id": contract_id, "midwife_id": user.user_id})
    return {"message": "Contract deleted"}


@router.post("/midwife/contracts/{contract_id}/duplicate")
async def duplicate_midwife_contract(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Duplicate an existing midwife contract"""
    original = await db.midwife_contracts.find_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    
    if not original:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    now = get_now()
    new_contract_id = f"mw_contract_{uuid.uuid4().hex[:12]}"
    
    new_contract = {
        "contract_id": new_contract_id,
        "midwife_id": user.user_id,
        "midwife_practice_name": original.get("midwife_practice_name", user.full_name),
        "client_id": None,
        "client_name": f"[Copy of {original.get('client_name', 'Contract')}]",
        "partner_name": original.get("partner_name"),
        "estimated_due_date": original.get("estimated_due_date", ""),
        "agreement_date": now.strftime("%Y-%m-%d"),
        "planned_birth_location": original.get("planned_birth_location", ""),
        "scope_description": original.get("scope_description"),
        "total_fee": original.get("total_fee", 0),
        "retainer_amount": original.get("retainer_amount", 0),
        "remaining_balance": original.get("remaining_balance", 0),
        "remaining_balance_due_description": original.get("remaining_balance_due_description"),
        "fee_coverage_description": original.get("fee_coverage_description"),
        "refund_policy_description": original.get("refund_policy_description"),
        "transfer_indications_description": original.get("transfer_indications_description"),
        "client_refusal_of_transfer_note": original.get("client_refusal_of_transfer_note"),
        "midwife_withdrawal_reasons": original.get("midwife_withdrawal_reasons"),
        "no_refund_scenarios_description": original.get("no_refund_scenarios_description"),
        "on_call_window_description": original.get("on_call_window_description"),
        "backup_midwife_policy": original.get("backup_midwife_policy"),
        "contact_instructions_routine": original.get("contact_instructions_routine"),
        "contact_instructions_urgent": original.get("contact_instructions_urgent"),
        "emergency_instructions": original.get("emergency_instructions"),
        "special_arrangements": original.get("special_arrangements"),
        "contract_text": None,
        "status": "Draft",
        "client_signature": None,
        "midwife_signature": None,
        "partner_signature": None,
        "sent_at": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.midwife_contracts.insert_one(new_contract)
    del new_contract["_id"]
    
    return {
        "message": "Contract duplicated successfully",
        "contract": new_contract
    }


@router.post("/midwife/contracts/{contract_id}/send")
async def send_midwife_contract(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Send midwife contract for signature"""
    now = get_now()
    
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id, "midwife_id": user.user_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    midwife_signature = {
        "signer_type": "midwife",
        "signer_name": user.full_name,
        "signed_at": now.isoformat()
    }
    
    await db.midwife_contracts.update_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"$set": {
            "status": "Sent",
            "midwife_signature": midwife_signature,
            "sent_at": now,
            "updated_at": now
        }}
    )
    
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Sent", "updated_at": now}}
    )
    
    client = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    email_sent = False
    if client and client.get("linked_mom_id") and resend and _sender_email:
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                signing_url = f"https://birth-timeline.preview.emergentagent.com/sign-midwife-contract?contractId={contract_id}"
                params = {
                    "from": _sender_email,
                    "to": mom["email"],
                    "subject": f"Midwifery Services Agreement from {user.full_name}",
                    "html": f"""
                    <h2>True Joy Birthing</h2>
                    <p>Hi {contract['client_name']},</p>
                    <p>{user.full_name} has sent you a Midwifery Services Agreement to review and sign.</p>
                    <p><strong>Please review the agreement carefully and sign to confirm your care arrangement.</strong></p>
                    <p><a href="{signing_url}" style="background-color: #5B8C7A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View & Sign Agreement</a></p>
                    <p>If you have any questions, please contact your midwife directly.</p>
                    <p>Best wishes,<br>True Joy Birthing</p>
                    """
                }
                await asyncio.to_thread(resend.Emails.send, params)
                email_sent = True
            except Exception as e:
                print(f"Failed to send midwife contract email: {e}")
    
    return {
        "message": "Contract sent",
        "email_sent": email_sent,
        "signing_url": f"/sign-midwife-contract?contractId={contract_id}"
    }


@router.post("/midwife-contracts/{contract_id}/sign")
async def sign_midwife_contract(contract_id: str, request: Request):
    """Client signs the midwife contract"""
    body = await request.json()
    signer_name = body.get("signer_name", "")
    signature_data = body.get("signature_data", "")
    
    if not signer_name.strip():
        raise HTTPException(status_code=400, detail="Signer name is required")
    
    now = get_now()
    
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") == "Signed":
        raise HTTPException(status_code=400, detail="Contract already signed")
    
    if contract.get("status") != "Sent":
        raise HTTPException(status_code=400, detail="Contract must be sent before signing")
    
    client_signature = {
        "signer_type": "client",
        "signer_name": signer_name.strip(),
        "signature_data": signature_data,
        "signed_at": now.isoformat()
    }
    
    await db.midwife_contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "status": "Signed",
            "client_signature": client_signature,
            "signed_at": now,
            "updated_at": now
        }}
    )
    
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Signed", "updated_at": now}}
    )
    
    if _create_notification:
        await _create_notification(
            user_id=contract["midwife_id"],
            notif_type="contract_signed",
            title="Contract Signed",
            message=f"{signer_name} has signed the Midwifery Services Agreement",
            data={"contract_id": contract_id}
        )
    
    updated_contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    midwife = await db.users.find_one({"user_id": contract["midwife_id"]}, {"_id": 0, "password_hash": 0})
    client_record = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    emails_sent = {"midwife": False, "client": False}
    
    if midwife and midwife.get("email"):
        emails_sent["midwife"] = await send_signed_contract_email(
            "midwife", 
            updated_contract,
            midwife["email"],
            midwife.get("full_name", ""),
            midwife.get("full_name", "")
        )
    
    if client_record and client_record.get("linked_mom_id"):
        mom = await db.users.find_one({"user_id": client_record["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            emails_sent["client"] = await send_signed_contract_email(
                "midwife",
                updated_contract,
                mom["email"],
                contract.get("client_name", ""),
                midwife.get("full_name", "") if midwife else ""
            )
    
    return {"message": "Contract signed successfully", "emails_sent": emails_sent}


# ============== CONTRACT DEFAULTS ROUTES ==============

@router.get("/midwife/contract-defaults")
async def get_midwife_contract_defaults(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get saved contract defaults for this midwife"""
    defaults = await db.contract_defaults.find_one(
        {"user_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    )
    return defaults or {}


@router.put("/midwife/contract-defaults")
async def save_midwife_contract_defaults(request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Save contract text defaults for future contracts"""
    data = await request.json()
    now = get_now()
    await db.contract_defaults.update_one(
        {"user_id": user.user_id, "provider_type": "MIDWIFE"},
        {"$set": {
            **data,
            "user_id": user.user_id,
            "provider_type": "MIDWIFE",
            "updated_at": now
        }},
        upsert=True
    )
    return {"message": "Contract defaults saved"}


# ============== CONTRACT TEMPLATES ROUTES ==============

@router.get("/contract-templates")
async def get_contract_templates(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all contract templates for the current user"""
    template_type = "doula" if user.role == "DOULA" else "midwife"
    
    templates = await db.contract_templates.find(
        {"provider_id": user.user_id, "template_type": template_type},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return templates


@router.post("/contract-templates")
async def create_contract_template(template_data: ContractTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create a new contract template"""
    now = get_now()
    expected_type = "doula" if user.role == "DOULA" else "midwife"
    
    if template_data.template_type != expected_type:
        raise HTTPException(status_code=400, detail=f"Template type must be '{expected_type}' for your role")
    
    if template_data.is_default:
        await db.contract_templates.update_many(
            {"provider_id": user.user_id, "template_type": expected_type, "is_default": True},
            {"$set": {"is_default": False, "updated_at": now}}
        )
    
    template_fields = {}
    for field in [
        "total_fee", "retainer_amount", "services_included", "terms_and_conditions",
        "prenatal_visit_description", "on_call_window_description", "on_call_response_description",
        "backup_doula_preferences", "postpartum_visit_description", "retainer_non_refundable_after_weeks",
        "cancellation_weeks_threshold", "cesarean_alternative_support_description",
        "planned_birth_location", "scope_description", "remaining_balance_due_description",
        "fee_coverage_description", "refund_policy_description", "transfer_indications_description",
        "client_refusal_of_transfer_note", "midwife_withdrawal_reasons", "no_refund_scenarios_description",
        "backup_midwife_policy", "contact_instructions_routine", "contact_instructions_urgent",
        "emergency_instructions"
    ]:
        value = getattr(template_data, field, None)
        if value is not None:
            template_fields[field] = value
    
    template = {
        "template_id": f"tmpl_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "template_name": template_data.template_name,
        "template_type": template_data.template_type,
        "description": template_data.description,
        "is_default": template_data.is_default,
        "template_data": template_fields,
        "created_at": now,
        "updated_at": now
    }
    
    await db.contract_templates.insert_one(template)
    template.pop('_id', None)
    return template


@router.get("/contract-templates/{template_id}")
async def get_contract_template_by_id(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get a specific contract template"""
    template = await db.contract_templates.find_one(
        {"template_id": template_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template


@router.put("/contract-templates/{template_id}")
async def update_contract_template(template_id: str, template_data: ContractTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a contract template"""
    now = get_now()
    expected_type = "doula" if user.role == "DOULA" else "midwife"
    
    existing = await db.contract_templates.find_one(
        {"template_id": template_id, "provider_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    if template_data.is_default:
        await db.contract_templates.update_many(
            {"provider_id": user.user_id, "template_type": expected_type, "is_default": True, "template_id": {"$ne": template_id}},
            {"$set": {"is_default": False, "updated_at": now}}
        )
    
    template_fields = {}
    for field in [
        "total_fee", "retainer_amount", "services_included", "terms_and_conditions",
        "prenatal_visit_description", "on_call_window_description", "on_call_response_description",
        "backup_doula_preferences", "postpartum_visit_description", "retainer_non_refundable_after_weeks",
        "cancellation_weeks_threshold", "cesarean_alternative_support_description",
        "planned_birth_location", "scope_description", "remaining_balance_due_description",
        "fee_coverage_description", "refund_policy_description", "transfer_indications_description",
        "client_refusal_of_transfer_note", "midwife_withdrawal_reasons", "no_refund_scenarios_description",
        "backup_midwife_policy", "contact_instructions_routine", "contact_instructions_urgent",
        "emergency_instructions"
    ]:
        value = getattr(template_data, field, None)
        if value is not None:
            template_fields[field] = value
    
    update_data = {
        "template_name": template_data.template_name,
        "description": template_data.description,
        "is_default": template_data.is_default,
        "template_data": template_fields,
        "updated_at": now
    }
    
    await db.contract_templates.update_one(
        {"template_id": template_id},
        {"$set": update_data}
    )
    
    return {"message": "Template updated", "template_id": template_id}


@router.delete("/contract-templates/{template_id}")
async def delete_contract_template(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a contract template"""
    result = await db.contract_templates.delete_one(
        {"template_id": template_id, "provider_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


@router.post("/contract-templates/{template_id}/set-default")
async def set_default_template(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Set a template as the default"""
    now = get_now()
    expected_type = "doula" if user.role == "DOULA" else "midwife"
    
    template = await db.contract_templates.find_one(
        {"template_id": template_id, "provider_id": user.user_id}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.contract_templates.update_many(
        {"provider_id": user.user_id, "template_type": expected_type},
        {"$set": {"is_default": False, "updated_at": now}}
    )
    
    await db.contract_templates.update_one(
        {"template_id": template_id},
        {"$set": {"is_default": True, "updated_at": now}}
    )
    
    return {"message": "Template set as default"}
