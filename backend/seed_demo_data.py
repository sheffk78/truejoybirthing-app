"""
Demo Data Seed Script for True Joy Birthing
============================================

This script creates realistic demo data for App Store and Google Play screenshots.
All data is fictional and designed for marketing purposes.

Usage:
    python seed_demo_data.py [--reset]
    
Options:
    --reset   Clear existing demo data before seeding

Demo Accounts Created:
    - Demo Doula: demo.doula@truejoybirthing.com / DemoDoula2024!
    - Demo Midwife: demo.midwife@truejoybirthing.com / DemoMidwife2024!
    - Demo Mom: demo.mom@truejoybirthing.com / DemoMom2024!
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
import random

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "truejoy")

# Demo account passwords
DEMO_PASSWORD = "DemoScreenshot2024!"

# ============== DEMO PROFILE IMAGES ==============
# Using DiceBear API for legally-safe, synthetic avatars
# These are procedurally generated and free to use commercially

def get_avatar_url(seed: str, style: str = "avataaars") -> str:
    """Generate a DiceBear avatar URL - legally safe for commercial use"""
    # DiceBear avatars are CC0 licensed and safe for App Store screenshots
    return f"https://api.dicebear.com/7.x/{style}/png?seed={seed}&size=200"

# Alternative: Use UI Avatars for simple initials-based avatars
def get_initials_avatar(name: str, bg_color: str = "9F83B6") -> str:
    """Generate an initials-based avatar"""
    return f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background={bg_color}&color=fff&size=200"


# ============== DEMO DATA DEFINITIONS ==============

DEMO_DOULAS = [
    {
        "email": "demo.doula@truejoybirthing.com",
        "full_name": "Sarah Mitchell",
        "is_primary": True,  # Primary demo account for screenshots
        "profile": {
            "practice_name": "Peaceful Beginnings Doula Services",
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": ["Labor Support", "Postpartum Care", "Childbirth Education", "Virtual Consultations"],
            "years_in_practice": 8,
            "accepting_new_clients": True,
            "bio": "I believe every birthing person deserves compassionate, personalized support throughout their journey to parenthood.",
            "more_about_me": "As a mother of three, I understand the transformative power of birth. My approach combines evidence-based practices with intuitive care, creating a safe space for you to embrace your own strength. I specialize in VBAC support and water births.",
            "video_intro_url": "https://youtube.com/watch?v=demo123",
            "in_marketplace": True,
        }
    },
    {
        "email": "doula.jennifer@demo.com",
        "full_name": "Jennifer Adams",
        "profile": {
            "practice_name": "Nurturing Touch Birth Support",
            "location_city": "Denver",
            "location_state": "CO",
            "services_offered": ["Labor Support", "Prenatal Visits", "Birth Photography"],
            "years_in_practice": 5,
            "accepting_new_clients": True,
            "bio": "Empowering families through education and unwavering support.",
            "in_marketplace": True,
        }
    },
    {
        "email": "doula.maria@demo.com",
        "full_name": "Maria Gonzalez",
        "profile": {
            "practice_name": "Dulce Nacimiento",
            "location_city": "San Antonio",
            "location_state": "TX",
            "services_offered": ["Labor Support", "Postpartum Care", "Breastfeeding Support", "Spanish Speaking"],
            "years_in_practice": 12,
            "accepting_new_clients": True,
            "bio": "Bilingual doula serving diverse families with culturally sensitive care.",
            "in_marketplace": True,
        }
    },
    {
        "email": "doula.ashley@demo.com",
        "full_name": "Ashley Chen",
        "profile": {
            "practice_name": "Mindful Birth Austin",
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": ["Labor Support", "HypnoBirthing", "Meditation", "Virtual Consultations"],
            "years_in_practice": 4,
            "accepting_new_clients": True,
            "bio": "Bringing mindfulness and calm to your birth experience.",
            "in_marketplace": True,
        }
    },
]

DEMO_MIDWIVES = [
    {
        "email": "demo.midwife@truejoybirthing.com",
        "full_name": "Emily Thompson",
        "is_primary": True,  # Primary demo account for screenshots
        "profile": {
            "practice_name": "Hill Country Midwifery",
            "credentials": ["CNM", "IBCLC"],
            "location_city": "Austin",
            "location_state": "TX",
            "services_offered": ["Prenatal Care", "Home Birth", "Birth Center Birth", "Postpartum Care", "Well-Woman Care"],
            "years_in_practice": 15,
            "accepting_new_clients": True,
            "bio": "Certified Nurse-Midwife providing comprehensive, holistic care for your entire reproductive journey.",
            "more_about_me": "With over 15 years of experience and 500+ births attended, I bring both expertise and compassion to every family I serve. I believe in the body's innate wisdom and work alongside you to achieve your safest, most empowering birth.",
            "in_marketplace": True,
        }
    },
    {
        "email": "midwife.rebecca@demo.com",
        "full_name": "Rebecca Williams",
        "profile": {
            "practice_name": "New Beginnings Birth Center",
            "credentials": ["CPM", "LM"],
            "location_city": "Round Rock",
            "location_state": "TX",
            "services_offered": ["Prenatal Care", "Birth Center Birth", "Water Birth", "Postpartum Care"],
            "years_in_practice": 10,
            "accepting_new_clients": True,
            "bio": "Creating sacred space for gentle, intervention-free births.",
            "in_marketplace": True,
        }
    },
    {
        "email": "midwife.diana@demo.com",
        "full_name": "Diana Martinez",
        "profile": {
            "practice_name": "Sage Midwifery",
            "credentials": ["CNM"],
            "location_city": "Cedar Park",
            "location_state": "TX",
            "services_offered": ["Prenatal Care", "Home Birth", "VBAC Support", "Postpartum Care"],
            "years_in_practice": 8,
            "accepting_new_clients": False,
            "bio": "Evidence-based midwifery care centered on your unique needs.",
            "in_marketplace": True,
        }
    },
]

DEMO_MOMS = [
    {
        "email": "demo.mom@truejoybirthing.com",
        "full_name": "Emma Johnson",
        "is_primary": True,  # Primary demo account for screenshots
        "profile": {
            "due_date": (datetime.now() + timedelta(days=75)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Birth Center",
            "location_city": "Austin",
            "location_state": "TX",
        },
        "birth_plan_complete": True,  # Will have a filled birth plan
    },
    {
        "email": "mom.olivia@demo.com",
        "full_name": "Olivia Davis",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Hospital",
            "location_city": "Austin",
            "location_state": "TX",
        }
    },
    {
        "email": "mom.sophia@demo.com",
        "full_name": "Sophia Martinez",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Home",
            "location_city": "Round Rock",
            "location_state": "TX",
        }
    },
    {
        "email": "mom.ava@demo.com",
        "full_name": "Ava Wilson",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Birth Center",
            "location_city": "Cedar Park",
            "location_state": "TX",
        }
    },
    {
        "email": "mom.isabella@demo.com",
        "full_name": "Isabella Brown",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Hospital",
            "location_city": "Pflugerville",
            "location_state": "TX",
        }
    },
    {
        "email": "mom.mia@demo.com",
        "full_name": "Mia Anderson",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Home",
            "location_city": "Austin",
            "location_state": "TX",
        }
    },
    {
        "email": "mom.charlotte@demo.com",
        "full_name": "Charlotte Taylor",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Birth Center",
            "location_city": "Georgetown",
            "location_state": "TX",
        }
    },
    {
        "email": "mom.amelia@demo.com",
        "full_name": "Amelia Thomas",
        "profile": {
            "due_date": (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Hospital",
            "location_city": "Austin",
            "location_state": "TX",
        }
    },
]

# Demo message conversations
DEMO_CONVERSATIONS = [
    # Between primary doula and primary mom
    {
        "participants": ["demo.doula@truejoybirthing.com", "demo.mom@truejoybirthing.com"],
        "messages": [
            {"from_primary": False, "content": "Hi Sarah! I found you through the marketplace and I'm due in about 10 weeks. Are you taking new clients?", "days_ago": 14},
            {"from_primary": True, "content": "Hi Emma! Yes, I'd love to support you on your birth journey! I have availability around your due date. Would you like to schedule a free consultation?", "days_ago": 14},
            {"from_primary": False, "content": "That would be wonderful! I'm available most weekday afternoons.", "days_ago": 13},
            {"from_primary": True, "content": "Perfect! How about this Thursday at 2pm? We can meet virtually or in person - your choice!", "days_ago": 13},
            {"from_primary": False, "content": "Virtual works great for me. Thank you so much! I'm looking forward to it.", "days_ago": 12},
            {"from_primary": True, "content": "Just sent you the calendar invite. In the meantime, feel free to start working on your birth plan in the app. We can review it together during our call! 💜", "days_ago": 12},
            {"from_primary": False, "content": "I've been filling it out! Quick question - should I include my partner in the consultation call?", "days_ago": 5},
            {"from_primary": True, "content": "Absolutely! It's wonderful when partners can be involved from the start. It helps everyone feel prepared and connected.", "days_ago": 5},
            {"from_primary": False, "content": "Great! He's excited to join. See you Thursday!", "days_ago": 4},
            {"from_primary": True, "content": "Looking forward to meeting you both! 🌸", "days_ago": 4},
        ]
    },
    # Between primary midwife and another mom
    {
        "participants": ["demo.midwife@truejoybirthing.com", "mom.sophia@demo.com"],
        "messages": [
            {"from_primary": True, "content": "Hi Sophia! Just a reminder that your 28-week prenatal appointment is tomorrow at 10am. Don't forget to bring your glucose drink for the test!", "days_ago": 3},
            {"from_primary": False, "content": "Thank you for the reminder, Emily! I have it in the fridge ready to go. Is there anything else I should prepare?", "days_ago": 3},
            {"from_primary": True, "content": "Just come with any questions you have - we'll go over everything including your birth preferences. Also, if you haven't already, start thinking about your support team for the home birth.", "days_ago": 2},
            {"from_primary": False, "content": "Perfect! My mom is flying in the week before my due date. Can she be at the birth?", "days_ago": 2},
            {"from_primary": True, "content": "Absolutely! The more love and support, the better. We can discuss her role during our visit. See you tomorrow! 🏠✨", "days_ago": 1},
        ]
    },
]

# Demo invoices
DEMO_INVOICES = [
    {
        "provider_email": "demo.doula@truejoybirthing.com",
        "client_name": "Emma Johnson",
        "description": "Doula Birth Package - Full Support",
        "amount": 1800.00,
        "status": "Paid",
        "days_ago_issued": 45,
        "paid": True,
    },
    {
        "provider_email": "demo.doula@truejoybirthing.com",
        "client_name": "Olivia Davis",
        "description": "Prenatal Support Package",
        "amount": 600.00,
        "status": "Sent",
        "days_ago_issued": 7,
        "paid": False,
    },
    {
        "provider_email": "demo.doula@truejoybirthing.com",
        "client_name": "Ava Wilson",
        "description": "Postpartum Doula - 20 Hours",
        "amount": 900.00,
        "status": "Draft",
        "days_ago_issued": 2,
        "paid": False,
    },
    {
        "provider_email": "demo.midwife@truejoybirthing.com",
        "client_name": "Sophia Martinez",
        "description": "Home Birth Package - Complete Care",
        "amount": 5500.00,
        "status": "Paid",
        "days_ago_issued": 60,
        "paid": True,
    },
    {
        "provider_email": "demo.midwife@truejoybirthing.com",
        "client_name": "Mia Anderson",
        "description": "Prenatal Care - Initial Visit",
        "amount": 350.00,
        "status": "Sent",
        "days_ago_issued": 5,
        "paid": False,
    },
]

# Demo birth plan for primary mom
DEMO_BIRTH_PLAN = {
    "sections": [
        {
            "section_id": "about_me",
            "title": "About Me & My Preferences",
            "status": "Complete",
            "data": {
                "birth_location": "Austin Area Birthing Center",
                "support_people": "Partner (James), Doula (Sarah Mitchell)",
                "special_circumstances": "First pregnancy, low-risk",
                "cultural_preferences": "Would like calm, peaceful environment with dim lighting",
            }
        },
        {
            "section_id": "labor_delivery",
            "title": "Labor & Delivery Preferences",
            "status": "Complete",
            "data": {
                "mobility": "I want to move freely and change positions as needed",
                "eating_drinking": "I'd like to eat light snacks and drink fluids as desired",
                "atmosphere": "Dim lights, quiet voices, my own playlist playing softly",
                "labor_positions": "Standing, hands and knees, birth ball, squatting",
            }
        },
        {
            "section_id": "pain_management",
            "title": "Pain Management",
            "status": "Complete",
            "data": {
                "primary_approach": "I prefer to try natural comfort measures first",
                "comfort_measures": "Hydrotherapy, massage, breathing techniques, movement",
                "medication_preferences": "Open to discussing options if labor is very long",
                "epidural_preference": "Would like to avoid unless medically necessary",
            }
        },
        {
            "section_id": "monitoring_iv",
            "title": "Labor Environment & Comfort",
            "status": "Complete",
            "data": {
                "monitoring_preference": "Intermittent monitoring preferred",
                "iv_preference": "Prefer hep-lock if IV access is needed",
                "environment": "Aromatherapy (lavender), dim lighting, birth ball available",
            }
        },
        {
            "section_id": "induction_interventions",
            "title": "Induction & Birth Interventions",
            "status": "Complete",
            "data": {
                "induction_preference": "Would prefer to wait for spontaneous labor unless medically indicated",
                "membrane_rupture": "Prefer spontaneous rupture",
                "pitocin_preference": "Only if medically necessary",
            }
        },
        {
            "section_id": "pushing_safe_word",
            "title": "Pushing, Delivery & Safe Word",
            "status": "Complete",
            "data": {
                "pushing_preference": "Mother-directed pushing, follow body's urges",
                "delivery_position": "Whatever feels right in the moment",
                "safe_word": "PAUSE - means I need everything to stop for a moment",
                "perineal_support": "Warm compresses, perineal support preferred",
            }
        },
        {
            "section_id": "post_delivery",
            "title": "Post-Delivery Preferences",
            "status": "Complete",
            "data": {
                "skin_to_skin": "Immediate and uninterrupted skin-to-skin contact",
                "cord_clamping": "Delayed cord clamping until cord stops pulsing",
                "cord_cutting": "Partner would like to cut the cord",
                "placenta": "Would like to see it and have it explained",
            }
        },
        {
            "section_id": "newborn_care",
            "title": "Newborn Care Preferences",
            "status": "Complete",
            "data": {
                "first_bath": "Delay first bath for at least 24 hours",
                "feeding_preference": "Breastfeeding - would like lactation support",
                "eye_treatment": "Standard treatment is fine",
                "vitamin_k": "Yes, please administer vitamin K",
                "hepatitis_b": "Yes, before discharge",
            }
        },
        {
            "section_id": "other_considerations",
            "title": "Other Important Considerations",
            "status": "Complete",
            "data": {
                "photography": "Partner will take photos, please allow during pushing if appropriate",
                "visitors": "No visitors during labor, immediate family after birth",
                "cesarean_preferences": "If cesarean is needed: partner present, skin-to-skin in OR if possible, clear drape",
                "additional_notes": "We chose the birth center for their low-intervention approach. We've taken childbirth education classes and feel prepared for a physiologic birth.",
            }
        },
    ],
    "completion_percentage": 100.0
}

# Demo notes for providers
DEMO_NOTES = [
    {
        "provider_email": "demo.doula@truejoybirthing.com",
        "client_name": "Emma Johnson",
        "notes": [
            {
                "note_type": "Prenatal",
                "content": "Initial consultation completed. Emma and James are excited first-time parents planning a birth center birth. Discussed birth preferences and reviewed early labor signs. Emma expressed some anxiety about labor pain - we worked on breathing exercises together.",
                "days_ago": 30,
            },
            {
                "note_type": "Prenatal",
                "content": "Second prenatal visit. Reviewed birth plan together - looks great! Practiced comfort measures including massage, positions, and visualization. James learned hip squeeze technique. Both feeling more confident.",
                "days_ago": 14,
            },
        ]
    },
    {
        "provider_email": "demo.midwife@truejoybirthing.com",
        "client_name": "Sophia Martinez",
        "notes": [
            {
                "note_type": "Prenatal",
                "content": "28 week visit. GCT completed - results pending. Fundal height on track, baby active. Discussed home birth preparations - Sophia has birthing tub reserved and supplies gathered. Mother arriving from California week 38.",
                "days_ago": 10,
            },
            {
                "note_type": "Prenatal",
                "content": "32 week visit. Baby vertex, heart tones strong. Reviewed emergency protocols and hospital transfer plan. Sophia feeling well, some mild edema in ankles - discussed elevation and hydration.",
                "days_ago": 3,
            },
        ]
    },
]


# ============== SEED FUNCTIONS ==============

def generate_user_id():
    return f"user_{uuid.uuid4().hex[:12]}"

def generate_client_id():
    return f"client_{uuid.uuid4().hex[:12]}"

def generate_contract_id():
    return f"contract_{uuid.uuid4().hex[:12]}"

def generate_invoice_id():
    return f"inv_{uuid.uuid4().hex[:8]}"

def generate_note_id():
    return f"note_{uuid.uuid4().hex[:8]}"

def generate_message_id():
    return f"msg_{uuid.uuid4().hex[:12]}"

def generate_plan_id():
    return f"plan_{uuid.uuid4().hex[:12]}"


async def seed_demo_data(reset: bool = False):
    """Seed all demo data into the database"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connected to MongoDB: {DB_NAME}")
    
    if reset:
        print("Resetting demo data...")
        # Delete existing demo accounts
        demo_emails = [d["email"] for d in DEMO_DOULAS + DEMO_MIDWIVES + DEMO_MOMS]
        await db.users.delete_many({"email": {"$in": demo_emails}})
        await db.doula_profiles.delete_many({"user_id": {"$regex": "^demo_"}})
        await db.midwife_profiles.delete_many({"user_id": {"$regex": "^demo_"}})
        await db.mom_profiles.delete_many({"user_id": {"$regex": "^demo_"}})
        await db.clients.delete_many({"client_id": {"$regex": "^demo_"}})
        await db.messages.delete_many({"message_id": {"$regex": "^demo_"}})
        await db.invoices.delete_many({"invoice_id": {"$regex": "^demo_"}})
        await db.notes.delete_many({"note_id": {"$regex": "^demo_"}})
        await db.birth_plans.delete_many({"plan_id": {"$regex": "^demo_"}})
        await db.subscriptions.delete_many({"subscription_id": {"$regex": "^demo_"}})
        print("Demo data cleared.")
    
    now = datetime.now(timezone.utc)
    user_map = {}  # email -> user_id mapping
    
    # 1. Create doula users and profiles
    print("\nCreating demo doulas...")
    for doula in DEMO_DOULAS:
        user_id = f"demo_doula_{uuid.uuid4().hex[:8]}"
        user_map[doula["email"]] = user_id
        
        # Create user
        user_doc = {
            "user_id": user_id,
            "email": doula["email"],
            "full_name": doula["full_name"],
            "role": "DOULA",
            "password_hash": pwd_context.hash(DEMO_PASSWORD),
            "picture": get_avatar_url(doula["full_name"], "lorelei"),
            "onboarding_completed": True,
            "created_at": now - timedelta(days=random.randint(30, 365)),
            "updated_at": now,
            "is_demo_account": True,
        }
        await db.users.update_one(
            {"email": doula["email"]},
            {"$set": user_doc},
            upsert=True
        )
        
        # Create profile
        profile = doula["profile"].copy()
        profile["user_id"] = user_id
        profile["picture"] = get_avatar_url(doula["full_name"], "lorelei")
        await db.doula_profiles.update_one(
            {"user_id": user_id},
            {"$set": profile},
            upsert=True
        )
        
        # Create subscription for primary demo account
        if doula.get("is_primary"):
            sub_doc = {
                "subscription_id": f"demo_sub_{uuid.uuid4().hex[:8]}",
                "user_id": user_id,
                "subscription_status": "trial",
                "plan_type": "annual",
                "subscription_provider": "MOCK",
                "trial_start_date": now - timedelta(days=5),
                "trial_end_date": now + timedelta(days=25),
                "auto_renewing": True,
                "created_at": now,
            }
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": sub_doc},
                upsert=True
            )
        
        print(f"  ✓ {doula['full_name']} ({doula['email']})")
    
    # 2. Create midwife users and profiles
    print("\nCreating demo midwives...")
    for midwife in DEMO_MIDWIVES:
        user_id = f"demo_midwife_{uuid.uuid4().hex[:8]}"
        user_map[midwife["email"]] = user_id
        
        # Create user
        user_doc = {
            "user_id": user_id,
            "email": midwife["email"],
            "full_name": midwife["full_name"],
            "role": "MIDWIFE",
            "hashed_password": pwd_context.hash(DEMO_PASSWORD),
            "picture": get_avatar_url(midwife["full_name"], "lorelei"),
            "onboarding_completed": True,
            "created_at": now - timedelta(days=random.randint(30, 365)),
            "updated_at": now,
            "is_demo_account": True,
        }
        await db.users.update_one(
            {"email": midwife["email"]},
            {"$set": user_doc},
            upsert=True
        )
        
        # Create profile
        profile = midwife["profile"].copy()
        profile["user_id"] = user_id
        profile["picture"] = get_avatar_url(midwife["full_name"], "lorelei")
        await db.midwife_profiles.update_one(
            {"user_id": user_id},
            {"$set": profile},
            upsert=True
        )
        
        # Create subscription for primary demo account
        if midwife.get("is_primary"):
            sub_doc = {
                "subscription_id": f"demo_sub_{uuid.uuid4().hex[:8]}",
                "user_id": user_id,
                "subscription_status": "active",
                "plan_type": "annual",
                "subscription_provider": "MOCK",
                "subscription_start_date": now - timedelta(days=60),
                "subscription_end_date": now + timedelta(days=305),
                "auto_renewing": True,
                "created_at": now,
            }
            await db.subscriptions.update_one(
                {"user_id": user_id},
                {"$set": sub_doc},
                upsert=True
            )
        
        print(f"  ✓ {midwife['full_name']} ({midwife['email']})")
    
    # 3. Create mom users and profiles
    print("\nCreating demo moms...")
    for mom in DEMO_MOMS:
        user_id = f"demo_mom_{uuid.uuid4().hex[:8]}"
        user_map[mom["email"]] = user_id
        
        # Create user
        user_doc = {
            "user_id": user_id,
            "email": mom["email"],
            "full_name": mom["full_name"],
            "role": "MOM",
            "hashed_password": pwd_context.hash(DEMO_PASSWORD),
            "picture": get_avatar_url(mom["full_name"], "lorelei"),
            "onboarding_completed": True,
            "created_at": now - timedelta(days=random.randint(30, 180)),
            "updated_at": now,
            "is_demo_account": True,
        }
        await db.users.update_one(
            {"email": mom["email"]},
            {"$set": user_doc},
            upsert=True
        )
        
        # Create profile
        profile = mom["profile"].copy()
        profile["user_id"] = user_id
        await db.mom_profiles.update_one(
            {"user_id": user_id},
            {"$set": profile},
            upsert=True
        )
        
        # Create birth plan for primary mom
        if mom.get("birth_plan_complete"):
            plan_doc = {
                "plan_id": f"demo_plan_{uuid.uuid4().hex[:8]}",
                "user_id": user_id,
                "sections": DEMO_BIRTH_PLAN["sections"],
                "completion_percentage": DEMO_BIRTH_PLAN["completion_percentage"],
                "created_at": now - timedelta(days=30),
                "updated_at": now,
            }
            await db.birth_plans.update_one(
                {"user_id": user_id},
                {"$set": plan_doc},
                upsert=True
            )
        
        print(f"  ✓ {mom['full_name']} ({mom['email']})")
    
    # 4. Create client records (linking moms to providers)
    print("\nCreating client relationships...")
    
    # Link primary mom to primary doula
    primary_doula_id = user_map["demo.doula@truejoybirthing.com"]
    primary_mom_id = user_map["demo.mom@truejoybirthing.com"]
    
    client_doc = {
        "client_id": f"demo_client_{uuid.uuid4().hex[:8]}",
        "pro_user_id": primary_doula_id,
        "provider_type": "DOULA",
        "name": "Emma Johnson",
        "email": "demo.mom@truejoybirthing.com",
        "edd": (datetime.now() + timedelta(days=75)).strftime("%Y-%m-%d"),
        "planned_birth_setting": "Birth Center",
        "status": "Active",
        "linked_mom_id": primary_mom_id,
        "created_at": now - timedelta(days=45),
        "updated_at": now,
    }
    await db.clients.update_one(
        {"pro_user_id": primary_doula_id, "email": "demo.mom@truejoybirthing.com"},
        {"$set": client_doc},
        upsert=True
    )
    print(f"  ✓ Emma Johnson → Sarah Mitchell (Doula)")
    
    # Add more clients for the primary doula
    additional_clients = [
        {"name": "Olivia Davis", "email": "mom.olivia@demo.com", "edd_days": 45, "setting": "Hospital", "status": "Active"},
        {"name": "Ava Wilson", "email": "mom.ava@demo.com", "edd_days": 30, "setting": "Birth Center", "status": "Active"},
        {"name": "Charlotte Taylor", "email": "mom.charlotte@demo.com", "edd_days": 15, "setting": "Birth Center", "status": "Active"},
    ]
    
    for c in additional_clients:
        client_doc = {
            "client_id": f"demo_client_{uuid.uuid4().hex[:8]}",
            "pro_user_id": primary_doula_id,
            "provider_type": "DOULA",
            "name": c["name"],
            "email": c["email"],
            "edd": (datetime.now() + timedelta(days=c["edd_days"])).strftime("%Y-%m-%d"),
            "planned_birth_setting": c["setting"],
            "status": c["status"],
            "linked_mom_id": user_map.get(c["email"]),
            "created_at": now - timedelta(days=random.randint(10, 60)),
            "updated_at": now,
        }
        await db.clients.update_one(
            {"pro_user_id": primary_doula_id, "email": c["email"]},
            {"$set": client_doc},
            upsert=True
        )
        print(f"  ✓ {c['name']} → Sarah Mitchell (Doula)")
    
    # Link moms to primary midwife
    primary_midwife_id = user_map["demo.midwife@truejoybirthing.com"]
    
    midwife_clients = [
        {"name": "Sophia Martinez", "email": "mom.sophia@demo.com", "edd_days": 90, "setting": "Home", "status": "Active"},
        {"name": "Mia Anderson", "email": "mom.mia@demo.com", "edd_days": 60, "setting": "Home", "status": "Active"},
        {"name": "Amelia Thomas", "email": "mom.amelia@demo.com", "edd_days": 100, "setting": "Hospital", "status": "Active"},
    ]
    
    for c in midwife_clients:
        client_doc = {
            "client_id": f"demo_client_{uuid.uuid4().hex[:8]}",
            "pro_user_id": primary_midwife_id,
            "provider_type": "MIDWIFE",
            "name": c["name"],
            "email": c["email"],
            "edd": (datetime.now() + timedelta(days=c["edd_days"])).strftime("%Y-%m-%d"),
            "planned_birth_setting": c["setting"],
            "status": c["status"],
            "linked_mom_id": user_map.get(c["email"]),
            "created_at": now - timedelta(days=random.randint(10, 90)),
            "updated_at": now,
        }
        await db.clients.update_one(
            {"pro_user_id": primary_midwife_id, "email": c["email"]},
            {"$set": client_doc},
            upsert=True
        )
        print(f"  ✓ {c['name']} → Emily Thompson (Midwife)")
    
    # 5. Create messages
    print("\nCreating demo messages...")
    for convo in DEMO_CONVERSATIONS:
        participant1_email = convo["participants"][0]
        participant2_email = convo["participants"][1]
        
        participant1_id = user_map[participant1_email]
        participant2_id = user_map[participant2_email]
        
        # Get user info
        user1 = await db.users.find_one({"user_id": participant1_id})
        user2 = await db.users.find_one({"user_id": participant2_id})
        
        for msg in convo["messages"]:
            if msg["from_primary"]:
                sender_id = participant1_id
                sender_name = user1["full_name"]
                sender_role = user1["role"]
                receiver_id = participant2_id
                receiver_name = user2["full_name"]
                receiver_role = user2["role"]
            else:
                sender_id = participant2_id
                sender_name = user2["full_name"]
                sender_role = user2["role"]
                receiver_id = participant1_id
                receiver_name = user1["full_name"]
                receiver_role = user1["role"]
            
            message_doc = {
                "message_id": f"demo_msg_{uuid.uuid4().hex[:8]}",
                "sender_id": sender_id,
                "sender_name": sender_name,
                "sender_role": sender_role,
                "receiver_id": receiver_id,
                "receiver_name": receiver_name,
                "receiver_role": receiver_role,
                "content": msg["content"],
                "read": True,
                "created_at": now - timedelta(days=msg["days_ago"]),
            }
            await db.messages.insert_one(message_doc)
        
        print(f"  ✓ Conversation between {user1['full_name']} and {user2['full_name']}")
    
    # 6. Create invoices
    print("\nCreating demo invoices...")
    for inv in DEMO_INVOICES:
        provider_id = user_map[inv["provider_email"]]
        provider = await db.users.find_one({"user_id": provider_id})
        
        # Find the client
        client = await db.clients.find_one({
            "pro_user_id": provider_id,
            "name": inv["client_name"]
        })
        
        if not client:
            continue
        
        invoice_doc = {
            "invoice_id": f"demo_inv_{uuid.uuid4().hex[:8]}",
            "pro_user_id": provider_id,
            "pro_type": provider["role"],
            "client_id": client["client_id"],
            "client_name": inv["client_name"],
            "invoice_number": f"INV-{random.randint(1000, 9999)}",
            "description": inv["description"],
            "amount": inv["amount"],
            "issue_date": (now - timedelta(days=inv["days_ago_issued"])).strftime("%Y-%m-%d"),
            "due_date": (now - timedelta(days=inv["days_ago_issued"]) + timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": inv["status"],
            "sent_at": now - timedelta(days=inv["days_ago_issued"]) if inv["status"] != "Draft" else None,
            "paid_at": now - timedelta(days=inv["days_ago_issued"] - 10) if inv["paid"] else None,
            "created_at": now - timedelta(days=inv["days_ago_issued"]),
            "updated_at": now,
        }
        await db.invoices.insert_one(invoice_doc)
        print(f"  ✓ {inv['description']} - ${inv['amount']} ({inv['status']})")
    
    # 7. Create notes
    print("\nCreating demo notes...")
    for note_set in DEMO_NOTES:
        provider_id = user_map[note_set["provider_email"]]
        
        # Find the client
        client = await db.clients.find_one({
            "pro_user_id": provider_id,
            "name": note_set["client_name"]
        })
        
        if not client:
            continue
        
        for note in note_set["notes"]:
            note_doc = {
                "note_id": f"demo_note_{uuid.uuid4().hex[:8]}",
                "provider_id": provider_id,
                "client_id": client["client_id"],
                "note_type": note["note_type"],
                "content": note["content"],
                "date": (now - timedelta(days=note["days_ago"])).strftime("%Y-%m-%d"),
                "created_at": now - timedelta(days=note["days_ago"]),
                "updated_at": now,
            }
            await db.notes.insert_one(note_doc)
        print(f"  ✓ Notes for {note_set['client_name']}")
    
    # 8. Create contracts
    print("\nCreating demo contracts...")
    
    # Contract for Emma (primary doula's client)
    emma_client = await db.clients.find_one({
        "pro_user_id": primary_doula_id,
        "name": "Emma Johnson"
    })
    
    if emma_client:
        contract_doc = {
            "contract_id": f"demo_contract_{uuid.uuid4().hex[:8]}",
            "doula_id": primary_doula_id,
            "doula_name": "Sarah Mitchell",
            "client_id": emma_client["client_id"],
            "client_name": "Emma Johnson",
            "estimated_due_date": emma_client["edd"],
            "total_fee": 1800.00,
            "retainer_amount": 500.00,
            "remaining_balance": 1300.00,
            "final_payment_due_description": "Day after birth",
            "agreement_date": (now - timedelta(days=40)).strftime("%Y-%m-%d"),
            "prenatal_visit_description": "Two prenatal visits (90 minutes each)",
            "on_call_window_description": "38-42 weeks",
            "postpartum_visit_description": "One postpartum visit within first week",
            "status": "Signed",
            "client_signature": {
                "signer_name": "Emma Johnson",
                "signed_at": (now - timedelta(days=38)).isoformat(),
            },
            "doula_signature": {
                "signer_name": "Sarah Mitchell",
                "signed_at": (now - timedelta(days=40)).isoformat(),
            },
            "signed_at": now - timedelta(days=38),
            "created_at": now - timedelta(days=40),
            "updated_at": now,
        }
        await db.contracts.insert_one(contract_doc)
        print("  ✓ Contract: Sarah Mitchell → Emma Johnson (Signed)")
    
    print("\n" + "="*50)
    print("DEMO DATA SEED COMPLETE!")
    print("="*50)
    print("\nDemo Account Credentials:")
    print("-" * 40)
    print(f"Demo Doula:   demo.doula@truejoybirthing.com")
    print(f"Demo Midwife: demo.midwife@truejoybirthing.com")
    print(f"Demo Mom:     demo.mom@truejoybirthing.com")
    print(f"Password:     {DEMO_PASSWORD}")
    print("-" * 40)
    
    await client.close()


async def clear_demo_data():
    """Clear all demo data from the database"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Clearing demo data...")
    
    # Clear by is_demo_account flag
    result = await db.users.delete_many({"is_demo_account": True})
    print(f"  Deleted {result.deleted_count} demo users")
    
    # Clear by demo_ prefix in IDs
    collections = ["doula_profiles", "midwife_profiles", "mom_profiles", 
                   "clients", "messages", "invoices", "notes", "birth_plans",
                   "contracts", "subscriptions"]
    
    for coll_name in collections:
        coll = db[coll_name]
        # Try different ID field patterns
        for field in ["user_id", "client_id", "message_id", "invoice_id", 
                      "note_id", "plan_id", "contract_id", "subscription_id"]:
            result = await coll.delete_many({field: {"$regex": "^demo_"}})
            if result.deleted_count > 0:
                print(f"  Deleted {result.deleted_count} demo records from {coll_name}")
    
    print("Demo data cleared!")
    client.close()


if __name__ == "__main__":
    import sys
    
    reset = "--reset" in sys.argv
    clear_only = "--clear" in sys.argv
    
    if clear_only:
        asyncio.run(clear_demo_data())
    else:
        asyncio.run(seed_demo_data(reset=reset))
