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

from .dependencies import get_db, get_check_role, User

router = APIRouter()

# Get dependencies
db = get_db()
check_role = get_check_role()


# ============== ZIP CODE LOOKUP ==============

@router.get("/lookup/zipcode/{zipcode}")
async def lookup_zipcode(zipcode: str):
    """Look up city and state from zip code using Zippopotam.us API"""
    try:
        async with httpx.AsyncClient() as client:
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
    
    # Calculate current week
    days_pregnant = (today - conception_date).days
    current_week = days_pregnant // 7
    
    # Check if postpartum
    is_postpartum = today > due_date
    postpartum_week = None
    
    if is_postpartum:
        days_postpartum = (today - due_date).days
        postpartum_week = min((days_postpartum // 7) + 1, 6)  # Cap at 6 weeks
    
    # Get the appropriate content
    if is_postpartum:
        tip = get_weekly_tip(current_week, is_postpartum=True, postpartum_week=postpartum_week)
        affirmation = get_weekly_affirmation(current_week, is_postpartum=True, postpartum_week=postpartum_week)
        display_week = f"Postpartum Week {postpartum_week}"
    else:
        # Clamp to valid pregnancy weeks
        clamped_week = max(1, min(current_week, 42))
        tip = get_weekly_tip(clamped_week)
        affirmation = get_weekly_affirmation(clamped_week)
        display_week = f"Week {clamped_week}"
    
    return {
        "week": current_week,
        "display_week": display_week,
        "is_postpartum": is_postpartum,
        "postpartum_week": postpartum_week,
        "tip": tip,
        "affirmation": affirmation
    }


@router.get("/weekly-content/all")
async def get_all_weekly_content():
    """Get all weekly tips and affirmations (for browsing)"""
    pregnancy_content = []
    for week in range(1, 43):
        pregnancy_content.append({
            "week": week,
            "tip": WEEKLY_TIPS.get(week, ""),
            "affirmation": WEEKLY_AFFIRMATIONS.get(week, "")
        })
    
    postpartum_content = []
    for week in range(1, 7):
        postpartum_content.append({
            "week": week,
            "tip": POSTPARTUM_TIPS.get(week, ""),
            "affirmation": POSTPARTUM_AFFIRMATIONS.get(week, "")
        })
    
    return {
        "pregnancy": pregnancy_content,
        "postpartum": postpartum_content
    }


# ============== PRO FEEDBACK ==============

class ProFeedbackRequest(BaseModel):
    feedback_type: str  # 'bug', 'feature', 'general'
    message: str
    screen: Optional[str] = None


@router.post("/pro/feedback")
async def submit_pro_feedback(feedback: ProFeedbackRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Submit feedback from PRO users"""
    from datetime import datetime, timezone
    
    feedback_doc = {
        "feedback_id": f"feedback_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{user.user_id[:8]}",
        "user_id": user.user_id,
        "user_email": user.email,
        "user_role": user.role,
        "feedback_type": feedback.feedback_type,
        "message": feedback.message,
        "screen": feedback.screen,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.pro_feedback.insert_one(feedback_doc)
    
    return {"message": "Thank you for your feedback! We appreciate your input."}
