"""
Leads Routes Module

Handles the Lead → Consultation → Client flow.
Leads are potential clients who have requested a consultation with a provider.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_current_user, User, check_role, create_notification, get_now
from services.email_service import send_welcome_client_email

router = APIRouter(prefix="/leads", tags=["Leads"])

# Lead statuses
LEAD_STATUSES = [
    "consultation_requested",  # Mom requested consultation
    "consultation_scheduled",  # Provider scheduled consultation appointment
    "consultation_completed",  # Consultation happened
    "converted_to_client",     # Lead became a full client
    "declined",                # Provider declined the lead
    "not_a_fit",               # After consultation, decided not to work together
]


class RequestConsultationInput(BaseModel):
    provider_id: str
    message: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


class ConvertToClientInput(BaseModel):
    initial_status: Optional[str] = None  # e.g., "Lead", "Prenatal", "Active"


# ============== MOM ENDPOINTS ==============

@router.post("/request-consultation")
async def request_consultation(
    data: RequestConsultationInput,
    user: User = Depends(check_role(["MOM"]))
):
    """
    Mom requests a consultation with a provider.
    Creates a new lead record linking the mom and provider.
    """
    # Verify provider exists
    provider = await db.users.find_one(
        {"user_id": data.provider_id, "role": {"$in": ["DOULA", "MIDWIFE"]}},
        {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "role": 1}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Check if lead already exists
    existing = await db.leads.find_one({
        "mom_user_id": user.user_id,
        "provider_id": data.provider_id,
        "status": {"$nin": ["declined", "not_a_fit", "removed_from_team"]}
    })
    
    if existing:
        if existing["status"] == "converted_to_client":
            raise HTTPException(status_code=400, detail="You are already a client of this provider")
        raise HTTPException(status_code=400, detail="You already have a pending consultation request with this provider")
    
    now = get_now()
    
    lead_doc = {
        "lead_id": f"lead_{uuid.uuid4().hex[:12]}",
        "mom_user_id": user.user_id,
        "mom_name": user.full_name,
        "mom_email": user.email,
        "provider_id": data.provider_id,
        "provider_name": provider["full_name"],
        "provider_role": provider["role"],
        "status": "consultation_requested",
        "message": data.message,
        "created_at": now,
        "updated_at": now,
        "consultation_appointment_id": None,
        "converted_at": None,
        "notes": []
    }
    
    await db.leads.insert_one(lead_doc)
    lead_doc.pop("_id", None)
    
    # Create notification for provider
    await create_notification(
        user_id=provider["user_id"],
        notif_type="consultation_request",
        title="New Consultation Request",
        message=f"{user.full_name} has requested a consultation with you.",
        data={"lead_id": lead_doc["lead_id"], "mom_name": user.full_name}
    )
    
    return {
        "message": "Consultation request sent successfully",
        "lead": lead_doc
    }


@router.get("/my-consultation-requests")
async def get_my_consultation_requests(user: User = Depends(check_role(["MOM"]))):
    """Get all consultation requests sent by the mom"""
    leads = await db.leads.find(
        {"mom_user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with provider info
    for lead in leads:
        provider = await db.users.find_one(
            {"user_id": lead["provider_id"]},
            {"_id": 0, "full_name": 1, "picture": 1, "role": 1}
        )
        if provider:
            lead["provider_picture"] = provider.get("picture")
    
    return leads


# ============== PROVIDER ENDPOINTS ==============

@router.get("", include_in_schema=True)
async def get_provider_leads(
    status: Optional[str] = None,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Get all leads for the provider.
    Optionally filter by status.
    """
    query = {"provider_id": user.user_id}
    
    if status:
        query["status"] = status
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with mom profile info
    for lead in leads:
        mom = await db.users.find_one(
            {"user_id": lead["mom_user_id"]},
            {"_id": 0, "full_name": 1, "picture": 1, "email": 1}
        )
        if mom:
            lead["mom_picture"] = mom.get("picture")
            lead["mom_email"] = mom.get("email")
        
        # Get mom's profile for EDD, birth setting, and number of children
        profile = await db.mom_profiles.find_one(
            {"user_id": lead["mom_user_id"]},
            {"_id": 0, "due_date": 1, "edd": 1, "planned_birth_setting": 1, "number_of_children": 1}
        )
        if profile:
            lead["edd"] = profile.get("due_date") or profile.get("edd")
            lead["planned_birth_setting"] = profile.get("planned_birth_setting")
            lead["number_of_children"] = profile.get("number_of_children")
        
        # Get birth plan key details for provider to consider working together
        birth_plan = await db.birth_plans.find_one(
            {"user_id": lead["mom_user_id"]},
            {"_id": 0, "sections": 1, "completion_percentage": 1}
        )
        if birth_plan:
            lead["birth_plan_completion"] = birth_plan.get("completion_percentage", 0)
            
            # Extract key details from "about_me" section
            sections = birth_plan.get("sections", [])
            about_me = next((s for s in sections if s.get("section_id") == "about_me"), None)
            if about_me and about_me.get("data"):
                data = about_me["data"]
                lead["birth_plan_due_date"] = data.get("dueDate")
                lead["birth_plan_location"] = data.get("birthLocation")
                lead["birth_plan_hospital_name"] = data.get("hospitalName")
            
            # Extract previous birth experience from "other_considerations" section
            other_considerations = next((s for s in sections if s.get("section_id") == "other_considerations"), None)
            if other_considerations and other_considerations.get("data"):
                data = other_considerations["data"]
                lead["previous_birth_experience"] = data.get("previousBirthExperience")
        
        # If consultation scheduled, get appointment info
        if lead.get("consultation_appointment_id"):
            appointment = await db.appointments.find_one(
                {"appointment_id": lead["consultation_appointment_id"]},
                {"_id": 0, "appointment_date": 1, "appointment_time": 1}
            )
            if appointment:
                lead["consultation_date"] = appointment.get("appointment_date")
                lead["consultation_time"] = appointment.get("appointment_time")
    
    return leads


@router.get("/stats")
async def get_leads_stats(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get lead statistics for dashboard"""
    pipeline = [
        {"$match": {"provider_id": user.user_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    results = await db.leads.aggregate(pipeline).to_list(100)
    
    stats = {
        "total": 0,
        "consultation_requested": 0,
        "consultation_scheduled": 0,
        "consultation_completed": 0,
        "converted_to_client": 0,
        "declined": 0,
        "not_a_fit": 0,
    }
    
    for r in results:
        stats[r["_id"]] = r["count"]
        stats["total"] += r["count"]
    
    # Calculate active leads (not converted or closed)
    stats["active_leads"] = (
        stats["consultation_requested"] + 
        stats["consultation_scheduled"] + 
        stats["consultation_completed"]
    )
    
    return stats


@router.put("/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    data: LeadStatusUpdate,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Update a lead's status"""
    if data.status not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {LEAD_STATUSES}")
    
    lead = await db.leads.find_one({
        "lead_id": lead_id,
        "provider_id": user.user_id
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    now = get_now()
    
    update = {
        "status": data.status,
        "updated_at": now
    }
    
    if data.notes:
        update["$push"] = {"notes": {"content": data.notes, "created_at": now}}
    
    await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": update} if "$push" not in update else {"$set": {k: v for k, v in update.items() if k != "$push"}, "$push": update["$push"]}
    )
    
    # Notify mom of status change
    status_messages = {
        "declined": f"{user.full_name} is unable to take on new clients at this time.",
        "not_a_fit": f"After your consultation, {user.full_name} has indicated they may not be the right fit for your needs.",
    }
    
    if data.status in status_messages:
        await create_notification(
            user_id=lead["mom_user_id"],
            notif_type="consultation_update",
            title="Consultation Request Update",
            message=status_messages[data.status],
            data={"lead_id": lead_id, "status": data.status}
        )
    
    return {"message": "Lead status updated", "status": data.status}


@router.post("/{lead_id}/schedule-consultation")
async def schedule_consultation(
    lead_id: str,
    appointment_id: str,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Link a consultation appointment to a lead.
    Called after creating an appointment to update the lead status.
    """
    lead = await db.leads.find_one({
        "lead_id": lead_id,
        "provider_id": user.user_id
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Verify appointment exists
    appointment = await db.appointments.find_one({"appointment_id": appointment_id})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = get_now()
    
    await db.leads.update_one(
        {"lead_id": lead_id},
        {
            "$set": {
                "status": "consultation_scheduled",
                "consultation_appointment_id": appointment_id,
                "updated_at": now
            }
        }
    )
    
    # Notify mom
    await create_notification(
        user_id=lead["mom_user_id"],
        notif_type="consultation_scheduled",
        title="Consultation Scheduled",
        message=f"{user.full_name} has scheduled your consultation for {appointment.get('appointment_date')}.",
        data={"lead_id": lead_id, "appointment_id": appointment_id}
    )
    
    return {"message": "Consultation scheduled", "appointment_id": appointment_id}


@router.post("/{lead_id}/convert-to-client")
async def convert_lead_to_client(
    lead_id: str,
    data: ConvertToClientInput,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Convert a lead to a full client.
    This creates the proper client relationship and updates the lead status.
    """
    lead = await db.leads.find_one({
        "lead_id": lead_id,
        "provider_id": user.user_id
    })
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead["status"] == "converted_to_client":
        raise HTTPException(status_code=400, detail="Lead is already converted to a client")
    
    now = get_now()
    
    # Use unified clients collection (same as provider_unified.py reads from)
    client_id_prefix = "client_"
    
    # Check if client already exists in unified clients collection
    existing_client = await db.clients.find_one({
        "linked_mom_id": lead["mom_user_id"],
        "provider_id": user.user_id
    })
    
    if existing_client:
        # Update existing client to active
        await db.clients.update_one(
            {"client_id": existing_client["client_id"]},
            {"$set": {"is_active": True, "status": data.initial_status or "Active", "updated_at": now}}
        )
        client_id = existing_client["client_id"]
    else:
        # Get mom's profile info
        mom = await db.users.find_one(
            {"user_id": lead["mom_user_id"]},
            {"_id": 0, "full_name": 1, "email": 1, "picture": 1}
        )
        mom_profile = await db.mom_profiles.find_one(
            {"user_id": lead["mom_user_id"]},
            {"_id": 0}
        )
        
        # Create new client record in unified clients collection
        client_id = f"{client_id_prefix}{uuid.uuid4().hex[:12]}"
        
        client_doc = {
            "client_id": client_id,
            "linked_mom_id": lead["mom_user_id"],
            "provider_id": user.user_id,
            "provider_type": user.role,  # DOULA or MIDWIFE - required for client list filtering
            "name": mom.get("full_name") if mom else lead["mom_name"],
            "email": mom.get("email") if mom else lead.get("mom_email"),
            "picture": mom.get("picture") if mom else None,
            "edd": mom_profile.get("due_date") or mom_profile.get("edd") if mom_profile else None,
            "due_date": mom_profile.get("due_date") or mom_profile.get("edd") if mom_profile else None,
            "planned_birth_setting": mom_profile.get("planned_birth_setting") if mom_profile else None,
            "status": data.initial_status or "Active",
            "is_active": True,
            "source": "lead_conversion",
            "lead_id": lead_id,
            "created_at": now,
            "updated_at": now
        }
        
        await db.clients.insert_one(client_doc)
    
    # Update lead status
    await db.leads.update_one(
        {"lead_id": lead_id},
        {
            "$set": {
                "status": "converted_to_client",
                "converted_at": now,
                "updated_at": now,
                "client_id": client_id
            }
        }
    )
    
    # Create share_request record for messaging permissions (existing system integration)
    existing_share = await db.share_requests.find_one({
        "mom_user_id": lead["mom_user_id"],
        "provider_id": user.user_id
    })
    
    if not existing_share:
        share_doc = {
            "request_id": f"share_{uuid.uuid4().hex[:12]}",
            "mom_user_id": lead["mom_user_id"],
            "mom_name": lead["mom_name"],
            "provider_id": user.user_id,
            "provider_name": user.full_name,
            "provider_role": user.role,
            "status": "accepted",
            "created_at": now,
            "responded_at": now,
            "source": "lead_conversion"
        }
        await db.share_requests.insert_one(share_doc)
    else:
        # Update existing share request to accepted
        await db.share_requests.update_one(
            {"request_id": existing_share["request_id"]},
            {"$set": {"status": "accepted", "responded_at": now}}
        )
    
    # Update mom's team
    await db.users.update_one(
        {"user_id": lead["mom_user_id"]},
        {
            "$addToSet": {
                "team": {
                    "provider_id": user.user_id,
                    "provider_name": user.full_name,
                    "provider_role": user.role,
                    "client_id": client_id,
                    "connected_at": now
                }
            }
        }
    )
    
    # Notify mom
    await create_notification(
        user_id=lead["mom_user_id"],
        notif_type="client_conversion",
        title="Welcome to the Team!",
        message=f"{user.full_name} has added you as a client. You can now access all features!",
        data={"lead_id": lead_id, "client_id": client_id, "provider_id": user.user_id}
    )
    
    # Send welcome email to mom (non-blocking)
    mom_email = lead.get("mom_email")
    if mom_email:
        try:
            await send_welcome_client_email(
                mom_email=mom_email,
                mom_name=lead["mom_name"],
                provider_name=user.full_name,
                provider_role=user.role
            )
        except Exception as e:
            # Log but don't fail the conversion
            import logging
            logging.warning(f"Failed to send welcome email to {mom_email}: {e}")
    
    return {
        "message": "Lead converted to client successfully",
        "client_id": client_id
    }


@router.get("/{lead_id}")
async def get_lead_details(
    lead_id: str,
    user: User = Depends(get_current_user())
):
    """Get details of a specific lead"""
    # Provider can see their own leads, mom can see leads they created
    query = {"lead_id": lead_id}
    if user.role in ["DOULA", "MIDWIFE"]:
        query["provider_id"] = user.user_id
    else:
        query["mom_user_id"] = user.user_id
    
    lead = await db.leads.find_one(query, {"_id": 0})
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Enrich with mom profile info
    mom = await db.users.find_one(
        {"user_id": lead["mom_user_id"]},
        {"_id": 0, "full_name": 1, "picture": 1, "email": 1}
    )
    if mom:
        lead["mom_picture"] = mom.get("picture")
    
    profile = await db.mom_profiles.find_one(
        {"user_id": lead["mom_user_id"]},
        {"_id": 0, "due_date": 1, "edd": 1, "planned_birth_setting": 1, "birth_preferences": 1}
    )
    if profile:
        lead["mom_profile"] = profile
    
    return lead
