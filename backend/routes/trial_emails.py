"""
Trial Email Sequence Scheduler

Sends automated emails to doulas/midwives during their 14-day trial:
- Day 0:  Trial started (already sent by start_trial endpoint)
- Day 3:  Feature deep-dive: Client Management + Contracts
- Day 7:  Feature highlight: Invoicing + Marketplace + Feedback request
- Day 10: Value reinforcement + social proof + conversion pitch
- Day 13: Last-chance conversion email

Designed to be called by a daily cron job (Hermes) hitting the /admin/api/trial-emails/process endpoint.
Also supports manual triggering for specific users.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from .dependencies import db, get_now, check_role, User
from services.email_service import (
    send_trial_day3_email,
    send_trial_day7_email,
    send_trial_day10_email,
    send_trial_day13_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/trial-emails", tags=["Admin Trial Emails"])

TRIAL_DURATION_DAYS = 14

# Email schedule: maps trial day -> email function
EMAIL_SCHEDULE = {
    3: send_trial_day3_email,
    7: send_trial_day7_email,
    10: send_trial_day10_email,
    13: send_trial_day13_email,
}


def ensure_aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (UTC)."""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def calculate_trial_day(trial_start: datetime, now: datetime) -> int:
    """Calculate which day of the trial the user is on (0-indexed)."""
    trial_start = ensure_aware(trial_start)
    now = ensure_aware(now)
    delta = now - trial_start
    return delta.days


@router.post("/process")
async def process_trial_emails(
    dry_run: bool = Query(False, description="If true, report what would be sent without actually sending"),
    user: User = Depends(check_role(["ADMIN"])),
):
    """
    Process trial email sequence for all active trial users.
    Called daily by cron job. Sends the appropriate email based on trial day.

    - Finds all users with subscription_status='trial'
    - For each, calculates which day of the trial they're on
    - If that day matches an email in the schedule, sends it (if not already sent)
    - Tracks sent emails in the subscription document to prevent duplicates
    """
    now = get_now()

    # Find all active trial subscriptions
    trial_subs = await db.subscriptions.find({
        "subscription_status": "trial",
    }).to_list(100)

    results = {
        "checked": 0,
        "sent": [],
        "skipped_already_sent": [],
        "skipped_not_scheduled": [],
        "skipped_no_user": [],
        "errors": [],
        "dry_run": dry_run,
    }

    for sub in trial_subs:
        results["checked"] += 1
        sub_id = sub.get("subscription_id", "unknown")
        user_id = sub.get("user_id", "")
        trial_start = sub.get("trial_start_date")
        trial_end = sub.get("trial_end_date")

        if not trial_start:
            logger.warning(f"Subscription {sub_id} has no trial_start_date, skipping")
            results["skipped_not_scheduled"].append({"sub_id": sub_id, "reason": "no trial_start_date"})
            continue

        trial_day = calculate_trial_day(trial_start, now)

        # Check if this day has a scheduled email
        if trial_day not in EMAIL_SCHEDULE:
            results["skipped_not_scheduled"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "trial_day": trial_day,
            })
            continue

        # Check if already sent for this day
        sent_emails = sub.get("trial_emails_sent", {})
        day_key = f"day_{trial_day}"
        if sent_emails.get(day_key):
            results["skipped_already_sent"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "trial_day": trial_day,
            })
            continue

        # Get user details
        user_doc = await db.users.find_one({"user_id": user_id})
        if not user_doc:
            results["skipped_no_user"].append({"sub_id": sub_id, "user_id": user_id})
            continue

        provider_email = user_doc.get("email", "")
        provider_name = user_doc.get("full_name", "")

        if not provider_email:
            results["errors"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "error": "no email address",
            })
            continue

        # Skip test/demo accounts
        email_lower = provider_email.lower()
        if any(x in email_lower for x in ["test", "demo", "guerrillamail", "web-library", "edge-test", "example.com"]):
            results["skipped_not_scheduled"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "reason": "test/demo account",
            })
            continue

        # Calculate days remaining
        if trial_end:
            trial_end_aware = ensure_aware(trial_end)
            days_remaining = max(0, (trial_end_aware - now).days)
        else:
            days_remaining = TRIAL_DURATION_DAYS - trial_day

        if dry_run:
            results["sent"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "email": provider_email,
                "name": provider_name,
                "trial_day": trial_day,
                "days_remaining": days_remaining,
                "dry_run": True,
            })
            continue

        # Send the email
        email_fn = EMAIL_SCHEDULE[trial_day]
        try:
            success = await email_fn(
                provider_email=provider_email,
                provider_name=provider_name,
                days_remaining=days_remaining,
                trial_end_date=ensure_aware(trial_end) if trial_end else now + timedelta(days=days_remaining),
            )

            if success:
                # Mark as sent in the subscription document
                await db.subscriptions.update_one(
                    {"subscription_id": sub_id},
                    {
                        "$set": {
                            f"trial_emails_sent.{day_key}": True,
                            f"trial_emails_sent.{day_key}_sent_at": now,
                            "updated_at": now,
                        }
                    },
                )
                results["sent"].append({
                    "sub_id": sub_id,
                    "user_id": user_id,
                    "email": provider_email,
                    "name": provider_name,
                    "trial_day": trial_day,
                    "days_remaining": days_remaining,
                })
                logger.info(f"Sent trial day {trial_day} email to {provider_email}")
            else:
                results["errors"].append({
                    "sub_id": sub_id,
                    "user_id": user_id,
                    "email": provider_email,
                    "error": "send_email returned False (Postmark error or not configured)",
                })
        except Exception as e:
            results["errors"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "email": provider_email,
                "error": str(e),
            })
            logger.error(f"Failed to send trial day {trial_day} email to {provider_email}: {e}")

    return results


@router.get("/status")
async def get_trial_email_status(
    user: User = Depends(check_role(["ADMIN"])),
):
    """
    Get the status of trial email sequence for all active trial users.
    Shows which emails have been sent and which are pending.
    """
    now = get_now()

    trial_subs = await db.subscriptions.find({
        "subscription_status": "trial",
    }).to_list(100)

    statuses = []
    for sub in trial_subs:
        user_id = sub.get("user_id", "")
        user_doc = await db.users.find_one({"user_id": user_id})

        trial_start = sub.get("trial_start_date")
        trial_end = sub.get("trial_end_date")
        trial_day = calculate_trial_day(trial_start, now) if trial_start else None

        if trial_end:
            trial_end_aware = ensure_aware(trial_end)
            days_remaining = max(0, (trial_end_aware - now).days)
        else:
            days_remaining = None

        sent_emails = sub.get("trial_emails_sent", {})

        statuses.append({
            "sub_id": sub.get("subscription_id"),
            "user_id": user_id,
            "email": user_doc.get("email") if user_doc else None,
            "name": user_doc.get("full_name") if user_doc else None,
            "role": user_doc.get("role") if user_doc else None,
            "trial_day": trial_day,
            "days_remaining": days_remaining,
            "trial_start": trial_start.isoformat() if trial_start else None,
            "trial_end": trial_end.isoformat() if trial_end else None,
            "emails_sent": sent_emails,
            "pending_emails": [
                f"day_{d}" for d in EMAIL_SCHEDULE
                if not sent_emails.get(f"day_{d}") and (trial_day is not None and trial_day >= d)
            ],
        })

    return {
        "total_trial_users": len(trial_subs),
        "email_schedule_days": list(EMAIL_SCHEDULE.keys()),
        "statuses": statuses,
    }