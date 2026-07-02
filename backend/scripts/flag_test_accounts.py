"""
Migration script: Auto-flag test accounts in MongoDB with is_test=True.

Run once to mark existing test accounts so they're excluded from production stats.
Safe to re-run (idempotent, only sets is_test=True on accounts that match patterns).

Usage:
    cd backend && python scripts/flag_test_accounts.py

Requires MONGODB_URL env var (or uses Railway default).
"""

import asyncio
import os
import re
import sys

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient


# Patterns that indicate a test account
TEST_EMAIL_PATTERNS = [
    r".*@example\.com$",
    r".*@example\.org$",
    r".*@test\.com$",
    r".*@fake\.com$",
    r"^test@",
    r"^test\.@",
    r".*reviewer\..*@truejoybirthing\.com$",
    r"^reviewer\.tjb@",
    r".*@gmail\.com$",  # Broad, only if name also looks test-like
]

# Name patterns that indicate a test account
TEST_NAME_PATTERNS = [
    r"^test\s*(user)?$",
    r"^test\s*account$",
    r"^new\s*user$",
    r"^review\s*(midwife|doula|mom|user)?$",
    r"^google\s*play\s*reviewer$",
    r"^demo\s*",
]

# Hardcoded test emails (exact match)
TEST_EMAILS_EXACT = {
    "test@example.com",
    "newuser@example.com",
    "reviewer.midwife@truejoybirthing.com",
    "reviewer.doula@truejoybirthing.com",
    "reviewer.tjb@gmail.com",
}


def is_test_account(user_doc: dict) -> bool:
    """Determine if a user document looks like a test account."""
    # Already flagged
    if user_doc.get("is_test"):
        return True

    # Demo accounts are test accounts
    if user_doc.get("is_demo_account"):
        return True

    email = (user_doc.get("email") or "").lower()
    name = (user_doc.get("full_name") or user_doc.get("name") or "").strip()

    # Check exact email matches
    if email in TEST_EMAILS_EXACT:
        return True

    # Check email patterns
    for pattern in TEST_EMAIL_PATTERNS:
        if re.match(pattern, email, re.IGNORECASE):
            # For gmail.com, require name to also look test-like
            if "@gmail.com" in pattern:
                for name_pattern in TEST_NAME_PATTERNS:
                    if re.match(name_pattern, name, re.IGNORECASE):
                        return True
                continue
            return True

    # Check name patterns
    for pattern in TEST_NAME_PATTERNS:
        if re.match(pattern, name, re.IGNORECASE):
            return True

    return False


async def main():
    mongo_url = os.environ.get("MONGODB_URL")
    if not mongo_url:
        print("ERROR: MONGODB_URL env var not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url)
    db = client.get_default_database()

    # Find all users
    total_users = await db.users.count_documents({})
    print(f"Scanning {total_users} users for test accounts...")

    flagged = 0
    already_flagged = 0

    cursor = db.users.find({})
    async for user_doc in cursor:
        user_id = user_doc.get("user_id", "?")
        email = user_doc.get("email", "?")
        name = user_doc.get("full_name") or user_doc.get("name", "?")

        if user_doc.get("is_test"):
            already_flagged += 1
            continue

        if is_test_account(user_doc):
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"is_test": True}}
            )
            flagged += 1
            print(f"  FLAGGED: {name} <{email}> ({user_id})")

    print(f"\nDone!")
    print(f"  Already flagged: {already_flagged}")
    print(f"  Newly flagged:   {flagged}")
    print(f"  Total test:      {already_flagged + flagged}")
    print(f"  Real users:      {total_users - already_flagged - flagged}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())