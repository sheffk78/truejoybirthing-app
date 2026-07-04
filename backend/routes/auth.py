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
import random
import logging
import httpx

from .dependencies import (
    db, get_now, get_current_user, verify_password, get_password_hash,
    generate_id, ACCESS_TOKEN_EXPIRE_DAYS, User
)
from ensure_demo_accounts import is_demo_account, ensure_demo_accounts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Valid roles
ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]


# ============== REQUEST MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    full_name: str
    role: Optional[str] = None
    invite_id: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


# Password reset config
RESET_CODE_EXPIRY_MINUTES = 15
VERIFICATION_CODE_EXPIRY_MINUTES = 15


# ============== HELPER FUNCTIONS ==============

def generate_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


async def check_rate_limit(request: Request, endpoint_name: str, max_requests: int, window_seconds: int):
    """Simple MongoDB-based rate limiter."""
    ip = request.client.host if request.client else "unknown"
    now = get_now()
    window_start = now - timedelta(seconds=window_seconds)
    
    count = await db.rate_limits.count_documents({
        "ip": ip,
        "endpoint": endpoint_name,
        "timestamp": {"$gte": window_start}
    })
    
    if count >= max_requests:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    await db.rate_limits.insert_one({
        "ip": ip,
        "endpoint": endpoint_name,
        "timestamp": now
    })


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


async def try_redeem_invite(invite_id: Optional[str], user_id: str):
    """Best-effort invite redemption after signup. Never raises — logs on failure."""
    if not invite_id:
        return
    try:
        from routes.invites import redeem_invite
        await redeem_invite(invite_id, user_id)
    except ImportError:
        logger.warning("routes.invites module not available — skipping invite redemption")
    except Exception as e:
        logger.error(f"Failed to redeem invite {invite_id} for user {user_id}: {e}")


# ============== ROUTES ==============

@router.post("/register")
async def register(user_data: UserCreate, request: Request, response: Response):
    """Register with email/password"""
    await check_rate_limit(request, "register", 5, 3600)
    
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
        "email_verified": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # Generate and store a 6-digit verification code
    code = f"{random.randint(0, 999999):06d}"
    await db.email_verifications.delete_many({"email": user_data.email})
    await db.email_verifications.insert_one({
        "email": user_data.email,
        "user_id": user_id,
        "code": code,
        "expires_at": now + timedelta(minutes=VERIFICATION_CODE_EXPIRY_MINUTES),
        "created_at": now,
        "used": False,
    })
    
    # Send verification email
    try:
        from services.email_service import send_verification_email
        await send_verification_email(
            to_email=user_data.email,
            user_name=user_data.full_name,
            code=code,
            expiry_minutes=VERIFICATION_CODE_EXPIRY_MINUTES,
        )
    except Exception as e:
        logger.error(f"Failed to send verification email to {user_data.email}: {e}")
    
    # Best-effort invite redemption — never blocks signup
    await try_redeem_invite(user_data.invite_id, user_id)
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "needs_verification": True
    }


@router.post("/login")
async def login(login_data: UserLogin, request: Request, response: Response):
    """Login with email/password"""
    await check_rate_limit(request, "login", 10, 60)
    
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")
    
    if not verify_password(login_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if email is verified
    if not user_doc.get("email_verified", False):
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")
    
    # Create session
    session_token = await create_session(user_doc["user_id"], response)
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "full_name": user_doc["full_name"],
        "role": user_doc["role"],
        "picture": user_doc.get("picture"),
        "onboarding_completed": user_doc.get("onboarding_completed", False),
        "email_verified": True,
        "session_token": session_token
    }


@router.post("/google-session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session_id and create user session"""
    body = await request.json()
    session_id = body.get("session_id")
    invite_id = body.get("invite_id")
    
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
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    
    now = get_now()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info — Google already verified the email
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "full_name": name or existing_user.get("full_name"),
                "picture": picture,
                "email_verified": True,
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
            "email_verified": True,  # Google already verified
            "created_at": now,
            "updated_at": now
        }
        await db.users.insert_one(user_doc)
        role = "MOM"
        onboarding_completed = False
    
    # Create session
    session_token = await create_session(user_id, response)
    
    # Best-effort invite redemption — never blocks signup (new users only)
    if not existing_user:
        await try_redeem_invite(invite_id, user_id)
    
    return {
        "user_id": user_id,
        "email": email,
        "full_name": name,
        "role": role,
        "picture": picture,
        "onboarding_completed": onboarding_completed,
        "email_verified": True,
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
        "tutorial_completed": user.tutorial_completed,
        "email_verified": getattr(user, "email_verified", True),
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
    """Update user profile (picture, name, onboarding status, etc.)"""
    body = await request.json()
    
    update_data = {}
    if "picture" in body:
        update_data["picture"] = body["picture"]
    if "full_name" in body:
        update_data["full_name"] = body["full_name"]
    if "onboarding_completed" in body:
        update_data["onboarding_completed"] = body["onboarding_completed"]
    if "tutorial_completed" in body:
        update_data["tutorial_completed"] = body["tutorial_completed"]
    
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


# ============== PASSWORD RESET ==============

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Request a password reset code. Always returns success to prevent user enumeration."""
    await check_rate_limit(request, "forgot-password", 3, 3600)
    
    now = get_now()

    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})

    if user_doc:
        # Generate a 6-digit code
        code = f"{random.randint(0, 999999):06d}"

        # Store the reset code
        await db.password_resets.delete_many({"email": data.email})
        await db.password_resets.insert_one({
            "email": data.email,
            "user_id": user_doc["user_id"],
            "code": code,
            "expires_at": now + timedelta(minutes=RESET_CODE_EXPIRY_MINUTES),
            "created_at": now,
            "used": False,
        })

        # Send the email
        try:
            from services.email_service import send_password_reset_email
            await send_password_reset_email(
                to_email=data.email,
                user_name=user_doc.get("full_name", ""),
                reset_code=code,
                expiry_minutes=RESET_CODE_EXPIRY_MINUTES,
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email to {data.email}: {e}")

    # Always return success to prevent user enumeration
    return {"message": "If an account with that email exists, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using a valid reset code."""
    now = get_now()

    # Find the reset record
    reset_doc = await db.password_resets.find_one({
        "email": data.email,
        "code": data.code,
        "used": False,
    })

    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    if reset_doc["expires_at"] < now:
        # Clean up expired code
        await db.password_resets.delete_one({"_id": reset_doc["_id"]})
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Update the user's password
    new_hash = get_password_hash(data.new_password)
    result = await db.users.update_one(
        {"email": data.email},
        {"$set": {"password_hash": new_hash, "updated_at": now}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update password")

    # Mark the reset code as used and clean up
    await db.password_resets.delete_many({"email": data.email})

    return {"message": "Password has been reset successfully. You can now log in with your new password."}


# ============== EMAIL VERIFICATION ==============

@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, response: Response):
    """Verify email with a 6-digit code."""
    now = get_now()
    
    verification_doc = await db.email_verifications.find_one({
        "email": data.email,
        "code": data.code,
        "used": False,
    })
    
    if not verification_doc:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if verification_doc["expires_at"] < now:
        await db.email_verifications.delete_one({"_id": verification_doc["_id"]})
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
    
    # Mark user as verified
    result = await db.users.update_one(
        {"email": data.email},
        {"$set": {"email_verified": True, "updated_at": now}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to verify email")
    
    # Mark code as used and clean up
    await db.email_verifications.delete_many({"email": data.email})
    
    # Get user and create session
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    session_token = await create_session(user_doc["user_id"], response)
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "full_name": user_doc["full_name"],
        "role": user_doc["role"],
        "onboarding_completed": user_doc.get("onboarding_completed", False),
        "email_verified": True,
        "session_token": session_token
    }


@router.post("/resend-verification")
async def resend_verification(data: ResendVerificationRequest, request: Request):
    """Resend email verification code. Always returns success to prevent enumeration."""
    await check_rate_limit(request, "resend-verification", 3, 3600)
    
    now = get_now()
    user_doc = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    if user_doc and not user_doc.get("email_verified", False):
        code = f"{random.randint(0, 999999):06d}"
        await db.email_verifications.delete_many({"email": data.email})
        await db.email_verifications.insert_one({
            "email": data.email,
            "user_id": user_doc["user_id"],
            "code": code,
            "expires_at": now + timedelta(minutes=VERIFICATION_CODE_EXPIRY_MINUTES),
            "created_at": now,
            "used": False,
        })
        try:
            from services.email_service import send_verification_email
            await send_verification_email(
                to_email=data.email,
                user_name=user_doc.get("full_name", ""),
                code=code,
                expiry_minutes=VERIFICATION_CODE_EXPIRY_MINUTES,
            )
        except Exception as e:
            logger.error(f"Failed to send verification email to {data.email}: {e}")
    
    return {"message": "If an account with that email exists, a verification code has been sent."}
