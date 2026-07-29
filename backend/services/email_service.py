"""
Email Service Module

Handles all transactional emails for True Joy Birthing app.
Uses PostMark API for email delivery.
"""

import os
import base64
import json
import logging
import re
from typing import Optional
from datetime import datetime, timezone

import httpx

# Configure logging
logger = logging.getLogger(__name__)

# Email configuration
POSTMARK_API_KEY = os.environ.get("POSTMARK_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "True Joy Birthing <no-reply@contact.truejoybirthing.com>")
# Format the sender email if it doesn't include display name
if "<" not in SENDER_EMAIL:
    SENDER_EMAIL = f"True Joy Birthing <{SENDER_EMAIL}>"
SUPPORT_EMAIL = "support@truejoybirthing.com"
BRAND_COLOR = "#9F83B6"  # Soft Lavender
ACCENT_COLOR = "#D4A5A5"  # Dusty Rose

# Pricing info
PRO_MONTHLY_PRICE = 29.99
PRO_ANNUAL_PRICE = 274.99

POSTMARK_API_URL = "https://api.postmarkapp.com/email"
POSTMARK_API_URL_WITH_TEMPLATE = "https://api.postmarkapp.com/email/with-template"


def get_email_header() -> str:
    """Get standard email header with logo"""
    return f"""
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, {BRAND_COLOR}15, {ACCENT_COLOR}15);">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; color: {BRAND_COLOR}; margin: 0; font-size: 28px;">
            True Joy Birthing
        </h1>
        <p style="font-family: 'Quicksand', Arial, sans-serif; color: #666; margin: 8px 0 0 0; font-size: 14px;">
            Your birth plan, your team, your support in one place
        </p>
    </div>
    """


def get_email_footer() -> str:
    """Get standard email footer"""
    return f"""
    <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="font-family: 'Quicksand', Arial, sans-serif; color: #999; font-size: 12px; margin: 0;">
            True Joy Birthing | Supporting your journey to joyful birth
        </p>
        <p style="font-family: 'Quicksand', Arial, sans-serif; color: #999; font-size: 12px; margin: 8px 0 0 0;">
            <a href="https://truejoybirthing.com" style="color: {BRAND_COLOR};">Website</a> |
            <a href="https://truejoybirthing.com/contact/" style="color: {BRAND_COLOR};">Contact Us</a>
        </p>
    </div>
    """


def get_button_html(text: str, url: str, color: str = BRAND_COLOR) -> str:
    """Generate a styled button"""
    return f"""
    <div style="text-align: center; margin: 25px 0;">
        <a href="{url}" style="display: inline-block; background-color: {color}; color: white; 
           padding: 14px 32px; text-decoration: none; border-radius: 25px; 
           font-family: 'Quicksand', Arial, sans-serif; font-weight: 600; font-size: 16px;">
            {text}
        </a>
    </div>
    """


def html_to_text(html: str) -> str:
    """Convert HTML email to a plain-text fallback.

    Strips tags, preserves visible text, converts links to 'text (url)' format.
    Used when no explicit TextBody is provided to send_email().
    """
    # Remove script and style blocks entirely
    text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    # Convert <br> and <br/> to newlines
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    # Convert <p> and </p> to newlines
    text = re.sub(r'</?p[^>]*>', '\n', text, flags=re.IGNORECASE)
    # Convert block-level closing tags to newlines
    text = re.sub(r'</(div|h[1-6]|li|tr|td|th)>', '\n', text, flags=re.IGNORECASE)
    # Convert links: <a href="url">text</a> -> text (url)
    text = re.sub(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (\1)', text, flags=re.DOTALL | re.IGNORECASE)
    # Remove all remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode common HTML entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'")
    # Collapse whitespace: multiple blank lines to single, strip trailing spaces
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n[ \t]+', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


async def send_email(
    to: str,
    subject: str,
    html: str,
    reply_to: Optional[str] = None,
    attachments: Optional[list[dict]] = None,
    text_body: Optional[str] = None,
) -> bool:
    """Send an email using PostMark API.

    Always includes a TextBody fallback so email clients that strip HTML
    (notably live.com, hotmail.com, outlook.com) still show the content.
    If text_body is not provided, auto-generates one from the HTML.
    """
    if not POSTMARK_API_KEY:
        logger.warning("POSTMARK_API_KEY not configured - email not sent")
        return False

    # Auto-generate plaintext fallback if not explicitly provided
    if text_body is None:
        text_body = html_to_text(html)

    payload = {
        "From": SENDER_EMAIL,
        "To": to,
        "Subject": subject,
        "HtmlBody": html,
        "TextBody": text_body,
        "MessageStream": "outbound",
    }

    if reply_to:
        payload["ReplyTo"] = reply_to

    if attachments:
        payload["Attachments"] = attachments

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                POSTMARK_API_URL,
                headers={
                    "X-Postmark-Server-Token": POSTMARK_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json=payload,
            )
            result = response.json()
            if response.status_code == 200 and result.get("ErrorCode") == 0:
                logger.info(f"Email sent successfully to {to}: {subject} (ID: {result.get('MessageID', 'unknown')})")
                return True
            else:
                logger.error(f"PostMark API error sending to {to}: {result.get('Message', response.text)}")
                return False
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


async def send_password_reset_email(
    to_email: str,
    user_name: str,
    reset_code: str,
    expiry_minutes: int = 15
) -> bool:
    """Send password reset code email"""

    display_name = user_name if user_name else "there"

    html = f"""
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
                    Password Reset Request
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {display_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    We received a request to reset your password. Use the code below to set a new password:
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}, {ACCENT_COLOR}); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">YOUR RESET CODE</p>
                    <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
                        {reset_code}
                    </p>
                </div>

                <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; border-left: 4px solid #FF9800; margin: 20px 0;">
                    <p style="color: #E65100; margin: 0; font-size: 14px;">
                        This code expires in <strong>{expiry_minutes} minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    If you continue to have trouble, please contact us at
                    <a href="mailto:{SUPPORT_EMAIL}" style="color: {BRAND_COLOR};">{SUPPORT_EMAIL}</a>.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With care,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=to_email,
        subject="Your Password Reset Code - True Joy Birthing",
        html=html,
        reply_to=SUPPORT_EMAIL,
        text_body=f"""Hi {display_name},

We received a request to reset your password. Use the code below to set a new password:

YOUR RESET CODE: {reset_code}

This code expires in {expiry_minutes} minutes. If you didn't request a password reset, you can safely ignore this email.

If you continue to have trouble, please contact us at {SUPPORT_EMAIL}.

With care,
The True Joy Birthing Team
""",
    )


async def send_verification_email(
    to_email: str,
    user_name: str,
    code: str,
    expiry_minutes: int = 15
) -> bool:
    """Send email verification code email"""

    display_name = user_name if user_name else "there"

    html = f"""
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
                    Verify Your Email
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {display_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Welcome to True Joy Birthing! Please use the code below to verify your email address:
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}, {ACCENT_COLOR}); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; opacity: 0.9;">YOUR VERIFICATION CODE</p>
                    <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">
                        {code}
                    </p>
                </div>

                <div style="background: #FFF3E0; padding: 15px; border-radius: 8px; border-left: 4px solid #FF9800; margin: 20px 0;">
                    <p style="color: #E65100; margin: 0; font-size: 14px;">
                        This code expires in <strong>{expiry_minutes} minutes</strong>. If you didn't create an account, you can safely ignore this email.
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    If you continue to have trouble, please contact us at
                    <a href="mailto:{SUPPORT_EMAIL}" style="color: {BRAND_COLOR};">{SUPPORT_EMAIL}</a>.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With care,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=to_email,
        subject="Verify Your Email - True Joy Birthing",
        html=html,
        reply_to=SUPPORT_EMAIL,
        text_body=f"""Hi {display_name},

Welcome to True Joy Birthing! Please use the code below to verify your email address:

YOUR VERIFICATION CODE: {code}

This code expires in {expiry_minutes} minutes. If you didn't create an account, you can safely ignore this email.

If you continue to have trouble, please contact us at {SUPPORT_EMAIL}.

With care,
The True Joy Birthing Team
""",
    )


# ============== CLIENT CONVERSION EMAILS ==============

async def send_welcome_client_email(
    mom_email: str,
    mom_name: str,
    provider_name: str,
    provider_role: str
) -> bool:
    """Send welcome email to Mom when converted from lead to client"""

    role_display = "Doula" if provider_role == "DOULA" else "Midwife"

    html = f"""
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
                    Welcome to the Team, {mom_name}!
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Great news! <strong>{provider_name}</strong>, your {role_display}, has officially added you as a client.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    This means you now have full access to work together, including:
                </p>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Direct messaging with {provider_name}</li>
                    <li>Appointment scheduling and management</li>
                    <li>Digital contracts and paperwork</li>
                    <li>Visit notes and care documentation</li>
                    <li>Birth plan collaboration</li>
                </ul>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #333; margin: 0; font-weight: 600;">
                        Next Steps:
                    </p>
                    <p style="color: #555; margin: 10px 0 0 0; line-height: 1.5;">
                        Open the True Joy Birthing app to view your team and start connecting with {provider_name}.
                    </p>
                </div>

                {get_button_html("Open App", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    We're so excited to support you on your birthing journey!
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With joy,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=mom_email,
        subject=f"Welcome! You're now a client of {provider_name}",
        html=html,
    )


# ============== SUBSCRIPTION EMAILS ==============

async def send_subscription_activated_email(
    provider_email: str,
    provider_name: str,
    plan_type: str,
    end_date: datetime
) -> bool:
    """Send email when provider activates a paid subscription"""

    plan_display = "Monthly" if plan_type == "monthly" else "Annual"
    price = PRO_MONTHLY_PRICE if plan_type == "monthly" else PRO_ANNUAL_PRICE
    savings = "" if plan_type == "monthly" else f" (Save ${(PRO_MONTHLY_PRICE * 12) - PRO_ANNUAL_PRICE:.0f}/year!)"
    end_date_str = end_date.strftime("%B %d, %Y")

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">🎉</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    Welcome to True Joy Pro!
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
                    Thank you for subscribing, {provider_name}! Your Pro subscription is now active.
                </p>

                <div style="background: {BRAND_COLOR}; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.9;">Your Plan</p>
                    <p style="margin: 0; font-size: 24px; font-weight: bold;">
                        True Joy Pro {plan_display}
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">
                        ${price:.2f}/{plan_type.replace('ly', '')}{savings}
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>What's included:</strong>
                </p>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Unlimited client management</li>
                    <li>Digital contracts with e-signatures</li>
                    <li>Professional invoicing</li>
                    <li>Visit notes and documentation</li>
                    <li>Marketplace profile visibility</li>
                    <li>Direct messaging with clients</li>
                </ul>

                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid {BRAND_COLOR};">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>Next billing date:</strong> {end_date_str}
                    </p>
                </div>

                {get_button_html("Go to Dashboard", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Thank you for choosing True Joy Birthing to support your practice!
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With gratitude,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject=f"Welcome to True Joy Pro! Your {plan_display} subscription is active",
        html=html,
    )


async def send_subscription_upgraded_email(
    provider_email: str,
    provider_name: str,
    old_plan: str,
    new_plan: str,
    end_date: datetime
) -> bool:
    """Send email when provider upgrades their subscription (monthly to annual)"""

    savings = (PRO_MONTHLY_PRICE * 12) - PRO_ANNUAL_PRICE
    end_date_str = end_date.strftime("%B %d, %Y")

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">⬆️</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    Upgrade Confirmed!
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
                    Hey {provider_name}, your subscription has been upgraded to the Annual plan!
                </p>

                <div style="display: flex; align-items: center; justify-content: center; margin: 25px 0; gap: 15px;">
                    <div style="text-align: center; padding: 15px 25px; background: #f0f0f0; border-radius: 8px; text-decoration: line-through; opacity: 0.6;">
                        <p style="margin: 0; color: #999; font-size: 12px;">OLD PLAN</p>
                        <p style="margin: 5px 0 0 0; color: #666;">Monthly</p>
                        <p style="margin: 5px 0 0 0; color: #666;">${PRO_MONTHLY_PRICE}/mo</p>
                    </div>
                    <span style="font-size: 24px;">→</span>
                    <div style="text-align: center; padding: 15px 25px; background: {BRAND_COLOR}; border-radius: 8px; color: white;">
                        <p style="margin: 0; font-size: 12px; opacity: 0.9;">NEW PLAN</p>
                        <p style="margin: 5px 0 0 0; font-weight: bold;">Annual</p>
                        <p style="margin: 5px 0 0 0;">${PRO_ANNUAL_PRICE}/yr</p>
                    </div>
                </div>

                <div style="background: linear-gradient(135deg, #4CAF5020, #8BC34A20); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <p style="margin: 0; color: #4CAF50; font-size: 24px; font-weight: bold;">
                        You're saving ${savings:.0f}/year!
                    </p>
                    <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">
                        That's ${savings/12:.0f} extra in your pocket each month
                    </p>
                </div>

                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid {BRAND_COLOR};">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>Your annual subscription renews:</strong> {end_date_str}
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 25px 0 0 0;">
                    Thank you for your continued support! We're honored to be part of your practice.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With gratitude,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="Upgrade confirmed! You're now on the Annual plan",
        html=html,
    )


async def send_subscription_downgraded_email(
    provider_email: str,
    provider_name: str,
    old_plan: str,
    new_plan: str,
    end_date: datetime
) -> bool:
    """Send email when provider downgrades their subscription (annual to monthly)"""

    end_date_str = end_date.strftime("%B %d, %Y")

    html = f"""
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
                    Plan Change Confirmed
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {provider_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Your subscription has been changed from the <strong>Annual</strong> plan to the <strong>Monthly</strong> plan.
                </p>

                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666;">New Plan:</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">Monthly (${PRO_MONTHLY_PRICE}/mo)</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Effective Date:</td>
                            <td style="padding: 8px 0; text-align: right; color: #333;">{end_date_str}</td>
                        </tr>
                    </table>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    You'll continue to have full Pro access. Your billing will now be monthly at ${PRO_MONTHLY_PRICE}/month.
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #333; margin: 0; font-weight: 600;">
                        💡 Did you know?
                    </p>
                    <p style="color: #555; margin: 10px 0 0 0; line-height: 1.5;">
                        You can save ${(PRO_MONTHLY_PRICE * 12) - PRO_ANNUAL_PRICE:.0f}/year by switching to annual billing. 
                        Upgrade anytime from your subscription settings!
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Questions? We're here to help!
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    Best,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="Your plan has been changed to Monthly billing",
        html=html,
    )


async def send_subscription_cancelled_email(
    provider_email: str,
    provider_name: str,
    end_date: Optional[datetime]
) -> bool:
    """Send email when provider cancels their subscription"""

    end_date_str = end_date.strftime("%B %d, %Y") if end_date else "the end of your current billing period"

    html = f"""
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
                    We're Sorry to See You Go
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {provider_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Your True Joy Pro subscription has been cancelled. We're sad to see you go, but we understand.
                </p>

                <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; border-left: 4px solid #FF9800; margin: 20px 0;">
                    <p style="color: #E65100; margin: 0; font-weight: 600;">
                        Good news: Your access continues!
                    </p>
                    <p style="color: #666; margin: 10px 0 0 0; line-height: 1.5;">
                        You'll retain full Pro access until <strong>{end_date_str}</strong>. 
                        After that, you'll still be able to access your data in read-only mode.
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>What happens next:</strong>
                </p>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Pro features remain active until {end_date_str}</li>
                    <li>Your existing client data will be preserved</li>
                    <li>You can resubscribe anytime to regain full access</li>
                </ul>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #333; margin: 0; font-weight: 600;">
                        Changed your mind?
                    </p>
                    <p style="color: #555; margin: 10px 0 0 0; line-height: 1.5;">
                        You can reactivate your subscription anytime from the app. 
                        We'd love to have you back!
                    </p>
                </div>

                {get_button_html("Reactivate Subscription", "https://truejoybirthing.com/app", BRAND_COLOR)}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    We'd love to hear your feedback on how we can improve. Feel free to reply to this email or 
                    <a href="https://truejoybirthing.com/contact/" style="color: {BRAND_COLOR};">contact us</a>.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    Wishing you all the best,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="Your True Joy Pro subscription has been cancelled",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )


async def send_trial_started_email(
    provider_email: str,
    provider_name: str,
    trial_end_date: datetime,
    plan_type: str
) -> bool:
    """Send email when provider starts a free trial"""

    trial_days = 14
    end_date_str = trial_end_date.strftime("%B %d, %Y")
    plan_display = "Monthly" if plan_type == "monthly" else "Annual"

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">🌟</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    Your {trial_days}-Day Free Trial Has Started!
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
                    Welcome, {provider_name}! You now have full access to True Joy Pro.
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}, {ACCENT_COLOR}); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">FREE TRIAL</p>
                    <p style="margin: 10px 0; font-size: 32px; font-weight: bold;">{trial_days} Days</p>
                    <p style="margin: 0; font-size: 14px;">Full Pro Access • No Credit Card Required</p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>Here's what you can do during your trial:</strong>
                </p>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Add and manage unlimited clients</li>
                    <li>Create digital contracts with e-signatures</li>
                    <li>Send professional invoices</li>
                    <li>Document visits and notes</li>
                    <li>Appear in the provider marketplace</li>
                    <li>Message clients directly in the app</li>
                </ul>

                <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid {BRAND_COLOR};">
                    <p style="color: #666; margin: 0; font-size: 14px;">
                        <strong>Trial ends:</strong> {end_date_str}
                    </p>
                    <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">
                        <strong>Selected plan:</strong> {plan_display} (${PRO_MONTHLY_PRICE if plan_type == 'monthly' else PRO_ANNUAL_PRICE}/{plan_type.replace('ly', '')})
                    </p>
                </div>

                {get_button_html("Start Exploring", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    We're excited to support your practice. If you have any questions, just reply to this email!
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With joy,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject=f"Welcome! Your {trial_days}-day free trial has started",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )




# ============== PROVIDER ONBOARDING SEQUENCE ==============
# Sent to ALL doulas/midwives at signup — mom-experience focused, feedback-driven.
# Goal: help providers understand what moms experience, collect feedback, build connection.
# Day 0, 3, 7, 10, 14 after signup.

async def send_provider_onboarding_day0(
    provider_email: str,
    provider_name: str,
) -> bool:
    """Day 0 — Welcome + what moms see when they open the app"""
    display_name = provider_name if provider_name else "there"

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">🌱</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    Welcome to True Joy Birthing, {display_name}
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    You're now part of a community built around one belief: <strong>every mom deserves a joyful, supported birth.</strong>
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    As a birth professional, you already know that the relationship between a provider and a mom is everything. True Joy Birthing exists to strengthen that relationship — and we want your help shaping it.
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 25px; border-radius: 8px; margin: 25px 0;">
                    <p style="color: #333; margin: 0 0 10px 0; font-weight: 600; font-size: 17px;">
                        What moms see when they open the app:
                    </p>
                    <ul style="color: #555; line-height: 1.8; margin: 10px 0 0 0; padding-left: 20px;">
                        <li><strong>Weekly pregnancy guidance</strong> — personalized tips and affirmations for each week</li>
                        <li><strong>Birth plan builder</strong> — they document their preferences and share them with you</li>
                        <li><strong>Contraction timer</strong> — simple, reliable tracking during labor</li>
                        <li><strong>Wellness check-ins</strong> — mood and wellbeing tracking through pregnancy and postpartum</li>
                        <li><strong>Provider search</strong> — moms find doulas and midwives in their area (that's you)</li>
                    </ul>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Over the next two weeks, we'll send you a few emails about what your moms are experiencing in the app — and ask for your feedback on how we can make it better for them.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>Your voice matters here.</strong> You're the expert on what moms need. We're building this for you and your clients.
                </p>

                {get_button_html("Explore the App", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Reply to this email anytime — we read every response.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With joy,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="Welcome to True Joy Birthing — let's support moms together 🌿",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )


async def send_provider_onboarding_day3(
    provider_email: str,
    provider_name: str,
) -> bool:
    """Day 3 — How moms use the app: birth plans, contractions, wellness"""
    display_name = provider_name if provider_name else "there"

    html = f"""
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
                    What Your Moms Are Doing Right Now
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {display_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    The moms on True Joy Birthing aren't just reading articles — they're actively using the app throughout their pregnancy. Here's what they're experiencing:
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #333; margin: 0 0 15px 0; font-weight: 600;">
                        📋 Birth Plans
                    </p>
                    <p style="color: #555; margin: 0 0 15px 0; line-height: 1.5;">
                        Moms build their birth preferences step by step — pain management, labor positions, postpartum care. When they connect with a provider, they can share the plan directly. <strong>You see exactly what they want before the first conversation.</strong>
                    </p>

                    <p style="color: #333; margin: 15px 0 10px 0; font-weight: 600;">
                        ⏱️ Contraction Timer
                    </p>
                    <p style="color: #555; margin: 0 0 15px 0; line-height: 1.5;">
                        During labor, moms use a simple one-tap timer. It tracks frequency and duration automatically — no more clipboard and pen. The data stays with their pregnancy record.
                    </p>

                    <p style="color: #333; margin: 15px 0 10px 0; font-weight: 600;">
                        💚 Wellness Check-ins
                    </p>
                    <p style="color: #555; margin: 0; line-height: 1.5;">
                        Moms log their mood, energy, and physical symptoms weekly. This gives you a window into how they're really doing — not just at appointments, but between them.
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>Here's our question for you:</strong> When a mom shares her birth plan with you, what's the first thing you look for? What information is usually missing that you wish was there?
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Your answer helps us design a better birth plan template for every mom on the app.
                </p>

                <div style="background: #FFF8E1; padding: 20px; border-radius: 8px; border-left: 4px solid #FFB300; margin: 20px 0;">
                    <p style="color: #333; margin: 0; font-weight: 600;">
                        💬 Just hit reply
                    </p>
                    <p style="color: #555; margin: 8px 0 0 0; line-height: 1.5;">
                        Tell us: what's missing from the mom experience that would make your job easier and their birth better?
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Warmly,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="What your moms are doing in the app right now 📋",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )


async def send_provider_onboarding_day7(
    provider_email: str,
    provider_name: str,
) -> bool:
    """Day 7 — Feedback request: how can we make this better for moms?"""
    display_name = provider_name if provider_name else "there"

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">💬</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    How Can We Make This Better for Moms?
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {display_name}, it's been a week since you joined. We have one simple ask:
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}15, {ACCENT_COLOR}15); padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
                    <p style="color: #333; margin: 0; font-size: 18px; font-weight: 600; line-height: 1.6;">
                        What would make True Joy Birthing better for the moms you serve?
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    You work with moms every day. You see what they worry about, what they forget, what they wish they'd known. That knowledge is exactly what we need.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Some things we're already hearing from providers:
                </p>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>"Moms need more guidance on what to expect postpartum, not just during labor."</li>
                    <li>"I wish the birth plan had a section for emergency preferences and cesarean births."</li>
                    <li>"The wellness check-ins are great, but moms forget to fill them out."</li>
                </ul>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    What would <em>you</em> add? What do your moms struggle with that an app could help with?
                </p>

                <div style="background: #FFF8E1; padding: 20px; border-radius: 8px; border-left: 4px solid #FFB300; margin: 20px 0;">
                    <p style="color: #333; margin: 0; font-weight: 600;">
                        No form. No survey. Just reply.
                    </p>
                    <p style="color: #555; margin: 8px 0 0 0; line-height: 1.5;">
                        Type your thoughts and hit reply. We read every email and use them to shape what we build next.
                    </p>
                </div>

                {get_button_html("Open the App", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Thank you for being part of this — your experience is what makes it better.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    Warmly,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="💬 One question: how can we make this better for moms?",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )


async def send_provider_onboarding_day10(
    provider_email: str,
    provider_name: str,
) -> bool:
    """Day 10 — Mom experience spotlight: what your clients are feeling"""
    display_name = provider_name if provider_name else "there"

    html = f"""
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
                    Through a Mom's Eyes
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {display_name},
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    We've been talking to moms on the app, and we want to share what we're hearing — because you're the one who can turn these insights into better care.
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 25px; border-radius: 8px; margin: 20px 0;">
                    <p style="color: #333; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">
                        What moms are telling us:
                    </p>

                    <p style="color: #555; margin: 0 0 12px 0; line-height: 1.5; font-style: italic;">
                        "I love my doula, but between appointments I forget everything we discussed. I wish I had somewhere to keep track."
                    </p>
                    <p style="color: #999; margin: 0 0 20px 0; font-size: 13px;">— Mom, 24 weeks</p>

                    <p style="color: #555; margin: 0 0 12px 0; line-height: 1.5; font-style: italic;">
                        "The weekly tips make me feel less alone. But I want to know what's actually happening in <em>my</em> body, not just generic advice."
                    </p>
                    <p style="color: #999; margin: 0 0 20px 0; font-size: 13px;">— Mom, 16 weeks</p>

                    <p style="color: #555; margin: 0 0 12px 0; line-height: 1.5; font-style: italic;">
                        "I found my midwife through the app and it changed everything. I didn't know I could have this level of support."
                    </p>
                    <p style="color: #999; margin: 0; font-size: 13px;">— Mom, 32 weeks</p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Here's the pattern: <strong>moms want connection, not just information.</strong> They want to feel known, not just educated. Every feature in True Joy Birthing is built around that idea.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    When you connect with a mom through the app, you're not just a contact — you're her team. The birth plan she shares with you, the wellness logs she keeps, the questions she asks — they all give you context that most providers never get.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>What's the one thing you wish you knew about a mom before your first meeting?</strong> That's what we want to build next.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Reply and tell us.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Warmly,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="Through a mom's eyes — what your clients are feeling 💜",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )


async def send_provider_onboarding_day14(
    provider_email: str,
    provider_name: str,
) -> bool:
    """Day 14 — Final feedback + what's coming next"""
    display_name = provider_name if provider_name else "there"

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">🌿</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    Two Weeks In — What's Next?
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Hi {display_name}, it's been two weeks since you joined True Joy Birthing. We hope you've had a chance to explore what the app offers — and we'd love to know what you think.
                </p>

                <div style="background: linear-gradient(135deg, {BRAND_COLOR}10, {ACCENT_COLOR}10); padding: 25px; border-radius: 8px; margin: 25px 0;">
                    <p style="color: #333; margin: 0 0 15px 0; font-weight: 600; font-size: 16px;">
                        What we're building next:
                    </p>
                    <ul style="color: #555; line-height: 1.8; margin: 0 0 10px 0; padding-left: 20px;">
                        <li><strong>Postpartum care pathways</strong> — guided support for the 4th trimester, built with input from doulas and midwives</li>
                        <li><strong>Enhanced birth plans</strong> — including emergency preferences and cesarean sections (based on provider feedback)</li>
                        <li><strong>Better provider-mom messaging</strong> — real-time communication that keeps everything in one place</li>
                        <li><strong>Visit notes that moms can see</strong> — shared documentation that keeps everyone informed</li>
                    </ul>
                    <p style="color: #555; margin: 10px 0 0 0; line-height: 1.5; font-size: 14px;">
                        Every item on this list came from a provider like you.
                    </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    <strong>One last ask:</strong> If you could add or change one thing in the app to better serve the moms you work with, what would it be?
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    Your feedback directly shapes what we build. The postpartum pathway, the birth plan improvements, the messaging — all of it started with a provider hitting "reply" and telling us what they needed.
                </p>

                <div style="background: #FFF8E1; padding: 20px; border-radius: 8px; border-left: 4px solid #FFB300; margin: 20px 0;">
                    <p style="color: #333; margin: 0; font-weight: 600;">
                        This isn't the last you'll hear from us
                    </p>
                    <p style="color: #555; margin: 8px 0 0 0; line-height: 1.5;">
                        We'll keep you posted as new features launch. And if you ever have an idea, just reply to any email — it goes straight to our team.
                    </p>
                </div>

                {get_button_html("Open the App", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Thank you for being here, {display_name}. The moms you support deserve the best — and so do you.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    With gratitude,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject="Two weeks in — what's next for True Joy Birthing 🌿",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )


# ============== TRIAL CONVERSION EMAIL ==============
# Sent only to trial users, 2 days before trial ends.

async def send_trial_ending_email(
    provider_email: str,
    provider_name: str,
    days_remaining: int,
    trial_end_date: datetime,
) -> bool:
    """Trial ending soon — keep your practice running"""
    end_date_str = trial_end_date.strftime("%B %d, %Y")
    display_name = provider_name if provider_name else "there"

    html = f"""
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
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 48px;">⏰</span>
                </div>

                <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #333; margin: 0 0 20px 0; text-align: center;">
                    Your Trial Ends Soon
                </h2>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0; text-align: center;">
                    Hi {display_name}, your free trial ends <strong>{end_date_str}</strong> — just <strong>{days_remaining} days</strong> from now.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 0 0 15px 0;">
                    You've had a chance to explore the app — client management, contracts, invoicing, the marketplace. If it's working for your practice, don't let it lapse:
                </p>

                <div style="background: {BRAND_COLOR}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.9;">TRUE JOY PRO</p>
                    <p style="margin: 5px 0; font-size: 22px; font-weight: bold;">
                        ${PRO_MONTHLY_PRICE}/mo or ${PRO_ANNUAL_PRICE}/yr
                    </p>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">
                        Annual saves you ${(PRO_MONTHLY_PRICE * 12) - PRO_ANNUAL_PRICE:.0f}/year
                    </p>
                </div>

                <ul style="color: #555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                    <li>Keep receiving leads from moms in your area</li>
                    <li>Keep your client management, contracts, and invoicing</li>
                    <li>Keep your marketplace profile visible</li>
                    <li>All your data stays — no re-setup</li>
                </ul>

                {get_button_html("Subscribe Now", "https://truejoybirthing.com/app")}

                <p style="color: #555; line-height: 1.6; margin: 20px 0 0 0;">
                    Not ready yet? No worries — your data is preserved. You can subscribe anytime to regain full access. And we'd still love your feedback on how the app can better serve moms. Just reply to this email.
                </p>

                <p style="color: #555; line-height: 1.6; margin: 15px 0 0 0;">
                    Warmly,<br>
                    <strong style="color: {BRAND_COLOR};">The True Joy Birthing Team</strong>
                </p>
            </div>

            {get_email_footer()}
        </div>
    </body>
    </html>
    """

    return await send_email(
        to=provider_email,
        subject=f"⏰ Your trial ends in {days_remaining} days — keep your practice running",
        html=html,
        reply_to=SUPPORT_EMAIL,
    )
