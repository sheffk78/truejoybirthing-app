"""
Shared Dependencies for Route Modules

This module provides a centralized way to access shared dependencies
(database, authentication, utilities) across all route modules.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Callable, List
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt
from fastapi import Request, HTTPException, Depends
from pydantic import BaseModel
import uuid
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.client_utils import is_client_active, calculate_client_active_status

# Global references - initialized by init_dependencies()
db: Optional[AsyncIOMotorDatabase] = None
pwd_context: Optional[CryptContext] = None
SECRET_KEY: str = ""
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS: int = 7

# Utility functions
create_notification: Optional[Callable] = None
send_notification_email: Optional[Callable] = None
ws_manager = None

# Resend config
SENDER_EMAIL: str = ""
RESEND_API_KEY: str = ""

# Auth function references (set during init)
_get_current_user: Optional[Callable] = None
_check_role: Optional[Callable] = None


class User(BaseModel):
    """User model for auth - mirrors server.py User model"""
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    picture: Optional[str] = None
    onboarding_completed: Optional[bool] = False


def init_dependencies(
    database: AsyncIOMotorDatabase,
    password_context: CryptContext,
    secret_key: str,
    algorithm: str,
    expire_days: int,
    notification_func: Callable,
    email_func: Callable,
    websocket_manager,
    sender_email: str,
    get_current_user_func: Callable = None,
    check_role_func: Callable = None,
    resend_api_key: str = ""
):
    """
    Initialize shared dependencies from the main server module.
    Called once at application startup.
    """
    global db, pwd_context, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_DAYS
    global create_notification, send_notification_email, ws_manager, SENDER_EMAIL, RESEND_API_KEY
    global _get_current_user, _check_role
    
    db = database
    pwd_context = password_context
    SECRET_KEY = secret_key
    ALGORITHM = algorithm
    ACCESS_TOKEN_EXPIRE_DAYS = expire_days
    create_notification = notification_func
    send_notification_email = email_func
    ws_manager = websocket_manager
    SENDER_EMAIL = sender_email
    RESEND_API_KEY = resend_api_key
    _get_current_user = get_current_user_func
    _check_role = check_role_func


def get_current_user():
    """Get the current user dependency - delegated to main server"""
    if _get_current_user is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return _get_current_user


def check_role(required_roles: List[str]):
    """Get role checker dependency - delegated to main server"""
    if _check_role is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return _check_role(required_roles)


def generate_id(prefix: str = "id") -> str:
    """Generate a unique ID with the given prefix"""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def get_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


# ============== FASTAPI DEPENDENCY FUNCTIONS ==============
# These functions return dependency callables for use with Depends()

def get_db():
    """FastAPI dependency to get the database"""
    if db is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return db


def get_current_user_dep():
    """FastAPI dependency to get the current user function"""
    if _get_current_user is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return _get_current_user


def check_role_dep():
    """FastAPI dependency to get the check_role function"""
    if _check_role is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return _check_role


def get_notification_func():
    """FastAPI dependency to get the notification function"""
    if create_notification is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return create_notification


def get_email_func():
    """FastAPI dependency to get the email function"""
    # Can be None if not configured - return the function anyway
    return send_notification_email


def get_ws_manager():
    """FastAPI dependency to get the WebSocket manager"""
    if ws_manager is None:
        raise RuntimeError("Dependencies not initialized. Call init_dependencies first.")
    return ws_manager
