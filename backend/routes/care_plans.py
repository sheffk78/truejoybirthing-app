"""
Care Plans Routes - Migrated from server.py

This module handles all care plan-related routes including:
- Birth Plan (Mom)
- Wellness Check-ins and Entries (Mom)
- Postpartum Plan (Mom)
- Timeline (Mom)
- Birth Plan Sharing (Mom <-> Provider)
- Provider Birth Plan Views and Notes
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
from io import BytesIO

from reportlab.platypus import Paragraph, Spacer

from .dependencies import db, check_role, User, create_notification, send_notification_email, get_now

router = APIRouter(tags=["Care Plans"])

# ============== PDF EXPORT HELPERS ==============

# Maps section IDs to display names for PDF export
PDF_SECTION_NAMES = {
    "about_me": "About Me & My Preferences",
    "labor_delivery": "Labor & Delivery Preferences",
    "pain_management": "Pain Management",
    "monitoring_iv": "Labor Environment & Comfort",
    "induction_interventions": "Induction & Birth Interventions",
    "pushing_safe_word": "Pushing, Delivery & Safe Word",
    "post_delivery": "Post-Delivery Preferences",
    "newborn_care": "Newborn Care Preferences",
    "other_considerations": "Other Important Considerations",
}

# Maps field keys to human-readable labels for PDF export
PDF_FIELD_LABELS = {
    # About Me
    "motherName": "Mother's Name",
    "partnerName": "Partner's Name",
    "emailAddress": "Email Address",
    "phoneNumber": "Phone Number",
    "dueDate": "Due Date",
    "birthSupport": "Birth Support (and relationship)",
    "doctorMidwife": "Doctor/Midwife Name",
    "birthLocation": "Where do you plan to give birth?",
    "hospitalName": "Hospital/Birth Center Name",
    # Labor & Delivery
    "laborEnvironment": "Labor Environment Preferences",
    "clothingPreference": "What would you like to wear during labor?",
    "laborPositions": "Labor Positions You Want to Try",
    "hydrationFood": "Food and Drink During Labor",
    "peoplePresent": "Who would you like present during labor?",
    "photographyPreferences": "Photography/Video Preferences",
    # Pain Management
    "painManagementApproach": "Overall Approach to Pain Management",
    "naturalMethods": "Non-Medication Pain Relief Methods",
    "medicationOptions": "Medication Options (if needed)",
    "epiduralPreferences": "If you choose an epidural",
    # Monitoring & IV
    "fetalMonitoring": "Fetal Monitoring Preference",
    "ivPreference": "IV/Hep-Lock Preference",
    "vaginalExams": "Vaginal Exams",
    "artificialRupture": "Artificial Rupture of Membranes",
    "comfortMeasures": "Comfort Measures Available",
    # Induction & Interventions
    "inductionPreference": "Induction Preferences",
    "pitocinAugmentation": "Pitocin/Augmentation",
    "episiotomy": "Episiotomy Preferences",
    "assistedDelivery": "Assisted Delivery (Vacuum/Forceps)",
    "cesareanPreferences": "If Cesarean Becomes Necessary",
    # Pushing & Safe Word
    "pushingApproach": "Pushing Approach",
    "pushingPositions": "Pushing Positions to Try",
    "mirrorUse": "Would you like to use a mirror?",
    "touchBaby": "Would you like to touch baby's head as they crown?",
    "perinealSupport": "Perineal Support Preferences",
    "safeWord": "Safe Word",
    "safeWordMeaning": "What should happen when you use your safe word?",
    # Post-Delivery
    "skinToSkin": "Immediate Skin-to-Skin",
    "cordClamping": "Cord Clamping",
    "cordCutting": "Who would you like to cut the cord?",
    "cordBloodBanking": "Cord Blood Banking",
    "placentaPlans": "Placenta Preferences",
    "goldenHour": "Golden Hour Preferences",
    "announcements": "Announcing Baby's Arrival",
    # Newborn Care
    "babyExamLocation": "Where should baby's exam take place?",
    "delayedBathing": "Baby's First Bath",
    "vernixCleaning": "Vernix (White Coating)",
    "eyeOintment": "Eye Prophylaxis (Erythromycin)",
    "vitaminK": "Vitamin K",
    "hepatitisB": "Hepatitis B Vaccine",
    "circumcision": "Circumcision (if applicable)",
    "feedingPlan": "Feeding Plan",
    "pacifierUse": "Pacifier Use",
    "roomingIn": "Rooming In",
    # Other Considerations
    "culturalReligious": "Cultural or Religious Considerations",
    "previousBirthExperience": "Previous Birth Experiences to Consider",
    "anxietiesConcerns": "Special Anxieties or Concerns",
    "medicalConditions": "Medical Conditions or Allergies",
    "emergencyContact": "Emergency Contact (besides partner)",
    "musicPreferences": "Music Preferences",
}


def build_birth_plan_pdf_sections(elements, sections, heading_style, body_style):
    """Build PDF content for birth plan sections. Shared by mom and provider PDF exports."""
    for section in sections:
        section_id = section.get("section_id", "")
        section_name = PDF_SECTION_NAMES.get(section_id, section_id.replace("_", " ").title())
        data = section.get("data", {})
        
        if not data:
            continue
        
        elements.append(Paragraph(section_name, heading_style))
        
        for key, value in data.items():
            if value:
                label = PDF_FIELD_LABELS.get(key, key.replace("_", " ").title())
                
                if isinstance(value, list):
                    value_str = ", ".join(str(v) for v in value)
                else:
                    value_str = str(value)
                
                elements.append(Paragraph(f"<b>{label}:</b> {value_str}", body_style))
        
        elements.append(Spacer(1, 10))


# ============== PYDANTIC MODELS ==============

class WellnessCheckInCreate(BaseModel):
    mood: str
    mood_note: Optional[str] = None

class WellnessEntryCreate(BaseModel):
    mood: int  # 1-5 scale
    energy_level: Optional[int] = None  # 1-5 scale
    sleep_quality: Optional[int] = None  # 1-5 scale
    symptoms: Optional[List[str]] = None
    journal_notes: Optional[str] = None

class TimelineEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    event_type: str = "custom"  # "milestone" or "custom" or "appointment"

class ShareRequestCreate(BaseModel):
    provider_id: str  # The doula or midwife user_id

class ProviderNoteCreate(BaseModel):
    section_id: str
    note_content: str

# ============== CONSTANTS ==============

BIRTH_PLAN_SECTIONS = [
    {"section_id": "about_me", "title": "About Me & My Preferences"},
    {"section_id": "labor_delivery", "title": "Labor & Delivery Preferences"},
    {"section_id": "pain_management", "title": "Pain Management"},
    {"section_id": "monitoring_iv", "title": "Labor Environment & Comfort"},
    {"section_id": "induction_interventions", "title": "Induction & Birth Interventions"},
    {"section_id": "pushing_safe_word", "title": "Pushing, Delivery & Safe Word"},
    {"section_id": "post_delivery", "title": "Post-Delivery Preferences"},
    {"section_id": "newborn_care", "title": "Newborn Care Preferences"},
    {"section_id": "other_considerations", "title": "Other Important Considerations"},
]

PREGNANCY_MILESTONES = [
    {"week": 4, "title": "Positive Test!", "description": "Your pregnancy test is positive. Baby is the size of a poppy seed."},
    {"week": 6, "title": "Heartbeat Begins", "description": "Baby's heart starts beating. Size: lentil."},
    {"week": 8, "title": "First Prenatal Visit", "description": "Schedule your first prenatal appointment. Baby is the size of a raspberry."},
    {"week": 10, "title": "Fingers & Toes Form", "description": "Baby's fingers and toes are forming. Size: strawberry."},
    {"week": 12, "title": "End of First Trimester", "description": "Risk of miscarriage drops significantly. Baby is the size of a lime."},
    {"week": 16, "title": "Gender Can Be Determined", "description": "Baby's gender may be visible on ultrasound. Size: avocado."},
    {"week": 20, "title": "Anatomy Scan", "description": "Detailed ultrasound to check baby's development. Baby is the size of a banana."},
    {"week": 24, "title": "Viability Milestone", "description": "Baby has a chance of survival if born now. Size: ear of corn."},
    {"week": 28, "title": "Third Trimester Begins", "description": "Final stretch! Baby is the size of an eggplant."},
    {"week": 32, "title": "Baby Practices Breathing", "description": "Lungs are developing. Baby is the size of a squash."},
    {"week": 36, "title": "Full Term Soon", "description": "Baby is considered early term at 37 weeks. Size: honeydew melon."},
    {"week": 37, "title": "Full Term", "description": "Baby is now considered full term!"},
    {"week": 40, "title": "Due Date", "description": "Your estimated due date has arrived!"},
]

# ============== HELPER FUNCTIONS ==============

def get_share_request_email_html(mom_name: str, provider_name: str):
    """Generate HTML for share request notification email"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #9d7a9d, #c9a8c9); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; font-size: 24px; }}
            .content {{ background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }}
            .highlight {{ background: #f9f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .button {{ display: inline-block; background: #9d7a9d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #888; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>True Joy Birthing</h1>
            </div>
            <div class="content">
                <h2>New Birth Plan Share Request</h2>
                <p>Hi {provider_name},</p>
                <div class="highlight">
                    <p><strong>{mom_name}</strong> has shared their birth plan with you!</p>
                </div>
                <p>They've chosen you to be part of their birth support team and would like you to review their birth preferences.</p>
                <p>Log in to your True Joy Birthing account to:</p>
                <ul>
                    <li>Accept or decline the share request</li>
                    <li>Review their complete birth plan</li>
                    <li>Add your professional notes and recommendations</li>
                </ul>
                <p style="text-align: center;">
                    <a href="#" class="button">View Share Request</a>
                </p>
            </div>
            <div class="footer">
                <p>True Joy Birthing - Your birth plan, your team, your support.</p>
            </div>
        </div>
    </body>
    </html>
    """


async def notify_providers_birth_plan_complete(mom_user_id: str, mom_name: str):
    """Notify all connected providers when Mom completes her birth plan"""
    connections = await db.share_requests.find({
        "mom_user_id": mom_user_id,
        "status": "accepted"
    }).to_list(100)
    
    for conn in connections:
        if conn.get("can_view_birth_plan", True):
            await create_notification(
                user_id=conn["provider_id"],
                notif_type="birth_plan_complete",
                title="Birth Plan Complete",
                message=f"{mom_name} has completed her Joyful Birth Plan. Tap to review and discuss together.",
                data={"mom_user_id": mom_user_id}
            )


# ============== MOM BIRTH PLAN ROUTES ==============

@router.get("/birth-plan")
async def get_birth_plan(user: User = Depends(check_role(["MOM"]))):
    """Get user's birth plan"""
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    
    # Get mom's profile for pre-filling
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    mom_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "full_name": 1})
    
    if not plan:
        # Create default plan with pre-filled data from profile
        now = get_now()
        
        # Pre-fill about_me section with known info
        # Use exact field names that match frontend form (BirthPlanForms.tsx)
        about_me_data = {}
        if mom_user:
            about_me_data["motherName"] = mom_user.get("full_name", "")
            # Also pre-fill email address
            email = mom_user.get("email", "")
            if email:
                about_me_data["emailAddress"] = email
        if mom_profile:
            # dueDate field expects ISO date string format
            due_date = mom_profile.get("due_date", "")
            if due_date:
                about_me_data["dueDate"] = due_date
            # birthLocation expects: "Hospital", "Birth Center", "Home Birth", "Not sure yet"
            planned_setting = mom_profile.get("planned_birth_setting", "")
            if planned_setting:
                # Map profile values to form options
                location_map = {
                    "hospital": "Hospital",
                    "birth_center": "Birth Center",
                    "home": "Home Birth",
                    "undecided": "Not sure yet",
                    # Also handle already formatted values
                    "Hospital": "Hospital",
                    "Birth Center": "Birth Center",
                    "Home Birth": "Home Birth",
                    "Not sure yet": "Not sure yet",
                }
                about_me_data["birthLocation"] = location_map.get(planned_setting, planned_setting)
        
        plan = {
            "plan_id": f"plan_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "sections": [
                {
                    "section_id": s["section_id"], 
                    "title": s["title"], 
                    "status": "Complete" if s["section_id"] == "about_me" and about_me_data else "Not started", 
                    "data": about_me_data if s["section_id"] == "about_me" else {}, 
                    "discussion_notes": []
                }
                for s in BIRTH_PLAN_SECTIONS
            ],
            "completion_percentage": (1 / len(BIRTH_PLAN_SECTIONS) * 100) if about_me_data else 0.0,
            "birth_plan_status": "in_progress" if about_me_data else "not_started",
            "created_at": now,
            "updated_at": now
        }
        await db.birth_plans.insert_one(plan)
        plan.pop("_id", None)
    else:
        # Recalculate completion based on actual data presence
        sections = plan.get("sections", [])
        completed_count = 0
        for section in sections:
            section_data = section.get("data", {})
            has_meaningful_data = section_data and any(
                v for v in section_data.values() if v is not None and v != "" and v != []
            )
            if has_meaningful_data:
                completed_count += 1
                # Update section status based on actual data
                section["status"] = "Complete"
            else:
                section["status"] = "Not started"
        
        plan["completion_percentage"] = (completed_count / len(sections)) * 100 if sections else 0
        
        # Update the stored plan with recalculated values
        await db.birth_plans.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "completion_percentage": plan["completion_percentage"],
                "sections": sections
            }}
        )
    
    return plan


@router.put("/birth-plan/section/{section_id}")
async def update_birth_plan_section(
    section_id: str,
    request: Request,
    user: User = Depends(check_role(["MOM"]))
):
    """Update a section of the birth plan"""
    body = await request.json()
    data = body.get("data", {})
    notes_to_provider = body.get("notes_to_provider")
    
    now = get_now()
    
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    sections = plan.get("sections", [])
    section_found = False
    completed_count = 0
    previous_status = plan.get("birth_plan_status", "not_started")
    
    for section in sections:
        if section["section_id"] == section_id:
            section["data"] = data
            section["notes_to_provider"] = notes_to_provider
            # Only mark complete if data has meaningful content
            has_data = data and any(v for v in data.values() if v is not None and v != "" and v != [])
            section["status"] = "Complete" if has_data else ("In progress" if data else "Not started")
            section_found = True
        # Recalculate completion based on actual data presence, not just status
        section_data = section.get("data", {})
        has_meaningful_data = section_data and any(
            v for v in section_data.values() if v is not None and v != "" and v != []
        )
        if has_meaningful_data:
            completed_count += 1
    
    if not section_found:
        raise HTTPException(status_code=404, detail="Section not found")
    
    completion_percentage = (completed_count / len(sections)) * 100 if sections else 0
    
    # Determine birth plan status
    if completion_percentage == 100:
        new_status = "complete"
    elif completion_percentage > 0:
        new_status = "in_progress"
    else:
        new_status = "not_started"
    
    await db.birth_plans.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "sections": sections,
            "completion_percentage": completion_percentage,
            "birth_plan_status": new_status,
            "updated_at": now
        }}
    )
    
    # Sync Due Date and Birth Setting from birth plan to mom profile
    if section_id == "about_me" and data:
        profile_updates = {}
        if data.get("due_date"):
            profile_updates["due_date"] = data["due_date"]
        if data.get("planned_birth_location"):
            profile_updates["planned_birth_setting"] = data["planned_birth_location"]
        if profile_updates:
            await db.mom_profiles.update_one(
                {"user_id": user.user_id},
                {"$set": profile_updates},
                upsert=True
            )
    
    # Notify providers when birth plan is marked complete for the first time
    if new_status == "complete" and previous_status != "complete":
        await notify_providers_birth_plan_complete(user.user_id, user.full_name)
    
    return {"message": "Section updated", "completion_percentage": completion_percentage, "birth_plan_status": new_status}


@router.get("/birth-plan/export")
async def export_birth_plan(user: User = Depends(check_role(["MOM"]))):
    """Get birth plan for export (mock PDF generation)"""
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {
        "plan": plan,
        "user_name": user_doc.get("full_name") if user_doc else None,
        "due_date": mom_profile.get("due_date") if mom_profile else None,
        "birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
        "export_note": "PDF generation is mocked. In production, this would generate a downloadable PDF."
    }


@router.get("/birth-plan/export/pdf")
async def export_birth_plan_pdf(user: User = Depends(check_role(["MOM"]))):
    """Generate and download PDF version of birth plan"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#9F83B6'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#9F83B6'), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6)
    
    elements = []
    
    # Title
    user_name = user_doc.get("full_name", "Mom") if user_doc else "Mom"
    elements.append(Paragraph(f"{user_name}'s Birth Plan", title_style))
    elements.append(Spacer(1, 10))
    
    # Basic info
    if mom_profile:
        info_data = []
        if mom_profile.get("due_date"):
            info_data.append(["Expected Due Date:", mom_profile["due_date"]])
        if mom_profile.get("planned_birth_setting"):
            info_data.append(["Planned Birth Setting:", mom_profile["planned_birth_setting"]])
        if mom_profile.get("provider_name"):
            info_data.append(["Provider:", mom_profile["provider_name"]])
        
        if info_data:
            info_table = Table(info_data, colWidths=[2*inch, 4*inch])
            info_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(info_table)
            elements.append(Spacer(1, 15))
    
    # Sections
    sections = plan.get("sections", [])
    build_birth_plan_pdf_sections(elements, sections, heading_style, body_style)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Birth_Plan_{user_name.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== PROVIDER SEARCH ==============

@router.get("/providers/search")
async def search_providers(query: str, user: User = Depends(check_role(["MOM"]))):
    """Search for doulas and midwives by name, email, city, or state"""
    if len(query) < 2:
        return {"providers": []}
    
    # Search in users collection for DOULA and MIDWIFE roles
    search_regex = {"$regex": query, "$options": "i"}
    
    # First search users by name/email
    providers = await db.users.find(
        {
            "role": {"$in": ["DOULA", "MIDWIFE"]},
            "$or": [
                {"full_name": search_regex},
                {"email": search_regex}
            ]
        },
        {"_id": 0, "password_hash": 0}
    ).limit(20).to_list(20)
    
    provider_ids = {p["user_id"] for p in providers}
    
    # Also search profiles by location (city/state)
    doula_location_matches = await db.doula_profiles.find(
        {"$or": [
            {"location_city": search_regex},
            {"location_state": search_regex}
        ]},
        {"_id": 0}
    ).to_list(20)
    
    midwife_location_matches = await db.midwife_profiles.find(
        {"$or": [
            {"location_city": search_regex},
            {"location_state": search_regex}
        ]},
        {"_id": 0}
    ).to_list(20)
    
    # Add location-matched providers
    for profile in doula_location_matches + midwife_location_matches:
        if profile.get("user_id") and profile["user_id"] not in provider_ids:
            user_data = await db.users.find_one(
                {"user_id": profile["user_id"]},
                {"_id": 0, "password_hash": 0}
            )
            if user_data:
                providers.append(user_data)
                provider_ids.add(profile["user_id"])
    
    # Enhance with profile data
    result = []
    for provider in providers:
        profile = None
        if provider["role"] == "DOULA":
            profile = await db.doula_profiles.find_one({"user_id": provider["user_id"]}, {"_id": 0})
        elif provider["role"] == "MIDWIFE":
            profile = await db.midwife_profiles.find_one({"user_id": provider["user_id"]}, {"_id": 0})
        
        # Check if already shared with this provider
        existing_share = await db.share_requests.find_one({
            "mom_user_id": user.user_id,
            "provider_id": provider["user_id"],
            "status": {"$in": ["pending", "accepted"]}
        })
        
        result.append({
            "user_id": provider["user_id"],
            "full_name": provider["full_name"],
            "email": provider["email"],
            "role": provider["role"],
            "picture": provider.get("picture"),
            "profile": profile,
            "already_shared": existing_share is not None,
            "share_status": existing_share["status"] if existing_share else None
        })
    
    return {"providers": result}


# ============== BIRTH PLAN SHARING ROUTES (MOM) ==============

@router.post("/birth-plan/share")
async def share_birth_plan(share_data: ShareRequestCreate, user: User = Depends(check_role(["MOM"]))):
    """Send a share request to a provider"""
    # Verify provider exists and is a doula or midwife
    provider = await db.users.find_one(
        {"user_id": share_data.provider_id, "role": {"$in": ["DOULA", "MIDWIFE"]}},
        {"_id": 0}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Check if request already exists
    existing = await db.share_requests.find_one({
        "mom_user_id": user.user_id,
        "provider_id": share_data.provider_id,
        "status": {"$in": ["pending", "accepted"]}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Share request already exists")
    
    now = get_now()
    
    request_doc = {
        "request_id": f"share_{uuid.uuid4().hex[:12]}",
        "mom_user_id": user.user_id,
        "mom_name": user.full_name,
        "provider_id": share_data.provider_id,
        "provider_name": provider["full_name"],
        "provider_role": provider["role"],
        "status": "pending",
        "created_at": now,
        "responded_at": None
    }
    
    await db.share_requests.insert_one(request_doc)
    request_doc.pop('_id', None)
    
    # Send email notification to provider
    if send_notification_email:
        email_html = get_share_request_email_html(user.full_name, provider["full_name"])
        await send_notification_email(
            to_email=provider["email"],
            subject=f"New Birth Plan Share Request from {user.full_name}",
            html_content=email_html
        )
    
    # Create in-app notification for provider
    await create_notification(
        user_id=provider["user_id"],
        notif_type="share_request",
        title="New Birth Plan Share Request",
        message=f"{user.full_name} has shared their birth plan with you.",
        data={"request_id": request_doc["request_id"], "mom_name": user.full_name}
    )
    
    return {"message": "Share request sent", "request": request_doc}


@router.get("/birth-plan/share-requests")
async def get_my_share_requests(user: User = Depends(check_role(["MOM"]))):
    """Get all share requests sent by the mom"""
    requests = await db.share_requests.find(
        {"mom_user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with provider info (name, picture, role)
    for req in requests:
        provider = await db.users.find_one(
            {"user_id": req.get("provider_id")}, 
            {"_id": 0, "picture": 1, "full_name": 1, "role": 1}
        )
        if provider:
            req["provider_picture"] = provider.get("picture")
            req["provider_name"] = provider.get("full_name")
            req["provider_role"] = provider.get("role")
        
        # Also get profile picture if available (prefer profile over user picture)
        provider_role = req.get("provider_type") or req.get("provider_role")
        if provider_role == "DOULA":
            profile = await db.doula_profiles.find_one(
                {"user_id": req.get("provider_id")},
                {"_id": 0, "picture": 1}
            )
        elif provider_role == "MIDWIFE":
            profile = await db.midwife_profiles.find_one(
                {"user_id": req.get("provider_id")},
                {"_id": 0, "picture": 1}
            )
        else:
            profile = None
        
        if profile and profile.get("picture"):
            req["provider_picture"] = profile.get("picture")
    
    return {"requests": requests}


@router.delete("/birth-plan/share/{request_id}")
async def revoke_share(request_id: str, user: User = Depends(check_role(["MOM"]))):
    """Revoke a share request"""
    # First, fetch the request to get provider info BEFORE deleting
    request_doc = await db.share_requests.find_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    if not request_doc:
        raise HTTPException(status_code=404, detail="Share request not found")
    
    provider_id = request_doc.get("provider_id")
    
    # Delete the share request
    await db.share_requests.delete_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    # Also delete any provider notes for this birth plan from this provider
    if provider_id:
        await db.provider_notes.delete_many({
            "birth_plan_id": user.user_id,
            "provider_id": provider_id
        })
        
        # If this provider was connected to mom's profile, remove the connection
        if request_doc.get("provider_role") == "DOULA":
            await db.mom_profiles.update_one(
                {"user_id": user.user_id, "connected_doula_id": provider_id},
                {"$unset": {"connected_doula_id": ""}}
            )
        elif request_doc.get("provider_role") == "MIDWIFE":
            await db.mom_profiles.update_one(
                {"user_id": user.user_id, "connected_midwife_id": provider_id},
                {"$unset": {"connected_midwife_id": ""}}
            )
        
        # Deactivate the client record so provider can see history but mom can request again
        await db.clients.update_one(
            {"linked_mom_id": user.user_id, "provider_id": provider_id},
            {"$set": {"is_active": False, "status": "Removed"}}
        )
        
        # Update any existing leads to allow re-requesting
        await db.leads.update_many(
            {"mom_user_id": user.user_id, "provider_id": provider_id, "status": "converted_to_client"},
            {"$set": {"status": "removed_from_team"}}
        )
    
    return {"message": "Share access revoked"}


# ============== PROVIDER SHARE REQUEST ROUTES ==============

@router.get("/provider/share-requests")
async def get_provider_share_requests(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all share requests received by the provider"""
    requests = await db.share_requests.find(
        {"provider_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with mom's profile and birth plan info (same as leads)
    for req in requests:
        mom_user_id = req.get("mom_user_id")
        if not mom_user_id:
            continue
            
        # Get mom's profile for EDD, birth setting, and number of children
        profile = await db.mom_profiles.find_one(
            {"user_id": mom_user_id},
            {"_id": 0, "due_date": 1, "edd": 1, "planned_birth_setting": 1, "number_of_children": 1}
        )
        if profile:
            req["edd"] = profile.get("due_date") or profile.get("edd")
            req["planned_birth_setting"] = profile.get("planned_birth_setting")
            req["number_of_children"] = profile.get("number_of_children")
        
        # Get birth plan key details for provider to consider working together
        birth_plan = await db.birth_plans.find_one(
            {"user_id": mom_user_id},
            {"_id": 0, "sections": 1, "completion_percentage": 1}
        )
        if birth_plan:
            req["birth_plan_completion"] = birth_plan.get("completion_percentage", 0)
            
            # Extract key details from "about_me" section
            sections = birth_plan.get("sections", [])
            about_me = next((s for s in sections if s.get("section_id") == "about_me"), None)
            if about_me and about_me.get("data"):
                data = about_me["data"]
                req["birth_plan_due_date"] = data.get("dueDate")
                req["birth_plan_location"] = data.get("birthLocation")
                req["birth_plan_hospital_name"] = data.get("hospitalName")
            
            # Extract previous birth experience from "other_considerations" section
            other_considerations = next((s for s in sections if s.get("section_id") == "other_considerations"), None)
            if other_considerations and other_considerations.get("data"):
                data = other_considerations["data"]
                req["previous_birth_experience"] = data.get("previousBirthExperience")
    
    return {"requests": requests}


@router.put("/provider/share-requests/{request_id}/respond")
async def respond_to_share_request(
    request_id: str,
    request: Request,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Accept or reject a share request"""
    body = await request.json()
    action = body.get("action")  # "accept" or "reject"
    
    if action not in ["accept", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'accept' or 'reject'")
    
    now = get_now()
    new_status = "accepted" if action == "accept" else "rejected"
    
    result = await db.share_requests.update_one(
        {"request_id": request_id, "provider_id": user.user_id, "status": "pending"},
        {"$set": {"status": new_status, "responded_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Share request not found or already responded")
    
    # If accepted, link the mom to the provider's client list
    if action == "accept":
        share_request = await db.share_requests.find_one({"request_id": request_id}, {"_id": 0})
        if share_request:
            mom_user_id = share_request["mom_user_id"]
            mom_name = share_request.get("mom_name", "Client")
            
            # Get mom's profile for additional info
            mom_profile = await db.mom_profiles.find_one({"user_id": mom_user_id}, {"_id": 0})
            mom_user = await db.users.find_one({"user_id": mom_user_id}, {"_id": 0, "email": 1})
            
            # Update mom's profile to show connected provider
            if user.role == "DOULA":
                await db.mom_profiles.update_one(
                    {"user_id": mom_user_id},
                    {"$set": {"connected_doula_id": user.user_id}}
                )
                # Create/update client entry in doula's clients list
                existing_client = await db.clients.find_one({
                    "provider_id": user.user_id, 
                    "linked_mom_id": mom_user_id
                })
                if not existing_client:
                    await db.clients.insert_one({
                        "client_id": "client_" + str(uuid.uuid4().hex)[:12],
                        "provider_id": user.user_id,
                        "provider_type": "DOULA",
                        "name": mom_name,
                        "email": mom_user.get("email") if mom_user else None,
                        "phone": "",
                        "linked_mom_id": mom_user_id,
                        "status": "Active",
                        "edd": mom_profile.get("due_date") if mom_profile else None,
                        "planned_birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                        "notes": "",
                        "created_at": now,
                        "updated_at": now
                    })
            elif user.role == "MIDWIFE":
                await db.mom_profiles.update_one(
                    {"user_id": mom_user_id},
                    {"$set": {"connected_midwife_id": user.user_id}}
                )
                # Create/update client entry in midwife's clients list
                existing_client = await db.clients.find_one({
                    "provider_id": user.user_id, 
                    "linked_mom_id": mom_user_id
                })
                if not existing_client:
                    await db.clients.insert_one({
                        "client_id": "client_" + str(uuid.uuid4().hex)[:12],
                        "provider_id": user.user_id,
                        "provider_type": "MIDWIFE",
                        "name": mom_name,
                        "email": mom_user.get("email") if mom_user else None,
                        "phone": "",
                        "linked_mom_id": mom_user_id,
                        "status": "Prenatal",
                        "edd": mom_profile.get("due_date") if mom_profile else None,
                        "planned_birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                        "notes": "",
                        "created_at": now,
                        "updated_at": now
                    })
    
    return {"message": f"Share request {new_status}"}


# ============== WELLNESS ROUTES ==============

@router.post("/wellness/checkin")
async def create_wellness_checkin(checkin_data: WellnessCheckInCreate, user: User = Depends(check_role(["MOM"]))):
    """Create a wellness check-in"""
    now = get_now()
    
    checkin = {
        "checkin_id": f"checkin_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "mood": checkin_data.mood,
        "mood_note": checkin_data.mood_note,
        "created_at": now
    }
    
    await db.wellness_checkins.insert_one(checkin)
    checkin.pop('_id', None)
    return checkin


@router.get("/wellness/checkins")
async def get_wellness_checkins(limit: int = 30, user: User = Depends(check_role(["MOM"]))):
    """Get wellness check-in history"""
    checkins = await db.wellness_checkins.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return checkins


@router.post("/wellness/entry")
async def create_wellness_entry(entry_data: WellnessEntryCreate, user: User = Depends(check_role(["MOM"]))):
    """Create a detailed wellness entry with mood, energy, sleep, symptoms, and journal"""
    now = get_now()
    
    entry = {
        "entry_id": f"wellness_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "mood": entry_data.mood,
        "energy_level": entry_data.energy_level,
        "sleep_quality": entry_data.sleep_quality,
        "symptoms": entry_data.symptoms or [],
        "journal_notes": entry_data.journal_notes,
        "created_at": now
    }
    
    await db.wellness_entries.insert_one(entry)
    entry.pop('_id', None)
    return entry


@router.get("/wellness/entries")
async def get_wellness_entries(limit: int = 30, user: User = Depends(check_role(["MOM"]))):
    """Get wellness entry history"""
    entries = await db.wellness_entries.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"entries": entries}


@router.get("/wellness/stats")
async def get_wellness_stats(days: int = 7, user: User = Depends(check_role(["MOM"]))):
    """Get wellness statistics for the past N days"""
    cutoff = get_now() - timedelta(days=days)
    
    entries = await db.wellness_entries.find(
        {"user_id": user.user_id, "created_at": {"$gte": cutoff}},
        {"_id": 0}
    ).to_list(100)
    
    if not entries:
        return {"entries_count": 0, "avg_mood": None, "avg_energy": None, "avg_sleep": None}
    
    moods = [e["mood"] for e in entries if e.get("mood")]
    energies = [e["energy_level"] for e in entries if e.get("energy_level")]
    sleeps = [e["sleep_quality"] for e in entries if e.get("sleep_quality")]
    
    return {
        "entries_count": len(entries),
        "avg_mood": sum(moods) / len(moods) if moods else None,
        "avg_energy": sum(energies) / len(energies) if energies else None,
        "avg_sleep": sum(sleeps) / len(sleeps) if sleeps else None,
        "entries": entries
    }


# ============== POSTPARTUM ROUTES ==============

@router.get("/postpartum/plan")
async def get_postpartum_plan(user: User = Depends(check_role(["MOM"]))):
    """Get postpartum plan"""
    plan = await db.postpartum_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    if not plan:
        return {"user_id": user.user_id}
    return plan


@router.put("/postpartum/plan")
async def update_postpartum_plan(request: Request, user: User = Depends(check_role(["MOM"]))):
    """Update postpartum plan"""
    body = await request.json()
    now = get_now()
    
    # Get existing plan to preserve plan_id
    existing = await db.postpartum_plans.find_one({"user_id": user.user_id})
    plan_id = existing.get("plan_id") if existing else f"postpartum_{uuid.uuid4().hex[:12]}"
    
    plan_data = {
        "plan_id": plan_id,
        "user_id": user.user_id,
        "support_people": body.get("support_people"),
        "meal_prep_plans": body.get("meal_prep_plans"),
        "recovery_goals": body.get("recovery_goals"),
        "mental_health_resources": body.get("mental_health_resources"),
        "baby_feeding_plan": body.get("baby_feeding_plan"),
        "visitor_policy": body.get("visitor_policy"),
        "self_care_activities": body.get("self_care_activities"),
        "warning_signs_to_watch": body.get("warning_signs_to_watch"),
        "emergency_contacts": body.get("emergency_contacts"),
        "notes": body.get("notes"),
        "updated_at": now
    }
    
    await db.postpartum_plans.update_one(
        {"user_id": user.user_id},
        {"$set": plan_data},
        upsert=True
    )
    
    return {"message": "Postpartum plan updated"}


# ============== TIMELINE ROUTES ==============

@router.get("/timeline")
async def get_timeline(user: User = Depends(check_role(["MOM"]))):
    """Get pregnancy timeline with milestones and custom events"""
    # Get mom profile for due date
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not mom_profile or not mom_profile.get("due_date"):
        return {"milestones": [], "custom_events": [], "message": "Please complete onboarding with your due date"}
    
    # Parse due date
    due_date_str = mom_profile["due_date"]
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
    except ValueError:
        return {"milestones": [], "custom_events": [], "message": "Invalid due date format"}
    
    # Calculate conception date (40 weeks before due date)
    conception_date = due_date - timedelta(weeks=40)
    today = datetime.now()
    
    # Calculate current week
    days_pregnant = (today - conception_date).days
    current_week = max(1, min(42, days_pregnant // 7))
    
    # Generate milestones with dates
    milestones = []
    for milestone in PREGNANCY_MILESTONES:
        milestone_date = conception_date + timedelta(weeks=milestone["week"])
        milestones.append({
            **milestone,
            "date": milestone_date.strftime("%Y-%m-%d"),
            "is_past": milestone["week"] < current_week,
            "is_current": milestone["week"] == current_week
        })
    
    # Get custom events
    custom_events = await db.timeline_events.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("event_date", 1).to_list(100)
    
    return {
        "current_week": current_week,
        "due_date": due_date_str,
        "milestones": milestones,
        "custom_events": custom_events
    }


@router.post("/timeline/events")
async def create_timeline_event(event_data: TimelineEventCreate, user: User = Depends(check_role(["MOM"]))):
    """Create a custom timeline event"""
    now = get_now()
    
    event = {
        "event_id": f"event_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "title": event_data.title,
        "description": event_data.description,
        "event_date": event_data.event_date,
        "event_type": event_data.event_type,
        "created_at": now
    }
    
    await db.timeline_events.insert_one(event)
    event.pop('_id', None)
    return event


@router.delete("/timeline/events/{event_id}")
async def delete_timeline_event(event_id: str, user: User = Depends(check_role(["MOM"]))):
    """Delete a custom timeline event"""
    result = await db.timeline_events.delete_one({
        "event_id": event_id,
        "user_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted"}


# ============== PROVIDER BIRTH PLAN ROUTES ==============

@router.get("/provider/shared-birth-plans")
async def get_shared_birth_plans(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all birth plans shared with this provider (read-only)"""
    # Get accepted share requests where provider has view permission
    accepted_requests = await db.share_requests.find(
        {"provider_id": user.user_id, "status": "accepted"},
        {"_id": 0}
    ).to_list(100)
    
    birth_plans = []
    for req in accepted_requests:
        # Check if provider has permission to view birth plan
        if not req.get("can_view_birth_plan", True):
            continue
            
        # Get mom's info
        mom = await db.users.find_one({"user_id": req["mom_user_id"]}, {"_id": 0, "full_name": 1, "picture": 1})
        mom_name = mom.get("full_name") if mom else req.get("mom_name", "Unknown")
        mom_picture = mom.get("picture") if mom else None
            
        # Get the mom's birth plan
        plan = await db.birth_plans.find_one({"user_id": req["mom_user_id"]}, {"_id": 0})
        mom_profile = await db.mom_profiles.find_one({"user_id": req["mom_user_id"]}, {"_id": 0})
        
        # Get provider notes for this plan
        notes = await db.provider_notes.find(
            {"birth_plan_id": req["mom_user_id"], "provider_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        if plan:
            birth_plans.append({
                "mom_user_id": req["mom_user_id"],
                "mom_name": mom_name,
                "mom_picture": mom_picture,
                "due_date": mom_profile.get("due_date") if mom_profile else None,
                "birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                "plan": plan,
                "birth_plan_status": plan.get("birth_plan_status", "not_started"),
                "provider_notes": notes,
                "shared_at": req.get("responded_at") or req.get("accepted_at"),
                "read_only": True  # Provider can only VIEW, not edit
            })
    
    return {"birth_plans": birth_plans}


@router.get("/provider/shared-birth-plan/{mom_user_id}")
async def get_shared_birth_plan_detail(mom_user_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get a specific shared birth plan with provider notes (read-only view)"""
    # Verify access via share request OR client relationship
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    # Also check if they have a client with this linked_mom_id
    client = await db.clients.find_one({
        "provider_id": user.user_id,
        "linked_mom_id": mom_user_id
    })
    
    if not share_request and not client:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    # Only check view permission if there's an explicit share_request
    if share_request and not share_request.get("can_view_birth_plan", True):
        raise HTTPException(status_code=403, detail="You do not have permission to view this birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_user_id}, {"_id": 0})
    mom = await db.users.find_one({"user_id": mom_user_id}, {"_id": 0, "password_hash": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": mom_user_id}, {"_id": 0})
    
    # Get all provider notes for this plan (from all providers)
    all_notes = await db.provider_notes.find(
        {"birth_plan_id": mom_user_id},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "mom": mom,
        "mom_profile": mom_profile,
        "plan": plan,
        "birth_plan_status": plan.get("birth_plan_status", "not_started") if plan else "not_started",
        "provider_notes": all_notes,
        "read_only": True,  # Indicates this is a read-only view - provider cannot edit Mom's answers
        "can_add_notes": True  # Provider can add their own discussion notes
    }


@router.get("/provider/client/{mom_user_id}/birth-plan")
async def get_client_birth_plan(mom_user_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get a client's birth plan (simplified view for client list)"""
    # Verify the provider has access via share request or client relationship
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    # Also check if they have a client with this linked_mom_id
    client = await db.clients.find_one({
        "provider_id": user.user_id,
        "linked_mom_id": mom_user_id
    })
    
    if not share_request and not client:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_user_id}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    return plan


@router.get("/provider/client/{mom_id}/birth-plan/pdf")
async def provider_export_birth_plan_pdf(mom_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Generate and download PDF version of a client's birth plan for providers"""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    
    # Verify provider has access to this mom's birth plan
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="You don't have access to this client's birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": mom_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": mom_id}, {"_id": 0})
    
    if not plan:
        raise HTTPException(status_code=404, detail="Birth plan not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=24, textColor=colors.HexColor('#9F83B6'), spaceAfter=6)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#9F83B6'), spaceBefore=20, spaceAfter=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6)
    
    elements = []
    
    # Title
    user_name = user_doc.get("full_name", "Client") if user_doc else "Client"
    elements.append(Paragraph(f"{user_name}'s Birth Plan", title_style))
    elements.append(Spacer(1, 10))
    
    # Basic info
    if mom_profile:
        info_data = []
        if mom_profile.get("due_date"):
            info_data.append(["Expected Due Date:", mom_profile["due_date"]])
        if mom_profile.get("planned_birth_setting"):
            info_data.append(["Planned Birth Setting:", mom_profile["planned_birth_setting"]])
        
        if info_data:
            info_table = Table(info_data, colWidths=[2*inch, 4*inch])
            info_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(info_table)
            elements.append(Spacer(1, 15))
    
    # Sections
    sections = plan.get("sections", [])
    build_birth_plan_pdf_sections(elements, sections, heading_style, body_style)
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Birth_Plan_{user_name.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/provider/birth-plan/{mom_user_id}/notes")
async def add_provider_note(mom_user_id: str, note_data: ProviderNoteCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Add a note to a section of a shared birth plan"""
    # Verify access
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    now = get_now()
    
    note_doc = {
        "note_id": f"pnote_{uuid.uuid4().hex[:12]}",
        "birth_plan_id": mom_user_id,
        "section_id": note_data.section_id,
        "provider_id": user.user_id,
        "provider_name": user.full_name,
        "provider_role": user.role,
        "note_content": note_data.note_content,
        "created_at": now,
        "updated_at": now
    }
    
    await db.provider_notes.insert_one(note_doc)
    note_doc.pop('_id', None)
    
    return {"message": "Note added", "note": note_doc}


@router.put("/provider/birth-plan-notes/{note_id}")
async def update_birth_plan_note(note_id: str, request: Request, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a provider note on a birth plan section"""
    body = await request.json()
    note_content = body.get("note_content")
    
    if not note_content:
        raise HTTPException(status_code=400, detail="Note content required")
    
    result = await db.provider_notes.update_one(
        {"note_id": note_id, "provider_id": user.user_id},
        {"$set": {"note_content": note_content, "updated_at": get_now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note updated"}


@router.delete("/provider/birth-plan-notes/{note_id}")
async def delete_birth_plan_note(note_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a provider note from a birth plan section"""
    result = await db.provider_notes.delete_one({
        "note_id": note_id,
        "provider_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}
