"""
Doula Routes Module

Handles Doula-specific functionality including onboarding, profile management,
dashboard, and contract defaults.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/doula", tags=["Doula"])


# ============== REQUEST MODELS ==============

class DoulaProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    certifications: Optional[List[str]] = None
    services_offered: Optional[List[str]] = None
    birth_philosophy: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    zip_code: Optional[str] = None
    service_radius_miles: Optional[int] = None
    pricing_base: Optional[float] = None
    pricing_notes: Optional[str] = None
    video_intro_url: Optional[str] = None
    more_about_me: Optional[str] = None
    in_marketplace: Optional[bool] = None
    accepting_new_clients: Optional[bool] = None


class ContractDefaultsUpdate(BaseModel):
    deposit_percentage: Optional[float] = None
    payment_terms: Optional[str] = None
    services_included: Optional[List[str]] = None
    cancellation_policy: Optional[str] = None


class ClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    edd: Optional[str] = None
    planned_birth_setting: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    edd: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    status: Optional[str] = None
    internal_notes: Optional[str] = None


class NoteCreate(BaseModel):
    client_id: str
    content: str
    note_type: Optional[str] = "general"


class NoteUpdate(BaseModel):
    content: Optional[str] = None
    note_type: Optional[str] = None


# ============== ROUTES ==============

@router.post("/onboarding")
async def doula_onboarding(profile_data: DoulaProfileUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Complete doula onboarding"""
    now = get_now()
    
    # Create or update doula profile
    profile = {
        "user_id": user.user_id,
        "full_name": profile_data.full_name or user.full_name,
        "phone": profile_data.phone,
        "bio": profile_data.bio,
        "experience_years": profile_data.experience_years,
        "certifications": profile_data.certifications or [],
        "services_offered": profile_data.services_offered or [],
        "birth_philosophy": profile_data.birth_philosophy,
        "location_city": profile_data.location_city,
        "location_state": profile_data.location_state,
        "zip_code": profile_data.zip_code,
        "service_radius_miles": profile_data.service_radius_miles or 25,
        "pricing_base": profile_data.pricing_base,
        "pricing_notes": profile_data.pricing_notes,
        "in_marketplace": profile_data.in_marketplace if profile_data.in_marketplace is not None else True,
        "accepting_new_clients": profile_data.accepting_new_clients if profile_data.accepting_new_clients is not None else True,
        "updated_at": now
    }
    
    await db.doula_profiles.update_one(
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
async def get_doula_profile(user: User = Depends(check_role(["DOULA"]))):
    """Get doula profile"""
    profile = await db.doula_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile


@router.put("/profile")
async def update_doula_profile(profile_data: DoulaProfileUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Update doula profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()
    
    await db.doula_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Profile updated"}


@router.get("/dashboard")
async def get_doula_dashboard(user: User = Depends(check_role(["DOULA"]))):
    """Get doula dashboard data"""
    # Get all clients for the provider
    all_clients = await db.clients.find(
        {"provider_id": user.user_id},
        {"_id": 0, "status": 1}
    ).to_list(500)
    
    total_clients = len(all_clients)
    
    # Active clients: any client that is not completed/inactive
    # Include: Active, Prenatal, Contract Sent, Contract Signed, In Labor, Postpartum
    active_statuses = ["Active", "Prenatal", "Contract Sent", "Contract Signed", "In Labor", "Postpartum", "active", "prenatal"]
    active_clients = len([c for c in all_clients if c.get("status") in active_statuses])
    
    # Pending contracts - match frontend key name
    contracts_pending_signature = await db.contracts.count_documents({
        "$or": [
            {"provider_id": user.user_id},
            {"doula_id": user.user_id}
        ],
        "status": {"$in": ["Sent", "sent", "pending"]}
    })
    
    # Pending invoices - match frontend key name
    pending_invoices = await db.invoices.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["Sent", "sent", "pending"]}
    })
    
    # Get upcoming appointments (confirmed only, exclude pending)
    now = get_now()
    today = now.strftime("%Y-%m-%d")
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
        "active_clients": active_clients,
        "total_clients": total_clients,
        "contracts_pending_signature": contracts_pending_signature,
        "pending_invoices": pending_invoices,
        "upcoming_appointments": upcoming_appointments,
        "unread_messages": unread_messages,
        "lead_insights": {
            "total_leads": total_leads,
            "active_leads": active_leads,
            "converted_leads": converted_leads,
            "conversion_rate": conversion_rate
        }
    }


@router.get("/contract-defaults")
async def get_contract_defaults(user: User = Depends(check_role(["DOULA"]))):
    """Get doula's default contract settings"""
    defaults = await db.contract_defaults.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not defaults:
        # Return default values
        return {
            "user_id": user.user_id,
            "deposit_percentage": 25.0,
            "payment_terms": "Balance due before birth",
            "services_included": [
                "Up to 2 prenatal visits",
                "On-call support from 38 weeks",
                "Continuous labor support",
                "1 postpartum visit"
            ],
            "cancellation_policy": "Deposit non-refundable after signing. Full refund if canceled by doula."
        }
    
    return defaults


@router.put("/contract-defaults")
async def update_contract_defaults(defaults_data: ContractDefaultsUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Update doula's default contract settings"""
    update_data = {k: v for k, v in defaults_data.dict().items() if v is not None}
    update_data["user_id"] = user.user_id
    update_data["updated_at"] = get_now()
    
    await db.contract_defaults.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Contract defaults updated"}


# ============== CLIENT ROUTES ==============

@router.get("/clients")
async def get_doula_clients(user: User = Depends(check_role(["DOULA"]))):
    """Get doula's clients"""
    clients = await db.clients.find(
        {"provider_id": user.user_id, "provider_type": "DOULA"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return clients


@router.post("/clients")
async def create_doula_client(client_data: ClientCreate, user: User = Depends(check_role(["DOULA"]))):
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
        "provider_type": "DOULA",
        "name": client_data.name,
        "email": client_data.email,
        "phone": client_data.phone,
        "edd": client_data.edd,
        "planned_birth_setting": client_data.planned_birth_setting,
        "status": "Lead",
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
async def get_doula_client(client_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Get a specific client with related data"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get related data
    contracts = await db.contracts.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    invoices = await db.invoices.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    appointments = await db.appointments.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    notes = await db.notes.find({"client_id": client_id}, {"_id": 0}).to_list(100)
    
    return {
        **client,
        "contracts": contracts,
        "invoices": invoices,
        "appointments": appointments,
        "notes": notes
    }


@router.put("/clients/{client_id}")
async def update_doula_client(client_id: str, client_data: ClientUpdate, user: User = Depends(check_role(["DOULA"]))):
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
async def get_doula_notes(user: User = Depends(check_role(["DOULA"])), client_id: Optional[str] = None):
    """Get doula's notes, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes


@router.post("/notes")
async def create_doula_note(note_data: NoteCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new note"""
    now = get_now()
    
    # Verify client belongs to this doula
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
async def update_doula_note(note_id: str, note_data: NoteUpdate, user: User = Depends(check_role(["DOULA"]))):
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
async def delete_doula_note(note_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Delete a note"""
    result = await db.notes.delete_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}
