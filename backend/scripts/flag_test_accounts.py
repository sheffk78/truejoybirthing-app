"""
Migration script: Auto-flag test accounts in MongoDB with is_test=True.

Run once to mark existing test accounts so they're excluded from production stats.
Safe to re-run (idempotent, only sets is_test=True on accounts that match exact patterns).

Usage:
    cd backend && MONGODB_URL=<url> python scripts/flag_test_accounts.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient


# Exact emails that are test/demo/review accounts
TEST_EMAILS = {
    "test@example.com",
    "newuser@example.com",
    "testmom@truejoybirthing.com",
    "reviewer.midwife@truejoybirthing.com",
    "reviewer.doula@truejoybirthing.com",
    "reviewer.tjb@gmail.com",
    "demo.midwife@truejoybirthing.com",
    "demo.mom@truejoybirthing.com",
    "demo.doula@truejoybirthing.com",
    "shelbi@truejoybirthing.com",  # demo admin
}


async def main():
    mongo_url = os.environ.get("MONGODB_URL")
    if not mongo_url:
        print("ERROR: MONGODB_URL env var not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client.get_default_database()

    total_users = await db.users.count_documents({})
    print(f"Scanning {total_users} users for test accounts...")

    flagged = 0
    already_flagged = 0

    # Flag demo accounts (is_demo_account=True)
    result = await db.users.update_many(
        {"is_demo_account": True, "is_test": {"$ne": True}},
        {"$set": {"is_test": True}}
    )
    flagged += result.modified_count
    print(f"  Flagged {result.modified_count} demo accounts (is_demo_account=True)")

    # Flag by exact email match
    for email in TEST_EMAILS:
        result = await db.users.update_one(
            {"email": email, "is_test": {"$ne": True}},
            {"$set": {"is_test": True}}
        )
        if result.modified_count:
            print(f"  Flagged: {email}")
            flagged += 1

    already_flagged = await db.users.count_documents({"is_test": True})
    real_users = total_users - already_flagged

    print(f"\nDone!")
    print(f"  Newly flagged:   {flagged}")
    print(f"  Total test:      {already_flagged}")
    print(f"  Real users:      {real_users}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())