"""
Care Plans Routes Module

Handles Mom-specific care planning features, including:
- Birth plan CRUD and export
- Birth plan sharing with providers
- Provider access to shared birth plans
- Provider notes on birth plans
- Wellness check-ins and entries
- Postpartum plans
- Timeline and milestones
- Weekly content (tips and affirmations)
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from io import BytesIO
import uuid

from .dependencies import (
    db, get_now, check_role, User, 
    create_notification, send_notification_email, SENDER_EMAIL
)

# Import PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

# Import content data
import sys
sys.path.insert(0, '/app/backend')
from pregnancy_content import (
    PREGNANCY_MILESTONES,
    WEEKLY_TIPS, POSTPARTUM_TIPS,
    WEEKLY_AFFIRMATIONS, POSTPARTUM_AFFIRMATIONS,
    GENERIC_POSTPARTUM_AFFIRMATION,
    BIRTH_PLAN_SECTIONS
)

router = APIRouter(tags=["Care Plans"])


# ============== PYDANTIC MODELS ==============

class WellnessCheckInCreate(BaseModel):
    mood: int  # 1-5
    mood_note: Optional[str] = None


class WellnessEntryCreate(BaseModel):
    mood: int  # 1-5
    energy_level: Optional[int] = None  # 1-5
    sleep_quality: Optional[int] = None  # 1-5
    symptoms: Optional[List[str]] = None
    journal_notes: Optional[str] = None


class TimelineEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    event_type: str = "custom"


class ShareRequestCreate(BaseModel):
    provider_id: str


class ProviderNoteCreate(BaseModel):
    section_id: str
    content: str


# ============== EMAIL HELPERS ==============

def get_share_request_email_html(mom_name: str, provider_name: str) -> str:
    """Generate HTML email for share request notification"""
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #9F83B6; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">True Joy Birthing</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">New Birth Plan Share Request</h2>
            <p>Dear {provider_name},</p>
            <p><strong>{mom_name}</strong> has shared their birth plan with you!</p>
            <p>Log in to True Joy Birthing to:</p>
            <ul>
                <li>Review their complete birth plan</li>
                <li>Add your professional notes and recommendations</li>
                <li>Collaborate on their birthing journey</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://truejoybirthing.com" style="background-color: #9F83B6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">View Birth Plan</a>
            </div>
            <p style="color: #666; font-size: 12px;">
                True Joy Birthing - Your birth plan, your team, your support.
            </p>
        </div>
    </div>
    """


# ============== BIRTH PLAN ROUTES (MOM) ==============

@router.get("/birth-plan")
async def get_birth_plan(user: User = Depends(check_role(["MOM"]))):
    """Get user's birth plan"""
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    if not plan:
        now = get_now()
        plan = {
            "plan_id": f"plan_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "sections": [
                {"section_id": s["section_id"], "title": s["title"], "status": "Not started", "data": {}, "discussion_notes": []}
                for s in BIRTH_PLAN_SECTIONS
            ],
            "completion_percentage": 0.0,
            "birth_plan_status": "not_started",
            "created_at": now,
            "updated_at": now
        }
        await db.birth_plans.insert_one(plan)
        plan.pop("_id", None)
    return plan


@router.put("/birth-plan/section/{section_id}")
async def update_birth_plan_section(section_id: str, request: Request, user: User = Depends(check_role(["MOM"]))):
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
            section["status"] = "Complete" if data else "In progress"
            section_found = True
        if section.get("status") == "Complete":
            completed_count += 1
    
    if not section_found:
        raise HTTPException(status_code=404, detail="Section not found")
    
    completion_percentage = (completed_count / len(sections)) * 100 if sections else 0
    
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
    
    # Notify providers when birth plan is marked complete
    if new_status == "complete" and previous_status != "complete":
        accepted_shares = await db.share_requests.find(
            {"mom_user_id": user.user_id, "status": "accepted"},
            {"_id": 0}
        ).to_list(100)
        
        for share in accepted_shares:
            await create_notification(
                user_id=share["provider_id"],
                notif_type="birth_plan_complete",
                title="Birth Plan Complete",
                message=f"{user.full_name} has completed their birth plan.",
                data={"mom_user_id": user.user_id}
            )
    
    return {"message": "Section updated", "completion_percentage": completion_percentage, "birth_plan_status": new_status}


@router.get("/birth-plan/export")
async def export_birth_plan(user: User = Depends(check_role(["MOM"]))):
    """Get birth plan for export"""
    plan = await db.birth_plans.find_one({"user_id": user.user_id}, {"_id": 0})
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    return {
        "plan": plan,
        "user_name": user_doc.get("full_name") if user_doc else None,
        "due_date": mom_profile.get("due_date") if mom_profile else None,
        "birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
        "export_note": "PDF generation is available via /birth-plan/export/pdf"
    }


@router.get("/birth-plan/export/pdf")
async def export_birth_plan_pdf(user: User = Depends(check_role(["MOM"]))):
    """Generate and download PDF version of birth plan"""
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
    
    user_name = user_doc.get("full_name", "Mom") if user_doc else "Mom"
    elements.append(Paragraph(f"{user_name}'s Birth Plan", title_style))
    elements.append(Spacer(1, 10))
    
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
    
    section_names = {
        "getting_started": "Getting Started",
        "support_preferences": "Support & Atmosphere",
        "pain_management": "Pain Management",
        "monitoring_iv": "Labor Environment & Comfort",
        "interventions": "Interventions & C-Section",
        "pushing_safe_word": "Pushing, Delivery & Safe Word",
        "baby_care": "Baby Care After Birth",
        "feeding": "Feeding Preferences",
        "postpartum": "Postpartum Care",
        "additional_info": "Additional Information"
    }
    
    for section in plan.get("sections", []):
        section_id = section.get("section_id", "")
        section_name = section_names.get(section_id, section_id.replace("_", " ").title())
        data = section.get("data", {})
        
        if not data:
            continue
        
        elements.append(Paragraph(section_name, heading_style))
        
        for key, value in data.items():
            if value:
                label = key.replace("_", " ").replace("Preference", "").title()
                if isinstance(value, list):
                    value_str = ", ".join(str(v) for v in value)
                else:
                    value_str = str(value)
                elements.append(Paragraph(f"<b>{label}:</b> {value_str}", body_style))
        
        elements.append(Spacer(1, 10))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"Birth_Plan_{user_name.replace(' ', '_')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============== BIRTH PLAN SHARE ROUTES (MOM) ==============

@router.post("/birth-plan/share")
async def share_birth_plan(share_data: ShareRequestCreate, user: User = Depends(check_role(["MOM"]))):
    """Send a share request to a provider"""
    provider = await db.users.find_one(
        {"user_id": share_data.provider_id, "role": {"$in": ["DOULA", "MIDWIFE"]}},
        {"_id": 0}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
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
    
    email_html = get_share_request_email_html(user.full_name, provider["full_name"])
    await send_notification_email(
        to_email=provider["email"],
        subject=f"New Birth Plan Share Request from {user.full_name}",
        html_content=email_html
    )
    
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
    
    for req in requests:
        provider = await db.users.find_one(
            {"user_id": req.get("provider_id")}, 
            {"_id": 0, "picture": 1}
        )
        if provider:
            req["provider_picture"] = provider.get("picture")
    
    return {"requests": requests}


@router.delete("/birth-plan/share/{request_id}")
async def revoke_share(request_id: str, user: User = Depends(check_role(["MOM"]))):
    """Revoke a share request"""
    request_doc = await db.share_requests.find_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    if not request_doc:
        raise HTTPException(status_code=404, detail="Share request not found")
    
    provider_id = request_doc.get("provider_id")
    
    await db.share_requests.delete_one({
        "request_id": request_id,
        "mom_user_id": user.user_id
    })
    
    if provider_id:
        await db.provider_notes.delete_many({
            "birth_plan_id": user.user_id,
            "provider_id": provider_id
        })
        
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
    
    return {"message": "Share request revoked"}


# ============== PROVIDER BIRTH PLAN ROUTES ==============

@router.get("/provider/shared-birth-plans")
async def get_shared_birth_plans(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all birth plans shared with this provider (read-only)"""
    accepted_requests = await db.share_requests.find(
        {"provider_id": user.user_id, "status": "accepted"},
        {"_id": 0}
    ).to_list(100)
    
    birth_plans = []
    for req in accepted_requests:
        if not req.get("can_view_birth_plan", True):
            continue
            
        plan = await db.birth_plans.find_one({"user_id": req["mom_user_id"]}, {"_id": 0})
        mom_profile = await db.mom_profiles.find_one({"user_id": req["mom_user_id"]}, {"_id": 0})
        
        notes = await db.provider_notes.find(
            {"birth_plan_id": req["mom_user_id"], "provider_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        if plan:
            birth_plans.append({
                "mom_user_id": req["mom_user_id"],
                "mom_name": req["mom_name"],
                "due_date": mom_profile.get("due_date") if mom_profile else None,
                "birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
                "plan": plan,
                "birth_plan_status": plan.get("birth_plan_status", "not_started"),
                "provider_notes": notes,
                "shared_at": req["responded_at"],
                "read_only": True
            })
    
    return {"birth_plans": birth_plans}


@router.get("/provider/shared-birth-plan/{mom_user_id}")
async def get_shared_birth_plan_detail(mom_user_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get a specific shared birth plan with provider notes (read-only view)"""
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    if not share_request.get("can_view_birth_plan", True):
        raise HTTPException(status_code=403, detail="You do not have permission to view this birth plan")
    
    plan = await db.birth_plans.find_one({"user_id": mom_user_id}, {"_id": 0})
    mom = await db.users.find_one({"user_id": mom_user_id}, {"_id": 0, "password_hash": 0})
    mom_profile = await db.mom_profiles.find_one({"user_id": mom_user_id}, {"_id": 0})
    
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
        "read_only": True,
        "can_add_notes": True
    }


@router.get("/provider/client/{mom_user_id}/birth-plan")
async def get_client_birth_plan(mom_user_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get a client's birth plan (simplified view for client list)"""
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
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
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    client = await db.clients.find_one({
        "provider_id": user.user_id,
        "linked_mom_id": mom_id
    })
    
    if not share_request and not client:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
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
    
    user_name = user_doc.get("full_name", "Client") if user_doc else "Client"
    elements.append(Paragraph(f"{user_name}'s Birth Plan", title_style))
    elements.append(Spacer(1, 10))
    
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
    
    section_names = {
        "getting_started": "Getting Started",
        "support_preferences": "Support & Atmosphere",
        "pain_management": "Pain Management",
        "monitoring_iv": "Labor Environment & Comfort",
        "interventions": "Interventions & C-Section",
        "pushing_safe_word": "Pushing, Delivery & Safe Word",
        "baby_care": "Baby Care After Birth",
        "feeding": "Feeding Preferences",
        "postpartum": "Postpartum Care",
        "additional_info": "Additional Information"
    }
    
    for section in plan.get("sections", []):
        section_id = section.get("section_id", "")
        section_name = section_names.get(section_id, section_id.replace("_", " ").title())
        data = section.get("data", {})
        
        if not data:
            continue
        
        elements.append(Paragraph(section_name, heading_style))
        
        for key, value in data.items():
            if value:
                label = key.replace("_", " ").replace("Preference", "").title()
                if isinstance(value, list):
                    value_str = ", ".join(str(v) for v in value)
                else:
                    value_str = str(value)
                elements.append(Paragraph(f"<b>{label}:</b> {value_str}", body_style))
        
        elements.append(Spacer(1, 10))
    
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
    share_request = await db.share_requests.find_one({
        "mom_user_id": mom_user_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="Access not granted to this birth plan")
    
    now = get_now()
    
    note = {
        "note_id": f"pnote_{uuid.uuid4().hex[:12]}",
        "birth_plan_id": mom_user_id,
        "provider_id": user.user_id,
        "provider_name": user.full_name,
        "provider_role": user.role,
        "section_id": note_data.section_id,
        "content": note_data.content,
        "created_at": now,
        "updated_at": now
    }
    
    await db.provider_notes.insert_one(note)
    note.pop('_id', None)
    
    await create_notification(
        user_id=mom_user_id,
        notif_type="provider_note",
        title="New Note from Provider",
        message=f"{user.full_name} added a note to your birth plan.",
        data={"note_id": note["note_id"], "section_id": note_data.section_id}
    )
    
    return note


@router.put("/provider/birth-plan-notes/{note_id}")
async def update_provider_note(note_id: str, request: Request, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a provider note"""
    body = await request.json()
    content = body.get("content")
    
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    
    result = await db.provider_notes.update_one(
        {"note_id": note_id, "provider_id": user.user_id},
        {"$set": {"content": content, "updated_at": get_now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note updated"}


@router.delete("/provider/birth-plan-notes/{note_id}")
async def delete_provider_note(note_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a provider note"""
    result = await db.provider_notes.delete_one({
        "note_id": note_id,
        "provider_id": user.user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}


# ============== WELLNESS ROUTES (MOM) ==============

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
async def get_wellness_checkins(user: User = Depends(check_role(["MOM"])), limit: int = 30):
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
async def get_wellness_entries(user: User = Depends(check_role(["MOM"])), limit: int = 30):
    """Get wellness entry history"""
    entries = await db.wellness_entries.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return {"entries": entries}


@router.get("/wellness/stats")
async def get_wellness_stats(user: User = Depends(check_role(["MOM"])), days: int = 7):
    """Get wellness statistics for the past N days"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
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


# ============== POSTPARTUM PLAN ROUTES (MOM) ==============

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


# ============== TIMELINE ROUTES (MOM) ==============

@router.get("/timeline")
async def get_timeline(user: User = Depends(check_role(["MOM"]))):
    """Get pregnancy timeline with milestones and custom events"""
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not mom_profile or not mom_profile.get("due_date"):
        return {"milestones": [], "custom_events": [], "message": "Please complete onboarding with your due date"}
    
    due_date_str = mom_profile["due_date"]
    try:
        due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
    except:
        return {"milestones": [], "custom_events": [], "message": "Invalid due date format"}
    
    conception_date = due_date - timedelta(weeks=40)
    today = datetime.now()
    
    days_pregnant = (today - conception_date).days
    current_week = max(1, min(42, days_pregnant // 7))
    
    milestones = []
    for milestone in PREGNANCY_MILESTONES:
        milestone_date = conception_date + timedelta(weeks=milestone["week"])
        milestones.append({
            **milestone,
            "date": milestone_date.strftime("%Y-%m-%d"),
            "is_past": milestone["week"] < current_week,
            "is_current": milestone["week"] == current_week
        })
    
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


# ============== WEEKLY CONTENT ROUTES (MOM) ==============

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
    
    if today > due_date:
        days_since_due = (today - due_date).days
        postpartum_week = (days_since_due // 7) + 1
        
        tip = POSTPARTUM_TIPS.get(postpartum_week)
        if not tip:
            tip = "Congratulations on your new arrival! Remember to rest, accept help, and trust your instincts."
        
        affirmation = POSTPARTUM_AFFIRMATIONS.get(postpartum_week, GENERIC_POSTPARTUM_AFFIRMATION)
        
        return {
            "week": None,
            "is_postpartum": True,
            "postpartum_week": postpartum_week,
            "tip": tip,
            "affirmation": affirmation
        }
    else:
        conception_date = due_date - timedelta(weeks=40)
        days_pregnant = (today - conception_date).days
        current_week = max(1, min(42, days_pregnant // 7))
        
        tip = WEEKLY_TIPS.get(current_week)
        if not tip:
            closest_week = min(WEEKLY_TIPS.keys(), key=lambda x: abs(x - current_week))
            tip = WEEKLY_TIPS.get(closest_week, "Stay active, eat well, and rest when you need to.")
        
        affirmation = WEEKLY_AFFIRMATIONS.get(current_week)
        if not affirmation:
            closest_week = min(WEEKLY_AFFIRMATIONS.keys(), key=lambda x: abs(x - current_week))
            affirmation = WEEKLY_AFFIRMATIONS.get(closest_week, "You are doing amazing.")
        
        return {
            "week": current_week,
            "is_postpartum": False,
            "postpartum_week": None,
            "tip": tip,
            "affirmation": affirmation
        }
