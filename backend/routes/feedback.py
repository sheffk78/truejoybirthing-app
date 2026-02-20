"""
Feedback Routes Module

Handles Pro user feedback submission and management.
Includes email notification to the True Joy Birthing team.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import resend

from .dependencies import db, check_role, User

# ============== CONSTANTS ==============
SENDER_EMAIL = "True Joy Birthing <noreply@truejoybirthing.com>"

# ============== ROUTER ==============
router = APIRouter(prefix="/pro", tags=["Pro Feedback"])

# ============== MODELS ==============
class ProFeedbackRequest(BaseModel):
    feedback_text: str
    feedback_topic: Optional[str] = None  # "Bug / something broken", "Feature request", "General comment"
    platform: Optional[str] = None  # iOS, Android, Web
    app_version: Optional[str] = None

# ============== HELPERS ==============
def calculate_subscription_status(subscription: dict) -> dict:
    """Calculate current subscription status and access"""
    now = datetime.now(timezone.utc)
    
    if not subscription:
        return {
            "has_pro_access": False,
            "subscription_status": "none",
            "plan_type": None,
            "subscription_provider": None,
            "trial_end_date": None,
            "subscription_end_date": None,
            "days_remaining": None,
            "is_trial": False,
            "auto_renewing": False
        }
    
    status = subscription.get("subscription_status", "none")
    trial_end = subscription.get("trial_end_date")
    sub_end = subscription.get("subscription_end_date")
    provider = subscription.get("subscription_provider", subscription.get("store_type", "MOCK"))
    auto_renewing = subscription.get("auto_renewing", True)
    
    # Normalize provider to uppercase
    if provider and provider.lower() in ["ios", "apple"]:
        provider = "APPLE"
    elif provider and provider.lower() in ["android", "google"]:
        provider = "GOOGLE"
    elif provider:
        provider = provider.upper()
    
    # Convert trial_end to timezone-aware datetime
    if trial_end:
        if isinstance(trial_end, str):
            trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
        elif isinstance(trial_end, datetime) and trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
    
    # Convert sub_end to timezone-aware datetime  
    if sub_end:
        if isinstance(sub_end, str):
            sub_end = datetime.fromisoformat(sub_end.replace('Z', '+00:00'))
        elif isinstance(sub_end, datetime) and sub_end.tzinfo is None:
            sub_end = sub_end.replace(tzinfo=timezone.utc)
    
    # Check trial status
    if status == "trial" and trial_end:
        if now < trial_end:
            days_remaining = (trial_end - now).days
            return {
                "has_pro_access": True,
                "subscription_status": "trial",
                "plan_type": subscription.get("plan_type"),
                "subscription_provider": provider,
                "trial_end_date": trial_end.isoformat(),
                "subscription_end_date": None,
                "days_remaining": days_remaining,
                "is_trial": True,
                "auto_renewing": False
            }
    
    # Check active subscription
    if status == "active":
        days_remaining = None
        if sub_end and now < sub_end:
            days_remaining = (sub_end - now).days
        elif sub_end is None:
            days_remaining = 365  # Assume annual for display
        
        if days_remaining is None or days_remaining >= 0:
            return {
                "has_pro_access": True,
                "subscription_status": "active",
                "plan_type": subscription.get("plan_type"),
                "subscription_provider": provider,
                "trial_end_date": None,
                "subscription_end_date": sub_end.isoformat() if sub_end else None,
                "days_remaining": days_remaining,
                "is_trial": False,
                "auto_renewing": auto_renewing
            }
    
    # Subscription expired or inactive
    return {
        "has_pro_access": False,
        "subscription_status": status,
        "plan_type": subscription.get("plan_type"),
        "subscription_provider": provider,
        "trial_end_date": trial_end.isoformat() if trial_end else None,
        "subscription_end_date": sub_end.isoformat() if sub_end else None,
        "days_remaining": 0,
        "is_trial": False,
        "auto_renewing": False
    }


async def check_pro_access(user: User) -> bool:
    """Check if a PRO user has active subscription or trial"""
    if user.role == "MOM":
        return True  # Moms don't need Pro access
    
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    status = calculate_subscription_status(subscription)
    return status["has_pro_access"]


# ============== ROUTES ==============
@router.post("/feedback")
async def submit_pro_feedback(feedback: ProFeedbackRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Submit feedback from Pro users - sends email to shelbi@truejoybirthing.com"""
    
    # Check if user has Pro access
    has_access = await check_pro_access(user)
    if not has_access:
        raise HTTPException(status_code=403, detail="Pro subscription required to submit feedback")
    
    # Validate feedback length
    if not feedback.feedback_text or len(feedback.feedback_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Feedback text is required")
    
    if len(feedback.feedback_text) > 800:
        raise HTTPException(status_code=400, detail="Please keep feedback under 800 characters so we can respond quickly.")
    
    now = datetime.now(timezone.utc)
    
    # Format the topic for subject line
    topic = feedback.feedback_topic or "General comment"
    role_label = "Doula" if user.role == "DOULA" else "Midwife"
    
    # Build email subject
    subject = f"Pro Feedback from {user.full_name} – {topic}"
    
    # Build email body
    platform_info = feedback.platform or "Unknown"
    version_info = feedback.app_version or "Unknown"
    timestamp = now.strftime("%Y-%m-%d %H:%M %Z")
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Pro User Feedback</h2>
        <hr style="border: 1px solid #e5e7eb;">
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 120px;"><strong>From:</strong></td>
                <td style="padding: 8px 0;">{user.full_name} ({role_label})</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
                <td style="padding: 8px 0;">{user.email}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Platform:</strong></td>
                <td style="padding: 8px 0;">{platform_info} – v{version_info}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Time:</strong></td>
                <td style="padding: 8px 0;">{timestamp}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Topic:</strong></td>
                <td style="padding: 8px 0;">{topic}</td>
            </tr>
        </table>
        
        <h3 style="color: #1f2937; margin-top: 24px;">Message:</h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-wrap;">
{feedback.feedback_text}
        </div>
        
        <hr style="border: 1px solid #e5e7eb; margin-top: 24px;">
        <p style="color: #9ca3af; font-size: 12px;">
            This feedback was submitted through the True Joy Birthing app.
        </p>
    </div>
    """
    
    # Store feedback in database for records FIRST
    feedback_record = {
        "feedback_id": f"feedback_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "user_name": user.full_name,
        "user_email": user.email,
        "user_role": user.role,
        "feedback_text": feedback.feedback_text,
        "feedback_topic": topic,
        "platform": platform_info,
        "app_version": version_info,
        "created_at": now,
        "email_sent": False
    }
    await db.pro_feedback.insert_one(feedback_record)
    
    # Send email to Shelbi (non-blocking)
    email_sent = False
    try:
        if resend.api_key:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": "shelbi@truejoybirthing.com",
                "subject": subject,
                "html": email_body,
                "reply_to": user.email
            })
            email_sent = True
            # Update record to mark email as sent
            await db.pro_feedback.update_one(
                {"feedback_id": feedback_record["feedback_id"]},
                {"$set": {"email_sent": True}}
            )
        else:
            logging.warning("Resend API key not configured - feedback email not sent")
    except Exception as e:
        logging.error(f"Failed to send feedback email: {e}")
        # Don't raise exception - feedback is still stored
    
    return {"message": "Thank you. Your feedback was sent to the True Joy Birthing team."}


@router.get("/feedback")
async def get_feedback_history(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get user's feedback history"""
    feedback_list = await db.pro_feedback.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return feedback_list
