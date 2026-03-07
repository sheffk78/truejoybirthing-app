"""
Contraction Timer Routes
Phase 1 + Phase 2 - Contraction timing for Moms with team sharing

Phase 1 Features:
- Start/stop contraction timing
- Session management (active, paused, ended)
- History with edit/delete capability
- Manual contraction entry
- 5-1-1 rule detection
- Team sharing opt-in
- Exportable summary

Phase 2 Features:
- Birth-plan-aware language (contractions/surges/waves)
- Custom alert thresholds (5-1-1, 4-1-1, etc.)
- Water breaking tracking
- Enhanced notes (per contraction & session level)
- Primary labor session marking
- Visual charts (frontend)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, timezone, timedelta
import uuid

from .dependencies import (
    db, get_current_user, check_role, generate_id, get_now,
    create_notification, User
)

router = APIRouter(prefix="/contractions", tags=["contractions"])

# ============== DATA MODELS ==============

# Phase 2: Timer Preferences
class TimerPreferences(BaseModel):
    """Mom's contraction timer preferences"""
    birth_word: Literal["contractions", "surges", "waves"] = "contractions"
    alert_threshold: Literal["5-1-1", "4-1-1", "3-1-1", "custom", "none"] = "5-1-1"
    custom_interval_minutes: Optional[int] = None  # For custom threshold
    custom_duration_seconds: Optional[int] = None  # For custom threshold
    custom_sustained_minutes: Optional[int] = None  # For custom threshold

class TimerPreferencesUpdate(BaseModel):
    """Update timer preferences"""
    birth_word: Optional[Literal["contractions", "surges", "waves"]] = None
    alert_threshold: Optional[Literal["5-1-1", "4-1-1", "3-1-1", "custom", "none"]] = None
    custom_interval_minutes: Optional[int] = None
    custom_duration_seconds: Optional[int] = None
    custom_sustained_minutes: Optional[int] = None

# Phase 2: Water Breaking
class WaterBreakingRecord(BaseModel):
    """Record water breaking event"""
    water_broke_at: Optional[str] = None  # ISO datetime
    water_broke_note: Optional[str] = None  # Color, amount, clarity

class ContractionBase(BaseModel):
    """Individual contraction record"""
    start_time: str  # ISO datetime
    end_time: Optional[str] = None  # ISO datetime
    intensity: Optional[Literal["MILD", "MODERATE", "STRONG"]] = None
    notes: Optional[str] = None
    source: Literal["TIMER", "MANUAL"] = "TIMER"

class ContractionCreate(ContractionBase):
    """Create a new contraction"""
    pass

class ContractionUpdate(BaseModel):
    """Update an existing contraction"""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    intensity: Optional[Literal["MILD", "MODERATE", "STRONG"]] = None
    notes: Optional[str] = None

class ContractionSessionCreate(BaseModel):
    """Create a new contraction session"""
    is_shared_with_doula: bool = False
    is_shared_with_midwife: bool = False

class ContractionSessionUpdate(BaseModel):
    """Update session sharing preferences and Phase 2 fields"""
    status: Optional[Literal["ACTIVE", "PAUSED", "ENDED"]] = None
    is_shared_with_doula: Optional[bool] = None
    is_shared_with_midwife: Optional[bool] = None
    # Phase 2 fields
    session_notes: Optional[str] = None
    is_primary_labor_session: Optional[bool] = None
    water_broke_at: Optional[str] = None
    water_broke_note: Optional[str] = None

class SharingPreferences(BaseModel):
    """Sharing preferences for contraction data"""
    share_with_doula: bool = False
    share_with_midwife: bool = False


# ============== HELPER FUNCTIONS ==============

async def get_mom_timer_preferences(mom_id: str) -> dict:
    """Get Mom's timer preferences (birth word, alert threshold)"""
    prefs = await db.timer_preferences.find_one({"user_id": mom_id})
    if prefs:
        prefs.pop("_id", None)
        return prefs
    # Return defaults
    return {
        "user_id": mom_id,
        "birth_word": "contractions",
        "alert_threshold": "5-1-1",
        "custom_interval_minutes": None,
        "custom_duration_seconds": None,
        "custom_sustained_minutes": None
    }

def get_threshold_params(threshold: str, prefs: dict = None) -> tuple:
    """Get interval, duration, sustained time for a threshold"""
    thresholds = {
        "5-1-1": (5 * 60, 60, 60),   # 5 min apart, 1 min duration, 1 hour sustained
        "4-1-1": (4 * 60, 60, 60),   # 4 min apart, 1 min duration, 1 hour sustained
        "3-1-1": (3 * 60, 60, 60),   # 3 min apart, 1 min duration, 1 hour sustained
    }
    if threshold in thresholds:
        return thresholds[threshold]
    if threshold == "custom" and prefs:
        return (
            (prefs.get("custom_interval_minutes") or 5) * 60,
            prefs.get("custom_duration_seconds") or 60,
            (prefs.get("custom_sustained_minutes") or 60)
        )
    return thresholds["5-1-1"]  # Default to 5-1-1

def calculate_duration_seconds(start_time: str, end_time: str) -> int:
    """Calculate duration in seconds between two ISO datetime strings"""
    start = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    end = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    return int((end - start).total_seconds())

def calculate_interval_seconds(current_start: str, previous_start: str) -> int:
    """Calculate interval in seconds between two contraction start times"""
    current = datetime.fromisoformat(current_start.replace('Z', '+00:00'))
    previous = datetime.fromisoformat(previous_start.replace('Z', '+00:00'))
    return int((current - previous).total_seconds())

def format_duration(seconds: int) -> str:
    """Format seconds as mm:ss string"""
    if seconds is None or seconds < 0:
        return "00:00"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes:02d}:{secs:02d}"

def check_511_pattern(contractions: List[dict], prefs: dict = None, birth_word: str = "contractions") -> dict:
    """
    Check for pattern based on threshold (5-1-1, 4-1-1, 3-1-1, or custom)
    
    Args:
        contractions: List of contraction records
        prefs: Timer preferences with threshold settings
        birth_word: The user's preferred term for contractions
    
    Returns dict with pattern status and details
    """
    # Get threshold parameters
    threshold = "5-1-1"
    if prefs:
        threshold = prefs.get("alert_threshold", "5-1-1")
    
    if threshold == "none":
        return {
            "pattern_reached": False,
            "status": "tracking_only",
            "message": f"Keep timing {birth_word}",
            "threshold_type": "none"
        }
    
    interval_max, duration_min, sustained_min = get_threshold_params(threshold, prefs)
    
    if len(contractions) < 3:
        return {
            "pattern_reached": False,
            "status": "early_labor",
            "message": f"Keep timing {birth_word}",
            "threshold_type": threshold
        }
    
    # Sort by start time (newest first in our data, so reverse)
    sorted_contractions = sorted(
        [c for c in contractions if c.get('duration_seconds') and c.get('interval_seconds_to_previous')],
        key=lambda x: x['start_time']
    )
    
    if len(sorted_contractions) < 3:
        return {
            "pattern_reached": False,
            "status": "early_labor",
            "message": f"Keep timing {birth_word}",
            "threshold_type": threshold
        }
    
    # Check last 90 minutes of contractions
    ninety_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=90)
    recent_contractions = [
        c for c in sorted_contractions
        if datetime.fromisoformat(c['start_time'].replace('Z', '+00:00')) > ninety_mins_ago
    ]
    
    if len(recent_contractions) < 4:
        return {
            "pattern_reached": False,
            "status": "early_labor",
            "message": f"Keep timing {birth_word}",
            "threshold_type": threshold
        }
    
    # Count contractions meeting criteria
    qualifying_count = 0
    pattern_start_time = None
    
    for c in recent_contractions:
        duration = c.get('duration_seconds', 0) or 0
        interval = c.get('interval_seconds_to_previous', 999) or 999
        
        if duration >= duration_min and interval <= interval_max:
            qualifying_count += 1
            if pattern_start_time is None:
                pattern_start_time = c['start_time']
        else:
            # Pattern broken, reset
            qualifying_count = 0
            pattern_start_time = None
    
    # Check if pattern sustained for required time
    if qualifying_count >= 4 and pattern_start_time:
        pattern_start = datetime.fromisoformat(pattern_start_time.replace('Z', '+00:00'))
        pattern_duration = (datetime.now(timezone.utc) - pattern_start).total_seconds() / 60
        
        if pattern_duration >= sustained_min:
            # Generate personalized message
            interval_mins = interval_max // 60
            duration_mins = duration_min // 60
            
            if threshold == "custom":
                message = f"Your {birth_word} are meeting your custom alert criteria. It may be time to call your care provider."
            else:
                message = f"Your {birth_word} have been about {interval_mins} minutes apart, lasting around {duration_mins} minute, for about an hour. It may be time to consider heading to your birth place or calling your provider."
            
            return {
                "pattern_reached": True,
                "status": f"{threshold.replace('-', '')}_reached",
                "message": message,
                "pattern_duration_minutes": int(pattern_duration),
                "threshold_type": threshold
            }
        else:
            return {
                "pattern_reached": False,
                "status": "progressing",
                "message": f"Pattern progressing ({int(pattern_duration)} minutes). Keep monitoring.",
                "pattern_duration_minutes": int(pattern_duration),
                "threshold_type": threshold
            }
    
    # Check if progressing (some qualifying contractions)
    if qualifying_count >= 2:
        return {
            "pattern_reached": False,
            "status": "progressing",
            "message": f"Your {birth_word} are getting closer. Keep timing.",
            "threshold_type": threshold
        }
    
    return {
        "pattern_reached": False,
        "status": "early_labor",
        "message": f"Early labor. Rest when you can.",
        "threshold_type": threshold
    }


async def notify_team_water_broke(mom_id: str, mom_name: str, session_id: str, water_note: str = None):
    """Send notifications to team when mom's water breaks"""
    try:
        session = await db.contraction_sessions.find_one({"session_id": session_id})
        if not session:
            return
            
        share_requests = await db.share_requests.find({
            "mom_id": mom_id,
            "status": "accepted"
        }).to_list(100)
        
        note_part = f" Note: {water_note}" if water_note else ""
        
        for request in share_requests:
            provider_id = request.get("provider_id")
            provider_role = request.get("provider_role", "").upper()
            
            if provider_role == "DOULA" and session.get("is_shared_with_doula"):
                await create_notification(
                    user_id=provider_id,
                    notif_type="water_broke",
                    title="Client's Water Broke",
                    message=f"{mom_name}'s water has broken.{note_part}",
                    data={"mom_id": mom_id, "session_id": session_id}
                )
            elif provider_role == "MIDWIFE" and session.get("is_shared_with_midwife"):
                await create_notification(
                    user_id=provider_id,
                    notif_type="water_broke",
                    title="Client's Water Broke",
                    message=f"{mom_name}'s water has broken.{note_part}",
                    data={"mom_id": mom_id, "session_id": session_id}
                )
    except Exception as e:
        print(f"Error notifying team of water breaking: {e}")


async def notify_team_session_start(mom_id: str, mom_name: str, session: dict):
    """Send notifications to team when mom starts timing"""
    try:
        # Get mom's team from share_requests
        share_requests = await db.share_requests.find({
            "mom_id": mom_id,
            "status": "accepted"
        }).to_list(100)
        
        for request in share_requests:
            provider_id = request.get("provider_id")
            provider_role = request.get("provider_role", "").upper()
            
            # Check if mom opted to share with this provider type
            if provider_role == "DOULA" and session.get("is_shared_with_doula"):
                await create_notification(
                    user_id=provider_id,
                    notif_type="contraction_session_started",
                    title="Client Started Timing Contractions",
                    message=f"{mom_name} has started timing contractions.",
                    data={"mom_id": mom_id, "session_id": session.get("session_id")}
                )
            elif provider_role == "MIDWIFE" and session.get("is_shared_with_midwife"):
                await create_notification(
                    user_id=provider_id,
                    notif_type="contraction_session_started",
                    title="Client Started Timing Contractions",
                    message=f"{mom_name} has started timing contractions.",
                    data={"mom_id": mom_id, "session_id": session.get("session_id")}
                )
    except Exception as e:
        print(f"Error notifying team: {e}")


async def notify_team_511_reached(mom_id: str, mom_name: str, session_id: str):
    """Send notifications to team when 5-1-1 pattern is reached"""
    try:
        session = await db.contraction_sessions.find_one({"session_id": session_id})
        if not session:
            return
            
        share_requests = await db.share_requests.find({
            "mom_id": mom_id,
            "status": "accepted"
        }).to_list(100)
        
        for request in share_requests:
            provider_id = request.get("provider_id")
            provider_role = request.get("provider_role", "").upper()
            
            if provider_role == "DOULA" and session.get("is_shared_with_doula"):
                await create_notification(
                    user_id=provider_id,
                    notif_type="contraction_511_reached",
                    title="5-1-1 Pattern Reached",
                    message=f"{mom_name}'s contractions are in a 5-1-1 pattern.",
                    data={"mom_id": mom_id, "session_id": session_id}
                )
            elif provider_role == "MIDWIFE" and session.get("is_shared_with_midwife"):
                await create_notification(
                    user_id=provider_id,
                    notif_type="contraction_511_reached",
                    title="5-1-1 Pattern Reached",
                    message=f"{mom_name}'s contractions are in a 5-1-1 pattern.",
                    data={"mom_id": mom_id, "session_id": session_id}
                )
    except Exception as e:
        print(f"Error notifying team of 5-1-1: {e}")


# ============== SESSION ENDPOINTS ==============

@router.get("/session/active")
async def get_active_session(user: User = Depends(get_current_user())):
    """Get the active contraction session for the current mom"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can access contraction timer")
    
    session = await db.contraction_sessions.find_one({
        "mom_id": user.user_id,
        "status": {"$in": ["ACTIVE", "PAUSED"]}
    }, {"_id": 0})
    
    # Get preferences for pattern checking and UI
    prefs = await get_mom_timer_preferences(user.user_id)
    birth_word = prefs.get("birth_word", "contractions")
    
    if not session:
        return {
            "session": None, 
            "contractions": [], 
            "stats": None, 
            "pattern_status": None,
            "preferences": prefs
        }
    
    # Get all contractions for this session
    contractions = await db.contractions.find({
        "session_id": session["session_id"]
    }, {"_id": 0}).sort("start_time", -1).to_list(1000)
    
    # Calculate stats
    stats = calculate_session_stats(contractions)
    
    # Check pattern with user's threshold preference
    pattern_status = check_511_pattern(contractions, prefs, birth_word)
    
    return {
        "session": session,
        "contractions": contractions,
        "stats": stats,
        "pattern_status": pattern_status,
        "preferences": prefs
    }


@router.post("/session/start")
async def start_session(
    data: ContractionSessionCreate,
    user: User = Depends(get_current_user())
):
    """Start a new contraction timing session"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can start contraction sessions")
    
    # Check for existing active session
    existing = await db.contraction_sessions.find_one({
        "mom_id": user.user_id,
        "status": {"$in": ["ACTIVE", "PAUSED"]}
    })
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail="You already have an active session. Please end it before starting a new one."
        )
    
    now = get_now().isoformat()
    session = {
        "session_id": generate_id("sess"),
        "mom_id": user.user_id,
        "started_at": now,
        "ended_at": None,
        "status": "ACTIVE",
        "is_shared_with_doula": data.is_shared_with_doula,
        "is_shared_with_midwife": data.is_shared_with_midwife,
        "contraction_count": 0,
        "average_duration_seconds": 0,
        "average_interval_seconds": 0,
        "pattern_511_reached": False,
        "pattern_511_notified": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.contraction_sessions.insert_one(session)
    
    # Notify team if sharing is enabled
    if data.is_shared_with_doula or data.is_shared_with_midwife:
        await notify_team_session_start(user.user_id, user.full_name, session)
    
    # Remove MongoDB _id before returning
    session.pop("_id", None)
    
    return {"session": session, "message": "Session started"}


@router.put("/session/{session_id}")
async def update_session(
    session_id: str,
    data: ContractionSessionUpdate,
    user: User = Depends(get_current_user())
):
    """Update session status or sharing preferences"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can update their sessions")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = {"updated_at": get_now().isoformat()}
    
    if data.status is not None:
        update_data["status"] = data.status
        if data.status == "ENDED":
            update_data["ended_at"] = get_now().isoformat()
    
    if data.is_shared_with_doula is not None:
        update_data["is_shared_with_doula"] = data.is_shared_with_doula
    
    if data.is_shared_with_midwife is not None:
        update_data["is_shared_with_midwife"] = data.is_shared_with_midwife
    
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": update_data}
    )
    
    updated = await db.contraction_sessions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    return {"session": updated}


@router.post("/session/{session_id}/end")
async def end_session(
    session_id: str,
    user: User = Depends(get_current_user())
):
    """End a contraction timing session"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can end their sessions")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["status"] == "ENDED":
        raise HTTPException(status_code=400, detail="Session already ended")
    
    now = get_now().isoformat()
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"status": "ENDED", "ended_at": now, "updated_at": now}}
    )
    
    updated = await db.contraction_sessions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    return {"session": updated, "message": "Session ended"}


@router.get("/sessions/history")
async def get_session_history(
    limit: int = 10,
    user: User = Depends(get_current_user())
):
    """Get past contraction sessions"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can view their session history")
    
    sessions = await db.contraction_sessions.find(
        {"mom_id": user.user_id},
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    
    return {"sessions": sessions}


# ============== CONTRACTION ENDPOINTS ==============

def calculate_session_stats(contractions: List[dict]) -> dict:
    """Calculate session statistics from contractions list"""
    if not contractions:
        return {
            "contraction_count": 0,
            "average_duration_seconds": 0,
            "average_duration_formatted": "00:00",
            "average_interval_seconds": 0,
            "average_interval_formatted": "00:00"
        }
    
    durations = [c["duration_seconds"] for c in contractions if c.get("duration_seconds")]
    intervals = [c["interval_seconds_to_previous"] for c in contractions if c.get("interval_seconds_to_previous")]
    
    avg_duration = int(sum(durations) / len(durations)) if durations else 0
    avg_interval = int(sum(intervals) / len(intervals)) if intervals else 0
    
    return {
        "contraction_count": len(contractions),
        "average_duration_seconds": avg_duration,
        "average_duration_formatted": format_duration(avg_duration),
        "average_interval_seconds": avg_interval,
        "average_interval_formatted": format_duration(avg_interval)
    }


@router.post("/start")
async def start_contraction(user: User = Depends(get_current_user())):
    """Start timing a contraction"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can time contractions")
    
    # Get active session
    session = await db.contraction_sessions.find_one({
        "mom_id": user.user_id,
        "status": "ACTIVE"
    })
    
    if not session:
        raise HTTPException(
            status_code=400, 
            detail="No active session. Please start a session first."
        )
    
    # Check for already running contraction
    running = await db.contractions.find_one({
        "session_id": session["session_id"],
        "end_time": None
    })
    
    if running:
        raise HTTPException(
            status_code=400,
            detail="A contraction is already in progress. Stop it first."
        )
    
    now = get_now().isoformat()
    contraction = {
        "contraction_id": generate_id("contr"),
        "mom_id": user.user_id,
        "session_id": session["session_id"],
        "start_time": now,
        "end_time": None,
        "duration_seconds": None,
        "interval_seconds_to_previous": None,
        "intensity": None,
        "notes": None,
        "source": "TIMER",
        "created_at": now,
        "updated_at": now
    }
    
    # Calculate interval from previous contraction
    previous = await db.contractions.find_one(
        {"session_id": session["session_id"], "end_time": {"$ne": None}},
        sort=[("start_time", -1)]
    )
    
    if previous:
        interval = calculate_interval_seconds(now, previous["start_time"])
        contraction["interval_seconds_to_previous"] = interval
    
    await db.contractions.insert_one(contraction)
    contraction.pop("_id", None)
    
    return {"contraction": contraction, "message": "Contraction started"}


@router.post("/stop")
async def stop_contraction(
    intensity: Optional[Literal["MILD", "MODERATE", "STRONG"]] = None,
    user: User = Depends(get_current_user())
):
    """Stop timing the current contraction"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can time contractions")
    
    # Find running contraction
    session = await db.contraction_sessions.find_one({
        "mom_id": user.user_id,
        "status": "ACTIVE"
    })
    
    if not session:
        raise HTTPException(status_code=400, detail="No active session")
    
    running = await db.contractions.find_one({
        "session_id": session["session_id"],
        "end_time": None
    })
    
    if not running:
        raise HTTPException(status_code=400, detail="No contraction in progress")
    
    now = get_now().isoformat()
    duration = calculate_duration_seconds(running["start_time"], now)
    
    update_data = {
        "end_time": now,
        "duration_seconds": duration,
        "updated_at": now
    }
    
    if intensity:
        update_data["intensity"] = intensity
    
    await db.contractions.update_one(
        {"contraction_id": running["contraction_id"]},
        {"$set": update_data}
    )
    
    # Update session stats
    all_contractions = await db.contractions.find({
        "session_id": session["session_id"],
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    stats = calculate_session_stats(all_contractions)
    
    await db.contraction_sessions.update_one(
        {"session_id": session["session_id"]},
        {"$set": {
            "contraction_count": stats["contraction_count"],
            "average_duration_seconds": stats["average_duration_seconds"],
            "average_interval_seconds": stats["average_interval_seconds"],
            "updated_at": now
        }}
    )
    
    # Check 5-1-1 pattern and notify if newly reached
    pattern_status = check_511_pattern(all_contractions)
    if pattern_status["pattern_reached"] and not session.get("pattern_511_notified"):
        await db.contraction_sessions.update_one(
            {"session_id": session["session_id"]},
            {"$set": {"pattern_511_reached": True, "pattern_511_notified": True}}
        )
        # Notify team
        await notify_team_511_reached(user.user_id, user.full_name, session["session_id"])
    
    # Get updated contraction
    updated = await db.contractions.find_one(
        {"contraction_id": running["contraction_id"]},
        {"_id": 0}
    )
    
    return {
        "contraction": updated,
        "stats": stats,
        "pattern_status": pattern_status,
        "message": "Contraction stopped"
    }


@router.post("/manual")
async def add_manual_contraction(
    data: ContractionCreate,
    user: User = Depends(get_current_user())
):
    """Add a manual contraction entry (for missed timings)"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can add contractions")
    
    # Get active session
    session = await db.contraction_sessions.find_one({
        "mom_id": user.user_id,
        "status": {"$in": ["ACTIVE", "PAUSED"]}
    })
    
    if not session:
        raise HTTPException(status_code=400, detail="No active session")
    
    now = get_now().isoformat()
    
    # Calculate duration if end_time provided
    duration_seconds = None
    if data.end_time:
        duration_seconds = calculate_duration_seconds(data.start_time, data.end_time)
    
    contraction = {
        "contraction_id": generate_id("contr"),
        "mom_id": user.user_id,
        "session_id": session["session_id"],
        "start_time": data.start_time,
        "end_time": data.end_time,
        "duration_seconds": duration_seconds,
        "interval_seconds_to_previous": None,
        "intensity": data.intensity,
        "notes": data.notes,
        "source": "MANUAL",
        "created_at": now,
        "updated_at": now
    }
    
    # Calculate interval from previous contraction
    previous = await db.contractions.find_one(
        {
            "session_id": session["session_id"],
            "start_time": {"$lt": data.start_time}
        },
        sort=[("start_time", -1)]
    )
    
    if previous:
        interval = calculate_interval_seconds(data.start_time, previous["start_time"])
        contraction["interval_seconds_to_previous"] = interval
    
    await db.contractions.insert_one(contraction)
    contraction.pop("_id", None)
    
    # Recalculate intervals for contractions after this one
    await recalculate_intervals(session["session_id"], data.start_time)
    
    # Update session stats
    all_contractions = await db.contractions.find({
        "session_id": session["session_id"],
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    stats = calculate_session_stats(all_contractions)
    
    await db.contraction_sessions.update_one(
        {"session_id": session["session_id"]},
        {"$set": {
            "contraction_count": stats["contraction_count"],
            "average_duration_seconds": stats["average_duration_seconds"],
            "average_interval_seconds": stats["average_interval_seconds"],
            "updated_at": now
        }}
    )
    
    return {"contraction": contraction, "stats": stats}


async def recalculate_intervals(session_id: str, from_time: str):
    """Recalculate intervals for contractions after a given time"""
    contractions = await db.contractions.find({
        "session_id": session_id,
        "start_time": {"$gte": from_time}
    }).sort("start_time", 1).to_list(1000)
    
    for i, c in enumerate(contractions):
        if i == 0:
            # Find the contraction before this one
            prev = await db.contractions.find_one({
                "session_id": session_id,
                "start_time": {"$lt": c["start_time"]}
            }, sort=[("start_time", -1)])
            
            if prev:
                interval = calculate_interval_seconds(c["start_time"], prev["start_time"])
                await db.contractions.update_one(
                    {"contraction_id": c["contraction_id"]},
                    {"$set": {"interval_seconds_to_previous": interval}}
                )
        else:
            prev = contractions[i - 1]
            interval = calculate_interval_seconds(c["start_time"], prev["start_time"])
            await db.contractions.update_one(
                {"contraction_id": c["contraction_id"]},
                {"$set": {"interval_seconds_to_previous": interval}}
            )


# ============== PHASE 2: PREFERENCES (MUST BE BEFORE WILDCARD ROUTES) ==============

@router.get("/preferences")
async def get_timer_preferences(user: User = Depends(get_current_user())):
    """Get Mom's contraction timer preferences"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can access timer preferences")
    
    prefs = await get_mom_timer_preferences(user.user_id)
    return {"preferences": prefs}


@router.put("/preferences")
async def update_timer_preferences(
    data: TimerPreferencesUpdate,
    user: User = Depends(get_current_user())
):
    """Update Mom's contraction timer preferences"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can update timer preferences")
    
    now = get_now().isoformat()
    update_data = {"user_id": user.user_id, "updated_at": now}
    
    if data.birth_word is not None:
        update_data["birth_word"] = data.birth_word
    if data.alert_threshold is not None:
        update_data["alert_threshold"] = data.alert_threshold
    if data.custom_interval_minutes is not None:
        update_data["custom_interval_minutes"] = data.custom_interval_minutes
    if data.custom_duration_seconds is not None:
        update_data["custom_duration_seconds"] = data.custom_duration_seconds
    if data.custom_sustained_minutes is not None:
        update_data["custom_sustained_minutes"] = data.custom_sustained_minutes
    
    await db.timer_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    prefs = await get_mom_timer_preferences(user.user_id)
    return {"preferences": prefs, "message": "Preferences updated"}


# ============== CONTRACTION CRUD (WILDCARD ROUTE - MUST BE AFTER SPECIFIC ROUTES) ==============

@router.put("/{contraction_id}")
async def update_contraction(
    contraction_id: str,
    data: ContractionUpdate,
    user: User = Depends(get_current_user())
):
    """Update a contraction entry"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can update their contractions")
    
    contraction = await db.contractions.find_one({
        "contraction_id": contraction_id,
        "mom_id": user.user_id
    })
    
    if not contraction:
        raise HTTPException(status_code=404, detail="Contraction not found")
    
    # Get the session to validate boundaries
    session = await db.contraction_sessions.find_one({
        "session_id": contraction["session_id"]
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Validate timestamp boundaries
    session_start = datetime.fromisoformat(session["started_at"].replace('Z', '+00:00'))
    session_end = None
    if session.get("ended_at"):
        session_end = datetime.fromisoformat(session["ended_at"].replace('Z', '+00:00'))
    
    if data.start_time is not None:
        new_start = datetime.fromisoformat(data.start_time.replace('Z', '+00:00'))
        if new_start < session_start:
            raise HTTPException(
                status_code=400, 
                detail="Contraction start time cannot be before session start time"
            )
        if session_end and new_start > session_end:
            raise HTTPException(
                status_code=400,
                detail="Contraction start time cannot be after session end time"
            )
    
    if data.end_time is not None:
        new_end = datetime.fromisoformat(data.end_time.replace('Z', '+00:00'))
        if new_end < session_start:
            raise HTTPException(
                status_code=400,
                detail="Contraction end time cannot be before session start time"
            )
        if session_end and new_end > session_end:
            raise HTTPException(
                status_code=400,
                detail="Contraction end time cannot be after session end time"
            )
    
    update_data = {"updated_at": get_now().isoformat()}
    
    if data.start_time is not None:
        update_data["start_time"] = data.start_time
    
    if data.end_time is not None:
        update_data["end_time"] = data.end_time
        start = data.start_time or contraction["start_time"]
        update_data["duration_seconds"] = calculate_duration_seconds(start, data.end_time)
    
    if data.intensity is not None:
        update_data["intensity"] = data.intensity
    
    if data.notes is not None:
        update_data["notes"] = data.notes
    
    await db.contractions.update_one(
        {"contraction_id": contraction_id},
        {"$set": update_data}
    )
    
    # If start_time changed, recalculate intervals
    if data.start_time:
        await recalculate_intervals(contraction["session_id"], data.start_time)
    
    updated = await db.contractions.find_one(
        {"contraction_id": contraction_id},
        {"_id": 0}
    )
    
    return {"contraction": updated}


@router.delete("/{contraction_id}")
async def delete_contraction(
    contraction_id: str,
    user: User = Depends(get_current_user())
):
    """Delete a contraction entry"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can delete their contractions")
    
    contraction = await db.contractions.find_one({
        "contraction_id": contraction_id,
        "mom_id": user.user_id
    })
    
    if not contraction:
        raise HTTPException(status_code=404, detail="Contraction not found")
    
    session_id = contraction["session_id"]
    start_time = contraction["start_time"]
    
    await db.contractions.delete_one({"contraction_id": contraction_id})
    
    # Recalculate intervals for remaining contractions
    await recalculate_intervals(session_id, start_time)
    
    # Update session stats
    all_contractions = await db.contractions.find({
        "session_id": session_id,
        "end_time": {"$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    stats = calculate_session_stats(all_contractions)
    
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "contraction_count": stats["contraction_count"],
            "average_duration_seconds": stats["average_duration_seconds"],
            "average_interval_seconds": stats["average_interval_seconds"],
            "updated_at": get_now().isoformat()
        }}
    )
    
    return {"message": "Contraction deleted", "stats": stats}


# ============== SUMMARY & EXPORT ==============

@router.get("/session/{session_id}/summary")
async def get_session_summary(
    session_id: str,
    user: User = Depends(get_current_user())
):
    """Get detailed summary of a contraction session"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can view their session summaries")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    }, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    contractions = await db.contractions.find({
        "session_id": session_id
    }, {"_id": 0}).sort("start_time", 1).to_list(1000)
    
    stats = calculate_session_stats(contractions)
    pattern_status = check_511_pattern(contractions)
    
    # Calculate intensity breakdown
    intensity_counts = {"MILD": 0, "MODERATE": 0, "STRONG": 0, "NOT_SET": 0}
    for c in contractions:
        intensity = c.get("intensity")
        if intensity in intensity_counts:
            intensity_counts[intensity] += 1
        else:
            intensity_counts["NOT_SET"] += 1
    
    return {
        "session": session,
        "contractions": contractions,
        "stats": stats,
        "pattern_status": pattern_status,
        "intensity_breakdown": intensity_counts
    }


@router.get("/session/{session_id}/export")
async def export_session_summary(
    session_id: str,
    user: User = Depends(get_current_user())
):
    """Export session summary as shareable text"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can export their sessions")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    }, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    contractions = await db.contractions.find({
        "session_id": session_id,
        "end_time": {"$ne": None}
    }, {"_id": 0}).sort("start_time", 1).to_list(1000)
    
    # Get mom's preferences for threshold info
    prefs = await get_mom_timer_preferences(user.user_id)
    birth_word = prefs.get("birth_word", "contractions")
    alert_threshold = prefs.get("alert_threshold", "5-1-1")
    
    stats = calculate_session_stats(contractions)
    pattern_status = check_511_pattern(contractions, prefs, birth_word)
    
    # Get mom's name and due date
    mom = await db.users.find_one({"user_id": user.user_id})
    mom_name = mom.get("full_name", "Mom") if mom else "Mom"
    
    # Get due date from profile
    mom_profile = await db.mom_profiles.find_one({"user_id": user.user_id})
    due_date = mom_profile.get("due_date") if mom_profile else None
    due_date_str = ""
    if due_date:
        try:
            due_dt = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
            due_date_str = due_dt.strftime("%B %d, %Y")
        except:
            due_date_str = str(due_date)
    
    # Format times
    started_at = session.get("started_at", "")
    ended_at = session.get("ended_at", "")
    
    if started_at:
        started_dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
        started_formatted = started_dt.strftime("%B %d, %Y at %I:%M %p")
        session_date = started_dt.strftime("%B %d, %Y")
    else:
        started_formatted = "N/A"
        session_date = "N/A"
    
    if ended_at:
        ended_dt = datetime.fromisoformat(ended_at.replace('Z', '+00:00'))
        ended_formatted = ended_dt.strftime("%B %d, %Y at %I:%M %p")
    else:
        ended_formatted = "Still active"
    
    # Format water breaking info
    water_broke_section = ""
    if session.get("water_broke_at"):
        water_dt = datetime.fromisoformat(session["water_broke_at"].replace('Z', '+00:00'))
        water_time_str = water_dt.strftime("%I:%M %p")
        water_note = session.get("water_broke_note", "")
        water_broke_section = f"""
WATER BREAKING
• Time: {water_time_str}
• Notes: {water_note if water_note else 'No notes'}
"""
    
    # Format session notes
    session_notes_section = ""
    if session.get("session_notes"):
        session_notes_section = f"""
SESSION NOTES
{session.get("session_notes")}
"""
    
    # Capitalize birth word for display
    birth_word_title = birth_word.title()
    
    # Build summary text
    summary_text = f"""
{birth_word_title.upper()} TIMING SUMMARY
{mom_name}
{"Due Date: " + due_date_str if due_date_str else ""}
Session Date: {session_date}

Session Started: {started_formatted}
Session Ended: {ended_formatted}

SUMMARY STATISTICS
• Total {birth_word_title}: {stats['contraction_count']}
• Average Duration: {stats['average_duration_formatted']}
• Average Interval: {stats['average_interval_formatted']}
{water_broke_section}
ALERT STATUS ({alert_threshold})
• Pattern Reached: {'Yes' if pattern_status['pattern_reached'] else 'No'}
• Status: {pattern_status['status'].replace('_', ' ').title()}
{session_notes_section}
{birth_word_title.upper()} LOG
"""
    
    for i, c in enumerate(contractions, 1):
        start_dt = datetime.fromisoformat(c['start_time'].replace('Z', '+00:00'))
        time_str = start_dt.strftime("%I:%M %p")
        duration = format_duration(c.get('duration_seconds', 0))
        interval = format_duration(c.get('interval_seconds_to_previous', 0)) if c.get('interval_seconds_to_previous') else "--:--"
        intensity = c.get('intensity', 'Not set')
        notes = c.get('notes', '')
        
        line = f"{i}. {time_str} | Duration: {duration} | Interval: {interval} | Intensity: {intensity}"
        if notes:
            line += f" | Notes: {notes[:50]}"
        summary_text += line + "\n"
    
    summary_text += f"""
---
Generated by True Joy Birthing
"""
    
    return {
        "summary_text": summary_text.strip(),
        "session": session,
        "stats": stats
    }


# ============== TEAM VIEW ENDPOINTS (For Doula/Midwife) ==============

@router.get("/team/client/{mom_id}")
async def get_client_contraction_data(
    mom_id: str,
    user: User = Depends(get_current_user())
):
    """Get contraction data for a specific client (for team members)"""
    if user.role not in ["DOULA", "MIDWIFE"]:
        raise HTTPException(status_code=403, detail="Only providers can access client data")
    
    # Verify provider has access to this client
    share_request = await db.share_requests.find_one({
        "mom_id": mom_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="You don't have access to this client's data")
    
    provider_role = user.role.upper()
    
    # Get active session if sharing is enabled for this provider type
    session = await db.contraction_sessions.find_one({
        "mom_id": mom_id,
        "status": {"$in": ["ACTIVE", "PAUSED"]},
        f"is_shared_with_{provider_role.lower()}": True
    }, {"_id": 0})
    
    if not session:
        return {
            "session": None,
            "contractions": [],
            "stats": None,
            "pattern_status": None,
            "message": "No active shared session"
        }
    
    # Get contractions
    contractions = await db.contractions.find({
        "session_id": session["session_id"]
    }, {"_id": 0}).sort("start_time", -1).to_list(1000)
    
    stats = calculate_session_stats(contractions)
    pattern_status = check_511_pattern(contractions)
    
    # Get mom info
    mom = await db.users.find_one({"user_id": mom_id}, {"_id": 0, "password": 0})
    
    return {
        "session": session,
        "contractions": contractions,
        "stats": stats,
        "pattern_status": pattern_status,
        "mom": mom
    }


@router.get("/team/active-clients")
async def get_clients_with_active_sessions(
    user: User = Depends(get_current_user())
):
    """Get list of clients currently timing contractions (for dashboard card)"""
    if user.role not in ["DOULA", "MIDWIFE"]:
        raise HTTPException(status_code=403, detail="Only providers can access this")
    
    provider_role = user.role.upper()
    share_field = f"is_shared_with_{provider_role.lower()}"
    
    # Get all accepted clients
    share_requests = await db.share_requests.find({
        "provider_id": user.user_id,
        "status": "accepted"
    }).to_list(100)
    
    mom_ids = [sr.get("mom_id") for sr in share_requests if sr.get("mom_id")]
    
    if not mom_ids:
        return {"active_clients": []}
    
    # Find active sessions shared with this provider
    active_sessions = await db.contraction_sessions.find({
        "mom_id": {"$in": mom_ids},
        "status": {"$in": ["ACTIVE", "PAUSED"]},
        share_field: True
    }, {"_id": 0}).to_list(100)
    
    result = []
    for session in active_sessions:
        # Get mom info
        mom = await db.users.find_one(
            {"user_id": session["mom_id"]},
            {"_id": 0, "password": 0, "full_name": 1, "user_id": 1, "picture": 1}
        )
        
        if not mom:
            continue
        
        # Get latest contraction
        latest = await db.contractions.find_one(
            {"session_id": session["session_id"]},
            sort=[("start_time", -1)]
        )
        
        last_contraction_ago = None
        if latest:
            latest_time = datetime.fromisoformat(latest["start_time"].replace('Z', '+00:00'))
            delta = datetime.now(timezone.utc) - latest_time
            last_contraction_ago = int(delta.total_seconds() / 60)  # minutes ago
        
        # Get mom's due date from profile
        mom_profile = await db.mom_profiles.find_one({"user_id": session["mom_id"]})
        due_date = mom_profile.get("due_date") if mom_profile else None
        
        result.append({
            "mom_id": session["mom_id"],
            "mom_name": mom.get("full_name", "Unknown"),
            "mom_picture": mom.get("picture"),
            "due_date": due_date,
            "session_id": session["session_id"],
            "session_status": session["status"],
            "contraction_count": session.get("contraction_count", 0),
            "average_duration_formatted": format_duration(session.get("average_duration_seconds", 0)),
            "average_interval_formatted": format_duration(session.get("average_interval_seconds", 0)),
            "last_contraction_minutes_ago": last_contraction_ago,
            "pattern_511_reached": session.get("pattern_511_reached", False)
        })
    
    return {"active_clients": result}



@router.get("/team/client/{mom_id}/history")
async def get_client_session_history(
    mom_id: str,
    limit: int = 10,
    user: User = Depends(get_current_user())
):
    """Get historical contraction sessions for a specific client (for team members)"""
    if user.role not in ["DOULA", "MIDWIFE"]:
        raise HTTPException(status_code=403, detail="Only providers can access client data")
    
    # Verify provider has access to this client
    share_request = await db.share_requests.find_one({
        "mom_id": mom_id,
        "provider_id": user.user_id,
        "status": "accepted"
    })
    
    if not share_request:
        raise HTTPException(status_code=403, detail="You don't have access to this client's data")
    
    provider_role = user.role.upper()
    share_field = f"is_shared_with_{provider_role.lower()}"
    
    # Get sessions that were shared with this provider type
    sessions = await db.contraction_sessions.find({
        "mom_id": mom_id,
        share_field: True
    }, {"_id": 0}).sort("started_at", -1).limit(limit).to_list(limit)
    
    # Get mom info
    mom = await db.users.find_one({"user_id": mom_id})
    if mom:
        mom.pop("_id", None)
        mom.pop("password", None)
        mom.pop("password_hash", None)
    
    return {
        "sessions": sessions,
        "mom": {"full_name": mom.get("full_name") if mom else None},
        "total_sessions": len(sessions)
    }


# ============== PHASE 2: WATER BREAKING ENDPOINTS ==============

@router.post("/session/{session_id}/water-broke")
async def record_water_breaking(
    session_id: str,
    data: WaterBreakingRecord,
    user: User = Depends(get_current_user())
):
    """Record that Mom's water has broken"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can record water breaking")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = get_now().isoformat()
    water_broke_at = data.water_broke_at or now
    
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "water_broke_at": water_broke_at,
            "water_broke_note": data.water_broke_note,
            "updated_at": now
        }}
    )
    
    # Notify team if sharing is enabled
    if session.get("is_shared_with_doula") or session.get("is_shared_with_midwife"):
        await notify_team_water_broke(
            user.user_id, 
            user.full_name, 
            session_id, 
            data.water_broke_note
        )
    
    updated = await db.contraction_sessions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    return {
        "session": updated,
        "message": "Water breaking recorded. Your care team has been notified."
    }


@router.delete("/session/{session_id}/water-broke")
async def clear_water_breaking(
    session_id: str,
    user: User = Depends(get_current_user())
):
    """Clear water breaking record (if recorded by mistake)"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can update their sessions")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = get_now().isoformat()
    
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "water_broke_at": None,
            "water_broke_note": None,
            "updated_at": now
        }}
    )
    
    updated = await db.contraction_sessions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    return {"session": updated, "message": "Water breaking record cleared"}


# ============== PHASE 2: SESSION NOTES ENDPOINTS ==============

@router.put("/session/{session_id}/notes")
async def update_session_notes(
    session_id: str,
    notes: str,
    user: User = Depends(get_current_user())
):
    """Update session-level notes"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can update their sessions")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = get_now().isoformat()
    
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_notes": notes,
            "updated_at": now
        }}
    )
    
    updated = await db.contraction_sessions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    return {"session": updated}


@router.put("/session/{session_id}/mark-primary")
async def mark_as_primary_labor_session(
    session_id: str,
    is_primary: bool = True,
    user: User = Depends(get_current_user())
):
    """Mark this session as THE primary labor session (for birth records)"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can update their sessions")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = get_now().isoformat()
    
    # If marking as primary, unmark any other primary sessions
    if is_primary:
        await db.contraction_sessions.update_many(
            {"mom_id": user.user_id, "is_primary_labor_session": True},
            {"$set": {"is_primary_labor_session": False, "updated_at": now}}
        )
    
    await db.contraction_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "is_primary_labor_session": is_primary,
            "updated_at": now
        }}
    )
    
    updated = await db.contraction_sessions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    return {
        "session": updated,
        "message": "Session marked as primary labor session" if is_primary else "Primary labor session unmarked"
    }


# ============== PHASE 2: CHART DATA ENDPOINT ==============

@router.get("/session/{session_id}/chart-data")
async def get_chart_data(
    session_id: str,
    user: User = Depends(get_current_user())
):
    """Get data formatted for duration/interval charts"""
    if user.role != "MOM":
        raise HTTPException(status_code=403, detail="Only moms can access chart data")
    
    session = await db.contraction_sessions.find_one({
        "session_id": session_id,
        "mom_id": user.user_id
    }, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all completed contractions for this session
    contractions = await db.contractions.find({
        "session_id": session_id,
        "end_time": {"$ne": None}
    }, {"_id": 0}).sort("start_time", 1).to_list(1000)
    
    # Format for charts
    duration_data = []
    interval_data = []
    intensity_data = []
    
    for i, c in enumerate(contractions):
        timestamp = c.get("start_time")
        duration = c.get("duration_seconds", 0) or 0
        interval = c.get("interval_seconds_to_previous")
        intensity = c.get("intensity")
        
        duration_data.append({
            "x": i + 1,
            "y": duration,
            "timestamp": timestamp,
            "label": f"#{i+1}"
        })
        
        if interval:
            interval_data.append({
                "x": i + 1,
                "y": interval // 60,  # Convert to minutes for readability
                "timestamp": timestamp,
                "label": f"#{i+1}"
            })
        
        if intensity:
            intensity_value = {"MILD": 1, "MODERATE": 2, "STRONG": 3}.get(intensity, 0)
            intensity_data.append({
                "x": i + 1,
                "y": intensity_value,
                "intensity": intensity,
                "timestamp": timestamp
            })
    
    return {
        "session_id": session_id,
        "duration_data": duration_data,
        "interval_data": interval_data,
        "intensity_data": intensity_data,
        "total_contractions": len(contractions)
    }
