"""
Utility Routes Module

Handles utility endpoints like zip code lookup, weekly content,
and other helper endpoints that don't fit in other modules.
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
import httpx
from pydantic import BaseModel
from typing import Optional

from .dependencies import get_db, check_role, User
from weekly_content import (
    WEEKLY_TIPS as FULL_WEEKLY_TIPS,
    WEEKLY_AFFIRMATIONS as FULL_WEEKLY_AFFIRMATIONS,
    POSTPARTUM_TIPS as FULL_POSTPARTUM_TIPS,
    POSTPARTUM_AFFIRMATIONS as FULL_POSTPARTUM_AFFIRMATIONS,
    get_weekly_tip as get_full_weekly_tip,
    get_weekly_affirmation as get_full_weekly_affirmation,
)

router = APIRouter()

# Get dependencies
db = get_db()


# ============== ZIP CODE LOOKUP ==============

@router.get("/lookup/zipcode/{zipcode}")
async def lookup_zipcode(zipcode: str):
    """Look up city and state from zip code using Zippopotam.us API"""
    if len(zipcode) != 5 or not zipcode.isdigit():
        raise HTTPException(status_code=400, detail="Zip code must be 5 digits")

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(f"https://api.zippopotam.us/us/{zipcode}")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Invalid zip code")
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Zip code lookup failed")
            
            data = response.json()
            places = data.get("places", [])
            if not places:
                raise HTTPException(status_code=404, detail="No location found for zip code")
            
            place = places[0]
            return {
                "zip_code": zipcode,
                "city": place.get("place name", ""),
                "state": place.get("state", ""),
                "state_abbreviation": place.get("state abbreviation", ""),
                "country": data.get("country", "United States")
            }
    except httpx.RequestError:
        raise HTTPException(status_code=500, detail="Unable to reach zip code service")


# ============== WEEKLY CONTENT ==============

# Weekly tips for each week of pregnancy
WEEKLY_TIPS = {
    1: "Week 1 marks the start of your menstrual cycle. Your body is preparing for conception.",
    2: "Ovulation typically occurs this week. It's a great time to focus on nutrition and prenatal vitamins.",
    3: "Fertilization may have just occurred! The tiny embryo is traveling to your uterus.",
    4: "Implantation is happening. You might notice light spotting or feel some mild cramping.",
    5: "Your baby's heart is forming! Time to schedule your first prenatal appointment.",
    6: "Your baby is the size of a sweet pea. Morning sickness may begin around now.",
    7: "Your baby's brain is developing rapidly. Stay hydrated and rest when needed.",
    8: "Your baby is now about the size of a raspberry. Fingers and toes are forming!",
    9: "Your baby can make tiny movements now. All essential organs have begun to form.",
    10: "End of the embryonic period - your baby is now officially a fetus!",
    11: "Your baby's bones are starting to harden. Consider comfortable clothing options.",
    12: "First trimester is almost done! Your baby's reflexes are developing.",
    13: "Welcome to the second trimester! Many women feel more energetic now.",
    14: "Your baby can squint, frown, and grimace. Their facial muscles are working!",
    15: "Your baby might be sucking their thumb. Legs are growing longer than arms.",
    16: "You might feel your baby move for the first time - called 'quickening'.",
    17: "Your baby's skeleton is changing from cartilage to bone.",
    18: "Your baby's ears are in their final position. They can hear your voice!",
    19: "Halfway there! Your baby is developing vernix, a protective coating.",
    20: "Anatomy scan week! You might learn your baby's sex if you want to.",
    21: "Your baby is practicing swallowing. Their movements are getting stronger.",
    22: "Your baby's lips and eyelids are more defined. Nails are growing!",
    23: "Your baby can hear sounds from outside the womb. Play them music!",
    24: "Viability milestone! Your baby's lungs are developing surfactant.",
    25: "Your baby responds to your voice. Keep talking and singing to them!",
    26: "Your baby's eyes are opening for the first time. Amazing development!",
    27: "Third trimester begins! Your baby is dreaming during REM sleep.",
    28: "Your baby can blink! Start thinking about your birth preferences.",
    29: "Your baby's brain is getting smoother. They're gaining fat for warmth.",
    30: "Your baby is about 3 pounds now. Space is getting tight in there!",
    31: "Your baby's five senses are all working. They can see, hear, taste, touch, and smell.",
    32: "Your baby is practicing breathing. Hiccups are common!",
    33: "Your baby's bones are hardening, except for the skull (for birth).",
    34: "Your baby's fingernails reach their fingertips. Almost ready!",
    35: "Your baby is likely head-down now. Most of their growth is complete.",
    36: "Full term is approaching! Your baby is shedding their lanugo.",
    37: "Early term! Your baby is ready for life outside the womb.",
    38: "Your baby's organs are fully mature. Any day now!",
    39: "Full term! Your baby continues to build fat and practice breathing.",
    40: "Due date week! Your baby is ready to meet you.",
    41: "Past your due date? This is normal! Stay patient and rest.",
    42: "Still waiting? Talk to your provider about next steps."
}

WEEKLY_AFFIRMATIONS = {
    1: "I trust my body's natural rhythms and cycles.",
    2: "I am creating the perfect environment for new life.",
    3: "My body knows exactly what to do.",
    4: "I welcome this new chapter with open arms.",
    5: "My baby's heart beats strong within me.",
    6: "I listen to my body and honor its needs.",
    7: "I am grateful for each day of this pregnancy.",
    8: "I am strong, capable, and growing a miracle.",
    9: "I trust the process of growth and development.",
    10: "I celebrate every milestone with joy.",
    11: "I am building a healthy foundation for my baby.",
    12: "I have everything I need within me.",
    13: "I embrace the energy of this new trimester.",
    14: "I am connected to my growing baby.",
    15: "I radiate peace and calm to my baby.",
    16: "I cherish every flutter and movement.",
    17: "I am patient and trust in divine timing.",
    18: "My voice is a comfort to my baby.",
    19: "I am halfway to meeting my little one.",
    20: "I celebrate my baby's development today.",
    21: "I am surrounded by love and support.",
    22: "I honor my changing body with gratitude.",
    23: "I speak words of love to my growing baby.",
    24: "Each week brings us closer together.",
    25: "I am strong and my baby is thriving.",
    26: "I am in awe of the miracle I carry.",
    27: "I prepare my heart for this sacred journey.",
    28: "I trust my body to know how to birth.",
    29: "I am confident in my ability to nurture.",
    30: "I embrace the final stages of pregnancy.",
    31: "I am ready for the beautiful road ahead.",
    32: "My body is preparing perfectly for birth.",
    33: "I release all fear and welcome peace.",
    34: "I am excited to meet my baby soon.",
    35: "I trust my body's wisdom completely.",
    36: "I am calm, prepared, and ready.",
    37: "My baby will arrive at the perfect time.",
    38: "I welcome each contraction as progress.",
    39: "I am powerful and capable of birthing.",
    40: "I trust my baby to choose their birthday.",
    41: "Patience brings its own rewards.",
    42: "I remain calm and trust the process."
}

POSTPARTUM_TIPS = {
    1: "Rest is not a luxury, it's a necessity. Sleep when your baby sleeps.",
    2: "Accept help from others. Your recovery matters too.",
    3: "Stay hydrated, especially if breastfeeding. Keep water nearby.",
    4: "Gentle movement helps recovery. Short walks can lift your mood.",
    5: "It's okay to not feel 'baby bliss' immediately. Your feelings are valid.",
    6: "Celebrate small victories. You're doing an amazing job!"
}

POSTPARTUM_AFFIRMATIONS = {
    1: "I am exactly the parent my baby needs.",
    2: "I give myself grace during this transition.",
    3: "I am learning and growing alongside my baby.",
    4: "My love for my baby grows stronger each day.",
    5: "I trust myself to care for my little one.",
    6: "I am proud of myself and all I've accomplished."
}

# ============== BABY DEVELOPMENT ==============

# Baby development data for each pregnancy week (weeks 4-40)
# Phase "size_reference" (weeks 4-12): food-item illustrations with size comparisons
# Phase "cross_section" (weeks 13-40): baby-in-belly cross-section illustrations
WEEKLY_BABY_DEVELOPMENT = {
    4: {
        "title": "As small as a poppy seed",
        "description": "Your baby is still tiny — the embryo is now fully implanted in the uterus and the amniotic sac is beginning to form. One fascinating early step is that the placenta is already starting to develop, even before your baby looks anything like a baby yet.",
        "phase": "size_reference",
        "food": "poppy seed",
        "size_note": "~1mm",
    },
    5: {
        "title": "As small as an apple seed",
        "description": "This week, the neural tube is forming, which will become your baby's brain and spinal cord. Another amazing detail is that the early heart tube starts developing now and will begin pulsing very soon.",
        "phase": "size_reference",
        "food": "apple seed",
        "size_note": "~2mm",
    },
    6: {
        "title": "As small as a lentil",
        "description": "Tiny arm and leg buds are beginning to appear, and early facial features are starting to take shape. This is also around the time early circulation begins, which feels wild considering how little your baby still is.",
        "phase": "size_reference",
        "food": "lentil",
        "size_note": "~0.6cm",
    },
    7: {
        "title": "As small as a blueberry",
        "description": "Your baby's head is still much bigger than the rest of the body, which is completely normal at this stage. The very first bone tissue is beginning to form from cartilage, and early structures for the genitals are starting to develop too.",
        "phase": "size_reference",
        "food": "blueberry",
        "size_note": "~1.2cm",
    },
    8: {
        "title": "As small as a raspberry",
        "description": "All of the major organs and body systems are now developing, even though everything is still very small. Web-like hands and feet are visible now, and the umbilical cord is formed and carrying blood between your baby and the placenta.",
        "phase": "size_reference",
        "food": "raspberry",
        "size_note": "~1.6cm",
    },
    9: {
        "title": "As small as a grape",
        "description": "This is the point when the embryo officially becomes a fetus. Your baby is looking more recognizably human now, even though the head still makes up a big part of the body.",
        "phase": "size_reference",
        "food": "grape",
        "size_note": "~2.3cm",
    },
    10: {
        "title": "As small as a strawberry",
        "description": "Your baby's tiny fingers and toes are more defined now, and the limbs keep lengthening. A fun thing to picture is that little joints are developing too, so your baby is becoming more bendy and coordinated even this early.",
        "phase": "size_reference",
        "food": "strawberry",
        "size_note": "~3.1cm",
    },
    11: {
        "title": "As small as a fig",
        "description": "At this stage, your baby's organs, nerves, and muscles are starting to work together more. This is one of those weeks where development feels less like \"pieces forming\" and more like a tiny body beginning to function.",
        "phase": "size_reference",
        "food": "fig",
        "size_note": "~4.1cm",
    },
    12: {
        "title": "As small as a lime",
        "description": "All the major organs, limbs, bones, and muscles are present now and will keep maturing from here. Your baby is already swallowing amniotic fluid and peeing it back out, which surprises a lot of first-time moms.",
        "phase": "size_reference",
        "food": "lime",
        "size_note": "~5.4cm",
    },
    13: {
        "title": "Your baby this week",
        "description": "Your baby is entering a stretch of steady growth now, with features becoming more proportionate over time. This is the season where the body starts catching up just a bit to that adorably oversized head.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    14: {
        "title": "Your baby this week",
        "description": "Your baby's facial muscles are developing, and subtle expressions may begin to happen. Even if you can't feel much yet, there is a lot of movement and practice happening inside.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    15: {
        "title": "Your baby this week",
        "description": "Bones continue hardening, and your baby's body is stretching out more. This is also a week when the overall shape starts looking less curled and more like the baby shape most moms picture.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    16: {
        "title": "Your baby this week",
        "description": "Your baby is getting stronger, and coordinated movements are becoming more common. Some moms start feeling tiny flutters soon around this point, especially if they've been pregnant before.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    17: {
        "title": "Your baby this week",
        "description": "Fat stores are beginning to develop under your baby's skin, which will matter more and more later in pregnancy. This is one of the quiet foundation-building weeks that helps your baby prepare for life outside the womb.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    18: {
        "title": "Your baby this week",
        "description": "Your baby's ears are now in their final position on the head, and the inner ear structures that make hearing possible are developing rapidly. While your baby can't quite hear you yet, the foundation for hearing is being laid — and in a few weeks, the outside world will start reaching your baby in a new way.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    19: {
        "title": "Your baby this week",
        "description": "Your baby's skin is protected by a waxy coating called vernix, which helps shield it from constant exposure to amniotic fluid. It's one of those details most moms never think about, but it plays a really important protective role.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    20: {
        "title": "Your baby this week",
        "description": "At this halfway point, your baby is very recognizable, with well-formed limbs and features. Many moms love this stage because baby is big enough to picture clearly but still has plenty of room to move around.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    21: {
        "title": "Your baby this week",
        "description": "Your baby is getting bigger fast and may begin having more noticeable patterns of movement. This is also a time of active brain growth, which is a big part of what makes the second half of pregnancy so dynamic.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    22: {
        "title": "Your baby this week",
        "description": "Your baby's features are becoming more distinct, and movements can start feeling stronger. Tiny practice breaths may begin too, even though the lungs are not ready for life outside the womb yet.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    23: {
        "title": "Your baby this week",
        "description": "Your baby's body is getting better and better at the work that will matter after birth — little by little, the lungs are preparing for the day they'll take that first breath. This is often described as a milestone week because so many important systems are maturing.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    24: {
        "title": "Your baby this week",
        "description": "Your baby is growing steadily and becoming more responsive to sound and touch. Sleep and wake cycles are also starting to become more defined, which is why movement may begin to feel a little more patterned.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    25: {
        "title": "Your baby this week",
        "description": "Your baby's skin is still thin, but the body is gradually filling out more. The nervous system is maturing too, which helps movements become stronger and more purposeful.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    26: {
        "title": "Your baby this week",
        "description": "Your baby is practicing important skills like sucking and swallowing. These little rehearsal steps matter because they help prepare for feeding after birth.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    27: {
        "title": "Your baby this week",
        "description": "Your baby's brain and lungs are still maturing in a big way as the third trimester begins. This is a growth-and-prep stage where the body is getting more coordinated for the weeks ahead.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    28: {
        "title": "Your baby this week",
        "description": "Your baby is starting to put on weight more quickly now. You may also notice stronger kicks and stretches, partly because your baby is bigger and partly because movement patterns are getting more organized.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    29: {
        "title": "Your baby this week",
        "description": "In the last couple months of pregnancy, your baby gains weight fast, and a big chunk of birth weight is added during this season. Your body is working hard to support that growth.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    30: {
        "title": "Your baby this week",
        "description": "Your baby is continuing to gain fat, which helps smooth the skin and support temperature regulation after birth. There is less room than before, so movements may feel bigger even if they are less acrobatic.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    31: {
        "title": "Your baby this week",
        "description": "Your baby has most of their parts in place and is now focused on growing and maturing — less about building new pieces, more about getting stronger and more ready for the outside world.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    32: {
        "title": "Your baby this week",
        "description": "Your baby is practicing breathing movements and continuing to build body fat. Even though those breaths are just practice, they are part of preparing the lungs and chest for life after birth.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    33: {
        "title": "Your baby this week",
        "description": "Your baby is still growing steadily and may gain around a quarter to half a pound per week as you get closer to your due date. That rapid growth is one reason everything can suddenly feel tighter in your belly around now.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    34: {
        "title": "Your baby this week",
        "description": "Your baby's skin is getting smoother as more fat is stored under the surface. Fingernails are also continuing to grow, which is one of those tiny details that makes babies feel more and more \"finished.\"",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    35: {
        "title": "Your baby this week",
        "description": "Your baby is getting snug in the uterus now, and there is much less extra room for dramatic movement. Many babies settle more into a head-down position around this stage if they have not already.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    36: {
        "title": "Your baby this week",
        "description": "Your baby is looking rounder and fuller now, with more fat on the body and less wrinkling of the skin. This is also a week when the overall position in the uterus starts to matter more as birth gets closer.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    37: {
        "title": "Your baby this week",
        "description": "Your baby is considered early term now, and many important systems are very close to ready. Brain and lung development are still continuing, which is a helpful reminder that these last weeks still matter.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    38: {
        "title": "Your baby this week",
        "description": "Your baby keeps fine-tuning important skills like swallowing, breathing motions, and body temperature regulation. Even when everything feels \"done,\" your baby is still using this time to get stronger and more prepared.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    39: {
        "title": "Your baby this week",
        "description": "Your baby is considered full term this week, and the body is built for life on the outside. A sweet detail is that the brain is still doing a huge amount of development right up through the end, even when baby looks fully ready to meet you.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
    40: {
        "title": "Your baby this week",
        "description": "You've made it to your due date week. Your baby is fully developed and ready to meet you. The brain and lungs finish their final preparations now, and your baby is settled into position for birth. You're so close to holding your little one.",
        "phase": "cross_section",
        "food": None,
        "size_note": None,
    },
}

# Image filenames for each pregnancy week
# Week 20 uses a special "anchor" variant filename
WEEKLY_BABY_IMAGES = {}
for _w in range(4, 41):
    if _w == 20:
        WEEKLY_BABY_IMAGES[_w] = "pregnancy-week-20-anchor-approved.webp"
    else:
        WEEKLY_BABY_IMAGES[_w] = f"pregnancy-week-{_w:02d}-approved.webp"


def get_weekly_tip(week: int, is_postpartum: bool = False, postpartum_week: int = None) -> str:
    """Get the appropriate weekly tip"""
    if is_postpartum and postpartum_week:
        return POSTPARTUM_TIPS.get(postpartum_week, "Every day with your baby is a gift.")
    return WEEKLY_TIPS.get(week, "Your baby is growing beautifully. Trust your journey.")


def get_weekly_affirmation(week: int, is_postpartum: bool = False, postpartum_week: int = None) -> str:
    """Get the appropriate weekly affirmation"""
    if is_postpartum and postpartum_week:
        return POSTPARTUM_AFFIRMATIONS.get(postpartum_week, "I am a wonderful parent.")
    return WEEKLY_AFFIRMATIONS.get(week, "I am strong, capable, and loved.")


@router.get("/weekly-content")
async def get_weekly_content(user: User = Depends(check_role(["MOM"]))):
    """Get weekly tip and affirmation based on pregnancy week or postpartum status"""
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not mom_profile or not mom_profile.get("due_date"):
        return {
            "week": None,
            "is_postpartum": False,
            "postpartum_week": None,
            "tip": "Complete your onboarding with your due date to receive personalized weekly tips.",
            "affirmation": "Every step you take toward preparing for your baby is a step in the right direction."
        }
    
    due_date_str = mom_profile.get("due_date")
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
    except:
        return {
            "week": None,
            "is_postpartum": False,
            "postpartum_week": None,
            "tip": "Please update your due date in your profile.",
            "affirmation": "You are capable and strong."
        }
    
    today = datetime.now()
    
    # Calculate conception date (roughly 40 weeks before due date)
    conception_date = due_date - timedelta(weeks=40)
    
    # Calculate current week and day within the week
    days_pregnant = (today - conception_date).days
    current_week = days_pregnant // 7
    current_day = days_pregnant % 7  # 0-6, days into the current week
    
    # Check if postpartum
    is_postpartum = today > due_date
    postpartum_week = None
    
    if is_postpartum:
        days_postpartum = (today - due_date).days
        postpartum_week = min((days_postpartum // 7) + 1, 6)  # Cap at 6 weeks
    
    # Get the appropriate content (use full-length content from weekly_content.py)
    if is_postpartum:
        tip = get_full_weekly_tip(current_week, is_postpartum=True, postpartum_week=postpartum_week)
        affirmation = get_full_weekly_affirmation(current_week, is_postpartum=True, postpartum_week=postpartum_week)
        display_week = f"Postpartum Week {postpartum_week}"
    else:
        # Clamp to valid pregnancy weeks
        clamped_week = max(1, min(current_week, 42))
        tip = get_full_weekly_tip(clamped_week)
        affirmation = get_full_weekly_affirmation(clamped_week)
        display_week = f"{clamped_week} weeks {current_day} days"
    
    # Baby development data (pregnancy weeks 4-40 only)
    baby_development = None
    baby_image = None
    if not is_postpartum and current_week is not None:
        dev_week = max(1, min(current_week, 42))
        if 4 <= dev_week <= 40:
            baby_development = WEEKLY_BABY_DEVELOPMENT.get(dev_week)
            baby_image = WEEKLY_BABY_IMAGES.get(dev_week)

    return {
        "week": current_week,
        "current_day": current_day,
        "display_week": display_week,
        "is_postpartum": is_postpartum,
        "postpartum_week": postpartum_week,
        "tip": tip,
        "affirmation": affirmation,
        "baby_development": baby_development,
        "baby_image": baby_image,
    }


@router.get("/weekly-content/all")
async def get_all_weekly_content():
    """Get all weekly tips and affirmations (for browsing)"""
    pregnancy_content = []
    for week in range(1, 43):
        entry = {
            "week": week,
            "tip": FULL_WEEKLY_TIPS.get(week, ""),
            "affirmation": FULL_WEEKLY_AFFIRMATIONS.get(week, ""),
        }
        # Include baby development data for weeks 4-40
        if 4 <= week <= 40:
            entry["baby_development"] = WEEKLY_BABY_DEVELOPMENT.get(week)
            entry["baby_image"] = WEEKLY_BABY_IMAGES.get(week)
        else:
            entry["baby_development"] = None
            entry["baby_image"] = None
        pregnancy_content.append(entry)

    postpartum_content = []
    for week in range(1, 7):
        postpartum_content.append({
            "week": week,
            "tip": FULL_POSTPARTUM_TIPS.get(week, ""),
            "affirmation": FULL_POSTPARTUM_AFFIRMATIONS.get(week, "")
        })

    return {
        "pregnancy": pregnancy_content,
        "postpartum": postpartum_content
    }
