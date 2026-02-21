"""
Email Service Module

Handles all transactional emails for True Joy Birthing app.
Uses Resend API for email delivery.
"""

import os
import logging
from typing import Optional
from datetime import datetime, timezone

import resend

# Configure logging
logger = logging.getLogger(__name__)

# Email configuration - use env variable with fallback
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "True Joy Birthing <noreply@truejoybirthing.com>")
# Format the sender email if it doesn't include display name
if "<" not in SENDER_EMAIL:
    SENDER_EMAIL = f"True Joy Birthing <{SENDER_EMAIL}>"
SUPPORT_EMAIL = "support@truejoybirthing.com"
BRAND_COLOR = "#9F83B6"  # Soft Lavender
ACCENT_COLOR = "#D4A5A5"  # Dusty Rose

# Pricing info
PRO_MONTHLY_PRICE = 29.00
PRO_ANNUAL_PRICE = 276.00


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


async def send_email(to: str, subject: str, html: str, reply_to: Optional[str] = None) -> bool:
    """Send an email using Resend API"""
    try:
        if not resend.api_key:
            logger.warning("Resend API key not configured - email not sent")
            return False
        
        params = {
            "from": SENDER_EMAIL,
            "to": to,
            "subject": subject,
            "html": html,
        }
        
        if reply_to:
            params["reply_to"] = reply_to
        
        resend.Emails.send(params)
        logger.info(f"Email sent successfully to {to}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False


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
        html=html
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
        html=html
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
        html=html
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
        html=html
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
        reply_to=SUPPORT_EMAIL
    )


async def send_trial_started_email(
    provider_email: str,
    provider_name: str,
    trial_end_date: datetime,
    plan_type: str
) -> bool:
    """Send email when provider starts a free trial"""
    
    trial_days = 30
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
        reply_to=SUPPORT_EMAIL
    )
