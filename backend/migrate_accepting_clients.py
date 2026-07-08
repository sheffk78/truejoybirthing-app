"""
One-time migration script: normalize legacy `accepting_clients` field to `accepting_new_clients`
in midwife_profiles collection.

Usage (run from backend directory):
    python3 migrate_accepting_clients.py

Or via Railway CLI:
    railway run python3 migrate_accepting_clients.py

This script is idempotent — running it multiple times is safe.
"""

import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone


async def migrate():
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "test_database")

    if not mongo_url:
        print("ERROR: MONGO_URL environment variable not set.")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Find all midwife profiles that have accepting_clients but not accepting_new_clients
    # or where accepting_new_clients is missing
    cursor = db.midwife_profiles.find({"accepting_clients": {"$exists": True}})
    migrated = 0
    skipped = 0

    async for doc in cursor:
        legacy_value = doc.get("accepting_clients")
        canonical_value = doc.get("accepting_new_clients")

        if canonical_value is None:
            # No canonical field — copy from legacy
            await db.midwife_profiles.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {"accepting_new_clients": legacy_value, "updated_at": datetime.now(timezone.utc)},
                    "$unset": {"accepting_clients": ""}
                }
            )
            migrated += 1
            print(f"  Migrated {doc.get('user_id', 'unknown')}: accepting_clients={legacy_value} → accepting_new_clients={legacy_value}")
        else:
            # Canonical field already exists — just remove the legacy field
            await db.midwife_profiles.update_one(
                {"_id": doc["_id"]},
                {"$unset": {"accepting_clients": ""}}
            )
            skipped += 1
            print(f"  Cleaned {doc.get('user_id', 'unknown')}: removed legacy accepting_clients (canonical already {canonical_value})")

    print(f"\nMigration complete: {migrated} migrated, {skipped} cleaned (legacy field removed only).")
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())