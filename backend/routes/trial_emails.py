"""
Provider Onboarding & Trial Email Sequences

Two sequences for doulas/midwives:

1. ONBOARDING SEQUENCE (all doulas/midwives, triggered at signup):
   - Day 0:  Welcome — what moms see when they open the app
   - Day 3:  How moms use the app — birth plans, contractions, wellness
   - Day 7:  Feedback request — how can we make this better for moms?
   - Day 10: Mom experience spotlight — what your clients are feeling
   - Day 14: Final feedback + what's coming next

2. TRIAL CONVERSION SEQUENCE (trial users only, triggered at trial start):
   - Day 0:  Trial started (already sent by start_trial endpoint)
   - Day 12: Trial ending soon — subscribe to keep your practice running

Both sequences track sent emails in a `provider_emails` collection to prevent duplicates.
Designed to be called daily by a cron job hitting /admin/api/provider-emails/process.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from .dependencies import db, get_now, check_role, User
from services.email_service import (
    send_provider_onboarding_day0,
    send_provider_onboarding_day3,
    send_provider_onboarding_day7,
    send_provider_onboarding_day10,
    send_provider_onboarding_day14,
    send_trial_ending_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/provider-emails", tags=["Admin Provider Emails"])

TRIAL_DURATION_DAYS = 14

# Onboarding schedule: maps day -> email function
ONBOARDING_SCHEDULE = {
    0: send_provider_onboarding_day0,
    3: send_provider_onboarding_day3,
    7: send_provider_onboarding_day7,
    10: send_provider_onboarding_day10,
    14: send_provider_onboarding_day14,
}

# Trial conversion: sent 2 days before trial ends
TRIAL_ENDING_DAY = 12  # Day 12 of 14-day trial


def ensure_aware(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (UTC)."""
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def calculate_day(start_date: datetime, now: datetime) -> int:
    """Calculate days since a given date."""
    start = ensure_aware(start_date)
    now = ensure_aware(now)
    delta = now - start
    return delta.days


def is_test_account(email: str) -> bool:
    """Check if an email belongs to a test/demo account."""
    email_lower = email.lower()
    test_patterns = ["test", "demo", "guerrillamail", "web-library", "edge-test",
                     "example.com", "tjb-verify", "trustoffice"]
    return any(x in email_lower for x in test_patterns)


@router.post("/process")
async def process_provider_emails(
    dry_run: bool = Query(False, description="If true, report what would be sent without actually sending"),
    user: User = Depends(check_role(["ADMIN"])),
):
    """
    Process both onboarding and trial email sequences.
    Called daily by cron job.

    ONBOARDING: Finds all doulas/midwives, calculates days since signup,
    sends the appropriate onboarding email if not already sent.

    TRIAL: Finds all active trial subscriptions, sends trial-ending email
    at day 12 if not already sent.
    """
    now = get_now()
    results = {
        "onboarding": {"checked": 0, "sent": [], "skipped_already_sent": [], "skipped_not_scheduled": [], "errors": []},
        "trial": {"checked": 0, "sent": [], "skipped_already_sent": [], "skipped_not_scheduled": [], "errors": []},
        "dry_run": dry_run,
    }

    # === ONBOARDING SEQUENCE ===
    # Find all doulas and midwives
    providers = await db.users.find({
        "role": {"$in": ["DOULA", "MIDWIFE"]},
    }).to_list(200)

    results["onboarding"]["checked"] = len(providers)

    for provider in providers:
        user_id = provider.get("user_id", "")
        email = provider.get("email", "")
        name = provider.get("full_name", "")
        created_at = provider.get("created_at")

        if not email or not created_at:
            continue

        if is_test_account(email):
            continue

        signup_day = calculate_day(created_at, now)

        # Check if this day has a scheduled email
        if signup_day not in ONBOARDING_SCHEDULE:
            continue

        # Check if already sent for this day
        day_key = f"onboarding_day_{signup_day}"
        already_sent = await db.provider_emails.find_one({
            "user_id": user_id,
            "email_type": day_key,
        })

        if already_sent:
            results["onboarding"]["skipped_already_sent"].append({
                "user_id": user_id,
                "email": email,
                "day": signup_day,
            })
            continue

        if dry_run:
            results["onboarding"]["sent"].append({
                "user_id": user_id,
                "email": email,
                "name": name,
                "day": signup_day,
                "dry_run": True,
            })
            continue

        # Send the email
        email_fn = ONBOARDING_SCHEDULE[signup_day]
        try:
            success = await email_fn(
                provider_email=email,
                provider_name=name,
            )

            if success:
                # Record in provider_emails collection
                await db.provider_emails.insert_one({
                    "user_id": user_id,
                    "email": email,
                    "email_type": day_key,
                    "sent_at": now,
                })
                results["onboarding"]["sent"].append({
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "day": signup_day,
                })
                logger.info(f"Sent onboarding day {signup_day} email to {email}")
            else:
                results["onboarding"]["errors"].append({
                    "user_id": user_id,
                    "email": email,
                    "error": "send_email returned False",
                })
        except Exception as e:
            results["onboarding"]["errors"].append({
                "user_id": user_id,
                "email": email,
                "error": str(e),
            })
            logger.error(f"Failed to send onboarding email to {email}: {e}")

    # === TRIAL CONVERSION SEQUENCE ===
    trial_subs = await db.subscriptions.find({
        "subscription_status": "trial",
    }).to_list(100)

    results["trial"]["checked"] = len(trial_subs)

    for sub in trial_subs:
        sub_id = sub.get("subscription_id", "unknown")
        user_id = sub.get("user_id", "")
        trial_start = sub.get("trial_start_date")
        trial_end = sub.get("trial_end_date")

        if not trial_start:
            continue

        trial_day = calculate_day(trial_start, now)

        # Only send trial-ending email at day 12
        if trial_day != TRIAL_ENDING_DAY:
            results["trial"]["skipped_not_scheduled"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "trial_day": trial_day,
            })
            continue

        # Check if already sent
        already_sent = await db.provider_emails.find_one({
            "user_id": user_id,
            "email_type": "trial_ending",
        })

        if already_sent:
            results["trial"]["skipped_already_sent"].append({
                "sub_id": sub_id,
                "user_id": user_id,
            })
            continue

        # Get user
        user_doc = await db.users.find_one({"user_id": user_id})
        if not user_doc:
            results["trial"]["errors"].append({
                "sub_id": sub_id,
                "error": "user not found",
            })
            continue

        provider_email = user_doc.get("email", "")
        provider_name = user_doc.get("full_name", "")

        if not provider_email or is_test_account(provider_email):
            continue

        days_remaining = max(0, TRIAL_DURATION_DAYS - trial_day)

        if dry_run:
            results["trial"]["sent"].append({
                "sub_id": sub_id,
                "user_id": user_id,
                "email": provider_email,
                "name": provider_name,
                "trial_day": trial_day,
                "days_remaining": days_remaining,
                "dry_run": True,
            })
            continue

        try:
            success = await send_trial_ending_email(
                provider_email=provider_email,
                provider_name=provider_name,
                days_remaining=days_remaining,
                trial_end_date=ensure_aware(trial_end) if trial_end else now + timedelta(days=days_remaining),
            )

            if success:
                await db.provider_emails.insert_one({
                    "user_id": user_id,
                    "email": provider_email,
                    "email_type": "trial_ending",
                    "sent_at": now,
                })
                results["trial"]["sent"].append({
                    "sub_id": sub_id,
                    "user_id": user_id,
                    "email": provider_email,
                    "name": provider_name,
                    "trial_day": trial_day,
                    "days_remaining": days_remaining,
                })
                logger.info(f"Sent trial ending email to {provider_email}")
            else:
                results["trial"]["errors"].append({
                    "sub_id": sub_id,
                    "email": provider_email,
                    "error": "send_email returned False",
                })
        except Exception as e:
            results["trial"]["errors"].append({
                "sub_id": sub_id,
                "email": provider_email,
                "error": str(e),
            })
            logger.error(f"Failed to send trial ending email to {provider_email}: {e}")

    return results


@router.get("/status")
async def get_provider_email_status(
    user: User = Depends(check_role(["ADMIN"])),
):
    """
    Get the status of both email sequences for all doulas/midwives.
    Shows which emails have been sent and which are pending.
    """
    now = get_now()

    providers = await db.users.find({
        "role": {"$in": ["DOULA", "MIDWIFE"]},
    }).to_list(200)

    statuses = []
    for provider in providers:
        user_id = provider.get("user_id", "")
        email = provider.get("email", "")
        name = provider.get("full_name", "")
        role = provider.get("role", "")
        created_at = provider.get("created_at")

        if not created_at or not email:
            continue

        if is_test_account(email):
            continue

        signup_day = calculate_day(created_at, now)

        # Get all sent emails for this user
        sent_docs = await db.provider_emails.find({
            "user_id": user_id,
        }).to_list(50)
        sent_types = {doc.get("email_type") for doc in sent_docs}

        # Check for trial subscription
        sub = await db.subscriptions.find_one({"user_id": user_id})
        has_trial = sub and sub.get("subscription_status") == "trial"
        trial_day = None
        trial_end = None
        if has_trial and sub.get("trial_start_date"):
            trial_day = calculate_day(sub.get("trial_start_date"), now)
            trial_end = sub.get("trial_end_date")

        # Calculate pending onboarding emails
        pending_onboarding = [
            f"onboarding_day_{d}" for d in ONBOARDING_SCHEDULE
            if f"onboarding_day_{d}" not in sent_types and signup_day >= d
        ]

        # Calculate pending trial emails
        pending_trial = []
        if has_trial and "trial_ending" not in sent_types and trial_day is not None:
            if trial_day >= TRIAL_ENDING_DAY:
                pending_trial.append("trial_ending")

        statuses.append({
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "signup_day": signup_day,
            "has_trial": has_trial,
            "trial_day": trial_day,
            "trial_end": trial_end.isoformat() if trial_end else None,
            "emails_sent": sorted(sent_types),
            "pending_onboarding": pending_onboarding,
            "pending_trial": pending_trial,
        })

    return {
        "total_providers": len(statuses),
        "onboarding_schedule_days": list(ONBOARDING_SCHEDULE.keys()),
        "trial_ending_day": TRIAL_ENDING_DAY,
        "statuses": statuses,
    }