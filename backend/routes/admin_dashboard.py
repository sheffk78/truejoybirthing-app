"""
Admin Dashboard Routes Module

Handles admin dashboard statistics, user search, user detail, and auth endpoints.
Follows the same patterns as admin.py.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from .dependencies import db, get_now, get_current_user, check_role, User, verify_password

router = APIRouter(prefix="/admin/api/dashboard", tags=["Admin Dashboard"])

ROLES = ["MOM", "DOULA", "MIDWIFE", "ADMIN"]


# ============== REQUEST MODELS ==============

class AdminLoginRequest(BaseModel):
    email: str
    password: str


# ============== AUTH ROUTES ==============

@router.post("/auth/login")
async def admin_login(request: AdminLoginRequest):
    """Admin login endpoint. Verifies credentials and checks ADMIN role.
    Returns a session token for subsequent API calls."""
    # Find user by email
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0, "password_hash": 1, "user_id": 1, "email": 1, "full_name": 1, "role": 1, "onboarding_completed": 1})

    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Please use Google login for this account")

    if not verify_password(request.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user_doc.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    # Create session token (same mechanism as mobile app auth)
    import uuid
    from datetime import datetime, timezone, timedelta

    session_token = f"session_{uuid.uuid4().hex}"
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=7)

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_doc["user_id"],
        "created_at": now,
        "expires_at": expires,
    })

    return {
        "access_token": session_token,
        "token_type": "bearer",
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "full_name": user_doc.get("full_name"),
            "role": user_doc.get("role"),
        }
    }


# ============== HELPER FUNCTIONS ==============

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict, handling ObjectId."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc


# ============== ROUTES ==============

@router.get("/stats")
async def get_dashboard_stats(user: User = Depends(check_role(["ADMIN"]))):
    """Get dashboard overview statistics (admin only)."""
    now = get_now()

    # Total users
    total_users = await db.users.count_documents({})

    # Users by role
    users_by_role = {}
    for role in ROLES:
        count = await db.users.count_documents({"role": role})
        users_by_role[role] = count

    # Subscription breakdown (exclude MOMs - they have free access)
    subscription_statuses = ["trial", "active", "expired", "cancelled"]
    subscription_breakdown = {}
    for status in subscription_statuses:
        count = await db.subscriptions.count_documents({"subscription_status": status})
        subscription_breakdown[status] = count

    # Signups in last 7 and 30 days
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    signups_last_7_days = await db.users.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    signups_last_30_days = await db.users.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })

    # Trial conversion rate:
    # Percentage of users whose subscription_status moved from "expired" to "active"
    # We consider: users who had a trial that expired AND then got an active subscription
    expired_trials = await db.subscriptions.count_documents({"subscription_status": "expired"})
    active_from_expired = await db.subscriptions.count_documents({
        "subscription_status": "active",
        "trial_start_date": {"$ne": None}
    })

    if expired_trials > 0:
        trial_conversion_rate = round((active_from_expired / (expired_trials + active_from_expired)) * 100, 2)
    else:
        trial_conversion_rate = None

    return {
        "total_users": total_users,
        "users_by_role": users_by_role,
        "subscription_breakdown": subscription_breakdown,
        "signups_last_7_days": signups_last_7_days,
        "signups_last_30_days": signups_last_30_days,
        "trial_conversion_rate": trial_conversion_rate,
    }


@router.get("/signup-trend")
async def get_signup_trend(user: User = Depends(check_role(["ADMIN"]))):
    """Get daily signup counts for the last 30 days with role breakdown (admin only)."""
    now = get_now()
    thirty_days_ago = now - timedelta(days=30)

    # Set thirty_days_ago to start of that day
    start_date = thirty_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    # Aggregate signups by day and role
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date}
            }
        },
        {
            "$group": {
                "_id": {
                    "date": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "role": "$role"
                },
                "count": {"$sum": 1}
            }
        }
    ]

    results = await db.users.aggregate(pipeline).to_list(1000)

    # Build date-to-data mapping
    trend_data = {}
    for item in results:
        date_str = item["_id"]["date"]
        role = item["_id"]["role"]
        count = item["count"]

        if date_str not in trend_data:
            trend_data[date_str] = {"date": date_str, "total": 0, "MOM": 0, "DOULA": 0, "MIDWIFE": 0, "ADMIN": 0}

        if role in ROLES:
            trend_data[date_str][role] = count
        trend_data[date_str]["total"] += count

    # Fill in missing dates with zero counts
    output = []
    current_date = start_date
    while current_date <= now:
        date_str = current_date.strftime("%Y-%m-%d")
        if date_str in trend_data:
            output.append(trend_data[date_str])
        else:
            output.append({
                "date": date_str,
                "total": 0,
                "MOM": 0,
                "DOULA": 0,
                "MIDWIFE": 0,
                "ADMIN": 0,
            })
        current_date += timedelta(days=1)

    # Sort by date
    output.sort(key=lambda x: x["date"])

    return output


@router.get("/users")
async def get_dashboard_users(
    q: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    subscription_status: Optional[str] = Query(None, description="Filter by subscription status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    user: User = Depends(check_role(["ADMIN"])),
):
    """Get paginated user list with search and filters (admin only)."""
    # Build query
    query = {}

    # Text search on name/email
    if q:
        query["$or"] = [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]

    # Role filter
    if role:
        if role not in ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {ROLES}")
        query["role"] = role

    # Subscription status filter - needs to join with subscriptions collection
    user_ids_with_sub_status = None
    if subscription_status:
        valid_statuses = ["trial", "active", "expired", "cancelled", "none"]
        if subscription_status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid subscription status. Must be one of: {valid_statuses}"
            )

        if subscription_status == "none":
            # Users with no subscription record at all (MOMs typically)
            sub_users = await db.subscriptions.distinct("user_id")
            query["user_id"] = {"$nin": sub_users}
        else:
            sub_users = await db.subscriptions.distinct(
                "user_id",
                {"subscription_status": subscription_status}
            )
            query["user_id"] = {"$in": sub_users}

    # Count total matching documents
    total = await db.users.count_documents(query)

    # Calculate pagination
    skip = (page - 1) * limit
    total_pages = max(1, (total + limit - 1) // limit)

    # Fetch users (exclude sensitive fields)
    users = await db.users.find(
        query,
        {"_id": 0, "password_hash": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Enrich each user with their subscription status
    user_ids = [u["user_id"] for u in users]
    subscriptions = await db.subscriptions.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0}
    ).to_list(len(user_ids))

    # Build subscription lookup
    sub_lookup = {}
    for sub in subscriptions:
        sub_lookup[sub["user_id"]] = sub.get("subscription_status", "none")

    # Attach subscription status to each user
    for u in users:
        u["subscription_status"] = sub_lookup.get(u["user_id"], "none")

    return {
        "users": serialize_doc(users),
        "total": total,
        "page": page,
        "total_pages": total_pages,
    }


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, user: User = Depends(check_role(["ADMIN"]))):
    """Get detailed user profile including role-specific data and subscription info (admin only)."""
    # Fetch the user
    user_data = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )

    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch subscription data
    subscription = await db.subscriptions.find_one(
        {"user_id": user_id},
        {"_id": 0}
    )

    user_data["subscription"] = serialize_doc(subscription) if subscription else None

    # Fetch role-specific profile
    role = user_data.get("role", "")
    profile_data = None

    if role == "MOM":
        profile_data = await db.mom_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
    elif role == "DOULA":
        profile_data = await db.doula_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
    elif role == "MIDWIFE":
        profile_data = await db.midwife_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )

    user_data["profile"] = serialize_doc(profile_data) if profile_data else None

    return serialize_doc(user_data)