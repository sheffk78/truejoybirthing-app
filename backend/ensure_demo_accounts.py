"""
Ensure Demo Accounts Exist on Server Startup

This module guarantees that demo accounts used for Apple App Store review
are always present and functional. It runs on every server startup and:

1. Creates demo accounts if they don't exist
2. Resets password hashes if they exist (in case they were changed)
3. Ensures all required flags are set (onboarding_completed, is_demo_account)
4. Ensures provider accounts have active subscriptions
5. Marks accounts with is_demo_account=True for bypass logic
6. Seeds demo data (clients, invoices, contracts, messages) so Apple sees populated screens

Demo Accounts:
    - Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
    - Doula: demo.doula@truejoybirthing.com / DemoDoula2024!
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
        "email": "demo.doula@truejoybirthing.com",
        "password": "DemoDoula2024!",
        "full_name": "Sarah Mitchell",
        "role": "DOULA",
        "profile_collection": "doula_profiles",
        "profile_data": {
            "practice_name": "Heart & Hands Birth Support",
            "credentials": ["CD", "CLC"],
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": [
                "Birth Doula", "Postpartum Doula", "Lactation Support",
                "Childbirth Education", "Newborn Care"
            ],
            "years_in_practice": 8,
            "accepting_new_clients": True,
            "bio": "Certified doula providing compassionate, evidence-based support for your birth journey. Every family deserves to feel empowered.",
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

    # Track user_ids for seed data cross-referencing
    demo_user_ids = {}

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

        demo_user_ids[account["role"]] = user_id

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

    # Seed demo data so Apple reviewers see populated screens
    await _seed_demo_data(db, demo_user_ids, now)

    logger.info("Demo accounts check complete.")


async def _seed_demo_data(db, demo_user_ids: dict, now: datetime):
    """
    Seed sample clients, invoices, contracts, and messages for demo accounts.
    Only creates data if it doesn't already exist (idempotent).
    """
    midwife_id = demo_user_ids.get("MIDWIFE")
    doula_id = demo_user_ids.get("DOULA")
    mom_id = demo_user_ids.get("MOM")

    if not midwife_id or not doula_id or not mom_id:
        logger.warning("  Could not seed demo data — missing demo user IDs")
        return

    # ── Demo Clients for Midwife ──
    midwife_clients = [
        {
            "client_id": "demo_client_mw_01",
            "provider_user_id": midwife_id,
            "client_name": "Emma Johnson",
            "client_email": "demo.mom@truejoybirthing.com",
            "client_user_id": mom_id,
            "due_date": (now + timedelta(days=75)).strftime("%Y-%m-%d"),
            "status": "active",
            "planned_birth_setting": "Birth Center",
            "notes": "First-time mom, very excited. Prefers natural birthing methods.",
            "created_at": now - timedelta(days=60),
            "updated_at": now - timedelta(days=2),
        },
        {
            "client_id": "demo_client_mw_02",
            "provider_user_id": midwife_id,
            "client_name": "Olivia Martinez",
            "client_email": "olivia.m@example.com",
            "client_user_id": None,
            "due_date": (now + timedelta(days=45)).strftime("%Y-%m-%d"),
            "status": "active",
            "planned_birth_setting": "Home Birth",
            "notes": "Second pregnancy. Had a hospital birth with first child, wants home birth this time.",
            "created_at": now - timedelta(days=90),
            "updated_at": now - timedelta(days=5),
        },
        {
            "client_id": "demo_client_mw_03",
            "provider_user_id": midwife_id,
            "client_name": "Sophia Williams",
            "client_email": "sophia.w@example.com",
            "client_user_id": None,
            "due_date": (now - timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": "past",
            "planned_birth_setting": "Birth Center",
            "notes": "Delivered healthy baby girl. Postpartum follow-up complete.",
            "created_at": now - timedelta(days=200),
            "updated_at": now - timedelta(days=25),
        },
    ]

    for client in midwife_clients:
        existing = await db.midwife_clients.find_one({"client_id": client["client_id"]})
        if not existing:
            await db.midwife_clients.insert_one(client)
            logger.info(f"  Seeded midwife client: {client['client_name']}")

    # ── Demo Clients for Doula ──
    doula_clients = [
        {
            "client_id": "demo_client_dl_01",
            "provider_user_id": doula_id,
            "client_name": "Emma Johnson",
            "client_email": "demo.mom@truejoybirthing.com",
            "client_user_id": mom_id,
            "due_date": (now + timedelta(days=75)).strftime("%Y-%m-%d"),
            "status": "active",
            "services": ["Birth Doula", "Lactation Support"],
            "notes": "Working alongside midwife Emily Thompson. Emma wants continuous labor support.",
            "created_at": now - timedelta(days=55),
            "updated_at": now - timedelta(days=1),
        },
        {
            "client_id": "demo_client_dl_02",
            "provider_user_id": doula_id,
            "client_name": "Ava Chen",
            "client_email": "ava.chen@example.com",
            "client_user_id": None,
            "due_date": (now + timedelta(days=60)).strftime("%Y-%m-%d"),
            "status": "active",
            "services": ["Birth Doula", "Childbirth Education"],
            "notes": "Interested in hypnobirthing techniques. Hospital birth planned.",
            "created_at": now - timedelta(days=40),
            "updated_at": now - timedelta(days=3),
        },
        {
            "client_id": "demo_client_dl_03",
            "provider_user_id": doula_id,
            "client_name": "Isabella Davis",
            "client_email": "isabella.d@example.com",
            "client_user_id": None,
            "due_date": (now - timedelta(days=15)).strftime("%Y-%m-%d"),
            "status": "past",
            "services": ["Birth Doula", "Postpartum Doula"],
            "notes": "Beautiful home birth. Now in postpartum support phase.",
            "created_at": now - timedelta(days=180),
            "updated_at": now - timedelta(days=10),
        },
    ]

    for client in doula_clients:
        existing = await db.doula_clients.find_one({"client_id": client["client_id"]})
        if not existing:
            await db.doula_clients.insert_one(client)
            logger.info(f"  Seeded doula client: {client['client_name']}")

    # ── Demo Invoices for Midwife ──
    midwife_invoices = [
        {
            "invoice_id": "demo_inv_mw_01",
            "provider_user_id": midwife_id,
            "client_id": "demo_client_mw_01",
            "client_name": "Emma Johnson",
            "client_email": "demo.mom@truejoybirthing.com",
            "amount": 3500.00,
            "description": "Comprehensive Midwifery Care Package — Prenatal through Postpartum",
            "status": "paid",
            "due_date": (now - timedelta(days=10)).strftime("%Y-%m-%d"),
            "paid_date": (now - timedelta(days=8)).strftime("%Y-%m-%d"),
            "payment_instructions_text": "Please send payment via Zelle to billing@hillcountrymidwifery.com or mail a check to our office.",
            "created_at": now - timedelta(days=45),
            "updated_at": now - timedelta(days=8),
        },
        {
            "invoice_id": "demo_inv_mw_02",
            "provider_user_id": midwife_id,
            "client_id": "demo_client_mw_02",
            "client_name": "Olivia Martinez",
            "client_email": "olivia.m@example.com",
            "amount": 1800.00,
            "description": "Prenatal Care — Initial consultation and first trimester visits",
            "status": "sent",
            "due_date": (now + timedelta(days=15)).strftime("%Y-%m-%d"),
            "paid_date": None,
            "payment_instructions_text": "Please send payment via Zelle to billing@hillcountrymidwifery.com or mail a check to our office.",
            "created_at": now - timedelta(days=14),
            "updated_at": now - timedelta(days=14),
        },
    ]

    for inv in midwife_invoices:
        existing = await db.midwife_invoices.find_one({"invoice_id": inv["invoice_id"]})
        if not existing:
            await db.midwife_invoices.insert_one(inv)
            logger.info(f"  Seeded midwife invoice: {inv['description'][:50]}")

    # ── Demo Invoices for Doula ──
    doula_invoices = [
        {
            "invoice_id": "demo_inv_dl_01",
            "provider_user_id": doula_id,
            "client_id": "demo_client_dl_01",
            "client_name": "Emma Johnson",
            "client_email": "demo.mom@truejoybirthing.com",
            "amount": 1500.00,
            "description": "Birth Doula Package — Includes prenatal visits, birth support, and postpartum follow-up",
            "status": "paid",
            "due_date": (now - timedelta(days=20)).strftime("%Y-%m-%d"),
            "paid_date": (now - timedelta(days=18)).strftime("%Y-%m-%d"),
            "payment_instructions_text": "Venmo: @sarah-mitchell-doula or Zelle: sarah@heartandhandsbirth.com",
            "created_at": now - timedelta(days=50),
            "updated_at": now - timedelta(days=18),
        },
    ]

    for inv in doula_invoices:
        existing = await db.doula_invoices.find_one({"invoice_id": inv["invoice_id"]})
        if not existing:
            await db.doula_invoices.insert_one(inv)
            logger.info(f"  Seeded doula invoice: {inv['description'][:50]}")

    # ── Demo Contracts for Midwife ──
    midwife_contracts = [
        {
            "contract_id": "demo_contract_mw_01",
            "provider_user_id": midwife_id,
            "client_id": "demo_client_mw_01",
            "client_name": "Emma Johnson",
            "client_email": "demo.mom@truejoybirthing.com",
            "title": "Midwifery Service Agreement",
            "status": "signed",
            "services_description": "Comprehensive midwifery care including prenatal visits, labor and birth attendance at Austin Birth Center, and 6-week postpartum care.",
            "total_fee": 3500.00,
            "signed_date": (now - timedelta(days=55)).strftime("%Y-%m-%d"),
            "created_at": now - timedelta(days=58),
            "updated_at": now - timedelta(days=55),
        },
    ]

    for contract in midwife_contracts:
        existing = await db.midwife_contracts.find_one({"contract_id": contract["contract_id"]})
        if not existing:
            await db.midwife_contracts.insert_one(contract)
            logger.info(f"  Seeded midwife contract: {contract['title']}")

    # ── Demo Contracts for Doula ──
    doula_contracts = [
        {
            "contract_id": "demo_contract_dl_01",
            "provider_user_id": doula_id,
            "client_id": "demo_client_dl_01",
            "client_name": "Emma Johnson",
            "client_email": "demo.mom@truejoybirthing.com",
            "title": "Birth Doula Service Agreement",
            "status": "signed",
            "services_description": "Birth doula support including 2 prenatal visits, continuous labor support, and 1 postpartum visit. Lactation support included.",
            "total_fee": 1500.00,
            "signed_date": (now - timedelta(days=50)).strftime("%Y-%m-%d"),
            "created_at": now - timedelta(days=53),
            "updated_at": now - timedelta(days=50),
        },
    ]

    for contract in doula_contracts:
        existing = await db.doula_contracts.find_one({"contract_id": contract["contract_id"]})
        if not existing:
            await db.doula_contracts.insert_one(contract)
            logger.info(f"  Seeded doula contract: {contract['title']}")

    # ── Demo Messages (conversation between mom and midwife) ──
    conversation_id = "demo_conv_mom_midwife"
    existing_conv = await db.conversations.find_one({"conversation_id": conversation_id})
    if not existing_conv:
        conv_doc = {
            "conversation_id": conversation_id,
            "participants": [mom_id, midwife_id],
            "participant_names": {mom_id: "Emma Johnson", midwife_id: "Emily Thompson"},
            "participant_roles": {mom_id: "MOM", midwife_id: "MIDWIFE"},
            "last_message": "Looking forward to our next prenatal visit!",
            "last_message_at": now - timedelta(hours=4),
            "created_at": now - timedelta(days=50),
            "updated_at": now - timedelta(hours=4),
        }
        await db.conversations.insert_one(conv_doc)

        messages = [
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id,
                "sender_id": midwife_id,
                "sender_name": "Emily Thompson",
                "content": "Hi Emma! Welcome to True Joy Birthing. I'm so excited to be part of your birth journey. Let me know if you have any questions before our first prenatal visit.",
                "created_at": now - timedelta(days=50),
                "read_by": [midwife_id, mom_id],
            },
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id,
                "sender_id": mom_id,
                "sender_name": "Emma Johnson",
                "content": "Thank you Emily! I'm really looking forward to working with you. I've been researching birth center births and have a few questions about what to expect.",
                "created_at": now - timedelta(days=49),
                "read_by": [midwife_id, mom_id],
            },
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id,
                "sender_id": midwife_id,
                "sender_name": "Emily Thompson",
                "content": "Of course! We'll go over everything at our first visit. In the meantime, I've shared some resources in your birth plan section. The birth center has water tubs, birthing balls, and a very home-like atmosphere.",
                "created_at": now - timedelta(days=48),
                "read_by": [midwife_id, mom_id],
            },
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id,
                "sender_id": mom_id,
                "sender_name": "Emma Johnson",
                "content": "That sounds amazing! I started working on my birth plan in the app. The water tub sounds wonderful.",
                "created_at": now - timedelta(days=30),
                "read_by": [midwife_id, mom_id],
            },
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id,
                "sender_id": midwife_id,
                "sender_name": "Emily Thompson",
                "content": "Looking forward to our next prenatal visit!",
                "created_at": now - timedelta(hours=4),
                "read_by": [midwife_id],
            },
        ]

        for msg in messages:
            await db.messages.insert_one(msg)
        logger.info("  Seeded midwife-mom conversation with 5 messages")

    # ── Demo Messages (conversation between mom and doula) ──
    conversation_id_2 = "demo_conv_mom_doula"
    existing_conv_2 = await db.conversations.find_one({"conversation_id": conversation_id_2})
    if not existing_conv_2:
        conv_doc_2 = {
            "conversation_id": conversation_id_2,
            "participants": [mom_id, doula_id],
            "participant_names": {mom_id: "Emma Johnson", doula_id: "Sarah Mitchell"},
            "participant_roles": {mom_id: "MOM", doula_id: "DOULA"},
            "last_message": "Remember to practice your breathing exercises this week! 🌸",
            "last_message_at": now - timedelta(hours=8),
            "created_at": now - timedelta(days=45),
            "updated_at": now - timedelta(hours=8),
        }
        await db.conversations.insert_one(conv_doc_2)

        messages_2 = [
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id_2,
                "sender_id": doula_id,
                "sender_name": "Sarah Mitchell",
                "content": "Hi Emma! I'm Sarah, your birth doula. So happy to support you alongside Emily. Let's schedule our first prenatal meeting soon!",
                "created_at": now - timedelta(days=45),
                "read_by": [doula_id, mom_id],
            },
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id_2,
                "sender_id": mom_id,
                "sender_name": "Emma Johnson",
                "content": "Hi Sarah! I'm so glad to have both you and Emily on my team. I'd love to meet next week if you're available.",
                "created_at": now - timedelta(days=44),
                "read_by": [doula_id, mom_id],
            },
            {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "conversation_id": conversation_id_2,
                "sender_id": doula_id,
                "sender_name": "Sarah Mitchell",
                "content": "Remember to practice your breathing exercises this week! 🌸",
                "created_at": now - timedelta(hours=8),
                "read_by": [doula_id],
            },
        ]

        for msg in messages_2:
            await db.messages.insert_one(msg)
        logger.info("  Seeded doula-mom conversation with 3 messages")

    # ── Connect demo mom to her providers (My Team) ──
    team_connections = [
        {
            "connection_id": "demo_team_mom_midwife",
            "mom_user_id": mom_id,
            "provider_user_id": midwife_id,
            "provider_name": "Emily Thompson",
            "provider_role": "MIDWIFE",
            "provider_practice": "Hill Country Midwifery",
            "status": "connected",
            "created_at": now - timedelta(days=55),
        },
        {
            "connection_id": "demo_team_mom_doula",
            "mom_user_id": mom_id,
            "provider_user_id": doula_id,
            "provider_name": "Sarah Mitchell",
            "provider_role": "DOULA",
            "provider_practice": "Heart & Hands Birth Support",
            "status": "connected",
            "created_at": now - timedelta(days=50),
        },
    ]

    for conn in team_connections:
        existing = await db.team_connections.find_one({"connection_id": conn["connection_id"]})
        if not existing:
            await db.team_connections.insert_one(conn)
            logger.info(f"  Connected demo mom to {conn['provider_name']}")

    logger.info("  Demo data seeding complete.")
