"""
Invoices Routes Module

Handles invoice management for both Doula and Midwife providers, including:
- Invoice CRUD operations
- Payment instructions templates
- Invoice sending and reminders
- Invoice status management (Draft, Sent, Paid, Cancelled)
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
import uuid
import logging
import asyncio

from .dependencies import db, get_now, check_role, User, SENDER_EMAIL, create_notification

# Email sending via email_service
from services.email_service import send_email as postmark_send_email

router = APIRouter(tags=["Invoices"])


async def notify_user(user_id: str, notif_type: str, title: str, message: str, data: Optional[dict] = None, send_push: bool = True):
    """Create an in-app notification + Expo push via create_notification.

    Falls back to a direct insert (in-app only, no push) if route dependencies
    were never initialized — matches the legacy behavior instead of crashing.
    """
    if create_notification is not None:
        await create_notification(user_id, notif_type, title, message, data=data or {}, send_push=send_push)
        return
    now = get_now()
    await db.notifications.insert_one({
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "data": data or {},
        "read": False,
        "created_at": now
    })


# ============== PYDANTIC MODELS ==============

class PaymentPlanInstallment(BaseModel):
    """Single installment of a provider's payment plan.
    
    status options: 'due', 'overdue', 'partial', 'paid'
    """
    installment_no: int
    amount: float
    due_date: str
    status: str = "due"


class PaymentPlanCreate(BaseModel):
    """Create/update a payment plan within an invoice.
    
    - 'pay_once' = single payment (original behavior is preserved).
    - 'installments' = array of installments for a multi-part payment plan.
    """
    installment_count: Optional[int] = None
    amount_per_installment: Optional[float] = None
    plan_description: Optional[str] = "Standard payment plan"
    due_frequency: Optional[str] = "weekly"
    first_due_date: Optional[str] = None
    installments: Optional[list] = None
    # If no schedule details are specified, creates a 'pay once' plan


def build_payment_plan(invoice_data: dict, now: datetime, invoice_amount: float | None = None) -> dict:
    """Build a payment_plan subdoc from invoice creation/update data.
    
    Returns a payment_plan dict suitable for embedding in an invoice doc,
    or None if no plan is specified (pay-once invoice).
    """
    installments_raw = invoice_data.get('installments')
    installment_count = invoice_data.get('installment_count')
    amount_per_installment = invoice_data.get('amount_per_installment')
    first_due_date = invoice_data.get('first_due_date')
    due_frequency = invoice_data.get('due_frequency', 'weekly')
    plan_description = invoice_data.get('plan_description', 'Standard payment plan')

    # No plan data at all = pay once (None signals no subdoc)
    if not installments_raw and not installment_count and not amount_per_installment:
        return None

    # If installments are provided explicitly, validate and use them directly
    if installments_raw:
        installments = []
        for inst in installments_raw:
            installment_no = inst.get('installment_no')
            amount = inst.get('amount')
            due_date = inst.get('due_date')
            status = inst.get('status', 'due')
            if installment_no is None or amount is None or due_date is None:
                raise HTTPException(
                    status_code=422,
                    detail=f"Each installment needs installment_no, amount, and due_date"
                )
            installments.append({
                "installment_no": installment_no,
                "amount": float(amount),
                "due_date": due_date,
                "status": status,
            })
        total = sum(i['amount'] for i in installments)
        return {
            "installment_count": len(installments),
            "amount_per_installment": None,
            "plan_description": plan_description,
            "due_frequency": due_frequency,
            "first_due_date": first_due_date,
            "installments": installments,
            "total_amount": total,
            "status": _rollup_status(installments),
        }

    # Otherwise derive installments from count + per-installment amount
    if installment_count and amount_per_installment:
        if installment_count < 1:
            raise HTTPException(status_code=422, detail="installment_count must be >= 1")
        if amount_per_installment <= 0:
            raise HTTPException(status_code=422, detail="amount_per_installment must be > 0")
        if not first_due_date:
            raise HTTPException(status_code=422, detail="first_due_date required when using count+amount mode")

        freq_delta = {
            "weekly": timedelta(weeks=1),
            "biweekly": timedelta(weeks=2),
            "monthly": timedelta(days=30),
            "monthly": timedelta(days=30),
        }.get((due_frequency or "weekly").lower(), timedelta(weeks=1))

        first_dt = datetime.strptime(first_due_date, "%Y-%m-%d")
        installments = []
        total = 0.0
        for i in range(1, installment_count + 1):
            # First installment lands ON first_due_date; later ones step by frequency
            due_dt = first_dt + freq_delta * (i - 1)
            installments.append({
                "installment_no": i,
                "amount": float(amount_per_installment),
                "due_date": due_dt.strftime("%Y-%m-%d"),
                "status": "due",
            })
            total += float(amount_per_installment)
        # Adjust last installment to absorb rounding difference. The invoice total is the
        # source of truth: installments must sum to it, to the cent. (Passed in by the
        # create-plan routes from the invoice doc — the plan payload itself has no amount.)
        if invoice_amount:
            target = round(float(invoice_amount), 2)
            if abs(total - target) > 0.001:
                diff = round(target - total + float(amount_per_installment), 2)
                installments[-1]["amount"] = diff
                total = sum(i['amount'] for i in installments)
            if abs(total - target) > 0.001:
                raise HTTPException(
                    status_code=422,
                    detail=f"Installments total {round(total, 2)} but invoice amount is {target}; adjust amount_per_installment or provide installments directly"
                )

        return {
            "installment_count": len(installments),
            "amount_per_installment": float(amount_per_installment),
            "plan_description": plan_description,
            "due_frequency": due_frequency,
            "first_due_date": first_due_date,
            "installments": installments,
            "total_amount": round(total, 2),
            "status": _rollup_status(installments),
        }

    # Only count or only amount provided without the other = error
    raise HTTPException(
        status_code=422,
        detail="Provide both installment_count and amount_per_installment, or provide installments array directly"
    )


def _rollup_status(installments: list) -> str:
    """Compute the payment_plan status roll-up from installment statuses."""
    if not installments:
        return "due"
    statuses = {i['status'] for i in installments}
    if statuses == {'paid'}:
        return "paid"
    if statuses == {'due'}:
        return "due"
    if 'paid' in statuses and 'due' in statuses:
        return "partial"
    if 'paid' in statuses and 'overdue' in statuses:
        return "partial"
    if 'overdue' in statuses and statuses == {'overdue'}:
        return "overdue"
    return "due"


class PaymentInstructionsTemplateCreate(BaseModel):
    label: str
    instructions_text: str
    is_default: bool = False


class PaymentMethodUpdate(BaseModel):
    """Provider-configurable direct-payment handles (Q3, council 2026-09-11).

    Copy-to-clipboard model only — TJB never processes payments; these are
    informational handles the mom copies into her own payment app. Zelle is
    text-only (phone/email) because it has no public deep-link scheme.
    """
    venmo_handle: Optional[str] = None
    cashapp_cashtag: Optional[str] = None
    paypal_link: Optional[str] = None
    zelle_contact: Optional[str] = None


class InvoiceCreate(BaseModel):
    client_id: str
    invoice_number: Optional[str] = None
    description: str
    amount: float
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    payment_instructions_text: Optional[str] = None
    notes_for_client: Optional[str] = None


class InvoiceUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    payment_instructions_text: Optional[str] = None
    notes_for_client: Optional[str] = None
    status: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

async def generate_invoice_number(user_id: str) -> str:
    """Generate a unique invoice number like TJ-2026-001"""
    year = datetime.now().year
    count = await db.invoices.count_documents({"provider_id": user_id})
    return f"TJ-{year}-{str(count + 1).zfill(3)}"


# ============== PAYMENT INSTRUCTIONS TEMPLATE ROUTES ==============

@router.get("/payment-methods")
async def get_payment_methods(user: User = Depends(check_role(["DOULA", "MIDWIFE", "LACTATION"]))):
    """Get this provider's direct-payment handles (Q3)"""
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "payment_methods": 1, "full_name": 1}
    )
    return {
        "provider_name": user_doc.get("full_name") if user_doc else None,
        "payment_methods": user_doc.get("payment_methods", {}) if user_doc else {},
    }


@router.put("/payment-methods")
async def update_payment_methods(data: PaymentMethodUpdate, user: User = Depends(check_role(["DOULA", "MIDWIFE", "LACTATION"]))):
    """Set this provider's direct-payment handles (Q3).

    Values are stored verbatim after light normalization (strip whitespace,
    strip leading '@'/$ on handles so display formatting stays consistent).
    Empty string clears a field.
    """
    methods = {}
    if data.venmo_handle is not None:
        methods["venmo_handle"] = (data.venmo_handle.strip().lstrip("@") if data.venmo_handle.strip() else "")
    if data.cashapp_cashtag is not None:
        methods["cashapp_cashtag"] = (data.cashapp_cashtag.strip().lstrip("$") if data.cashapp_cashtag.strip() else "")
    if data.paypal_link is not None:
        methods["paypal_link"] = data.paypal_link.strip()
    if data.zelle_contact is not None:
        methods["zelle_contact"] = data.zelle_contact.strip()

    await db.users.update_one(
        {"user_id": user.user_id},
        {
            "$set": {
                "payment_methods": methods,
                "payment_methods_updated_at": get_now(),
            }
        },
    )
    return {"message": "Payment methods updated", "payment_methods": methods}


@router.get("/payment-instructions")
async def get_payment_instructions(user: User = Depends(check_role(["DOULA", "MIDWIFE", "LACTATION"]))):
    """Get all payment instructions templates for the user"""
    templates = await db.payment_instructions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return templates


@router.post("/payment-instructions")
async def create_payment_instructions(data: PaymentInstructionsTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE", "LACTATION"]))):
    """Create a new payment instructions template"""
    now = get_now()
    
    if data.is_default:
        await db.payment_instructions.update_many(
            {"user_id": user.user_id},
            {"$set": {"is_default": False}}
        )
    
    template = {
        "template_id": f"pi_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "label": data.label,
        "instructions_text": data.instructions_text,
        "is_default": data.is_default,
        "created_at": now,
        "updated_at": now
    }
    
    await db.payment_instructions.insert_one(template)
    template.pop('_id', None)
    return template


@router.put("/payment-instructions/{template_id}")
async def update_payment_instructions(template_id: str, data: PaymentInstructionsTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE", "LACTATION"]))):
    """Update a payment instructions template"""
    now = get_now()
    
    if data.is_default:
        await db.payment_instructions.update_many(
            {"user_id": user.user_id, "template_id": {"$ne": template_id}},
            {"$set": {"is_default": False}}
        )
    
    result = await db.payment_instructions.update_one(
        {"template_id": template_id, "user_id": user.user_id},
        {"$set": {
            "label": data.label,
            "instructions_text": data.instructions_text,
            "is_default": data.is_default,
            "updated_at": now
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated"}


@router.delete("/payment-instructions/{template_id}")
async def delete_payment_instructions(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE", "LACTATION"]))):
    """Delete a payment instructions template"""
    result = await db.payment_instructions.delete_one(
        {"template_id": template_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


# ============== DOULA INVOICE ROUTES ==============

# ============== DOULA INVOICE ROUTES ==============

async def nudge_stale_payment_claims(provider_id: str, provider_type: str):
    """48h nudge: notify the provider once per stale 'Payment Claimed' invoice.

    Council Q2 refinement — providers who ignore a payment claim leave moms in
    limbo. Swept lazily on provider invoice-list fetch (event-driven, no cron).
    Rate-limited to one nudge per 24h per invoice via payment_claimed_nudged_at.
    """
    if db is None:
        return
    cutoff = get_now() - timedelta(hours=48)
    stale = await db.invoices.find(
        {
            "provider_id": provider_id,
            "provider_type": provider_type,
            "status": "Payment Claimed",
            "payment_claimed_at": {"$lt": cutoff},
            "$or": [
                {"payment_claimed_nudged_at": {"$exists": False}},
                {"payment_claimed_nudged_at": None},
                {"payment_claimed_nudged_at": {"$lt": get_now() - timedelta(hours=24)}},
            ],
        },
        {"_id": 0, "invoice_id": 1, "invoice_number": 1, "client_name": 1, "payment_claimed_at": 1}
    ).to_list(10)

    for invoice in stale:
        await notify_user(
            provider_id,
            "invoice_payment_claimed_nudge",
            "Payment Confirmation Pending",
            f"{invoice.get('client_name', 'A client')}'s payment claim on invoice {invoice['invoice_number']} has been waiting 48+ hours. Confirm or reopen it.",
            data={"invoice_id": invoice["invoice_id"]},
            send_push=True
        )
        await db.invoices.update_one(
            {"invoice_id": invoice["invoice_id"]},
            {"$set": {"payment_claimed_nudged_at": get_now()}}
        )


@router.get("/doula/invoices")
async def get_doula_invoices(user: User = Depends(check_role(["DOULA"])), status: Optional[str] = None):
    """Get all invoices, optionally filtered by status"""
    # Lazy 48h-nudge sweep for unconfirmed payment claims (no cron dependency)
    if status is None:
        await nudge_stale_payment_claims(user.user_id, "DOULA")

    query = {"provider_id": user.user_id, "provider_type": "DOULA"}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices


@router.post("/doula/invoices")
async def create_doula_invoice(invoice_data: InvoiceCreate, user: User = Depends(check_role(["DOULA"]))):
    """Create a new invoice"""
    client = await db.clients.find_one({"client_id": invoice_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    invoice_number = invoice_data.invoice_number or await generate_invoice_number(user.user_id)
    
    payment_text = invoice_data.payment_instructions_text
    if not payment_text:
        default_template = await db.payment_instructions.find_one(
            {"user_id": user.user_id, "is_default": True},
            {"_id": 0}
        )
        if default_template:
            payment_text = default_template.get("instructions_text")
    
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "DOULA",
        "client_id": invoice_data.client_id,
        "client_name": client["name"],
        "invoice_number": invoice_number,
        "description": invoice_data.description,
        "amount": invoice_data.amount,
        "issue_date": invoice_data.issue_date or now.strftime("%Y-%m-%d"),
        "due_date": invoice_data.due_date,
        "payment_instructions_text": payment_text,
        "notes_for_client": invoice_data.notes_for_client,
        "status": "Draft",
        "sent_at": None,
        "paid_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.invoices.insert_one(invoice)
    invoice.pop('_id', None)
    return invoice


@router.get("/doula/invoices/{invoice_id}")
async def get_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/doula/invoices/{invoice_id}")
async def update_doula_invoice(invoice_id: str, update_data: InvoiceUpdate, user: User = Depends(check_role(["DOULA"]))):
    """Update an invoice"""
    now = get_now()
    
    updates = {k: v for k, v in update_data.dict().items() if v is not None}
    updates["updated_at"] = now
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice updated"}


@router.delete("/doula/invoices/{invoice_id}")
async def delete_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Delete an invoice (only Draft invoices)"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") != "Draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be deleted")
    
    await db.invoices.delete_one({"invoice_id": invoice_id})
    return {"message": "Invoice deleted"}


@router.post("/doula/invoices/{invoice_id}/send")
async def send_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send invoice to client"""
    now = get_now()
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "Sent", "sent_at": now, "updated_at": now}}
    )
    
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        # Route through create_notification so the mom also gets an Expo push
        # (direct inserts here previously bypassed push entirely).
        await notify_user(
            client["linked_mom_id"],
            "invoice_received",
            "New Invoice",
            f"You have received an invoice for ${invoice['amount']:.2f} from your doula.",
            data={"invoice_id": invoice_id},
            send_push=True
        )
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                await postmark_send_email(
                    to=mom["email"],
                    subject=f"Invoice #{invoice['invoice_number']} from {user.full_name}",
                    html=f"""
                        <h2>You have received an invoice</h2>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            Payments are made directly to your doula using the instructions provided. 
                            True Joy Birthing does not process or guarantee payments between you and your provider.
                        </p>
                    """,
                )
            except Exception as e:
                logging.error(f"Failed to send invoice email: {e}")
    
    return {"message": "Invoice sent"}


@router.post("/doula/invoices/{invoice_id}/mark-paid")
async def mark_doula_invoice_paid(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Mark invoice as paid and remove from Mom's notifications"""
    now = get_now()
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Paid", "paid_at": now, "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        await db.notifications.update_many(
            {
                "user_id": client["linked_mom_id"],
                "type": {"$in": ["invoice_received", "invoice_reminder"]},
                "data.invoice_id": invoice_id
            },
            {"$set": {"read": True, "resolved": True, "resolved_at": now}}
        )
        
        await notify_user(
            client["linked_mom_id"],
            "invoice_paid",
            "Payment Received",
            f"Your payment of ${invoice['amount']:.2f} has been confirmed. Thank you!",
            data={"invoice_id": invoice_id}
        )
    
    return {"message": "Invoice marked as paid"}


@router.post("/doula/invoices/{invoice_id}/cancel")
async def cancel_doula_invoice(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Cancel an invoice"""
    now = get_now()
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Cancelled", "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice cancelled"}


@router.post("/doula/invoices/{invoice_id}/send-reminder")
async def send_doula_invoice_reminder(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Send a payment reminder for a Sent invoice"""
    now = get_now()
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["status"] != "Sent":
        raise HTTPException(status_code=400, detail="Reminders can only be sent for invoices with 'Sent' status")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"last_reminder_sent": now, "updated_at": now}}
    )
    
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        await notify_user(
            client["linked_mom_id"],
            "invoice_reminder",
            "Payment Reminder",
            f"Friendly reminder: You have an unpaid invoice for ${invoice['amount']:.2f} due {invoice.get('due_date', 'soon')}.",
            data={"invoice_id": invoice_id}
        )
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                days_overdue = ""
                if invoice.get("due_date"):
                    try:
                        due_date = datetime.strptime(invoice["due_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        if now > due_date:
                            days = (now - due_date).days
                            days_overdue = f"<p style='color: #d32f2f;'><strong>This invoice is {days} day(s) overdue.</strong></p>"
                    except:
                        pass
                
                await postmark_send_email(
                    to=mom["email"],
                    subject=f"Payment Reminder: Invoice #{invoice['invoice_number']}",
                    html=f"""
                        <h2>Payment Reminder</h2>
                        <p>This is a friendly reminder about your outstanding invoice.</p>
                        {days_overdue}
                        <hr>
                        <p><strong>Invoice #:</strong> {invoice['invoice_number']}</p>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount Due:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            If you have already made this payment, please disregard this reminder.
                            Payments are made directly to your doula using the instructions provided.
                        </p>
                    """,
                )
            except Exception as e:
                logging.error(f"Failed to send invoice reminder email: {e}")
    
    return {"message": "Reminder sent"}


# ============== MIDWIFE INVOICE ROUTES ==============

@router.get("/midwife/invoices")
async def get_midwife_invoices(user: User = Depends(check_role(["MIDWIFE"])), status: Optional[str] = None):
    """Get all invoices, optionally filtered by status"""
    # Lazy 48h-nudge sweep for unconfirmed payment claims (no cron dependency)
    if status is None:
        await nudge_stale_payment_claims(user.user_id, "MIDWIFE")

    query = {"provider_id": user.user_id, "provider_type": "MIDWIFE"}
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return invoices


@router.post("/midwife/invoices")
async def create_midwife_invoice(invoice_data: InvoiceCreate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create a new invoice"""
    client = await db.clients.find_one(
        {"client_id": invoice_data.client_id, "provider_id": user.user_id, "provider_type": "MIDWIFE"},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = get_now()
    
    invoice_number = invoice_data.invoice_number or await generate_invoice_number(user.user_id)
    
    payment_text = invoice_data.payment_instructions_text
    if not payment_text:
        default_template = await db.payment_instructions.find_one(
            {"user_id": user.user_id, "is_default": True},
            {"_id": 0}
        )
        if default_template:
            payment_text = default_template.get("instructions_text")
    
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "provider_id": user.user_id,
        "provider_type": "MIDWIFE",
        "client_id": invoice_data.client_id,
        "client_name": client["name"],
        "invoice_number": invoice_number,
        "description": invoice_data.description,
        "amount": invoice_data.amount,
        "issue_date": invoice_data.issue_date or now.strftime("%Y-%m-%d"),
        "due_date": invoice_data.due_date,
        "payment_instructions_text": payment_text,
        "notes_for_client": invoice_data.notes_for_client,
        "status": "Draft",
        "sent_at": None,
        "paid_at": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.invoices.insert_one(invoice)
    invoice.pop('_id', None)
    return invoice


@router.get("/midwife/invoices/{invoice_id}")
async def get_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/midwife/invoices/{invoice_id}")
async def update_midwife_invoice(invoice_id: str, update_data: InvoiceUpdate, user: User = Depends(check_role(["MIDWIFE"]))):
    """Update an invoice"""
    now = get_now()
    
    updates = {k: v for k, v in update_data.dict().items() if v is not None}
    updates["updated_at"] = now
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice updated"}


@router.delete("/midwife/invoices/{invoice_id}")
async def delete_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Delete an invoice (only Draft invoices)"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.get("status") != "Draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be deleted")
    
    await db.invoices.delete_one({"invoice_id": invoice_id})
    return {"message": "Invoice deleted"}


@router.post("/midwife/invoices/{invoice_id}/send")
async def send_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Send invoice to client"""
    now = get_now()
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"status": "Sent", "sent_at": now, "updated_at": now}}
    )
    
    client = await db.clients.find_one({"client_id": invoice["client_id"], "provider_type": "MIDWIFE"}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        await notify_user(
            client["linked_mom_id"],
            "invoice_received",
            "New Invoice",
            f"You have received an invoice for ${invoice['amount']:.2f} from your midwife.",
            data={"invoice_id": invoice_id}
        )
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                await postmark_send_email(
                    to=mom["email"],
                    subject=f"Invoice #{invoice['invoice_number']} from {user.full_name}",
                    html=f"""
                        <h2>You have received an invoice</h2>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            Payments are made directly to your midwife using the instructions provided. 
                            True Joy Birthing does not process or guarantee payments between you and your provider.
                        </p>
                    """,
                )
            except Exception as e:
                logging.error(f"Failed to send invoice email: {e}")
    
    return {"message": "Invoice sent"}


@router.post("/midwife/invoices/{invoice_id}/mark-paid")
async def mark_midwife_invoice_paid(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Mark invoice as paid and remove from Mom's notifications"""
    now = get_now()

    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Paid", "paid_at": now, "updated_at": now}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")

    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        await db.notifications.update_many(
            {
                "user_id": client["linked_mom_id"],
                "type": {"$in": ["invoice_received", "invoice_reminder"]},
                "data.invoice_id": invoice_id
            },
            {"$set": {"read": True, "resolved": True, "resolved_at": now}}
        )

        paid_notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_paid",
            "title": "Payment Received",
            "message": f"Your payment of ${invoice['amount']:.2f} has been confirmed. Thank you!",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(paid_notification)

    return {"message": "Invoice marked as paid"}


@router.post("/midwife/invoices/{invoice_id}/cancel")
async def cancel_midwife_invoice(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Cancel an invoice"""
    now = get_now()
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Cancelled", "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice cancelled"}


@router.post("/midwife/invoices/{invoice_id}/send-reminder")
async def send_midwife_invoice_reminder(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Send a payment reminder for a Sent invoice"""
    now = get_now()
    
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["status"] != "Sent":
        raise HTTPException(status_code=400, detail="Reminders can only be sent for invoices with 'Sent' status")
    
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"last_reminder_sent": now, "updated_at": now}}
    )
    
    client = await db.clients.find_one({"client_id": invoice["client_id"]}, {"_id": 0})
    if client and client.get("linked_mom_id"):
        await notify_user(
            client["linked_mom_id"],
            "invoice_reminder",
            "Payment Reminder",
            f"Friendly reminder: You have an unpaid invoice for ${invoice['amount']:.2f} due {invoice.get('due_date', 'soon')}.",
            data={"invoice_id": invoice_id}
        )
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email"):
            try:
                days_overdue = ""
                if invoice.get("due_date"):
                    try:
                        due_date = datetime.strptime(invoice["due_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        if now > due_date:
                            days = (now - due_date).days
                            days_overdue = f"<p style='color: #d32f2f;'><strong>This invoice is {days} day(s) overdue.</strong></p>"
                    except:
                        pass
                
                await postmark_send_email(
                    to=mom["email"],
                    subject=f"Payment Reminder: Invoice #{invoice['invoice_number']}",
                    html=f"""
                        <h2>Payment Reminder</h2>
                        <p>This is a friendly reminder about your outstanding invoice.</p>
                        {days_overdue}
                        <hr>
                        <p><strong>Invoice #:</strong> {invoice['invoice_number']}</p>
                        <p><strong>From:</strong> {user.full_name}</p>
                        <p><strong>Description:</strong> {invoice['description']}</p>
                        <p><strong>Amount Due:</strong> ${invoice['amount']:.2f}</p>
                        <p><strong>Due Date:</strong> {invoice.get('due_date', 'Not specified')}</p>
                        <hr>
                        <p><strong>Payment Instructions:</strong></p>
                        <p>{invoice.get('payment_instructions_text', 'Contact your provider for payment details.')}</p>
                        <hr>
                        <p style="font-size: 12px; color: #666;">
                            If you have already made this payment, please disregard this reminder.
                            Payments are made directly to your midwife using the instructions provided.
                        </p>
                    """,
                )
            except Exception as e:
                logging.error(f"Failed to send invoice reminder email: {e}")
    
    return {"message": "Reminder sent"}


# ============== PAYMENT PLAN ENDPOINTS ==============

@router.get("/doula/invoices/{invoice_id}/payment-plan")
async def get_doula_payment_plan(invoice_id: str, user: User = Depends(check_role(["DOULA"]))):
    """Get the payment plan for a doula invoice (provider-side)."""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0, "payment_plan": 1}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"payment_plan": invoice.get("payment_plan")}


@router.get("/midwife/invoices/{invoice_id}/payment-plan")
async def get_midwife_payment_plan(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Get the payment plan for a midwife invoice (provider-side)."""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0, "payment_plan": 1}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"payment_plan": invoice.get("payment_plan")}


@router.post("/doula/invoices/{invoice_id}/payment-plan")
async def create_doula_payment_plan(invoice_id: str, plan_data: PaymentPlanCreate, request: Request, user: User = Depends(check_role(["DOULA"]))):
    """Create or update a payment plan on a doula invoice."""
    now = get_now()
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    plan = build_payment_plan(plan_data.dict(), now, invoice_amount=invoice.get("amount"))
    if plan is None:
        # No plan data = remove existing plan (pay once)
        await db.invoices.update_one(
            {"invoice_id": invoice_id},
            {"$unset": {"payment_plan": ""}, "$set": {"updated_at": now}}
        )
        return {"message": "Payment plan removed (pay once)"}

    # Guard: never silently overwrite an existing plan — payment history could be wiped
    # by a second POST. Explicit ?replace=true is required to replace.
    if invoice.get("payment_plan"):
        if request.query_params.get("replace") != "true":
            raise HTTPException(
                status_code=409,
                detail="Invoice already has a payment plan. Pass ?replace=true to replace it."
            )
    # Guard: no new plans on invoices that are already fully paid.
    if (invoice.get("status") or "").lower() == "paid":
        raise HTTPException(status_code=409, detail="Invoice is already fully paid; cannot attach a payment plan")
    if any(i.get("status") == "paid" for i in (invoice.get("payment_plan") or {}).get("installments", [])):
        raise HTTPException(status_code=409, detail="A payment has already been made on this plan; it cannot be replaced")

    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"payment_plan": plan, "updated_at": now}}
    )
    return {"message": "Payment plan created", "payment_plan": plan}


@router.post("/midwife/invoices/{invoice_id}/payment-plan")
async def create_midwife_payment_plan(invoice_id: str, plan_data: PaymentPlanCreate, request: Request, user: User = Depends(check_role(["MIDWIFE"]))):
    """Create or update a payment plan on a midwife invoice."""
    now = get_now()
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    plan = build_payment_plan(plan_data.dict(), now, invoice_amount=invoice.get("amount"))
    if plan is None:
        await db.invoices.update_one(
            {"invoice_id": invoice_id},
            {"$unset": {"payment_plan": ""}, "$set": {"updated_at": now}}
        )
        return {"message": "Payment plan removed (pay once)"}

    # Guard: never silently overwrite an existing plan — payment history could be wiped
    # by a second POST. Explicit ?replace=true is required to replace.
    if invoice.get("payment_plan"):
        if request.query_params.get("replace") != "true":
            raise HTTPException(
                status_code=409,
                detail="Invoice already has a payment plan. Pass ?replace=true to replace it."
            )
    # Guard: no new plans on invoices that are already fully paid.
    if (invoice.get("status") or "").lower() == "paid":
        raise HTTPException(status_code=409, detail="Invoice is already fully paid; cannot attach a payment plan")
    if any(i.get("status") == "paid" for i in (invoice.get("payment_plan") or {}).get("installments", [])):
        raise HTTPException(status_code=409, detail="A payment has already been made on this plan; it cannot be replaced")

    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"payment_plan": plan, "updated_at": now}}
    )
    return {"message": "Payment plan created", "payment_plan": plan}


@router.post("/doula/invoices/{invoice_id}/payment-plan/installment/{installment_no}/mark-paid")
async def mark_doula_installment_paid(invoice_id: str, installment_no: int, user: User = Depends(check_role(["DOULA"]))):
    """Mark a specific installment as paid (provider-side)."""
    now = get_now()
    # Atomic guarded flip via arrayFilters: targets ONLY the installment whose number
    # matches AND is unpaid. ($ne at doc level on an array path means "no element is
    # paid" — it wrongly matches nothing once ANY installment is paid, hence filters.)
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"payment_plan.installments.$[elem].status": "paid"}},
        array_filters=[{"elem.installment_no": installment_no,
                        "elem.status": {"$ne": "paid"}}],
    )
    # NOTE: updated_at is bumped AFTER the guarded flip — including it here would make
    # modified_count==1 on every call (doc-level field changes) and break already-paid
    # detection.
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if result.modified_count == 0:
        # Doc exists — element already paid, or installment_no doesn't exist.
        invoice = await db.invoices.find_one(
            {"invoice_id": invoice_id, "provider_id": user.user_id},
            {"_id": 0, "payment_plan.installments": 1},
        )
        plan = (invoice or {}).get("payment_plan") or {}
        numbers = [i.get("installment_no") for i in plan.get("installments", [])]
        if installment_no not in numbers:
            raise HTTPException(status_code=404, detail=f"Installment {installment_no} not found")
        return {"message": f"Installment {installment_no} already paid"}

    # Recompute roll-up from a FRESH read (never from a pre-write snapshot).
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0, "payment_plan.installments": 1},
    )
    fresh_plan = (invoice or {}).get("payment_plan") or {}
    installments = fresh_plan.get("installments", [])
    new_status = _rollup_status(installments)
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"payment_plan.status": new_status, "updated_at": now}},
    )

    # If fully paid, also update the top-level invoice status
    if new_status == "paid":
        await db.invoices.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"status": "Paid", "paid_at": now}}
        )

    return {"message": f"Installment {installment_no} marked paid", "payment_plan": {
        "installments": installments, "status": new_status}}


@router.post("/midwife/invoices/{invoice_id}/payment-plan/installment/{installment_no}/mark-paid")
async def mark_midwife_installment_paid(invoice_id: str, installment_no: int, user: User = Depends(check_role(["MIDWIFE"]))):
    """Mark a specific installment as paid (provider-side)."""
    now = get_now()
    # Atomic guarded flip — same arrayFilters pattern as the doula route above.
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"payment_plan.installments.$[elem].status": "paid"}},
        array_filters=[{"elem.installment_no": installment_no,
                        "elem.status": {"$ne": "paid"}}],
    )
    # NOTE: updated_at is bumped AFTER the guarded flip — including it here would make
    # modified_count==1 on every call (doc-level field changes) and break already-paid
    # detection.
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if result.modified_count == 0:
        # Doc exists — element already paid, or installment_no doesn't exist.
        invoice = await db.invoices.find_one(
            {"invoice_id": invoice_id, "provider_id": user.user_id},
            {"_id": 0, "payment_plan.installments": 1},
        )
        plan = (invoice or {}).get("payment_plan") or {}
        numbers = [i.get("installment_no") for i in plan.get("installments", [])]
        if installment_no not in numbers:
            raise HTTPException(status_code=404, detail=f"Installment {installment_no} not found")
        return {"message": f"Installment {installment_no} already paid"}

    # Recompute roll-up from a FRESH read (never from a pre-write snapshot).
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"_id": 0, "payment_plan.installments": 1},
    )
    fresh_plan = (invoice or {}).get("payment_plan") or {}
    installments = fresh_plan.get("installments", [])
    new_status = _rollup_status(installments)
    await db.invoices.update_one(
        {"invoice_id": invoice_id},
        {"$set": {"payment_plan.status": new_status, "updated_at": now}},
    )

    if new_status == "paid":
        await db.invoices.update_one(
            {"invoice_id": invoice_id},
            {"$set": {"status": "Paid", "paid_at": now}}
        )

    return {"message": f"Installment {installment_no} marked paid", "payment_plan": {
        "installments": installments, "status": new_status}}

