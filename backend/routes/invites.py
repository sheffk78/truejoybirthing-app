"""
Invites Routes Module

Handles the "Invite Your Doula" feature.
A mom can invite a doula/midwife by email. The invitee receives an email
with a link to the web landing page. When they sign up, the invite is
redeemed and a share_request is auto-created so the mom and provider
are immediately connected.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from .dependencies import db, check_role, User, create_notification, get_now
from services.email_service import (
    send_email as postmark_send_email,
    get_email_header,
    get_email_footer,
    get_button_html,
    BRAND_COLOR,
    ACCENT_COLOR,
    SUPPORT_EMAIL,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invites", tags=["Invites"])

# Allowed invitee roles
INVITEE_ROLES = ["DOULA", "MIDWIFE"]

# Invite status flow: sent -> opened -> signed_up -> connected
INVITE_STATUSES = ["sent", "opened", "signed_up", "connected"]


# ============== REQUEST MODELS ==============

class InviteCreate(BaseModel):
    invitee_name: str
    invitee_email: EmailStr
    invitee_role: Optional[str] = "DOULA"
    personal_message: Optional[str] = None


class RedeemInviteInput(BaseModel):
    invitee_user_id: str


# ============== EMAIL HELPERS ==============

def get_invite_email_html(
    mom_name: str,
    doula_name: str,
    invite_id: str,
    personal_message: Optional[str] = None,
) -> str:
    """Generate HTML for the doula/midwife invite email."""
    invite_url = f"https://truejoybirthing.com/invite/{invite_id}"

    message_html = ""
    if personal_message:
        message_html = f"""
        <div style="background: #f9f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {BRAND_COLOR};">
            <p style="color: #555; line-height: 1.6; margin: 0; font-style: italic;">
                "{personal_message}"
            </p>
            <p style="color: #999; font-size: 13px; margin: 10px 0 0 0;">— {mom_name}</p>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: 'Quicksand', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            {get_email_header()}

            <div style="padding: 30px;">
                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0;">
                    You're Invited to Join True Joy Birthing!
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {doula_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>{mom_name}</strong> has invited you to join True Joy Birthing as part of
                    their birth support team. True Joy Birthing is a platform that helps moms create
                    birth plans, connect with their care providers, and have a joyful birthing experience.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    By joining, you'll be able to:
                </p>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 15px 0; padding-left: 20px;">
                    <li>View {mom_name}'s birth plan and preferences</li>
                    <li>Communicate directly through the app</li>
                    <li>Stay connected throughout the pregnancy journey</li>
                </ul>

                {message_html}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Click the button below to accept the invitation and create your free account:
                </p>

                {get_button_html("Accept Invitation", invite_url)}

                <p style="color: #999; font-size: 13px; line-height: 1.5; margin: 20px 0 0 0;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="{invite_url}" style="color: {BRAND_COLOR}; word-break: break-all;">{invite_url}</a>
                </p>

                <p style="color: #555; line-height: 1.6; margin: 25px 0 0 0;">
                    With care,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """


# ============== ENDPOINTS ==============

@router.post("")
async def create_invite(
    data: InviteCreate,
    user: User = Depends(check_role(["MOM"])),
):
    """
    Mom creates an invite for a doula or midwife.
    Sends an email to the invitee with a link to the landing page.
    """
    if data.invitee_role not in INVITEE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"invitee_role must be one of: {INVITEE_ROLES}",
        )

    # Prevent duplicate pending invites to the same email from the same mom
    existing = await db.invites.find_one({
        "inviter_user_id": user.user_id,
        "invitee_email": data.invitee_email.lower(),
        "status": {"$in": ["sent", "opened"]},
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending invite for this email",
        )

    invite_id = f"inv_{uuid.uuid4().hex[:12]}"
    now = get_now()

    invite_doc = {
        "invite_id": invite_id,
        "inviter_user_id": user.user_id,
        "inviter_name": user.full_name or "A mom on True Joy Birthing",
        "invitee_name": data.invitee_name,
        "invitee_email": data.invitee_email.lower(),
        "invitee_phone": None,
        "invitee_role": data.invitee_role,
        "status": "sent",
        "created_at": now,
        "opened_at": None,
        "signed_up_at": None,
        "connected_at": None,
        "invitee_user_id": None,
        "share_request_id": None,
        "personal_message": data.personal_message,
        "reminder_sent_at": None,
    }

    await db.invites.insert_one(invite_doc)
    invite_doc.pop("_id", None)

    # Send invite email (non-blocking — don't fail the request if email fails)
    try:
        email_html = get_invite_email_html(
            mom_name=invite_doc["inviter_name"],
            doula_name=data.invitee_name,
            invite_id=invite_id,
            personal_message=data.personal_message,
        )
        await postmark_send_email(
            to=data.invitee_email,
            subject=f"{invite_doc['inviter_name']} invited you to join True Joy Birthing",
            html=email_html,
            reply_to=SUPPORT_EMAIL,
        )
    except Exception as e:
        logger.warning(f"Failed to send invite email to {data.invitee_email}: {e}")

    return invite_doc


@router.get("")
async def list_invites(
    user: User = Depends(check_role(["MOM"])),
):
    """List all invites sent by the authenticated mom, sorted by created_at descending."""
    invites = await db.invites.find(
        {"inviter_user_id": user.user_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)

    return invites


@router.get("/{invite_id}")
async def get_invite_public(invite_id: str):
    """
    PUBLIC endpoint (no auth) — returns limited invite data for the
    web landing page to show a personalized greeting.
    Does NOT expose emails or other sensitive data.
    """
    invite = await db.invites.find_one(
        {"invite_id": invite_id},
        {"_id": 0, "inviter_name": 1, "invitee_name": 1, "invitee_role": 1, "status": 1, "personal_message": 1},
    )

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    return invite


@router.post("/{invite_id}/track-open")
async def track_open(invite_id: str):
    """
    PUBLIC endpoint (no auth) — marks an invite as opened.
    Called by the landing page when the invitee visits.
    Only transitions 'sent' -> 'opened'.
    """
    invite = await db.invites.find_one({"invite_id": invite_id})

    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite["status"] == "sent":
        now = get_now()
        await db.invites.update_one(
            {"invite_id": invite_id},
            {"$set": {"status": "opened", "opened_at": now}},
        )

    return {"status": "ok"}


# ============== REDEMPTION (callable from signup flow) ==============

async def redeem_invite(invite_id: str, invitee_user_id: str):
    """
    Redeem an invite after the invitee creates an account.
    This function is called by auth.py's try_redeem_invite() after signup.

    - Validates the invite exists and is in 'sent' or 'opened' status
    - Sets invitee_user_id, status to 'signed_up', signed_up_at
    - Auto-creates a share_request from the inviter mom to the new provider
      with status 'accepted' (same schema as care_plans.py share_birth_plan)
    - Sends push notifications to both mom and new provider
    """
    invite = await db.invites.find_one({"invite_id": invite_id})

    if not invite:
        logger.warning(f"Redeem invite: invite {invite_id} not found")
        return None

    if invite["status"] not in ["sent", "opened"]:
        logger.warning(f"Redeem invite: invite {invite_id} already {invite['status']}")
        return None

    now = get_now()

    # Look up the new provider (invitee) to get their name and role
    new_provider = await db.users.find_one(
        {"user_id": invitee_user_id},
        {"_id": 0, "full_name": 1, "role": 1},
    )

    provider_name = (new_provider or {}).get("full_name") or invite.get("invitee_name") or "Provider"
    provider_role = (new_provider or {}).get("role") or invite.get("invitee_role") or "DOULA"

    # ---- Auto-create share_request (accepted) ----
    # Follow the same schema as care_plans.py share_birth_plan (line 604)
    existing_share = await db.share_requests.find_one({
        "mom_user_id": invite["inviter_user_id"],
        "provider_id": invitee_user_id,
    })

    if existing_share:
        # Update existing to accepted
        await db.share_requests.update_one(
            {"request_id": existing_share["request_id"]},
            {"$set": {
                "status": "accepted",
                "relationship_status": "active",
                "responded_at": now,
            }},
        )
        share_request_id = existing_share["request_id"]
    else:
        share_request_id = f"share_{uuid.uuid4().hex[:12]}"
        share_doc = {
            "request_id": share_request_id,
            "mom_user_id": invite["inviter_user_id"],
            "mom_name": invite.get("inviter_name"),
            "provider_id": invitee_user_id,
            "provider_name": provider_name,
            "provider_role": provider_role,
            "status": "accepted",
            "relationship_status": "active",
            "created_at": now,
            "responded_at": now,
            "source": "invite_redemption",
        }
        await db.share_requests.insert_one(share_doc)

    # ---- Update invite document ----
    await db.invites.update_one(
        {"invite_id": invite_id},
        {"$set": {
            "status": "signed_up",
            "signed_up_at": now,
            "invitee_user_id": invitee_user_id,
            "share_request_id": share_request_id,
        }},
    )

    # ---- Add provider to mom's team ----
    await db.users.update_one(
        {"user_id": invite["inviter_user_id"]},
        {"$addToSet": {
            "team": {
                "provider_id": invitee_user_id,
                "provider_name": provider_name,
                "provider_role": provider_role,
                "connected_at": now,
            }
        }},
    )

    # ---- Send push notifications ----
    doula_display_name = invite.get("invitee_name") or provider_name
    mom_display_name = invite.get("inviter_name") or "A mom on True Joy Birthing"

    # Notify the mom
    try:
        await create_notification(
            user_id=invite["inviter_user_id"],
            notif_type="provider_joined",
            title="Your Doula Joined TJB!",
            message=f"{doula_display_name} joined TJB! You're now connected.",
            data={
                "invite_id": invite_id,
                "share_request_id": share_request_id,
                "provider_id": invitee_user_id,
            },
        )
    except Exception as e:
        logger.warning(f"Failed to send mom notification for invite {invite_id}: {e}")

    # Notify the new provider
    try:
        await create_notification(
            user_id=invitee_user_id,
            notif_type="invite_accepted",
            title="You're Connected!",
            message=f"{mom_display_name} invited you to see her birth plan. Tap to view.",
            data={
                "invite_id": invite_id,
                "share_request_id": share_request_id,
                "mom_user_id": invite["inviter_user_id"],
            },
        )
    except Exception as e:
        logger.warning(f"Failed to send provider notification for invite {invite_id}: {e}")

    logger.info(f"Invite {invite_id} redeemed by user {invitee_user_id}, share_request {share_request_id}")

    return {"status": "ok", "share_request_id": share_request_id}


@router.post("/{invite_id}/redeem")
async def redeem_invite_endpoint(invite_id: str, data: RedeemInviteInput):
    """
    PUBLIC endpoint (no auth) — called from the signup flow to redeem an invite.
    Delegates to redeem_invite() which is also importable by auth.py.
    """
    result = await redeem_invite(invite_id, data.invitee_user_id)

    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Invite not found or already redeemed",
        )

    return result


# ============== STALE INVITE REMINDERS ==============

async def send_invite_reminders():
    """
    Send a single follow-up email to invites that have been in 'sent' status
    for more than 3 days and have not been opened yet.

    Idempotent: only sends a reminder if reminder_sent_at is None.
    Each invite gets at most one reminder.
    """
    from datetime import timedelta

    cutoff = get_now() - timedelta(days=3)

    stale_invites = await db.invites.find({
        "status": "sent",
        "opened_at": None,
        "created_at": {"$lt": cutoff},
        "reminder_sent_at": None,
    }).to_list(500)

    sent_count = 0

    for invite in stale_invites:
        invite_id = invite["invite_id"]
        invitee_name = invite.get("invitee_name") or "there"
        mom_name = invite.get("inviter_name") or "A mom on True Joy Birthing"
        invitee_email = invite["invitee_email"]

        reminder_subject = f"Reminder: {mom_name} is waiting for you on True Joy Birthing"
        reminder_body = (
            f"Hi {invitee_name}, just a reminder that {mom_name} invited you to "
            f"join True Joy Birthing. She's built her birth plan and wants you to see it. "
            f"Join free: https://truejoybirthing.com/invite/{invite_id}"
        )

        try:
            await postmark_send_email(
                to=invitee_email,
                subject=reminder_subject,
                html=reminder_body,
                reply_to=SUPPORT_EMAIL,
            )

            now = get_now()
            await db.invites.update_one(
                {"invite_id": invite_id},
                {"$set": {"reminder_sent_at": now}},
            )

            logger.info(f"Sent reminder for invite {invite_id} to {invitee_email}")
            sent_count += 1

        except Exception as e:
            logger.warning(f"Failed to send reminder for invite {invite_id} to {invitee_email}: {e}")

    logger.info(f"send_invite_reminders: sent {sent_count} reminder(s) out of {len(stale_invites)} stale invite(s)")
    return {"sent": sent_count, "checked": len(stale_invites)}


@router.post("/process-reminders")
async def process_reminders_endpoint(
    user: User = Depends(check_role(["MOM", "ADMIN"])),
):
    """
    Trigger stale invite reminder processing.
    Can be called by a cron job or manually by an admin or mom.
    Sends a single follow-up email to invites that have been sitting
    in 'sent' status for >3 days without being opened.
    """
    result = await send_invite_reminders()
    return {"status": "ok", **result}