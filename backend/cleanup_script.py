#!/usr/bin/env python3
"""
Database Cleanup Script for True Joy Birthing
Removes all test data while preserving demo accounts for final UAT.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
load_dotenv(Path(__file__).parent / '.env')

# Demo accounts to preserve
KEEP_EMAILS = [
    'demo.doula@truejoybirthing.com',
    'demo.midwife@truejoybirthing.com',
    'demo.mom@truejoybirthing.com'
]

async def cleanup_database():
    """Main cleanup function"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=" * 60)
    print("TRUE JOY BIRTHING - DATABASE CLEANUP")
    print("=" * 60)
    
    # 1. Get demo user IDs to keep
    keep_user_ids = []
    for email in KEEP_EMAILS:
        user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
        if user:
            keep_user_ids.append(user["user_id"])
            print(f"[KEEP] {email} -> {user['user_id']}")
    
    print(f"\nKeeping {len(keep_user_ids)} demo users: {keep_user_ids}")
    
    # 2. Get clients belonging to demo providers
    demo_provider_ids = [uid for uid in keep_user_ids if uid.startswith('demo_doula') or uid.startswith('demo_midwife')]
    demo_mom_ids = [uid for uid in keep_user_ids if uid.startswith('demo_mom')]
    
    # Get clients for demo providers
    keep_client_ids = []
    async for client_doc in db.clients.find({"provider_id": {"$in": demo_provider_ids}}, {"_id": 0, "client_id": 1}):
        keep_client_ids.append(client_doc["client_id"])
    
    print(f"Keeping {len(keep_client_ids)} clients linked to demo providers")
    
    # === CLEANUP PHASE ===
    print("\n" + "=" * 60)
    print("CLEANUP PHASE")
    print("=" * 60)
    
    # 3. Delete users not in keep list
    users_before = await db.users.count_documents({})
    result = await db.users.delete_many({"user_id": {"$nin": keep_user_ids}})
    print(f"[USERS] Deleted {result.deleted_count} / {users_before} users")
    
    # 4. Delete clients not linked to demo providers
    clients_before = await db.clients.count_documents({})
    result = await db.clients.delete_many({"provider_id": {"$nin": demo_provider_ids}})
    print(f"[CLIENTS] Deleted {result.deleted_count} / {clients_before} clients")
    
    # 5. Delete appointments not linked to demo providers
    appts_before = await db.appointments.count_documents({})
    result = await db.appointments.delete_many({"provider_id": {"$nin": demo_provider_ids}})
    print(f"[APPOINTMENTS] Deleted {result.deleted_count} / {appts_before} appointments")
    
    # 6. Delete notes not linked to demo providers
    notes_before = await db.notes.count_documents({})
    result = await db.notes.delete_many({"provider_id": {"$nin": demo_provider_ids}})
    print(f"[NOTES] Deleted {result.deleted_count} / {notes_before} notes")
    
    # 7. Delete contracts not linked to demo providers
    contracts_before = await db.contracts.count_documents({})
    # Contracts have doula_id or midwife_id
    result = await db.contracts.delete_many({
        "$and": [
            {"doula_id": {"$nin": demo_provider_ids}},
            {"midwife_id": {"$nin": demo_provider_ids}}
        ]
    })
    print(f"[CONTRACTS] Deleted {result.deleted_count} / {contracts_before} contracts")
    
    # 8. Delete invoices not linked to demo providers
    invoices_before = await db.invoices.count_documents({})
    result = await db.invoices.delete_many({"provider_id": {"$nin": demo_provider_ids}})
    print(f"[INVOICES] Deleted {result.deleted_count} / {invoices_before} invoices")
    
    # 9. Delete visits not linked to demo providers (midwife_id)
    visits_before = await db.visits.count_documents({})
    result = await db.visits.delete_many({"midwife_id": {"$nin": demo_provider_ids}})
    print(f"[VISITS] Deleted {result.deleted_count} / {visits_before} visits")
    
    # 10. Delete birth_plans not linked to demo moms
    bp_before = await db.birth_plans.count_documents({})
    result = await db.birth_plans.delete_many({"user_id": {"$nin": demo_mom_ids}})
    print(f"[BIRTH_PLANS] Deleted {result.deleted_count} / {bp_before} birth_plans")
    
    # 11. Delete wellness_entries not linked to demo moms
    we_before = await db.wellness_entries.count_documents({})
    result = await db.wellness_entries.delete_many({"user_id": {"$nin": demo_mom_ids}})
    print(f"[WELLNESS_ENTRIES] Deleted {result.deleted_count} / {we_before} wellness_entries")
    
    # 12. Delete messages not involving demo users
    msgs_before = await db.messages.count_documents({})
    result = await db.messages.delete_many({
        "$and": [
            {"sender_id": {"$nin": keep_user_ids}},
            {"receiver_id": {"$nin": keep_user_ids}}
        ]
    })
    print(f"[MESSAGES] Deleted {result.deleted_count} / {msgs_before} messages")
    
    # 13. Delete notifications not for demo users
    notifs_before = await db.notifications.count_documents({})
    result = await db.notifications.delete_many({"user_id": {"$nin": keep_user_ids}})
    print(f"[NOTIFICATIONS] Deleted {result.deleted_count} / {notifs_before} notifications")
    
    # 14. Delete all user sessions (will recreate on login)
    sessions_before = await db.user_sessions.count_documents({})
    result = await db.user_sessions.delete_many({})
    print(f"[USER_SESSIONS] Deleted {result.deleted_count} / {sessions_before} sessions")
    
    # 15. Delete share_connections not involving demo users
    shares_before = await db.share_connections.count_documents({})
    result = await db.share_connections.delete_many({
        "$and": [
            {"mom_user_id": {"$nin": keep_user_ids}},
            {"provider_id": {"$nin": keep_user_ids}}
        ]
    })
    print(f"[SHARE_CONNECTIONS] Deleted {result.deleted_count} / {shares_before} share connections")
    
    # 16. Delete prenatal assessments not linked to demo providers
    pa_before = await db.prenatal_assessments.count_documents({})
    result = await db.prenatal_assessments.delete_many({"midwife_id": {"$nin": demo_provider_ids}})
    print(f"[PRENATAL_ASSESSMENTS] Deleted {result.deleted_count} / {pa_before} assessments")
    
    # 17. Delete birth summaries not linked to demo providers
    bs_before = await db.birth_summaries.count_documents({})
    result = await db.birth_summaries.delete_many({"midwife_id": {"$nin": demo_provider_ids}})
    print(f"[BIRTH_SUMMARIES] Deleted {result.deleted_count} / {bs_before} birth summaries")
    
    # === VERIFICATION PHASE ===
    print("\n" + "=" * 60)
    print("VERIFICATION - FINAL COUNTS")
    print("=" * 60)
    
    final_counts = {
        "users": await db.users.count_documents({}),
        "clients": await db.clients.count_documents({}),
        "appointments": await db.appointments.count_documents({}),
        "notes": await db.notes.count_documents({}),
        "contracts": await db.contracts.count_documents({}),
        "invoices": await db.invoices.count_documents({}),
        "visits": await db.visits.count_documents({}),
        "birth_plans": await db.birth_plans.count_documents({}),
        "wellness_entries": await db.wellness_entries.count_documents({}),
        "messages": await db.messages.count_documents({}),
        "notifications": await db.notifications.count_documents({}),
        "user_sessions": await db.user_sessions.count_documents({}),
    }
    
    for collection, count in final_counts.items():
        print(f"  {collection}: {count}")
    
    # Show remaining users
    print("\n[REMAINING DEMO USERS]")
    async for user in db.users.find({}, {"_id": 0, "email": 1, "role": 1, "user_id": 1}):
        print(f"  - {user['email']} ({user['role']}) -> {user['user_id']}")
    
    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_database())
