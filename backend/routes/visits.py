"""
Visits Routes Module

Handles visit management for Midwife providers, including:
- Basic visit CRUD
- Prenatal visit assessments with vitals and well-being scores
- Birth summaries
- Provider unified visits interface
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_now, check_role, User

# Import shared client utilities
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.client_utils import is_client_active

router = APIRouter(tags=["Visits"])


# ============== PYDANTIC MODELS ==============

class VisitCreate(BaseModel):
    client_id: str
    visit_date: str
    visit_type: str  # Prenatal, Postpartum
    gestational_age: Optional[str] = None
    blood_pressure: Optional[str] = None
    weight: Optional[str] = None
    fetal_heart_rate: Optional[str] = None
    summary_for_mom: Optional[str] = None
    private_note: Optional[str] = None


class PrenatalVisitAssessmentCreate(BaseModel):
    visit_date: str
    urinalysis: Optional[str] = None
    urinalysis_note: Optional[str] = None
    blood_pressure: Optional[str] = None
    fetal_heart_rate: Optional[int] = None
    fundal_height: Optional[float] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = "lbs"
    eating_score: Optional[int] = None
    eating_note: Optional[str] = None
    water_score: Optional[int] = None
    water_note: Optional[str] = None
    emotional_score: Optional[int] = None
    emotional_note: Optional[str] = None
    physical_score: Optional[int] = None
    physical_note: Optional[str] = None
    mental_score: Optional[int] = None
    mental_note: Optional[str] = None
    spiritual_score: Optional[int] = None
    spiritual_note: Optional[str] = None
    general_notes: Optional[str] = None


class PrenatalVisitAssessmentUpdate(BaseModel):
    visit_date: Optional[str] = None
    urinalysis: Optional[str] = None
    urinalysis_note: Optional[str] = None
    blood_pressure: Optional[str] = None
    fetal_heart_rate: Optional[int] = None
    fundal_height: Optional[float] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    eating_score: Optional[int] = None
    eating_note: Optional[str] = None
    water_score: Optional[int] = None
    water_note: Optional[str] = None
    emotional_score: Optional[int] = None
    emotional_note: Optional[str] = None
    physical_score: Optional[int] = None
    physical_note: Optional[str] = None
    mental_score: Optional[int] = None
    mental_note: Optional[str] = None
    spiritual_score: Optional[int] = None
    spiritual_note: Optional[str] = None
    general_notes: Optional[str] = None


class BirthSummaryCreate(BaseModel):
    client_id: str
    birth_datetime: str
    birth_place: str
    mode_of_birth: str
    newborn_details: Optional[str] = None
    complications: Optional[str] = None
    summary_note: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def generate_visit_summary(data: Dict[str, Any]) -> str:
    """Generate summary line from vitals"""
    summary_parts = []
    if data.get("blood_pressure"):
        summary_parts.append(f"BP {data['blood_pressure']}")
    if data.get("fetal_heart_rate"):
        summary_parts.append(f"FHR {data['fetal_heart_rate']}")
    if data.get("fundal_height"):
        summary_parts.append(f"FH {data['fundal_height']} cm")
    if data.get("weight"):
        unit = data.get("weight_unit", "lbs")
        summary_parts.append(f"Wt {data['weight']} {unit}")
    return ", ".join(summary_parts) if summary_parts else "Visit recorded"


def is_client_active(client: Dict[str, Any]) -> bool:
    """Check if a client is currently active based on due date"""
    due_date_str = client.get("due_date") or client.get("edd")
    birth_date_str = client.get("birth_date")
    
    if birth_date_str:
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
            days_since_birth = (datetime.now() - birth_date).days
            return days_since_birth <= 90
        except:
            pass
    
    if due_date_str:
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
            days_until_due = (due_date - datetime.now()).days
            return days_until_due >= -90
        except:
            pass
    
    return True


# ============== BASIC VISIT ROUTES (MIDWIFE) ==============

@router.get("/midwife/visits")
async def get_midwife_visits(user: User = Depends(check_role(["MIDWIFE"])), client_id: Optional[str] = None):
    """Get visits, optionally filtered by client"""
    query = {"midwife_id": user.user_id}
    if client_id:
        query["client_id"] = client_id
    
    visits = await db.visits.find(query, {"_id": 0}).sort("visit_date", -1).to_list(100)
    return visits


@router.post("/midwife/visits")
async def create_visit(visit_data: VisitCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new visit with split notes (summary_for_mom and private_note)"""
    now = get_now()
    
    visit = {
        "visit_id": f"visit_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": visit_data.client_id,
        "visit_date": visit_data.visit_date,
        "visit_type": visit_data.visit_type,
        "gestational_age": visit_data.gestational_age,
        "blood_pressure": visit_data.blood_pressure,
        "weight": visit_data.weight,
        "fetal_heart_rate": visit_data.fetal_heart_rate,
        "summary_for_mom": visit_data.summary_for_mom,
        "private_note": visit_data.private_note,
        "created_at": now,
        "updated_at": now
    }
    
    await db.visits.insert_one(visit)
    visit.pop('_id', None)
    return visit


@router.put("/midwife/visits/{visit_id}")
async def update_visit(visit_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a visit"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["visit_id", "midwife_id", "created_at"]}
    update_data["updated_at"] = get_now()
    
    result = await db.visits.update_one(
        {"visit_id": visit_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    return {"message": "Visit updated"}


# ============== PRENATAL VISIT ASSESSMENT ROUTES (MIDWIFE) ==============

@router.get("/midwife/clients/{client_id}/prenatal-visits")
async def get_prenatal_visits(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all prenatal visit assessments for a client"""
    client = await db.clients.find_one({"client_id": client_id, "provider_id": user.user_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    visits = await db.prenatal_visits.find(
        {"client_id": client_id, "midwife_id": user.user_id},
        {"_id": 0}
    ).sort("visit_date", -1).to_list(100)
    return visits


@router.post("/midwife/clients/{client_id}/prenatal-visits")
async def create_prenatal_visit(client_id: str, visit_data: PrenatalVisitAssessmentCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new prenatal visit assessment"""
    client = await db.clients.find_one({"client_id": client_id, "provider_id": user.user_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    summary = generate_visit_summary({
        "blood_pressure": visit_data.blood_pressure,
        "fetal_heart_rate": visit_data.fetal_heart_rate,
        "fundal_height": visit_data.fundal_height,
        "weight": visit_data.weight,
        "weight_unit": visit_data.weight_unit
    })
    
    visit = {
        "prenatal_visit_id": f"pv_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": client_id,
        "visit_date": visit_data.visit_date,
        "summary": summary,
        "urinalysis": visit_data.urinalysis,
        "urinalysis_note": visit_data.urinalysis_note,
        "blood_pressure": visit_data.blood_pressure,
        "fetal_heart_rate": visit_data.fetal_heart_rate,
        "fundal_height": visit_data.fundal_height,
        "weight": visit_data.weight,
        "weight_unit": visit_data.weight_unit or "lbs",
        "eating_score": visit_data.eating_score,
        "eating_note": visit_data.eating_note,
        "water_score": visit_data.water_score,
        "water_note": visit_data.water_note,
        "emotional_score": visit_data.emotional_score,
        "emotional_note": visit_data.emotional_note,
        "physical_score": visit_data.physical_score,
        "physical_note": visit_data.physical_note,
        "mental_score": visit_data.mental_score,
        "mental_note": visit_data.mental_note,
        "spiritual_score": visit_data.spiritual_score,
        "spiritual_note": visit_data.spiritual_note,
        "general_notes": visit_data.general_notes,
        "created_at": now,
        "updated_at": now
    }
    
    await db.prenatal_visits.insert_one(visit)
    visit.pop('_id', None)
    return visit


@router.get("/midwife/clients/{client_id}/prenatal-visits/{visit_id}")
async def get_prenatal_visit(client_id: str, visit_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a single prenatal visit assessment"""
    visit = await db.prenatal_visits.find_one(
        {"prenatal_visit_id": visit_id, "client_id": client_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Prenatal visit not found")
    return visit


@router.put("/midwife/clients/{client_id}/prenatal-visits/{visit_id}")
async def update_prenatal_visit(client_id: str, visit_id: str, visit_data: PrenatalVisitAssessmentUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a prenatal visit assessment"""
    update_data = {}
    for field, value in visit_data.dict(exclude_unset=True).items():
        update_data[field] = value
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    existing = await db.prenatal_visits.find_one(
        {"prenatal_visit_id": visit_id, "midwife_id": user.user_id},
        {"_id": 0}
    )
    if existing:
        merged = {**existing, **update_data}
        update_data["summary"] = generate_visit_summary(merged)
    
    update_data["updated_at"] = get_now()
    
    result = await db.prenatal_visits.update_one(
        {"prenatal_visit_id": visit_id, "client_id": client_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prenatal visit not found")
    
    return {"message": "Prenatal visit updated"}


@router.delete("/midwife/clients/{client_id}/prenatal-visits/{visit_id}")
async def delete_prenatal_visit(client_id: str, visit_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a prenatal visit assessment"""
    result = await db.prenatal_visits.delete_one(
        {"prenatal_visit_id": visit_id, "client_id": client_id, "midwife_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prenatal visit not found")
    
    return {"message": "Prenatal visit deleted"}


# ============== BIRTH SUMMARY ROUTES (MIDWIFE) ==============

@router.get("/midwife/birth-summaries")
async def get_birth_summaries(user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all birth summaries"""
    summaries = await db.birth_summaries.find(
        {"midwife_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return summaries


@router.post("/midwife/birth-summaries")
async def create_birth_summary(summary_data: BirthSummaryCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new birth summary"""
    now = get_now()
    
    existing = await db.birth_summaries.find_one({"client_id": summary_data.client_id})
    if existing:
        raise HTTPException(status_code=400, detail="Birth summary already exists for this client")
    
    summary = {
        "summary_id": f"summary_{uuid.uuid4().hex[:12]}",
        "midwife_id": user.user_id,
        "client_id": summary_data.client_id,
        "birth_datetime": summary_data.birth_datetime,
        "birth_place": summary_data.birth_place,
        "mode_of_birth": summary_data.mode_of_birth,
        "newborn_details": summary_data.newborn_details,
        "complications": summary_data.complications,
        "summary_note": summary_data.summary_note,
        "created_at": now,
        "updated_at": now
    }
    
    await db.birth_summaries.insert_one(summary)
    summary.pop('_id', None)
    
    await db.clients.update_one(
        {"client_id": summary_data.client_id},
        {"$set": {"status": "Postpartum", "updated_at": now}}
    )
    
    return summary


@router.put("/midwife/birth-summaries/{summary_id}")
async def update_birth_summary(summary_id: str, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a birth summary"""
    body = await request.json()
    update_data = {k: v for k, v in body.items() if k not in ["summary_id", "midwife_id", "created_at"]}
    update_data["updated_at"] = get_now()
    
    result = await db.birth_summaries.update_one(
        {"summary_id": summary_id, "midwife_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Birth summary not found")
    
    return {"message": "Birth summary updated"}


# ============== PROVIDER UNIFIED VISITS ROUTES ==============

@router.get("/provider/visits")
async def get_unified_visits(
    client_id: Optional[str] = None,
    visit_type: Optional[str] = None,
    include_inactive_clients: bool = False,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Get visits for the provider (MIDWIFE only). Visits are clinical records linked to appointments."""
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    if visit_type:
        query["visit_type"] = visit_type
    
    visits = await db.visits.find(query, {"_id": 0}).sort("visit_date", -1).to_list(500)
    
    prenatal_query = {"midwife_id": user.user_id}
    if client_id:
        prenatal_query["client_id"] = client_id
    prenatal_visits = await db.prenatal_visits.find(prenatal_query, {"_id": 0}).sort("visit_date", -1).to_list(500)
    
    all_visits = visits + prenatal_visits
    
    if not include_inactive_clients and not client_id:
        clients = await db.clients.find(
            {"provider_id": user.user_id},
            {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1}
        ).to_list(500)
        
        active_client_ids = {c["client_id"] for c in clients if is_client_active(c)}
        all_visits = [v for v in all_visits if v.get("client_id") in active_client_ids]
    
    for visit in all_visits:
        if visit.get("client_id"):
            client = await db.clients.find_one(
                {"client_id": visit["client_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            if client:
                visit["client_name"] = client.get("name", "")
    
    return all_visits


@router.post("/provider/visits")
async def create_unified_visit(data: dict, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a visit record (MIDWIFE only). Visits must be linked to an appointment."""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    appointment_id = data.get("appointment_id")
    
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    visit_date = data.get("visit_date", now.strftime("%Y-%m-%d"))
    
    if not appointment_id:
        appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
        visit_type = data.get("visit_type", "Prenatal")
        appt_type = "prenatal_visit" if visit_type == "Prenatal" else "postpartum_visit"
        
        appointment = {
            "appointment_id": appointment_id,
            "client_id": client_id,
            "provider_id": user.user_id,
            "provider_name": user.full_name,
            "provider_role": user.role,
            "client_name": client.get("name", ""),
            "start_datetime": f"{visit_date}T09:00:00",
            "appointment_date": visit_date,
            "appointment_time": "09:00",
            "appointment_type": appt_type,
            "status": "completed",
            "created_at": now,
            "updated_at": now
        }
        
        if client.get("linked_mom_id"):
            appointment["mom_user_id"] = client["linked_mom_id"]
        
        await db.appointments.insert_one(appointment)
    
    summary = generate_visit_summary(data)
    
    visit = {
        "visit_id": visit_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "midwife_id": user.user_id,
        "appointment_id": appointment_id,
        "client_name": client.get("name", ""),
        "visit_date": visit_date,
        "visit_type": data.get("visit_type", "Prenatal"),
        "summary": summary,
        "blood_pressure": data.get("blood_pressure"),
        "fetal_heart_rate": data.get("fetal_heart_rate"),
        "fundal_height": data.get("fundal_height"),
        "weight": data.get("weight"),
        "weight_unit": data.get("weight_unit", "lbs"),
        "urinalysis": data.get("urinalysis"),
        "urinalysis_note": data.get("urinalysis_note"),
        "eating_score": data.get("eating_score"),
        "eating_note": data.get("eating_note"),
        "water_score": data.get("water_score"),
        "water_note": data.get("water_note"),
        "emotional_score": data.get("emotional_score"),
        "emotional_note": data.get("emotional_note"),
        "physical_score": data.get("physical_score"),
        "physical_note": data.get("physical_note"),
        "mental_score": data.get("mental_score"),
        "mental_note": data.get("mental_note"),
        "spiritual_score": data.get("spiritual_score"),
        "spiritual_note": data.get("spiritual_note"),
        "general_notes": data.get("general_notes"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.visits.insert_one(visit)
    visit.pop("_id", None)
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "completed", "visit_id": visit_id}}
    )
    
    return visit


@router.put("/provider/visits/{visit_id}")
async def update_unified_visit(visit_id: str, data: dict, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update a visit record"""
    visit = await db.visits.find_one({"visit_id": visit_id, "provider_id": user.user_id})
    collection = db.visits
    
    if not visit:
        visit = await db.prenatal_visits.find_one({"prenatal_visit_id": visit_id, "midwife_id": user.user_id})
        collection = db.prenatal_visits
        visit_id_field = "prenatal_visit_id"
    else:
        visit_id_field = "visit_id"
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    now = get_now()
    
    merged = {**visit, **data}
    data["summary"] = generate_visit_summary(merged)
    data["updated_at"] = now
    
    for field in ["visit_id", "prenatal_visit_id", "client_id", "provider_id", "midwife_id", "created_at"]:
        data.pop(field, None)
    
    await collection.update_one(
        {visit_id_field: visit_id},
        {"$set": data}
    )
    
    return {"message": "Visit updated"}


@router.delete("/provider/visits/{visit_id}")
async def delete_unified_visit(visit_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a visit record"""
    result = await db.visits.delete_one({"visit_id": visit_id, "provider_id": user.user_id})
    
    if result.deleted_count == 0:
        result = await db.prenatal_visits.delete_one({"prenatal_visit_id": visit_id, "midwife_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    return {"message": "Visit deleted"}
