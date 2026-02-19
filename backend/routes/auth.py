"""
Authentication Routes Module

Handles user registration, login, session management, and profile updates.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx

from .dependencies import (
    db, pwd_context, create_access_token, verify_password, 
    get_password_hash, generate_id, get_now, SECRET_KEY, ALGORITHM
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============== REQUEST MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ============== HELPER FUNCTIONS ==============

async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for tokens"""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        return {"access_token": "mock_token"}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }
        )
        return response.json()


async def get_google_user_info(access_token: str) -> dict:
    """Get user info from Google"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        return response.json()


# ============== ROUTES ==============

@router.post("/register")
async def register(user_data: UserCreate, response: Response):
    """Register a new user with email and password"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = get_now()
    user_id = generate_id("user")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Determine initial role
    role = None
    if user_data.role and user_data.role.upper() in ["MOM", "DOULA", "MIDWIFE", "ADMIN"]:
        role = user_data.role.upper()
    
    user = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "password_hash": hashed_password,
        "full_name": user_data.full_name,
        "role": role,
        "auth_provider": "email",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user)
    
    # Generate token
    token_data = {
        "user_id": user_id,
        "email": user_data.email.lower(),
        "role": role
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "email": user_data.email.lower(),
            "full_name": user_data.full_name,
            "role": role
        }
    }


@router.post("/login")
async def login(login_data: UserLogin, response: Response):
    """Login with email and password"""
    user = await db.users.find_one({"email": login_data.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google Sign-In")
    
    if not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token_data = {
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user.get("role")
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user.get("full_name"),
            "role": user.get("role"),
            "picture": user.get("picture"),
            "is_onboarded": user.get("is_onboarded", False),
            "subscription_status": user.get("subscription_status", "none")
        }
    }


@router.post("/google-session")
async def process_google_session(request: Request, response: Response):
    """
    Handle Google OAuth session from Emergent Auth.
    Exchange code for user info and create/update user.
    """
    try:
        body = await request.json()
        code = body.get("code")
        
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code required")
        
        # Get host for callback URL
        host = request.headers.get("host", "localhost:8001")
        protocol = "https" if "preview.emergentagent.com" in host else "http"
        redirect_uri = f"{protocol}://{host}/auth/callback"
        
        # Exchange code with Google
        token_response = await exchange_google_code(code, redirect_uri)
        
        if "error" in token_response:
            raise HTTPException(status_code=401, detail=token_response.get("error_description", "Failed to exchange code"))
        
        access_token = token_response.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token received")
        
        # Get user info from Google
        user_info = await get_google_user_info(access_token)
        
        if "error" in user_info:
            raise HTTPException(status_code=401, detail="Failed to get user info from Google")
        
        email = user_info.get("email", "").lower()
        google_id = user_info.get("id")
        full_name = user_info.get("name", "")
        picture = user_info.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="No email found in Google account")
        
        now = get_now()
        
        # Find or create user
        user = await db.users.find_one({"$or": [{"email": email}, {"google_id": google_id}]})
        
        if user:
            # Update existing user
            update_data = {
                "google_id": google_id,
                "updated_at": now,
                "last_login": now
            }
            if picture and not user.get("picture"):
                update_data["picture"] = picture
            if full_name and not user.get("full_name"):
                update_data["full_name"] = full_name
            
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": update_data}
            )
        else:
            # Create new user
            user_id = generate_id("user")
            user = {
                "user_id": user_id,
                "email": email,
                "google_id": google_id,
                "full_name": full_name,
                "picture": picture,
                "role": None,
                "auth_provider": "google",
                "is_active": True,
                "created_at": now,
                "updated_at": now,
                "last_login": now
            }
            await db.users.insert_one(user)
        
        # Generate our JWT token
        token_data = {
            "user_id": user["user_id"],
            "email": email,
            "role": user.get("role")
        }
        jwt_token = create_access_token(token_data)
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "user_id": user["user_id"],
                "email": email,
                "full_name": user.get("full_name") or full_name,
                "picture": user.get("picture") or picture,
                "role": user.get("role"),
                "is_onboarded": user.get("is_onboarded", False),
                "subscription_status": user.get("subscription_status", "none")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout - client should discard the token"""
    return {"message": "Logged out successfully"}
