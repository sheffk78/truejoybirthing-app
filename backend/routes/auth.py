"""
Authentication Routes Module

Handles user registration, login, Google OAuth, session management, and profile updates.
Feature parity with original server.py auth routes.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx

from .dependencies import (
    db, get_now, get_current_user, verify_password, get_password_hash,
    generate_id, ACCESS_TOKEN_EXPIRE_DAYS, User
)
from ensure_demo_accounts import is_demo_account, ensure_demo_accounts

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Valid roles
ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]


# ============== REQUEST MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    full_name: str
    role: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ============== HELPER FUNCTIONS ==============

def generate_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


async def create_session(user_id: str, response: Response) -> str:
    """Create a new session and set cookie"""
    now = get_now()
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
    
    return session_token


# ============== ROUTES ==============

@router.post("/register")
async def register(user_data: UserCreate, response: Response):
    """Register with email/password"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not user_data.password:
        raise HTTPException(status_code=400, detail="Password required for registration")
    
    user_id = generate_user_id()
    now = get_now()
    
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
    session_token = await create_session(user_id, response)
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "onboarding_completed": False,
        "session_token": session_token
    }


@router.post("/login")
async def login(login_data: UserLogin, response: Response):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    if not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = await create_session(user_doc["user_id"], response)
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "full_name": user_doc["full_name"],
        "role": user_doc["role"],
        "picture": user_doc.get("picture"),
        "onboarding_completed": user_doc.get("onboarding_completed", False),
        "session_token": session_token
    }


@router.post("/google-session")
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
    
    now = get_now()
    
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
    session_token = await create_session(user_id, response)
    
    return {
        "user_id": user_id,
        "email": email,
        "full_name": name,
        "role": role,
        "picture": picture,
        "onboarding_completed": onboarding_completed,
        "session_token": session_token
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user())):
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


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}


@router.put("/set-role")
async def set_role(request: Request, user: User = Depends(get_current_user())):
    """Set user role during onboarding"""
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ROLES}")
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": new_role, "updated_at": get_now()}}
    )
    
    return {"message": "Role updated", "role": new_role}


@router.put("/update-profile")
async def update_profile(request: Request, user: User = Depends(get_current_user())):
    """Update user profile (picture, name, etc.)"""
    body = await request.json()
    
    update_data = {}
    if "picture" in body:
        update_data["picture"] = body["picture"]
    if "full_name" in body:
        update_data["full_name"] = body["full_name"]
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_data["updated_at"] = get_now()
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated", **update_data}


@router.delete("/delete-account")
async def delete_account(user: User = Depends(get_current_user())):
    """Permanently delete user account and all associated data.
    Required by Apple App Store Guideline 5.1.1(v).
    """
    user_id = user.user_id
    
    # Delete user record and sessions
    await db.users.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Delete subscription
    await db.subscriptions.delete_many({"user_id": user_id})
    
    # Delete role-specific profiles
    await db.mom_profiles.delete_many({"user_id": user_id})
    await db.doula_profiles.delete_many({"user_id": user_id})
    await db.midwife_profiles.delete_many({"user_id": user_id})
    
    # Delete provider-related data
    await db.clients.delete_many({"provider_id": user_id})
    await db.notes.delete_many({"provider_id": user_id})
    
    # Delete messages (sent or received)
    await db.messages.delete_many(
        {"$or": [{"sender_id": user_id}, {"recipient_id": user_id}]}
    )
    
    # Delete invoices and contracts (as provider or client)
    await db.invoices.delete_many(
        {"$or": [{"provider_id": user_id}, {"client_user_id": user_id}]}
    )
    await db.contracts.delete_many(
        {"$or": [{"provider_id": user_id}, {"client_user_id": user_id}]}
    )
    
    # Delete appointments
    await db.appointments.delete_many(
        {"$or": [{"provider_id": user_id}, {"client_user_id": user_id}]}
    )
    
    # Delete birth plans and notifications
    await db.birth_plans.delete_many({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})

    # Re-create demo accounts after deletion so they remain available for Apple review
    if is_demo_account(user.email):
        await ensure_demo_accounts(db)

    return {"message": "Account and all associated data have been permanently deleted"}
