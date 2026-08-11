"""Seed test users into MongoDB for test_9_fixes.py integration tests."""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "truejoybirthing_test")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc)

    # ── Test Mom ──
    mom_email = "testmom_msg@test.com"
    mom_password_hash = pwd_context.hash("password123")
    existing_mom = await db.users.find_one({"email": mom_email})
    if existing_mom:
        mom_user_id = existing_mom["user_id"]
        print(f"Mom user exists: {mom_user_id}")
        # Update password in case it changed
        await db.users.update_one(
            {"email": mom_email},
            {"$set": {"password_hash": mom_password_hash, "onboarding_completed": True, "role": "MOM"}}
        )
    else:
        mom_user_id = f"test_mom_{now.strftime('%Y%m%d%H%M%S')}"
        await db.users.insert_one({
            "user_id": mom_user_id,
            "email": mom_email,
            "full_name": "Test Mom",
            "role": "MOM",
            "password_hash": mom_password_hash,
            "picture": None,
            "onboarding_completed": True,
            "is_demo_account": False,
            "created_at": now,
            "updated_at": now,
        })
        print(f"Created mom user: {mom_user_id}")

    # Ensure mom profile exists
    existing_mom_profile = await db.mom_profiles.find_one({"user_id": mom_user_id})
    if not existing_mom_profile:
        await db.mom_profiles.insert_one({
            "user_id": mom_user_id,
            "due_date": (now + timedelta(days=75)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Birth Center",
            "location_city": "Austin",
            "location_state": "TX",
            "created_at": now,
            "updated_at": now,
        })
        print("Created mom profile")

    # ── Test Doula ──
    doula_email = "testdoula123@test.com"
    doula_password_hash = pwd_context.hash("password123")
    existing_doula = await db.users.find_one({"email": doula_email})
    if existing_doula:
        doula_user_id = existing_doula["user_id"]
        print(f"Doula user exists: {doula_user_id}")
        await db.users.update_one(
            {"email": doula_email},
            {"$set": {"password_hash": doula_password_hash, "onboarding_completed": True, "role": "DOULA"}}
        )
    else:
        doula_user_id = f"test_doula_{now.strftime('%Y%m%d%H%M%S')}"
        await db.users.insert_one({
            "user_id": doula_user_id,
            "email": doula_email,
            "full_name": "Test Doula",
            "role": "DOULA",
            "password_hash": doula_password_hash,
            "picture": None,
            "onboarding_completed": True,
            "is_demo_account": False,
            "created_at": now,
            "updated_at": now,
        })
        print(f"Created doula user: {doula_user_id}")

    # Ensure doula profile exists
    existing_doula_profile = await db.doula_profiles.find_one({"user_id": doula_user_id})
    if not existing_doula_profile:
        await db.doula_profiles.insert_one({
            "user_id": doula_user_id,
            "practice_name": "Test Doula Practice",
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": ["Birth Doula", "Postpartum Care"],
            "years_in_practice": 5,
            "accepting_new_clients": True,
            "bio": "Test doula bio",
            "in_marketplace": True,
            "created_at": now,
            "updated_at": now,
        })
        print("Created doula profile")

    # ── Create a pending share request from mom to doula ──
    # Check if one already exists
    existing_share = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_user_id": doula_user_id,
        "status": "pending"
    })
    if not existing_share:
        await db.share_requests.insert_one({
            "share_request_id": f"sr_test_{now.strftime('%Y%m%d%H%M%S')}",
            "mom_user_id": mom_user_id,
            "provider_user_id": doula_user_id,
            "provider_email": doula_email,
            "provider_type": "doula",
            "mom_email": mom_email,
            "status": "pending",
            "message": "Test share request",
            "created_at": now,
            "updated_at": now,
        })
        print("Created pending share request")
    else:
        print("Pending share request already exists")

    # ── Ensure doula has a client entry (for test_accept_share_request_creates_client) ──
    existing_client = await db.doula_clients.find_one({"client_email": mom_email, "provider_user_id": doula_user_id})
    if not existing_client:
        await db.doula_clients.insert_one({
            "client_id": f"client_test_{now.strftime('%Y%m%d%H%M%S')}",
            "provider_user_id": doula_user_id,
            "client_name": "Test Mom",
            "client_email": mom_email,
            "client_user_id": mom_user_id,
            "due_date": (now + timedelta(days=75)).strftime("%Y-%m-%d"),
            "status": "active",
            "linked_mom_id": mom_user_id,
            "created_at": now,
            "updated_at": now,
        })
        print("Created doula client entry linked to mom")
    else:
        print("Doula client already exists")

    print("\nAll test data seeded successfully!")

from datetime import timedelta
asyncio.run(main())