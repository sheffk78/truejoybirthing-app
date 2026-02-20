"""
Invoices Routes Module

Handles invoice management for both Doula and Midwife providers, including:
- Invoice CRUD operations
- Payment instructions templates
- Invoice sending and reminders
- Invoice status management (Draft, Sent, Paid, Cancelled)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging
import asyncio

from .dependencies import db, get_now, check_role, User, SENDER_EMAIL

# Import resend for email sending
try:
    import resend
except ImportError:
    resend = None

router = APIRouter(tags=["Invoices"])


# ============== PYDANTIC MODELS ==============

class PaymentInstructionsTemplateCreate(BaseModel):
    label: str
    instructions_text: str
    is_default: bool = False


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

@router.get("/payment-instructions")
async def get_payment_instructions(user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Get all payment instructions templates for the user"""
    templates = await db.payment_instructions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return templates


@router.post("/payment-instructions")
async def create_payment_instructions(data: PaymentInstructionsTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
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
async def update_payment_instructions(template_id: str, data: PaymentInstructionsTemplateCreate, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
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
async def delete_payment_instructions(template_id: str, user: User = Depends(check_role(["DOULA", "MIDWIFE"]))):
    """Delete a payment instructions template"""
    result = await db.payment_instructions.delete_one(
        {"template_id": template_id, "user_id": user.user_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}


# ============== DOULA INVOICE ROUTES ==============

@router.get("/doula/invoices")
async def get_doula_invoices(user: User = Depends(check_role(["DOULA"])), status: Optional[str] = None):
    """Get all invoices, optionally filtered by status"""
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
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_received",
            "title": "New Invoice",
            "message": f"You have received an invoice for ${invoice['amount']:.2f} from your doula.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend and resend.api_key:
            try:
                await asyncio.to_thread(resend.Emails.send, {
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Invoice #{invoice['invoice_number']} from {user.full_name}",
                    "html": f"""
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
                    """
                })
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
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_reminder",
            "title": "Payment Reminder",
            "message": f"Friendly reminder: You have an unpaid invoice for ${invoice['amount']:.2f} due {invoice.get('due_date', 'soon')}.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend and resend.api_key:
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
                
                await asyncio.to_thread(resend.Emails.send, {
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Payment Reminder: Invoice #{invoice['invoice_number']}",
                    "html": f"""
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
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice reminder email: {e}")
    
    return {"message": "Reminder sent"}


# ============== MIDWIFE INVOICE ROUTES ==============

@router.get("/midwife/invoices")
async def get_midwife_invoices(user: User = Depends(check_role(["MIDWIFE"])), status: Optional[str] = None):
    """Get all invoices, optionally filtered by status"""
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
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_received",
            "title": "New Invoice",
            "message": f"You have received an invoice for ${invoice['amount']:.2f} from your midwife.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend and resend.api_key:
            try:
                await asyncio.to_thread(resend.Emails.send, {
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Invoice #{invoice['invoice_number']} from {user.full_name}",
                    "html": f"""
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
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice email: {e}")
    
    return {"message": "Invoice sent"}


@router.post("/midwife/invoices/{invoice_id}/mark-paid")
async def mark_midwife_invoice_paid(invoice_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """Mark invoice as paid"""
    now = get_now()
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "provider_id": user.user_id},
        {"$set": {"status": "Paid", "paid_at": now, "updated_at": now}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
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
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": client["linked_mom_id"],
            "type": "invoice_reminder",
            "title": "Payment Reminder",
            "message": f"Friendly reminder: You have an unpaid invoice for ${invoice['amount']:.2f} due {invoice.get('due_date', 'soon')}.",
            "data": {"invoice_id": invoice_id},
            "read": False,
            "created_at": now
        }
        await db.notifications.insert_one(notification)
        
        mom = await db.users.find_one({"user_id": client["linked_mom_id"]}, {"_id": 0})
        if mom and mom.get("email") and resend and resend.api_key:
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
                
                await asyncio.to_thread(resend.Emails.send, {
                    "from": SENDER_EMAIL,
                    "to": mom["email"],
                    "subject": f"Payment Reminder: Invoice #{invoice['invoice_number']}",
                    "html": f"""
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
                    """
                })
            except Exception as e:
                logging.error(f"Failed to send invoice reminder email: {e}")
    
    return {"message": "Reminder sent"}
