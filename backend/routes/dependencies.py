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
import uuid

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


def init_dependencies(
    database: AsyncIOMotorDatabase,
    password_context: CryptContext,
    secret_key: str,
    algorithm: str,
    expire_days: int,
    notification_func: Callable,
    email_func: Callable,
    websocket_manager,
    sender_email: str
):
    """
    Initialize shared dependencies from the main server module.
    Called once at application startup.
    """
    global db, pwd_context, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_DAYS
    global create_notification, send_notification_email, ws_manager, SENDER_EMAIL
    
    db = database
    pwd_context = password_context
    SECRET_KEY = secret_key
    ALGORITHM = algorithm
    ACCESS_TOKEN_EXPIRE_DAYS = expire_days
    create_notification = notification_func
    send_notification_email = email_func
    ws_manager = websocket_manager
    SENDER_EMAIL = sender_email


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
