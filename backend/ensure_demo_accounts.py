"""
Ensure Demo Accounts Exist on Server Startup

This module guarantees that demo accounts used for Apple App Store review
are always present and functional. It runs on every server startup and:

1. Creates demo accounts if they don't exist
2. Resets password hashes if they exist (in case they were changed)
3. Ensures all required flags are set (onboarding_completed, is_demo_account)
4. Ensures provider accounts have active subscriptions
5. Marks accounts with is_demo_account=True for bypass logic

Demo Accounts:
    - Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
    - Mom: demo.mom@truejoybirthing.com / DemoMom2024!
"""

import logging
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import uuid

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Demo account definitions — passwords MUST match what Apple reviewers use
DEMO_ACCOUNTS = [
    {
        "email": "demo.midwife@truejoybirthing.com",
        "password": "DemoMidwife2024!",
        "full_name": "Emily Thompson",
        "role": "MIDWIFE",
        "profile_collection": "midwife_profiles",
        "profile_data": {
            "practice_name": "Hill Country Midwifery",
            "credentials": ["CNM", "IBCLC"],
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": [
                "Prenatal Care", "Home Birth", "Birth Center Birth",
                "Postpartum Care", "Well-Woman Care"
            ],
            "years_in_practice": 15,
            "accepting_new_clients": True,
            "bio": "Certified Nurse-Midwife providing comprehensive, holistic care for your entire reproductive journey.",
            "in_marketplace": True,
        },
        "needs_subscription": True,
    },
    {
        "email": "demo.mom@truejoybirthing.com",
        "password": "DemoMom2024!",
        "full_name": "Emma Johnson",
        "role": "MOM",
        "profile_collection": "mom_profiles",
        "profile_data": {
            "due_date": None,  # Will be set dynamically
            "planned_birth_setting": "Birth Center",
            "location_city": "Austin",
            "location_state": "TX",
        },
        "needs_subscription": False,
    },
]

# Emails that are considered demo accounts (used for bypass checks)
DEMO_EMAILS = {account["email"] for account in DEMO_ACCOUNTS}


def is_demo_account(email: str) -> bool:
    """Check if an email belongs to a demo account."""
    return email in DEMO_EMAILS


async def ensure_demo_accounts(db):
    """
    Ensure all demo accounts exist and are fully functional.
    Called on every server startup.
    """
    logger.info("Ensuring demo accounts exist and are functional...")
    now = datetime.now(timezone.utc)

    for account in DEMO_ACCOUNTS:
        email = account["email"]
        password_hash = pwd_context.hash(account["password"])

        # Check if user exists
        existing = await db.users.find_one({"email": email})

        if existing:
            user_id = existing["user_id"]
            # Update: reset password hash, ensure flags are correct
            await db.users.update_one(
                {"email": email},
                {"$set": {
                    "password_hash": password_hash,
                    "onboarding_completed": True,
                    "is_demo_account": True,
                    "role": account["role"],
                    "full_name": account["full_name"],
                    "updated_at": now,
                }}
            )
            logger.info(f"  Updated existing demo account: {email} (user_id={user_id})")
        else:
            user_id = f"demo_{account['role'].lower()}_{uuid.uuid4().hex[:8]}"
            user_doc = {
                "user_id": user_id,
                "email": email,
                "full_name": account["full_name"],
                "role": account["role"],
                "password_hash": password_hash,
                "picture": None,
                "onboarding_completed": True,
                "is_demo_account": True,
                "created_at": now,
                "updated_at": now,
            }
            await db.users.insert_one(user_doc)
            logger.info(f"  Created new demo account: {email} (user_id={user_id})")

        # Ensure role-specific profile exists
        profile_collection = account["profile_collection"]
        profile_data = account["profile_data"].copy()

        # Set dynamic due_date for mom accounts
        if account["role"] == "MOM" and profile_data.get("due_date") is None:
            profile_data["due_date"] = (now + timedelta(days=75)).strftime("%Y-%m-%d")

        existing_profile = await db[profile_collection].find_one({"user_id": user_id})
        if not existing_profile:
            profile_data["user_id"] = user_id
            await db[profile_collection].insert_one(profile_data)
            logger.info(f"  Created {profile_collection} profile for {email}")

        # Ensure provider accounts have an active subscription
        if account["needs_subscription"]:
            existing_sub = await db.subscriptions.find_one({"user_id": user_id})
            if not existing_sub:
                sub_doc = {
                    "subscription_id": f"demo_sub_{uuid.uuid4().hex[:8]}",
                    "user_id": user_id,
                    "subscription_status": "active",
                    "plan_type": "annual",
                    "subscription_provider": "DEMO",
                    "subscription_start_date": now - timedelta(days=30),
                    "subscription_end_date": now + timedelta(days=335),
                    "auto_renewing": True,
                    "created_at": now,
                }
                await db.subscriptions.insert_one(sub_doc)
                logger.info(f"  Created active subscription for {email}")
            else:
                # Ensure subscription is active and not expired
                sub_end = existing_sub.get("subscription_end_date")
                sub_status = existing_sub.get("subscription_status")
                # Ensure sub_end is timezone-aware for comparison
                if sub_end and sub_end.tzinfo is None:
                    sub_end = sub_end.replace(tzinfo=timezone.utc)
                if sub_status != "active" or (sub_end and sub_end < now):
                    await db.subscriptions.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "subscription_status": "active",
                            "subscription_end_date": now + timedelta(days=335),
                            "auto_renewing": True,
                        }}
                    )
                    logger.info(f"  Renewed subscription for {email}")

    logger.info("Demo accounts check complete.")
