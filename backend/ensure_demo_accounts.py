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
    - Lactation: demo.lactation@truejoybirthing.com / DemoLactation2024!
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
        "picture": "https://truejoybirthing.com/images/shelbi-hero-portrait.webp",
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
        "picture": "https://truejoybirthing.com/images/provider-conroe-tx-shelbie-cunningham.webp",
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
        "email": "demo.lactation@truejoybirthing.com",
        "password": "DemoLactation2024!",
        "picture": "https://truejoybirthing.com/images/provider-st-paul-mn-about.webp",
        "full_name": "Jessica Reyes",
        "role": "LACTATION",
        "profile_collection": "lactation_profiles",
        "profile_data": {
            "practice_name": "Nourish Lactation Care",
            "certifications": ["IBCLC"],
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": [
                "Initial Lactation Consultation", "Follow-Up Visits", "Telehealth Lactation Support", "Pump Fitting & Support", "Tongue-Tie Assessment"
            ],
            "years_in_practice": 6,
            "accepting_new_clients": True,
            "bio": "IBCLC providing expert breastfeeding and chestfeeding support for the dyad. Evidence-based, compassionate care from prenatal through weaning.",
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
    # Admin demo account for dashboard access
    {
        "email": "shelbi@truejoybirthing.com",
        "password": "TJBAdmin2024!",
        "full_name": "TJB Admin",
        "role": "ADMIN",
        "profile_collection": None,
        "profile_data": None,
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
    Called on every server startup, but only runs if ENABLE_DEMO_ACCOUNTS env var is set.
    Set ENABLE_DEMO_ACCOUNTS=true in Railway for App Store review builds only.
    """
    import os
    if os.environ.get("ENABLE_DEMO_ACCOUNTS", "false").lower() != "true":
        logger.info("Demo accounts disabled (ENABLE_DEMO_ACCOUNTS not set). Skipping.")
        return

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
            update_fields = {
                "password_hash": password_hash,
                "onboarding_completed": True,
                "is_demo_account": True,
                "email_verified": True,  # demo pros must appear in marketplace (unverified pros are filtered out)
                "role": account["role"],
                "full_name": account["full_name"],
                "updated_at": now,
            }
            # 10/01 Jeff: demo accounts carry real profile photos so screens render populated
            if account.get("picture"):
                update_fields["picture"] = account["picture"]
            await db.users.update_one(
                {"email": email},
                {"$set": update_fields}
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
                "picture": account.get("picture"),
                "onboarding_completed": True,
                "is_demo_account": True,
                "email_verified": True,
                "created_at": now,
                "updated_at": now,
            }
            await db.users.insert_one(user_doc)
            logger.info(f"  Created new demo account: {email} (user_id={user_id})")

        demo_user_ids[account["role"]] = user_id

        # Ensure role-specific profile exists (skip for roles without profiles, e.g. ADMIN)
        profile_collection = account["profile_collection"]
        if profile_collection is None:
            # No profile collection for this role (e.g. ADMIN)
            continue

        profile_data = account["profile_data"]
        if profile_data is None:
            continue

        profile_data = profile_data.copy()

        # Set dynamic due_date for mom accounts
        if account["role"] == "MOM" and profile_data.get("due_date") is None:
            profile_data["due_date"] = (now + timedelta(days=75)).strftime("%Y-%m-%d")

        existing_profile = await db[profile_collection].find_one({"user_id": user_id})
        if not existing_profile:
            profile_data["user_id"] = user_id
            await db[profile_collection].insert_one(profile_data)
            logger.info(f"  Created {profile_collection} profile for {email}")
        else:
            # 10/01 Jeff: demo profiles sync to canonical seed data on every startup —
            # keeps photos, credentials, practice info current for Apple review &
            # dev demo (stale sparse profiles otherwise persist forever).
            profile_data["user_id"] = user_id
            await db[profile_collection].update_one(
                {"user_id": user_id}, {"$set": profile_data}
            )
            logger.info(f"  Synced {profile_collection} profile for {email}")

        # DO NOT auto-create subscriptions for demo/provider accounts.
        # Apple reviewers must see the paywall and test the full IAP flow
        # in App Store sandbox. Pre-granting access triggers guideline 3.1.1
        # rejection ("app accesses paid digital content without IAP").
        # If a reviewer has already completed a sandbox IAP purchase, that
        # subscription record will exist and be honoured by /subscription/status.
        if account["needs_subscription"]:
            existing_sub = await db.subscriptions.find_one({"user_id": user_id})
            if existing_sub and existing_sub.get("subscription_provider") == "DEMO":
                # Remove legacy DEMO-provider subscriptions so reviewers
                # are forced through the real IAP flow on next review.
                await db.subscriptions.delete_one({"user_id": user_id})
                logger.info(f"  Removed legacy DEMO subscription for {email} (IAP required)")
            elif existing_sub:
                logger.info(f"  Existing IAP subscription found for {email} — keeping it")

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

    # ── Unpaid payment-plan invoice for the demo mom (Jeff 10/02 payment demo) ──
    # Lets Jeff walk the full mom payment flow in the app: owed vs paid vs next
    # due, plus mark-installment-paid advancing the plan. Lives in the unified
    # `invoices` collection — GET /mom/invoices only reads db.invoices scoped by
    # db.clients.linked_mom_id + accepted share_requests (so both link rows are
    # ensured below). Shape mirrors build_payment_plan() (routes/invoices.py)
    # exactly: installment_no/amount/'YYYY-MM-DD' due_date/status + rollup.
    await _seed_payment_plan_invoice(db, demo_user_ids, now)

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


async def _seed_payment_plan_invoice(db, demo_user_ids: dict, now: datetime) -> None:
    """One unpaid installment-plan invoice from the demo midwife to the demo mom.

    Jeff's 10/02 payment demo: the mom Invoices screen renders plan progress
    ("1 of 3 paid" chip + Payment Schedule rows) and the provider (or dev
    harness) advances it via /midwife/invoices/{id}/payment-plan/installment/{n}/
    mark-paid. 4500 total, 3×1500; installment 1 PAID 22 days ago, 2 due in 8
    days, 3 due in 38 days. Shape EXACTLY matches build_payment_plan() output
    (routes/invoices.py) so the UI renders plan progress unmodified.

    Upserts (idempotent like the rest of this file): the invoice row, a unified
    db.clients client row (GET /mom/invoices scopes by clients.linked_mom_id),
    and an accepted share_request (scope also requires an ACTIVE relationship —
    get_active_provider_ids_for_mom). The existing Paid doula invoice stays as
    history.
    """
    midwife_id = demo_user_ids.get("MIDWIFE")
    mom_id = demo_user_ids.get("MOM")
    if not midwife_id or not mom_id:
        logger.warning("  Skipping payment-plan invoice seed — missing midwife/mom IDs")
        return

    client_id = "demo_client_mw_plan01"

    # 1) Unified client linking mom ↔ midwife (mom endpoint filters on this)
    client_doc = await db.clients.find_one({"client_id": client_id}) or {
        "client_id": client_id,
        "created_at": now,
    }
    client_doc.update({
        "provider_id": midwife_id,
        "provider_type": "MIDWIFE",
        "linked_mom_id": mom_id,
        "name": "Emma Johnson",
        "email": "demo.mom@truejoybirthing.com",
        "edd": (now + timedelta(days=75)).strftime("%Y-%m-%d"),
        "planned_birth_setting": "Birth Center",
        "status": "Active",
        "is_active": True,
        "updated_at": now,
    })
    await db.clients.update_one(
        {"client_id": client_id},
        {"$set": client_doc},
        upsert=True,
    )

    # 2) Accepted relationship row (get_active_provider_ids_for_mom gate)
    share_request_id = "share_demo_mw_plan01"
    existing_share = await db.share_requests.find_one({
        "mom_user_id": mom_id, "provider_id": midwife_id,
    })
    if existing_share:
        # Keep whatever request_id key this DB's rows use; just ensure active.
        await db.share_requests.update_one(
            {"request_id": existing_share.get("request_id", existing_share.get("share_request_id"))},
            {"$set": {"status": "accepted", "relationship_status": "active", "responded_at": now}},
        )
    else:
        await db.share_requests.insert_one({
            "request_id": share_request_id,
            "mom_user_id": mom_id,
            "mom_name": "Emma Johnson",
            "provider_id": midwife_id,
            "provider_name": "Emily Thompson",
            "provider_role": "MIDWIFE",
            "status": "accepted",
            "relationship_status": "active",
            "created_at": now,
            "responded_at": now,
            "source": "demo_seed",
        })

    # 3) The installment invoice — build_payment_plan-equivalent subdoc
    plan_invoice = {
        "invoice_id": "demo_inv_plan_01",
        "provider_id": midwife_id,
        "provider_type": "MIDWIFE",
        "client_id": client_id,
        "client_name": "Emma Johnson",
        "invoice_number": "INV-PLAN-001",
        "description": "Comprehensive Midwifery Care — Payment Plan (3 installments)",
        "amount": 4500.00,
        "issue_date": (now - timedelta(days=30)).strftime("%Y-%m-%d"),
        "due_date": (now + timedelta(days=8)).strftime("%Y-%m-%d"),
        "payment_instructions_text": "Zelle: billing@hillcountrymidwifery.com or Venmo: @hillcountry-midwifery",
        "notes_for_client": "3-installment plan. Pay each installment by its due date — the schedule below tracks your progress.",
        "status": "Sent",
        "sent_at": now - timedelta(days=30),
        "paid_at": None,
        "payment_plan": _payment_plan_subdoc(
            now,
            paid_nos=[1],  # installment 1 PAID 22 days ago (seeds at 1-of-3 by design)
        ),
        "created_at": now - timedelta(days=30),
        "updated_at": now - timedelta(days=22),
    }

    existing_invoice = await db.invoices.find_one({"invoice_id": plan_invoice["invoice_id"]})
    if existing_invoice:
        # Preserve real progress: never roll a paid installment back to due on re-run.
        paid_nos = sorted(
            i["installment_no"] for i
            in (existing_invoice.get("payment_plan") or {}).get("installments", [])
            if i.get("status") == "paid"
        )
        fresh = _mark_plan_installments_paid(plan_invoice, paid_nos)
        await db.invoices.replace_one(
            {"invoice_id": plan_invoice["invoice_id"]},
            fresh,
            upsert=True,
        )
        logger.info(
            f"  Payment-plan invoice already seeded — {len(paid_nos)} of 3 installments paid, preserved"
        )
    else:
        await db.invoices.insert_one(plan_invoice)
        logger.info(
            "  Seeded payment-plan invoice: $4500 / 3 installments (1 paid, 2 due)"
        )


def _payment_plan_subdoc(now: datetime, paid_nos: list) -> dict:
    """build_payment_plan()-equivalent subdoc: 4500 total, 3×1500, monthly.

    Installments: 1 due 22 days ago, 2 due in 8 days, 3 due in 38 days — the
    natural 30-day cadence puts them on those offsets because it1 must sit 22
    days in the past while it2/it3 keep the 8/38-day future spacing Jeff asked
    for. paid_nos marks already-paid installments; roll-up mirrors _rollup_status
    (routes/invoices.py): all paid → 'paid', some paid → 'partial', none → 'due'.
    """
    it1_due = now - timedelta(days=22)
    it2_due = now + timedelta(days=8)   # next due
    it3_due = now + timedelta(days=38)  # 30-day gap after it2
    plan = {
        "installment_count": 3,
        "amount_per_installment": 1500.00,
        "plan_description": "3 monthly installments of $1,500",
        "due_frequency": "monthly",
        "first_due_date": it1_due.strftime("%Y-%m-%d"),
        "installments": [
            {
                "installment_no": 1,
                "amount": 1500.00,
                "due_date": it1_due.strftime("%Y-%m-%d"),
                "status": "paid" if 1 in paid_nos else "due",
            },
            {
                "installment_no": 2,
                "amount": 1500.00,
                "due_date": it2_due.strftime("%Y-%m-%d"),
                "status": "paid" if 2 in paid_nos else "due",
            },
            {
                "installment_no": 3,
                "amount": 1500.00,
                "due_date": it3_due.strftime("%Y-%m-%d"),
                "status": "paid" if 3 in paid_nos else "due",
            },
        ],
        "total_amount": 4500.00,
        # Roll-up mirrors _rollup_status (routes/invoices.py)
        "status": "partial" if paid_nos and len(set(paid_nos)) < 3 else ("paid" if len(set(paid_nos)) >= 3 else "due"),
    }
    return plan


def _mark_plan_installments_paid(invoice: dict, paid_nos: list) -> dict:
    """Set installments with installment_no in `paid_nos` to status='paid'.

    Mirrors the mark-installment-paid routes' roll-up: partial until every
    installment is paid, then 'paid' (top-level status flips too).
    """
    plan = invoice.get("payment_plan") or {}
    for inst in plan.get("installments", []):
        if inst.get("installment_no") in paid_nos and inst.get("status") != "paid":
            inst["status"] = "paid"
    statuses = {i.get("status") for i in plan.get("installments", [])}
    if statuses == {"paid"} and plan.get("installments"):
        plan["status"] = "paid"
        invoice["status"] = "Paid"
        if not invoice.get("paid_at"):
            invoice["paid_at"] = datetime.now(timezone.utc)
    elif "paid" in statuses:
        plan["status"] = "partial"
        invoice["status"] = "Sent"
        invoice["paid_at"] = None
    else:
        plan["status"] = "due"
        invoice["status"] = "Sent"
        invoice["paid_at"] = None
    invoice["payment_plan"] = plan
    return invoice
