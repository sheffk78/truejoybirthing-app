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
    # Get counts
    active_clients = await db.clients.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["Active", "Prenatal"]}
    })
    
    total_clients = await db.clients.count_documents({"provider_id": user.user_id})
    
    pending_contracts = await db.contracts.count_documents({
        "provider_id": user.user_id,
        "status": "Sent"
    })
    
    unpaid_invoices = await db.invoices.count_documents({
        "provider_id": user.user_id,
        "status": "Sent"
    })
    
    # Get upcoming appointments
    now = get_now()
    upcoming_appointments = await db.appointments.find(
        {
            "provider_id": user.user_id,
            "status": {"$in": ["confirmed", "pending"]},
            "start_datetime": {"$gte": now.isoformat()}
        },
        {"_id": 0}
    ).sort("start_datetime", 1).limit(5).to_list(5)
    
    # Get recent messages count
    unread_messages = await db.messages.count_documents({
        "receiver_id": user.user_id,
        "read": False
    })
    
    return {
        "active_clients": active_clients,
        "total_clients": total_clients,
        "pending_contracts": pending_contracts,
        "unpaid_invoices": unpaid_invoices,
        "upcoming_appointments": upcoming_appointments,
        "unread_messages": unread_messages
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
