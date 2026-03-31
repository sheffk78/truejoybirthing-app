"""
Midwife Routes Module

Handles Midwife-specific functionality including onboarding, profile management,
and dashboard.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/midwife", tags=["Midwife"])


# ============== REQUEST MODELS ==============

class MidwifeProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    certifications: Optional[List[str]] = None
    credentials: Optional[str] = None  # CNM, CPM, etc.
    license_number: Optional[str] = None
    license_state: Optional[str] = None
    services_offered: Optional[List[str]] = None
    birth_settings_served: Optional[List[str]] = None  # home, birth center, hospital
    birth_philosophy: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    zip_code: Optional[str] = None
    service_radius_miles: Optional[int] = None
    pricing_base: Optional[float] = None
    pricing_notes: Optional[str] = None
    insurance_accepted: Optional[List[str]] = None
    video_intro_url: Optional[str] = None
    more_about_me: Optional[str] = None
    in_marketplace: Optional[bool] = None
    accepting_new_clients: Optional[bool] = None
    accepting_clients: Optional[bool] = None
    practice_name: Optional[str] = None
    years_in_practice: Optional[int] = None
    picture: Optional[str] = None  # Profile photo URL or base64


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    edd: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    lmp: Optional[str] = None
    gravida: Optional[int] = None
    para: Optional[int] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    edd: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    status: Optional[str] = None
    internal_notes: Optional[str] = None
    lmp: Optional[str] = None
    gravida: Optional[int] = None
    para: Optional[int] = None


class NoteCreate(BaseModel):
    client_id: str
    content: str
    note_type: Optional[str] = "general"


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    note_type: Optional[str] = None


# ============== ROUTES ==============

@router.post("/onboarding")
async def midwife_onboarding(profile_data: MidwifeProfileUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Complete midwife onboarding"""
    now = get_now()
    
    # Create or update midwife profile
    profile = {
        "user_id": user.user_id,
        "full_name": profile_data.full_name or user.full_name,
        "phone": profile_data.phone,
        "bio": profile_data.bio,
        "experience_years": profile_data.experience_years,
        "certifications": profile_data.certifications or [],
        "credentials": profile_data.credentials,
        "license_number": profile_data.license_number,
        "license_state": profile_data.license_state,
        "services_offered": profile_data.services_offered or [],
        "birth_settings_served": profile_data.birth_settings_served or ["home", "birth_center"],
        "birth_philosophy": profile_data.birth_philosophy,
        "location_city": profile_data.location_city,
        "location_state": profile_data.location_state,
        "zip_code": profile_data.zip_code,
        "service_radius_miles": profile_data.service_radius_miles or 30,
        "pricing_base": profile_data.pricing_base,
        "pricing_notes": profile_data.pricing_notes,
        "insurance_accepted": profile_data.insurance_accepted or [],
        "practice_name": profile_data.practice_name,
        "years_in_practice": profile_data.years_in_practice,
        "in_marketplace": profile_data.in_marketplace if profile_data.in_marketplace is not None else True,
        "accepting_new_clients": profile_data.accepting_new_clients if profile_data.accepting_new_clients is not None else True,
        "updated_at": now
    }
    
    # Remove None values so we don't overwrite existing data with null
    profile = {k: v for k, v in profile.items() if v is not None}
    profile["user_id"] = user.user_id  # Always keep user_id
    profile["updated_at"] = now  # Always keep updated_at
    
    await db.midwife_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": profile},
        upsert=True
    )
    
    # Mark onboarding complete
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"onboarding_completed": True, "updated_at": now}}
    )
    
    return {"message": "Onboarding completed", "profile": profile}


@router.get("/profile")
async def get_midwife_profile(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife profile"""
    profile = await db.midwife_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile


@router.put("/profile")
async def update_midwife_profile(profile_data: MidwifeProfileUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update midwife profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()
    
    # If picture is being updated, also update in users collection
    if profile_data.picture is not None:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"picture": profile_data.picture, "updated_at": get_now()}}
        )
    
    await db.midwife_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated"}


@router.get("/dashboard")
async def get_midwife_dashboard(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife dashboard data"""
    # Get all clients
    all_clients = await db.clients.find(
        {"provider_id": user.user_id},
        {"_id": 0, "status": 1}
    ).to_list(500)
    
    total_clients = len(all_clients)
    
    # Prenatal clients - clients in prenatal stage
    prenatal_clients = len([c for c in all_clients if c.get("status") in ["Prenatal", "prenatal"]])
    
    # Active clients - any client that is not completed/inactive
    active_statuses = ["Active", "Prenatal", "Contract Sent", "Contract Signed", "Labor", "Postpartum", "active", "prenatal"]
    active_clients = len([c for c in all_clients if c.get("status") in active_statuses])
    
    # Pending contracts - match frontend key name
    contracts_pending_signature = await db.contracts.count_documents({
        "$or": [
            {"provider_id": user.user_id},
            {"midwife_id": user.user_id}
        ],
        "status": {"$in": ["Sent", "sent", "pending"]}
    })
    
    # Pending invoices - match frontend key name
    pending_invoices = await db.invoices.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["Sent", "sent", "pending"]}
    })
    
    # Get current month stats
    now = get_now()
    today = now.strftime("%Y-%m-%d")
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Visits this month (including prenatal visits)
    visits_this_month = await db.visits.count_documents({
        "midwife_id": user.user_id,
        "created_at": {"$gte": month_start}
    })
    prenatal_visits_count = await db.prenatal_visits.count_documents({
        "midwife_id": user.user_id,
        "created_at": {"$gte": month_start}
    })
    visits_this_month += prenatal_visits_count
    
    # Births this month
    births_this_month = await db.birth_records.count_documents({
        "provider_id": user.user_id,
        "created_at": {"$gte": month_start}
    })
    
    # Get upcoming appointments count (confirmed only, exclude pending)
    upcoming_appointments = await db.appointments.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["confirmed", "scheduled", "accepted"]},
        "$or": [
            {"start_datetime": {"$gte": now.isoformat()}},
            {"appointment_date": {"$gte": today}}
        ]
    })
    
    # Get recent messages count
    unread_messages = await db.messages.count_documents({
        "receiver_id": user.user_id,
        "read": False
    })
    
    # Lead Insights
    all_leads = await db.leads.find(
        {"provider_id": user.user_id},
        {"_id": 0, "status": 1}
    ).to_list(500)
    
    total_leads = len(all_leads)
    active_leads = len([l for l in all_leads if l.get("status") in ["consultation_requested", "consultation_scheduled", "consultation_completed"]])
    converted_leads = len([l for l in all_leads if l.get("status") == "converted_to_client"])
    
    # Calculate conversion rate (leads that became clients)
    conversion_rate = round((converted_leads / total_leads * 100), 1) if total_leads > 0 else 0
    
    return {
        "prenatal_clients": prenatal_clients,
        "active_clients": active_clients,
        "total_clients": total_clients,
        "contracts_pending_signature": contracts_pending_signature,
        "pending_invoices": pending_invoices,
        "visits_this_month": visits_this_month,
        "births_this_month": births_this_month,
        "upcoming_appointments": upcoming_appointments,
        "unread_messages": unread_messages,
        "lead_insights": {
            "total_leads": total_leads,
            "active_leads": active_leads,
            "converted_leads": converted_leads,
            "conversion_rate": conversion_rate
        }
    }


# ============== CLIENT ROUTES ==============

@router.get("/clients")
async def get_midwife_clients(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get midwife's clients"""
    clients = await db.clients.find(
        {"provider_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich clients with latest picture from linked mom
    for client in clients:
        if client.get("linked_mom_id"):
            mom = await db.users.find_one(
                {"user_id": client["linked_mom_id"]},
                {"_id": 0, "picture": 1}
            )
            if mom and mom.get("picture"):
                client["picture"] = mom["picture"]
    
    return clients


@router.post("/clients")
async def create_midwife_client(client_data: ClientCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new client"""
    now = get_now()
    
    # Auto-link to mom user if email matches
    linked_mom_id = None
    if client_data.email:
        existing_mom = await db.users.find_one(
            {"email": client_data.email, "role": "MOM"},
            {"_id": 0, "user_id": 1}
        )
        if existing_mom:
            linked_mom_id = existing_mom["user_id"]
    
    client = {
        "client_id": f"client_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "MIDWIFE",
        "name": client_data.name,
        "email": client_data.email,
        "phone": client_data.phone,
        "edd": client_data.edd,
        "planned_birth_setting": client_data.planned_birth_setting,
        "lmp": client_data.lmp,
        "gravida": client_data.gravida,
        "para": client_data.para,
        "status": "Prenatal",
        "linked_mom_id": linked_mom_id,
        "risk_flags": [],
        "internal_notes": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client)
    client.pop('_id', None)
    return client


@router.get("/clients/{client_id}")
async def get_midwife_client(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific client with related data"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Enrich client with latest picture from linked mom
    if client.get("linked_mom_id"):
        mom = await db.users.find_one(
            {"user_id": client["linked_mom_id"]},
            {"_id": 0, "picture": 1}
        )
        if mom and mom.get("picture"):
            client["picture"] = mom["picture"]
    
    # Get related data
    contracts = await db.contracts.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    invoices = await db.invoices.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    visits = await db.visits.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    notes = await db.notes.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    return {
        **client,
        "contracts": contracts,
        "invoices": invoices,
        "visits": visits,
        "notes": notes
    }


@router.put("/clients/{client_id}")
async def update_midwife_client(client_id: str, client_data: ClientUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a client"""
    update_data = {k: v for k, v in client_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()
    
    result = await db.clients.update_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client updated"}


# ============== NOTES ROUTES ==============

@router.get("/notes")
async def get_midwife_notes(user: User = Depends(check_role(["MIDWIFE"])), client_id: Optional[str] = None):
    """Get midwife's notes, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes


@router.post("/notes")
async def create_midwife_note(note_data: NoteCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new note"""
    now = get_now()
    
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": note_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    note = {
        "note_id": f"note_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": note_data.client_id,
        "client_name": client.get("name", ""),
        "content": note_data.content,
        "note_type": note_data.note_type,
        "date": now.strftime("%Y-%m-%d"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.notes.insert_one(note)
    note.pop('_id', None)
    return note


@router.put("/notes/{note_id}")
async def update_midwife_note(note_id: str, note_data: NoteUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a note"""
    update_data = {k: v for k, v in note_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()
    
    result = await db.notes.update_one(
        {"note_id": note_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note updated"}


@router.delete("/notes/{note_id}")
async def delete_midwife_note(note_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a note"""
    result = await db.notes.delete_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}
