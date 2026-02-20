"""
Labor Records Routes Module

Handles labor tracking entries for midwives during active labor.
Each entry is a timestamped snapshot of labor progress and wellbeing.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from .dependencies import db, check_role, User

# ============== ROUTER ==============
router = APIRouter(prefix="/midwife/clients", tags=["Labor Records"])

# ============== MODELS ==============
class LaborEntryCreate(BaseModel):
    # Timing
    entry_datetime: Optional[str] = None  # ISO format, defaults to now
    
    # Stage of labor
    labor_stage: Optional[str] = None  # early, active, transition, pushing, delivery
    stage_notes: Optional[str] = None
    
    # Labor progress (vaginal exam)
    dilation_cm: Optional[float] = None  # 0-10 cm
    effacement_percent: Optional[int] = None  # 0-100%
    station: Optional[str] = None  # -3 to +3
    
    # Contraction pattern
    contractions_per_10min: Optional[int] = None
    contraction_duration_sec: Optional[int] = None
    contraction_strength: Optional[str] = None  # mild, moderate, strong
    
    # Membranes
    membranes_status: Optional[str] = None  # intact, ruptured, artificial_rupture
    rupture_time: Optional[str] = None  # Time of rupture if known
    fluid_color: Optional[str] = None  # clear, bloody, light_meconium, thick_meconium
    fluid_amount: Optional[str] = None  # normal, scant, copious
    
    # Maternal wellbeing
    maternal_bp: Optional[str] = None  # e.g., "120/80"
    maternal_pulse: Optional[int] = None
    maternal_temp: Optional[float] = None  # Temperature
    maternal_respirations: Optional[int] = None
    maternal_position: Optional[str] = None  # e.g., "left lateral", "hands and knees"
    pain_coping_level: Optional[int] = None  # 1-10 scale
    coping_methods: Optional[str] = None  # e.g., "breathing, water, partner support"
    emotional_status: Optional[str] = None  # Free text notes
    
    # Fetal wellbeing
    fetal_heart_rate: Optional[int] = None  # FHR in bpm
    fhr_baseline: Optional[str] = None  # e.g., "normal", "tachycardic", "bradycardic"
    fhr_variability: Optional[str] = None  # absent, minimal, moderate, marked
    decelerations: Optional[str] = None  # none, early, late, variable
    fetal_concerns: Optional[str] = None  # Free text
    
    # Interventions & care
    interventions: Optional[str] = None  # Free text: position changes, fluids, etc.
    medications_given: Optional[str] = None
    communication_notes: Optional[str] = None  # Consulting providers, transfer decisions
    
    # General notes
    general_notes: Optional[str] = None
    
    # Optional link to appointment
    appointment_id: Optional[str] = None


class LaborEntryUpdate(LaborEntryCreate):
    pass


# ============== HELPER FUNCTIONS ==============
def generate_labor_summary(entry: dict) -> str:
    """Generate a brief summary for list display"""
    parts = []
    
    if entry.get("labor_stage"):
        parts.append(entry["labor_stage"].replace("_", " ").title())
    
    if entry.get("dilation_cm") is not None:
        parts.append(f"{entry['dilation_cm']}cm")
    
    if entry.get("fetal_heart_rate"):
        parts.append(f"FHR {entry['fetal_heart_rate']}")
    
    if entry.get("maternal_bp"):
        parts.append(f"BP {entry['maternal_bp']}")
    
    return " | ".join(parts) if parts else "Labor update"


# ============== ROUTES ==============
@router.get("/{client_id}/labor-records")
async def get_labor_records(
    client_id: str,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Get all labor records for a client, sorted by entry time (newest first)"""
    
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0, "client_id": 1}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    records = await db.labor_records.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).sort("entry_datetime", -1).to_list(100)
    
    # Add summary to each record
    for record in records:
        record["summary"] = generate_labor_summary(record)
    
    return records


@router.post("/{client_id}/labor-records")
async def create_labor_record(
    client_id: str,
    entry: LaborEntryCreate,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Create a new labor record entry"""
    
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0, "client_id": 1, "name": 1}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    entry_time = entry.entry_datetime or now.isoformat()
    
    record = {
        "labor_record_id": f"labor_{uuid.uuid4().hex[:12]}",
        "client_id": client_id,
        "provider_id": user.user_id,
        "appointment_id": entry.appointment_id,
        
        # Timing
        "entry_datetime": entry_time,
        "created_at": now,
        "updated_at": now,
        
        # Stage of labor
        "labor_stage": entry.labor_stage,
        "stage_notes": entry.stage_notes,
        
        # Labor progress
        "dilation_cm": entry.dilation_cm,
        "effacement_percent": entry.effacement_percent,
        "station": entry.station,
        
        # Contractions
        "contractions_per_10min": entry.contractions_per_10min,
        "contraction_duration_sec": entry.contraction_duration_sec,
        "contraction_strength": entry.contraction_strength,
        
        # Membranes
        "membranes_status": entry.membranes_status,
        "rupture_time": entry.rupture_time,
        "fluid_color": entry.fluid_color,
        "fluid_amount": entry.fluid_amount,
        
        # Maternal wellbeing
        "maternal_bp": entry.maternal_bp,
        "maternal_pulse": entry.maternal_pulse,
        "maternal_temp": entry.maternal_temp,
        "maternal_respirations": entry.maternal_respirations,
        "maternal_position": entry.maternal_position,
        "pain_coping_level": entry.pain_coping_level,
        "coping_methods": entry.coping_methods,
        "emotional_status": entry.emotional_status,
        
        # Fetal wellbeing
        "fetal_heart_rate": entry.fetal_heart_rate,
        "fhr_baseline": entry.fhr_baseline,
        "fhr_variability": entry.fhr_variability,
        "decelerations": entry.decelerations,
        "fetal_concerns": entry.fetal_concerns,
        
        # Interventions
        "interventions": entry.interventions,
        "medications_given": entry.medications_given,
        "communication_notes": entry.communication_notes,
        
        # General
        "general_notes": entry.general_notes,
    }
    
    await db.labor_records.insert_one(record)
    
    # Remove _id before returning
    record.pop("_id", None)
    record["summary"] = generate_labor_summary(record)
    
    return record


@router.get("/{client_id}/labor-records/{record_id}")
async def get_labor_record(
    client_id: str,
    record_id: str,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Get a specific labor record"""
    
    record = await db.labor_records.find_one(
        {
            "labor_record_id": record_id,
            "client_id": client_id,
            "provider_id": user.user_id
        },
        {"_id": 0}
    )
    
    if not record:
        raise HTTPException(status_code=404, detail="Labor record not found")
    
    record["summary"] = generate_labor_summary(record)
    return record


@router.put("/{client_id}/labor-records/{record_id}")
async def update_labor_record(
    client_id: str,
    record_id: str,
    entry: LaborEntryUpdate,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Update an existing labor record"""
    
    # Check record exists and belongs to this midwife
    existing = await db.labor_records.find_one(
        {
            "labor_record_id": record_id,
            "client_id": client_id,
            "provider_id": user.user_id
        }
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Labor record not found")
    
    now = datetime.now(timezone.utc)
    
    update_data = {
        "updated_at": now,
        "labor_stage": entry.labor_stage,
        "stage_notes": entry.stage_notes,
        "dilation_cm": entry.dilation_cm,
        "effacement_percent": entry.effacement_percent,
        "station": entry.station,
        "contractions_per_10min": entry.contractions_per_10min,
        "contraction_duration_sec": entry.contraction_duration_sec,
        "contraction_strength": entry.contraction_strength,
        "membranes_status": entry.membranes_status,
        "rupture_time": entry.rupture_time,
        "fluid_color": entry.fluid_color,
        "fluid_amount": entry.fluid_amount,
        "maternal_bp": entry.maternal_bp,
        "maternal_pulse": entry.maternal_pulse,
        "maternal_temp": entry.maternal_temp,
        "maternal_respirations": entry.maternal_respirations,
        "maternal_position": entry.maternal_position,
        "pain_coping_level": entry.pain_coping_level,
        "coping_methods": entry.coping_methods,
        "emotional_status": entry.emotional_status,
        "fetal_heart_rate": entry.fetal_heart_rate,
        "fhr_baseline": entry.fhr_baseline,
        "fhr_variability": entry.fhr_variability,
        "decelerations": entry.decelerations,
        "fetal_concerns": entry.fetal_concerns,
        "interventions": entry.interventions,
        "medications_given": entry.medications_given,
        "communication_notes": entry.communication_notes,
        "general_notes": entry.general_notes,
    }
    
    # Only update entry_datetime if provided
    if entry.entry_datetime:
        update_data["entry_datetime"] = entry.entry_datetime
    
    await db.labor_records.update_one(
        {"labor_record_id": record_id},
        {"$set": update_data}
    )
    
    # Fetch and return updated record
    updated = await db.labor_records.find_one(
        {"labor_record_id": record_id},
        {"_id": 0}
    )
    updated["summary"] = generate_labor_summary(updated)
    
    return updated


@router.delete("/{client_id}/labor-records/{record_id}")
async def delete_labor_record(
    client_id: str,
    record_id: str,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Delete a labor record"""
    
    result = await db.labor_records.delete_one(
        {
            "labor_record_id": record_id,
            "client_id": client_id,
            "provider_id": user.user_id
        }
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Labor record not found")
    
    return {"message": "Labor record deleted"}


@router.get("/{client_id}/labor-records/stats/summary")
async def get_labor_stats(
    client_id: str,
    user: User = Depends(check_role(["MIDWIFE"]))
):
    """Get labor progress summary for a client"""
    
    # Get most recent entry
    latest = await db.labor_records.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0},
        sort=[("entry_datetime", -1)]
    )
    
    # Get total count
    total_entries = await db.labor_records.count_documents(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    
    # Get first entry time (labor start)
    first = await db.labor_records.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0, "entry_datetime": 1},
        sort=[("entry_datetime", 1)]
    )
    
    return {
        "total_entries": total_entries,
        "latest_entry": latest,
        "labor_start_time": first.get("entry_datetime") if first else None,
        "current_stage": latest.get("labor_stage") if latest else None,
        "current_dilation": latest.get("dilation_cm") if latest else None,
    }
