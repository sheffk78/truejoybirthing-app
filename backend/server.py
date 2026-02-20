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

async def create_notification(user_id: str, notif_type: str, title: str, message: str, data: dict = None, send_push: bool = True):
    """Create an in-app notification and optionally send a push notification"""
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
    
    # Send push notification if enabled
    if send_push:
        try:
            from services.push_notifications import send_push_to_user
            push_data = data or {}
            push_data["notification_type"] = notif_type
            push_data["notification_id"] = notif_doc["notification_id"]
            await send_push_to_user(db, user_id, title, message, push_data, notif_type)
        except Exception as e:
            # Log but don't fail if push notification fails
            import logging
            logging.warning(f"Failed to send push notification: {e}")
    
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
    check_role_func=check_role,
    resend_api_key=os.environ.get("RESEND_API_KEY", "")
)

# Import and register modular routers AFTER dependencies are initialized
from routes import admin as admin_routes
from routes import marketplace as marketplace_routes
from routes import notifications as notifications_routes
from routes import messages as messages_routes
from routes import auth as auth_routes
from routes import subscription as subscription_routes
from routes import mom as mom_routes
from routes import doula as doula_routes
from routes import midwife as midwife_routes
from routes import contracts as contracts_routes

# Initialize contracts dependencies (for email sending)
contracts_routes.init_contracts_deps(
    resend_key=os.environ.get("RESEND_API_KEY", ""),
    sender_email=SENDER_EMAIL,
    notification_func=create_notification
)

from routes import invoices as invoices_routes
from routes import visits as visits_routes
from routes import care_plans as care_plans_routes
from routes import provider_unified as provider_unified_routes
from routes import appointments as appointments_routes
from routes import utils as utils_routes
from routes import push as push_routes
from routes import leads as leads_routes
from routes import feedback as feedback_routes

# Include modular routers in the api_router
api_router.include_router(admin_routes.router)
api_router.include_router(marketplace_routes.router)
api_router.include_router(notifications_routes.router)
api_router.include_router(messages_routes.router)
api_router.include_router(auth_routes.router)
api_router.include_router(subscription_routes.router)
api_router.include_router(mom_routes.router)
api_router.include_router(doula_routes.router)
api_router.include_router(midwife_routes.router)
api_router.include_router(contracts_routes.router)
api_router.include_router(invoices_routes.router)
api_router.include_router(visits_routes.router)
api_router.include_router(care_plans_routes.router)
api_router.include_router(provider_unified_routes.router)
api_router.include_router(appointments_routes.router)
api_router.include_router(utils_routes.router)
api_router.include_router(push_routes.router)
api_router.include_router(leads_routes.router)
api_router.include_router(feedback_routes.router)

# ============== AUTH ROUTES ==============
# MIGRATED TO: routes/auth.py
# Routes: /auth/register, /auth/login, /auth/google-session, /auth/me, /auth/logout, /auth/set-role, /auth/update-profile

# ============== ZIP CODE LOOKUP ==============
# MIGRATED TO: routes/utils.py
# Routes: /lookup/zipcode/{zipcode}

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

# ============== CARE PLAN ROUTES ==============
# MIGRATED TO: routes/care_plans.py
# Routes:
# - Birth Plan: /birth-plan, /birth-plan/section/{id}, /birth-plan/export, /birth-plan/export/pdf
# - Birth Plan Sharing: /birth-plan/share, /birth-plan/share-requests, /birth-plan/share/{id}
# - Provider Search: /providers/search
# - Provider Share Requests: /provider/share-requests, /provider/share-requests/{id}/respond
# - Provider Birth Plans: /provider/shared-birth-plans, /provider/shared-birth-plan/{id}, /provider/client/{id}/birth-plan, /provider/client/{id}/birth-plan/pdf
# - Provider Birth Plan Notes: /provider/birth-plan/{id}/notes, /provider/birth-plan-notes/{id}
# - Wellness: /wellness/checkin, /wellness/checkins, /wellness/entry, /wellness/entries, /wellness/stats
# - Postpartum: /postpartum/plan
# - Timeline: /timeline, /timeline/events, /timeline/events/{id}

# ============== WEEKLY TIPS & AFFIRMATIONS ==============
# MIGRATED TO: routes/utils.py
# Routes: /weekly-content, /weekly-content/all


# ============== DOULA ROUTES ==============
# MIGRATED TO: routes/doula.py
# Routes: /doula/onboarding, /doula/profile, /doula/dashboard, /doula/contract-defaults

# ============== DOULA CLIENT ROUTES ==============
# MIGRATED TO: routes/doula.py
# Routes: /doula/clients, /doula/clients/{client_id}

# ============== CONTRACT ROUTES ==============
# MIGRATED TO: routes/contracts.py
# Routes: All doula/midwife contracts, contract templates, contract defaults

# ============== INVOICE ROUTES ==============
# MIGRATED TO: routes/invoices.py
# Routes: Payment instructions templates, Doula invoices CRUD/send/mark-paid/cancel/reminder, Midwife invoices CRUD/send/mark-paid/cancel/reminder

# ============== MOM INVOICE VIEW ROUTES ==============
# MIGRATED TO: routes/mom.py
# Routes: /mom/invoices, /mom/invoices/{invoice_id}

# ============== DOULA NOTES ROUTES ==============
# MIGRATED TO: routes/doula.py
# Routes: /doula/notes (GET/POST), /doula/notes/{note_id} (PUT)

# ============== MIDWIFE ROUTES ==============
# MIGRATED TO: routes/midwife.py
# Routes: /midwife/onboarding, /midwife/profile, /midwife/dashboard, 
#         /midwife/clients (GET/POST), /midwife/clients/{id} (GET/PUT),
#         /midwife/notes (GET/POST)

# ============== DUPLICATE MIDWIFE ROUTES (BELOW) - TO BE REMOVED ==============
# These routes are already in routes/midwife.py

# ============== MIDWIFE CONTRACT DEFAULTS ==============
# MIGRATED TO: routes/contracts.py
# Routes: /midwife/contract-defaults (GET, PUT)

# ============== MIDWIFE CLIENT ROUTES ==============

# ============== VISIT ROUTES (MIDWIFE) ==============
# MIGRATED TO: routes/visits.py
# Routes: /midwife/visits, /midwife/visits/{visit_id}
# Routes: /midwife/clients/{client_id}/prenatal-visits (CRUD)
# Routes: /midwife/birth-summaries (GET/POST/PUT)

# ============== MIDWIFE NOTES ROUTES ==============

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

# ============== MESSAGING ROUTES ==============
# MIGRATED TO: routes/messages.py
# Routes: /messages/conversations, /messages/{other_user_id}, /messages, /messages/unread/count
# Note: /provider/clients/{client_id}/messages moved to /messages/client/{client_id}

# ============== UNIFIED PROVIDER ROUTES ==============
# These routes work for both DOULA and MIDWIFE using client_id as the central entity

# ============== PROVIDER VISITS ROUTES ==============
# MIGRATED TO: routes/visits.py
# Routes: /provider/visits (GET/POST), /provider/visits/{visit_id} (PUT/DELETE)

# ============== APPOINTMENT ROUTES ==============

# ============== MOM APPOINTMENTS ROUTES ==============
# MIGRATED TO: routes/mom.py
# Routes: /mom/appointments, /mom/team-providers

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
