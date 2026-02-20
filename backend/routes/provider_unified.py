"""
Unified Provider Routes - Shared endpoints for DOULA and MIDWIFE

This module handles all unified provider routes including:
- Client CRUD and timeline
- Appointments CRUD
- Notes CRUD
- Dashboard stats
- Birth records

All routes use /provider/* prefix and work for both provider types.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone

from .dependencies import (
    db, check_role, User, create_notification, get_now, generate_id,
    is_client_active, calculate_client_active_status
)

router = APIRouter(tags=["Provider Unified"])


# ============== CLIENT ROUTES ==============

@router.get("/provider/clients")
async def get_provider_clients(
    include_inactive: bool = False,
    status_filter: Optional[str] = None,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Get all clients for the logged-in provider (DOULA or MIDWIFE).
    By default, only returns active clients (within 6 weeks of due date).
    """
    query = {"provider_id": user.user_id}
    
    if status_filter:
        query["status"] = status_filter
    
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Add is_active computed field and filter if needed
    # Also enrich with linked mom's picture
    result = []
    for client in clients:
        client["is_active"] = is_client_active(client)
        
        # Add picture from linked mom if not present
        if client.get("linked_mom_id") and not client.get("picture"):
            mom = await db.users.find_one(
                {"user_id": client["linked_mom_id"]},
                {"_id": 0, "picture": 1}
            )
            if mom and mom.get("picture"):
                client["picture"] = mom["picture"]
        
        if include_inactive or client["is_active"]:
            result.append(client)
    
    return result


@router.get("/provider/clients/{client_id}")
async def get_client_detail(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get detailed info for a single client, including related data counts"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Add is_active
    client["is_active"] = is_client_active(client)
    
    # Get counts of related entities
    appointments_count = await db.appointments.count_documents({
        "$or": [
            {"client_id": client_id, "provider_id": user.user_id},
            {"mom_user_id": client.get("linked_mom_id"), "provider_id": user.user_id} if client.get("linked_mom_id") else {"client_id": "___never_match___"}
        ]
    })
    
    notes_count = await db.notes.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    contracts_count = await db.contracts.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    invoices_count = await db.invoices.count_documents({
        "client_id": client_id,
        "provider_id": user.user_id
    })
    
    # Midwife-specific: visits count
    visits_count = 0
    if user.role == "MIDWIFE":
        visits_count = await db.visits.count_documents({
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


@router.put("/provider/clients/{client_id}")
async def update_client(client_id: str, update_data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a client's information"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    # Filter allowed update fields
    allowed_fields = ["name", "email", "phone", "due_date", "birth_date", 
                      "planned_birth_setting", "status", "edd", "partner_name"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await db.clients.update_one(
        {"client_id": client_id},
        {"$set": update_dict}
    )
    
    return {"message": "Client updated"}


@router.get("/provider/clients/{client_id}/timeline")
async def get_client_timeline(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """
    Get unified timeline for a client showing all activities:
    appointments, visits, notes, contracts, invoices
    """
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    timeline = []
    
    # Get appointments (check both client_id and mom_user_id)
    appt_query = {"provider_id": user.user_id, "$or": [{"client_id": client_id}]}
    if client.get("linked_mom_id"):
        appt_query["$or"].append({"mom_user_id": client["linked_mom_id"]})
    
    appointments = await db.appointments.find(appt_query, {"_id": 0}).to_list(100)
    
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
        visits = await db.visits.find(
            {"client_id": client_id, "provider_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        for visit in visits:
            timeline.append({
                "type": "visit",
                "id": visit.get("visit_id") or visit.get("prenatal_visit_id"),
                "date": visit.get("visit_date"),
                "title": f"{visit.get('visit_type', 'Visit')} Visit",
                "subtitle": visit.get("summary", ""),
                "status": None,
                "data": visit
            })
        
        # Also check prenatal_visits collection
        prenatal_visits = await db.prenatal_visits.find(
            {"client_id": client_id, "midwife_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        for visit in prenatal_visits:
            timeline.append({
                "type": "visit",
                "id": visit.get("prenatal_visit_id"),
                "date": visit.get("visit_date"),
                "title": "Prenatal Visit",
                "subtitle": visit.get("summary", ""),
                "status": None,
                "data": visit
            })
    
    # Get notes
    notes = await db.notes.find(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    for note in notes:
        timeline.append({
            "type": "note",
            "id": note.get("note_id"),
            "date": note.get("created_at"),
            "title": note.get("title") or f"{note.get('note_type', 'Note')}",
            "subtitle": (note.get("content", "")[:100] + "...") if len(note.get("content", "")) > 100 else note.get("content", ""),
            "status": None,
            "data": note
        })
    
    # Get contracts - check both provider_id and role-specific IDs
    contracts = await db.contracts.find(
        {"client_id": client_id, "$or": [
            {"provider_id": user.user_id},
            {"doula_id": user.user_id},
            {"midwife_id": user.user_id}
        ]},
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
    invoices = await db.invoices.find(
        {"client_id": client_id, "provider_id": user.user_id},
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
            except ValueError:
                return datetime.min
        return datetime.min
    
    timeline.sort(key=get_sort_date, reverse=True)
    
    # Enrich client with linked mom's picture if available
    enriched_client = calculate_client_active_status(client)
    if client.get("linked_mom_id") and not enriched_client.get("picture"):
        mom = await db.users.find_one(
            {"user_id": client["linked_mom_id"]},
            {"_id": 0, "picture": 1}
        )
        if mom and mom.get("picture"):
            enriched_client["picture"] = mom["picture"]
    
    return {
        "client": enriched_client,
        "timeline": timeline
    }


# ============== APPOINTMENT ROUTES ==============

@router.get("/provider/appointments")
async def get_appointments(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    upcoming_only: bool = False,
    include_inactive_clients: bool = False,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """
    Get appointments for the provider.
    Can filter by client, status, or upcoming only.
    By default excludes appointments for inactive clients.
    """
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["$or"] = [{"client_id": client_id}]
        # Also check linked mom
        client = await db.clients.find_one({"client_id": client_id})
        if client and client.get("linked_mom_id"):
            query["$or"].append({"mom_user_id": client["linked_mom_id"]})
    
    if status:
        query["status"] = status
    
    if upcoming_only:
        today = get_now().strftime("%Y-%m-%d")
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"start_datetime": {"$gte": today}},
                {"appointment_date": {"$gte": today}}
            ]
        })
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("appointment_date", -1).to_list(500)
    
    # Enrich with client info and filter inactive if needed
    result = []
    for appt in appointments:
        # Find the associated client
        client = None
        if appt.get("client_id"):
            client = await db.clients.find_one({"client_id": appt["client_id"]}, {"_id": 0})
        elif appt.get("mom_user_id"):
            client = await db.clients.find_one({"linked_mom_id": appt["mom_user_id"], "provider_id": user.user_id}, {"_id": 0})
        
        if client:
            appt["client_name"] = client.get("name", "")
            appt["client_email"] = client.get("email", "")
            appt["client_picture"] = client.get("picture")
            appt["client_id"] = client.get("client_id")
            
            # Filter inactive clients
            if not include_inactive_clients and not client_id:
                if not is_client_active(client):
                    continue
        
        result.append(appt)
    
    return result


@router.post("/provider/appointments")
async def create_appointment(data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create an appointment for a client using the unified model"""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    appointment_id = generate_id("appt")
    
    # Support both new datetime format and legacy date/time format
    start_datetime = data.get("start_datetime")
    appointment_date = data.get("appointment_date")
    appointment_time = data.get("appointment_time", "09:00")
    
    if not start_datetime and appointment_date:
        start_datetime = f"{appointment_date}T{appointment_time}:00"
    elif start_datetime and not appointment_date:
        appointment_date = start_datetime[:10] if len(start_datetime) >= 10 else None
        appointment_time = start_datetime[11:16] if len(start_datetime) >= 16 else None
    
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
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "appointment_type": data.get("appointment_type", "consultation"),
        "location": data.get("location"),
        "is_virtual": data.get("is_virtual", False),
        "notes": data.get("notes"),
        "client_notes": data.get("client_notes"),
        "status": data.get("status", "scheduled"),
        "created_at": now,
        "updated_at": now
    }
    
    # If client has linked_mom_id, also store it for mom's timeline
    if client.get("linked_mom_id"):
        appointment["mom_user_id"] = client["linked_mom_id"]
        appointment["mom_name"] = client.get("name", "")
        
        # Send notification to Mom
        await create_notification(
            user_id=client["linked_mom_id"],
            notif_type="appointment_invite",
            title="New Appointment Scheduled",
            message=f"{user.full_name} scheduled an appointment for {appointment_date}",
            data={"appointment_id": appointment_id, "provider_id": user.user_id}
        )
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    return {"message": "Appointment created", "appointment": appointment}


@router.put("/provider/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update an appointment"""
    appt = await db.appointments.find_one(
        {"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = get_now()
    
    allowed_fields = ["start_datetime", "end_datetime", "duration_minutes", 
                      "appointment_type", "location", "is_virtual", "status",
                      "notes", "client_notes", "appointment_date", "appointment_time"]
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": update_dict}
    )
    
    return {"message": "Appointment updated"}


@router.delete("/provider/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete/cancel an appointment"""
    result = await db.appointments.delete_one(
        {"appointment_id": appointment_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment deleted"}


# ============== NOTES ROUTES ==============

@router.get("/provider/notes")
async def get_notes(
    client_id: Optional[str] = None,
    note_type: Optional[str] = None,
    user: User = Depends(check_role(["DOULA", "MIDWIFE"]))
):
    """Get notes, optionally filtered by client or type"""
    query = {"provider_id": user.user_id}
    
    if client_id:
        query["client_id"] = client_id
    if note_type:
        query["note_type"] = note_type
    
    notes = await db.notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with client name
    for note in notes:
        if note.get("client_id"):
            client = await db.clients.find_one(
                {"client_id": note["client_id"]},
                {"_id": 0, "name": 1}
            )
            if client:
                note["client_name"] = client.get("name", "")
    
    return notes


@router.post("/provider/notes")
async def create_note(data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create a note for a client"""
    client_id = data.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id is required")
    
    # Verify client belongs to provider
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    note_id = generate_id("note")
    
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
    
    await db.notes.insert_one(note)
    note.pop("_id", None)
    
    return note


@router.put("/provider/notes/{note_id}")
async def update_note(note_id: str, data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Update a note"""
    note = await db.notes.find_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    now = get_now()
    
    allowed_fields = ["note_type", "title", "content", "is_private"]
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    await db.notes.update_one(
        {"note_id": note_id},
        {"$set": update_dict}
    )
    
    return {"message": "Note updated"}


@router.delete("/provider/notes/{note_id}")
async def delete_note(note_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a note"""
    result = await db.notes.delete_one(
        {"note_id": note_id, "provider_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}


# ============== BIRTH RECORD ROUTES ==============

@router.get("/provider/clients/{client_id}/birth-record")
async def get_birth_record(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get birth record for a client"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    birth_record = await db.birth_records.find_one(
        {"client_id": client_id},
        {"_id": 0}
    )
    
    return birth_record or {}


@router.post("/provider/clients/{client_id}/birth-record")
async def create_or_update_birth_record(client_id: str, data: dict, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Create or update birth record for a client"""
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    # Check if record exists
    existing = await db.birth_records.find_one({"client_id": client_id})
    
    if existing:
        # Update
        data["updated_at"] = now
        for field in ["birth_record_id", "client_id", "created_at"]:
            data.pop(field, None)
        
        await db.birth_records.update_one(
            {"client_id": client_id},
            {"$set": data}
        )
        message = "Birth record updated"
    else:
        # Create
        birth_record = {
            "birth_record_id": generate_id("br"),
            "client_id": client_id,
            "provider_id": user.user_id,
            "client_name": client.get("name", ""),
            **data,
            "created_at": now,
            "updated_at": now
        }
        
        await db.birth_records.insert_one(birth_record)
        message = "Birth record created"
    
    # Also update client's birth_date if provided
    if data.get("birth_date"):
        await db.clients.update_one(
            {"client_id": client_id},
            {"$set": {"birth_date": data["birth_date"]}}
        )
    
    return {"message": message}


# ============== DASHBOARD ROUTES ==============

@router.get("/provider/dashboard")
async def get_dashboard(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get unified dashboard stats for provider"""
    now = get_now()
    today = now.strftime("%Y-%m-%d")
    
    # Get all clients and count active
    all_clients = await db.clients.find(
        {"provider_id": user.user_id},
        {"_id": 0, "client_id": 1, "due_date": 1, "birth_date": 1, "edd": 1, "status": 1}
    ).to_list(500)
    
    active_clients = [c for c in all_clients if is_client_active(c)]
    
    # Count upcoming appointments for active clients
    upcoming_appointments = await db.appointments.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["scheduled", "confirmed", "accepted", "pending"]},
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
    
    # Count pending contracts and invoices
    contracts_pending = await db.contracts.count_documents({
        "$or": [
            {"provider_id": user.user_id},
            {"doula_id": user.user_id},
            {"midwife_id": user.user_id}
        ],
        "status": {"$in": ["Sent", "sent", "pending"]}
    })
    
    pending_invoices = await db.invoices.count_documents({
        "provider_id": user.user_id,
        "status": {"$in": ["Sent", "sent", "pending"]}
    })
    
    stats["contracts_pending_signature"] = contracts_pending
    stats["pending_invoices"] = pending_invoices
    
    # Role-specific stats
    if user.role == "MIDWIFE":
        # Count visits this month
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        visits_this_month = await db.visits.count_documents({
            "provider_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        prenatal_visits_this_month = await db.prenatal_visits.count_documents({
            "midwife_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        
        # Count births this month
        births_this_month = await db.birth_records.count_documents({
            "provider_id": user.user_id,
            "created_at": {"$gte": month_start}
        })
        
        # Count prenatal clients
        prenatal_count = len([c for c in active_clients if c.get("status") in ["Prenatal", "Active"]])
        
        stats["visits_this_month"] = visits_this_month + prenatal_visits_this_month
        stats["births_this_month"] = births_this_month
        stats["prenatal_clients"] = prenatal_count
    
    return stats
