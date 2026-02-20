"""
Unified Appointments Routes

This module provides a single, unified appointments system that works for both
Moms and Providers (Doulas/Midwives). All appointments are stored in a single
collection and can be viewed from either side.

Key fields:
- appointment_id: Unique identifier
- client_id: The client record (required for provider-created)
- mom_user_id: The Mom's user_id (for Mom visibility)
- provider_id: The Provider's user_id (null for "other" appointments)
- created_by: "mom" or "provider"
- status: pending, scheduled, confirmed, accepted, declined, cancelled, completed
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime

from .dependencies import (
    db, check_role, User, create_notification, get_now, generate_id
)

router = APIRouter(tags=["Appointments"])


# ============== AUTHENTICATION HELPER ==============

async def verify_token_and_get_user(authorization: str = None) -> User:
    """Verify JWT token and return user"""
    if not authorization or not authorization.startswith("Bearer "):
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    session = await db.user_sessions.find_one({"session_token": token})
    if not session:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_data = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_data)


from fastapi import Header

async def get_current_user(authorization: str = Header(None)) -> User:
    """Dependency to get current user from token"""
    return await verify_token_and_get_user(authorization)


# ============== SHARED APPOINTMENT ENDPOINTS ==============

@router.get("/appointments")
async def get_appointments(user: User = Depends(get_current_user)):
    """
    Get appointments for the current user (works for Mom or Provider).
    Returns appointments where user is either the mom or the provider.
    """
    if user.role == "MOM":
        # Mom sees appointments where she's the mom_user_id OR mom_id
        query = {"$or": [
            {"mom_user_id": user.user_id},
            {"mom_id": user.user_id}
        ]}
        # Exclude provider's private notes
        projection = {"_id": 0, "notes": 0}
    else:
        # Provider sees appointments where they're the provider_id
        query = {"provider_id": user.user_id}
        projection = {"_id": 0}
    
    appointments = await db.appointments.find(query, projection).sort("appointment_date", 1).to_list(500)
    
    # Enrich with provider/client info
    for appt in appointments:
        if user.role == "MOM" and appt.get("provider_id"):
            # Get provider info for Mom's view
            provider = await db.users.find_one(
                {"user_id": appt["provider_id"]},
                {"_id": 0, "full_name": 1, "role": 1, "picture": 1}
            )
            if provider:
                appt["provider_name"] = provider.get("full_name")
                appt["provider_role"] = provider.get("role")
                appt["provider_picture"] = provider.get("picture")
        elif user.role in ["DOULA", "MIDWIFE"]:
            # Get client info for Provider's view
            if appt.get("client_id"):
                client = await db.clients.find_one(
                    {"client_id": appt["client_id"]},
                    {"_id": 0, "name": 1, "picture": 1, "linked_mom_id": 1}
                )
                if client:
                    appt["client_name"] = client.get("name")
                    # Get picture from linked mom if not on client
                    if not client.get("picture") and client.get("linked_mom_id"):
                        mom = await db.users.find_one(
                            {"user_id": client["linked_mom_id"]},
                            {"_id": 0, "picture": 1}
                        )
                        appt["client_picture"] = mom.get("picture") if mom else None
                    else:
                        appt["client_picture"] = client.get("picture")
    
    return appointments


@router.post("/appointments")
async def create_appointment(data: dict, user: User = Depends(get_current_user)):
    """
    Create an appointment (works for Mom or Provider).
    
    For Provider: Requires client_id, creates appointment visible to both sides.
    For Mom: Requires provider_id (can be null for "other" appointments).
    """
    now = get_now()
    appointment_id = generate_id("appt")
    
    # Parse date/time fields - support multiple formats
    appointment_date = data.get("appointment_date") or data.get("date")
    appointment_time = data.get("appointment_time") or data.get("time") or "09:00"
    
    if not appointment_date:
        raise HTTPException(status_code=400, detail="appointment_date is required")
    
    # Build start_datetime
    start_datetime = f"{appointment_date}T{appointment_time}:00"
    
    appointment = {
        "appointment_id": appointment_id,
        "title": data.get("title") or data.get("appointment_type", "Appointment").replace("_", " ").title(),
        "appointment_date": appointment_date,
        "appointment_time": appointment_time,
        "start_datetime": start_datetime,
        "duration_minutes": data.get("duration_minutes", 60),
        "appointment_type": data.get("appointment_type", "consultation"),
        "location": data.get("location"),
        "is_virtual": data.get("is_virtual", False),
        "description": data.get("description") or data.get("notes") or data.get("client_notes"),
        "created_at": now,
        "updated_at": now
    }
    
    if user.role == "MOM":
        # Mom creating appointment
        appointment["mom_user_id"] = user.user_id
        appointment["mom_id"] = user.user_id
        appointment["mom_name"] = user.full_name
        appointment["created_by"] = "mom"
        
        provider_id = data.get("provider_id")
        
        if provider_id and provider_id != "none":
            # Appointment with a connected provider
            # Verify provider is in mom's team
            share_request = await db.share_requests.find_one({
                "mom_user_id": user.user_id,
                "provider_id": provider_id,
                "status": "accepted"
            })
            
            if not share_request:
                raise HTTPException(status_code=403, detail="Not connected with this provider")
            
            # Get provider info
            provider = await db.users.find_one(
                {"user_id": provider_id},
                {"_id": 0, "full_name": 1, "role": 1}
            )
            
            # Find client record for this mom-provider relationship
            client = await db.clients.find_one(
                {"provider_id": provider_id, "linked_mom_id": user.user_id},
                {"_id": 0, "client_id": 1, "name": 1}
            )
            
            appointment["provider_id"] = provider_id
            appointment["provider_name"] = provider.get("full_name") if provider else None
            appointment["provider_role"] = provider.get("role") if provider else None
            appointment["client_id"] = client["client_id"] if client else None
            appointment["client_name"] = client.get("name") if client else user.full_name
            appointment["status"] = "pending"  # Provider needs to confirm
            
            # Notify provider
            await create_notification(
                user_id=provider_id,
                notif_type="appointment_request",
                title="New Appointment Request",
                message=f"{user.full_name} requested an appointment for {appointment_date}",
                data={"appointment_id": appointment_id}
            )
        else:
            # Personal/other appointment (doctor visit, etc.) - no provider
            appointment["provider_id"] = None
            appointment["client_id"] = None
            appointment["status"] = "scheduled"  # Automatically confirmed
            appointment["title"] = data.get("title") or "Personal Appointment"
    
    else:
        # Provider creating appointment
        client_id = data.get("client_id")
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id is required")
        
        # Verify client belongs to provider
        client = await db.clients.find_one(
            {"client_id": client_id, "provider_id": user.user_id}
        )
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        appointment["provider_id"] = user.user_id
        appointment["provider_name"] = user.full_name
        appointment["provider_role"] = user.role
        appointment["client_id"] = client_id
        appointment["client_name"] = client.get("name", "")
        appointment["created_by"] = "provider"
        appointment["status"] = data.get("status", "scheduled")
        appointment["notes"] = data.get("notes")  # Private provider notes
        
        # If client has linked_mom_id, make visible to mom
        if client.get("linked_mom_id"):
            appointment["mom_user_id"] = client["linked_mom_id"]
            appointment["mom_id"] = client["linked_mom_id"]
            appointment["mom_name"] = client.get("name", "")
            
            # Notify Mom
            await create_notification(
                user_id=client["linked_mom_id"],
                notif_type="appointment_scheduled",
                title="New Appointment Scheduled",
                message=f"{user.full_name} scheduled an appointment for {appointment_date}",
                data={"appointment_id": appointment_id, "provider_id": user.user_id}
            )
    
    await db.appointments.insert_one(appointment)
    appointment.pop("_id", None)
    
    return {"message": "Appointment created", "appointment": appointment}


@router.put("/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, data: dict, user: User = Depends(get_current_user)):
    """Update an appointment"""
    # Build query based on user role
    if user.role == "MOM":
        query = {
            "appointment_id": appointment_id,
            "$or": [{"mom_user_id": user.user_id}, {"mom_id": user.user_id}]
        }
    else:
        query = {"appointment_id": appointment_id, "provider_id": user.user_id}
    
    appt = await db.appointments.find_one(query)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = get_now()
    
    # Define allowed fields based on role
    if user.role == "MOM":
        allowed_fields = ["appointment_date", "appointment_time", "location", "is_virtual", 
                         "description", "title", "appointment_type"]
    else:
        allowed_fields = ["appointment_date", "appointment_time", "start_datetime", "duration_minutes",
                         "appointment_type", "location", "is_virtual", "status", "notes", "description"]
    
    update_dict = {k: v for k, v in data.items() if k in allowed_fields}
    update_dict["updated_at"] = now
    
    # Rebuild start_datetime if date/time changed
    if "appointment_date" in update_dict or "appointment_time" in update_dict:
        apt_date = update_dict.get("appointment_date", appt.get("appointment_date"))
        apt_time = update_dict.get("appointment_time", appt.get("appointment_time", "09:00"))
        if apt_date:
            update_dict["start_datetime"] = f"{apt_date}T{apt_time}:00"
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": update_dict}
    )
    
    return {"message": "Appointment updated"}


@router.put("/appointments/{appointment_id}/respond")
async def respond_to_appointment(appointment_id: str, data: dict, user: User = Depends(get_current_user)):
    """
    Respond to an appointment (accept/decline).
    Mom responds to provider-created appointments.
    Provider responds to mom-created appointments.
    """
    response = data.get("response") or data.get("status")
    if response not in ["accepted", "declined", "confirmed"]:
        raise HTTPException(status_code=400, detail="Response must be 'accepted', 'declined', or 'confirmed'")
    
    # Find the appointment
    appt = await db.appointments.find_one({"appointment_id": appointment_id})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify user can respond
    if user.role == "MOM":
        if appt.get("mom_user_id") != user.user_id and appt.get("mom_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    else:
        if appt.get("provider_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    now = get_now()
    status = "confirmed" if response in ["accepted", "confirmed"] else "declined"
    
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": status, "updated_at": now, "responded_at": now}}
    )
    
    # Send notification to the other party
    if user.role == "MOM" and appt.get("provider_id"):
        await create_notification(
            user_id=appt["provider_id"],
            notif_type="appointment_response",
            title=f"Appointment {status.title()}",
            message=f"{user.full_name} has {status} the appointment",
            data={"appointment_id": appointment_id, "status": status}
        )
    elif user.role in ["DOULA", "MIDWIFE"] and appt.get("mom_user_id"):
        await create_notification(
            user_id=appt["mom_user_id"],
            notif_type="appointment_response",
            title=f"Appointment {status.title()}",
            message=f"{user.full_name} has {status} your appointment request",
            data={"appointment_id": appointment_id, "status": status}
        )
    
    return {"message": f"Appointment {status}"}


@router.delete("/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str, user: User = Depends(get_current_user)):
    """Cancel an appointment"""
    # Build query based on user role
    if user.role == "MOM":
        query = {
            "appointment_id": appointment_id,
            "$or": [{"mom_user_id": user.user_id}, {"mom_id": user.user_id}]
        }
    else:
        query = {"appointment_id": appointment_id, "provider_id": user.user_id}
    
    appt = await db.appointments.find_one(query)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    now = get_now()
    
    # Mark as cancelled instead of deleting
    await db.appointments.update_one(
        {"appointment_id": appointment_id},
        {"$set": {"status": "cancelled", "updated_at": now, "cancelled_by": user.role.lower()}}
    )
    
    # Notify the other party
    if user.role == "MOM" and appt.get("provider_id"):
        await create_notification(
            user_id=appt["provider_id"],
            notif_type="appointment_cancelled",
            title="Appointment Cancelled",
            message=f"{user.full_name} has cancelled the appointment",
            data={"appointment_id": appointment_id}
        )
    elif user.role in ["DOULA", "MIDWIFE"] and appt.get("mom_user_id"):
        await create_notification(
            user_id=appt["mom_user_id"],
            notif_type="appointment_cancelled",
            title="Appointment Cancelled",
            message=f"{user.full_name} has cancelled the appointment",
            data={"appointment_id": appointment_id}
        )
    
    return {"message": "Appointment cancelled"}


# ============== HELPER ENDPOINTS ==============

@router.get("/appointments/upcoming-count")
async def get_upcoming_count(user: User = Depends(get_current_user)):
    """Get count of upcoming appointments for dashboard"""
    today = get_now().strftime("%Y-%m-%d")
    
    if user.role == "MOM":
        query = {
            "$or": [{"mom_user_id": user.user_id}, {"mom_id": user.user_id}],
            "status": {"$in": ["scheduled", "confirmed", "accepted", "pending"]},
            "$or": [
                {"appointment_date": {"$gte": today}},
                {"start_datetime": {"$gte": today}}
            ]
        }
    else:
        query = {
            "provider_id": user.user_id,
            "status": {"$in": ["scheduled", "confirmed", "accepted", "pending"]},
            "$or": [
                {"appointment_date": {"$gte": today}},
                {"start_datetime": {"$gte": today}}
            ]
        }
    
    count = await db.appointments.count_documents(query)
    return {"count": count}


@router.get("/appointments/client/{client_id}")
async def get_client_appointments(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get appointments for a specific client (Provider only)"""
    # Verify client belongs to provider
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Build query to find appointments for this client
    query = {
        "provider_id": user.user_id,
        "$or": [{"client_id": client_id}]
    }
    
    # Also match by mom_user_id if client is linked
    if client.get("linked_mom_id"):
        query["$or"].append({"mom_user_id": client["linked_mom_id"]})
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("appointment_date", -1).to_list(100)
    
    return appointments


@router.get("/appointments/has-upcoming/{client_id}")
async def client_has_upcoming_appointment(client_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Check if client has any upcoming appointments (for badge display)"""
    today = get_now().strftime("%Y-%m-%d")
    
    # Get client to check linked_mom_id
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0, "linked_mom_id": 1}
    )
    
    if not client:
        return {"has_upcoming": False}
    
    # Build query
    query = {
        "provider_id": user.user_id,
        "status": {"$in": ["scheduled", "confirmed", "accepted", "pending"]},
        "$and": [
            {"$or": [{"client_id": client_id}]},
            {"$or": [
                {"appointment_date": {"$gte": today}},
                {"start_datetime": {"$gte": today}}
            ]}
        ]
    }
    
    if client.get("linked_mom_id"):
        query["$and"][0]["$or"].append({"mom_user_id": client["linked_mom_id"]})
    
    count = await db.appointments.count_documents(query)
    
    return {"has_upcoming": count > 0, "count": count}
