"""
Newborn Exam Routes Module

Handles Newborn Exam documentation for Midwives - comprehensive 
newborn physical examination after birth.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_now, check_role, User

router = APIRouter(prefix="/newborn-exam", tags=["Newborn Exam"])


# ============== REQUEST MODELS ==============

class SystemExam(BaseModel):
    """Individual system examination with status and notes"""
    status: str = "normal"  # normal, abnormal, not_assessed
    notes: Optional[str] = None


class NewbornExamCreate(BaseModel):
    """Create a new newborn exam record"""
    client_id: str
    birth_record_id: Optional[str] = None
    
    # Header & Basics
    baby_name: Optional[str] = None
    parent_names: Optional[str] = None
    date_of_birth: Optional[str] = None
    exam_datetime: Optional[str] = None
    baby_age_hours: Optional[float] = None
    place_of_birth: Optional[str] = None  # home, birth_center, hospital, other
    exam_location: Optional[str] = None
    examiner_name: Optional[str] = None
    examiner_credentials: Optional[str] = None
    
    # Birth and Risk Summary
    gestational_age_weeks: Optional[int] = None
    gestational_age_days: Optional[int] = None
    type_of_birth: Optional[str] = None  # spontaneous_vaginal, vbac, assisted, cesarean, other
    risk_flags: Optional[List[str]] = None  # gbs_positive, prom_18h, maternal_fever, meconium, preterm, growth_restriction, large_baby, other
    risk_flags_notes: Optional[str] = None
    
    # Vital Signs
    temperature: Optional[float] = None
    temperature_unit: str = "F"  # F or C
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    perfusion_status: Optional[str] = None  # normal, delayed
    perfusion_notes: Optional[str] = None
    
    # Measurements & Growth
    current_weight: Optional[float] = None
    current_weight_unit: str = "lbs"  # lbs or kg
    birth_weight: Optional[float] = None
    birth_weight_unit: str = "lbs"
    length: Optional[float] = None
    length_unit: str = "in"  # in or cm
    head_circumference: Optional[float] = None
    head_circumference_unit: str = "in"
    growth_plotted: bool = False
    growth_notes: Optional[str] = None
    
    # General Appearance
    color: Optional[str] = None  # normal_pink, acrocyanosis, jaundice, pale, other
    color_notes: Optional[str] = None
    tone: Optional[str] = None  # normal, low, high
    tone_notes: Optional[str] = None
    activity_alertness: Optional[str] = None  # normal, sleepy, irritable, lethargic
    activity_notes: Optional[str] = None
    breathing_effort: Optional[str] = None  # easy, mild_work, distress
    breathing_notes: Optional[str] = None
    
    # System-by-System Exam (each has status and notes)
    exam_skin: Optional[dict] = None
    exam_head_face: Optional[dict] = None
    exam_eyes: Optional[dict] = None
    exam_ears: Optional[dict] = None
    exam_nose_mouth: Optional[dict] = None
    exam_neck_clavicles: Optional[dict] = None
    exam_chest_lungs: Optional[dict] = None
    exam_heart: Optional[dict] = None
    exam_abdomen_umbilicus: Optional[dict] = None
    exam_genitourinary_anus: Optional[dict] = None
    exam_hips_limbs: Optional[dict] = None
    exam_back_spine: Optional[dict] = None
    exam_neurologic_reflexes: Optional[dict] = None
    
    # Feeding, Elimination, and Behavior
    feeding_method: Optional[str] = None  # breast, formula, combo, other
    feeding_quality: Optional[str] = None  # effective, some_difficulty, major_concerns
    feeding_notes: Optional[str] = None
    voids_24h: Optional[str] = None
    stools_24h: Optional[str] = None
    parent_concerns: Optional[str] = None
    
    # Assessment, Education, and Plan
    overall_assessment: Optional[str] = None  # healthy, routine_followup, urgent_followup, emergency_transfer
    red_flag_findings: Optional[str] = None
    parent_questions: Optional[str] = None
    education_given: Optional[List[str]] = None  # normal_appearance, feeding_basics, cord_care, safe_sleep, when_to_call, routine_followup, other
    education_notes: Optional[str] = None
    plan_notes: Optional[str] = None
    next_visit_datetime: Optional[str] = None
    
    # Draft status
    is_draft: bool = True


class NewbornExamUpdate(BaseModel):
    """Update an existing newborn exam record"""
    # All fields optional for partial updates
    baby_name: Optional[str] = None
    parent_names: Optional[str] = None
    date_of_birth: Optional[str] = None
    exam_datetime: Optional[str] = None
    baby_age_hours: Optional[float] = None
    place_of_birth: Optional[str] = None
    exam_location: Optional[str] = None
    examiner_name: Optional[str] = None
    examiner_credentials: Optional[str] = None
    
    gestational_age_weeks: Optional[int] = None
    gestational_age_days: Optional[int] = None
    type_of_birth: Optional[str] = None
    risk_flags: Optional[List[str]] = None
    risk_flags_notes: Optional[str] = None
    
    temperature: Optional[float] = None
    temperature_unit: Optional[str] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    perfusion_status: Optional[str] = None
    perfusion_notes: Optional[str] = None
    
    current_weight: Optional[float] = None
    current_weight_unit: Optional[str] = None
    birth_weight: Optional[float] = None
    birth_weight_unit: Optional[str] = None
    length: Optional[float] = None
    length_unit: Optional[str] = None
    head_circumference: Optional[float] = None
    head_circumference_unit: Optional[str] = None
    growth_plotted: Optional[bool] = None
    growth_notes: Optional[str] = None
    
    color: Optional[str] = None
    color_notes: Optional[str] = None
    tone: Optional[str] = None
    tone_notes: Optional[str] = None
    activity_alertness: Optional[str] = None
    activity_notes: Optional[str] = None
    breathing_effort: Optional[str] = None
    breathing_notes: Optional[str] = None
    
    exam_skin: Optional[dict] = None
    exam_head_face: Optional[dict] = None
    exam_eyes: Optional[dict] = None
    exam_ears: Optional[dict] = None
    exam_nose_mouth: Optional[dict] = None
    exam_neck_clavicles: Optional[dict] = None
    exam_chest_lungs: Optional[dict] = None
    exam_heart: Optional[dict] = None
    exam_abdomen_umbilicus: Optional[dict] = None
    exam_genitourinary_anus: Optional[dict] = None
    exam_hips_limbs: Optional[dict] = None
    exam_back_spine: Optional[dict] = None
    exam_neurologic_reflexes: Optional[dict] = None
    
    feeding_method: Optional[str] = None
    feeding_quality: Optional[str] = None
    feeding_notes: Optional[str] = None
    voids_24h: Optional[str] = None
    stools_24h: Optional[str] = None
    parent_concerns: Optional[str] = None
    
    overall_assessment: Optional[str] = None
    red_flag_findings: Optional[str] = None
    parent_questions: Optional[str] = None
    education_given: Optional[List[str]] = None
    education_notes: Optional[str] = None
    plan_notes: Optional[str] = None
    next_visit_datetime: Optional[str] = None
    
    is_draft: Optional[bool] = None


# ============== ROUTES ==============

@router.get("/client/{client_id}")
async def get_newborn_exams(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get all newborn exams for a client"""
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    exams = await db.newborn_exams.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return exams


@router.get("/{exam_id}")
async def get_newborn_exam(exam_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific newborn exam"""
    exam = await db.newborn_exams.find_one(
        {"exam_id": exam_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not exam:
        raise HTTPException(status_code=404, detail="Newborn exam not found")
    
    return exam


@router.post("")
async def create_newborn_exam(exam_data: NewbornExamCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new newborn exam record"""
    now = get_now()
    
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": exam_data.client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get birth record info if available
    birth_weight = exam_data.birth_weight
    if exam_data.birth_record_id:
        birth_record = await db.birth_records.find_one(
            {"birth_record_id": exam_data.birth_record_id},
            {"_id": 0}
        )
        if birth_record and not birth_weight:
            # Calculate birth weight from birth record
            lbs = birth_record.get("baby_weight_lbs", 0) or 0
            oz = birth_record.get("baby_weight_oz", 0) or 0
            if lbs or oz:
                birth_weight = lbs + (oz / 16)
    
    exam = {
        "exam_id": f"nbexam_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "client_id": exam_data.client_id,
        "birth_record_id": exam_data.birth_record_id,
        
        # Header & Basics
        "baby_name": exam_data.baby_name,
        "parent_names": exam_data.parent_names or client.get("name"),
        "date_of_birth": exam_data.date_of_birth,
        "exam_datetime": exam_data.exam_datetime or now.isoformat(),
        "baby_age_hours": exam_data.baby_age_hours,
        "place_of_birth": exam_data.place_of_birth,
        "exam_location": exam_data.exam_location,
        "examiner_name": exam_data.examiner_name or user.full_name,
        "examiner_credentials": exam_data.examiner_credentials,
        
        # Birth and Risk Summary
        "gestational_age_weeks": exam_data.gestational_age_weeks,
        "gestational_age_days": exam_data.gestational_age_days,
        "type_of_birth": exam_data.type_of_birth,
        "risk_flags": exam_data.risk_flags or [],
        "risk_flags_notes": exam_data.risk_flags_notes,
        
        # Vital Signs
        "temperature": exam_data.temperature,
        "temperature_unit": exam_data.temperature_unit,
        "heart_rate": exam_data.heart_rate,
        "respiratory_rate": exam_data.respiratory_rate,
        "oxygen_saturation": exam_data.oxygen_saturation,
        "perfusion_status": exam_data.perfusion_status,
        "perfusion_notes": exam_data.perfusion_notes,
        
        # Measurements
        "current_weight": exam_data.current_weight,
        "current_weight_unit": exam_data.current_weight_unit,
        "birth_weight": birth_weight,
        "birth_weight_unit": exam_data.birth_weight_unit,
        "length": exam_data.length,
        "length_unit": exam_data.length_unit,
        "head_circumference": exam_data.head_circumference,
        "head_circumference_unit": exam_data.head_circumference_unit,
        "growth_plotted": exam_data.growth_plotted,
        "growth_notes": exam_data.growth_notes,
        
        # General Appearance
        "color": exam_data.color,
        "color_notes": exam_data.color_notes,
        "tone": exam_data.tone,
        "tone_notes": exam_data.tone_notes,
        "activity_alertness": exam_data.activity_alertness,
        "activity_notes": exam_data.activity_notes,
        "breathing_effort": exam_data.breathing_effort,
        "breathing_notes": exam_data.breathing_notes,
        
        # System Exams
        "exam_skin": exam_data.exam_skin or {"status": "normal", "notes": ""},
        "exam_head_face": exam_data.exam_head_face or {"status": "normal", "notes": ""},
        "exam_eyes": exam_data.exam_eyes or {"status": "normal", "notes": ""},
        "exam_ears": exam_data.exam_ears or {"status": "normal", "notes": ""},
        "exam_nose_mouth": exam_data.exam_nose_mouth or {"status": "normal", "notes": ""},
        "exam_neck_clavicles": exam_data.exam_neck_clavicles or {"status": "normal", "notes": ""},
        "exam_chest_lungs": exam_data.exam_chest_lungs or {"status": "normal", "notes": ""},
        "exam_heart": exam_data.exam_heart or {"status": "normal", "notes": ""},
        "exam_abdomen_umbilicus": exam_data.exam_abdomen_umbilicus or {"status": "normal", "notes": ""},
        "exam_genitourinary_anus": exam_data.exam_genitourinary_anus or {"status": "normal", "notes": ""},
        "exam_hips_limbs": exam_data.exam_hips_limbs or {"status": "normal", "notes": ""},
        "exam_back_spine": exam_data.exam_back_spine or {"status": "normal", "notes": ""},
        "exam_neurologic_reflexes": exam_data.exam_neurologic_reflexes or {"status": "normal", "notes": ""},
        
        # Feeding & Elimination
        "feeding_method": exam_data.feeding_method,
        "feeding_quality": exam_data.feeding_quality,
        "feeding_notes": exam_data.feeding_notes,
        "voids_24h": exam_data.voids_24h,
        "stools_24h": exam_data.stools_24h,
        "parent_concerns": exam_data.parent_concerns,
        
        # Assessment & Plan
        "overall_assessment": exam_data.overall_assessment,
        "red_flag_findings": exam_data.red_flag_findings,
        "parent_questions": exam_data.parent_questions,
        "education_given": exam_data.education_given or [],
        "education_notes": exam_data.education_notes,
        "plan_notes": exam_data.plan_notes,
        "next_visit_datetime": exam_data.next_visit_datetime,
        
        # Meta
        "is_draft": exam_data.is_draft,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.newborn_exams.insert_one(exam)
    exam.pop("_id", None)
    
    return exam


@router.put("/{exam_id}")
async def update_newborn_exam(exam_id: str, exam_data: NewbornExamUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update an existing newborn exam"""
    now = get_now()
    
    # Build update dict with only provided fields
    update_data = {k: v for k, v in exam_data.dict().items() if v is not None}
    update_data["updated_at"] = now
    
    result = await db.newborn_exams.update_one(
        {"exam_id": exam_id, "provider_id": user.user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Newborn exam not found")
    
    # Return updated record
    exam = await db.newborn_exams.find_one(
        {"exam_id": exam_id},
        {"_id": 0}
    )
    
    return exam


@router.delete("/{exam_id}")
async def delete_newborn_exam(exam_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete a newborn exam record"""
    result = await db.newborn_exams.delete_one(
        {"exam_id": exam_id, "provider_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Newborn exam not found")
    
    return {"message": "Newborn exam deleted"}


@router.post("/{exam_id}/finalize")
async def finalize_newborn_exam(exam_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Mark a newborn exam as finalized (no longer a draft)"""
    now = get_now()
    
    # Get the exam to validate required fields
    exam = await db.newborn_exams.find_one(
        {"exam_id": exam_id, "provider_id": user.user_id}
    )
    
    if not exam:
        raise HTTPException(status_code=404, detail="Newborn exam not found")
    
    # Validate required fields before finalizing
    required_fields = ["baby_name", "exam_datetime", "overall_assessment"]
    missing = [f for f in required_fields if not exam.get(f)]
    
    if missing:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot finalize: missing required fields: {', '.join(missing)}"
        )
    
    # Finalize
    await db.newborn_exams.update_one(
        {"exam_id": exam_id},
        {"$set": {"is_draft": False, "finalized_at": now, "updated_at": now}}
    )
    
    return {"message": "Newborn exam finalized"}
