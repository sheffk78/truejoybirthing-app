"""
Unified Provider Routes - Shared endpoints for DOULA and MIDWIFE
All routes use /api/provider/* prefix and work for both provider types
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

# These will be imported from server.py
# db, User, check_role, get_current_user are passed at registration time

router = APIRouter(prefix="/provider", tags=["provider"])

# Store for db and auth dependencies (set at registration)
_db = None
_check_role = None
_get_current_user = None
_is_client_active = None

def init_routes(db, check_role, get_current_user, is_client_active):
    """Initialize routes with dependencies from main app"""
    global _db, _check_role, _get_current_user, _is_client_active
    _db = db
    _check_role = check_role
    _get_current_user = get_current_user
    _is_client_active = is_client_active

# ============== UNIFIED CLIENT ROUTES ==============

@router.get("/clients")
async def get_provider_clients(
    include_inactive: bool = Query(False, description="Include inactive clients (6+ weeks post due date)"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    user = None  # Will be injected
):
    """
    Get all clients for the logged-in provider (DOULA or MIDWIFE).
    By default, only returns active clients (within 6 weeks of due date).
    """
    query = {"pro_user_id": user.user_id}
    
    if status_filter:
        query["status"] = status_filter
    
    clients = await _db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add is_active computed field and filter if needed
    result = []
    for client in clients:
        client["is_active"] = _is_client_active(client)
        if include_inactive or client["is_active"]:
            result.append(client)
    
    return result


@router.get("/clients/{client_id}")
async def get_provider_client_detail(client_id: str, user = None):
    """Get detailed info for a single client, including related data counts"""
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id},
        {"_id": 0}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Add is_active
    client["is_active"] = _is_client_active(client)
    
    # Get counts of related entities
    appointments_count = await _db.appointments.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    notes_count = await _db.notes.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    contracts_count = await _db.contracts.count_documents({
        "client_id": client_id,
        "pro_user_id": user.user_id
    })
    
    invoices_count = await _db.invoices.count_documents({
        "client_id": client_id,
        "pro_user_id": user.user_id
    })
    
    # Midwife-specific: visits count
    visits_count = 0
    if user.role == "MIDWIFE":
        visits_count = await _db.visits.count_documents({
            "client_id": client_id,
            "provider_id": user.user_id
        })
    
    client["_counts"] = {
        "appointments": appointments_count,
        "notes": notes_count,
        "contracts": contracts_count,
        "invoices": invoices_count,
        "visits": visits_count
    }
    
    return client


@router.put("/clients/{client_id}")
async def update_provider_client(client_id: str, update_data: dict, user = None):
    """Update a client's information"""
    # Verify ownership
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Filter allowed update fields
    allowed_fields = ["name", "email", "phone", "due_date", "birth_date", 
                      "planned_birth_setting", "status", "edd", "partner_name"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await _db.clients.update_one(
        {"client_id": client_id},
        {"$set": update_dict}
    )
    
    return {"message": "Client updated"}


# ============== UNIFIED APPOINTMENT ROUTES ==============

@router.get("/appointments")
async def get_provider_appointments(
    client_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    upcoming_only: bool = Query(False),
    include_inactive_clients: bool = Query(False),
    user = None
):
    """
    Get appointments for the provider.
    Can filter by client, status, or upcoming only.
    By default excludes appointments for inactive clients.
    """
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    
    if status:
        query["status"] = status
    
    if upcoming_only:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query["$or"] = [
            {"start_datetime": {"$gte": today}},
            {"appointment_date": {"$gte": today}}  # Legacy field support
        ]
    
    appointments = await _db.appointments.find(query, {"_id": 0}).sort("start_datetime", -1).to_list(500)
    
    # Filter out inactive client appointments if needed
    if not include_inactive_clients and not client_id:
        # Get active client IDs
        clients = await _db.clients.find(
            {"pro_user_id": user.user_id},
            {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1}
        ).to_list(500)
        
        active_client_ids = set()
        for c in clients:
            if _is_client_active(c):
                active_client_ids.add(c["client_id"])
        
        appointments = [a for a in appointments if a.get("client_id") in active_client_ids]
    
    # Enrich with client info
    for appt in appointments:
        if appt.get("client_id"):
            client = await _db.clients.find_one(
                {"client_id": appt["client_id"]},
                {"_id": 0, "name": 1, "email": 1, "picture": 1}
            )
            if client:
                appt["client_name"] = client.get("name", "")
                appt["client_email"] = client.get("email", "")
                appt["client_picture"] = client.get("picture")
    
    return appointments


@router.post("/appointments")
async def create_provider_appointment(data: dict, user = None):
    """Create an appointment for a client"""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
    
    # Support both new datetime format and legacy date/time format
    start_datetime = data.get("start_datetime")
    if not start_datetime and data.get("appointment_date"):
        # Legacy format conversion
        date_str = data.get("appointment_date")
        time_str = data.get("appointment_time", "09:00")
        start_datetime = f"{date_str}T{time_str}:00"
    
    appointment = {
        "appointment_id": appointment_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "provider_name": user.full_name,
        "provider_role": user.role,
        "client_name": client.get("name", ""),
        # New unified fields
        "start_datetime": start_datetime,
        "end_datetime": data.get("end_datetime"),
        "duration_minutes": data.get("duration_minutes", 60),
        # Legacy field support
        "appointment_date": data.get("appointment_date") or (start_datetime[:10] if start_datetime else None),
        "appointment_time": data.get("appointment_time") or (start_datetime[11:16] if start_datetime and len(start_datetime) > 11 else None),
        "appointment_type": data.get("appointment_type", "consultation"),
        "location": data.get("location"),
        "is_virtual": data.get("is_virtual", False),
        "notes": data.get("notes"),  # Provider private notes
        "client_notes": data.get("client_notes"),  # Visible to client
        "status": data.get("status", "scheduled"),
        "created_at": now,
        "updated_at": now
    }
    
    # If client has linked_mom_id, also store it for mom's timeline
    if client.get("linked_mom_id"):
        appointment["mom_user_id"] = client["linked_mom_id"]
    
    await _db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    return appointment


@router.put("/appointments/{appointment_id}")
async def update_provider_appointment(appointment_id: str, data: dict, user = None):
    """Update an appointment"""
    appt = await _db.appointments.find_one(
        {"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = datetime.now(timezone.utc)
    
    allowed_fields = ["start_datetime", "end_datetime", "duration_minutes", 
                      "appointment_type", "location", "is_virtual", "status",
                      "notes", "client_notes", "appointment_date", "appointment_time"]
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await _db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": update_dict}
    )
    
    return {"message": "Appointment updated"}


@router.delete("/appointments/{appointment_id}")
async def delete_provider_appointment(appointment_id: str, user = None):
    """Delete/cancel an appointment"""
    result = await _db.appointments.delete_one(
        {"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment deleted"}


# ============== UNIFIED NOTES ROUTES ==============

@router.get("/notes")
async def get_provider_notes(
    client_id: Optional[str] = Query(None),
    note_type: Optional[str] = Query(None),
    user = None
):
    """Get notes, optionally filtered by client or type"""
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    if note_type:
        query["note_type"] = note_type
    
    notes = await _db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with client name
    for note in notes:
        if note.get("client_id"):
            client = await _db.clients.find_one(
                {"client_id": note["client_id"]},
                {"_id": 0, "name": 1}
            )
            if client:
                note["client_name"] = client.get("name", "")
    
    return notes


@router.post("/notes")
async def create_provider_note(data: dict, user = None):
    """Create a note for a client"""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    
    note = {
        "note_id": note_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "client_name": client.get("name", ""),
        "note_type": data.get("note_type", "General"),
        "title": data.get("title"),
        "content": data.get("content", ""),
        "is_private": data.get("is_private", True),
        "created_at": now,
        "updated_at": now
    }
    
    await _db.notes.insert_one(note)
    note.pop("_id", None)
    
    return note


@router.put("/notes/{note_id}")
async def update_provider_note(note_id: str, data: dict, user = None):
    """Update a note"""
    note = await _db.notes.find_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    now = datetime.now(timezone.utc)
    
    allowed_fields = ["note_type", "title", "content", "is_private"]
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await _db.notes.update_one(
        {"note_id": note_id},
        {"$set": update_dict}
    )
    
    return {"message": "Note updated"}


@router.delete("/notes/{note_id}")
async def delete_provider_note(note_id: str, user = None):
    """Delete a note"""
    result = await _db.notes.delete_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}


# ============== UNIFIED VISITS ROUTES (MIDWIFE ONLY) ==============

@router.get("/visits")
async def get_provider_visits(
    client_id: Optional[str] = Query(None),
    visit_type: Optional[str] = Query(None),
    include_inactive_clients: bool = Query(False),
    user = None
):
    """
    Get visits for the provider (MIDWIFE only).
    Visits are clinical records linked to appointments.
    """
    if user.role != "MIDWIFE":
        raise HTTPException(status_code=403, detail="Visits are only available for midwives")
    
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    if visit_type:
        query["visit_type"] = visit_type
    
    visits = await _db.visits.find(query, {"_id": 0}).sort("visit_date", -1).to_list(500)
    
    # Filter out inactive client visits if needed
    if not include_inactive_clients and not client_id:
        clients = await _db.clients.find(
            {"pro_user_id": user.user_id},
            {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1}
        ).to_list(500)
        
        active_client_ids = set()
        for c in clients:
            if _is_client_active(c):
                active_client_ids.add(c["client_id"])
        
        visits = [v for v in visits if v.get("client_id") in active_client_ids]
    
    # Enrich with client and appointment info
    for visit in visits:
        if visit.get("client_id"):
            client = await _db.clients.find_one(
                {"client_id": visit["client_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            if client:
                visit["client_name"] = client.get("name", "")
        
        if visit.get("appointment_id"):
            appt = await _db.appointments.find_one(
                {"appointment_id": visit["appointment_id"]},
                {"_id": 0, "start_datetime": 1, "appointment_type": 1, "location": 1}
            )
            if appt:
                visit["appointment_info"] = appt
    
    return visits


@router.post("/visits")
async def create_provider_visit(data: dict, user = None):
    """Create a visit record (MIDWIFE only)"""
    if user.role != "MIDWIFE":
        raise HTTPException(status_code=403, detail="Visits are only available for midwives")
    
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    visit_id = f"visit_{uuid.uuid4().hex[:12]}"
    
    # Build summary from vitals
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
    
    summary = ", ".join(summary_parts) if summary_parts else "Visit recorded"
    
    visit = {
        "visit_id": visit_id,
        "client_id": client_id,
        "provider_id": user.user_id,
        "appointment_id": data.get("appointment_id"),
        "client_name": client.get("name", ""),
        "visit_date": data.get("visit_date", now.strftime("%Y-%m-%d")),
        "visit_type": data.get("visit_type", "Prenatal"),
        "summary": summary,
        # Vitals
        "blood_pressure": data.get("blood_pressure"),
        "fetal_heart_rate": data.get("fetal_heart_rate"),
        "fundal_height": data.get("fundal_height"),
        "weight": data.get("weight"),
        "weight_unit": data.get("weight_unit", "lbs"),
        "urinalysis": data.get("urinalysis"),
        "urinalysis_note": data.get("urinalysis_note"),
        # Well-being scores
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
        # General
        "general_notes": data.get("general_notes"),
        "created_at": now,
        "updated_at": now
    }
    
    await _db.visits.insert_one(visit)
    visit.pop("_id", None)
    
    # If linked to appointment, update appointment status
    if data.get("appointment_id"):
        await _db.appointments.update_one(
            {"appointment_id": data["appointment_id"]},
            {"$set": {"status": "completed", "visit_id": visit_id}}
        )
    
    return visit


@router.put("/visits/{visit_id}")
async def update_provider_visit(visit_id: str, data: dict, user = None):
    """Update a visit record"""
    if user.role != "MIDWIFE":
        raise HTTPException(status_code=403, detail="Visits are only available for midwives")
    
    visit = await _db.visits.find_one(
        {"visit_id": visit_id, "provider_id": user.user_id}
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    now = datetime.now(timezone.utc)
    
    # Update summary if vitals changed
    summary_parts = []
    bp = data.get("blood_pressure", visit.get("blood_pressure"))
    fhr = data.get("fetal_heart_rate", visit.get("fetal_heart_rate"))
    fh = data.get("fundal_height", visit.get("fundal_height"))
    wt = data.get("weight", visit.get("weight"))
    
    if bp:
        summary_parts.append(f"BP {bp}")
    if fhr:
        summary_parts.append(f"FHR {fhr}")
    if fh:
        summary_parts.append(f"FH {fh} cm")
    if wt:
        unit = data.get("weight_unit", visit.get("weight_unit", "lbs"))
        summary_parts.append(f"Wt {wt} {unit}")
    
    data["summary"] = ", ".join(summary_parts) if summary_parts else "Visit recorded"
    data["updated_at"] = now
    
    # Remove fields that shouldn't be updated
    data.pop("visit_id", None)
    data.pop("client_id", None)
    data.pop("provider_id", None)
    data.pop("created_at", None)
    
    await _db.visits.update_one(
        {"visit_id": visit_id},
        {"$set": data}
    )
    
    return {"message": "Visit updated"}


@router.delete("/visits/{visit_id}")
async def delete_provider_visit(visit_id: str, user = None):
    """Delete a visit record"""
    if user.role != "MIDWIFE":
        raise HTTPException(status_code=403, detail="Visits are only available for midwives")
    
    result = await _db.visits.delete_one(
        {"visit_id": visit_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    return {"message": "Visit deleted"}


# ============== CLIENT TIMELINE (for Client Detail view) ==============

@router.get("/clients/{client_id}/timeline")
async def get_client_timeline(client_id: str, user = None):
    """
    Get unified timeline for a client showing all activities:
    appointments, visits, notes, contracts, invoices
    """
    # Verify client belongs to provider
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    timeline = []
    
    # Get appointments
    appointments = await _db.appointments.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for appt in appointments:
        timeline.append({
            "type": "appointment",
            "id": appt["appointment_id"],
            "date": appt.get("start_datetime") or appt.get("appointment_date"),
            "title": f"{appt.get('appointment_type', 'Appointment').replace('_', ' ').title()}",
            "subtitle": appt.get("location") or ("Virtual" if appt.get("is_virtual") else ""),
            "status": appt.get("status"),
            "data": appt
        })
    
    # Get visits (midwife only)
    if user.role == "MIDWIFE":
        visits = await _db.visits.find(
            {"client_id": client_id, "provider_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        for visit in visits:
            timeline.append({
                "type": "visit",
                "id": visit["visit_id"],
                "date": visit.get("visit_date"),
                "title": f"{visit.get('visit_type', 'Visit')} Visit",
                "subtitle": visit.get("summary", ""),
                "status": None,
                "data": visit
            })
    
    # Get notes
    notes = await _db.notes.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for note in notes:
        timeline.append({
            "type": "note",
            "id": note["note_id"],
            "date": note.get("created_at"),
            "title": note.get("title") or f"{note.get('note_type', 'Note')}",
            "subtitle": note.get("content", "")[:100] + "..." if len(note.get("content", "")) > 100 else note.get("content", ""),
            "status": None,
            "data": note
        })
    
    # Get contracts
    contracts = await _db.contracts.find(
        {"client_id": client_id, "pro_user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for contract in contracts:
        timeline.append({
            "type": "contract",
            "id": contract["contract_id"],
            "date": contract.get("created_at"),
            "title": "Service Contract",
            "subtitle": f"Status: {contract.get('status', 'Draft')}",
            "status": contract.get("status"),
            "data": contract
        })
    
    # Get invoices
    invoices = await _db.invoices.find(
        {"client_id": client_id, "pro_user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for invoice in invoices:
        timeline.append({
            "type": "invoice",
            "id": invoice["invoice_id"],
            "date": invoice.get("created_at"),
            "title": f"Invoice #{invoice.get('invoice_number', '')}",
            "subtitle": f"${invoice.get('amount', 0):.2f} - {invoice.get('status', 'Draft')}",
            "status": invoice.get("status"),
            "data": invoice
        })
    
    # Sort by date descending
    def get_sort_date(item):
        date = item.get("date")
        if isinstance(date, datetime):
            return date
        if isinstance(date, str):
            try:
                return datetime.fromisoformat(date.replace("Z", "+00:00"))
            except:
                return datetime.min
        return datetime.min
    
    timeline.sort(key=get_sort_date, reverse=True)
    
    return {
        "client": client,
        "timeline": timeline
    }


# ============== BIRTH RECORD ROUTES ==============

@router.get("/clients/{client_id}/birth-record")
async def get_client_birth_record(client_id: str, user = None):
    """Get birth record for a client"""
    # Verify client belongs to provider
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    birth_record = await _db.birth_records.find_one(
        {"client_id": client_id},
        {"_id": 0}
    )
    
    return birth_record or {}


@router.post("/clients/{client_id}/birth-record")
async def create_or_update_birth_record(client_id: str, data: dict, user = None):
    """Create or update birth record for a client"""
    # Verify client belongs to provider
    client = await _db.clients.find_one(
        {"client_id": client_id, "pro_user_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc)
    
    # Check if record exists
    existing = await _db.birth_records.find_one({"client_id": client_id})
    
    if existing:
        # Update
        data["updated_at"] = now
        data.pop("birth_record_id", None)
        data.pop("client_id", None)
        data.pop("created_at", None)
        
        await _db.birth_records.update_one(
            {"client_id": client_id},
            {"$set": data}
        )
        return {"message": "Birth record updated"}
    else:
        # Create
        birth_record = {
            "birth_record_id": f"br_{uuid.uuid4().hex[:12]}",
            "client_id": client_id,
            "provider_id": user.user_id,
            "client_name": client.get("name", ""),
            **data,
            "created_at": now,
            "updated_at": now
        }
        
        await _db.birth_records.insert_one(birth_record)
        
        # Also update client's birth_date if provided
        if data.get("birth_date"):
            await _db.clients.update_one(
                {"client_id": client_id},
                {"$set": {"birth_date": data["birth_date"]}}
            )
        
        return {"message": "Birth record created"}


# ============== UNIFIED DASHBOARD ==============

@router.get("/dashboard")
async def get_provider_dashboard(user = None):
    """Get unified dashboard stats for provider"""
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    
    # Get all clients and count active
    all_clients = await _db.clients.find(
        {"pro_user_id": user.user_id},
        {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1, "status": 1}
    ).to_list(500)
    
    active_clients = [c for c in all_clients if _is_client_active(c)]
    active_client_ids = [c["client_id"] for c in active_clients]
    
    # Count upcoming appointments for active clients
    upcoming_appointments = await _db.appointments.count_documents({
        "provider_id": user.user_id,
        "client_id": {"$in": active_client_ids},
        "status": {"$in": ["scheduled", "confirmed", "accepted"]},
        "$or": [
            {"start_datetime": {"$gte": today}},
            {"appointment_date": {"$gte": today}}
        ]
    })
    
    stats = {
        "total_clients": len(all_clients),
        "active_clients": len(active_clients),
        "upcoming_appointments": upcoming_appointments
    }
    
    # Role-specific stats
    if user.role == "MIDWIFE":
        # Count visits this month
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        visits_this_month = await _db.visits.count_documents({
            "provider_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        
        # Count births this month
        births_this_month = await _db.birth_records.count_documents({
            "provider_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        
        # Count prenatal clients
        prenatal_count = len([c for c in active_clients if c.get("status") in ["Prenatal", "Active"]])
        
        stats["visits_this_month"] = visits_this_month
        stats["births_this_month"] = births_this_month
        stats["prenatal_clients"] = prenatal_count
    
    return stats
