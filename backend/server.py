from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx
import resend

# Import weekly content
from weekly_content import (
    WEEKLY_TIPS, POSTPARTUM_TIPS,
    WEEKLY_AFFIRMATIONS, POSTPARTUM_AFFIRMATIONS,
    GENERIC_POSTPARTUM_AFFIRMATION,
    get_weekly_tip, get_weekly_affirmation
)

# Import doula contract template
from doula_contract_template import (
    DOULA_CONTRACT_TEMPLATE,
    get_contract_template,
    get_contract_html
)

# Import midwife contract template
from midwife_contract_template import (
    MIDWIFE_CONTRACT_TEMPLATE,
    get_midwife_contract_template,
    get_midwife_contract_html
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Resend Email Configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'true-joy-birthing-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="True Joy Birthing API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== ENUMS ==============
ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]
BIRTH_SETTINGS = ["Home", "Hospital", "Birth Center", "Not sure"]
CLIENT_STATUS_DOULA = ["Lead", "Contract Sent", "Contract Signed", "Active", "Postpartum", "Completed"]
CLIENT_STATUS_MIDWIFE = ["Prenatal", "Contract Sent", "Contract Signed", "In Labor", "Postpartum", "Completed"]
CONTRACT_STATUS = ["Draft", "Sent", "Signed"]
INVOICE_STATUS = ["Draft", "Sent", "Paid", "Overdue"]
MOOD_SCALE = ["Very low", "Low", "Neutral", "Good", "Great"]
NOTE_TYPES = ["Prenatal", "Birth", "Postpartum"]
VISIT_TYPES = ["Prenatal", "Postpartum"]
BIRTH_MODES = ["Spontaneous Vaginal", "Assisted Vaginal", "Cesarean", "Other"]
SERVICES_OFFERED = ["Birth Doula", "Postpartum Doula", "Virtual Doula"]
MIDWIFE_CREDENTIALS = ["CPM", "LM", "CNM"]

# ============== PDF GENERATION HELPERS ==============

def generate_midwife_contract_pdf_bytes(contract: dict) -> bytes:
    """Generate PDF bytes for a midwife contract"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from io import BytesIO
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#5B8C7A'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#5B8C7A'), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8)
    intro_style = ParagraphStyle('Intro', parent=styles['Normal'], fontSize=10, leading=14, fontName='Helvetica-Oblique', spaceAfter=15)
    
    elements = []
    
    # Title
    elements.append(Paragraph("Midwifery Services Agreement", title_style))
    if contract.get("practice_name"):
        elements.append(Paragraph(contract["practice_name"], styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Intro
    intro_text = f"This Midwifery Services Agreement is made between <b>{contract.get('midwife_name', '')}</b> (Midwife/Practice) and <b>{contract.get('client_name', '')}</b> (Client) as of <b>{contract.get('agreement_date', '')}</b>."
    if contract.get("partner_name"):
        intro_text += f" The Partner or primary support person is <b>{contract['partner_name']}</b>."
    elements.append(Paragraph(intro_text, intro_style))
    elements.append(Spacer(1, 10))
    
    # Care Details
    elements.append(Paragraph("Care Details", heading_style))
    care_data = [["Client Name", contract.get("client_name", "")]]
    if contract.get("partner_name"):
        care_data.append(["Partner/Support Person", contract["partner_name"]])
    care_data.extend([
        ["Estimated Due Date", contract.get("estimated_due_date", "")],
        ["Planned Birth Location", contract.get("planned_birth_place", "")],
        ["On-Call Period", f"{contract.get('on_call_start_week', '37')} to {contract.get('on_call_end_week', '42')} weeks"],
    ])
    care_table = Table(care_data, colWidths=[2.5*inch, 4*inch])
    care_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f7f4')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(care_table)
    elements.append(Spacer(1, 15))
    
    # Payment Details
    elements.append(Paragraph("Payment Details", heading_style))
    payment_data = [
        ["Total Fee", f"${contract.get('total_fee', 0):,.2f}"],
        ["Non-Refundable Deposit", f"${contract.get('deposit', 0):,.2f}"],
        ["Remaining Balance", f"${contract.get('remaining_balance', 0):,.2f}"],
        ["Balance Due By", f"{contract.get('balance_due_week', '36')} weeks' gestation"],
    ]
    payment_table = Table(payment_data, colWidths=[2.5*inch, 4*inch])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f7f4')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(payment_table)
    
    # Sections
    for section in contract.get("sections", []):
        elements.append(Paragraph(section.get("title", ""), heading_style))
        content = section.get("custom_content") or section.get("content", "")
        for para in content.split('\n\n'):
            if para.strip():
                elements.append(Paragraph(para.strip().replace('\n', '<br/>'), body_style))
    
    if contract.get("additional_terms"):
        elements.append(Paragraph("Additional Terms", heading_style))
        elements.append(Paragraph(contract["additional_terms"], body_style))
    
    # Signatures
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Signatures", heading_style))
    sig_data = []
    if contract.get("midwife_signature"):
        sig_data.append(["Midwife Signature:", contract["midwife_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["midwife_signature"].get("signed_at", "")[:10] if contract["midwife_signature"].get("signed_at") else ""])
    if contract.get("client_signature"):
        sig_data.append(["Client Signature:", contract["client_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["client_signature"].get("signed_at", "")[:10] if contract["client_signature"].get("signed_at") else ""])
    if sig_data:
        sig_table = Table(sig_data, colWidths=[2*inch, 4.5*inch])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(sig_table)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

def generate_doula_contract_pdf_bytes(contract: dict) -> bytes:
    """Generate PDF bytes for a doula contract"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from io import BytesIO
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#9F83B6'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#9F83B6'), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8)
    intro_style = ParagraphStyle('Intro', parent=styles['Normal'], fontSize=10, leading=14, fontName='Helvetica-Oblique', spaceAfter=15)
    
    elements = []
    
    # Title
    elements.append(Paragraph("True Joy Birthing Doula Service Agreement", title_style))
    elements.append(Spacer(1, 20))
    
    # Intro
    intro_text = f"This Service Agreement is made between <b>{contract.get('doula_name', '')}</b> (Doula) and <b>{contract.get('client_name', '')}</b> (Client) as of <b>{contract.get('agreement_date', '')}</b>."
    if contract.get("partner_name"):
        intro_text += f" The Partner is <b>{contract['partner_name']}</b>."
    elements.append(Paragraph(intro_text, intro_style))
    elements.append(Spacer(1, 10))
    
    # Client Details
    elements.append(Paragraph("Client Details", heading_style))
    client_data = [["Client Name", contract.get("client_name", "")]]
    if contract.get("partner_name"):
        client_data.append(["Partner Name", contract["partner_name"]])
    client_data.extend([
        ["Estimated Due Date", contract.get("estimated_due_date", "")],
        ["Birth Location", contract.get("intended_birth_place", "")],
    ])
    client_table = Table(client_data, colWidths=[2.5*inch, 4*inch])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f0f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 15))
    
    # Payment Details
    elements.append(Paragraph("Payment Details", heading_style))
    payment_data = [
        ["Total Payment Amount", f"${contract.get('total_payment_amount', 0):,.2f}"],
        ["Retainer Fee (Non-refundable)", f"${contract.get('retainer_fee', 0):,.2f}"],
        ["Remaining Amount", f"${contract.get('remaining_payment_amount', 0):,.2f}"],
        ["Final Payment Due", contract.get("final_payment_due_date", "")],
    ]
    payment_table = Table(payment_data, colWidths=[2.5*inch, 4*inch])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f0f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(payment_table)
    
    # Sections
    for section in contract.get("sections", []):
        elements.append(Paragraph(section.get("title", ""), heading_style))
        content = section.get("custom_content") or section.get("content", "")
        for para in content.split('\n\n'):
            if para.strip():
                elements.append(Paragraph(para.strip().replace('\n', '<br/>'), body_style))
    
    if contract.get("additional_terms"):
        elements.append(Paragraph("Additional Terms", heading_style))
        elements.append(Paragraph(contract["additional_terms"], body_style))
    
    # Signatures
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Signatures", heading_style))
    sig_data = []
    if contract.get("doula_signature"):
        sig_data.append(["Doula Signature:", contract["doula_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["doula_signature"].get("signed_at", "")[:10] if contract["doula_signature"].get("signed_at") else ""])
    if contract.get("client_signature"):
        sig_data.append(["Client Signature:", contract["client_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["client_signature"].get("signed_at", "")[:10] if contract["client_signature"].get("signed_at") else ""])
    if sig_data:
        sig_table = Table(sig_data, colWidths=[2*inch, 4.5*inch])
        sig_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(sig_table)
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

async def send_signed_contract_email(contract_type: str, contract: dict, recipient_email: str, recipient_name: str, provider_name: str):
    """Send signed contract PDF via email"""
    import base64
    
    try:
        # Generate PDF
        if contract_type == "midwife":
            pdf_bytes = generate_midwife_contract_pdf_bytes(contract)
            subject = f"Your Signed Midwifery Services Agreement - {provider_name}"
            filename = f"Midwifery_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}.pdf"
        else:
            pdf_bytes = generate_doula_contract_pdf_bytes(contract)
            subject = f"Your Signed Doula Service Agreement - {provider_name}"
            filename = f"Doula_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}.pdf"
        
        # Encode PDF as base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Format the signed_at date
        signed_at = contract.get('signed_at', '')
        if signed_at:
            if hasattr(signed_at, 'strftime'):
                signed_at_str = signed_at.strftime('%Y-%m-%d')
            elif isinstance(signed_at, str):
                signed_at_str = signed_at[:10]
            else:
                signed_at_str = str(signed_at)[:10]
        else:
            signed_at_str = 'N/A'
        
        params = {
            "from": SENDER_EMAIL,
            "to": recipient_email,
            "subject": subject,
            "html": f"""
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #5B8C7A;">True Joy Birthing</h2>
                <p>Hi {recipient_name},</p>
                <p>Your {"Midwifery Services" if contract_type == "midwife" else "Doula Service"} Agreement has been fully signed by both parties.</p>
                <p>Please find the signed contract attached to this email for your records.</p>
                <div style="background: #f9fdfb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Agreement Details:</strong></p>
                    <ul style="margin: 10px 0;">
                        <li>Client: {contract.get('client_name', '')}</li>
                        <li>{"Midwife" if contract_type == "midwife" else "Doula"}: {provider_name}</li>
                        <li>Date Signed: {signed_at_str}</li>
                    </ul>
                </div>
                <p>If you have any questions about your agreement, please contact your {"midwife" if contract_type == "midwife" else "doula"} directly.</p>
                <p>Best wishes,<br>True Joy Birthing</p>
            </div>
            """,
            "attachments": [
                {
                    "filename": filename,
                    "content": pdf_base64,
                }
            ]
        }
        
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        print(f"Failed to send signed contract email: {e}")
        return False

# ============== PYDANTIC MODELS ==============

# --- User Models ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "MOM"
    
class UserCreate(UserBase):
    password: Optional[str] = None  # Optional for OAuth users

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    picture: Optional[str] = None
    onboarding_completed: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Mom Models ---
class MomProfile(BaseModel):
    user_id: str
    due_date: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    connected_doula_id: Optional[str] = None
    connected_midwife_id: Optional[str] = None

class MomProfileUpdate(BaseModel):
    due_date: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    zip_code: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None

# --- Birth Plan Models ---
class BirthPlanSection(BaseModel):
    section_id: str
    title: str
    status: str = "Not started"  # Not started, In progress, Complete
    data: Dict[str, Any] = {}
    notes_to_provider: Optional[str] = None
    discussion_notes: List[Dict[str, Any]] = []  # For doula/midwife notes

class BirthPlan(BaseModel):
    plan_id: str
    user_id: str
    sections: List[BirthPlanSection] = []
    completion_percentage: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

BIRTH_PLAN_SECTIONS = [
    {"section_id": "about_me", "title": "About Me & My Preferences"},
    {"section_id": "labor_delivery", "title": "Labor & Delivery Preferences"},
    {"section_id": "pain_management", "title": "Pain Management"},
    {"section_id": "monitoring_iv", "title": "Labor Environment & Comfort"},
    {"section_id": "induction_interventions", "title": "Induction & Birth Interventions"},
    {"section_id": "pushing_safe_word", "title": "Pushing, Delivery & Safe Word"},
    {"section_id": "post_delivery", "title": "Post-Delivery Preferences"},
    {"section_id": "newborn_care", "title": "Newborn Care Preferences"},
    {"section_id": "other_considerations", "title": "Other Important Considerations"},
]

# --- Wellness Models ---
class WellnessCheckIn(BaseModel):
    checkin_id: str
    user_id: str
    mood: str  # Very low, Low, Neutral, Good, Great
    mood_note: Optional[str] = None
    created_at: datetime

class WellnessCheckInCreate(BaseModel):
    mood: str
    mood_note: Optional[str] = None

# --- Postpartum Models ---
class PostpartumPlan(BaseModel):
    plan_id: str
    user_id: str
    visitor_preferences: Optional[str] = None
    feeding_preferences: Optional[str] = None
    sleep_boundaries: Optional[str] = None
    mental_health_concerns: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Doula Models ---
class DoulaProfile(BaseModel):
    user_id: str
    practice_name: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    services_offered: List[str] = []
    years_in_practice: Optional[int] = None
    accepting_new_clients: bool = True
    bio: Optional[str] = None
    in_marketplace: bool = False

class DoulaProfileUpdate(BaseModel):
    practice_name: Optional[str] = None
    zip_code: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    services_offered: Optional[List[str]] = None
    years_in_practice: Optional[int] = None
    accepting_new_clients: Optional[bool] = None
    bio: Optional[str] = None

# --- Client Models (for Doula/Midwife) ---
class ClientBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    edd: Optional[str] = None  # Estimated Due Date
    planned_birth_setting: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    client_id: str
    provider_id: str  # doula or midwife user_id
    provider_type: str  # DOULA or MIDWIFE
    status: str
    linked_mom_id: Optional[str] = None  # If mom is also a user
    risk_flags: List[str] = []  # For midwife
    internal_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Contract Models ---
class ContractSectionUpdate(BaseModel):
    id: str
    custom_content: Optional[str] = None

class ContractCreate(BaseModel):
    client_id: str
    # Client & Payment Details
    client_names: str  # Full name(s) of client(s)
    estimated_due_date: str  # YYYY-MM-DD
    total_payment_amount: float
    retainer_fee: float
    remaining_payment_amount: Optional[float] = None  # Auto-calculated if not provided
    final_payment_due_date: str = "Day after birth"
    # Optional section customizations
    section_customizations: Optional[List[ContractSectionUpdate]] = None
    additional_terms: Optional[str] = None

class ContractSignature(BaseModel):
    signer_type: str  # "client" or "doula"
    signer_name: str
    signature_data: str  # Base64 encoded signature image or typed name
    signed_at: datetime

class Contract(BaseModel):
    contract_id: str
    doula_id: str
    doula_name: str
    client_id: str
    client_name: str
    # Client & Payment Details
    client_names: str
    estimated_due_date: str
    total_payment_amount: float
    retainer_fee: float
    remaining_payment_amount: float
    final_payment_due_date: str
    agreement_date: str
    # Template sections (with any customizations)
    sections: List[dict]
    additional_terms: Optional[str] = None
    # Status and signatures
    status: str = "Draft"  # Draft, Sent, Pending Signature, Signed
    client_signature: Optional[dict] = None
    doula_signature: Optional[dict] = None
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# Legacy contract model for backward compatibility
class LegacyContractCreate(BaseModel):
    client_id: str
    contract_title: str
    services_description: Optional[str] = None
    total_fee: Optional[float] = None
    payment_schedule_description: Optional[str] = None
    cancellation_policy: Optional[str] = None
    scope_of_practice: Optional[str] = None

# --- Midwife Contract Models ---
class MidwifeContractCreate(BaseModel):
    client_id: str
    # Client & Care Details
    client_name: str
    partner_name: Optional[str] = None
    estimated_due_date: str  # YYYY-MM-DD
    planned_birth_place: str  # e.g., "Home Birth", "Birth Center", "Hospital"
    # On-call period
    on_call_start_week: str = "37"
    on_call_end_week: str = "42"
    # Payment Details
    total_fee: float
    deposit: float
    remaining_balance: Optional[float] = None  # Auto-calculated if not provided
    balance_due_week: str = "36"  # Week by which balance is due
    # Practice Info
    practice_name: Optional[str] = None
    # Optional section customizations
    section_customizations: Optional[List[ContractSectionUpdate]] = None
    additional_terms: Optional[str] = None

class MidwifeContract(BaseModel):
    contract_id: str
    midwife_id: str
    midwife_name: str
    client_id: str
    client_name: str
    partner_name: Optional[str] = None
    # Care Details
    estimated_due_date: str
    planned_birth_place: str
    on_call_start_week: str
    on_call_end_week: str
    # Payment Details
    total_fee: float
    deposit: float
    remaining_balance: float
    balance_due_week: str
    # Practice Info
    practice_name: Optional[str] = None
    agreement_date: str
    # Template sections (with any customizations)
    sections: List[dict]
    additional_terms: Optional[str] = None
    # Status and signatures
    status: str = "Draft"  # Draft, Sent, Signed
    client_signature: Optional[dict] = None
    midwife_signature: Optional[dict] = None
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Invoice Models ---
class InvoiceCreate(BaseModel):
    client_id: str
    invoice_title: str
    amount: float
    due_date: str
    notes: Optional[str] = None

class Invoice(BaseModel):
    invoice_id: str
    doula_id: str
    client_id: str
    client_name: str
    invoice_title: str
    amount: float
    due_date: str
    notes: Optional[str] = None
    status: str = "Draft"
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Note Models ---
class NoteCreate(BaseModel):
    client_id: str
    note_type: str  # Prenatal, Birth, Postpartum
    content: str
    date: Optional[str] = None

class Note(BaseModel):
    note_id: str
    provider_id: str
    client_id: str
    note_type: str
    content: str
    date: str
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Midwife Models ---
class MidwifeProfile(BaseModel):
    user_id: str
    practice_name: Optional[str] = None
    credentials: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    years_in_practice: Optional[int] = None
    birth_settings_served: List[str] = []
    accepting_new_clients: bool = True
    bio: Optional[str] = None
    in_marketplace: bool = False

class MidwifeProfileUpdate(BaseModel):
    practice_name: Optional[str] = None
    credentials: Optional[str] = None
    zip_code: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    years_in_practice: Optional[int] = None
    birth_settings_served: Optional[List[str]] = None
    accepting_new_clients: Optional[bool] = None
    bio: Optional[str] = None

# --- Visit Models (Midwife) ---
class VisitCreate(BaseModel):
    client_id: str
    visit_date: str
    visit_type: str  # Prenatal, Postpartum
    gestational_age: Optional[str] = None
    blood_pressure: Optional[str] = None
    weight: Optional[str] = None
    fetal_heart_rate: Optional[str] = None
    summary_for_mom: Optional[str] = None  # Mom-friendly summary (visible to Mom)
    private_note: Optional[str] = None  # Detailed clinical note (midwife only)

class Visit(BaseModel):
    visit_id: str
    midwife_id: str
    client_id: str
    visit_date: str
    visit_type: str
    gestational_age: Optional[str] = None
    blood_pressure: Optional[str] = None  # Clinical - NOT visible to Mom
    weight: Optional[str] = None  # Clinical - NOT visible to Mom
    fetal_heart_rate: Optional[str] = None  # Clinical - NOT visible to Mom
    summary_for_mom: Optional[str] = None  # Mom-friendly summary (visible to Mom)
    private_note: Optional[str] = None  # Detailed clinical note (midwife only, NOT visible to Mom)
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Birth Summary Models (Midwife) ---
class BirthSummaryCreate(BaseModel):
    client_id: str
    birth_datetime: str
    birth_place: str  # Home, Birth Center, Transfer to Hospital
    mode_of_birth: str
    newborn_details: Optional[str] = None
    complications: Optional[str] = None
    summary_note: Optional[str] = None

class BirthSummary(BaseModel):
    summary_id: str
    midwife_id: str
    client_id: str
    birth_datetime: str
    birth_place: str
    mode_of_birth: str
    newborn_details: Optional[str] = None
    complications: Optional[str] = None
    summary_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Appointment Models ---
APPOINTMENT_STATUS = ["pending", "accepted", "declined", "cancelled"]
APPOINTMENT_TYPES = ["prenatal_visit", "birth_planning_session", "postpartum_visit", "consultation"]

class AppointmentCreate(BaseModel):
    mom_user_id: str
    appointment_date: str  # ISO date string
    appointment_time: str  # HH:MM format
    appointment_type: str  # prenatal_visit, birth_planning_session, postpartum_visit, consultation
    location: Optional[str] = None
    is_virtual: bool = False
    notes: Optional[str] = None  # Provider's private notes for the appointment

class Appointment(BaseModel):
    appointment_id: str
    provider_id: str
    provider_name: str
    provider_role: str  # DOULA or MIDWIFE
    mom_user_id: str
    mom_name: str
    appointment_date: str
    appointment_time: str
    appointment_type: str
    location: Optional[str] = None
    is_virtual: bool = False
    notes: Optional[str] = None  # Provider's private notes - NOT visible to Mom
    status: str = "pending"  # pending, accepted, declined, cancelled
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Admin Content Models ---
class AdminContent(BaseModel):
    content_id: str
    section_id: str
    explanatory_text: Optional[str] = None
    video_url: Optional[str] = None
    updated_by: str
    updated_at: datetime

# --- Birth Plan Share Models ---
SHARE_REQUEST_STATUS = ["pending", "accepted", "rejected"]
CONNECTION_STATUS = ["pending", "active", "ended"]

class ShareRequestCreate(BaseModel):
    provider_id: str  # The doula or midwife user_id

class ShareRequest(BaseModel):
    request_id: str
    mom_user_id: str
    mom_name: str
    provider_id: str
    provider_name: str
    provider_role: str  # DOULA or MIDWIFE
    status: str = "pending"  # pending, accepted, rejected
    connection_status: str = "pending"  # pending, active, ended
    can_view_birth_plan: bool = True  # Default true for active connections
    can_message: bool = True  # Default true for active connections
    created_at: datetime
    responded_at: Optional[datetime] = None

class ProviderNoteCreate(BaseModel):
    section_id: str
    note_content: str

class ProviderNote(BaseModel):
    note_id: str
    birth_plan_id: str
    section_id: str
    provider_id: str
    provider_name: str
    provider_role: str
    note_content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Notification Models ---
NOTIFICATION_TYPES = [
    "share_request",      # Mom shared birth plan with provider
    "share_accepted",     # Provider accepted share request
    "share_rejected",     # Provider rejected share request
    "provider_note",      # Provider added note to birth plan
    "wellness_reminder",  # Daily wellness check-in reminder
    "timeline_milestone", # New timeline milestone
    "new_message",        # New message received
    "contract_signed",    # Contract was signed
    "birth_plan_complete", # Mom completed her birth plan
    "birth_plan_updated",  # Mom updated her birth plan (optional)
    "appointment_invite",  # Provider invited Mom to appointment
    "appointment_response", # Mom responded to appointment
]

# Birth plan status values
BIRTH_PLAN_STATUS = ["not_started", "in_progress", "complete"]

class Notification(BaseModel):
    notification_id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    read: bool = False
    created_at: datetime

# --- Timeline Models ---
PREGNANCY_MILESTONES = [
    {"week": 4, "title": "Positive Test!", "description": "Your pregnancy test is positive. Baby is the size of a poppy seed."},
    {"week": 6, "title": "Heartbeat Begins", "description": "Baby's heart starts beating. Size: lentil."},
    {"week": 8, "title": "First Prenatal Visit", "description": "Schedule your first prenatal appointment. Baby is the size of a raspberry."},
    {"week": 10, "title": "Fingers & Toes Form", "description": "Baby's fingers and toes are forming. Size: strawberry."},
    {"week": 12, "title": "End of First Trimester", "description": "Risk of miscarriage drops significantly. Baby is the size of a lime."},
    {"week": 16, "title": "Gender Can Be Determined", "description": "Baby's gender may be visible on ultrasound. Size: avocado."},
    {"week": 20, "title": "Anatomy Scan", "description": "Detailed ultrasound to check baby's development. Baby is the size of a banana."},
    {"week": 24, "title": "Viability Milestone", "description": "Baby has a chance of survival if born now. Size: ear of corn."},
    {"week": 28, "title": "Third Trimester Begins", "description": "Final stretch! Baby is the size of an eggplant."},
    {"week": 32, "title": "Baby Practices Breathing", "description": "Lungs are developing. Baby is the size of a squash."},
    {"week": 36, "title": "Full Term Soon", "description": "Baby is considered early term at 37 weeks. Size: honeydew melon."},
    {"week": 37, "title": "Full Term", "description": "Baby is now considered full term!"},
    {"week": 40, "title": "Due Date", "description": "Your estimated due date has arrived!"},
]

class TimelineEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    event_type: str = "custom"  # "milestone" or "custom" or "appointment"

class TimelineEvent(BaseModel):
    event_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    event_date: str
    event_type: str
    week_number: Optional[int] = None
    created_at: datetime

# --- Wellness Journal Models ---
class WellnessEntryCreate(BaseModel):
    mood: int  # 1-5 scale
    energy_level: Optional[int] = None  # 1-5 scale
    sleep_quality: Optional[int] = None  # 1-5 scale
    symptoms: Optional[List[str]] = None
    journal_notes: Optional[str] = None

class WellnessEntry(BaseModel):
    entry_id: str
    user_id: str
    mood: int
    energy_level: Optional[int] = None
    sleep_quality: Optional[int] = None
    symptoms: Optional[List[str]] = None
    journal_notes: Optional[str] = None
    created_at: datetime

# --- Postpartum Plan Models ---
class PostpartumPlanCreate(BaseModel):
    support_people: Optional[List[str]] = None
    meal_prep_plans: Optional[str] = None
    recovery_goals: Optional[str] = None
    mental_health_resources: Optional[str] = None
    baby_feeding_plan: Optional[str] = None
    visitor_policy: Optional[str] = None
    self_care_activities: Optional[List[str]] = None
    warning_signs_to_watch: Optional[List[str]] = None
    emergency_contacts: Optional[List[Dict[str, str]]] = None
    notes: Optional[str] = None

# --- Message Models ---
class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class Message(BaseModel):
    message_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    receiver_id: str
    receiver_name: str
    receiver_role: str
    content: str
    read: bool = False
    created_at: datetime

# --- Contract Signature Models ---
class ContractSignRequest(BaseModel):
    signer_name: str
    signer_email: Optional[str] = None

# ============== EMAIL HELPER ==============

async def send_notification_email(to_email: str, subject: str, html_content: str):
    """Send email notification using Resend"""
    if not resend.api_key:
        logging.warning("RESEND_API_KEY not configured, skipping email")
        return None
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Email sent to {to_email}: {result.get('id')}")
        return result
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        return None

def get_share_request_email_html(mom_name: str, provider_name: str):
    """Generate HTML for share request notification email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #9d7a9d, #c9a8c9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 24px; }}
            .content {{ background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }}
            .highlight {{ background: #f9f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .button {{ display: inline-block; background: #9d7a9d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #888; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>True Joy Birthing</h1>
            </div>
            <div class="content">
                <h2>New Birth Plan Share Request</h2>
                <p>Hi {provider_name},</p>
                <div class="highlight">
                    <p><strong>{mom_name}</strong> has shared their birth plan with you!</p>
                </div>
                <p>They've chosen you to be part of their birth support team and would like you to review their birth preferences.</p>
                <p>Log in to your True Joy Birthing account to:</p>
                <ul>
                    <li>Accept or decline the share request</li>
                    <li>Review their complete birth plan</li>
                    <li>Add your professional notes and recommendations</li>
                </ul>
                <p style="text-align: center;">
                    <a href="#" class="button">View Share Request</a>
                </p>
            </div>
            <div class="footer">
                <p>True Joy Birthing - Your birth plan, your team, your support.</p>
            </div>
        </div>
    </body>
    </html>
    """

async def create_notification(user_id: str, notif_type: str, title: str, message: str, data: dict = None):
    """Create an in-app notification"""
    now = datetime.now(timezone.utc)
    notif_doc = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notif_doc)
    return notif_doc

# ============== AUTH HELPERS ==============

def generate_user_id():
    return f"user_{uuid.uuid4().hex[:12]}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request) -> User:
    """Get current user from session token (cookie or header)"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

def check_role(required_roles: List[str]):
    """Dependency to check user role"""
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in required_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    """Register with email/password"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not user_data.password:
        raise HTTPException(status_code=400, detail="Password required for registration")
    
    user_id = generate_user_id()
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "password_hash": get_password_hash(user_data.password),
        "picture": None,
        "onboarding_completed": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "created_at": now
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "onboarding_completed": False,
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin, response: Response):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    if not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    now = datetime.now(timezone.utc)
    
    # Create new session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "created_at": now
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "full_name": user_doc["full_name"],
        "role": user_doc["role"],
        "picture": user_doc.get("picture"),
        "onboarding_completed": user_doc.get("onboarding_completed", False),
        "session_token": session_token
    }

@api_router.post("/auth/google-session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session_id and create user session"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get user data
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as client_http:
        try:
            auth_response = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            auth_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Auth error: {str(e)}")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    
    now = datetime.now(timezone.utc)
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "full_name": name or existing_user.get("full_name"),
                "picture": picture,
                "updated_at": now
            }}
        )
        role = existing_user["role"]
        onboarding_completed = existing_user.get("onboarding_completed", False)
    else:
        # Create new user (default role is MOM, will be set during onboarding)
        user_id = generate_user_id()
        user_doc = {
            "user_id": user_id,
            "email": email,
            "full_name": name or "User",
            "role": "MOM",  # Default, can be changed during onboarding
            "picture": picture,
            "onboarding_completed": False,
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(user_doc)
        role = "MOM"
        onboarding_completed = False
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "created_at": now
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "full_name": name,
        "role": role,
        "picture": picture,
        "onboarding_completed": onboarding_completed,
        "session_token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    # Get additional profile data based on role
    profile_data = {}
    
    if user.role == "MOM":
        mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
        if mom_profile:
            profile_data = mom_profile
    elif user.role == "DOULA":
        doula_profile = await db.doula_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
        if doula_profile:
            profile_data = doula_profile
    elif user.role == "MIDWIFE":
        midwife_profile = await db.midwife_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
        if midwife_profile:
            profile_data = midwife_profile
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "picture": user.picture,
        "onboarding_completed": user.onboarding_completed,
        "profile": profile_data
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.put("/auth/set-role")
async def set_role(request: Request, user: User = Depends(get_current_user)):
    """Set user role during onboarding"""
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ROLES}")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": new_role, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Role updated", "role": new_role}

# ============== ZIP CODE LOOKUP ==============

@api_router.get("/lookup/zipcode/{zipcode}")
async def lookup_zipcode(zipcode: str):
    """Look up city and state from zip code using Zippopotam.us API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.zippopotam.us/us/{zipcode}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Invalid zip code")
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Zip code lookup failed")
            
            data = response.json()
            places = data.get("places", [])
            if not places:
                raise HTTPException(status_code=404, detail="No location found for zip code")
            
            place = places[0]
            return {
                "zip_code": zipcode,
                "city": place.get("place name", ""),
                "state": place.get("state", ""),
                "state_abbreviation": place.get("state abbreviation", ""),
                "country": data.get("country", "United States")
            }
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Unable to reach zip code service")

# ============== MOM ROUTES ==============

@api_router.post("/mom/onboarding")
async def mom_onboarding(profile_data: MomProfileUpdate, user: User = Depends(check_role(["MOM"]))):
    """Complete mom onboarding"""
    now = datetime.now(timezone.utc)
    
    # Create or update mom profile
    mom_profile = {
        "user_id": user.user_id,
        "due_date": profile_data.due_date,
        "planned_birth_setting": profile_data.planned_birth_setting,
        "zip_code": profile_data.zip_code,
        "location_city": profile_data.location_city,
        "location_state": profile_data.location_state,
        "connected_doula_id": None,
        "connected_midwife_id": None,
        "updated_at": now
    }
    
    await db.mom_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": mom_profile},
        upsert=True
    )
    
    # Initialize birth plan
    birth_plan_exists = await db.birth_plans.find_one({"user_id": user.user_id})
    if not birth_plan_exists:
        birth_plan = {
            "plan_id": f"plan_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "sections": [
                {"section_id": s["section_id"], "title": s["title"], "status": "Not started", "data": {}, "discussion_notes": []}
                for s in BIRTH_PLAN_SECTIONS
            ],
            "completion_percentage": 0.0,
            "created_at": now,
            "updated_at": now
        }
        await db.birth_plans.insert_one(birth_plan)
    
    # Mark onboarding complete
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    
    return {"message": "Onboarding completed", "profile": mom_profile}

@api_router.get("/mom/profile")
async def get_mom_profile(user: User = Depends(check_role(["MOM"]))):
    """Get mom profile"""
    profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile

@api_router.put("/mom/profile")
async def update_mom_profile(profile_data: MomProfileUpdate, user: User = Depends(check_role(["MOM"]))):
    """Update mom profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.mom_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated"}

# ============== BIRTH PLAN ROUTES ==============

@api_router.get("/birth-plan")
async def get_birth_plan(user: User = Depends(check_role(["MOM"]))):
    """Get user's birth plan"""
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    if not plan:
        # Create default plan
        now = datetime.now(timezone.utc)
        plan = {
            "plan_id": f"plan_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "sections": [
                {"section_id": s["section_id"], "title": s["title"], "status": "Not started", "data": {}, "discussion_notes": []}
                for s in BIRTH_PLAN_SECTIONS
            ],
            "completion_percentage": 0.0,
            "birth_plan_status": "not_started",
            "created_at": now,
            "updated_at": now
        }
        await db.birth_plans.insert_one(plan)
        # Remove _id that MongoDB adds after insertion
        plan.pop("_id", None)
    return plan

@api_router.get("/mom/midwife-visits")
async def get_mom_midwife_visits(user: User = Depends(check_role(["MOM"]))):
    """Get Mom's visits from connected midwife (only mom-friendly summary, no clinical data)"""
    # Get connected midwife from mom's profile
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id})
    if not mom_profile or not mom_profile.get("connected_midwife_id"):
        return {"visits": [], "message": "No connected midwife"}
    
    midwife_id = mom_profile["connected_midwife_id"]
    
    # Get Mom's client record with this midwife
    client = await db.clients.find_one({
        "linked_mom_id": user.user_id,
        "provider_id": midwife_id,
        "provider_type": "MIDWIFE"
    })
    
    if not client:
        return {"visits": [], "message": "No client record found"}
    
    # Get visits - only return mom-visible fields
    visits = await db.visits.find(
        {"midwife_id": midwife_id, "client_id": client["client_id"]},
        {
            "_id": 0,
            "visit_id": 1,
            "visit_date": 1,
            "visit_type": 1,
            "gestational_age": 1,
            "summary_for_mom": 1,  # Only the mom-friendly summary
            "created_at": 1
            # Exclude: blood_pressure, weight, fetal_heart_rate, private_note
        }
    ).sort("visit_date", -1).to_list(100)
    
    return {"visits": visits}

@api_router.put("/birth-plan/section/{section_id}")
async def update_birth_plan_section(section_id: str, request: Request, user: User = Depends(check_role(["MOM"]))):
    """Update a section of the birth plan"""
    body = await request.json()
    data = body.get("data", {})
    notes_to_provider = body.get("notes_to_provider")
    
    now = datetime.now(timezone.utc)
    
    # Update the specific section
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    sections = plan.get("sections", [])
    section_found = False
    completed_count = 0
    previous_status = plan.get("birth_plan_status", "not_started")
    
    for section in sections:
        if section["section_id"] == section_id:
            section["data"] = data
            section["notes_to_provider"] = notes_to_provider
            section["status"] = "Complete" if data else "In progress"
            section_found = True
        if section.get("status") == "Complete":
            completed_count += 1
    
    if not section_found:
        raise HTTPException(status_code=404, detail="Section not found")
    
    completion_percentage = (completed_count / len(sections)) * 100 if sections else 0
    
    # Determine birth plan status
    if completion_percentage == 100:
        new_status = "complete"
    elif completion_percentage > 0:
        new_status = "in_progress"
    else:
        new_status = "not_started"
    
    await db.birth_plans.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "sections": sections,
            "completion_percentage": completion_percentage,
            "birth_plan_status": new_status,
            "updated_at": now
        }}
    )
    
    # Notify providers when birth plan is marked complete for the first time
    if new_status == "complete" and previous_status != "complete":
        await notify_providers_birth_plan_complete(user.user_id, user.full_name)
    
    return {"message": "Section updated", "completion_percentage": completion_percentage, "birth_plan_status": new_status}

@api_router.get("/birth-plan/export")
async def export_birth_plan(user: User = Depends(check_role(["MOM"]))):
    """Get birth plan for export (mock PDF generation)"""
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {
        "plan": plan,
        "user_name": user_doc.get("full_name") if user_doc else None,
        "due_date": mom_profile.get("due_date") if mom_profile else None,
        "birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
        "export_note": "PDF generation is mocked. In production, this would generate a downloadable PDF."
    }

@api_router.get("/birth-plan/export/pdf")
async def export_birth_plan_pdf(user: User = Depends(check_role(["MOM"]))):
    """Generate and download PDF version of birth plan"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#9F83B6'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#9F83B6'), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6)
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=10, fontName='Helvetica-Bold', spaceAfter=2)
    
    elements = []
    
    # Title
    user_name = user_doc.get("full_name", "Mom") if user_doc else "Mom"
    elements.append(Paragraph(f"{user_name}'s Birth Plan", title_style))
    elements.append(Spacer(1, 10))
    
    # Basic info
    if mom_profile:
        info_data = []
        if mom_profile.get("due_date"):
            info_data.append(["Expected Due Date:", mom_profile["due_date"]])
        if mom_profile.get("planned_birth_setting"):
            info_data.append(["Planned Birth Setting:", mom_profile["planned_birth_setting"]])
        if mom_profile.get("provider_name"):
            info_data.append(["Provider:", mom_profile["provider_name"]])
        
        if info_data:
            info_table = Table(info_data, colWidths=[2*inch, 4*inch])
            info_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(info_table)
            elements.append(Spacer(1, 15))
    
    # Sections
    sections = plan.get("sections", [])
    section_names = {
        "getting_started": "Getting Started",
        "support_preferences": "Support & Atmosphere",
        "pain_management": "Pain Management",
        "monitoring_iv": "Labor Environment & Comfort",
        "interventions": "Interventions & C-Section",
        "pushing_safe_word": "Pushing, Delivery & Safe Word",
        "baby_care": "Baby Care After Birth",
        "feeding": "Feeding Preferences",
        "postpartum": "Postpartum Care",
        "additional_info": "Additional Information"
    }
    
    for section in sections:
        section_id = section.get("section_id", "")
        section_name = section_names.get(section_id, section_id.replace("_", " ").title())
        data = section.get("data", {})
        
        if not data:
            continue
        
        elements.append(Paragraph(section_name, heading_style))
        
        # Format the data nicely
        for key, value in data.items():
            if value:
                # Convert key to readable label
                label = key.replace("_", " ").replace("Preference", "").title()
                
                if isinstance(value, list):
                    value_str = ", ".join(str(v) for v in value)
                else:
                    value_str = str(value)
                
                elements.append(Paragraph(f"<b>{label}:</b> {value_str}", body_style))
        
        elements.append(Spacer(1, 10))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Birth_Plan_{user_name.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============== BIRTH PLAN SHARING ROUTES ==============

@api_router.get("/providers/search")
async def search_providers(
    query: str,
    user: User = Depends(check_role(["MOM"]))
):
    """Search for doulas and midwives by name, email, city, or state"""
    if len(query) < 2:
        return {"providers": []}
    
    # Search in users collection for DOULA and MIDWIFE roles
    search_regex = {"$regex": query, "$options": "i"}
    
    # First search users by name/email
    providers = await db.users.find(
        {
            "role": {"$in": ["DOULA", "MIDWIFE"]},
            "$or": [
                {"full_name": search_regex},
                {"email": search_regex}
            ]
        },
        {"_id": 0, "password_hash": 0}
    ).limit(20).to_list(20)
    
    provider_ids = {p["user_id"] for p in providers}
    
    # Also search profiles by location (city/state)
    doula_location_matches = await db.doula_profiles.find(
        {"$or": [
            {"location_city": search_regex},
            {"location_state": search_regex}
        ]},
        {"_id": 0}
    ).to_list(20)
    
    midwife_location_matches = await db.midwife_profiles.find(
        {"$or": [
            {"location_city": search_regex},
            {"location_state": search_regex}
        ]},
        {"_id": 0}
    ).to_list(20)
    
    # Add location-matched providers
    for profile in doula_location_matches + midwife_location_matches:
        if profile.get("user_id") and profile["user_id"] not in provider_ids:
            user_data = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "password_hash": 0}
            )
            if user_data:
                providers.append(user_data)
                provider_ids.add(profile["user_id"])
    
    # Enhance with profile data
    result = []
    for provider in providers:
        profile = None
        if provider["role"] == "DOULA":
            profile = await db.doula_profiles.find_one({"user_id": provider["user_id"]}, {"_id": 0})
        elif provider["role"] == "MIDWIFE":
            profile = await db.midwife_profiles.find_one({"user_id": provider["user_id"]}, {"_id": 0})
        
        # Check if already shared with this provider
        existing_share = await db.share_requests.find_one({
            "mom_user_id": user.user_id,
            "provider_id": provider["user_id"],
            "status": {"$in": ["pending", "accepted"]}
        })
        
        result.append({
            "user_id": provider["user_id"],
            "full_name": provider["full_name"],
            "email": provider["email"],
            "role": provider["role"],
            "picture": provider.get("picture"),
            "profile": profile,
            "already_shared": existing_share is not None,
            "share_status": existing_share["status"] if existing_share else None
        })
    
    return {"providers": result}

@api_router.post("/birth-plan/share")
async def share_birth_plan(
    share_data: ShareRequestCreate,
    user: User = Depends(check_role(["MOM"]))
):
    """Send a share request to a provider"""
    # Verify provider exists and is a doula or midwife
    provider = await db.users.find_one(
        {"user_id": share_data.provider_id, "role": {"$in": ["DOULA", "MIDWIFE"]}},
        {"_id": 0}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Check if request already exists
    existing = await db.share_requests.find_one({
        "mom_user_id": user.user_id,
        "provider_id": share_data.provider_id,
        "status": {"$in": ["pending", "accepted"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Share request already exists")
    
    now = datetime.now(timezone.utc)
    
    request_doc = {
        "request_id": f"share_{uuid.uuid4().hex[:12]}",
        "mom_user_id": user.user_id,
        "mom_name": user.full_name,
        "provider_id": share_data.provider_id,
        "provider_name": provider["full_name"],
        "provider_role": provider["role"],
        "status": "pending",
        "created_at": now,
        "responded_at": None
    }
    
    await db.share_requests.insert_one(request_doc)
    request_doc.pop('_id', None)
    
    # Send email notification to provider
    email_html = get_share_request_email_html(user.full_name, provider["full_name"])
    await send_notification_email(
        to_email=provider["email"],
        subject=f"New Birth Plan Share Request from {user.full_name}",
        html_content=email_html
    )
    
    # Create in-app notification for provider
    await create_notification(
        user_id=provider["user_id"],
        notif_type="share_request",
        title="New Birth Plan Share Request",
        message=f"{user.full_name} has shared their birth plan with you.",
        data={"request_id": request_doc["request_id"], "mom_name": user.full_name}
    )
    
    return {"message": "Share request sent", "request": request_doc}

@api_router.get("/birth-plan/share-requests")
async def get_my_share_requests(user: User = Depends(check_role(["MOM"]))):
    """Get all share requests sent by the mom"""
    requests = await db.share_requests.find(
        {"mom_user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"requests": requests}

@api_router.delete("/birth-plan/share/{request_id}")
async def revoke_share(request_id: str, user: User = Depends(check_role(["MOM"]))):
    """Revoke a share request"""
    result = await db.share_requests.delete_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Share request not found")
    
    # Also delete any provider notes for this birth plan from this provider
    request = await db.share_requests.find_one({"request_id": request_id})
    if request:
        await db.provider_notes.delete_many({
            "birth_plan_id": user.user_id,  # Using mom's user_id as birth plan identifier
            "provider_id": request["provider_id"]
        })
    
    return {"message": "Share access revoked"}

# --- Provider-side share endpoints ---

@api_router.get("/provider/share-requests")
async def get_provider_share_requests(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all share requests received by the provider"""
    requests = await db.share_requests.find(
        {"provider_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"requests": requests}

@api_router.put("/provider/share-requests/{request_id}/respond")
async def respond_to_share_request(
    request_id: str,
    request: Request,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Accept or reject a share request"""
    body = await request.json()
    action = body.get("action")  # "accept" or "reject"
    
    if action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")
    
    now = datetime.now(timezone.utc)
    new_status = "accepted" if action == "accept" else "rejected"
    
    result = await db.share_requests.update_one(
        {"request_id": request_id, "provider_id": user.user_id, "status": "pending"},
        {"$set": {"status": new_status, "responded_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Share request not found or already responded")
    
    # If accepted, link the mom to the provider's client list (optional enhancement)
    if action == "accept":
        share_request = await db.share_requests.find_one({"request_id": request_id}, {"_id": 0})
        if share_request:
            # Update mom's profile to show connected provider
            if user.role == "DOULA":
                await db.mom_profiles.update_one(
                    {"user_id": share_request["mom_user_id"]},
                    {"$set": {"connected_doula_id": user.user_id}}
                )
            elif user.role == "MIDWIFE":
                await db.mom_profiles.update_one(
                    {"user_id": share_request["mom_user_id"]},
                    {"$set": {"connected_midwife_id": user.user_id}}
                )
    
    return {"message": f"Share request {new_status}"}

@api_router.get("/provider/shared-birth-plans")
async def get_shared_birth_plans(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all birth plans shared with this provider (read-only)"""
    # Get accepted share requests where provider has view permission
    accepted_requests = await db.share_requests.find(
        {"provider_id": user.user_id, "status": "accepted"},
        {"_id": 0}
    ).to_list(100)
    
    birth_plans = []
    for req in accepted_requests:
        # Check if provider has permission to view birth plan
        if not req.get("can_view_birth_plan", True):
            continue
            
        # Get the mom's birth plan
        plan = await db.birth_plans.find_one({"user_id": req["mom_user_id"]}, {"_id": 0})
        mom_profile = await db.mom_profiles.find_one({"user_id": req["mom_user_id"]}, {"_id": 0})
        
        # Get provider notes for this plan
        notes = await db.provider_notes.find(
            {"birth_plan_id": req["mom_user_id"], "provider_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        if plan:
            birth_plans.append({
                "mom_user_id": req["mom_user_id"],
                "mom_name": req["mom_name"],
                "due_date": mom_profile.get("due_date") if mom_profile else None,
                "birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                "plan": plan,
                "birth_plan_status": plan.get("birth_plan_status", "not_started"),
                "provider_notes": notes,
                "shared_at": req["responded_at"],
                "read_only": True  # Provider can only VIEW, not edit
            })
    
    return {"birth_plans": birth_plans}

@api_router.get("/provider/shared-birth-plan/{mom_user_id}")
async def get_shared_birth_plan_detail(
    mom_user_id: str,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Get a specific shared birth plan with provider notes (read-only view)"""
    # Verify access and permissions
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    # Check if provider has permission to view birth plan
    if not share_request.get("can_view_birth_plan", True):
        raise HTTPException(status_code=403, detail="You do not have permission to view this birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_user_id}, {"_id": 0})
    mom = await db.users.find_one({"user_id": mom_user_id}, {"_id": 0, "password_hash": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": mom_user_id}, {"_id": 0})
    
    # Get all provider notes for this plan (from all providers)
    all_notes = await db.provider_notes.find(
        {"birth_plan_id": mom_user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "mom": mom,
        "mom_profile": mom_profile,
        "plan": plan,
        "birth_plan_status": plan.get("birth_plan_status", "not_started") if plan else "not_started",
        "provider_notes": all_notes,
        "read_only": True,  # Indicates this is a read-only view - provider cannot edit Mom's answers
        "can_add_notes": True  # Provider can add their own discussion notes
    }

@api_router.post("/provider/birth-plan/{mom_user_id}/notes")
async def add_provider_note(
    mom_user_id: str,
    note_data: ProviderNoteCreate,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Add a note to a section of a shared birth plan"""
    # Verify access
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    now = datetime.now(timezone.utc)
    
    note_doc = {
        "note_id": f"pnote_{uuid.uuid4().hex[:12]}",
        "birth_plan_id": mom_user_id,
        "section_id": note_data.section_id,
        "provider_id": user.user_id,
        "provider_name": user.full_name,
        "provider_role": user.role,
        "note_content": note_data.note_content,
        "created_at": now,
        "updated_at": now
    }
    
    await db.provider_notes.insert_one(note_doc)
    note_doc.pop('_id', None)
    
    return {"message": "Note added", "note": note_doc}

@api_router.put("/provider/notes/{note_id}")
async def update_provider_note(
    note_id: str,
    request: Request,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Update a provider note"""
    body = await request.json()
    note_content = body.get("note_content")
    
    if not note_content:
        raise HTTPException(status_code=400, detail="Note content required")
    
    result = await db.provider_notes.update_one(
        {"note_id": note_id, "provider_id": user.user_id},
        {"$set": {"note_content": note_content, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note updated"}

@api_router.delete("/provider/notes/{note_id}")
async def delete_provider_note(
    note_id: str,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Delete a provider note"""
    result = await db.provider_notes.delete_one({
        "note_id": note_id,
        "provider_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}

# ============== NOTIFICATION ROUTES ==============

@api_router.get("/notifications")
async def get_notifications(user: User = Depends(get_current_user), unread_only: bool = False):
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

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark a notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: User = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ============== WELLNESS ROUTES (Enhanced) ==============

@api_router.post("/wellness/checkin")
async def create_wellness_checkin(checkin_data: WellnessCheckInCreate, user: User = Depends(check_role(["MOM"]))):
    """Create a wellness check-in"""
    now = datetime.now(timezone.utc)
    
    checkin = {
        "checkin_id": f"checkin_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "mood": checkin_data.mood,
        "mood_note": checkin_data.mood_note,
        "created_at": now
    }
    
    await db.wellness_checkins.insert_one(checkin)
    checkin.pop('_id', None)  # Remove ObjectId added by insert_one
    return checkin

@api_router.get("/wellness/checkins")
async def get_wellness_checkins(user: User = Depends(check_role(["MOM"])), limit: int = 30):
    """Get wellness check-in history"""
    checkins = await db.wellness_checkins.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return checkins

@api_router.post("/wellness/entry")
async def create_wellness_entry(entry_data: WellnessEntryCreate, user: User = Depends(check_role(["MOM"]))):
    """Create a detailed wellness entry with mood, energy, sleep, symptoms, and journal"""
    now = datetime.now(timezone.utc)
    
    entry = {
        "entry_id": f"wellness_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "mood": entry_data.mood,
        "energy_level": entry_data.energy_level,
        "sleep_quality": entry_data.sleep_quality,
        "symptoms": entry_data.symptoms or [],
        "journal_notes": entry_data.journal_notes,
        "created_at": now
    }
    
    await db.wellness_entries.insert_one(entry)
    entry.pop('_id', None)
    return entry

@api_router.get("/wellness/entries")
async def get_wellness_entries(user: User = Depends(check_role(["MOM"])), limit: int = 30):
    """Get wellness entry history"""
    entries = await db.wellness_entries.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"entries": entries}

@api_router.get("/wellness/stats")
async def get_wellness_stats(user: User = Depends(check_role(["MOM"])), days: int = 7):
    """Get wellness statistics for the past N days"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    entries = await db.wellness_entries.find(
        {"user_id": user.user_id, "created_at": {"$gte": cutoff}},
        {"_id": 0}
    ).to_list(100)
    
    if not entries:
        return {"entries_count": 0, "avg_mood": None, "avg_energy": None, "avg_sleep": None}
    
    moods = [e["mood"] for e in entries if e.get("mood")]
    energies = [e["energy_level"] for e in entries if e.get("energy_level")]
    sleeps = [e["sleep_quality"] for e in entries if e.get("sleep_quality")]
    
    return {
        "entries_count": len(entries),
        "avg_mood": sum(moods) / len(moods) if moods else None,
        "avg_energy": sum(energies) / len(energies) if energies else None,
        "avg_sleep": sum(sleeps) / len(sleeps) if sleeps else None,
        "entries": entries
    }

# ============== POSTPARTUM ROUTES ==============

@api_router.get("/postpartum/plan")
async def get_postpartum_plan(user: User = Depends(check_role(["MOM"]))):
    """Get postpartum plan"""
    plan = await db.postpartum_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    if not plan:
        return {"user_id": user.user_id}
    return plan

@api_router.put("/postpartum/plan")
async def update_postpartum_plan(request: Request, user: User = Depends(check_role(["MOM"]))):
    """Update postpartum plan"""
    body = await request.json()
    now = datetime.now(timezone.utc)
    
    # Get existing plan to preserve plan_id
    existing = await db.postpartum_plans.find_one({"user_id": user.user_id})
    plan_id = existing.get("plan_id") if existing else f"postpartum_{uuid.uuid4().hex[:12]}"
    
    plan_data = {
        "plan_id": plan_id,
        "user_id": user.user_id,
        "support_people": body.get("support_people"),
        "meal_prep_plans": body.get("meal_prep_plans"),
        "recovery_goals": body.get("recovery_goals"),
        "mental_health_resources": body.get("mental_health_resources"),
        "baby_feeding_plan": body.get("baby_feeding_plan"),
        "visitor_policy": body.get("visitor_policy"),
        "self_care_activities": body.get("self_care_activities"),
        "warning_signs_to_watch": body.get("warning_signs_to_watch"),
        "emergency_contacts": body.get("emergency_contacts"),
        "notes": body.get("notes"),
        "updated_at": now
    }
    
    await db.postpartum_plans.update_one(
        {"user_id": user.user_id},
        {"$set": plan_data},
        upsert=True
    )
    
    return {"message": "Postpartum plan updated"}

# ============== MY TEAM ROUTES (MOM) ==============

@api_router.get("/mom/team")
async def get_mom_team(user: User = Depends(check_role(["MOM"]))):
    """Get mom's connected team (doula and midwife)"""
    profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    team = {"doula": None, "midwife": None}
    
    if profile:
        if profile.get("connected_doula_id"):
            doula_user = await db.users.find_one({"user_id": profile["connected_doula_id"]}, {"_id": 0})
            doula_profile = await db.doula_profiles.find_one({"user_id": profile["connected_doula_id"]}, {"_id": 0})
            if doula_user:
                team["doula"] = {
                    "user_id": doula_user["user_id"],
                    "name": doula_user["full_name"],
                    "picture": doula_user.get("picture"),
                    "profile": doula_profile
                }
        
        if profile.get("connected_midwife_id"):
            midwife_user = await db.users.find_one({"user_id": profile["connected_midwife_id"]}, {"_id": 0})
            midwife_profile = await db.midwife_profiles.find_one({"user_id": profile["connected_midwife_id"]}, {"_id": 0})
            if midwife_user:
                team["midwife"] = {
                    "user_id": midwife_user["user_id"],
                    "name": midwife_user["full_name"],
                    "picture": midwife_user.get("picture"),
                    "profile": midwife_profile
                }
    
    return team

# ============== TIMELINE ROUTES ==============

@api_router.get("/timeline")
async def get_timeline(user: User = Depends(check_role(["MOM"]))):
    """Get pregnancy timeline with milestones and custom events"""
    # Get mom profile for due date
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not mom_profile or not mom_profile.get("due_date"):
        return {"milestones": [], "custom_events": [], "message": "Please complete onboarding with your due date"}
    
    # Parse due date
    due_date_str = mom_profile["due_date"]
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
    except:
        return {"milestones": [], "custom_events": [], "message": "Invalid due date format"}
    
    # Calculate conception date (40 weeks before due date)
    conception_date = due_date - timedelta(weeks=40)
    today = datetime.now()
    
    # Calculate current week
    days_pregnant = (today - conception_date).days
    current_week = max(1, min(42, days_pregnant // 7))
    
    # Generate milestones with dates
    milestones = []
    for milestone in PREGNANCY_MILESTONES:
        milestone_date = conception_date + timedelta(weeks=milestone["week"])
        milestones.append({
            **milestone,
            "date": milestone_date.strftime("%Y-%m-%d"),
            "is_past": milestone["week"] < current_week,
            "is_current": milestone["week"] == current_week
        })
    
    # Get custom events
    custom_events = await db.timeline_events.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("event_date", 1).to_list(100)
    
    return {
        "current_week": current_week,
        "due_date": due_date_str,
        "milestones": milestones,
        "custom_events": custom_events
    }

@api_router.post("/timeline/events")
async def create_timeline_event(event_data: TimelineEventCreate, user: User = Depends(check_role(["MOM"]))):
    """Create a custom timeline event"""
    now = datetime.now(timezone.utc)
    
    event = {
        "event_id": f"event_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": event_data.title,
        "description": event_data.description,
        "event_date": event_data.event_date,
        "event_type": event_data.event_type,
        "created_at": now
    }
    
    await db.timeline_events.insert_one(event)
    event.pop('_id', None)
    return event

@api_router.delete("/timeline/events/{event_id}")
async def delete_timeline_event(event_id: str, user: User = Depends(check_role(["MOM"]))):
    """Delete a custom timeline event"""
    result = await db.timeline_events.delete_one({
        "event_id": event_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted"}

# ============== WEEKLY TIPS & AFFIRMATIONS ==============

@api_router.get("/weekly-content")
async def get_weekly_content(user: User = Depends(check_role(["MOM"]))):
    """Get weekly tip and affirmation based on pregnancy week or postpartum status"""
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not mom_profile or not mom_profile.get("due_date"):
        return {
            "week": None,
            "is_postpartum": False,
            "postpartum_week": None,
            "tip": "Complete your onboarding with your due date to receive personalized weekly tips.",
            "affirmation": "Every step you take toward preparing for your baby is a step in the right direction."
        }
    
    due_date_str = mom_profile.get("due_date")
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
    except:
        return {
            "week": None,
            "is_postpartum": False,
            "postpartum_week": None,
            "tip": "Please update your due date in your profile.",
            "affirmation": "You are capable and strong."
        }
    
    today = datetime.now()
    
    # Calculate conception date (roughly 40 weeks before due date)
    conception_date = due_date - timedelta(weeks=40)
    
    # Calculate current week
    days_pregnant = (today - conception_date).days
    current_week = days_pregnant // 7
    
    # Check if postpartum
    is_postpartum = today > due_date
    postpartum_week = None
    
    if is_postpartum:
        days_postpartum = (today - due_date).days
        postpartum_week = min((days_postpartum // 7) + 1, 6)  # Cap at 6 weeks
    
    # Get the appropriate content
    if is_postpartum:
        tip = get_weekly_tip(current_week, is_postpartum=True, postpartum_week=postpartum_week)
        affirmation = get_weekly_affirmation(current_week, is_postpartum=True, postpartum_week=postpartum_week)
        display_week = f"Postpartum Week {postpartum_week}"
    else:
        # Clamp to valid pregnancy weeks
        clamped_week = max(1, min(current_week, 42))
        tip = get_weekly_tip(clamped_week)
        affirmation = get_weekly_affirmation(clamped_week)
        display_week = f"Week {clamped_week}"
    
    return {
        "week": current_week,
        "display_week": display_week,
        "is_postpartum": is_postpartum,
        "postpartum_week": postpartum_week,
        "tip": tip,
        "affirmation": affirmation
    }

@api_router.get("/weekly-content/all")
async def get_all_weekly_content():
    """Get all weekly tips and affirmations (for browsing)"""
    pregnancy_content = []
    for week in range(1, 43):
        pregnancy_content.append({
            "week": week,
            "tip": WEEKLY_TIPS.get(week, ""),
            "affirmation": WEEKLY_AFFIRMATIONS.get(week, "")
        })
    
    postpartum_content = []
    for week in range(1, 7):
        postpartum_content.append({
            "week": week,
            "tip": POSTPARTUM_TIPS.get(week, ""),
            "affirmation": POSTPARTUM_AFFIRMATIONS.get(week, "")
        })
    
    return {
        "pregnancy": pregnancy_content,
        "postpartum": postpartum_content
    }

# ============== DOULA ROUTES ==============

@api_router.post("/doula/onboarding")
async def doula_onboarding(profile_data: DoulaProfileUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Complete doula onboarding"""
    now = datetime.now(timezone.utc)
    
    doula_profile = {
        "user_id": user.user_id,
        "practice_name": profile_data.practice_name,
        "zip_code": profile_data.zip_code,
        "location_city": profile_data.location_city,
        "location_state": profile_data.location_state,
        "services_offered": profile_data.services_offered or [],
        "years_in_practice": profile_data.years_in_practice,
        "accepting_new_clients": profile_data.accepting_new_clients if profile_data.accepting_new_clients is not None else True,
        "bio": profile_data.bio,
        "in_marketplace": False,
        "updated_at": now
    }
    
    await db.doula_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": doula_profile},
        upsert=True
    )
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    
    return {"message": "Onboarding completed", "profile": doula_profile}

@api_router.get("/doula/profile")
async def get_doula_profile(user: User = Depends(check_role(["DOULA"]))):
    """Get doula profile"""
    profile = await db.doula_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile

@api_router.put("/doula/profile")
async def update_doula_profile(profile_data: DoulaProfileUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Update doula profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.doula_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated"}

@api_router.get("/doula/dashboard")
async def get_doula_dashboard(user: User = Depends(check_role(["DOULA"]))):
    """Get doula dashboard stats"""
    # Count clients by status
    total_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "DOULA"})
    active_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "DOULA", "status": "Active"})
    
    # Count pending invoices
    pending_invoices = await db.invoices.count_documents({"doula_id": user.user_id, "status": {"$in": ["Sent", "Overdue"]}})
    
    # Count contracts this week
    contracts_pending = await db.contracts.count_documents({"doula_id": user.user_id, "status": "Sent"})
    
    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "pending_invoices": pending_invoices,
        "contracts_pending_signature": contracts_pending
    }

# ============== DOULA CLIENT ROUTES ==============

@api_router.get("/doula/clients")
async def get_doula_clients(user: User = Depends(check_role(["DOULA"]))):
    """Get doula's clients"""
    clients = await db.clients.find(
        {"provider_id": user.user_id, "provider_type": "DOULA"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return clients

@api_router.post("/doula/clients")
async def create_doula_client(client_data: ClientCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new client"""
    now = datetime.now(timezone.utc)
    
    client = {
        "client_id": f"client_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "DOULA",
        "name": client_data.name,
        "email": client_data.email,
        "phone": client_data.phone,
        "edd": client_data.edd,
        "planned_birth_setting": client_data.planned_birth_setting,
        "status": "Lead",
        "linked_mom_id": None,
        "risk_flags": [],
        "internal_notes": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client)
    client.pop('_id', None)  # Remove ObjectId added by insert_one
    return client

@api_router.get("/doula/clients/{client_id}")
async def get_doula_client(client_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Get a specific client"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get related data
    contracts = await db.contracts.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    invoices = await db.invoices.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    notes = await db.notes.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    # Get linked mom's birth plan if available
    birth_plan = None
    if client.get("linked_mom_id"):
        birth_plan = await db.birth_plans.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
    
    return {
        "client": client,
        "contracts": contracts,
        "invoices": invoices,
        "notes": notes,
        "birth_plan": birth_plan
    }

@api_router.put("/doula/clients/{client_id}")
async def update_doula_client(client_id: str, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Update a client"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["client_id", "provider_id", "provider_type", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.clients.update_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client updated"}

# ============== CONTRACT ROUTES ==============

@api_router.get("/doula/contracts")
async def get_doula_contracts(user: User = Depends(check_role(["DOULA"]))):
    """Get all contracts"""
    contracts = await db.contracts.find(
        {"doula_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return contracts

@api_router.get("/doula/contract-template")
async def get_doula_contract_template(user: User = Depends(check_role(["DOULA"]))):
    """Get the True Joy Birthing contract template"""
    return get_contract_template()

@api_router.post("/doula/contracts")
async def create_contract(contract_data: ContractCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new True Joy Birthing Doula Service Agreement"""
    # Get client info
    client = await db.clients.find_one({"client_id": contract_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Calculate remaining amount if not provided
    remaining = contract_data.remaining_payment_amount
    if remaining is None:
        remaining = contract_data.total_payment_amount - contract_data.retainer_fee
    
    # Get template sections and apply any customizations
    template = get_contract_template()
    sections = []
    for section in template["sections"]:
        section_copy = section.copy()
        # Check if there are customizations for this section
        if contract_data.section_customizations:
            for custom in contract_data.section_customizations:
                if custom.id == section["id"] and custom.custom_content:
                    section_copy["custom_content"] = custom.custom_content
        sections.append(section_copy)
    
    contract = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "doula_id": user.user_id,
        "doula_name": user.full_name,
        "client_id": contract_data.client_id,
        "client_name": client["name"],
        # Client & Payment Details
        "client_names": contract_data.client_names,
        "estimated_due_date": contract_data.estimated_due_date,
        "total_payment_amount": contract_data.total_payment_amount,
        "retainer_fee": contract_data.retainer_fee,
        "remaining_payment_amount": remaining,
        "final_payment_due_date": contract_data.final_payment_due_date,
        "agreement_date": now.strftime("%Y-%m-%d"),
        # Template sections
        "sections": sections,
        "additional_terms": contract_data.additional_terms,
        # Status
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

@api_router.get("/contracts/{contract_id}")
async def get_contract_by_id(contract_id: str):
    """Get a contract by ID (public endpoint for viewing/signing)"""
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get client and doula info
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

@api_router.get("/contracts/{contract_id}/html")
async def get_contract_html_view(contract_id: str):
    """Get HTML version of contract for viewing/printing"""
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    from fastapi.responses import HTMLResponse
    html_content = get_contract_html(contract)
    return HTMLResponse(content=html_content)

@api_router.get("/contracts/{contract_id}/pdf")
async def get_contract_pdf(contract_id: str):
    """Generate and download PDF version of doula contract"""
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    pdf_bytes = generate_doula_contract_pdf_bytes(contract)
    buffer = BytesIO(pdf_bytes)
    
    filename = f"Doula_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}_{contract_id}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.put("/doula/contracts/{contract_id}")
async def update_contract(contract_id: str, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Update a contract"""
    body = await request.json()
    
    # Prevent updating certain fields
    protected_fields = ["contract_id", "doula_id", "created_at", "client_signature", "doula_signature", "signed_at"]
    update_data = {k: v for k, v in body.items() if k not in protected_fields}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Recalculate remaining amount if fees changed
    if "total_payment_amount" in update_data or "retainer_fee" in update_data:
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if contract:
            total = update_data.get("total_payment_amount", contract.get("total_payment_amount", 0))
            retainer = update_data.get("retainer_fee", contract.get("retainer_fee", 0))
            update_data["remaining_payment_amount"] = total - retainer
    
    result = await db.contracts.update_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract updated"}

@api_router.post("/doula/contracts/{contract_id}/send")
async def send_contract(contract_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send contract for signature"""
    now = datetime.now(timezone.utc)
    
    contract = await db.contracts.find_one({"contract_id": contract_id, "doula_id": user.user_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # First, doula signs the contract
    doula_signature = {
        "signer_type": "doula",
        "signer_name": user.full_name,
        "signed_at": now.isoformat()
    }
    
    result = await db.contracts.update_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"$set": {
            "status": "Sent",
            "doula_signature": doula_signature,
            "sent_at": now,
            "updated_at": now
        }}
    )
    
    # Update client status
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Sent", "updated_at": now}}
    )
    
    # Get client email to send notification
    client = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    # Try to send email notification if client has linked mom account
    email_sent = False
    if client and client.get("linked_mom_id"):
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                signing_url = f"https://joy-birth-dev.preview.emergentagent.com/contract/{contract_id}"
                params = {
                    "from": SENDER_EMAIL,
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

@api_router.post("/contracts/{contract_id}/sign")
async def sign_contract(contract_id: str, request: Request):
    """Client signs the contract"""
    body = await request.json()
    signer_name = body.get("signer_name", "")
    signature_data = body.get("signature_data", "")  # Base64 signature or typed name
    
    if not signer_name.strip():
        raise HTTPException(status_code=400, detail="Signer name is required")
    
    now = datetime.now(timezone.utc)
    
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") == "Signed":
        raise HTTPException(status_code=400, detail="Contract already signed")
    
    if contract.get("status") != "Sent":
        raise HTTPException(status_code=400, detail="Contract must be sent before signing")
    
    # Create client signature
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
    
    # Update client status
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Signed", "updated_at": now}}
    )
    
    # Notify doula
    await create_notification(
        user_id=contract["doula_id"],
        notif_type="contract_signed",
        title="Contract Signed",
        message=f"{signer_name} has signed the Doula Service Agreement",
        data={"contract_id": contract_id}
    )
    
    # Fetch updated contract and send PDF emails to both parties
    updated_contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    doula = await db.users.find_one({"user_id": contract["doula_id"]}, {"_id": 0, "password_hash": 0})
    client_record = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    emails_sent = {"doula": False, "client": False}
    
    # Send to doula
    if doula and doula.get("email"):
        emails_sent["doula"] = await send_signed_contract_email(
            "doula", 
            updated_contract,
            doula["email"],
            doula.get("full_name", ""),
            doula.get("full_name", "")
        )
    
    # Send to client (via linked mom account)
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

# ============== MIDWIFE CONTRACT ROUTES ==============

@api_router.get("/midwife/contracts")
async def get_midwife_contracts(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all midwife contracts"""
    contracts = await db.midwife_contracts.find(
        {"midwife_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return contracts

@api_router.get("/midwife/contract-template")
async def get_midwife_contract_template_route(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get the Midwifery Services Agreement template"""
    return get_midwife_contract_template()

@api_router.post("/midwife/contracts")
async def create_midwife_contract(contract_data: MidwifeContractCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new Midwifery Services Agreement"""
    # Get client info
    client = await db.clients.find_one(
        {"client_id": contract_data.client_id, "provider_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Calculate remaining balance if not provided
    remaining = contract_data.remaining_balance
    if remaining is None:
        remaining = contract_data.total_fee - contract_data.deposit
    
    # Get template sections and apply any customizations
    template = get_midwife_contract_template()
    sections = []
    for section in template["sections"]:
        section_copy = section.copy()
        # Check if there are customizations for this section
        if contract_data.section_customizations:
            for custom in contract_data.section_customizations:
                if custom.id == section["id"] and custom.custom_content:
                    section_copy["custom_content"] = custom.custom_content
        sections.append(section_copy)
    
    contract = {
        "contract_id": f"mw_contract_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "midwife_name": user.full_name,
        "client_id": contract_data.client_id,
        "client_name": contract_data.client_name,
        "partner_name": contract_data.partner_name,
        # Care Details
        "estimated_due_date": contract_data.estimated_due_date,
        "planned_birth_place": contract_data.planned_birth_place,
        "on_call_start_week": contract_data.on_call_start_week,
        "on_call_end_week": contract_data.on_call_end_week,
        # Payment Details
        "total_fee": contract_data.total_fee,
        "deposit": contract_data.deposit,
        "remaining_balance": remaining,
        "balance_due_week": contract_data.balance_due_week,
        # Practice Info
        "practice_name": contract_data.practice_name,
        "agreement_date": now.strftime("%Y-%m-%d"),
        # Template sections
        "sections": sections,
        "additional_terms": contract_data.additional_terms,
        # Status
        "status": "Draft",
        "client_signature": None,
        "midwife_signature": None,
        "sent_at": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.midwife_contracts.insert_one(contract)
    contract.pop('_id', None)
    return contract

@api_router.get("/midwife/contracts/{contract_id}")
async def get_midwife_contract_detail(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific midwife contract"""
    contract = await db.midwife_contracts.find_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract

@api_router.get("/midwife-contracts/{contract_id}")
async def get_midwife_contract_by_id(contract_id: str):
    """Get a midwife contract by ID (public endpoint for viewing/signing)"""
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get client and midwife info
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

@api_router.get("/midwife-contracts/{contract_id}/html")
async def get_midwife_contract_html_view(contract_id: str):
    """Get HTML version of midwife contract for viewing/printing"""
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    from fastapi.responses import HTMLResponse
    html_content = get_midwife_contract_html(contract)
    return HTMLResponse(content=html_content)

@api_router.get("/midwife-contracts/{contract_id}/pdf")
async def get_midwife_contract_pdf(contract_id: str):
    """Generate and download PDF version of midwife contract"""
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    pdf_bytes = generate_midwife_contract_pdf_bytes(contract)
    buffer = BytesIO(pdf_bytes)
    
    filename = f"Midwifery_Agreement_{contract.get('client_name', 'Client').replace(' ', '_')}_{contract_id}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.put("/midwife/contracts/{contract_id}")
async def update_midwife_contract(contract_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a midwife contract"""
    body = await request.json()
    
    # Prevent updating certain fields
    protected_fields = ["contract_id", "midwife_id", "created_at", "client_signature", "midwife_signature", "signed_at"]
    update_data = {k: v for k, v in body.items() if k not in protected_fields}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Recalculate remaining balance if fees changed
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

@api_router.post("/midwife/contracts/{contract_id}/send")
async def send_midwife_contract(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Send midwife contract for signature"""
    now = datetime.now(timezone.utc)
    
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id, "midwife_id": user.user_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # First, midwife signs the contract
    midwife_signature = {
        "signer_type": "midwife",
        "signer_name": user.full_name,
        "signed_at": now.isoformat()
    }
    
    result = await db.midwife_contracts.update_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"$set": {
            "status": "Sent",
            "midwife_signature": midwife_signature,
            "sent_at": now,
            "updated_at": now
        }}
    )
    
    # Update client status
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Sent", "updated_at": now}}
    )
    
    # Get client email to send notification
    client = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    # Try to send email notification if client has linked mom account
    email_sent = False
    if client and client.get("linked_mom_id"):
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                signing_url = f"https://joy-birth-dev.preview.emergentagent.com/sign-midwife-contract?contractId={contract_id}"
                params = {
                    "from": SENDER_EMAIL,
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

@api_router.post("/midwife-contracts/{contract_id}/sign")
async def sign_midwife_contract(contract_id: str, request: Request):
    """Client signs the midwife contract"""
    body = await request.json()
    signer_name = body.get("signer_name", "")
    signature_data = body.get("signature_data", "")  # Base64 signature or typed name
    
    if not signer_name.strip():
        raise HTTPException(status_code=400, detail="Signer name is required")
    
    now = datetime.now(timezone.utc)
    
    contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    if contract.get("status") == "Signed":
        raise HTTPException(status_code=400, detail="Contract already signed")
    
    if contract.get("status") != "Sent":
        raise HTTPException(status_code=400, detail="Contract must be sent before signing")
    
    # Create client signature
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
    
    # Update client status
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Signed", "updated_at": now}}
    )
    
    # Notify midwife
    await create_notification(
        user_id=contract["midwife_id"],
        notif_type="contract_signed",
        title="Contract Signed",
        message=f"{signer_name} has signed the Midwifery Services Agreement",
        data={"contract_id": contract_id}
    )
    
    # Fetch updated contract and send PDF emails to both parties
    updated_contract = await db.midwife_contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    midwife = await db.users.find_one({"user_id": contract["midwife_id"]}, {"_id": 0, "password_hash": 0})
    client_record = await db.clients.find_one({"client_id": contract["client_id"]}, {"_id": 0})
    
    emails_sent = {"midwife": False, "client": False}
    
    # Send to midwife
    if midwife and midwife.get("email"):
        emails_sent["midwife"] = await send_signed_contract_email(
            "midwife", 
            updated_contract,
            midwife["email"],
            midwife.get("full_name", ""),
            midwife.get("full_name", "")
        )
    
    # Send to client (via linked mom account)
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

# ============== INVOICE ROUTES ==============

@api_router.get("/doula/invoices")
async def get_doula_invoices(user: User = Depends(check_role(["DOULA"]))):
    """Get all invoices"""
    invoices = await db.invoices.find(
        {"doula_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return invoices

@api_router.post("/doula/invoices")
async def create_invoice(invoice_data: InvoiceCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new invoice"""
    # Get client name
    client = await db.clients.find_one({"client_id": invoice_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    invoice = {
        "invoice_id": f"invoice_{uuid.uuid4().hex[:12]}",
        "doula_id": user.user_id,
        "client_id": invoice_data.client_id,
        "client_name": client["name"],
        "invoice_title": invoice_data.invoice_title,
        "amount": invoice_data.amount,
        "due_date": invoice_data.due_date,
        "notes": invoice_data.notes,
        "status": "Draft",
        "paid_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.invoices.insert_one(invoice)
    invoice.pop('_id', None)  # Remove ObjectId added by insert_one
    return invoice

@api_router.put("/doula/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Update an invoice"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["invoice_id", "doula_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "doula_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice updated"}

@api_router.post("/doula/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send invoice to client (mock)"""
    now = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "doula_id": user.user_id},
        {"$set": {"status": "Sent", "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice sent (mocked)"}

@api_router.post("/doula/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Mark invoice as paid"""
    now = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "doula_id": user.user_id},
        {"$set": {"status": "Paid", "paid_at": now, "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice marked as paid"}

# ============== DOULA NOTES ROUTES ==============

@api_router.get("/doula/notes")
async def get_doula_notes(user: User = Depends(check_role(["DOULA"])), client_id: Optional[str] = None):
    """Get notes, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes

@api_router.post("/doula/notes")
async def create_doula_note(note_data: NoteCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new note"""
    now = datetime.now(timezone.utc)
    
    note = {
        "note_id": f"note_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": note_data.client_id,
        "note_type": note_data.note_type,
        "content": note_data.content,
        "date": note_data.date or now.strftime("%Y-%m-%d"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.notes.insert_one(note)
    note.pop('_id', None)  # Remove ObjectId added by insert_one
    return note

@api_router.put("/doula/notes/{note_id}")
async def update_doula_note(note_id: str, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Update a note"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["note_id", "provider_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.notes.update_one(
        {"note_id": note_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note updated"}

# ============== MIDWIFE ROUTES ==============

@api_router.post("/midwife/onboarding")
async def midwife_onboarding(profile_data: MidwifeProfileUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Complete midwife onboarding"""
    now = datetime.now(timezone.utc)
    
    midwife_profile = {
        "user_id": user.user_id,
        "practice_name": profile_data.practice_name,
        "credentials": profile_data.credentials,
        "zip_code": profile_data.zip_code,
        "location_city": profile_data.location_city,
        "location_state": profile_data.location_state,
        "years_in_practice": profile_data.years_in_practice,
        "birth_settings_served": profile_data.birth_settings_served or [],
        "accepting_new_clients": profile_data.accepting_new_clients if profile_data.accepting_new_clients is not None else True,
        "bio": profile_data.bio,
        "in_marketplace": False,
        "updated_at": now
    }
    
    await db.midwife_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": midwife_profile},
        upsert=True
    )
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    
    return {"message": "Onboarding completed", "profile": midwife_profile}

@api_router.get("/midwife/profile")
async def get_midwife_profile(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife profile"""
    profile = await db.midwife_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile

@api_router.put("/midwife/profile")
async def update_midwife_profile(profile_data: MidwifeProfileUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update midwife profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.midwife_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated"}

@api_router.get("/midwife/dashboard")
async def get_midwife_dashboard(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife dashboard stats"""
    total_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "MIDWIFE"})
    prenatal_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "MIDWIFE", "status": "Prenatal"})
    
    # Count visits this month
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    visits_this_month = await db.visits.count_documents({
        "midwife_id": user.user_id,
        "created_at": {"$gte": start_of_month}
    })
    
    # Count births this month
    births_this_month = await db.birth_summaries.count_documents({
        "midwife_id": user.user_id,
        "created_at": {"$gte": start_of_month}
    })
    
    return {
        "total_clients": total_clients,
        "prenatal_clients": prenatal_clients,
        "visits_this_month": visits_this_month,
        "births_this_month": births_this_month
    }

# ============== MIDWIFE CLIENT ROUTES ==============

@api_router.get("/midwife/clients")
async def get_midwife_clients(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife's clients"""
    clients = await db.clients.find(
        {"provider_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return clients

@api_router.post("/midwife/clients")
async def create_midwife_client(client_data: ClientCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new client"""
    now = datetime.now(timezone.utc)
    
    client = {
        "client_id": f"client_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "MIDWIFE",
        "name": client_data.name,
        "email": client_data.email,
        "phone": client_data.phone,
        "edd": client_data.edd,
        "planned_birth_setting": client_data.planned_birth_setting,
        "status": "Prenatal",
        "linked_mom_id": None,
        "risk_flags": [],
        "internal_notes": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client)
    client.pop('_id', None)  # Remove ObjectId added by insert_one
    return client

@api_router.get("/midwife/clients/{client_id}")
async def get_midwife_client(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific client with visits and birth summary"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    visits = await db.visits.find({"client_id": client_id}, {"_id": 0}).sort("visit_date", -1).to_list(100)
    birth_summary = await db.birth_summaries.find_one({"client_id": client_id}, {"_id": 0})
    notes = await db.notes.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    # Get linked mom's birth plan if available
    birth_plan = None
    if client.get("linked_mom_id"):
        birth_plan = await db.birth_plans.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
    
    return {
        "client": client,
        "visits": visits,
        "birth_summary": birth_summary,
        "notes": notes,
        "birth_plan": birth_plan
    }

@api_router.put("/midwife/clients/{client_id}")
async def update_midwife_client(client_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a client"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["client_id", "provider_id", "provider_type", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.clients.update_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client updated"}

# ============== VISIT ROUTES (MIDWIFE) ==============

@api_router.get("/midwife/visits")
async def get_midwife_visits(user: User = Depends(check_role(["MIDWIFE"])), client_id: Optional[str] = None):
    """Get visits, optionally filtered by client"""
    query = {"midwife_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    
    visits = await db.visits.find(query, {"_id": 0}).sort("visit_date", -1).to_list(100)
    return visits

@api_router.post("/midwife/visits")
async def create_visit(visit_data: VisitCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new visit with split notes (summary_for_mom and private_note)"""
    now = datetime.now(timezone.utc)
    
    visit = {
        "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": visit_data.client_id,
        "visit_date": visit_data.visit_date,
        "visit_type": visit_data.visit_type,
        "gestational_age": visit_data.gestational_age,
        "blood_pressure": visit_data.blood_pressure,  # Clinical - NOT visible to Mom
        "weight": visit_data.weight,  # Clinical - NOT visible to Mom
        "fetal_heart_rate": visit_data.fetal_heart_rate,  # Clinical - NOT visible to Mom
        "summary_for_mom": visit_data.summary_for_mom,  # Mom-friendly summary
        "private_note": visit_data.private_note,  # Private clinical note
        "created_at": now,
        "updated_at": now
    }
    
    await db.visits.insert_one(visit)
    visit.pop('_id', None)  # Remove ObjectId added by insert_one
    return visit

@api_router.put("/midwife/visits/{visit_id}")
async def update_visit(visit_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a visit"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["visit_id", "midwife_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.visits.update_one(
        {"visit_id": visit_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    return {"message": "Visit updated"}

# ============== BIRTH SUMMARY ROUTES (MIDWIFE) ==============

@api_router.get("/midwife/birth-summaries")
async def get_birth_summaries(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all birth summaries"""
    summaries = await db.birth_summaries.find(
        {"midwife_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return summaries

@api_router.post("/midwife/birth-summaries")
async def create_birth_summary(summary_data: BirthSummaryCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new birth summary"""
    now = datetime.now(timezone.utc)
    
    # Check if summary already exists for this client
    existing = await db.birth_summaries.find_one({"client_id": summary_data.client_id})
    if existing:
        raise HTTPException(status_code=400, detail="Birth summary already exists for this client")
    
    summary = {
        "summary_id": f"summary_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": summary_data.client_id,
        "birth_datetime": summary_data.birth_datetime,
        "birth_place": summary_data.birth_place,
        "mode_of_birth": summary_data.mode_of_birth,
        "newborn_details": summary_data.newborn_details,
        "complications": summary_data.complications,
        "summary_note": summary_data.summary_note,
        "created_at": now,
        "updated_at": now
    }
    
    await db.birth_summaries.insert_one(summary)
    summary.pop('_id', None)  # Remove ObjectId added by insert_one
    
    # Update client status to Postpartum
    await db.clients.update_one(
        {"client_id": summary_data.client_id},
        {"$set": {"status": "Postpartum", "updated_at": now}}
    )
    
    return summary

@api_router.put("/midwife/birth-summaries/{summary_id}")
async def update_birth_summary(summary_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a birth summary"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["summary_id", "midwife_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.birth_summaries.update_one(
        {"summary_id": summary_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Birth summary not found")
    
    return {"message": "Birth summary updated"}

# ============== MIDWIFE NOTES ROUTES ==============

@api_router.get("/midwife/notes")
async def get_midwife_notes(user: User = Depends(check_role(["MIDWIFE"])), client_id: Optional[str] = None):
    """Get notes"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes

@api_router.post("/midwife/notes")
async def create_midwife_note(note_data: NoteCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new note"""
    now = datetime.now(timezone.utc)
    
    note = {
        "note_id": f"note_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": note_data.client_id,
        "note_type": note_data.note_type,
        "content": note_data.content,
        "date": note_data.date or now.strftime("%Y-%m-%d"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.notes.insert_one(note)
    note.pop('_id', None)  # Remove ObjectId added by insert_one
    return note

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/users")
async def get_all_users(user: User = Depends(check_role(["ADMIN"])), role: Optional[str] = None):
    """Get all users (admin only)"""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request, admin: User = Depends(check_role(["ADMIN"]))):
    """Update a user's role"""
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ROLES}")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": new_role, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User role updated to {new_role}"}

@api_router.get("/admin/content")
async def get_admin_content(user: User = Depends(check_role(["ADMIN"]))):
    """Get all content items"""
    content = await db.admin_content.find({}, {"_id": 0}).to_list(100)
    
    # If no content exists, create defaults
    if not content:
        now = datetime.now(timezone.utc)
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

@api_router.put("/admin/content/{section_id}")
async def update_admin_content(section_id: str, request: Request, user: User = Depends(check_role(["ADMIN"]))):
    """Update content for a section"""
    body = await request.json()
    now = datetime.now(timezone.utc)
    
    update_data = {
        "section_id": section_id,
        "explanatory_text": body.get("explanatory_text"),
        "video_url": body.get("video_url"),
        "updated_by": user.user_id,
        "updated_at": now
    }
    
    result = await db.admin_content.update_one(
        {"section_id": section_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Content updated"}

# ============== MARKETPLACE ROUTES (Phase 3) ==============

@api_router.get("/marketplace/providers")
async def search_providers(
    provider_type: Optional[str] = None,
    location_city: Optional[str] = None,
    location_state: Optional[str] = None,
    birth_setting: Optional[str] = None,
    virtual_available: Optional[bool] = None
):
    """Search for providers in marketplace"""
    # Search doulas
    doula_query = {"in_marketplace": True, "accepting_new_clients": True}
    if location_city:
        doula_query["location_city"] = {"$regex": location_city, "$options": "i"}
    if location_state:
        doula_query["location_state"] = {"$regex": location_state, "$options": "i"}
    
    doulas = []
    if not provider_type or provider_type == "DOULA":
        doula_profiles = await db.doula_profiles.find(doula_query, {"_id": 0}).to_list(50)
        for profile in doula_profiles:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                doulas.append({
                    "provider_type": "DOULA",
                    "user": user,
                    "profile": profile
                })
    
    # Search midwives
    midwife_query = {"in_marketplace": True, "accepting_new_clients": True}
    if location_city:
        midwife_query["location_city"] = {"$regex": location_city, "$options": "i"}
    if location_state:
        midwife_query["location_state"] = {"$regex": location_state, "$options": "i"}
    if birth_setting:
        midwife_query["birth_settings_served"] = birth_setting
    
    midwives = []
    if not provider_type or provider_type == "MIDWIFE":
        midwife_profiles = await db.midwife_profiles.find(midwife_query, {"_id": 0}).to_list(50)
        for profile in midwife_profiles:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                midwives.append({
                    "provider_type": "MIDWIFE",
                    "user": user,
                    "profile": profile
                })
    
    return {"doulas": doulas, "midwives": midwives}

@api_router.get("/marketplace/provider/{user_id}")
async def get_provider_profile(user_id: str):
    """Get a provider's public profile"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if user["role"] == "DOULA":
        profile = await db.doula_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    elif user["role"] == "MIDWIFE":
        profile = await db.midwife_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    else:
        raise HTTPException(status_code=400, detail="User is not a provider")
    
    return {
        "user": user,
        "profile": profile,
        "clients_served": clients_served
    }

# ============== PREGNANCY TIMELINE DATA ==============

PREGNANCY_TIMELINE = [
    {"week": 4, "baby_development": "Your baby is the size of a poppy seed. The neural tube is forming.", "tip": "Take prenatal vitamins with folic acid daily."},
    {"week": 5, "baby_development": "Heart begins to beat! Baby is the size of a sesame seed.", "tip": "Morning sickness may start - ginger tea can help."},
    {"week": 6, "baby_development": "Facial features beginning to form. Baby is the size of a lentil.", "tip": "Schedule your first prenatal visit."},
    {"week": 7, "baby_development": "Arms and legs are developing. Baby is the size of a blueberry.", "tip": "Stay hydrated - aim for 8-10 glasses of water."},
    {"week": 8, "baby_development": "Fingers and toes are forming. Baby is the size of a raspberry.", "tip": "Consider starting a pregnancy journal."},
    {"week": 9, "baby_development": "Baby is starting to move! Size of a grape.", "tip": "Get plenty of rest - your body is working hard."},
    {"week": 10, "baby_development": "All vital organs are formed. Baby is the size of a kumquat.", "tip": "Start thinking about maternity clothes."},
    {"week": 11, "baby_development": "Baby can open and close fists. Size of a fig.", "tip": "Consider genetic screening options."},
    {"week": 12, "baby_development": "Reflexes are developing. Baby is the size of a lime.", "tip": "You may start showing soon!"},
    {"week": 13, "baby_development": "Fingerprints are forming. Baby is the size of a lemon.", "tip": "Second trimester begins - energy may return!"},
    {"week": 14, "baby_development": "Baby can make facial expressions. Size of a peach.", "tip": "Great time to start prenatal exercise."},
    {"week": 15, "baby_development": "Baby can sense light. Size of an apple.", "tip": "Consider starting a birth plan."},
    {"week": 16, "baby_development": "Baby's eyes can move. Size of an avocado.", "tip": "You might feel quickening (first movements)!"},
    {"week": 17, "baby_development": "Skeleton is hardening. Size of a pear.", "tip": "Sleep on your side for better circulation."},
    {"week": 18, "baby_development": "Baby can hear sounds. Size of a sweet potato.", "tip": "Talk and sing to your baby!"},
    {"week": 19, "baby_development": "Vernix coating is forming. Size of a mango.", "tip": "Anatomy scan usually happens around now."},
    {"week": 20, "baby_development": "Halfway there! Baby is the size of a banana.", "tip": "You may find out the sex at your ultrasound."},
    {"week": 21, "baby_development": "Baby has eyebrows. Size of a carrot.", "tip": "Start researching childbirth classes."},
    {"week": 22, "baby_development": "Baby looks like a mini newborn. Size of a papaya.", "tip": "Consider hiring a doula."},
    {"week": 23, "baby_development": "Baby can hear your heartbeat. Size of a grapefruit.", "tip": "Practice relaxation techniques."},
    {"week": 24, "baby_development": "Lungs are developing. Size of an ear of corn.", "tip": "Baby has reached viability milestone."},
    {"week": 25, "baby_development": "Baby responds to your voice. Size of a cauliflower.", "tip": "Start thinking about baby gear."},
    {"week": 26, "baby_development": "Eyes are opening. Size of a head of lettuce.", "tip": "Consider a glucose screening test."},
    {"week": 27, "baby_development": "Brain is very active. Size of a head of broccoli.", "tip": "Third trimester begins!"},
    {"week": 28, "baby_development": "Baby can dream! Size of an eggplant.", "tip": "Count kicks - 10 movements in 2 hours."},
    {"week": 29, "baby_development": "Baby is gaining weight. Size of a butternut squash.", "tip": "Finalize your birth plan."},
    {"week": 30, "baby_development": "Baby can regulate body temperature. Size of a cabbage.", "tip": "Take a hospital tour."},
    {"week": 31, "baby_development": "Brain is developing rapidly. Size of a coconut.", "tip": "Pack your hospital bag."},
    {"week": 32, "baby_development": "Baby is practicing breathing. Size of a squash.", "tip": "Consider perineal massage."},
    {"week": 33, "baby_development": "Bones are hardening. Size of a pineapple.", "tip": "Discuss birth preferences with your provider."},
    {"week": 34, "baby_development": "Baby may turn head-down. Size of a cantaloupe.", "tip": "Install the car seat."},
    {"week": 35, "baby_development": "Baby is gaining fat. Size of a honeydew melon.", "tip": "Know the signs of labor."},
    {"week": 36, "baby_development": "Baby may drop lower. Size of a head of romaine.", "tip": "Weekly prenatal visits begin."},
    {"week": 37, "baby_development": "Baby is considered early term. Size of a winter melon.", "tip": "Rest as much as possible."},
    {"week": 38, "baby_development": "Baby's organs are mature. Size of a leek.", "tip": "Practice breathing exercises."},
    {"week": 39, "baby_development": "Baby is full term! Size of a watermelon.", "tip": "Trust your body - you've got this!"},
    {"week": 40, "baby_development": "Due date! Baby is ready to meet you.", "tip": "Stay calm - babies come on their own time."},
]

@api_router.get("/timeline")
async def get_pregnancy_timeline(user: User = Depends(check_role(["MOM"]))):
    """Get pregnancy timeline with current week"""
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    current_week = None
    if mom_profile and mom_profile.get("due_date"):
        try:
            due_date = datetime.strptime(mom_profile["due_date"], "%Y-%m-%d")
            today = datetime.now()
            days_until_due = (due_date - today).days
            weeks_pregnant = 40 - (days_until_due // 7)
            current_week = max(4, min(40, weeks_pregnant))  # Clamp between 4 and 40
        except:
            pass
    
    return {
        "current_week": current_week,
        "due_date": mom_profile.get("due_date") if mom_profile else None,
        "timeline": PREGNANCY_TIMELINE
    }

# ============== MESSAGING ROUTES ==============

@api_router.get("/messages/conversations")
async def get_conversations(user: User = Depends(get_current_user)):
    """Get all conversations for the current user"""
    # Find all unique conversations where user is sender or receiver
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"sender_id": user.user_id},
                    {"receiver_id": user.user_id}
                ]
            }
        },
        {
            "$sort": {"created_at": -1}
        },
        {
            "$group": {
                "_id": {
                    "$cond": [
                        {"$eq": ["$sender_id", user.user_id]},
                        "$receiver_id",
                        "$sender_id"
                    ]
                },
                "last_message": {"$first": "$$ROOT"},
                "unread_count": {
                    "$sum": {
                        "$cond": [
                            {"$and": [
                                {"$eq": ["$receiver_id", user.user_id]},
                                {"$eq": ["$read", False]}
                            ]},
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            "$sort": {"last_message.created_at": -1}
        }
    ]
    
    conversations_cursor = db.messages.aggregate(pipeline)
    conversations = await conversations_cursor.to_list(100)
    
    # Enhance with user info
    result = []
    for conv in conversations:
        other_user_id = conv["_id"]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "password_hash": 0})
        
        if other_user:
            last_msg = conv["last_message"]
            result.append({
                "other_user_id": other_user_id,
                "other_user_name": other_user.get("full_name", "Unknown"),
                "other_user_role": other_user.get("role", ""),
                "other_user_picture": other_user.get("picture"),
                "last_message_content": last_msg.get("content", "")[:50] + ("..." if len(last_msg.get("content", "")) > 50 else ""),
                "last_message_time": last_msg.get("created_at"),
                "unread_count": conv["unread_count"],
                "is_sender": last_msg.get("sender_id") == user.user_id
            })
    
    return {"conversations": result}

@api_router.get("/messages/{other_user_id}")
async def get_messages(other_user_id: str, user: User = Depends(get_current_user), limit: int = 50):
    """Get messages between current user and another user"""
    # Verify the other user exists
    other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0})
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get messages in conversation (both directions)
    messages = await db.messages.find(
        {
            "$or": [
                {"sender_id": user.user_id, "receiver_id": other_user_id},
                {"sender_id": other_user_id, "receiver_id": user.user_id}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark received messages as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    # Reverse to show oldest first
    messages.reverse()
    
    return {
        "messages": messages,
        "other_user": {
            "user_id": other_user_id,
            "full_name": other_user.get("full_name"),
            "role": other_user.get("role"),
            "picture": other_user.get("picture")
        }
    }

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, user: User = Depends(get_current_user)):
    """Send a message to another user"""
    # Verify receiver exists
    receiver = await db.users.find_one({"user_id": message_data.receiver_id}, {"_id": 0})
    if not receiver:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    if message_data.receiver_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")
    
    if not message_data.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
    
    # Check messaging permissions based on roles
    sender_role = user.role
    receiver_role = receiver.get("role")
    
    # Mom <-> Provider messaging requires an active connection with can_message permission
    if sender_role == "MOM" and receiver_role in ["DOULA", "MIDWIFE"]:
        can_msg = await check_provider_can_message(message_data.receiver_id, user.user_id)
        if not can_msg:
            raise HTTPException(status_code=403, detail="You don't have an active connection with this provider")
    elif sender_role in ["DOULA", "MIDWIFE"] and receiver_role == "MOM":
        can_msg = await check_provider_can_message(user.user_id, message_data.receiver_id)
        if not can_msg:
            raise HTTPException(status_code=403, detail="You don't have an active connection with this client")
    # Doula <-> Midwife messaging only allowed if they share a common client (optional for MVP)
    elif sender_role in ["DOULA", "MIDWIFE"] and receiver_role in ["DOULA", "MIDWIFE"]:
        # For MVP, we allow providers to message each other if they have at least one shared client
        sender_clients = await db.share_requests.find({"provider_id": user.user_id, "status": "accepted"}).to_list(1000)
        receiver_clients = await db.share_requests.find({"provider_id": message_data.receiver_id, "status": "accepted"}).to_list(1000)
        sender_mom_ids = {c["mom_user_id"] for c in sender_clients}
        receiver_mom_ids = {c["mom_user_id"] for c in receiver_clients}
        shared_clients = sender_mom_ids & receiver_mom_ids
        if not shared_clients:
            raise HTTPException(status_code=403, detail="You can only message providers who share a common client with you")
    
    now = datetime.now(timezone.utc)
    
    message_doc = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "sender_id": user.user_id,
        "sender_name": user.full_name,
        "sender_role": user.role,
        "receiver_id": message_data.receiver_id,
        "receiver_name": receiver.get("full_name", "Unknown"),
        "receiver_role": receiver.get("role", ""),
        "content": message_data.content.strip(),
        "read": False,
        "created_at": now
    }
    
    await db.messages.insert_one(message_doc)
    message_doc.pop('_id', None)
    
    # Create notification for receiver
    await create_notification(
        user_id=message_data.receiver_id,
        notif_type="new_message",
        title="New Message",
        message=f"{user.full_name} sent you a message",
        data={"sender_id": user.user_id, "message_id": message_doc["message_id"]}
    )
    
    return {"message": "Message sent", "data": message_doc}

@api_router.get("/messages/unread/count")
async def get_unread_count(user: User = Depends(get_current_user)):
    """Get count of unread messages"""
    count = await db.messages.count_documents({"receiver_id": user.user_id, "read": False})
    return {"unread_count": count}

# ============== APPOINTMENT ROUTES ==============

@api_router.post("/appointments")
async def create_appointment(appointment_data: AppointmentCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create an appointment with a Mom client"""
    now = datetime.now(timezone.utc)
    
    # Verify the Mom exists and has an active connection with this provider
    mom = await db.users.find_one({"user_id": appointment_data.mom_user_id, "role": "MOM"}, {"_id": 0})
    if not mom:
        raise HTTPException(status_code=404, detail="Mom not found")
    
    # Check for active connection
    connection = await db.share_requests.find_one({
        "mom_user_id": appointment_data.mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    if not connection:
        raise HTTPException(status_code=403, detail="No active connection with this Mom")
    
    appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
    appointment_doc = {
        "appointment_id": appointment_id,
        "provider_id": user.user_id,
        "provider_name": user.full_name,
        "provider_role": user.role,
        "mom_user_id": appointment_data.mom_user_id,
        "mom_name": mom["full_name"],
        "appointment_date": appointment_data.appointment_date,
        "appointment_time": appointment_data.appointment_time,
        "appointment_type": appointment_data.appointment_type,
        "location": appointment_data.location,
        "is_virtual": appointment_data.is_virtual,
        "notes": appointment_data.notes,  # Private notes for provider
        "status": "pending",
        "created_at": now,
        "updated_at": now
    }
    
    await db.appointments.insert_one(appointment_doc)
    appointment_doc.pop('_id', None)
    
    # Send notification to Mom
    await create_notification(
        user_id=appointment_data.mom_user_id,
        notif_type="appointment_invite",
        title="Appointment Invitation",
        message=f"{user.full_name} invited you to an appointment on {appointment_data.appointment_date}",
        data={"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    
    return {"message": "Appointment created", "appointment": appointment_doc}

@api_router.get("/appointments")
async def get_appointments(user: User = Depends(get_current_user)):
    """Get appointments based on user role"""
    if user.role == "MOM":
        # Mom sees appointments where she's invited (without provider's private notes)
        appointments = await db.appointments.find(
            {"mom_user_id": user.user_id},
            {"_id": 0, "notes": 0}  # Exclude provider's private notes
        ).sort("appointment_date", 1).to_list(100)
    else:
        # Providers see their own appointments (including private notes)
        appointments = await db.appointments.find(
            {"provider_id": user.user_id},
            {"_id": 0}
        ).sort("appointment_date", 1).to_list(100)
    
    return appointments

@api_router.put("/appointments/{appointment_id}/respond")
async def respond_to_appointment(appointment_id: str, response: str, user: User = Depends(check_role(["MOM"]))):
    """Mom responds to an appointment invitation"""
    if response not in ["accepted", "declined"]:
        raise HTTPException(status_code=400, detail="Response must be 'accepted' or 'declined'")
    
    appointment = await db.appointments.find_one({"appointment_id": appointment_id, "mom_user_id": user.user_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = datetime.now(timezone.utc)
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": response, "updated_at": now}}
    )
    
    # Notify the provider
    await create_notification(
        user_id=appointment["provider_id"],
        notif_type="appointment_response",
        title=f"Appointment {response.title()}",
        message=f"{user.full_name} has {response} your appointment invitation",
        data={"appointment_id": appointment_id, "status": response}
    )
    
    return {"message": f"Appointment {response}"}

@api_router.delete("/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str, user: User = Depends(get_current_user)):
    """Cancel an appointment (either party can cancel)"""
    query = {"appointment_id": appointment_id}
    if user.role == "MOM":
        query["mom_user_id"] = user.user_id
    else:
        query["provider_id"] = user.user_id
    
    appointment = await db.appointments.find_one(query)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Notify the other party
    notify_user_id = appointment["mom_user_id"] if user.role != "MOM" else appointment["provider_id"]
    await create_notification(
        user_id=notify_user_id,
        notif_type="appointment_response",
        title="Appointment Cancelled",
        message=f"{user.full_name} has cancelled the appointment",
        data={"appointment_id": appointment_id, "status": "cancelled"}
    )
    
    return {"message": "Appointment cancelled"}

# ============== COLLABORATION HELPERS ==============

async def check_provider_can_view_birth_plan(provider_id: str, mom_user_id: str) -> bool:
    """Check if provider has permission to view Mom's birth plan"""
    connection = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_user_id,
        "status": "accepted"
    })
    if not connection:
        return False
    # Default to True for active connections, but check explicit permission if set
    return connection.get("can_view_birth_plan", True)

async def check_provider_can_message(provider_id: str, mom_user_id: str) -> bool:
    """Check if provider has permission to message Mom"""
    connection = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_user_id,
        "status": "accepted"
    })
    if not connection:
        return False
    return connection.get("can_message", True)

async def notify_providers_birth_plan_complete(mom_user_id: str, mom_name: str):
    """Notify all connected providers when Mom completes her birth plan"""
    # Find all active connections
    connections = await db.share_requests.find({
        "mom_user_id": mom_user_id,
        "status": "accepted"
    }).to_list(100)
    
    for conn in connections:
        if conn.get("can_view_birth_plan", True):
            await create_notification(
                user_id=conn["provider_id"],
                notif_type="birth_plan_complete",
                title="Birth Plan Complete",
                message=f"{mom_name} has completed her Joyful Birth Plan. Tap to review and discuss together.",
                data={"mom_user_id": mom_user_id}
            )

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "True Joy Birthing API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
