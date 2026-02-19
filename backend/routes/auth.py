"""
Authentication Routes
Handles user registration, login, profile management
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx

router = APIRouter(prefix="/auth", tags=["auth"])

# Store for dependencies (set at registration)
_db = None
_pwd_context = None
_create_access_token = None
_get_current_user = None
_SECRET_KEY = None
_ALGORITHM = None
_ACCESS_TOKEN_EXPIRE_DAYS = None


def init_routes(db, pwd_context, create_access_token, get_current_user, 
                secret_key, algorithm, access_token_expire_days):
    """Initialize routes with dependencies from main app"""
    global _db, _pwd_context, _create_access_token, _get_current_user
    global _SECRET_KEY, _ALGORITHM, _ACCESS_TOKEN_EXPIRE_DAYS
    _db = db
    _pwd_context = pwd_context
    _create_access_token = create_access_token
    _get_current_user = get_current_user
    _SECRET_KEY = secret_key
    _ALGORITHM = algorithm
    _ACCESS_TOKEN_EXPIRE_DAYS = access_token_expire_days


# Request models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    code: str


class SetRoleRequest(BaseModel):
    role: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    picture: Optional[str] = None


@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new user with email and password"""
    # Check if email exists
    existing = await _db.users.find_one({"email": req.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc)
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Hash password
    hashed_password = _pwd_context.hash(req.password)
    
    # Determine initial role
    role = None
    if req.role and req.role.upper() in ["MOM", "DOULA", "MIDWIFE", "ADMIN"]:
        role = req.role.upper()
    
    user = {
        "user_id": user_id,
        "email": req.email.lower(),
        "password_hash": hashed_password,
        "full_name": req.full_name,
        "role": role,
        "auth_provider": "email",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await _db.users.insert_one(user)
    
    # Generate token
    token_data = {
        "user_id": user_id,
        "email": req.email.lower(),
        "role": role
    }
    access_token = _create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "email": req.email.lower(),
            "full_name": req.full_name,
            "role": role
        }
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Login with email and password"""
    user = await _db.users.find_one({"email": req.email.lower()})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google Sign-In")
    
    if not _pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token_data = {
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user.get("role")
    }
    access_token = _create_access_token(token_data)
    
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
async def google_session(req: GoogleSessionRequest, request: Request):
    """
    Handle Google OAuth session from Emergent Auth.
    Exchange code for user info and create/update user.
    """
    try:
        # Get host for callback URL
        host = request.headers.get("host", "localhost:8001")
        protocol = "https" if "preview.emergentagent.com" in host else "http"
        redirect_uri = f"{protocol}://{host}/auth/callback"
        
        # Exchange code with Google
        token_response = await exchange_google_code(req.code, redirect_uri)
        
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
        
        now = datetime.now(timezone.utc)
        
        # Find or create user
        user = await _db.users.find_one({"$or": [{"email": email}, {"google_id": google_id}]})
        
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
            
            await _db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": update_data}
            )
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
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
            await _db.users.insert_one(user)
        
        # Generate our JWT token
        token_data = {
            "user_id": user["user_id"],
            "email": email,
            "role": user.get("role")
        }
        jwt_token = _create_access_token(token_data)
        
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


async def exchange_google_code(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for tokens"""
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        # Return mock response for development
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


@router.get("/me")
async def get_current_user_info(user = Depends(lambda: None)):
    """Get current user info. Dependency is injected at registration."""
    # This will be overridden when the route is registered
    pass


@router.post("/logout")
async def logout():
    """Logout - client should discard the token"""
    return {"message": "Logged out successfully"}


@router.put("/set-role")
async def set_user_role(req: SetRoleRequest, user = Depends(lambda: None)):
    """Set user role (MOM, DOULA, MIDWIFE)"""
    # This will be overridden when the route is registered
    pass


@router.put("/update-profile")
async def update_user_profile(req: UpdateProfileRequest, user = Depends(lambda: None)):
    """Update user profile"""
    # This will be overridden when the route is registered
    pass
