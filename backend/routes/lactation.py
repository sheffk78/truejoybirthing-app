"""
Lactation Routes Module

Handles Lactation Consultant-specific functionality including onboarding,
profile management, dashboard, and contract defaults.
Mirrors doula.py structure — LACTATION is a non-clinical provider role.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_now, get_current_user, check_role, User

router = APIRouter(prefix="/lactation", tags=["Lactation"])


# ============== REQUEST MODELS ==============

class LactationProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    certifications: Optional[List[str]] = None  # IBCLC, CLC, CLE, CBE, ALE
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
    practice_name: Optional[str] = None
    years_in_practice: Optional[int] = None
    picture: Optional[str] = None  # Profile photo URL or base64


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
async def lactation_onboarding(profile_data: LactationProfileUpdate, user: User = Depends(check_role(["LACTATION"]))):
    """Complete lactation consultant onboarding"""
    now = get_now()

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
        "practice_name": profile_data.practice_name,
        "years_in_practice": profile_data.years_in_practice,
        "in_marketplace": profile_data.in_marketplace if profile_data.in_marketplace is not None else True,
        "accepting_new_clients": profile_data.accepting_new_clients if profile_data.accepting_new_clients is not None else True,
        "updated_at": now
    }

    profile = {k: v for k, v in profile.items() if v is not None}
    profile["user_id"] = user.user_id
    profile["updated_at"] = now

    await db.lactation_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": profile},
        upsert=True
    )

    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"profile_completed": True, "updated_at": now}}
    )

    return {"message": "Onboarding completed", "profile": profile}


@router.get("/profile")
async def get_lactation_profile(user: User = Depends(check_role(["LACTATION"]))):
    """Get lactation consultant profile"""
    profile = await db.lactation_profiles.find_one({"user_id": user.user_id}, {"_id": 0})
    if not profile:
        return {"user_id": user.user_id}
    return profile


@router.put("/profile")
async def update_lactation_profile(profile_data: LactationProfileUpdate, user: User = Depends(check_role(["LACTATION"]))):
    """Update lactation consultant profile"""
    update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()

    if profile_data.picture is not None:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": {"picture": profile_data.picture, "updated_at": get_now()}}
        )

    await db.lactation_profiles.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )

    return {"message": "Profile updated"}


@router.get("/dashboard")
async def get_lactation_dashboard(user: User = Depends(check_role(["LACTATION"]))):
    """Get lactation consultant dashboard data"""
    all_clients = await db.clients.find(
        {"provider_id": user.user_id},
        {"_id": 0, "status": 1}
    ).to_list(500)

    total_clients = len(all_clients)

    active_statuses = ["Active", "Lead", "Contract Sent", "Contract Signed", "Postpartum"]
    active_clients = len([c for c in all_clients if c.get("status") in active_statuses])

    contracts_pending_signature = await db.contracts.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["Sent", "sent", "pending"]}
    })

    pending_invoices = await db.invoices.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["Sent", "sent", "pending"]}
    })

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

    unread_messages = await db.messages.count_documents({
        "receiver_id": user.user_id,
        "read": False
    })

    all_leads = await db.leads.find(
        {"provider_id": user.user_id},
        {"_id": 0, "status": 1}
    ).to_list(500)

    total_leads = len(all_leads)
    active_leads = len([l for l in all_leads if l.get("status") in ["consultation_requested", "consultation_scheduled", "consultation_completed"]])
    converted_leads = len([l for l in all_leads if l.get("status") == "converted_to_client"])

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
async def get_contract_defaults(user: User = Depends(check_role(["LACTATION"]))):
    """Get lactation consultant's default contract settings"""
    defaults = await db.contract_defaults.find_one({"user_id": user.user_id}, {"_id": 0})

    if not defaults:
        return {
            "user_id": user.user_id,
            "deposit_percentage": 25.0,
            "payment_terms": "Balance due at time of service",
            "services_included": [
                "Initial lactation consultation (60-90 min)",
                "Follow-up visits (30-45 min)",
                "Telehealth support between visits",
                "Personalized feeding plan",
                "Coordination with pediatrician"
            ],
            "cancellation_policy": "24-hour notice required for rescheduling. Deposit non-refundable for no-shows."
        }

    return defaults


@router.put("/contract-defaults")
async def update_contract_defaults(defaults_data: ContractDefaultsUpdate, user: User = Depends(check_role(["LACTATION"]))):
    """Update lactation consultant's default contract settings"""
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
async def get_lactation_clients(user: User = Depends(check_role(["LACTATION"]))):
    """Get lactation consultant's clients"""
    clients = await db.clients.find(
        {"provider_id": user.user_id, "provider_type": "LACTATION"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)

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
async def create_lactation_client(client_data: ClientCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Create a new client"""
    now = get_now()

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
        "provider_type": "LACTATION",
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
async def get_lactation_client(client_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Get a specific client with related data"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if client.get("linked_mom_id"):
        mom = await db.users.find_one(
            {"user_id": client["linked_mom_id"]},
            {"_id": 0, "picture": 1}
        )
        if mom and mom.get("picture"):
            client["picture"] = mom["picture"]

    contracts = await db.contracts.find({"client_id": client_id, "provider_id": user.user_id}, {"_id": 0}).to_list(100)
    invoices = await db.invoices.find({"client_id": client_id, "provider_id": user.user_id}, {"_id": 0}).to_list(100)
    appointments = await db.appointments.find({"client_id": client_id, "provider_id": user.user_id}, {"_id": 0}).to_list(100)
    notes = await db.notes.find({"client_id": client_id, "provider_id": user.user_id}, {"_id": 0}).to_list(100)

    return {
        **client,
        "contracts": contracts,
        "invoices": invoices,
        "appointments": appointments,
        "notes": notes
    }


@router.put("/clients/{client_id}")
async def update_lactation_client(client_id: str, client_data: ClientUpdate, user: User = Depends(check_role(["LACTATION"]))):
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
async def get_lactation_notes(user: User = Depends(check_role(["LACTATION"])), client_id: Optional[str] = None):
    """Get lactation consultant's notes, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id

    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes


@router.post("/notes")
async def create_lactation_note(note_data: NoteCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Create a new note"""
    now = get_now()

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
async def update_lactation_note(note_id: str, note_data: NoteUpdate, user: User = Depends(check_role(["LACTATION"]))):
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
async def delete_lactation_note(note_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Delete a note"""
    result = await db.notes.delete_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")

    return {"message": "Note deleted"}


# ============== LATCH SCORE ==============

class LatchScoreCreate(BaseModel):
    """LATCH breastfeeding assessment score (0-10)"""
    client_id: str
    assessment_date: Optional[str] = None  # YYYY-MM-DD
    # L: Latch
    latch_score: int  # 0-2 (0=no latch, 1=repeated attempts, 2=grasps and sustains)
    latch_notes: Optional[str] = None
    # A: Audible Swallow
    swallow_score: int  # 0-2 (0=none, 1=few, 2=spontaneous/intermittent)
    swallow_notes: Optional[str] = None
    # T: Type of Nipple
    nipple_type: int  # 0-2 (0=inverted, 1=flat, 2=everted)
    nipple_notes: Optional[str] = None
    # C: Comfort
    comfort_score: int  # 0-2 (0=engorged/severe discomfort, 1=filling/moderate, 2=soft/no discomfort)
    comfort_notes: Optional[str] = None
    # H: Hold
    hold_score: int  # 0-2 (0=full assist, 1=minimal assist, 2=self-positioning)
    hold_notes: Optional[str] = None
    general_notes: Optional[str] = None


@router.post("/latch-scores")
async def create_latch_score(score_data: LatchScoreCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Record a LATCH score assessment"""
    now = get_now()

    client = await db.clients.find_one(
        {"client_id": score_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    total = (score_data.latch_score + score_data.swallow_score +
             score_data.nipple_type + score_data.comfort_score +
             score_data.hold_score)

    record = {
        "score_id": f"latch_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": score_data.client_id,
        "client_name": client.get("name", ""),
        "assessment_date": score_data.assessment_date or now.strftime("%Y-%m-%d"),
        "latch_score": score_data.latch_score,
        "latch_notes": score_data.latch_notes,
        "swallow_score": score_data.swallow_score,
        "swallow_notes": score_data.swallow_notes,
        "nipple_type": score_data.nipple_type,
        "nipple_notes": score_data.nipple_notes,
        "comfort_score": score_data.comfort_score,
        "comfort_notes": score_data.comfort_notes,
        "hold_score": score_data.hold_score,
        "hold_notes": score_data.hold_notes,
        "total_score": total,
        "general_notes": score_data.general_notes,
        "created_at": now,
    }

    await db.latch_scores.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/latch-scores")
async def get_latch_scores(user: User = Depends(check_role(["LACTATION"])), client_id: Optional[str] = None):
    """Get LATCH scores, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    scores = await db.latch_scores.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return scores


@router.delete("/latch-scores/{score_id}")
async def delete_latch_score(score_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Delete a LATCH score record"""
    result = await db.latch_scores.delete_one(
        {"score_id": score_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="LATCH score not found")
    return {"message": "LATCH score deleted"}


@router.put("/latch-scores/{score_id}")
async def update_latch_score(score_id: str, score_data: LatchScoreCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Update a LATCH score record"""
    now = get_now()
    total = (score_data.latch_score + score_data.swallow_score +
             score_data.nipple_type + score_data.comfort_score +
             score_data.hold_score)

    update_data = {k: v for k, v in score_data.dict().items() if v is not None}
    update_data["total_score"] = total
    update_data["updated_at"] = now

    result = await db.latch_scores.update_one(
        {"score_id": score_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="LATCH score not found")
    return {"message": "LATCH score updated"}


# ============== INFANT WEIGHT TRACKER ==============

class InfantWeightCreate(BaseModel):
    """Infant weight tracking entry"""
    client_id: str
    weight_date: Optional[str] = None  # YYYY-MM-DD
    weight: float  # in grams or ounces
    weight_unit: str = "g"  # "g" or "oz"
    baby_age_days: Optional[int] = None
    is_birth_weight: Optional[bool] = False  # Mark as the birth weight entry
    notes: Optional[str] = None


@router.post("/infant-weights")
async def create_infant_weight(weight_data: InfantWeightCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Record an infant weight measurement"""
    now = get_now()

    client = await db.clients.find_one(
        {"client_id": weight_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    weight_g = weight_data.weight
    if weight_data.weight_unit == "oz":
        weight_g = weight_data.weight * 28.3495

    # Get birth weight if available to calculate % change
    birth_entry = await db.infant_weights.find_one(
        {"client_id": weight_data.client_id, "provider_id": user.user_id, "is_birth_weight": True},
        {"_id": 0}
    )

    percent_change = None
    if birth_entry:
        birth_g = birth_entry["weight"]
        birth_data_unit = birth_entry.get("weight_unit", "g")
        if birth_data_unit == "oz":
            birth_g = birth_entry["weight"] * 28.3495
        if birth_g > 0:
            percent_change = round(((weight_g - birth_g) / birth_g) * 100, 1)

    record = {
        "weight_id": f"weight_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": weight_data.client_id,
        "client_name": client.get("name", ""),
        "weight_date": weight_data.weight_date or now.strftime("%Y-%m-%d"),
        "weight": weight_data.weight,
        "weight_unit": weight_data.weight_unit,
        "weight_grams": round(weight_g, 1),
        "baby_age_days": weight_data.baby_age_days,
        "is_birth_weight": weight_data.is_birth_weight or False,
        "percent_change_from_birth": percent_change,
        "notes": weight_data.notes,
        "created_at": now,
    }

    await db.infant_weights.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/infant-weights")
async def get_infant_weights(user: User = Depends(check_role(["LACTATION"])), client_id: Optional[str] = None):
    """Get infant weight entries, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    weights = await db.infant_weights.find(query, {"_id": 0}).sort("weight_date", -1).to_list(200)
    return weights


@router.delete("/infant-weights/{weight_id}")
async def delete_infant_weight(weight_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Delete an infant weight entry"""
    result = await db.infant_weights.delete_one(
        {"weight_id": weight_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    return {"message": "Weight entry deleted"}


@router.put("/infant-weights/{weight_id}")
async def update_infant_weight(weight_id: str, weight_data: InfantWeightCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Update an infant weight entry"""
    now = get_now()

    weight_g = weight_data.weight
    if weight_data.weight_unit == "oz":
        weight_g = weight_data.weight * 28.3495

    birth_entry = await db.infant_weights.find_one(
        {"client_id": weight_data.client_id, "provider_id": user.user_id, "is_birth_weight": True},
        {"_id": 0}
    )

    percent_change = None
    if birth_entry and not weight_data.is_birth_weight:
        birth_g = birth_entry["weight"]
        birth_data_unit = birth_entry.get("weight_unit", "g")
        if birth_data_unit == "oz":
            birth_g = birth_entry["weight"] * 28.3495
        if birth_g > 0:
            percent_change = round(((weight_g - birth_g) / birth_g) * 100, 1)

    update_data = {k: v for k, v in weight_data.dict().items() if v is not None}
    update_data["weight_grams"] = round(weight_g, 1)
    update_data["percent_change_from_birth"] = percent_change
    update_data["updated_at"] = now

    result = await db.infant_weights.update_one(
        {"weight_id": weight_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Weight entry not found")
    return {"message": "Weight entry updated"}


# ============== FEEDING LOG ==============

class FeedingLogCreate(BaseModel):
    """Feeding session log entry"""
    client_id: str
    feeding_date: Optional[str] = None  # YYYY-MM-DD
    feeding_time: Optional[str] = None  # HH:MM
    feeding_type: str  # "breast", "bottle", "expressed", "mixed"
    side: Optional[str] = None  # "left", "right", "both" (for breast)
    duration_minutes: Optional[int] = None
    amount_ml: Optional[float] = None  # for bottle/expressed
    latch_quality: Optional[str] = None  # "good", "fair", "poor"
    milk_type: Optional[str] = None  # "breast_milk", "formula", "donor", "mixed" (for bottle)
    notes: Optional[str] = None


@router.post("/feeding-logs")
async def create_feeding_log(log_data: FeedingLogCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Record a feeding session"""
    now = get_now()

    client = await db.clients.find_one(
        {"client_id": log_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    record = {
        "log_id": f"feed_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": log_data.client_id,
        "client_name": client.get("name", ""),
        "feeding_date": log_data.feeding_date or now.strftime("%Y-%m-%d"),
        "feeding_time": log_data.feeding_time,
        "feeding_type": log_data.feeding_type,
        "side": log_data.side,
        "duration_minutes": log_data.duration_minutes,
        "amount_ml": log_data.amount_ml,
        "latch_quality": log_data.latch_quality,
        "milk_type": log_data.milk_type,
        "notes": log_data.notes,
        "created_at": now,
    }

    await db.feeding_logs.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/feeding-logs")
async def get_feeding_logs(user: User = Depends(check_role(["LACTATION"])), client_id: Optional[str] = None):
    """Get feeding logs, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    logs = await db.feeding_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return logs


@router.delete("/feeding-logs/{log_id}")
async def delete_feeding_log(log_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Delete a feeding log entry"""
    result = await db.feeding_logs.delete_one(
        {"log_id": log_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feeding log not found")
    return {"message": "Feeding log deleted"}


@router.put("/feeding-logs/{log_id}")
async def update_feeding_log(log_id: str, log_data: FeedingLogCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Update a feeding log entry"""
    update_data = {k: v for k, v in log_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()

    result = await db.feeding_logs.update_one(
        {"log_id": log_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feeding log not found")
    return {"message": "Feeding log updated"}


# ============== ORAL EXAM ==============

class OralExamCreate(BaseModel):
    """Oral examination record for lactation assessment"""
    client_id: str
    exam_date: Optional[str] = None  # YYYY-MM-DD
    # Tongue
    tongue_appearance: Optional[str] = None  # "normal", "heart_shaped", "short_frenum", "thick_frenum"
    tongue_tie: Optional[str] = None  # "none", "anterior", "posterior", "submucosal"
    tongue_tie_severity: Optional[str] = None  # "mild", "moderate", "severe"
    tongue_lift: Optional[str] = None  # "full", "partial", "limited"
    lateralization: Optional[str] = None  # "full", "partial", "none"
    # Lips
    lip_tie: Optional[str] = None  # "none", "mild", "moderate", "severe"
    lip_seal: Optional[str] = None  # "good", "fair", "poor"
    # Palate
    palate: Optional[str] = None  # "normal", "high_arched", "cleft", "other"
    palate_notes: Optional[str] = None
    # Gums
    gums: Optional[str] = None  # "normal", "swollen", "other"
    # Suck assessment
    sucking_reflex: Optional[str] = None  # "strong", "moderate", "weak", "absent"
    suck_pattern: Optional[str] = None  # "rhythmic", "disorganized", "weak", "jaw_clench"
    # Recommendations
    recommendation: Optional[str] = None  # "continue_breastfeeding", "refer_for_frenotomy", "refer_to_ent", "follow_up", "other"
    referral_notes: Optional[str] = None
    general_notes: Optional[str] = None


@router.post("/oral-exams")
async def create_oral_exam(exam_data: OralExamCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Record an oral examination"""
    now = get_now()

    client = await db.clients.find_one(
        {"client_id": exam_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    record = {
        "exam_id": f"oral_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": exam_data.client_id,
        "client_name": client.get("name", ""),
        "exam_date": exam_data.exam_date or now.strftime("%Y-%m-%d"),
        "tongue_appearance": exam_data.tongue_appearance,
        "tongue_tie": exam_data.tongue_tie,
        "tongue_tie_severity": exam_data.tongue_tie_severity,
        "tongue_lift": exam_data.tongue_lift,
        "lateralization": exam_data.lateralization,
        "lip_tie": exam_data.lip_tie,
        "lip_seal": exam_data.lip_seal,
        "palate": exam_data.palate,
        "palate_notes": exam_data.palate_notes,
        "gums": exam_data.gums,
        "sucking_reflex": exam_data.sucking_reflex,
        "suck_pattern": exam_data.suck_pattern,
        "recommendation": exam_data.recommendation,
        "referral_notes": exam_data.referral_notes,
        "general_notes": exam_data.general_notes,
        "created_at": now,
    }

    await db.oral_exams.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/oral-exams")
async def get_oral_exams(user: User = Depends(check_role(["LACTATION"])), client_id: Optional[str] = None):
    """Get oral exam records, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    exams = await db.oral_exams.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return exams


@router.delete("/oral-exams/{exam_id}")
async def delete_oral_exam(exam_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Delete an oral exam record"""
    result = await db.oral_exams.delete_one(
        {"exam_id": exam_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oral exam not found")
    return {"message": "Oral exam deleted"}


@router.put("/oral-exams/{exam_id}")
async def update_oral_exam(exam_id: str, exam_data: OralExamCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Update an oral exam record"""
    update_data = {k: v for k, v in exam_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()

    result = await db.oral_exams.update_one(
        {"exam_id": exam_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Oral exam not found")
    return {"message": "Oral exam updated"}


# ============== SOAP NOTES ==============

class SoapNoteCreate(BaseModel):
    """Lactation SOAP note"""
    client_id: str
    note_date: Optional[str] = None  # YYYY-MM-DD
    # Subjective
    subjective: str  # Parent's concerns, reported symptoms, feeding history
    # Objective
    objective: str  # Observations, exam findings, LATCH score reference, weight data
    # Assessment
    assessment: str  # Clinical impression, diagnosis
    # Plan
    plan: str  # Recommendations, follow-up, referrals
    follow_up_date: Optional[str] = None  # YYYY-MM-DD
    follow_up_notes: Optional[str] = None


@router.post("/soap-notes")
async def create_soap_note(note_data: SoapNoteCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Record a lactation SOAP note"""
    now = get_now()

    client = await db.clients.find_one(
        {"client_id": note_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    record = {
        "soap_id": f"soap_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": note_data.client_id,
        "client_name": client.get("name", ""),
        "note_date": note_data.note_date or now.strftime("%Y-%m-%d"),
        "subjective": note_data.subjective,
        "objective": note_data.objective,
        "assessment": note_data.assessment,
        "plan": note_data.plan,
        "follow_up_date": note_data.follow_up_date,
        "follow_up_notes": note_data.follow_up_notes,
        "created_at": now,
    }

    await db.lactation_soap_notes.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/soap-notes")
async def get_soap_notes(user: User = Depends(check_role(["LACTATION"])), client_id: Optional[str] = None):
    """Get SOAP notes, optionally filtered by client"""
    query = {"provider_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    notes = await db.lactation_soap_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return notes


@router.put("/soap-notes/{soap_id}")
async def update_soap_note(soap_id: str, note_data: SoapNoteCreate, user: User = Depends(check_role(["LACTATION"]))):
    """Update a SOAP note"""
    update_data = {k: v for k, v in note_data.dict().items() if v is not None}
    update_data["updated_at"] = get_now()

    result = await db.lactation_soap_notes.update_one(
        {"soap_id": soap_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="SOAP note not found")
    return {"message": "SOAP note updated"}


@router.delete("/soap-notes/{soap_id}")
async def delete_soap_note(soap_id: str, user: User = Depends(check_role(["LACTATION"]))):
    """Delete a SOAP note"""
    result = await db.lactation_soap_notes.delete_one(
        {"soap_id": soap_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SOAP note not found")
    return {"message": "SOAP note deleted"}