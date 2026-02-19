from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx
import resend
import json

# Import weekly content
from weekly_content import (
    WEEKLY_TIPS, POSTPARTUM_TIPS,
    WEEKLY_AFFIRMATIONS, POSTPARTUM_AFFIRMATIONS,
    GENERIC_POSTPARTUM_AFFIRMATION,
    get_weekly_tip, get_weekly_affirmation
)

# Import doula contract template
from doula_contract_template import (
    get_contract_template,
    get_contract_html,
    generate_contract_text,
    DEFAULT_CONTRACT_FIELDS
)

# Import midwife contract template
from midwife_contract_template import (
    get_midwife_contract_template,
    get_midwife_contract_html,
    generate_midwife_contract_text,
    DEFAULT_MIDWIFE_CONTRACT_FIELDS
)

# Import client utility functions
from utils.client_utils import is_client_active, calculate_client_active_status

# Import modular route dependencies ONLY (routers imported after auth is defined)
from routes import dependencies as route_deps

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

# ============== WEBSOCKET CONNECTION MANAGER ==============
class ConnectionManager:
    """Manages WebSocket connections for real-time messaging"""
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id -> WebSocket
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: {user_id}")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected: {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending WebSocket message to {user_id}: {e}")
                self.disconnect(user_id)
    
    async def broadcast_to_users(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)

ws_manager = ConnectionManager()

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

# Subscription constants
SUBSCRIPTION_STATUS = ["none", "trial", "active", "expired", "cancelled"]
SUBSCRIPTION_PLANS = ["monthly", "annual"]
PRO_MONTHLY_PRICE = 29.00
PRO_ANNUAL_PRICE = 276.00
TRIAL_DURATION_DAYS = 30

# ============== PDF GENERATION HELPERS ==============

def generate_midwife_contract_pdf_bytes(contract: dict) -> bytes:
    """Generate PDF bytes for a midwife contract using the new agreement format"""
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
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8, alignment=4)  # justified
    intro_style = ParagraphStyle('Intro', parent=styles['Normal'], fontSize=10, leading=14, fontName='Helvetica-Oblique', spaceAfter=15)
    
    elements = []
    
    # Title
    elements.append(Paragraph("Midwifery Services Agreement", title_style))
    elements.append(Paragraph("<i>Powered by True Joy Birthing</i>", ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey, alignment=1)))
    elements.append(Spacer(1, 20))
    
    # Key Details Summary
    elements.append(Paragraph("Agreement Overview", heading_style))
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
    key_table = Table(key_data, colWidths=[2*inch, 4.5*inch])
    key_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f7f4')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(key_table)
    elements.append(Spacer(1, 20))
    
    # Contract Text - use the pre-generated contract text if available
    contract_text = contract.get("contract_text", "")
    if contract_text:
        elements.append(Paragraph("Full Agreement", heading_style))
        paragraphs = contract_text.split('\n\n')
        for para in paragraphs:
            if para.strip():
                # Skip the title as we already have it
                if para.strip() == "Midwifery Services Agreement":
                    continue
                elements.append(Paragraph(para.strip().replace('\n', '<br/>'), body_style))
    else:
        # Fallback: Generate sections from contract fields
        elements.append(Paragraph("Agreement Terms", heading_style))
        
        if contract.get("scope_description"):
            elements.append(Paragraph(f"<b>Services:</b> {contract['scope_description']}", body_style))
        if contract.get("on_call_window_description"):
            elements.append(Paragraph(f"<b>On-Call Period:</b> {contract['on_call_window_description']}", body_style))
        if contract.get("transfer_indications_description"):
            elements.append(Paragraph(f"<b>Transfer Indications:</b> {contract['transfer_indications_description']}", body_style))
        if contract.get("special_arrangements"):
            elements.append(Paragraph(f"<b>Special Arrangements:</b> {contract['special_arrangements']}", body_style))
    
    # Signatures
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Signatures", heading_style))
    sig_data = []
    
    # Midwife signature
    if contract.get("midwife_signature"):
        sig_data.append(["Midwife Signature:", contract["midwife_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["midwife_signature"].get("signed_at", "")[:10] if contract["midwife_signature"].get("signed_at") else ""])
    else:
        sig_data.append(["Midwife Signature:", "________________________________"])
        sig_data.append(["Date:", "________________________________"])
    
    # Client signature
    if contract.get("client_signature"):
        sig_data.append(["Client Signature:", contract["client_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["client_signature"].get("signed_at", "")[:10] if contract["client_signature"].get("signed_at") else ""])
    else:
        sig_data.append(["Client Signature:", "________________________________"])
        sig_data.append(["Date:", "________________________________"])
    
    # Partner signature (if applicable)
    if contract.get("partner_name") and contract.get("partner_name") != "N/A":
        if contract.get("partner_signature"):
            sig_data.append(["Partner Signature:", contract["partner_signature"].get("signer_name", "")])
            sig_data.append(["Date Signed:", contract["partner_signature"].get("signed_at", "")[:10] if contract["partner_signature"].get("signed_at") else ""])
        else:
            sig_data.append(["Partner Signature:", "________________________________"])
            sig_data.append(["Date:", "________________________________"])
    
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
    """Generate PDF bytes for a doula contract using the new agreement format"""
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
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=8, alignment=4)  # justified
    intro_style = ParagraphStyle('Intro', parent=styles['Normal'], fontSize=10, leading=14, fontName='Helvetica-Oblique', spaceAfter=15)
    
    elements = []
    
    # Title
    elements.append(Paragraph("Doula Service Agreement", title_style))
    elements.append(Paragraph("<i>Powered by True Joy Birthing</i>", ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey, alignment=1)))
    elements.append(Spacer(1, 20))
    
    # Key Details Summary
    elements.append(Paragraph("Agreement Overview", heading_style))
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
    key_table = Table(key_data, colWidths=[2*inch, 4.5*inch])
    key_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f0f7')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(key_table)
    elements.append(Spacer(1, 20))
    
    # Contract Text - use the pre-generated contract text if available
    contract_text = contract.get("contract_text", "")
    if contract_text:
        elements.append(Paragraph("Full Agreement", heading_style))
        paragraphs = contract_text.split('\n\n')
        for para in paragraphs:
            if para.strip():
                # Skip the title as we already have it
                if para.strip() == "Doula Service Agreement":
                    continue
                elements.append(Paragraph(para.strip().replace('\n', '<br/>'), body_style))
    else:
        # Fallback: Generate sections from contract fields
        elements.append(Paragraph("Agreement Terms", heading_style))
        
        if contract.get("prenatal_visit_description"):
            elements.append(Paragraph(f"<b>Prenatal Visits:</b> {contract['prenatal_visit_description']}", body_style))
        if contract.get("on_call_window_description"):
            elements.append(Paragraph(f"<b>On-Call Window:</b> {contract['on_call_window_description']}", body_style))
        if contract.get("postpartum_visit_description"):
            elements.append(Paragraph(f"<b>Postpartum Support:</b> {contract['postpartum_visit_description']}", body_style))
        if contract.get("special_arrangements"):
            elements.append(Paragraph(f"<b>Special Arrangements:</b> {contract['special_arrangements']}", body_style))
    
    # Signatures
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Signatures", heading_style))
    sig_data = []
    if contract.get("doula_signature"):
        sig_data.append(["Doula Signature:", contract["doula_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["doula_signature"].get("signed_at", "")[:10] if contract["doula_signature"].get("signed_at") else ""])
    else:
        sig_data.append(["Doula Signature:", "________________________________"])
        sig_data.append(["Date:", "________________________________"])
    
    if contract.get("client_signature"):
        sig_data.append(["Client Signature:", contract["client_signature"].get("signer_name", "")])
        sig_data.append(["Date Signed:", contract["client_signature"].get("signed_at", "")[:10] if contract["client_signature"].get("signed_at") else ""])
    else:
        sig_data.append(["Client Signature:", "________________________________"])
        sig_data.append(["Date:", "________________________________"])
    
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

# --- Subscription Models ---
class SubscriptionInfo(BaseModel):
    subscription_status: str = "none"  # none, trial, active, expired, cancelled
    plan_type: Optional[str] = None  # monthly, annual
    subscription_provider: Optional[str] = None  # APPLE, GOOGLE, MOCK, WEB
    trial_start_date: Optional[datetime] = None
    trial_end_date: Optional[datetime] = None
    subscription_start_date: Optional[datetime] = None
    subscription_end_date: Optional[datetime] = None
    store_transaction_id: Optional[str] = None  # For real IAP, store the transaction ID
    store_type: Optional[str] = None  # ios, android, mock (deprecated - use subscription_provider)
    original_transaction_id: Optional[str] = None  # For subscription management tracking
    auto_renewing: bool = True  # Whether subscription auto-renews

class StartTrialRequest(BaseModel):
    plan_type: str  # monthly or annual
    subscription_provider: Optional[str] = "MOCK"  # APPLE, GOOGLE, MOCK, WEB

class SubscriptionResponse(BaseModel):
    has_pro_access: bool
    subscription_status: str
    plan_type: Optional[str] = None
    subscription_provider: Optional[str] = None  # APPLE, GOOGLE, MOCK, WEB
    trial_end_date: Optional[str] = None
    subscription_end_date: Optional[str] = None
    days_remaining: Optional[int] = None
    is_trial: bool = False
    auto_renewing: bool = True

# Request model for validating store receipts (for future IAP implementation)
class ValidateReceiptRequest(BaseModel):
    receipt: str  # Base64 encoded receipt from store
    subscription_provider: str  # APPLE or GOOGLE
    product_id: str  # The purchased product ID

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
    picture: Optional[str] = None  # Profile photo URL
    video_intro_url: Optional[str] = None  # YouTube video URL
    more_about_me: Optional[str] = None  # Extended bio (max ~800 chars)

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
    # Parties & Basic Details
    client_name: str  # Full name(s) of client(s)
    doula_name: Optional[str] = None  # Will default to user's name
    estimated_due_date: str  # YYYY-MM-DD
    total_fee: float
    retainer_amount: float
    remaining_balance: Optional[float] = None  # Auto-calculated if not provided
    final_payment_due_description: str = "Day after birth"
    
    # Services & Scope
    prenatal_visit_description: Optional[str] = None
    on_call_window_description: Optional[str] = None
    on_call_response_description: Optional[str] = None
    backup_doula_preferences: Optional[str] = None
    postpartum_visit_description: Optional[str] = None
    
    # Boundaries & Communication
    speak_for_client_exception: Optional[str] = None
    
    # Payment & Refunds
    retainer_non_refundable_after_weeks: Optional[int] = 37
    cancellation_weeks_threshold: Optional[int] = 37
    final_payment_due_detail: Optional[str] = None
    cesarean_alternative_support_description: Optional[str] = None
    
    # Unavailability & Special Circumstances
    unreachable_timeframe_description: Optional[str] = None
    unreachable_remedy_description: Optional[str] = None
    precipitous_labor_definition: Optional[str] = None
    precipitous_labor_compensation_description: Optional[str] = None
    other_absence_policy: Optional[str] = None
    
    # Addendum
    special_arrangements: Optional[str] = None

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
    
    # Parties & Basic Details
    estimated_due_date: str
    total_fee: float
    retainer_amount: float
    remaining_balance: float
    final_payment_due_description: str
    agreement_date: str
    
    # Services & Scope
    prenatal_visit_description: Optional[str] = None
    on_call_window_description: Optional[str] = None
    on_call_response_description: Optional[str] = None
    backup_doula_preferences: Optional[str] = None
    postpartum_visit_description: Optional[str] = None
    
    # Boundaries & Communication
    speak_for_client_exception: Optional[str] = None
    
    # Payment & Refunds
    retainer_non_refundable_after_weeks: int = 37
    cancellation_weeks_threshold: int = 37
    final_payment_due_detail: Optional[str] = None
    cesarean_alternative_support_description: Optional[str] = None
    
    # Unavailability & Special Circumstances
    unreachable_timeframe_description: Optional[str] = None
    unreachable_remedy_description: Optional[str] = None
    precipitous_labor_definition: Optional[str] = None
    precipitous_labor_compensation_description: Optional[str] = None
    other_absence_policy: Optional[str] = None
    
    # Addendum
    special_arrangements: Optional[str] = None
    
    # Generated contract text
    contract_text: Optional[str] = None
    
    # Status and signatures
    status: str = "Draft"  # Draft, Sent, Signed
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
    # Parties & Basic Details
    midwife_practice_name: Optional[str] = None  # Will default to user's name
    client_name: str
    partner_name: Optional[str] = None
    estimated_due_date: str  # YYYY-MM-DD
    
    # Place of Birth & Scope
    planned_birth_location: str  # e.g., "home at...", "ABC Birth Center", "XYZ Hospital"
    scope_description: Optional[str] = None
    
    # Fees & Payment
    total_fee: float
    retainer_amount: float
    remaining_balance: Optional[float] = None  # Auto-calculated if not provided
    remaining_balance_due_description: Optional[str] = None  # e.g., "36 weeks' gestation"
    fee_coverage_description: Optional[str] = None
    refund_policy_description: Optional[str] = None
    
    # Transfer & Withdrawal
    transfer_indications_description: Optional[str] = None
    client_refusal_of_transfer_note: Optional[str] = None
    midwife_withdrawal_reasons: Optional[str] = None
    no_refund_scenarios_description: Optional[str] = None
    
    # On-Call & Backup
    on_call_window_description: Optional[str] = None  # e.g., "37 to 42 weeks"
    backup_midwife_policy: Optional[str] = None
    
    # Communication & Emergencies
    contact_instructions_routine: Optional[str] = None
    contact_instructions_urgent: Optional[str] = None
    emergency_instructions: Optional[str] = None
    
    # Special Arrangements
    special_arrangements: Optional[str] = None

class MidwifeContract(BaseModel):
    contract_id: str
    midwife_id: str
    midwife_practice_name: str
    client_id: str
    client_name: str
    partner_name: Optional[str] = None
    
    # Basic Details
    estimated_due_date: str
    agreement_date: str
    
    # Place of Birth & Scope
    planned_birth_location: str
    scope_description: Optional[str] = None
    
    # Fees & Payment
    total_fee: float
    retainer_amount: float
    remaining_balance: float
    remaining_balance_due_description: Optional[str] = None
    fee_coverage_description: Optional[str] = None
    refund_policy_description: Optional[str] = None
    
    # Transfer & Withdrawal
    transfer_indications_description: Optional[str] = None
    client_refusal_of_transfer_note: Optional[str] = None
    midwife_withdrawal_reasons: Optional[str] = None
    no_refund_scenarios_description: Optional[str] = None
    
    # On-Call & Backup
    on_call_window_description: Optional[str] = None
    backup_midwife_policy: Optional[str] = None
    
    # Communication & Emergencies
    contact_instructions_routine: Optional[str] = None
    contact_instructions_urgent: Optional[str] = None
    emergency_instructions: Optional[str] = None
    
    # Special Arrangements
    special_arrangements: Optional[str] = None
    
    # Generated contract text
    contract_text: Optional[str] = None
    
    # Status and signatures
    status: str = "Draft"  # Draft, Sent, Signed
    client_signature: Optional[dict] = None
    midwife_signature: Optional[dict] = None
    partner_signature: Optional[dict] = None
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Payment Instructions Template Models ---
class PaymentInstructionsTemplateCreate(BaseModel):
    label: str
    instructions_text: str
    is_default: bool = False

class PaymentInstructionsTemplate(BaseModel):
    template_id: str
    user_id: str
    label: str
    instructions_text: str
    is_default: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Contract Template Models ---
class ContractTemplateCreate(BaseModel):
    template_name: str
    template_type: str  # "doula" or "midwife"
    description: Optional[str] = None
    is_default: bool = False
    
    # Common fields that can be templated
    total_fee: Optional[float] = None
    retainer_amount: Optional[float] = None
    services_included: Optional[List[str]] = None
    terms_and_conditions: Optional[str] = None
    
    # Doula-specific template fields
    prenatal_visit_description: Optional[str] = None
    on_call_window_description: Optional[str] = None
    on_call_response_description: Optional[str] = None
    backup_doula_preferences: Optional[str] = None
    postpartum_visit_description: Optional[str] = None
    retainer_non_refundable_after_weeks: Optional[int] = None
    cancellation_weeks_threshold: Optional[int] = None
    cesarean_alternative_support_description: Optional[str] = None
    
    # Midwife-specific template fields
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

class ContractTemplate(BaseModel):
    template_id: str
    provider_id: str
    template_name: str
    template_type: str  # "doula" or "midwife"
    description: Optional[str] = None
    is_default: bool = False
    
    # All templatable fields stored as JSON
    template_data: Dict[str, Any] = {}
    
    created_at: datetime
    updated_at: Optional[datetime] = None

# --- Invoice Models (Enhanced) ---
class InvoiceCreate(BaseModel):
    client_id: str
    invoice_number: Optional[str] = None  # Auto-generated if not provided
    description: str  # Renamed from invoice_title
    amount: float
    issue_date: Optional[str] = None  # Defaults to today
    due_date: Optional[str] = None
    payment_instructions_text: Optional[str] = None  # Snapshot of payment instructions
    notes_for_client: Optional[str] = None

class InvoiceUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    payment_instructions_text: Optional[str] = None
    notes_for_client: Optional[str] = None
    status: Optional[str] = None

class Invoice(BaseModel):
    invoice_id: str
    provider_id: str  # Can be doula_id or midwife_id
    provider_type: str  # "DOULA" or "MIDWIFE"
    client_id: str
    client_name: str
    invoice_number: str
    description: str
    amount: float
    issue_date: str
    due_date: Optional[str] = None
    payment_instructions_text: Optional[str] = None
    notes_for_client: Optional[str] = None
    status: str = "Draft"  # Draft, Sent, Paid, Cancelled
    sent_at: Optional[datetime] = None
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
    credentials: Optional[Union[str, List[str]]] = None  # Accept string or list
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    years_in_practice: Optional[int] = None
    birth_settings_served: List[str] = []
    accepting_new_clients: bool = True
    bio: Optional[str] = None
    in_marketplace: bool = False

class MidwifeProfileUpdate(BaseModel):
    practice_name: Optional[str] = None
    credentials: Optional[Union[str, List[str]]] = None  # Accept string or list
    zip_code: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    years_in_practice: Optional[int] = None
    birth_settings_served: Optional[List[str]] = None
    accepting_new_clients: Optional[bool] = None
    accepting_clients: Optional[bool] = None  # Alias for accepting_new_clients
    bio: Optional[str] = None
    picture: Optional[str] = None
    video_intro_url: Optional[str] = None
    more_about_me: Optional[str] = None

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

# --- Prenatal Visit Assessment Models (Midwife) ---
class WellBeingEntry(BaseModel):
    score: Optional[int] = None  # 1-5 scale
    note: Optional[str] = None

class PrenatalVisitAssessmentCreate(BaseModel):
    client_id: str
    visit_date: str  # ISO date string
    # Vitals & Measurements
    urinalysis: Optional[str] = None  # Normal, Protein +, Glucose +, etc.
    urinalysis_note: Optional[str] = None
    blood_pressure: Optional[str] = None  # e.g., "120/70"
    fetal_heart_rate: Optional[int] = None  # bpm
    fundal_height: Optional[float] = None  # cm
    weight: Optional[float] = None
    weight_unit: Optional[str] = "lbs"  # lbs or kg
    # Well-being check-in (1-5 scale with optional notes)
    eating_score: Optional[int] = None
    eating_note: Optional[str] = None
    water_score: Optional[int] = None
    water_note: Optional[str] = None
    emotional_score: Optional[int] = None
    emotional_note: Optional[str] = None
    physical_score: Optional[int] = None
    physical_note: Optional[str] = None
    mental_score: Optional[int] = None
    mental_note: Optional[str] = None
    spiritual_score: Optional[int] = None
    spiritual_note: Optional[str] = None
    # General notes
    general_notes: Optional[str] = None

class PrenatalVisitAssessmentUpdate(BaseModel):
    visit_date: Optional[str] = None
    urinalysis: Optional[str] = None
    urinalysis_note: Optional[str] = None
    blood_pressure: Optional[str] = None
    fetal_heart_rate: Optional[int] = None
    fundal_height: Optional[float] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    eating_score: Optional[int] = None
    eating_note: Optional[str] = None
    water_score: Optional[int] = None
    water_note: Optional[str] = None
    emotional_score: Optional[int] = None
    emotional_note: Optional[str] = None
    physical_score: Optional[int] = None
    physical_note: Optional[str] = None
    mental_score: Optional[int] = None
    mental_note: Optional[str] = None
    spiritual_score: Optional[int] = None
    spiritual_note: Optional[str] = None
    general_notes: Optional[str] = None


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
    client_id: Optional[str] = None  # Optional: links message to a specific client relationship

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
    client_id: Optional[str] = None  # Links message to a specific client context
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
        # Case-insensitive role check
        user_role_upper = user.role.upper() if user.role else ""
        required_roles_upper = [r.upper() for r in required_roles]
        if user_role_upper not in required_roles_upper:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ============== INITIALIZE MODULAR ROUTE DEPENDENCIES ==============
# This initializes shared state for modular routers
# MUST be done after get_current_user and check_role are defined
route_deps.init_dependencies(
    database=db,
    password_context=pwd_context,
    secret_key=SECRET_KEY,
    algorithm=ALGORITHM,
    expire_days=ACCESS_TOKEN_EXPIRE_DAYS,
    notification_func=create_notification,
    email_func=None,  # Will be set when email routes are modularized
    websocket_manager=ws_manager,
    sender_email=SENDER_EMAIL,
    get_current_user_func=get_current_user,
    check_role_func=check_role
)

# Import and register modular routers AFTER dependencies are initialized
from routes import admin as admin_routes
from routes import marketplace as marketplace_routes
from routes import notifications as notifications_routes
from routes import messages as messages_routes
from routes import auth as auth_routes
from routes import subscription as subscription_routes
from routes import mom as mom_routes

# Include modular routers in the api_router
api_router.include_router(admin_routes.router)
api_router.include_router(marketplace_routes.router)
api_router.include_router(notifications_routes.router)
api_router.include_router(messages_routes.router)
api_router.include_router(auth_routes.router)
api_router.include_router(subscription_routes.router)
api_router.include_router(mom_routes.router)

# ============== AUTH ROUTES ==============
# MIGRATED TO: routes/auth.py
# Routes: /auth/register, /auth/login, /auth/google-session, /auth/me, /auth/logout, /auth/set-role, /auth/update-profile

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

# ============== SUBSCRIPTION ROUTES ==============

def is_pro_role(role: str) -> bool:
    """Check if the role is a PRO role (DOULA or MIDWIFE)"""
    return role in ["DOULA", "MIDWIFE"]

def calculate_subscription_status(subscription: dict) -> dict:
    """Calculate current subscription status and access"""
    now = datetime.now(timezone.utc)
    
    if not subscription:
        return {
            "has_pro_access": False,
            "subscription_status": "none",
            "plan_type": None,
            "subscription_provider": None,
            "trial_end_date": None,
            "subscription_end_date": None,
            "days_remaining": None,
            "is_trial": False,
            "auto_renewing": False
        }
    
    status = subscription.get("subscription_status", "none")
    trial_end = subscription.get("trial_end_date")
    sub_end = subscription.get("subscription_end_date")
    provider = subscription.get("subscription_provider", subscription.get("store_type", "MOCK"))
    auto_renewing = subscription.get("auto_renewing", True)
    
    # Normalize provider to uppercase
    if provider and provider.lower() in ["ios", "apple"]:
        provider = "APPLE"
    elif provider and provider.lower() in ["android", "google"]:
        provider = "GOOGLE"
    elif provider:
        provider = provider.upper()
    
    # Convert trial_end to timezone-aware datetime
    if trial_end:
        if isinstance(trial_end, str):
            trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
        elif isinstance(trial_end, datetime) and trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
    
    # Convert sub_end to timezone-aware datetime  
    if sub_end:
        if isinstance(sub_end, str):
            sub_end = datetime.fromisoformat(sub_end.replace('Z', '+00:00'))
        elif isinstance(sub_end, datetime) and sub_end.tzinfo is None:
            sub_end = sub_end.replace(tzinfo=timezone.utc)
    
    # Check trial status
    if status == "trial" and trial_end:
        if now < trial_end:
            days_remaining = (trial_end - now).days
            return {
                "has_pro_access": True,
                "subscription_status": "trial",
                "plan_type": subscription.get("plan_type"),
                "subscription_provider": provider,
                "trial_end_date": trial_end.isoformat(),
                "subscription_end_date": None,
                "days_remaining": days_remaining,
                "is_trial": True,
                "auto_renewing": auto_renewing
            }
        else:
            # Trial expired
            return {
                "has_pro_access": False,
                "subscription_status": "expired",
                "plan_type": subscription.get("plan_type"),
                "subscription_provider": provider,
                "trial_end_date": trial_end.isoformat(),
                "subscription_end_date": None,
                "days_remaining": 0,
                "is_trial": False,
                "auto_renewing": False
            }
    
    # Check active subscription
    if status == "active":
        if sub_end:
            if now < sub_end:
                days_remaining = (sub_end - now).days
                return {
                    "has_pro_access": True,
                    "subscription_status": "active",
                    "plan_type": subscription.get("plan_type"),
                    "subscription_provider": provider,
                    "trial_end_date": None,
                    "subscription_end_date": sub_end.isoformat(),
                    "days_remaining": days_remaining,
                    "is_trial": False,
                    "auto_renewing": auto_renewing
                }
        else:
            # No end date means perpetual (for mock)
            return {
                "has_pro_access": True,
                "subscription_status": "active",
                "plan_type": subscription.get("plan_type"),
                "subscription_provider": provider,
                "trial_end_date": None,
                "subscription_end_date": None,
                "days_remaining": None,
                "is_trial": False,
                "auto_renewing": auto_renewing
            }
    
    return {
        "has_pro_access": False,
        "subscription_status": status,
        "plan_type": subscription.get("plan_type"),
        "subscription_provider": provider,
        "trial_end_date": trial_end.isoformat() if trial_end else None,
        "subscription_end_date": sub_end.isoformat() if sub_end else None,
        "days_remaining": 0,
        "is_trial": False,
        "auto_renewing": False
    }

# ============== SUBSCRIPTION ROUTES ==============
# MIGRATED TO: routes/subscription.py
# Routes: /subscription/status, /subscription/pricing, /subscription/start-trial, 
#         /subscription/activate, /subscription/cancel, /subscription/validate-receipt

# Helper function to check Pro access (used by other routes)
async def check_pro_access(user: User) -> bool:
    """Check if a PRO user has active subscription or trial"""
    if user.role == "MOM":
        return True  # Moms don't need Pro access
    
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    status = calculate_subscription_status(subscription)
    return status["has_pro_access"]

# ============== PRO FEEDBACK ROUTES ==============

class ProFeedbackRequest(BaseModel):
    feedback_text: str
    feedback_topic: Optional[str] = None  # "Bug / something broken", "Feature request", "General comment"
    platform: Optional[str] = None  # iOS, Android, Web
    app_version: Optional[str] = None

@api_router.post("/pro/feedback")
async def submit_pro_feedback(feedback: ProFeedbackRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Submit feedback from Pro users - sends email to shelbi@truejoybirthing.com"""
    
    # Check if user has Pro access
    has_access = await check_pro_access(user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Pro subscription required to submit feedback")
    
    # Validate feedback length
    if not feedback.feedback_text or len(feedback.feedback_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Feedback text is required")
    
    if len(feedback.feedback_text) > 800:
        raise HTTPException(status_code=400, detail="Please keep feedback under 800 characters so we can respond quickly.")
    
    now = datetime.now(timezone.utc)
    
    # Format the topic for subject line
    topic = feedback.feedback_topic or "General comment"
    role_label = "Doula" if user.role == "DOULA" else "Midwife"
    
    # Build email subject
    subject = f"Pro Feedback from {user.full_name} – {topic}"
    
    # Build email body
    platform_info = feedback.platform or "Unknown"
    version_info = feedback.app_version or "Unknown"
    timestamp = now.strftime("%Y-%m-%d %H:%M %Z")
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Pro User Feedback</h2>
        <hr style="border: 1px solid #e5e7eb;">
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;"><strong>From:</strong></td>
                <td style="padding: 8px 0;">{user.full_name} ({role_label})</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
                <td style="padding: 8px 0;">{user.email}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Platform:</strong></td>
                <td style="padding: 8px 0;">{platform_info} – v{version_info}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Time:</strong></td>
                <td style="padding: 8px 0;">{timestamp}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Topic:</strong></td>
                <td style="padding: 8px 0;">{topic}</td>
            </tr>
        </table>
        
        <h3 style="color: #1f2937; margin-top: 24px;">Message:</h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-wrap;">
{feedback.feedback_text}
        </div>
        
        <hr style="border: 1px solid #e5e7eb; margin-top: 24px;">
        <p style="color: #9ca3af; font-size: 12px;">
            This feedback was submitted through the True Joy Birthing app.
        </p>
    </div>
    """
    
    # Send email to Shelbi
    try:
        if resend.api_key:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": "shelbi@truejoybirthing.com",
                "subject": subject,
                "html": email_body,
                "reply_to": user.email
            })
        else:
            logging.warning("Resend API key not configured - feedback email not sent")
    except Exception as e:
        logging.error(f"Failed to send feedback email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send feedback. Please try again.")
    
    # Store feedback in database for records
    feedback_record = {
        "feedback_id": f"feedback_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "user_name": user.full_name,
        "user_email": user.email,
        "user_role": user.role,
        "feedback_text": feedback.feedback_text,
        "feedback_topic": topic,
        "platform": platform_info,
        "app_version": version_info,
        "created_at": now
    }
    await db.pro_feedback.insert_one(feedback_record)
    
    return {"message": "Thank you. Your feedback was sent to the True Joy Birthing team."}

# ============== MOM ROUTES ==============
# MIGRATED TO: routes/mom.py
# Routes: /mom/onboarding, /mom/profile, /mom/midwife-visits, /mom/team, /mom/team-providers, 
#         /mom/invoices, /mom/invoices/{id}, /mom/appointments

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
    
    # Sync Due Date and Birth Setting from birth plan to mom profile
    if section_id == "about_me" and data:
        profile_updates = {}
        if data.get("due_date"):
            profile_updates["due_date"] = data["due_date"]
        if data.get("planned_birth_location"):
            profile_updates["planned_birth_setting"] = data["planned_birth_location"]
        if profile_updates:
            await db.mom_profiles.update_one(
                {"user_id": user.user_id},
                {"$set": profile_updates},
                upsert=True
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

@api_router.get("/provider/client/{mom_id}/birth-plan/pdf")
async def provider_export_birth_plan_pdf(mom_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Generate and download PDF version of a client's birth plan for providers"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    # Verify provider has access to this mom's birth plan
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="You don't have access to this client's birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": mom_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": mom_id}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#9F83B6'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#9F83B6'), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6)
    
    elements = []
    
    # Title
    user_name = user_doc.get("full_name", "Client") if user_doc else "Client"
    elements.append(Paragraph(f"{user_name}'s Birth Plan", title_style))
    elements.append(Spacer(1, 10))
    
    # Basic info
    if mom_profile:
        info_data = []
        if mom_profile.get("due_date"):
            info_data.append(["Expected Due Date:", mom_profile["due_date"]])
        if mom_profile.get("planned_birth_setting"):
            info_data.append(["Planned Birth Setting:", mom_profile["planned_birth_setting"]])
        
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
        
        for key, value in data.items():
            if value:
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
    
    # Enrich with provider pictures
    for req in requests:
        provider = await db.users.find_one(
            {"user_id": req.get("provider_id")}, 
            {"_id": 0, "picture": 1}
        )
        if provider:
            req["provider_picture"] = provider.get("picture")
    
    return {"requests": requests}

@api_router.delete("/birth-plan/share/{request_id}")
async def revoke_share(request_id: str, user: User = Depends(check_role(["MOM"]))):
    """Revoke a share request"""
    # First, fetch the request to get provider info BEFORE deleting
    request_doc = await db.share_requests.find_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    if not request_doc:
        raise HTTPException(status_code=404, detail="Share request not found")
    
    provider_id = request_doc.get("provider_id")
    
    # Delete the share request
    await db.share_requests.delete_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    # Also delete any provider notes for this birth plan from this provider
    if provider_id:
        await db.provider_notes.delete_many({
            "birth_plan_id": user.user_id,  # Using mom's user_id as birth plan identifier
            "provider_id": provider_id
        })
        
        # If this provider was connected to mom's profile, remove the connection
        if request_doc.get("provider_role") == "DOULA":
            await db.mom_profiles.update_one(
                {"user_id": user.user_id, "connected_doula_id": provider_id},
                {"$unset": {"connected_doula_id": ""}}
            )
        elif request_doc.get("provider_role") == "MIDWIFE":
            await db.mom_profiles.update_one(
                {"user_id": user.user_id, "connected_midwife_id": provider_id},
                {"$unset": {"connected_midwife_id": ""}}
            )
    
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
    
    # If accepted, link the mom to the provider's client list
    if action == "accept":
        share_request = await db.share_requests.find_one({"request_id": request_id}, {"_id": 0})
        if share_request:
            mom_user_id = share_request["mom_user_id"]
            mom_name = share_request.get("mom_name", "Client")
            
            # Get mom's profile for additional info
            mom_profile = await db.mom_profiles.find_one({"user_id": mom_user_id}, {"_id": 0})
            mom_user = await db.users.find_one({"user_id": mom_user_id}, {"_id": 0, "email": 1})
            
            # Update mom's profile to show connected provider
            if user.role == "DOULA":
                await db.mom_profiles.update_one(
                    {"user_id": mom_user_id},
                    {"$set": {"connected_doula_id": user.user_id}}
                )
                # Create/update client entry in doula's clients list
                existing_client = await db.clients.find_one({
                    "provider_id": user.user_id, 
                    "linked_mom_id": mom_user_id
                })
                if not existing_client:
                    await db.clients.insert_one({
                        "client_id": "client_" + str(uuid.uuid4().hex)[:12],
                        "provider_id": user.user_id,
                        "provider_type": "DOULA",
                        "name": mom_name,
                        "email": mom_user.get("email") if mom_user else None,
                        "phone": "",
                        "linked_mom_id": mom_user_id,
                        "status": "Active",
                        "edd": mom_profile.get("due_date") if mom_profile else None,
                        "planned_birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                        "notes": "",
                        "created_at": now,
                        "updated_at": now
                    })
            elif user.role == "MIDWIFE":
                await db.mom_profiles.update_one(
                    {"user_id": mom_user_id},
                    {"$set": {"connected_midwife_id": user.user_id}}
                )
                # Create/update client entry in midwife's clients list
                existing_client = await db.clients.find_one({
                    "provider_id": user.user_id, 
                    "linked_mom_id": mom_user_id
                })
                if not existing_client:
                    await db.clients.insert_one({
                        "client_id": "client_" + str(uuid.uuid4().hex)[:12],
                        "provider_id": user.user_id,
                        "provider_type": "MIDWIFE",
                        "name": mom_name,
                        "email": mom_user.get("email") if mom_user else None,
                        "phone": "",
                        "linked_mom_id": mom_user_id,
                        "status": "Prenatal",
                        "edd": mom_profile.get("due_date") if mom_profile else None,
                        "planned_birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                        "notes": "",
                        "created_at": now,
                        "updated_at": now
                    })
    
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

@api_router.get("/provider/client/{mom_user_id}/birth-plan")
async def get_client_birth_plan(
    mom_user_id: str,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Get a client's birth plan (simplified view for client list)"""
    # Verify the provider has access via share request or client relationship
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    # Also check if they have a client with this linked_mom_id
    client = await db.clients.find_one({
        "provider_id": user.user_id,
        "linked_mom_id": mom_user_id
    })
    
    if not share_request and not client:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_user_id}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    return plan

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

@api_router.put("/provider/birth-plan-notes/{note_id}")
async def update_birth_plan_note(
    note_id: str,
    request: Request,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Update a provider note on a birth plan section"""
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

@api_router.delete("/provider/birth-plan-notes/{note_id}")
async def delete_birth_plan_note(
    note_id: str,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Delete a provider note from a birth plan section"""
    result = await db.provider_notes.delete_one({
        "note_id": note_id,
        "provider_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}

# ============== NOTIFICATION ROUTES ==============
# MIGRATED TO: routes/notifications.py
# Routes: /notifications, /notifications/{notification_id}/read, /notifications/read-all

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
    # Count clients by status - use correct field names
    total_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "DOULA"})
    active_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "DOULA", "status": "Active"})
    
    # Also count clients with linked_mom_id as active (connected Moms)
    connected_clients = await db.clients.count_documents({"provider_id": user.user_id, "provider_type": "DOULA", "linked_mom_id": {"$ne": None}})
    
    # Use the higher of the two counts (connected or Active status)
    active_clients = max(active_clients, connected_clients)
    
    # Count pending invoices
    pending_invoices = await db.invoices.count_documents({"provider_id": user.user_id, "status": {"$in": ["Sent", "Overdue"]}})
    
    # Count contracts pending signature
    contracts_pending = await db.contracts.count_documents({"provider_id": user.user_id, "status": "Sent"})
    
    # Count upcoming appointments (accepted, future dates)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming_appointments = await db.appointments.count_documents({
        "provider_id": user.user_id,
        "status": "accepted",
        "appointment_date": {"$gte": today}
    })
    
    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "pending_invoices": pending_invoices,
        "contracts_pending_signature": contracts_pending,
        "upcoming_appointments": upcoming_appointments
    }

# ============== DOULA CONTRACT DEFAULTS ==============

@api_router.get("/doula/contract-defaults")
async def get_doula_contract_defaults(user: User = Depends(check_role(["DOULA"]))):
    """Get doula's saved contract default values"""
    defaults = await db.contract_defaults.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    return defaults or {}

@api_router.put("/doula/contract-defaults")
async def save_doula_contract_defaults(
    defaults: dict,
    user: User = Depends(check_role(["DOULA"]))
):
    """Save doula's contract default values for future contracts"""
    now = datetime.now(timezone.utc)
    
    await db.contract_defaults.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                **defaults,
                "user_id": user.user_id,
                "updated_at": now
            },
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )
    return {"message": "Contract defaults saved"}

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
    
    # Auto-link to mom user if email matches
    linked_mom_id = None
    if client_data.email:
        existing_mom = await db.users.find_one(
            {"email": client_data.email, "role": "MOM"},
            {"_id": 0, "user_id": 1}
        )
        if existing_mom:
            linked_mom_id = existing_mom["user_id"]
    
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
        "linked_mom_id": linked_mom_id,
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
    """Create a new Doula Service Agreement"""
    # Get client info
    client = await db.clients.find_one({"client_id": contract_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Calculate remaining amount if not provided
    remaining = contract_data.remaining_balance
    if remaining is None:
        remaining = contract_data.total_fee - contract_data.retainer_amount
    
    # Use doula name from input or default to user's full name
    doula_name = contract_data.doula_name or user.full_name
    
    # Build contract data dictionary for text generation
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
    
    # Generate the contract text
    contract_text = generate_contract_text(contract_fields)
    
    contract = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "doula_id": user.user_id,
        "doula_name": doula_name,
        "client_id": contract_data.client_id,
        "client_name": contract_data.client_name,
        # Parties & Basic Details
        "estimated_due_date": contract_data.estimated_due_date,
        "total_fee": contract_data.total_fee,
        "retainer_amount": contract_data.retainer_amount,
        "remaining_balance": remaining,
        "final_payment_due_description": contract_data.final_payment_due_description,
        "agreement_date": now.strftime("%Y-%m-%d"),
        # Services & Scope
        "prenatal_visit_description": contract_data.prenatal_visit_description,
        "on_call_window_description": contract_data.on_call_window_description,
        "on_call_response_description": contract_data.on_call_response_description,
        "backup_doula_preferences": contract_data.backup_doula_preferences,
        "postpartum_visit_description": contract_data.postpartum_visit_description,
        # Boundaries & Communication
        "speak_for_client_exception": contract_data.speak_for_client_exception,
        # Payment & Refunds
        "retainer_non_refundable_after_weeks": contract_data.retainer_non_refundable_after_weeks,
        "cancellation_weeks_threshold": contract_data.cancellation_weeks_threshold,
        "final_payment_due_detail": contract_data.final_payment_due_detail,
        "cesarean_alternative_support_description": contract_data.cesarean_alternative_support_description,
        # Unavailability & Special Circumstances
        "unreachable_timeframe_description": contract_data.unreachable_timeframe_description,
        "unreachable_remedy_description": contract_data.unreachable_remedy_description,
        "precipitous_labor_definition": contract_data.precipitous_labor_definition,
        "precipitous_labor_compensation_description": contract_data.precipitous_labor_compensation_description,
        "other_absence_policy": contract_data.other_absence_policy,
        # Addendum
        "special_arrangements": contract_data.special_arrangements,
        # Generated contract text
        "contract_text": contract_text,
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
    if "total_fee" in update_data or "retainer_amount" in update_data:
        contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
        if contract:
            total = update_data.get("total_fee", contract.get("total_fee", 0))
            retainer = update_data.get("retainer_amount", contract.get("retainer_amount", 0))
            update_data["remaining_balance"] = total - retainer
    
    # Regenerate contract text if any content fields changed
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if contract:
        # Merge existing contract with updates
        merged = {**contract, **update_data}
        # Regenerate contract text
        contract_text = generate_contract_text(merged)
        update_data["contract_text"] = contract_text
    
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
                signing_url = f"https://provider-consolidate.preview.emergentagent.com/contract/{contract_id}"
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

@api_router.delete("/doula/contracts/{contract_id}")
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

@api_router.post("/doula/contracts/{contract_id}/duplicate")
async def duplicate_doula_contract(contract_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Duplicate an existing doula contract (creates a new draft with same settings)"""
    # Fetch the original contract
    original = await db.contracts.find_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"_id": 0}
    )
    
    if not original:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    now = datetime.now(timezone.utc)
    new_contract_id = f"contract_{uuid.uuid4().hex[:12]}"
    
    # Copy fields but reset status, signatures, and dates
    new_contract = {
        "contract_id": new_contract_id,
        "doula_id": user.user_id,
        "doula_name": original.get("doula_name", user.full_name),
        "client_id": None,  # Must select new client
        "client_name": f"[Copy of {original.get('client_name', 'Contract')}]",
        "estimated_due_date": original.get("estimated_due_date", ""),
        "total_fee": original.get("total_fee", 0),
        "retainer_amount": original.get("retainer_amount", 0),
        "remaining_balance": original.get("remaining_balance", 0),
        "final_payment_due_description": original.get("final_payment_due_description", "Day after birth"),
        "agreement_date": now.strftime("%Y-%m-%d"),
        # Services & Scope
        "prenatal_visit_description": original.get("prenatal_visit_description"),
        "on_call_window_description": original.get("on_call_window_description"),
        "on_call_response_description": original.get("on_call_response_description"),
        "backup_doula_preferences": original.get("backup_doula_preferences"),
        "postpartum_visit_description": original.get("postpartum_visit_description"),
        # Boundaries & Communication
        "speak_for_client_exception": original.get("speak_for_client_exception"),
        # Payment & Refunds
        "retainer_non_refundable_after_weeks": original.get("retainer_non_refundable_after_weeks", 37),
        "cancellation_weeks_threshold": original.get("cancellation_weeks_threshold", 37),
        "final_payment_due_detail": original.get("final_payment_due_detail"),
        "cesarean_alternative_support_description": original.get("cesarean_alternative_support_description"),
        # Unavailability & Special Circumstances
        "unreachable_timeframe_description": original.get("unreachable_timeframe_description"),
        "unreachable_remedy_description": original.get("unreachable_remedy_description"),
        "precipitous_labor_definition": original.get("precipitous_labor_definition"),
        "precipitous_labor_compensation_description": original.get("precipitous_labor_compensation_description"),
        "other_absence_policy": original.get("other_absence_policy"),
        # Addendum
        "special_arrangements": original.get("special_arrangements"),
        # Status and timestamps
        "contract_text": None,  # Will be regenerated when client is selected
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
    # Note: Midwife clients use provider_id and provider_type fields
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
        remaining = contract_data.total_fee - contract_data.retainer_amount
    
    # Use practice name from input or default to user's full name
    midwife_practice_name = contract_data.midwife_practice_name or user.full_name
    
    # Build contract data dictionary for text generation
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
    
    # Generate the contract text
    contract_text = generate_midwife_contract_text(contract_fields)
    
    contract = {
        "contract_id": f"mw_contract_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "midwife_practice_name": midwife_practice_name,
        "client_id": contract_data.client_id,
        "client_name": contract_data.client_name,
        "partner_name": contract_data.partner_name,
        # Basic Details
        "estimated_due_date": contract_data.estimated_due_date,
        "agreement_date": now.strftime("%Y-%m-%d"),
        # Place of Birth & Scope
        "planned_birth_location": contract_data.planned_birth_location,
        "scope_description": contract_data.scope_description,
        # Fees & Payment
        "total_fee": contract_data.total_fee,
        "retainer_amount": contract_data.retainer_amount,
        "remaining_balance": remaining,
        "remaining_balance_due_description": contract_data.remaining_balance_due_description,
        "fee_coverage_description": contract_data.fee_coverage_description,
        "refund_policy_description": contract_data.refund_policy_description,
        # Transfer & Withdrawal
        "transfer_indications_description": contract_data.transfer_indications_description,
        "client_refusal_of_transfer_note": contract_data.client_refusal_of_transfer_note,
        "midwife_withdrawal_reasons": contract_data.midwife_withdrawal_reasons,
        "no_refund_scenarios_description": contract_data.no_refund_scenarios_description,
        # On-Call & Backup
        "on_call_window_description": contract_data.on_call_window_description,
        "backup_midwife_policy": contract_data.backup_midwife_policy,
        # Communication & Emergencies
        "contact_instructions_routine": contract_data.contact_instructions_routine,
        "contact_instructions_urgent": contract_data.contact_instructions_urgent,
        "emergency_instructions": contract_data.emergency_instructions,
        # Special Arrangements
        "special_arrangements": contract_data.special_arrangements,
        # Generated contract text
        "contract_text": contract_text,
        # Status
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

@api_router.delete("/midwife/contracts/{contract_id}")
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

@api_router.post("/midwife/contracts/{contract_id}/duplicate")
async def duplicate_midwife_contract(contract_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Duplicate an existing midwife contract (creates a new draft with same settings)"""
    # Fetch the original contract
    original = await db.midwife_contracts.find_one(
        {"contract_id": contract_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    
    if not original:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    now = datetime.now(timezone.utc)
    new_contract_id = f"mw_contract_{uuid.uuid4().hex[:12]}"
    
    # Copy fields but reset status, signatures, and dates
    new_contract = {
        "contract_id": new_contract_id,
        "midwife_id": user.user_id,
        "midwife_practice_name": original.get("midwife_practice_name", user.full_name),
        "client_id": None,  # Must select new client
        "client_name": f"[Copy of {original.get('client_name', 'Contract')}]",
        "partner_name": original.get("partner_name"),
        "estimated_due_date": original.get("estimated_due_date", ""),
        "agreement_date": now.strftime("%Y-%m-%d"),
        # Place of Birth & Scope
        "planned_birth_location": original.get("planned_birth_location", ""),
        "scope_description": original.get("scope_description"),
        # Fees & Payment
        "total_fee": original.get("total_fee", 0),
        "retainer_amount": original.get("retainer_amount", 0),
        "remaining_balance": original.get("remaining_balance", 0),
        "remaining_balance_due_description": original.get("remaining_balance_due_description"),
        "fee_coverage_description": original.get("fee_coverage_description"),
        "refund_policy_description": original.get("refund_policy_description"),
        # Transfer & Withdrawal
        "transfer_indications_description": original.get("transfer_indications_description"),
        "client_refusal_of_transfer_note": original.get("client_refusal_of_transfer_note"),
        "midwife_withdrawal_reasons": original.get("midwife_withdrawal_reasons"),
        "no_refund_scenarios_description": original.get("no_refund_scenarios_description"),
        # On-Call & Backup
        "on_call_window_description": original.get("on_call_window_description"),
        "backup_midwife_policy": original.get("backup_midwife_policy"),
        # Communication & Emergencies
        "contact_instructions_routine": original.get("contact_instructions_routine"),
        "contact_instructions_urgent": original.get("contact_instructions_urgent"),
        "emergency_instructions": original.get("emergency_instructions"),
        # Special Arrangements
        "special_arrangements": original.get("special_arrangements"),
        # Status and timestamps
        "contract_text": None,  # Will be regenerated when client is selected
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
                signing_url = f"https://provider-consolidate.preview.emergentagent.com/sign-midwife-contract?contractId={contract_id}"
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

# ============== CONTRACT TEMPLATE ROUTES ==============

@api_router.get("/contract-templates")
async def get_contract_templates(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all contract templates for the current user"""
    template_type = "doula" if user.role == "DOULA" else "midwife"
    
    templates = await db.contract_templates.find(
        {"provider_id": user.user_id, "template_type": template_type},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return templates

@api_router.post("/contract-templates")
async def create_contract_template(template_data: ContractTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create a new contract template"""
    now = datetime.now(timezone.utc)
    expected_type = "doula" if user.role == "DOULA" else "midwife"
    
    # Validate template type matches user role
    if template_data.template_type != expected_type:
        raise HTTPException(status_code=400, detail=f"Template type must be '{expected_type}' for your role")
    
    # If setting as default, unset any existing default
    if template_data.is_default:
        await db.contract_templates.update_many(
            {"provider_id": user.user_id, "template_type": expected_type, "is_default": True},
            {"$set": {"is_default": False, "updated_at": now}}
        )
    
    # Build template_data dict with all provided fields
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

@api_router.get("/contract-templates/{template_id}")
async def get_contract_template(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get a specific contract template"""
    template = await db.contract_templates.find_one(
        {"template_id": template_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template

@api_router.put("/contract-templates/{template_id}")
async def update_contract_template(template_id: str, template_data: ContractTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a contract template"""
    now = datetime.now(timezone.utc)
    expected_type = "doula" if user.role == "DOULA" else "midwife"
    
    # Check template exists and belongs to user
    existing = await db.contract_templates.find_one(
        {"template_id": template_id, "provider_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # If setting as default, unset any existing default
    if template_data.is_default:
        await db.contract_templates.update_many(
            {"provider_id": user.user_id, "template_type": expected_type, "is_default": True, "template_id": {"$ne": template_id}},
            {"$set": {"is_default": False, "updated_at": now}}
        )
    
    # Build template_data dict
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

@api_router.delete("/contract-templates/{template_id}")
async def delete_contract_template(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a contract template"""
    result = await db.contract_templates.delete_one(
        {"template_id": template_id, "provider_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}

@api_router.post("/contract-templates/{template_id}/set-default")
async def set_default_template(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Set a template as the default"""
    now = datetime.now(timezone.utc)
    expected_type = "doula" if user.role == "DOULA" else "midwife"
    
    # Check template exists
    template = await db.contract_templates.find_one(
        {"template_id": template_id, "provider_id": user.user_id}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Unset all other defaults
    await db.contract_templates.update_many(
        {"provider_id": user.user_id, "template_type": expected_type},
        {"$set": {"is_default": False, "updated_at": now}}
    )
    
    # Set this one as default
    await db.contract_templates.update_one(
        {"template_id": template_id},
        {"$set": {"is_default": True, "updated_at": now}}
    )
    
    return {"message": "Template set as default"}

# ============== INVOICE ROUTES ==============

# Helper to generate invoice number
async def generate_invoice_number(user_id: str) -> str:
    """Generate a unique invoice number like TJ-2026-001"""
    year = datetime.now().year
    count = await db.invoices.count_documents({"provider_id": user_id})
    return f"TJ-{year}-{str(count + 1).zfill(3)}"

# ============== PAYMENT INSTRUCTIONS TEMPLATE ROUTES ==============

@api_router.get("/payment-instructions")
async def get_payment_instructions(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all payment instructions templates for the user"""
    templates = await db.payment_instructions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return templates

@api_router.post("/payment-instructions")
async def create_payment_instructions(data: PaymentInstructionsTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create a new payment instructions template"""
    now = datetime.now(timezone.utc)
    
    # If setting as default, unset others
    if data.is_default:
        await db.payment_instructions.update_many(
            {"user_id": user.user_id},
            {"$set": {"is_default": False}}
        )
    
    template = {
        "template_id": f"pi_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "label": data.label,
        "instructions_text": data.instructions_text,
        "is_default": data.is_default,
        "created_at": now,
        "updated_at": now
    }
    
    await db.payment_instructions.insert_one(template)
    template.pop('_id', None)
    return template

@api_router.put("/payment-instructions/{template_id}")
async def update_payment_instructions(template_id: str, data: PaymentInstructionsTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a payment instructions template"""
    now = datetime.now(timezone.utc)
    
    # If setting as default, unset others
    if data.is_default:
        await db.payment_instructions.update_many(
            {"user_id": user.user_id, "template_id": {"$ne": template_id}},
            {"$set": {"is_default": False}}
        )
    
    result = await db.payment_instructions.update_one(
        {"template_id": template_id, "user_id": user.user_id},
        {"$set": {
            "label": data.label,
            "instructions_text": data.instructions_text,
            "is_default": data.is_default,
            "updated_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated"}

@api_router.delete("/payment-instructions/{template_id}")
async def delete_payment_instructions(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a payment instructions template"""
    result = await db.payment_instructions.delete_one(
        {"template_id": template_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}

# ============== DOULA INVOICE ROUTES ==============

@api_router.get("/doula/invoices")
async def get_doula_invoices(user: User = Depends(check_role(["DOULA"])), status: Optional[str] = None):
    """Get all invoices, optionally filtered by status"""
    query = {"provider_id": user.user_id, "provider_type": "DOULA"}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices

@api_router.post("/doula/invoices")
async def create_doula_invoice(invoice_data: InvoiceCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new invoice"""
    # Get client name
    client = await db.clients.find_one({"client_id": invoice_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Generate invoice number if not provided
    invoice_number = invoice_data.invoice_number or await generate_invoice_number(user.user_id)
    
    # Get default payment instructions if not provided
    payment_text = invoice_data.payment_instructions_text
    if not payment_text:
        default_template = await db.payment_instructions.find_one(
            {"user_id": user.user_id, "is_default": True},
            {"_id": 0}
        )
        if default_template:
            payment_text = default_template.get("instructions_text")
    
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "DOULA",
        "client_id": invoice_data.client_id,
        "client_name": client["name"],
        "invoice_number": invoice_number,
        "description": invoice_data.description,
        "amount": invoice_data.amount,
        "issue_date": invoice_data.issue_date or now.strftime("%Y-%m-%d"),
        "due_date": invoice_data.due_date,
        "payment_instructions_text": payment_text,
        "notes_for_client": invoice_data.notes_for_client,
        "status": "Draft",
        "sent_at": None,
        "paid_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.invoices.insert_one(invoice)
    invoice.pop('_id', None)
    return invoice

@api_router.get("/doula/invoices/{invoice_id}")
async def get_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.put("/doula/invoices/{invoice_id}")
async def update_doula_invoice(invoice_id: str, update_data: InvoiceUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Update an invoice"""
    now = datetime.now(timezone.utc)
    
    # Build update dict excluding None values
    updates = {k: v for k, v in update_data.dict().items() if v is not None}
    updates["updated_at"] = now
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice updated"}

@api_router.delete("/doula/invoices/{invoice_id}")
async def delete_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Delete an invoice (only Draft invoices)"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") != "Draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be deleted")
    
    await db.invoices.delete_one({"invoice_id": invoice_id})
    return {"message": "Invoice deleted"}

@api_router.post("/doula/invoices/{invoice_id}/send")
async def send_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send invoice to client"""
    now = datetime.now(timezone.utc)
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update status
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "Sent", "sent_at": now, "updated_at": now}}
    )
    
    # Get client and send notification
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        # Create in-app notification for the mom
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_received",
            "title": "New Invoice",
            "message": f"You have received an invoice for ${invoice['amount']:.2f} from your doula.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        # Send email notification
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend.api_key:
            try:
                resend.Emails.send({
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Invoice #{invoice['invoice_number']} from {user.full_name}",
                    "html": f"""
                        <h2>You have received an invoice</h2>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            Payments are made directly to your doula using the instructions provided. 
                            True Joy Birthing does not process or guarantee payments between you and your provider.
                        </p>
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice email: {e}")
    
    return {"message": "Invoice sent"}

@api_router.post("/doula/invoices/{invoice_id}/mark-paid")
async def mark_doula_invoice_paid(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Mark invoice as paid and remove from Mom's notifications"""
    now = datetime.now(timezone.utc)
    
    # Get the invoice first to find the client
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update invoice status
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Paid", "paid_at": now, "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get client and mark the invoice notification as read (or delete it)
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        # Mark any invoice-related notifications as read
        await db.notifications.update_many(
            {
                "user_id": client["linked_mom_id"],
                "type": {"$in": ["invoice_received", "invoice_reminder"]},
                "data.invoice_id": invoice_id
            },
            {"$set": {"read": True, "resolved": True, "resolved_at": now}}
        )
        
        # Also send a "paid" notification to the Mom
        paid_notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_paid",
            "title": "Payment Received",
            "message": f"Your payment of ${invoice['amount']:.2f} has been confirmed. Thank you!",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(paid_notification)
    
    return {"message": "Invoice marked as paid"}

@api_router.post("/doula/invoices/{invoice_id}/cancel")
async def cancel_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Cancel an invoice"""
    now = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Cancelled", "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice cancelled"}

@api_router.post("/doula/invoices/{invoice_id}/send-reminder")
async def send_doula_invoice_reminder(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send a payment reminder for a Sent invoice"""
    now = datetime.now(timezone.utc)
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["status"] != "Sent":
        raise HTTPException(status_code=400, detail="Reminders can only be sent for invoices with 'Sent' status")
    
    # Update last_reminder_sent timestamp
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"last_reminder_sent": now, "updated_at": now}}
    )
    
    # Get client and send reminder
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        # Create in-app notification for the mom
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_reminder",
            "title": "Payment Reminder",
            "message": f"Friendly reminder: You have an unpaid invoice for ${invoice['amount']:.2f} due {invoice.get('due_date', 'soon')}.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        # Send email reminder
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend.api_key:
            try:
                days_overdue = ""
                if invoice.get("due_date"):
                    try:
                        due_date = datetime.strptime(invoice["due_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        if now > due_date:
                            days = (now - due_date).days
                            days_overdue = f"<p style='color: #d32f2f;'><strong>This invoice is {days} day(s) overdue.</strong></p>"
                    except:
                        pass
                
                resend.Emails.send({
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Payment Reminder: Invoice #{invoice['invoice_number']}",
                    "html": f"""
                        <h2>Payment Reminder</h2>
                        <p>This is a friendly reminder about your outstanding invoice.</p>
                        {days_overdue}
                        <hr>
                        <p><strong>Invoice #:</strong> {invoice['invoice_number']}</p>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount Due:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            If you have already made this payment, please disregard this reminder.
                            Payments are made directly to your doula using the instructions provided.
                        </p>
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice reminder email: {e}")
    
    return {"message": "Reminder sent"}

# ============== MIDWIFE INVOICE ROUTES ==============

@api_router.get("/midwife/invoices")
async def get_midwife_invoices(user: User = Depends(check_role(["MIDWIFE"])), status: Optional[str] = None):
    """Get all invoices, optionally filtered by status"""
    query = {"provider_id": user.user_id, "provider_type": "MIDWIFE"}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices

@api_router.post("/midwife/invoices")
async def create_midwife_invoice(invoice_data: InvoiceCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new invoice"""
    # Get client name from clients collection (midwife clients use provider_id and provider_type fields)
    client = await db.clients.find_one({"client_id": invoice_data.client_id, "provider_id": user.user_id, "provider_type": "MIDWIFE"}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Generate invoice number if not provided
    invoice_number = invoice_data.invoice_number or await generate_invoice_number(user.user_id)
    
    # Get default payment instructions if not provided
    payment_text = invoice_data.payment_instructions_text
    if not payment_text:
        default_template = await db.payment_instructions.find_one(
            {"user_id": user.user_id, "is_default": True},
            {"_id": 0}
        )
        if default_template:
            payment_text = default_template.get("instructions_text")
    
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "MIDWIFE",
        "client_id": invoice_data.client_id,
        "client_name": client["name"],
        "invoice_number": invoice_number,
        "description": invoice_data.description,
        "amount": invoice_data.amount,
        "issue_date": invoice_data.issue_date or now.strftime("%Y-%m-%d"),
        "due_date": invoice_data.due_date,
        "payment_instructions_text": payment_text,
        "notes_for_client": invoice_data.notes_for_client,
        "status": "Draft",
        "sent_at": None,
        "paid_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.invoices.insert_one(invoice)
    invoice.pop('_id', None)
    return invoice

@api_router.get("/midwife/invoices/{invoice_id}")
async def get_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.put("/midwife/invoices/{invoice_id}")
async def update_midwife_invoice(invoice_id: str, update_data: InvoiceUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update an invoice"""
    now = datetime.now(timezone.utc)
    
    # Build update dict excluding None values
    updates = {k: v for k, v in update_data.dict().items() if v is not None}
    updates["updated_at"] = now
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice updated"}

@api_router.delete("/midwife/invoices/{invoice_id}")
async def delete_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete an invoice (only Draft invoices)"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") != "Draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be deleted")
    
    await db.invoices.delete_one({"invoice_id": invoice_id})
    return {"message": "Invoice deleted"}

@api_router.post("/midwife/invoices/{invoice_id}/send")
async def send_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Send invoice to client"""
    now = datetime.now(timezone.utc)
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update status
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "Sent", "sent_at": now, "updated_at": now}}
    )
    
    # Get client and send notification (midwife clients use provider_type=MIDWIFE)
    client = await db.clients.find_one({"client_id": invoice["client_id"], "provider_type": "MIDWIFE"}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        # Create in-app notification for the mom
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_received",
            "title": "New Invoice",
            "message": f"You have received an invoice for ${invoice['amount']:.2f} from your midwife.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        # Send email notification
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend.api_key:
            try:
                resend.Emails.send({
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Invoice #{invoice['invoice_number']} from {user.full_name}",
                    "html": f"""
                        <h2>You have received an invoice</h2>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            Payments are made directly to your midwife using the instructions provided. 
                            True Joy Birthing does not process or guarantee payments between you and your provider.
                        </p>
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice email: {e}")
    
    return {"message": "Invoice sent"}

@api_router.post("/midwife/invoices/{invoice_id}/mark-paid")
async def mark_midwife_invoice_paid(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Mark invoice as paid"""
    now = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Paid", "paid_at": now, "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice marked as paid"}

@api_router.post("/midwife/invoices/{invoice_id}/cancel")
async def cancel_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Cancel an invoice"""
    now = datetime.now(timezone.utc)
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Cancelled", "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice cancelled"}

@api_router.post("/midwife/invoices/{invoice_id}/send-reminder")
async def send_midwife_invoice_reminder(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Send a payment reminder for a Sent invoice"""
    now = datetime.now(timezone.utc)
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["status"] != "Sent":
        raise HTTPException(status_code=400, detail="Reminders can only be sent for invoices with 'Sent' status")
    
    # Update last_reminder_sent timestamp
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"last_reminder_sent": now, "updated_at": now}}
    )
    
    # Get client and send reminder
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        # Create in-app notification for the mom
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_reminder",
            "title": "Payment Reminder",
            "message": f"Friendly reminder: You have an unpaid invoice for ${invoice['amount']:.2f} due {invoice.get('due_date', 'soon')}.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        # Send email reminder
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend.api_key:
            try:
                days_overdue = ""
                if invoice.get("due_date"):
                    try:
                        due_date = datetime.strptime(invoice["due_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        if now > due_date:
                            days = (now - due_date).days
                            days_overdue = f"<p style='color: #d32f2f;'><strong>This invoice is {days} day(s) overdue.</strong></p>"
                    except:
                        pass
                
                resend.Emails.send({
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Payment Reminder: Invoice #{invoice['invoice_number']}",
                    "html": f"""
                        <h2>Payment Reminder</h2>
                        <p>This is a friendly reminder about your outstanding invoice.</p>
                        {days_overdue}
                        <hr>
                        <p><strong>Invoice #:</strong> {invoice['invoice_number']}</p>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount Due:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            If you have already made this payment, please disregard this reminder.
                            Payments are made directly to your midwife using the instructions provided.
                        </p>
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice reminder email: {e}")
    
    return {"message": "Reminder sent"}

# ============== MOM INVOICE VIEW ROUTES ==============

@api_router.get("/mom/invoices")
async def get_mom_invoices(user: User = Depends(check_role(["MOM"]))):
    """Get all invoices for the mom from their providers (only Sent, Paid, Cancelled - not Draft)"""
    # Find all clients linked to this mom (both doula and midwife clients are in the same 'clients' collection)
    all_clients = await db.clients.find({"linked_mom_id": user.user_id}, {"_id": 0, "client_id": 1}).to_list(100)
    
    client_ids = [c["client_id"] for c in all_clients]
    
    if not client_ids:
        return []
    
    # Get invoices for these clients (exclude Draft)
    invoices = await db.invoices.find(
        {"client_id": {"$in": client_ids}, "status": {"$ne": "Draft"}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Add provider info to each invoice
    for invoice in invoices:
        provider = await db.users.find_one(
            {"user_id": invoice["provider_id"]},
            {"_id": 0, "full_name": 1, "email": 1, "role": 1}
        )
        if provider:
            invoice["provider_name"] = provider.get("full_name", "")
            invoice["provider_email"] = provider.get("email", "")
            invoice["provider_type"] = provider.get("role", "")
    
    return invoices

@api_router.get("/mom/invoices/{invoice_id}")
async def get_mom_invoice_detail(invoice_id: str, user: User = Depends(check_role(["MOM"]))):
    """Get a specific invoice detail for the mom"""
    # Find all clients linked to this mom (both doula and midwife clients are in the same 'clients' collection)
    all_clients = await db.clients.find({"linked_mom_id": user.user_id}, {"_id": 0, "client_id": 1}).to_list(100)
    
    client_ids = [c["client_id"] for c in all_clients]
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "client_id": {"$in": client_ids}, "status": {"$ne": "Draft"}},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Add provider info
    provider = await db.users.find_one(
        {"user_id": invoice["provider_id"]},
        {"_id": 0, "full_name": 1, "email": 1, "role": 1}
    )
    if provider:
        invoice["provider_name"] = provider.get("full_name", "")
        invoice["provider_email"] = provider.get("email", "")
        invoice["provider_type"] = provider.get("role", "")
    
    return invoice

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


# ============== MIDWIFE CONTRACT DEFAULTS ==============
@api_router.get("/midwife/contract-defaults")
async def get_midwife_contract_defaults(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get saved contract defaults for this midwife"""
    defaults = await db.contract_defaults.find_one(
        {"user_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    )
    return defaults or {}

@api_router.put("/midwife/contract-defaults")
async def save_midwife_contract_defaults(data: dict, user: User = Depends(check_role(["MIDWIFE"]))):
    """Save contract text defaults for future contracts"""
    now = datetime.now(timezone.utc)
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


@api_router.get("/midwife/dashboard")
async def get_midwife_dashboard(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife dashboard stats"""
    # Use provider_id to match how clients are stored (consistent with Doula)
    total_clients = await db.clients.count_documents({"provider_id": user.user_id})
    prenatal_clients = await db.clients.count_documents({"provider_id": user.user_id, "status": "Prenatal"})
    
    # Count active clients (those with linked_mom_id)
    active_clients = await db.clients.count_documents({"provider_id": user.user_id, "linked_mom_id": {"$ne": None}})
    
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
    
    # Count upcoming appointments (accepted, future dates)
    today = now.strftime("%Y-%m-%d")
    upcoming_appointments = await db.appointments.count_documents({
        "provider_id": user.user_id,
        "status": "accepted",
        "appointment_date": {"$gte": today}
    })
    
    return {
        "total_clients": total_clients,
        "active_clients": active_clients,
        "prenatal_clients": prenatal_clients,
        "visits_this_month": visits_this_month,
        "births_this_month": births_this_month,
        "upcoming_appointments": upcoming_appointments
    }

# ============== MIDWIFE CLIENT ROUTES ==============

@api_router.get("/midwife/clients")
async def get_midwife_clients(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife's clients"""
    clients = await db.clients.find(
        {"provider_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return clients

@api_router.post("/midwife/clients")
async def create_midwife_client(client_data: ClientCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new client"""
    now = datetime.now(timezone.utc)
    
    # Auto-link to mom user if email matches
    linked_mom_id = None
    if client_data.email:
        existing_mom = await db.users.find_one(
            {"email": client_data.email, "role": "MOM"},
            {"_id": 0, "user_id": 1}
        )
        if existing_mom:
            linked_mom_id = existing_mom["user_id"]
    
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
        "linked_mom_id": linked_mom_id,
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


# ============== PRENATAL VISIT ASSESSMENT ROUTES (MIDWIFE) ==============

@api_router.get("/midwife/clients/{client_id}/prenatal-visits")
async def get_prenatal_visits(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all prenatal visit assessments for a client"""
    # Verify client belongs to this midwife
    client = await db.clients.find_one({"client_id": client_id, "provider_id": user.user_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    visits = await db.prenatal_visits.find(
        {"client_id": client_id, "midwife_id": user.user_id},
        {"_id": 0}
    ).sort("visit_date", -1).to_list(100)
    return visits

@api_router.post("/midwife/clients/{client_id}/prenatal-visits")
async def create_prenatal_visit(client_id: str, visit_data: PrenatalVisitAssessmentCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new prenatal visit assessment"""
    # Verify client belongs to this midwife
    client = await db.clients.find_one({"client_id": client_id, "provider_id": user.user_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Generate summary line for list view
    summary_parts = []
    if visit_data.blood_pressure:
        summary_parts.append(f"BP {visit_data.blood_pressure}")
    if visit_data.fetal_heart_rate:
        summary_parts.append(f"FHR {visit_data.fetal_heart_rate}")
    if visit_data.fundal_height:
        summary_parts.append(f"FH {visit_data.fundal_height} cm")
    if visit_data.weight:
        unit = visit_data.weight_unit or "lbs"
        summary_parts.append(f"Wt {visit_data.weight} {unit}")
    
    summary = ", ".join(summary_parts) if summary_parts else "Visit recorded"
    
    visit = {
        "prenatal_visit_id": f"pv_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": client_id,
        "visit_date": visit_data.visit_date,
        "summary": summary,
        # Vitals & Measurements
        "urinalysis": visit_data.urinalysis,
        "urinalysis_note": visit_data.urinalysis_note,
        "blood_pressure": visit_data.blood_pressure,
        "fetal_heart_rate": visit_data.fetal_heart_rate,
        "fundal_height": visit_data.fundal_height,
        "weight": visit_data.weight,
        "weight_unit": visit_data.weight_unit or "lbs",
        # Well-being scores
        "eating_score": visit_data.eating_score,
        "eating_note": visit_data.eating_note,
        "water_score": visit_data.water_score,
        "water_note": visit_data.water_note,
        "emotional_score": visit_data.emotional_score,
        "emotional_note": visit_data.emotional_note,
        "physical_score": visit_data.physical_score,
        "physical_note": visit_data.physical_note,
        "mental_score": visit_data.mental_score,
        "mental_note": visit_data.mental_note,
        "spiritual_score": visit_data.spiritual_score,
        "spiritual_note": visit_data.spiritual_note,
        # General
        "general_notes": visit_data.general_notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.prenatal_visits.insert_one(visit)
    visit.pop('_id', None)
    return visit

@api_router.get("/midwife/clients/{client_id}/prenatal-visits/{visit_id}")
async def get_prenatal_visit(client_id: str, visit_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a single prenatal visit assessment"""
    visit = await db.prenatal_visits.find_one(
        {"prenatal_visit_id": visit_id, "client_id": client_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Prenatal visit not found")
    return visit

@api_router.put("/midwife/clients/{client_id}/prenatal-visits/{visit_id}")
async def update_prenatal_visit(client_id: str, visit_id: str, visit_data: PrenatalVisitAssessmentUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a prenatal visit assessment"""
    # Build update dict only with provided fields
    update_data = {}
    for field, value in visit_data.dict(exclude_unset=True).items():
        update_data[field] = value
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Regenerate summary if vitals changed
    existing = await db.prenatal_visits.find_one(
        {"prenatal_visit_id": visit_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    if existing:
        bp = update_data.get("blood_pressure", existing.get("blood_pressure"))
        fhr = update_data.get("fetal_heart_rate", existing.get("fetal_heart_rate"))
        fh = update_data.get("fundal_height", existing.get("fundal_height"))
        wt = update_data.get("weight", existing.get("weight"))
        wt_unit = update_data.get("weight_unit", existing.get("weight_unit", "lbs"))
        
        summary_parts = []
        if bp:
            summary_parts.append(f"BP {bp}")
        if fhr:
            summary_parts.append(f"FHR {fhr}")
        if fh:
            summary_parts.append(f"FH {fh} cm")
        if wt:
            summary_parts.append(f"Wt {wt} {wt_unit}")
        
        update_data["summary"] = ", ".join(summary_parts) if summary_parts else "Visit recorded"
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.prenatal_visits.update_one(
        {"prenatal_visit_id": visit_id, "client_id": client_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prenatal visit not found")
    
    return {"message": "Prenatal visit updated"}

@api_router.delete("/midwife/clients/{client_id}/prenatal-visits/{visit_id}")
async def delete_prenatal_visit(client_id: str, visit_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a prenatal visit assessment"""
    result = await db.prenatal_visits.delete_one(
        {"prenatal_visit_id": visit_id, "client_id": client_id, "midwife_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prenatal visit not found")
    
    return {"message": "Prenatal visit deleted"}

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
# MIGRATED TO: routes/admin.py
# Routes: /admin/users, /admin/users/{user_id}/role, /admin/content, /admin/content/{section_id}

# ============== MARKETPLACE ROUTES ==============
# MIGRATED TO: routes/marketplace.py
# Routes: /marketplace/providers, /marketplace/provider/{user_id}

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
# MIGRATED TO: routes/messages.py
# Routes: /messages/conversations, /messages/{other_user_id}, /messages, /messages/unread/count
# Note: /provider/clients/{client_id}/messages moved to /messages/client/{client_id}

# ============== UNIFIED PROVIDER ROUTES ==============
# These routes work for both DOULA and MIDWIFE using client_id as the central entity

@api_router.get("/provider/clients")
async def get_unified_provider_clients(
    include_inactive: bool = False,
    status_filter: Optional[str] = None,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Get all clients for the logged-in provider (DOULA or MIDWIFE).
    By default, only returns active clients (within 6 weeks of due date).
    """
    query = {"provider_id": user.user_id}
    
    if status_filter:
        query["status"] = status_filter
    
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add is_active computed field and filter if needed
    result = []
    for client in clients:
        client["is_active"] = is_client_active(client)
        if include_inactive or client["is_active"]:
            result.append(client)
    
    return result


@api_router.get("/provider/clients/{client_id}")
async def get_unified_client_detail(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get detailed info for a single client, including related data counts"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Add is_active
    client["is_active"] = is_client_active(client)
    
    # Get counts of related entities
    appointments_count = await db.appointments.count_documents({
        "$or": [
            {"client_id": client_id, "provider_id": user.user_id},
            {"mom_user_id": client.get("linked_mom_id"), "provider_id": user.user_id} if client.get("linked_mom_id") else {"client_id": "___never_match___"}
        ]
    })
    
    notes_count = await db.notes.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    contracts_count = await db.contracts.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    invoices_count = await db.invoices.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    # Midwife-specific: visits count
    visits_count = 0
    if user.role == "MIDWIFE":
        visits_count = await db.visits.count_documents({
            "client_id": client_id,
            "provider_id": user.user_id
        })
    
    client["_counts"] = {
        "appointments": appointments_count,
        "notes": notes_count,
        "contracts": contracts_count,
        "invoices": invoices_count,
        "visits": visits_count
    }
    
    return client


@api_router.put("/provider/clients/{client_id}")
async def update_unified_client(client_id: str, update_data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a client's information"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Filter allowed update fields
    allowed_fields = ["name", "email", "phone", "due_date", "birth_date", 
                      "planned_birth_setting", "status", "edd", "partner_name"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await db.clients.update_one(
        {"client_id": client_id},
        {"$set": update_dict}
    )
    
    return {"message": "Client updated"}


@api_router.get("/provider/clients/{client_id}/timeline")
async def get_client_timeline(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """
    Get unified timeline for a client showing all activities:
    appointments, visits, notes, contracts, invoices
    """
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    timeline = []
    
    # Get appointments (check both client_id and mom_user_id)
    appt_query = {"provider_id": user.user_id, "$or": [{"client_id": client_id}]}
    if client.get("linked_mom_id"):
        appt_query["$or"].append({"mom_user_id": client["linked_mom_id"]})
    
    appointments = await db.appointments.find(appt_query, {"_id": 0}).to_list(100)
    
    for appt in appointments:
        timeline.append({
            "type": "appointment",
            "id": appt["appointment_id"],
            "date": appt.get("start_datetime") or appt.get("appointment_date"),
            "title": f"{appt.get('appointment_type', 'Appointment').replace('_', ' ').title()}",
            "subtitle": appt.get("location") or ("Virtual" if appt.get("is_virtual") else ""),
            "status": appt.get("status"),
            "data": appt
        })
    
    # Get visits (midwife only)
    if user.role == "MIDWIFE":
        visits = await db.visits.find(
            {"client_id": client_id, "provider_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        for visit in visits:
            timeline.append({
                "type": "visit",
                "id": visit.get("visit_id") or visit.get("prenatal_visit_id"),
                "date": visit.get("visit_date"),
                "title": f"{visit.get('visit_type', 'Visit')} Visit",
                "subtitle": visit.get("summary", ""),
                "status": None,
                "data": visit
            })
        
        # Also check prenatal_visits collection
        prenatal_visits = await db.prenatal_visits.find(
            {"client_id": client_id, "midwife_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        for visit in prenatal_visits:
            timeline.append({
                "type": "visit",
                "id": visit.get("prenatal_visit_id"),
                "date": visit.get("visit_date"),
                "title": "Prenatal Visit",
                "subtitle": visit.get("summary", ""),
                "status": None,
                "data": visit
            })
    
    # Get notes
    notes = await db.notes.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for note in notes:
        timeline.append({
            "type": "note",
            "id": note.get("note_id"),
            "date": note.get("created_at"),
            "title": note.get("title") or f"{note.get('note_type', 'Note')}",
            "subtitle": (note.get("content", "")[:100] + "...") if len(note.get("content", "")) > 100 else note.get("content", ""),
            "status": None,
            "data": note
        })
    
    # Get contracts
    contracts = await db.contracts.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for contract in contracts:
        timeline.append({
            "type": "contract",
            "id": contract["contract_id"],
            "date": contract.get("created_at"),
            "title": "Service Contract",
            "subtitle": f"Status: {contract.get('status', 'Draft')}",
            "status": contract.get("status"),
            "data": contract
        })
    
    # Get invoices
    invoices = await db.invoices.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for invoice in invoices:
        timeline.append({
            "type": "invoice",
            "id": invoice["invoice_id"],
            "date": invoice.get("created_at"),
            "title": f"Invoice #{invoice.get('invoice_number', '')}",
            "subtitle": f"${invoice.get('amount', 0):.2f} - {invoice.get('status', 'Draft')}",
            "status": invoice.get("status"),
            "data": invoice
        })
    
    # Sort by date descending
    def get_sort_date(item):
        date = item.get("date")
        if isinstance(date, datetime):
            return date
        if isinstance(date, str):
            try:
                return datetime.fromisoformat(date.replace("Z", "+00:00"))
            except:
                return datetime.min
        return datetime.min
    
    timeline.sort(key=get_sort_date, reverse=True)
    
    return {
        "client": calculate_client_active_status(client),
        "timeline": timeline
    }


@api_router.get("/provider/appointments")
async def get_unified_appointments(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    upcoming_only: bool = False,
    include_inactive_clients: bool = False,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Get appointments for the provider.
    Can filter by client, status, or upcoming only.
    By default excludes appointments for inactive clients.
    """
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["$or"] = [{"client_id": client_id}]
        # Also check linked mom
        client = await db.clients.find_one({"client_id": client_id})
        if client and client.get("linked_mom_id"):
            query["$or"].append({"mom_user_id": client["linked_mom_id"]})
    
    if status:
        query["status"] = status
    
    if upcoming_only:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"start_datetime": {"$gte": today}},
                {"appointment_date": {"$gte": today}}
            ]
        })
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("appointment_date", -1).to_list(500)
    
    # Enrich with client info and filter inactive if needed
    result = []
    for appt in appointments:
        # Find the associated client
        client = None
        if appt.get("client_id"):
            client = await db.clients.find_one({"client_id": appt["client_id"]}, {"_id": 0})
        elif appt.get("mom_user_id"):
            client = await db.clients.find_one({"linked_mom_id": appt["mom_user_id"], "provider_id": user.user_id}, {"_id": 0})
        
        if client:
            appt["client_name"] = client.get("name", "")
            appt["client_email"] = client.get("email", "")
            appt["client_picture"] = client.get("picture")
            appt["client_id"] = client.get("client_id")
            
            # Filter inactive clients
            if not include_inactive_clients and not client_id:
                if not is_client_active(client):
                    continue
        
        result.append(appt)
    
    return result


@api_router.post("/provider/appointments")
async def create_unified_appointment(data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create an appointment for a client using the unified model"""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
    
    # Support both new datetime format and legacy date/time format
    start_datetime = data.get("start_datetime")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time", "09:00")
    
    if not start_datetime and appointment_date:
        start_datetime = f"{appointment_date}T{appointment_time}:00"
    elif start_datetime and not appointment_date:
        appointment_date = start_datetime[:10] if len(start_datetime) >= 10 else None
        appointment_time = start_datetime[11:16] if len(start_datetime) >= 16 else None
    
    appointment = {
        "appointment_id": appointment_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "provider_name": user.full_name,
        "provider_role": user.role,
        "client_name": client.get("name", ""),
        # New unified fields
        "start_datetime": start_datetime,
        "end_datetime": data.get("end_datetime"),
        "duration_minutes": data.get("duration_minutes", 60),
        # Legacy field support
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "appointment_type": data.get("appointment_type", "consultation"),
        "location": data.get("location"),
        "is_virtual": data.get("is_virtual", False),
        "notes": data.get("notes"),
        "client_notes": data.get("client_notes"),
        "status": data.get("status", "scheduled"),
        "created_at": now,
        "updated_at": now
    }
    
    # If client has linked_mom_id, also store it for mom's timeline
    if client.get("linked_mom_id"):
        appointment["mom_user_id"] = client["linked_mom_id"]
        appointment["mom_name"] = client.get("name", "")
        
        # Send notification to Mom
        await create_notification(
            user_id=client["linked_mom_id"],
            notif_type="appointment_invite",
            title="New Appointment Scheduled",
            message=f"{user.full_name} scheduled an appointment for {appointment_date}",
            data={"appointment_id": appointment_id, "provider_id": user.user_id}
        )
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    return {"message": "Appointment created", "appointment": appointment}


@api_router.put("/provider/appointments/{appointment_id}")
async def update_unified_appointment(appointment_id: str, data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update an appointment"""
    appt = await db.appointments.find_one(
        {"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = datetime.now(timezone.utc)
    
    allowed_fields = ["start_datetime", "end_datetime", "duration_minutes", 
                      "appointment_type", "location", "is_virtual", "status",
                      "notes", "client_notes", "appointment_date", "appointment_time"]
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": update_dict}
    )
    
    return {"message": "Appointment updated"}


@api_router.delete("/provider/appointments/{appointment_id}")
async def delete_unified_appointment(appointment_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete/cancel an appointment"""
    result = await db.appointments.delete_one(
        {"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment deleted"}


@api_router.get("/provider/notes")
async def get_unified_notes(
    client_id: Optional[str] = None,
    note_type: Optional[str] = None,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Get notes, optionally filtered by client or type"""
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    if note_type:
        query["note_type"] = note_type
    
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with client name
    for note in notes:
        if note.get("client_id"):
            client = await db.clients.find_one(
                {"client_id": note["client_id"]},
                {"_id": 0, "name": 1}
            )
            if client:
                note["client_name"] = client.get("name", "")
    
    return notes


@api_router.post("/provider/notes")
async def create_unified_note(data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create a note for a client"""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    
    note = {
        "note_id": note_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "client_name": client.get("name", ""),
        "note_type": data.get("note_type", "General"),
        "title": data.get("title"),
        "content": data.get("content", ""),
        "is_private": data.get("is_private", True),
        "created_at": now,
        "updated_at": now
    }
    
    await db.notes.insert_one(note)
    note.pop("_id", None)
    
    return note


@api_router.put("/provider/notes/{note_id}")
async def update_unified_note(note_id: str, data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a note"""
    note = await db.notes.find_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    now = datetime.now(timezone.utc)
    
    allowed_fields = ["note_type", "title", "content", "is_private"]
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await db.notes.update_one(
        {"note_id": note_id},
        {"$set": update_dict}
    )
    
    return {"message": "Note updated"}


@api_router.delete("/provider/notes/{note_id}")
async def delete_unified_note(note_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a note"""
    result = await db.notes.delete_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}


@api_router.get("/provider/visits")
async def get_unified_visits(
    client_id: Optional[str] = None,
    visit_type: Optional[str] = None,
    include_inactive_clients: bool = False,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """
    Get visits for the provider (MIDWIFE only).
    Visits are clinical records linked to appointments.
    """
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    if visit_type:
        query["visit_type"] = visit_type
    
    # Check both visits and prenatal_visits collections
    visits = await db.visits.find(query, {"_id": 0}).sort("visit_date", -1).to_list(500)
    
    # Also get from prenatal_visits using midwife_id
    prenatal_query = {"midwife_id": user.user_id}
    if client_id:
        prenatal_query["client_id"] = client_id
    prenatal_visits = await db.prenatal_visits.find(prenatal_query, {"_id": 0}).sort("visit_date", -1).to_list(500)
    
    # Merge and dedupe
    all_visits = visits + prenatal_visits
    
    # Filter out inactive client visits if needed
    if not include_inactive_clients and not client_id:
        clients = await db.clients.find(
            {"provider_id": user.user_id},
            {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1}
        ).to_list(500)
        
        active_client_ids = set()
        for c in clients:
            if is_client_active(c):
                active_client_ids.add(c["client_id"])
        
        all_visits = [v for v in all_visits if v.get("client_id") in active_client_ids]
    
    # Enrich with client info
    for visit in all_visits:
        if visit.get("client_id"):
            client = await db.clients.find_one(
                {"client_id": visit["client_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            if client:
                visit["client_name"] = client.get("name", "")
    
    return all_visits


@api_router.post("/provider/visits")
async def create_unified_visit(data: dict, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a visit record (MIDWIFE only). Visits must be linked to an appointment."""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    appointment_id = data.get("appointment_id")
    # appointment_id is highly recommended but not strictly required for backwards compatibility
    # If not provided, we'll create a placeholder appointment
    
    # Verify client belongs to provider
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    visit_date = data.get("visit_date", now.strftime("%Y-%m-%d"))
    
    # If no appointment_id provided, create a linked appointment automatically
    if not appointment_id:
        appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
        visit_type = data.get("visit_type", "Prenatal")
        appt_type = "prenatal_visit" if visit_type == "Prenatal" else "postpartum_visit"
        
        appointment = {
            "appointment_id": appointment_id,
            "client_id": client_id,
            "provider_id": user.user_id,
            "provider_name": user.full_name,
            "provider_role": user.role,
            "client_name": client.get("name", ""),
            "start_datetime": f"{visit_date}T09:00:00",
            "appointment_date": visit_date,
            "appointment_time": "09:00",
            "appointment_type": appt_type,
            "status": "completed",  # Already completed since visit is being recorded
            "created_at": now,
            "updated_at": now
        }
        
        if client.get("linked_mom_id"):
            appointment["mom_user_id"] = client["linked_mom_id"]
        
        await db.appointments.insert_one(appointment)
    
    # Build summary from vitals
    summary_parts = []
    if data.get("blood_pressure"):
        summary_parts.append(f"BP {data['blood_pressure']}")
    if data.get("fetal_heart_rate"):
        summary_parts.append(f"FHR {data['fetal_heart_rate']}")
    if data.get("fundal_height"):
        summary_parts.append(f"FH {data['fundal_height']} cm")
    if data.get("weight"):
        unit = data.get("weight_unit", "lbs")
        summary_parts.append(f"Wt {data['weight']} {unit}")
    
    summary = ", ".join(summary_parts) if summary_parts else "Visit recorded"
    
    visit = {
        "visit_id": visit_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "midwife_id": user.user_id,  # For backwards compatibility
        "appointment_id": appointment_id,  # Always set (either provided or auto-generated)
        "client_name": client.get("name", ""),
        "visit_date": visit_date,
        "visit_type": data.get("visit_type", "Prenatal"),
        "summary": summary,
        # Vitals
        "blood_pressure": data.get("blood_pressure"),
        "fetal_heart_rate": data.get("fetal_heart_rate"),
        "fundal_height": data.get("fundal_height"),
        "weight": data.get("weight"),
        "weight_unit": data.get("weight_unit", "lbs"),
        "urinalysis": data.get("urinalysis"),
        "urinalysis_note": data.get("urinalysis_note"),
        # Well-being scores
        "eating_score": data.get("eating_score"),
        "eating_note": data.get("eating_note"),
        "water_score": data.get("water_score"),
        "water_note": data.get("water_note"),
        "emotional_score": data.get("emotional_score"),
        "emotional_note": data.get("emotional_note"),
        "physical_score": data.get("physical_score"),
        "physical_note": data.get("physical_note"),
        "mental_score": data.get("mental_score"),
        "mental_note": data.get("mental_note"),
        "spiritual_score": data.get("spiritual_score"),
        "spiritual_note": data.get("spiritual_note"),
        # General
        "general_notes": data.get("general_notes"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.visits.insert_one(visit)
    visit.pop("_id", None)
    
    # Update linked appointment status to completed
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "completed", "visit_id": visit_id}}
        )
    
    return visit


@api_router.put("/provider/visits/{visit_id}")
async def update_unified_visit(visit_id: str, data: dict, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a visit record"""
    # Check both collections
    visit = await db.visits.find_one({"visit_id": visit_id, "provider_id": user.user_id})
    collection = db.visits
    
    if not visit:
        visit = await db.prenatal_visits.find_one({"prenatal_visit_id": visit_id, "midwife_id": user.user_id})
        collection = db.prenatal_visits
        visit_id_field = "prenatal_visit_id"
    else:
        visit_id_field = "visit_id"
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    now = datetime.now(timezone.utc)
    
    # Update summary if vitals changed
    summary_parts = []
    bp = data.get("blood_pressure", visit.get("blood_pressure"))
    fhr = data.get("fetal_heart_rate", visit.get("fetal_heart_rate"))
    fh = data.get("fundal_height", visit.get("fundal_height"))
    wt = data.get("weight", visit.get("weight"))
    
    if bp:
        summary_parts.append(f"BP {bp}")
    if fhr:
        summary_parts.append(f"FHR {fhr}")
    if fh:
        summary_parts.append(f"FH {fh} cm")
    if wt:
        unit = data.get("weight_unit", visit.get("weight_unit", "lbs"))
        summary_parts.append(f"Wt {wt} {unit}")
    
    data["summary"] = ", ".join(summary_parts) if summary_parts else "Visit recorded"
    data["updated_at"] = now
    
    # Remove fields that shouldn't be updated
    for field in ["visit_id", "prenatal_visit_id", "client_id", "provider_id", "midwife_id", "created_at"]:
        data.pop(field, None)
    
    await collection.update_one(
        {visit_id_field: visit_id},
        {"$set": data}
    )
    
    return {"message": "Visit updated"}


@api_router.delete("/provider/visits/{visit_id}")
async def delete_unified_visit(visit_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a visit record"""
    # Try visits collection first
    result = await db.visits.delete_one({"visit_id": visit_id, "provider_id": user.user_id})
    
    if result.deleted_count == 0:
        # Try prenatal_visits
        result = await db.prenatal_visits.delete_one({"prenatal_visit_id": visit_id, "midwife_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    return {"message": "Visit deleted"}


@api_router.get("/provider/clients/{client_id}/birth-record")
async def get_client_birth_record(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get birth record for a client"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    birth_record = await db.birth_records.find_one(
        {"client_id": client_id},
        {"_id": 0}
    )
    
    return birth_record or {}


@api_router.post("/provider/clients/{client_id}/birth-record")
async def create_or_update_birth_record(client_id: str, data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create or update birth record for a client"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Check if record exists
    existing = await db.birth_records.find_one({"client_id": client_id})
    
    if existing:
        # Update
        data["updated_at"] = now
        for field in ["birth_record_id", "client_id", "created_at"]:
            data.pop(field, None)
        
        await db.birth_records.update_one(
            {"client_id": client_id},
            {"$set": data}
        )
        message = "Birth record updated"
    else:
        # Create
        birth_record = {
            "birth_record_id": f"br_{uuid.uuid4().hex[:12]}",
            "client_id": client_id,
            "provider_id": user.user_id,
            "client_name": client.get("name", ""),
            **data,
            "created_at": now,
            "updated_at": now
        }
        
        await db.birth_records.insert_one(birth_record)
        message = "Birth record created"
    
    # Also update client's birth_date if provided
    if data.get("birth_date"):
        await db.clients.update_one(
            {"client_id": client_id},
            {"$set": {"birth_date": data["birth_date"]}}
        )
    
    return {"message": message}


@api_router.get("/provider/dashboard")
async def get_unified_dashboard(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get unified dashboard stats for provider"""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    # Get all clients and count active
    all_clients = await db.clients.find(
        {"provider_id": user.user_id},
        {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1, "status": 1}
    ).to_list(500)
    
    active_clients = [c for c in all_clients if is_client_active(c)]
    active_client_ids = [c["client_id"] for c in active_clients]
    
    # Count upcoming appointments for active clients
    upcoming_appointments = await db.appointments.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["scheduled", "confirmed", "accepted", "pending"]},
        "$or": [
            {"start_datetime": {"$gte": today}},
            {"appointment_date": {"$gte": today}}
        ]
    })
    
    stats = {
        "total_clients": len(all_clients),
        "active_clients": len(active_clients),
        "upcoming_appointments": upcoming_appointments
    }
    
    # Role-specific stats
    if user.role == "MIDWIFE":
        # Count visits this month
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        visits_this_month = await db.visits.count_documents({
            "provider_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        prenatal_visits_this_month = await db.prenatal_visits.count_documents({
            "midwife_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        
        # Count births this month
        births_this_month = await db.birth_records.count_documents({
            "provider_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        
        # Count prenatal clients
        prenatal_count = len([c for c in active_clients if c.get("status") in ["Prenatal", "Active"]])
        
        stats["visits_this_month"] = visits_this_month + prenatal_visits_this_month
        stats["births_this_month"] = births_this_month
        stats["prenatal_clients"] = prenatal_count
    
    return stats


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


@api_router.post("/mom/appointments")
async def create_mom_appointment(data: dict, user: User = Depends(check_role(["MOM"]))):
    """
    Mom creates an appointment request with a provider from their team.
    The appointment is created with status 'pending' for provider to accept/decline.
    """
    provider_id = data.get("provider_id")
    if not provider_id:
        raise HTTPException(status_code=400, detail="provider_id is required")
    
    # Verify the provider is in Mom's team (has accepted share request)
    share_request = await db.share_requests.find_one({
        "mom_user_id": user.user_id,
        "provider_id": provider_id,
        "status": "accepted"
    })
    if not share_request:
        raise HTTPException(status_code=403, detail="This provider is not in your team. Please connect with them first.")
    
    # Get provider info
    provider = await db.users.find_one({"user_id": provider_id}, {"_id": 0, "full_name": 1, "role": 1})
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    now = datetime.now(timezone.utc)
    appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
    
    # Support both new datetime format and legacy date/time format
    start_datetime = data.get("start_datetime")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time", "09:00")
    
    if not start_datetime and appointment_date:
        start_datetime = f"{appointment_date}T{appointment_time}:00"
    elif start_datetime and not appointment_date:
        appointment_date = start_datetime[:10] if len(start_datetime) >= 10 else None
        appointment_time = start_datetime[11:16] if len(start_datetime) >= 16 else None
    
    if not appointment_date:
        raise HTTPException(status_code=400, detail="appointment_date or start_datetime is required")
    
    # Find or create client record linking this mom to the provider
    client = await db.clients.find_one({
        "linked_mom_id": user.user_id,
        "provider_id": provider_id
    })
    client_id = client["client_id"] if client else None
    
    appointment = {
        "appointment_id": appointment_id,
        "client_id": client_id,  # Link to client record if exists
        "provider_id": provider_id,
        "provider_name": provider.get("full_name", ""),
        "provider_role": provider.get("role", ""),
        "mom_user_id": user.user_id,
        "mom_name": user.full_name,
        # Datetime fields
        "start_datetime": start_datetime,
        "end_datetime": data.get("end_datetime"),
        "duration_minutes": data.get("duration_minutes", 60),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "appointment_type": data.get("appointment_type", "consultation"),
        "location": data.get("location"),
        "is_virtual": data.get("is_virtual", False),
        "client_notes": data.get("notes"),  # Mom's notes are visible to provider
        "status": "pending",  # Provider needs to accept
        "created_by": "mom",
        "created_at": now,
        "updated_at": now
    }
    
    await db.appointments.insert_one(appointment)
    
    # Notify the provider
    await create_notification(
        user_id=provider_id,
        notif_type="appointment_request",
        title="New Appointment Request",
        message=f"{user.full_name} has requested an appointment on {appointment_date}",
        data={"appointment_id": appointment_id, "mom_user_id": user.user_id}
    )
    
    appointment.pop("_id", None)
    return {"message": "Appointment request sent", "appointment": appointment}


@api_router.get("/mom/team-providers")
async def get_mom_team_providers(user: User = Depends(check_role(["MOM"]))):
    """
    Get list of providers in Mom's team (accepted share requests).
    Used for appointment creation to select a provider.
    """
    # Get accepted share requests
    share_requests = await db.share_requests.find(
        {"mom_user_id": user.user_id, "status": "accepted"},
        {"_id": 0}
    ).to_list(100)
    
    providers = []
    for req in share_requests:
        provider = await db.users.find_one(
            {"user_id": req["provider_id"]},
            {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "role": 1, "picture": 1}
        )
        if provider:
            providers.append(provider)
    
    return providers


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
    # Check share_requests first (primary permission source)
    connection = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_user_id,
        "status": "accepted"
    })
    if connection:
        return connection.get("can_message", True)
    
    # Also check clients collection for linked relationships
    client = await db.clients.find_one({
        "provider_id": provider_id,
        "linked_mom_id": mom_user_id
    })
    if client:
        return True  # Linked clients can always message
    
    return False

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

# ============== WEBSOCKET ENDPOINT ==============
@app.websocket("/ws/messages/{token}")
async def websocket_messages(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time messaging"""
    # Authenticate user from token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            await websocket.close(code=4001)
            return
        
        # Connect the user
        await ws_manager.connect(websocket, user_id)
        
        try:
            while True:
                # Wait for messages (keepalive pings are handled automatically)
                data = await websocket.receive_text()
                # Client can send ping messages to keep connection alive
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            ws_manager.disconnect(user_id)
    except JWTError:
        await websocket.close(code=4001)
        return

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
