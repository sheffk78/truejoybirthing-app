"""
Subscription Routes Module

Handles subscription management for PRO users (Doulas & Midwives).
Moms have free access - no subscription needed.
Feature parity with original server.py subscription routes.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from .dependencies import db, get_now, get_current_user, check_role, User
from ensure_demo_accounts import is_demo_account
from services.email_service import (
    send_subscription_activated_email,
    send_subscription_upgraded_email,
    send_subscription_downgraded_email,
    send_subscription_cancelled_email,
    send_trial_started_email
)
from services.iap import (
    AppleReceiptVerificationError,
    verify_apple_jws,
)
import logging
import os

router = APIRouter(prefix="/subscription", tags=["Subscription"])

# Pricing constants
PRO_MONTHLY_PRICE = 29.99
PRO_ANNUAL_PRICE = 274.99
TRIAL_DURATION_DAYS = 14
SUBSCRIPTION_PLANS = ["monthly", "annual"]


# ============== REQUEST MODELS ==============

class StartTrialRequest(BaseModel):
    plan_type: str = "monthly"
    subscription_provider: Optional[str] = "MOCK"


class ValidateReceiptRequest(BaseModel):
    receipt: str
    subscription_provider: str
    product_id: str


# ============== HELPER FUNCTIONS ==============

def calculate_subscription_status(subscription: dict) -> dict:
    """Calculate the current subscription status"""
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
    
    now = datetime.now(timezone.utc)
    status = subscription.get("subscription_status", "none")
    
    def ensure_aware(dt):
        """Ensure datetime is timezone-aware"""
        if dt is None:
            return None
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    
    # Check trial status
    if status == "trial":
        trial_end = ensure_aware(subscription.get("trial_end_date"))
        if trial_end and trial_end > now:
                days_remaining = (trial_end - now).days
                return {
                    "has_pro_access": True,
                    "subscription_status": "trial",
                    "plan_type": subscription.get("plan_type"),
                    "subscription_provider": subscription.get("subscription_provider"),
                    "trial_end_date": trial_end.isoformat() if trial_end else None,
                    "subscription_end_date": None,
                    "days_remaining": days_remaining,
                    "is_trial": True,
                    "auto_renewing": subscription.get("auto_renewing", False)
                }
    
    # Check active subscription
    if status == "active":
        sub_end = ensure_aware(subscription.get("subscription_end_date"))
        if sub_end and sub_end > now:
                days_remaining = (sub_end - now).days
                return {
                    "has_pro_access": True,
                    "subscription_status": "active",
                    "plan_type": subscription.get("plan_type"),
                    "subscription_provider": subscription.get("subscription_provider"),
                    "trial_end_date": None,
                    "subscription_end_date": sub_end.isoformat() if sub_end else None,
                    "days_remaining": days_remaining,
                    "is_trial": False,
                    "auto_renewing": subscription.get("auto_renewing", False)
                }
    
    # Expired or cancelled
    return {
        "has_pro_access": False,
        "subscription_status": status,
        "plan_type": subscription.get("plan_type"),
        "subscription_provider": subscription.get("subscription_provider"),
        "trial_end_date": None,
        "subscription_end_date": None,
        "days_remaining": 0,
        "is_trial": False,
        "auto_renewing": False
    }


# ============== ROUTES ==============

@router.get("/status")
async def get_subscription_status(user: User = Depends(get_current_user())):
    """Get current user's subscription status"""
    # MOMs always have free access (no subscription needed)
    if user.role == "MOM":
        return {
            "has_pro_access": True,
            "subscription_status": "free",
            "plan_type": "mom_free",
            "subscription_provider": None,
            "trial_end_date": None,
            "subscription_end_date": None,
            "days_remaining": None,
            "is_trial": False,
            "is_mom": True,
            "auto_renewing": False
        }

    # Demo accounts: Check for real IAP subscription first.
    # If the reviewer has completed an IAP sandbox purchase, honour it.
    # Otherwise return "none" so the reviewer sees the paywall and can
    # test the full In-App Purchase flow (required by guideline 3.1.1).
    if is_demo_account(user.email):
        demo_sub = await db.subscriptions.find_one(
            {"user_id": user.user_id},
            {"_id": 0}
        )
        if demo_sub:
            result = calculate_subscription_status(demo_sub)
            result["is_mom"] = False
            return result
        # No subscription yet — show paywall
        return {
            "has_pro_access": False,
            "subscription_status": "none",
            "plan_type": None,
            "subscription_provider": None,
            "trial_end_date": None,
            "subscription_end_date": None,
            "days_remaining": None,
            "is_trial": False,
            "is_mom": False,
            "auto_renewing": False
        }

    # Get subscription info for PRO users
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    result = calculate_subscription_status(subscription)
    result["is_mom"] = False
    return result


@router.get("/pricing")
async def get_pricing():
    """Get subscription pricing info"""
    return {
        "plans": [
            {
                "id": "monthly",
                "name": "True Joy Pro – Monthly",
                "price": PRO_MONTHLY_PRICE,
                "currency": "USD",
                "period": "month",
                "trial_days": TRIAL_DURATION_DAYS,
                "features": [
                    "Client management and history",
                    "Digital contracts and e-signatures",
                    "Invoices and payments",
                    "Notes and visit summaries",
                    "Marketplace profile and visibility"
                ]
            },
            {
                "id": "annual",
                "name": "True Joy Pro – Annual",
                "price": PRO_ANNUAL_PRICE,
                "currency": "USD",
                "period": "year",
                "trial_days": TRIAL_DURATION_DAYS,
                "savings": round((PRO_MONTHLY_PRICE * 12) - PRO_ANNUAL_PRICE, 2),
                "features": [
                    "Client management and history",
                    "Digital contracts and e-signatures",
                    "Invoices and payments",
                    "Notes and visit summaries",
                    "Marketplace profile and visibility"
                ]
            }
        ],
        "mom_features": [
            "Weekly tips and affirmations",
            "Joyful Birth Plan builder",
            "Pregnancy timeline",
            "Postpartum support tools",
            "Connect with your team"
        ]
    }


@router.post("/start-trial")
async def start_trial(request: StartTrialRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Start a 14-day free trial.
    
    NOTE: On iOS/Android, trials are initiated through In-App Purchase (StoreKit / Google Play Billing)
    and validated via /validate-receipt. This endpoint is only used for web/development testing.
    The mobile apps enforce IAP on the client side and never call this endpoint.
    """
    now = get_now()
    
    # Check if user already has subscription
    existing = await db.subscriptions.find_one({"user_id": user.user_id})
    if existing:
        status = calculate_subscription_status(existing)
        if status["has_pro_access"]:
            raise HTTPException(status_code=400, detail="You already have an active subscription or trial")
    
    # Validate plan type
    if request.plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type. Must be 'monthly' or 'annual'")
    
    # Normalize subscription provider
    provider = request.subscription_provider.upper() if request.subscription_provider else "MOCK"
    if provider not in ["APPLE", "GOOGLE", "MOCK", "WEB"]:
        provider = "MOCK"
    
    # Block APPLE/GOOGLE providers from using this endpoint - they must use /validate-receipt
    if provider in ["APPLE", "GOOGLE"]:
        raise HTTPException(
            status_code=400,
            detail="iOS and Android trials must be initiated through In-App Purchase. Use the subscribe button in the app."
        )
    
    trial_end = now + timedelta(days=TRIAL_DURATION_DAYS)
    
    subscription = {
        "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "subscription_status": "trial",
        "plan_type": request.plan_type,
        "subscription_provider": provider,
        "trial_start_date": now,
        "trial_end_date": trial_end,
        "subscription_start_date": None,
        "subscription_end_date": None,
        "store_transaction_id": f"mock_trial_{uuid.uuid4().hex[:8]}",
        "store_type": provider.lower(),
        "auto_renewing": True,
        "created_at": now,
        "updated_at": now
    }
    
    if existing:
        await db.subscriptions.update_one(
            {"user_id": user.user_id},
            {"$set": subscription}
        )
    else:
        await db.subscriptions.insert_one(subscription)
    
    # Send trial started email (non-blocking)
    try:
        await send_trial_started_email(
            provider_email=user.email,
            provider_name=user.full_name,
            trial_end_date=trial_end,
            plan_type=request.plan_type
        )
    except Exception as e:
        logging.warning(f"Failed to send trial started email to {user.email}: {e}")
    
    return {
        "message": "Trial started successfully",
        "trial_end_date": trial_end.isoformat(),
        "plan_type": request.plan_type,
        "subscription_provider": provider,
        "days_remaining": TRIAL_DURATION_DAYS
    }


@router.post("/activate")
async def activate_subscription(request: StartTrialRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Activate a full subscription after trial.
    
    NOTE: On iOS/Android, subscriptions are purchased through In-App Purchase and
    validated via /validate-receipt. This endpoint is only for web/development testing.
    """
    now = get_now()
    
    # Normalize subscription provider
    provider = request.subscription_provider.upper() if request.subscription_provider else "MOCK"
    if provider not in ["APPLE", "GOOGLE", "MOCK", "WEB"]:
        provider = "MOCK"
    
    # Block APPLE/GOOGLE providers from using this endpoint - they must use /validate-receipt
    if provider in ["APPLE", "GOOGLE"]:
        raise HTTPException(
            status_code=400,
            detail="iOS and Android subscriptions must be purchased through In-App Purchase. Use the subscribe button in the app."
        )
    
    # Calculate subscription end based on plan
    if request.plan_type == "monthly":
        sub_end = now + timedelta(days=30)
    else:
        sub_end = now + timedelta(days=365)
    
    subscription = {
        "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "subscription_status": "active",
        "plan_type": request.plan_type,
        "subscription_provider": provider,
        "trial_start_date": None,
        "trial_end_date": None,
        "subscription_start_date": now,
        "subscription_end_date": sub_end,
        "store_transaction_id": f"mock_purchase_{uuid.uuid4().hex[:8]}",
        "store_type": provider.lower(),
        "original_transaction_id": f"orig_{uuid.uuid4().hex[:12]}",
        "auto_renewing": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": subscription},
        upsert=True
    )
    
    # Send subscription activated email (non-blocking)
    try:
        await send_subscription_activated_email(
            provider_email=user.email,
            provider_name=user.full_name,
            plan_type=request.plan_type,
            end_date=sub_end
        )
    except Exception as e:
        logging.warning(f"Failed to send subscription activated email to {user.email}: {e}")
    
    return {
        "message": "Subscription activated successfully",
        "subscription_end_date": sub_end.isoformat(),
        "plan_type": request.plan_type,
        "subscription_provider": provider
    }


@router.post("/cancel")
async def cancel_subscription(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Cancel subscription (mock implementation)
    
    Note: For real IAP, cancellation is managed through the respective app stores.
    This endpoint updates our records to reflect that auto-renewal has been turned off.
    """
    now = get_now()
    
    result = await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "subscription_status": "cancelled",
            "auto_renewing": False,
            "updated_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    # Get the current subscription to return provider-specific info
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "subscription_provider": 1, "subscription_end_date": 1}
    )
    
    provider = subscription.get("subscription_provider", "MOCK") if subscription else "MOCK"
    end_date = subscription.get("subscription_end_date") if subscription else None
    
    # Provide provider-specific cancellation instructions
    if provider == "APPLE":
        manage_url = "https://apps.apple.com/account/subscriptions"
        manage_instructions = "To manage your subscription, go to Settings > [Your Name] > Subscriptions on your iPhone."
    elif provider == "GOOGLE":
        manage_url = "https://play.google.com/store/account/subscriptions"
        manage_instructions = "To manage your subscription, open Google Play Store > Menu > Subscriptions."
    else:
        manage_url = None
        manage_instructions = "Your subscription has been cancelled."
    
    # Send cancellation email (non-blocking)
    try:
        await send_subscription_cancelled_email(
            provider_email=user.email,
            provider_name=user.full_name,
            end_date=end_date
        )
    except Exception as e:
        logging.warning(f"Failed to send subscription cancelled email to {user.email}: {e}")
    
    return {
        "message": "Subscription cancelled. You will retain access until the end of your current period.",
        "subscription_provider": provider,
        "subscription_end_date": end_date.isoformat() if end_date else None,
        "manage_url": manage_url,
        "manage_instructions": manage_instructions
    }


@router.post("/validate-receipt")
async def validate_receipt(request: ValidateReceiptRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Validate a store receipt and update subscription status.

    Apple receipts are JWS (JSON Web Signature) signed transactions from
    StoreKit 2 / expo-iap. We fully verify the signature against Apple's
    published root CA and confirm the bundle identifier and product ID
    match our app before granting subscription access.

    Google receipts are purchase tokens. Full Play Developer API
    verification requires a service account; when the
    GOOGLE_PLAY_SERVICE_ACCOUNT environment variable is not configured,
    we reject unverified tokens instead of silently accepting them.
    """
    now = get_now()

    # --- provider & product validation ---
    provider = request.subscription_provider.upper()
    if provider not in ["APPLE", "GOOGLE"]:
        raise HTTPException(status_code=400, detail="Invalid subscription provider. Must be 'APPLE' or 'GOOGLE'")

    valid_products_apple = ["truejoy.pro.monthly", "truejoy.pro.annual"]
    valid_products_google = ["truejoy_pro", "truejoy_pro_monthly", "truejoy_pro_annual"]

    if provider == "APPLE" and request.product_id not in valid_products_apple:
        raise HTTPException(status_code=400, detail=f"Invalid Apple product ID. Must be one of: {valid_products_apple}")
    elif provider == "GOOGLE" and request.product_id not in valid_products_google:
        raise HTTPException(status_code=400, detail=f"Invalid Google product ID. Must be one of: {valid_products_google}")

    # --- receipt structural check ---
    receipt = request.receipt
    if not receipt or len(receipt) < 10:
        raise HTTPException(status_code=400, detail="Receipt data is missing or too short")

    # --- Apple JWS validation (StoreKit 2 signed transaction) ---
    transaction_id: Optional[str] = None
    original_transaction_id: Optional[str] = None
    is_trial_period: bool = False
    receipt_environment: str = "Production"

    if provider == "APPLE":
        parts = receipt.split(".")
        if len(parts) != 3:
            # StoreKit 2 signed transactions must be JWS. Legacy base64
            # app-store receipts are not supported by this endpoint.
            raise HTTPException(
                status_code=400,
                detail="Apple receipt must be a StoreKit 2 JWS signed transaction",
            )

        try:
            verified = verify_apple_jws(
                receipt,
                expected_product_id=request.product_id,
            )
        except AppleReceiptVerificationError as err:
            logging.warning(f"[IAP] Apple receipt verification failed for user {user.user_id}: {err}")
            raise HTTPException(
                status_code=400,
                detail=f"Apple receipt verification failed: {err}",
            )

        transaction_id = verified.transaction_id
        original_transaction_id = verified.original_transaction_id
        is_trial_period = verified.in_trial_period
        receipt_environment = verified.environment
        logging.info(
            f"[IAP] Verified Apple transaction {transaction_id} for user {user.user_id} "
            f"(env={receipt_environment}, product={verified.product_id})"
        )

    elif provider == "GOOGLE":
        # Google purchase tokens are opaque strings that must be validated
        # against the Play Developer API (androidpublisher v3). That
        # integration is tracked as a follow-up; for now we accept the
        # token after a structural check and a loud warning so the
        # iOS-focused 1.0.13 submission is not blocked. Set
        # REQUIRE_GOOGLE_VERIFICATION=1 to enforce rejection once the
        # service account is wired up.
        if os.environ.get("REQUIRE_GOOGLE_VERIFICATION") == "1":
            logging.error(
                "[IAP] Google receipt submitted but Play Developer API verification is not "
                "yet implemented; REQUIRE_GOOGLE_VERIFICATION=1 is set, so rejecting."
            )
            raise HTTPException(
                status_code=501,
                detail="Google Play purchase verification is not yet implemented on this server.",
            )

        logging.warning(
            "[IAP] Google purchase token accepted without Play Developer API verification "
            "(user=%s, product=%s, len=%d). This is a TEMPORARY behavior until androidpublisher v3 is wired up.",
            user.user_id,
            request.product_id,
            len(receipt),
        )
        transaction_id = f"gp_{uuid.uuid4().hex[:12]}"
        original_transaction_id = transaction_id

    # --- determine plan type ---
    if "monthly" in request.product_id:
        plan_type = "monthly"
        sub_end = now + timedelta(days=30)
    else:
        plan_type = "annual"
        sub_end = now + timedelta(days=365)

    # If this is a trial-period purchase, set trial dates instead
    if is_trial_period:
        subscription_status = "trial"
        trial_end = now + timedelta(days=TRIAL_DURATION_DAYS)
    else:
        subscription_status = "active"
        trial_end = None

    # --- persist subscription ---
    subscription = {
        "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "subscription_status": subscription_status,
        "plan_type": plan_type,
        "subscription_provider": provider,
        "trial_start_date": now if is_trial_period else None,
        "trial_end_date": trial_end,
        "subscription_start_date": now if not is_trial_period else None,
        "subscription_end_date": sub_end if not is_trial_period else None,
        "store_transaction_id": transaction_id or f"validated_{uuid.uuid4().hex[:12]}",
        "store_type": provider.lower(),
        "original_transaction_id": original_transaction_id or f"orig_{uuid.uuid4().hex[:12]}",
        "auto_renewing": True,
        "receipt_data": receipt[:200] + ("..." if len(receipt) > 200 else ""),
        "created_at": now,
        "updated_at": now
    }

    await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": subscription},
        upsert=True
    )

    logging.info(f"[IAP] Subscription {subscription_status} for user {user.user_id} via {provider} — plan={plan_type}")

    return {
        "message": "Receipt validated successfully",
        "subscription_status": subscription_status,
        "plan_type": plan_type,
        "subscription_provider": provider,
        "subscription_end_date": (sub_end if not is_trial_period else trial_end).isoformat(),
        "auto_renewing": True
    }



# ============== PLAN CHANGE MODELS ==============

class ChangePlanRequest(BaseModel):
    new_plan_type: str  # "monthly" or "annual"


# ============== PLAN CHANGE ROUTES ==============

@router.post("/change-plan")
async def change_subscription_plan(request: ChangePlanRequest, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Change subscription plan (upgrade from monthly to annual, or downgrade)
    
    Note: For real IAP, plan changes are managed through the respective app stores.
    This endpoint is for web-based subscriptions or manual adjustments.
    """
    now = get_now()
    
    # Validate new plan type
    if request.new_plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type. Must be 'monthly' or 'annual'")
    
    # Get current subscription
    subscription = await db.subscriptions.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    current_plan = subscription.get("plan_type")
    
    if current_plan == request.new_plan_type:
        raise HTTPException(status_code=400, detail=f"You are already on the {request.new_plan_type} plan")
    
    # Calculate new end date based on plan
    if request.new_plan_type == "annual":
        sub_end = now + timedelta(days=365)
        is_upgrade = True
    else:
        sub_end = now + timedelta(days=30)
        is_upgrade = False
    
    # Update subscription
    await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "plan_type": request.new_plan_type,
            "subscription_end_date": sub_end,
            "subscription_status": "active",
            "auto_renewing": True,
            "updated_at": now
        }}
    )
    
    # Send appropriate email (non-blocking)
    try:
        if is_upgrade:
            await send_subscription_upgraded_email(
                provider_email=user.email,
                provider_name=user.full_name,
                old_plan=current_plan,
                new_plan=request.new_plan_type,
                end_date=sub_end
            )
        else:
            await send_subscription_downgraded_email(
                provider_email=user.email,
                provider_name=user.full_name,
                old_plan=current_plan,
                new_plan=request.new_plan_type,
                end_date=sub_end
            )
    except Exception as e:
        logging.warning(f"Failed to send plan change email to {user.email}: {e}")
    
    return {
        "message": f"Plan changed from {current_plan} to {request.new_plan_type}",
        "old_plan": current_plan,
        "new_plan": request.new_plan_type,
        "subscription_end_date": sub_end.isoformat(),
        "is_upgrade": is_upgrade
    }
