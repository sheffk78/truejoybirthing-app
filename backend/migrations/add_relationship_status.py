#!/usr/bin/env python3
"""
Migration script: Add relationship_status field to share_requests.

Sets relationship_status to "active" for all existing share_requests
with status: "accepted" that are missing the relationship_status field.
Also sets relationship_status to None for pending/rejected requests missing it.

Safety features:
- --dry-run: Print counts without writing
- Idempotent: Only updates documents missing the field
- Backward compatible: verify_active_relationship treats missing field as "active"
- Online migration: Uses update_many with conditional filter, no downtime

Usage:
    python migrations/add_relationship_status.py              # Run migration
    python migrations/add_relationship_status.py --dry-run    # Dry run only
    python migrations/add_relationship_status.py --rollback   # Remove field (rollback)

Rollback:
    Removes relationship_status, terminated_at, terminated_by, expires_at
    from all share_requests documents. Safe to run multiple times.
"""

import asyncio
import argparse
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


async def migrate(dry_run: bool = False):
    """Add relationship_status field to existing share_requests."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Count documents missing relationship_status, grouped by status
    accepted_missing = await db.share_requests.count_documents({
        "status": "accepted",
        "relationship_status": {"$exists": False}
    })
    pending_missing = await db.share_requests.count_documents({
        "status": {"$in": ["pending", "rejected"]},
        "relationship_status": {"$exists": False}
    })
    already_has_field = await db.share_requests.count_documents({
        "relationship_status": {"$exists": True}
    })
    no_status = await db.share_requests.count_documents({
        "status": {"$exists": False}
    })

    print("=" * 60)
    print("Migration: Add relationship_status to share_requests")
    print("=" * 60)
    print(f"Database: {DB_NAME}")
    print(f"Mongo URL: {MONGO_URL}")
    print()
    print(f"Documents with status='accepted' missing relationship_status: {accepted_missing}")
    print(f"Documents with status='pending'/'rejected' missing relationship_status: {pending_missing}")
    print(f"Documents already having relationship_status: {already_has_field}")
    print(f"Documents missing status field entirely (orphaned, skipped): {no_status}")
    print()

    if dry_run:
        print("[DRY RUN] No changes will be made.")
        print(f"Would set relationship_status='active' on {accepted_missing} accepted share_requests")
        print(f"Would set relationship_status=None on {pending_missing} pending/rejected share_requests")
        return

    # Set relationship_status="active" on accepted share_requests missing the field
    if accepted_missing > 0:
        result = await db.share_requests.update_many(
            {
                "status": "accepted",
                "relationship_status": {"$exists": False}
            },
            {
                "$set": {"relationship_status": "active"}
            }
        )
        print(f"Updated {result.modified_count} accepted share_requests -> relationship_status='active'")
    else:
        print("No accepted share_requests need updating (all have relationship_status)")

    # Set relationship_status=None on pending/rejected share_requests missing the field
    if pending_missing > 0:
        result = await db.share_requests.update_many(
            {
                "status": {"$in": ["pending", "rejected"]},
                "relationship_status": {"$exists": False}
            },
            {
                "$set": {"relationship_status": None}
            }
        )
        print(f"Updated {result.modified_count} pending/rejected share_requests -> relationship_status=None")
    else:
        print("No pending/rejected share_requests need updating (all have relationship_status)")

    print()
    print("Migration complete. Verify with: python migrations/add_relationship_status.py --dry-run")


async def rollback():
    """Remove relationship_status and related fields (rollback)."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    count = await db.share_requests.count_documents({
        "relationship_status": {"$exists": True}
    })

    print("=" * 60)
    print("Rollback: Remove relationship_status from share_requests")
    print("=" * 60)
    print(f"Database: {DB_NAME}")
    print(f"Documents with relationship_status: {count}")
    print()

    if count == 0:
        print("No documents to rollback. Already clean.")
        return

    result = await db.share_requests.update_many(
        {},
        {
            "$unset": {
                "relationship_status": "",
                "terminated_at": "",
                "terminated_by": "",
                "expires_at": ""
            }
        }
    )
    print(f"Removed relationship_status and related fields from {result.modified_count} documents")
    print("Rollback complete.")


def main():
    parser = argparse.ArgumentParser(description="Migrate share_requests to add relationship_status field")
    parser.add_argument("--dry-run", action="store_true", help="Print counts without making changes")
    parser.add_argument("--rollback", action="store_true", help="Remove relationship_status field (undo migration)")
    args = parser.parse_args()

    if args.rollback:
        asyncio.run(rollback())
    else:
        asyncio.run(migrate(dry_run=args.dry_run))


if __name__ == "__main__":
    main()