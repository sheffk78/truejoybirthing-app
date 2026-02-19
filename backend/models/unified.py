"""
Unified Data Models for Client-Centered Architecture
All entities link back to client_id and provider_id
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ============== ENUMS ==============

class ProviderRole(str, Enum):
    DOULA = "DOULA"
    MIDWIFE = "MIDWIFE"

class AppointmentType(str, Enum):
    PRENATAL_VISIT = "prenatal_visit"
    POSTPARTUM_VISIT = "postpartum_visit"
    BIRTH_PLANNING = "birth_planning_session"
    CONSULTATION = "consultation"
    HOME_VISIT = "home_visit"
    VIRTUAL = "virtual"

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class ClientStatus(str, Enum):
    # Shared statuses
    LEAD = "Lead"
    CONTRACT_SENT = "Contract Sent"
    CONTRACT_SIGNED = "Contract Signed"
    ACTIVE = "Active"
    PRENATAL = "Prenatal"
    IN_LABOR = "In Labor"
    POSTPARTUM = "Postpartum"
    COMPLETED = "Completed"

# ============== CLIENT/MOM MODELS ==============

class ClientBase(BaseModel):
    """Base client model - the central entity everything hangs off of"""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    due_date: Optional[str] = None  # Expected due date (EDD)
    birth_date: Optional[str] = None  # Actual birth date if delivered
    planned_birth_setting: Optional[str] = None
    status: str = "Active"

class ClientCreate(ClientBase):
    linked_mom_id: Optional[str] = None  # Link to MOM user if registered

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    due_date: Optional[str] = None
    birth_date: Optional[str] = None
    planned_birth_setting: Optional[str] = None
    status: Optional[str] = None

# ============== APPOINTMENT MODELS ==============

class AppointmentCreate(BaseModel):
    """Unified appointment creation - used by both moms and providers"""
    client_id: str  # Required: which client this is for
    provider_id: Optional[str] = None  # Set automatically if provider creates, or selected by mom
    start_datetime: str  # ISO datetime string
    end_datetime: Optional[str] = None  # Optional end time
    duration_minutes: int = 60  # Default 1 hour
    appointment_type: str  # prenatal_visit, postpartum_visit, consultation, etc.
    location: Optional[str] = None
    is_virtual: bool = False
    notes: Optional[str] = None  # Private notes (visible to provider only)
    client_notes: Optional[str] = None  # Notes visible to client

class AppointmentUpdate(BaseModel):
    start_datetime: Optional[str] = None
    end_datetime: Optional[str] = None
    duration_minutes: Optional[int] = None
    appointment_type: Optional[str] = None
    location: Optional[str] = None
    is_virtual: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    client_notes: Optional[str] = None

# ============== VISIT MODELS (MIDWIFE-SPECIFIC) ==============

class VisitCreate(BaseModel):
    """Visit data - clinical records linked to an appointment"""
    client_id: str
    appointment_id: Optional[str] = None  # Link to appointment (required for new visits)
    visit_date: str
    visit_type: str = "Prenatal"  # Prenatal, Postpartum
    
    # Vitals & Measurements
    blood_pressure: Optional[str] = None
    fetal_heart_rate: Optional[int] = None
    fundal_height: Optional[float] = None
    weight: Optional[float] = None
    weight_unit: str = "lbs"
    urinalysis: Optional[str] = None
    urinalysis_note: Optional[str] = None
    
    # Well-being scores (1-5)
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
    
    # General
    general_notes: Optional[str] = None

class VisitUpdate(BaseModel):
    visit_date: Optional[str] = None
    visit_type: Optional[str] = None
    blood_pressure: Optional[str] = None
    fetal_heart_rate: Optional[int] = None
    fundal_height: Optional[float] = None
    weight: Optional[float] = None
    weight_unit: Optional[str] = None
    urinalysis: Optional[str] = None
    urinalysis_note: Optional[str] = None
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

# ============== NOTE MODELS ==============

class NoteCreate(BaseModel):
    """Notes linked to client and provider"""
    client_id: str
    note_type: str = "General"  # Prenatal, Birth, Postpartum, General
    title: Optional[str] = None
    content: str
    is_private: bool = True  # Private = provider only, False = shared with client

class NoteUpdate(BaseModel):
    note_type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    is_private: Optional[bool] = None

# ============== MESSAGE THREAD MODELS ==============

class MessageThreadCreate(BaseModel):
    """Message thread between client and provider"""
    client_id: str
    # provider_id set automatically from logged-in user

class MessageCreate(BaseModel):
    """Individual message in a thread"""
    thread_id: Optional[str] = None  # If adding to existing thread
    client_id: Optional[str] = None  # If creating new thread
    content: str

# ============== CONTRACT MODELS (already client-centered) ==============

# Contracts already have client_id and provider_id - no changes needed

# ============== INVOICE MODELS (already client-centered) ==============

# Invoices already have client_id and pro_user_id - no changes needed

# ============== BIRTH RECORD MODELS ==============

class BirthRecordCreate(BaseModel):
    """Birth information for a client"""
    client_id: str
    birth_date: str
    birth_time: Optional[str] = None
    birth_location: Optional[str] = None
    birth_type: Optional[str] = None  # Spontaneous Vaginal, Cesarean, etc.
    baby_weight: Optional[str] = None
    baby_length: Optional[str] = None
    baby_name: Optional[str] = None
    baby_gender: Optional[str] = None
    apgar_1min: Optional[int] = None
    apgar_5min: Optional[int] = None
    notes: Optional[str] = None

class BirthRecordUpdate(BaseModel):
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    birth_location: Optional[str] = None
    birth_type: Optional[str] = None
    baby_weight: Optional[str] = None
    baby_length: Optional[str] = None
    baby_name: Optional[str] = None
    baby_gender: Optional[str] = None
    apgar_1min: Optional[int] = None
    apgar_5min: Optional[int] = None
    notes: Optional[str] = None
