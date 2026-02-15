from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

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
CLIENT_STATUS_MIDWIFE = ["Prenatal", "In Labor", "Postpartum", "Completed"]
CONTRACT_STATUS = ["Draft", "Sent", "Signed"]
INVOICE_STATUS = ["Draft", "Sent", "Paid", "Overdue"]
MOOD_SCALE = ["Very low", "Low", "Neutral", "Good", "Great"]
NOTE_TYPES = ["Prenatal", "Birth", "Postpartum"]
VISIT_TYPES = ["Prenatal", "Postpartum"]
BIRTH_MODES = ["Spontaneous Vaginal", "Assisted Vaginal", "Cesarean", "Other"]
SERVICES_OFFERED = ["Birth Doula", "Postpartum Doula", "Virtual Doula"]
MIDWIFE_CREDENTIALS = ["CPM", "LM", "CNM"]

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
    {"section_id": "monitoring_iv", "title": "Monitoring & IV / Saline Lock"},
    {"section_id": "induction_interventions", "title": "Induction & Birth Interventions"},
    {"section_id": "pushing_safe_word", "title": "Pushing & Safe Word"},
    {"section_id": "post_delivery", "title": "Post-Delivery Preferences"},
    {"section_id": "newborn_care", "title": "Newborn Care Preferences"},
    {"section_id": "other_considerations", "title": "Other Considerations"},
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
class ContractCreate(BaseModel):
    client_id: str
    contract_title: str
    services_description: Optional[str] = None
    total_fee: Optional[float] = None
    payment_schedule_description: Optional[str] = None
    cancellation_policy: Optional[str] = None
    scope_of_practice: Optional[str] = None

class Contract(BaseModel):
    contract_id: str
    doula_id: str
    client_id: str
    client_name: str
    contract_title: str
    services_description: Optional[str] = None
    total_fee: Optional[float] = None
    payment_schedule_description: Optional[str] = None
    cancellation_policy: Optional[str] = None
    scope_of_practice: Optional[str] = None
    status: str = "Draft"
    signature_data: Optional[str] = None  # Mock signature
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
    note: Optional[str] = None

class Visit(BaseModel):
    visit_id: str
    midwife_id: str
    client_id: str
    visit_date: str
    visit_type: str
    gestational_age: Optional[str] = None
    blood_pressure: Optional[str] = None
    weight: Optional[str] = None
    fetal_heart_rate: Optional[str] = None
    note: Optional[str] = None
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

# --- Admin Content Models ---
class AdminContent(BaseModel):
    content_id: str
    section_id: str
    explanatory_text: Optional[str] = None
    video_url: Optional[str] = None
    updated_by: str
    updated_at: datetime

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
            "created_at": now,
            "updated_at": now
        }
        await db.birth_plans.insert_one(plan)
    return plan

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
    
    await db.birth_plans.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "sections": sections,
            "completion_percentage": completion_percentage,
            "updated_at": now
        }}
    )
    
    return {"message": "Section updated", "completion_percentage": completion_percentage}

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

# ============== WELLNESS ROUTES ==============

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
    
    plan_data = {
        "plan_id": f"postpartum_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "visitor_preferences": body.get("visitor_preferences"),
        "feeding_preferences": body.get("feeding_preferences"),
        "sleep_boundaries": body.get("sleep_boundaries"),
        "mental_health_concerns": body.get("mental_health_concerns"),
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

# ============== DOULA ROUTES ==============

@api_router.post("/doula/onboarding")
async def doula_onboarding(profile_data: DoulaProfileUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Complete doula onboarding"""
    now = datetime.now(timezone.utc)
    
    doula_profile = {
        "user_id": user.user_id,
        "practice_name": profile_data.practice_name,
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

@api_router.post("/doula/contracts")
async def create_contract(contract_data: ContractCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new contract"""
    # Get client name
    client = await db.clients.find_one({"client_id": contract_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    contract = {
        "contract_id": f"contract_{uuid.uuid4().hex[:12]}",
        "doula_id": user.user_id,
        "client_id": contract_data.client_id,
        "client_name": client["name"],
        "contract_title": contract_data.contract_title,
        "services_description": contract_data.services_description,
        "total_fee": contract_data.total_fee,
        "payment_schedule_description": contract_data.payment_schedule_description,
        "cancellation_policy": contract_data.cancellation_policy,
        "scope_of_practice": contract_data.scope_of_practice,
        "status": "Draft",
        "signature_data": None,
        "signed_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.contracts.insert_one(contract)
    return contract

@api_router.put("/doula/contracts/{contract_id}")
async def update_contract(contract_id: str, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Update a contract"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["contract_id", "doula_id", "created_at"]}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.contracts.update_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract updated"}

@api_router.post("/doula/contracts/{contract_id}/send")
async def send_contract(contract_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send contract for signature (mock)"""
    now = datetime.now(timezone.utc)
    
    result = await db.contracts.update_one(
        {"contract_id": contract_id, "doula_id": user.user_id},
        {"$set": {"status": "Sent", "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Update client status
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if contract:
        await db.clients.update_one(
            {"client_id": contract["client_id"]},
            {"$set": {"status": "Contract Sent", "updated_at": now}}
        )
    
    return {"message": "Contract sent (mocked)", "note": "In production, this would send an email with signing link"}

@api_router.post("/doula/contracts/{contract_id}/sign")
async def sign_contract(contract_id: str, request: Request):
    """Sign a contract (mock signature)"""
    body = await request.json()
    signature_data = body.get("signature_data", "mock_signature")
    
    now = datetime.now(timezone.utc)
    
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    await db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "status": "Signed",
            "signature_data": signature_data,
            "signed_at": now,
            "updated_at": now
        }}
    )
    
    # Update client status
    await db.clients.update_one(
        {"client_id": contract["client_id"]},
        {"$set": {"status": "Contract Signed", "updated_at": now}}
    )
    
    return {"message": "Contract signed (mocked)"}

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
    """Create a new visit"""
    now = datetime.now(timezone.utc)
    
    visit = {
        "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": visit_data.client_id,
        "visit_date": visit_data.visit_date,
        "visit_type": visit_data.visit_type,
        "gestational_age": visit_data.gestational_age,
        "blood_pressure": visit_data.blood_pressure,
        "weight": visit_data.weight,
        "fetal_heart_rate": visit_data.fetal_heart_rate,
        "note": visit_data.note,
        "created_at": now,
        "updated_at": now
    }
    
    await db.visits.insert_one(visit)
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
            default_content.append(item)
            await db.admin_content.insert_one(item)
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
