"""
Mom Routes Module

Handles Mom-specific functionality including onboarding, profile, birth plan,
wellness tracking, postpartum plan, team management, and timeline.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/mom", tags=["Mom"])

# Birth plan sections constant
BIRTH_PLAN_SECTIONS = [
    {"section_id": "labor_support", "title": "Labor Support"},
    {"section_id": "pain_management", "title": "Pain Management"},
    {"section_id": "birth_preferences", "title": "Birth Preferences"},
    {"section_id": "after_birth", "title": "After Birth"},
    {"section_id": "newborn_care", "title": "Newborn Care"},
]


# ============== REQUEST MODELS ==============

class MomProfileUpdate(BaseModel):
    due_date: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    zip_code: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    number_of_children: Optional[int] = None


class WellnessCheckinRequest(BaseModel):
    mood: str
    energy_level: int
    sleep_hours: Optional[float] = None
    notes: Optional[str] = None


class WellnessEntryRequest(BaseModel):
    entry_type: str  # gratitude, affirmation, reflection
    content: str


class PostpartumPlanUpdate(BaseModel):
    support_people: Optional[List[Dict[str, str]]] = None
    meal_prep: Optional[Dict[str, Any]] = None
    household_help: Optional[Dict[str, Any]] = None
    mental_health: Optional[Dict[str, Any]] = None
    recovery_items: Optional[List[str]] = None
    notes: Optional[str] = None


# ============== ROUTES ==============

@router.post("/onboarding")
async def mom_onboarding(profile_data: MomProfileUpdate, user: User = Depends(check_role(["MOM"]))):
    """Complete mom onboarding"""
    now = get_now()
    
    # Create or update mom profile
    mom_profile = {
        "user_id": user.user_id,
        "due_date": profile_data.due_date,
        "planned_birth_setting": profile_data.planned_birth_setting,
        "zip_code": profile_data.zip_code,
        "location_city": profile_data.location_city,
        "location_state": profile_data.location_state,
        "connected_doula_id": None,
        "connected_midwife_id": None,
        "updated_at": now
    }
    
    await db.mom_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": mom_profile},
        upsert=True
    )
    
    # Initialize birth plan
    birth_plan_exists = await db.birth_plans.find_one({"user_id": user.user_id})
    if not birth_plan_exists:
        birth_plan = {
            "plan_id": f"plan_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "sections": [
                {"section_id": s["section_id"], "title": s["title"], "status": "Not started", "data": {}, "discussion_notes": []}
                for s in BIRTH_PLAN_SECTIONS
            ],
            "completion_percentage": 0.0,
            "created_at": now,
            "updated_at": now
        }
        await db.birth_plans.insert_one(birth_plan)
    
    # Mark onboarding complete
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    
    return {"message": "Onboarding completed", "profile": mom_profile}


@router.get("/profile")
async def get_mom_profile(user: User = Depends(check_role(["MOM"]))):
    """Get mom profile"""
    profile = await db.mom_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile


@router.put("/profile")
async def update_mom_profile(profile_data: MomProfileUpdate, user: User = Depends(check_role(["MOM"]))):
    """Update mom profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()
    
    await db.mom_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated"}


@router.get("/midwife-visits")
async def get_mom_midwife_visits(user: User = Depends(check_role(["MOM"]))):
    """Get midwife visits for the mom (from linked clients)"""
    # Find client records where mom is linked
    clients = await db.clients.find(
        {"linked_mom_id": user.user_id},
        {"_id": 0}
    ).to_list(10)
    
    all_visits = []
    for client in clients:
        # Get visits for this client from providers
        visits = await db.visits.find(
            {"client_id": client["client_id"]},
            {"_id": 0}
        ).sort("visit_date", -1).to_list(100)
        
        # Get provider info
        provider = await db.users.find_one(
            {"user_id": client["provider_id"]},
            {"_id": 0, "full_name": 1, "role": 1}
        )
        
        for visit in visits:
            visit["provider_name"] = provider.get("full_name") if provider else "Unknown"
            visit["provider_role"] = provider.get("role") if provider else ""
            all_visits.append(visit)
    
    return all_visits


@router.get("/team")
async def get_mom_team(user: User = Depends(check_role(["MOM"]))):
    """Get mom's care team (connected providers)"""
    # Get accepted share requests
    share_requests = await db.share_requests.find(
        {"mom_user_id": user.user_id, "status": "accepted"},
        {"_id": 0}
    ).to_list(20)
    
    team = []
    for req in share_requests:
        provider = await db.users.find_one(
            {"user_id": req["provider_id"]},
            {"_id": 0, "password_hash": 0}
        )
        if provider:
            # Get provider profile based on role
            if provider.get("role") == "DOULA":
                profile = await db.doula_profiles.find_one(
                    {"user_id": req["provider_id"]},
                    {"_id": 0}
                )
            elif provider.get("role") == "MIDWIFE":
                profile = await db.midwife_profiles.find_one(
                    {"user_id": req["provider_id"]},
                    {"_id": 0}
                )
            else:
                profile = None
            
            team.append({
                "provider": provider,
                "profile": profile,
                "share_request": req
            })
    
    return team


@router.get("/team-providers")
async def get_team_providers(user: User = Depends(check_role(["MOM"]))):
    """Get providers in mom's team for messaging"""
    # Get accepted share requests
    share_requests = await db.share_requests.find(
        {"mom_user_id": user.user_id, "status": "accepted"},
        {"_id": 0}
    ).to_list(20)
    
    providers = []
    for req in share_requests:
        provider = await db.users.find_one(
            {"user_id": req["provider_id"]},
            {"_id": 0, "password_hash": 0}
        )
        if provider:
            providers.append(provider)
    
    return providers


@router.get("/contracts")
async def get_mom_contracts(user: User = Depends(check_role(["MOM"]))):
    """Get contracts sent to this mom"""
    # Find client records where this mom is linked
    clients = await db.clients.find(
        {"linked_mom_id": user.user_id},
        {"_id": 0, "client_id": 1}
    ).to_list(100)
    
    client_ids = [c["client_id"] for c in clients]
    
    contracts = await db.contracts.find(
        {"client_id": {"$in": client_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with provider info
    for contract in contracts:
        # Get provider from doula_id or midwife_id or provider_id
        provider_id = contract.get("provider_id") or contract.get("doula_id") or contract.get("midwife_id")
        if provider_id:
            provider = await db.users.find_one(
                {"user_id": provider_id},
                {"_id": 0, "full_name": 1, "role": 1}
            )
            if provider:
                contract["provider_name"] = provider.get("full_name")
                contract["provider_role"] = provider.get("role")
    
    return contracts


@router.get("/invoices")
async def get_mom_invoices(user: User = Depends(check_role(["MOM"]))):
    """Get invoices sent to this mom"""
    # Find client records where this mom is linked
    clients = await db.clients.find(
        {"linked_mom_id": user.user_id},
        {"_id": 0, "client_id": 1}
    ).to_list(100)
    
    client_ids = [c["client_id"] for c in clients]
    
    invoices = await db.invoices.find(
        {"client_id": {"$in": client_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with provider info
    for invoice in invoices:
        provider = await db.users.find_one(
            {"user_id": invoice.get("provider_id")},
            {"_id": 0, "full_name": 1, "role": 1}
        )
        if provider:
            invoice["provider_name"] = provider.get("full_name")
            invoice["provider_role"] = provider.get("role")
    
    return invoices


@router.get("/invoices/{invoice_id}")
async def get_mom_invoice(invoice_id: str, user: User = Depends(check_role(["MOM"]))):
    """Get a specific invoice for this mom"""
    # Find client records where this mom is linked
    clients = await db.clients.find(
        {"linked_mom_id": user.user_id},
        {"_id": 0, "client_id": 1}
    ).to_list(100)
    
    client_ids = [c["client_id"] for c in clients]
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "client_id": {"$in": client_ids}},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get provider info
    provider = await db.users.find_one(
        {"user_id": invoice.get("provider_id")},
        {"_id": 0, "full_name": 1, "role": 1, "email": 1}
    )
    if provider:
        invoice["provider_name"] = provider.get("full_name")
        invoice["provider_role"] = provider.get("role")
        invoice["provider_email"] = provider.get("email")
    
    return invoice


@router.post("/appointments")
async def create_mom_appointment(request_data: dict, user: User = Depends(check_role(["MOM"]))):
    """Mom creates an appointment request to a provider"""
    now = get_now()
    
    provider_id = request_data.get("provider_id")
    if not provider_id:
        raise HTTPException(status_code=400, detail="provider_id required")
    
    # Verify provider exists and is connected
    share_request = await db.share_requests.find_one({
        "mom_user_id": user.user_id,
        "provider_id": provider_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="Not connected with this provider")
    
    # Get mom's full name for display
    mom_name = user.full_name
    
    # Get provider info for display
    provider = await db.users.find_one({"user_id": provider_id}, {"_id": 0, "full_name": 1, "role": 1})
    
    # Get client record for this mom-provider relationship
    client = await db.clients.find_one(
        {"provider_id": provider_id, "linked_mom_id": user.user_id},
        {"_id": 0, "client_id": 1}
    )
    
    # Accept both field name formats from frontend
    appointment_date = request_data.get("appointment_date") or request_data.get("date")
    appointment_time = request_data.get("appointment_time") or request_data.get("time")
    
    appointment = {
        "appointment_id": f"apt_{uuid.uuid4().hex[:12]}",
        "provider_id": provider_id,
        "mom_id": user.user_id,
        "mom_user_id": user.user_id,  # Add both for compatibility
        "mom_name": mom_name,
        "client_id": client["client_id"] if client else None,
        "client_name": mom_name,
        "title": request_data.get("title", "Appointment"),
        "description": request_data.get("description") or request_data.get("notes"),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "proposed_date": appointment_date,
        "proposed_time": appointment_time,
        "duration_minutes": request_data.get("duration_minutes", 60),
        "location": request_data.get("location"),
        "is_virtual": request_data.get("is_virtual", False),
        "appointment_type": request_data.get("appointment_type", "consultation"),
        "status": "pending",  # Provider needs to confirm
        "created_by": "mom",
        "created_at": now,
        "updated_at": now
    }
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    # Add provider info for response
    appointment["provider_name"] = provider.get("full_name") if provider else None
    appointment["provider_role"] = provider.get("role") if provider else None
    
    return appointment


@router.get("/appointments")
async def get_mom_appointments(user: User = Depends(check_role(["MOM"]))):
    """Get all appointments for Mom (excluding provider's private notes)"""
    appointments = await db.appointments.find(
        {"$or": [{"mom_user_id": user.user_id}, {"mom_id": user.user_id}]},
        {"_id": 0, "notes": 0}  # Exclude provider's private notes
    ).sort("appointment_date", 1).to_list(100)
    
    return appointments


@router.put("/appointments/{appointment_id}/respond")
async def respond_to_appointment(
    appointment_id: str,
    response: str,
    user: User = Depends(check_role(["MOM"]))
):
    """Mom responds to an appointment invitation"""
    if response not in ["accepted", "declined"]:
        raise HTTPException(status_code=400, detail="Response must be 'accepted' or 'declined'")
    
    appointment = await db.appointments.find_one({
        "appointment_id": appointment_id,
        "$or": [{"mom_user_id": user.user_id}, {"mom_id": user.user_id}]
    })
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = get_now()
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": response, "updated_at": now}}
    )
    
    # Notify the provider
    await create_notification(
        user_id=appointment["provider_id"],
        notif_type="appointment_response",
        title=f"Appointment {response.title()}",
        message=f"{user.full_name} has {response} your appointment invitation",
        data={"appointment_id": appointment_id, "status": response}
    )
    
    return {"message": f"Appointment {response}"}


@router.delete("/appointments/{appointment_id}")
async def cancel_mom_appointment(appointment_id: str, user: User = Depends(check_role(["MOM"]))):
    """Mom cancels an appointment"""
    appointment = await db.appointments.find_one({
        "appointment_id": appointment_id,
        "$or": [{"mom_user_id": user.user_id}, {"mom_id": user.user_id}]
    })
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = get_now()
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )
    
    # Notify the provider
    await create_notification(
        user_id=appointment["provider_id"],
        notif_type="appointment_response",
        title="Appointment Cancelled",
        message=f"{user.full_name} has cancelled the appointment",
        data={"appointment_id": appointment_id, "status": "cancelled"}
    )
    
    return {"message": "Appointment cancelled"}


# ============== MOM CONTRACTS ENDPOINT ==============

@router.get("/contracts")
async def get_mom_contracts(user: User = Depends(get_current_user())):
    """
    Get all contracts for the Mom user.
    This includes contracts where the Mom is linked through their team or as a client.
    """
    # Get Mom's linked client IDs from their team
    mom_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "team": 1}
    )
    
    # Collect all client_ids the mom is linked to
    client_ids = []
    if mom_doc and "team" in mom_doc:
        for team_member in mom_doc.get("team", []):
            if team_member.get("client_id"):
                client_ids.append(team_member["client_id"])
    
    # Also check if mom themselves is a client (user_id matches client_id pattern)
    client_ids.append(user.user_id)
    
    # Fetch contracts for these client IDs from both doula and midwife contracts
    contracts = []
    
    # Fetch doula contracts
    doula_contracts = await db.doula_contracts.find(
        {"client_id": {"$in": client_ids}}
    ).to_list(100)
    
    for contract in doula_contracts:
        contract.pop("_id", None)
        # Add provider info
        provider = await db.users.find_one(
            {"user_id": contract.get("doula_id")},
            {"_id": 0, "full_name": 1, "role": 1}
        )
        if provider:
            contract["provider_name"] = provider.get("full_name", "Unknown")
            contract["provider_role"] = "DOULA"
        contracts.append(contract)
    
    # Fetch midwife contracts
    midwife_contracts = await db.midwife_contracts.find(
        {"client_id": {"$in": client_ids}}
    ).to_list(100)
    
    for contract in midwife_contracts:
        contract.pop("_id", None)
        # Add provider info
        provider = await db.users.find_one(
            {"user_id": contract.get("midwife_id")},
            {"_id": 0, "full_name": 1, "role": 1}
        )
        if provider:
            contract["provider_name"] = provider.get("full_name", "Unknown")
            contract["provider_role"] = "MIDWIFE"
        contracts.append(contract)
    
    # Sort by created_at descending
    contracts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return contracts


# ============== MOM INVOICES ENDPOINT ==============

@router.get("/invoices")
async def get_mom_invoices(user: User = Depends(get_current_user())):
    """
    Get all invoices for the Mom user.
    This includes invoices where the Mom is linked through their team or as a client.
    """
    # Get Mom's linked client IDs from their team
    mom_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "team": 1}
    )
    
    # Collect all client_ids the mom is linked to
    client_ids = []
    if mom_doc and "team" in mom_doc:
        for team_member in mom_doc.get("team", []):
            if team_member.get("client_id"):
                client_ids.append(team_member["client_id"])
    
    # Also check if mom themselves is a client
    client_ids.append(user.user_id)
    
    # Fetch invoices for these client IDs
    invoices_cursor = db.invoices.find(
        {"client_id": {"$in": client_ids}}
    )
    
    invoices = []
    async for invoice in invoices_cursor:
        invoice.pop("_id", None)
        # Add provider info
        provider_id = invoice.get("provider_id") or invoice.get("pro_user_id")
        if provider_id:
            provider = await db.users.find_one(
                {"user_id": provider_id},
                {"_id": 0, "full_name": 1, "role": 1}
            )
            if provider:
                invoice["provider_name"] = provider.get("full_name", "Unknown")
                invoice["provider_role"] = provider.get("role", "DOULA")
        invoices.append(invoice)
    
    # Sort by created_at descending
    invoices.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return invoices
