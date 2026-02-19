"""
Invoice and Payment Instructions Feature Tests
- Payment Instructions Templates CRUD
- Doula Invoice CRUD and status transitions
- Midwife Invoice CRUD and status transitions
- Mom Invoice view (excluding Draft)
- Auto-generated invoice number format (TJ-YYYY-NNN)
- Default payment instructions auto-fill
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://provider-consolidate.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "doula2_1771213474@test.com"
DOULA_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife@test.com"
MIDWIFE_PASSWORD = "password123"
MOM_EMAIL = "testmom@test.com"
MOM_PASSWORD = "password123"

class TestPaymentInstructionsTemplates:
    """Test Payment Instructions CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, doula_session):
        self.session = doula_session
        self.created_template_ids = []
    
    def test_get_payment_instructions_empty_or_list(self, doula_session):
        """GET /api/payment-instructions - should return list"""
        response = doula_session.get(f"{BASE_URL}/api/payment-instructions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/payment-instructions returned {len(data)} templates")
    
    def test_create_payment_instructions_template(self, doula_session):
        """POST /api/payment-instructions - create new template"""
        payload = {
            "label": "TEST_Venmo",
            "instructions_text": "Please send payment via Venmo to @testuser",
            "is_default": False
        }
        response = doula_session.post(
            f"{BASE_URL}/api/payment-instructions",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "template_id" in data
        assert data["label"] == "TEST_Venmo"
        assert data["instructions_text"] == "Please send payment via Venmo to @testuser"
        self.created_template_ids.append(data["template_id"])
        print(f"PASS: Created payment template {data['template_id']}")
        return data["template_id"]
    
    def test_create_default_payment_instructions(self, doula_session):
        """POST /api/payment-instructions - create default template"""
        payload = {
            "label": "TEST_Zelle_Default",
            "instructions_text": "Please send payment via Zelle to test@example.com",
            "is_default": True
        }
        response = doula_session.post(
            f"{BASE_URL}/api/payment-instructions",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_default"] == True
        print(f"PASS: Created default payment template {data['template_id']}")
        return data["template_id"]
    
    def test_update_payment_instructions_template(self, doula_session):
        """PUT /api/payment-instructions/{id} - update template"""
        # First create a template
        create_payload = {
            "label": "TEST_Update_Template",
            "instructions_text": "Original instructions",
            "is_default": False
        }
        create_resp = doula_session.post(
            f"{BASE_URL}/api/payment-instructions",
            json=create_payload
        )
        template_id = create_resp.json()["template_id"]
        
        # Now update it
        update_payload = {
            "label": "TEST_Updated_Template",
            "instructions_text": "Updated payment instructions",
            "is_default": False
        }
        response = doula_session.put(
            f"{BASE_URL}/api/payment-instructions/{template_id}",
            json=update_payload
        )
        assert response.status_code == 200
        print(f"PASS: Updated payment template {template_id}")
        
        # Verify the update
        get_resp = doula_session.get(f"{BASE_URL}/api/payment-instructions")
        templates = get_resp.json()
        updated = next((t for t in templates if t["template_id"] == template_id), None)
        assert updated is not None
        assert updated["label"] == "TEST_Updated_Template"
        print("PASS: Verified template was updated correctly")
    
    def test_delete_payment_instructions_template(self, doula_session):
        """DELETE /api/payment-instructions/{id} - delete template"""
        # First create a template
        create_payload = {
            "label": "TEST_Delete_Template",
            "instructions_text": "To be deleted",
            "is_default": False
        }
        create_resp = doula_session.post(
            f"{BASE_URL}/api/payment-instructions",
            json=create_payload
        )
        template_id = create_resp.json()["template_id"]
        
        # Delete it
        response = doula_session.delete(f"{BASE_URL}/api/payment-instructions/{template_id}")
        assert response.status_code == 200
        print(f"PASS: Deleted payment template {template_id}")
        
        # Verify deletion
        get_resp = doula_session.get(f"{BASE_URL}/api/payment-instructions")
        templates = get_resp.json()
        deleted = next((t for t in templates if t["template_id"] == template_id), None)
        assert deleted is None
        print("PASS: Verified template was deleted")


class TestDoulaInvoices:
    """Test Doula Invoice CRUD and status transitions"""
    
    @pytest.fixture(autouse=True)
    def setup(self, doula_session):
        self.session = doula_session
        self.created_invoice_ids = []
    
    def test_get_doula_invoices(self, doula_session):
        """GET /api/doula/invoices - should return list"""
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/doula/invoices returned {len(data)} invoices")
    
    def test_get_doula_clients(self, doula_session):
        """GET /api/doula/clients - need clients to create invoices"""
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: GET /api/doula/clients returned {len(data)} clients")
        return data
    
    def test_create_doula_invoice_with_valid_client(self, doula_session):
        """POST /api/doula/invoices - create invoice"""
        # Get a client first
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        payload = {
            "client_id": client_id,
            "description": "TEST_Birth Doula Services - Deposit",
            "amount": 500.00,
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "due_date": "2026-02-15",
            "payment_instructions_text": "Please pay via Venmo",
            "notes_for_client": "Thank you for choosing us!"
        }
        
        response = doula_session.post(
            f"{BASE_URL}/api/doula/invoices",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "invoice_id" in data
        assert "invoice_number" in data
        assert data["status"] == "Draft"
        assert data["amount"] == 500.00
        
        # Check invoice number format TJ-YYYY-NNN
        invoice_number = data["invoice_number"]
        assert invoice_number.startswith("TJ-")
        parts = invoice_number.split("-")
        assert len(parts) == 3
        assert parts[1].isdigit() and len(parts[1]) == 4  # Year
        assert parts[2].isdigit()  # Sequence number
        
        print(f"PASS: Created doula invoice {data['invoice_id']} with number {invoice_number}")
        self.created_invoice_ids.append(data["invoice_id"])
        return data
    
    def test_update_doula_invoice(self, doula_session):
        """PUT /api/doula/invoices/{id} - update invoice"""
        # Create an invoice first
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Invoice to update",
            "amount": 250.00
        }
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Update the invoice
        update_payload = {
            "description": "TEST_Updated description",
            "amount": 300.00,
            "notes_for_client": "Updated notes"
        }
        response = doula_session.put(
            f"{BASE_URL}/api/doula/invoices/{invoice_id}",
            json=update_payload
        )
        assert response.status_code == 200
        print(f"PASS: Updated doula invoice {invoice_id}")
        
        # Verify update
        get_resp = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        updated = get_resp.json()
        assert updated["description"] == "TEST_Updated description"
        assert updated["amount"] == 300.00
        print("PASS: Verified invoice update")
    
    def test_send_doula_invoice(self, doula_session):
        """POST /api/doula/invoices/{id}/send - send invoice"""
        # Create an invoice first
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Invoice to send",
            "amount": 150.00
        }
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Send the invoice
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send")
        assert response.status_code == 200
        print(f"PASS: Sent doula invoice {invoice_id}")
        
        # Verify status changed
        get_resp = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        updated = get_resp.json()
        assert updated["status"] == "Sent"
        print("PASS: Invoice status changed to Sent")
        return invoice_id
    
    def test_mark_doula_invoice_paid(self, doula_session):
        """POST /api/doula/invoices/{id}/mark-paid - mark as paid"""
        # Create and send an invoice first
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Invoice to mark paid",
            "amount": 200.00
        }
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Send it first
        doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send")
        
        # Mark as paid
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/mark-paid")
        assert response.status_code == 200
        print(f"PASS: Marked doula invoice {invoice_id} as paid")
        
        # Verify status
        get_resp = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        updated = get_resp.json()
        assert updated["status"] == "Paid"
        assert updated["paid_at"] is not None
        print("PASS: Invoice status changed to Paid with paid_at timestamp")
    
    def test_cancel_doula_invoice(self, doula_session):
        """POST /api/doula/invoices/{id}/cancel - cancel invoice"""
        # Create and send an invoice first
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Invoice to cancel",
            "amount": 100.00
        }
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Send it first (cancel should work on sent invoices)
        doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send")
        
        # Cancel
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/cancel")
        assert response.status_code == 200
        print(f"PASS: Cancelled doula invoice {invoice_id}")
        
        # Verify status
        get_resp = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        updated = get_resp.json()
        assert updated["status"] == "Cancelled"
        print("PASS: Invoice status changed to Cancelled")
    
    def test_delete_doula_draft_invoice(self, doula_session):
        """DELETE /api/doula/invoices/{id} - delete draft invoice"""
        # Create a draft invoice
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Invoice to delete",
            "amount": 50.00
        }
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Delete it
        response = doula_session.delete(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert response.status_code == 200
        print(f"PASS: Deleted draft doula invoice {invoice_id}")
        
        # Verify deletion
        get_resp = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert get_resp.status_code == 404
        print("PASS: Verified invoice was deleted")
    
    def test_cannot_delete_non_draft_invoice(self, doula_session):
        """DELETE /api/doula/invoices/{id} - should fail for non-draft"""
        # Create and send an invoice
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Sent invoice cannot delete",
            "amount": 75.00
        }
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Send it
        doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send")
        
        # Try to delete - should fail
        response = doula_session.delete(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert response.status_code == 400
        print("PASS: Cannot delete non-draft invoice (got 400 as expected)")


class TestMidwifeInvoices:
    """Test Midwife Invoice CRUD and status transitions"""
    
    def test_get_midwife_invoices(self, midwife_session):
        """GET /api/midwife/invoices - should return list"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/midwife/invoices returned {len(data)} invoices")
    
    def test_get_midwife_clients(self, midwife_session):
        """GET /api/midwife/clients - need clients to create invoices"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        data = response.json()
        print(f"PASS: GET /api/midwife/clients returned {len(data)} clients")
        return data
    
    def test_create_midwife_invoice(self, midwife_session):
        """POST /api/midwife/invoices - create invoice"""
        clients_resp = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No midwife clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        payload = {
            "client_id": client_id,
            "description": "TEST_Midwifery Services - Retainer",
            "amount": 1500.00,
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "due_date": "2026-02-28",
            "payment_instructions_text": "Please send via bank transfer",
            "notes_for_client": "Looking forward to working with you!"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/midwife/invoices",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert "invoice_id" in data
        assert "invoice_number" in data
        assert data["status"] == "Draft"
        assert data["pro_type"] == "MIDWIFE"
        
        # Check invoice number format TJ-YYYY-NNN
        invoice_number = data["invoice_number"]
        assert invoice_number.startswith("TJ-")
        
        print(f"PASS: Created midwife invoice {data['invoice_id']} with number {invoice_number}")
        return data
    
    def test_midwife_invoice_full_workflow(self, midwife_session):
        """Test full workflow: Create -> Send -> Mark Paid"""
        clients_resp = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No midwife clients available for testing")
        
        # Create
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Full workflow invoice",
            "amount": 800.00
        }
        create_resp = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=create_payload)
        assert create_resp.status_code == 200
        invoice_id = create_resp.json()["invoice_id"]
        print(f"PASS: Created midwife invoice {invoice_id}")
        
        # Send
        send_resp = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/send")
        assert send_resp.status_code == 200
        print(f"PASS: Sent midwife invoice {invoice_id}")
        
        # Mark Paid
        paid_resp = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/mark-paid")
        assert paid_resp.status_code == 200
        print(f"PASS: Marked midwife invoice {invoice_id} as paid")
        
        # Verify final status
        get_resp = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        final = get_resp.json()
        assert final["status"] == "Paid"
        print("PASS: Final status verified as Paid")
    
    def test_midwife_invoice_cancel_workflow(self, midwife_session):
        """Test workflow: Create -> Send -> Cancel"""
        clients_resp = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No midwife clients available for testing")
        
        # Create
        create_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Cancel workflow invoice",
            "amount": 600.00
        }
        create_resp = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=create_payload)
        invoice_id = create_resp.json()["invoice_id"]
        
        # Send
        midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/send")
        
        # Cancel
        cancel_resp = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/cancel")
        assert cancel_resp.status_code == 200
        print(f"PASS: Cancelled midwife invoice {invoice_id}")
        
        # Verify status
        get_resp = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        final = get_resp.json()
        assert final["status"] == "Cancelled"
        print("PASS: Midwife invoice status verified as Cancelled")


class TestMomInvoiceView:
    """Test Mom Invoice View (should exclude Draft invoices)"""
    
    def test_get_mom_invoices(self, mom_session):
        """GET /api/mom/invoices - should return non-Draft invoices"""
        response = mom_session.get(f"{BASE_URL}/api/mom/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Verify no Draft invoices are returned
        for invoice in data:
            assert invoice["status"] != "Draft", f"Draft invoice {invoice['invoice_id']} should not be visible to mom"
        
        print(f"PASS: GET /api/mom/invoices returned {len(data)} invoices (no Draft)")
        
        # Check that provider info is included
        if data:
            invoice = data[0]
            assert "provider_name" in invoice
            assert "provider_type" in invoice
            print("PASS: Invoice includes provider info")
        return data


class TestDefaultPaymentInstructionsAutofill:
    """Test that default payment instructions are auto-filled on invoice creation"""
    
    def test_default_instructions_autofill(self, doula_session):
        """Invoice creation should use default payment instructions"""
        # First, create a default payment instructions template
        template_payload = {
            "label": "TEST_Default_For_Autofill",
            "instructions_text": "AUTO_FILLED: Please pay via Venmo to @autofilltest",
            "is_default": True
        }
        template_resp = doula_session.post(
            f"{BASE_URL}/api/payment-instructions",
            json=template_payload
        )
        assert template_resp.status_code == 200
        print("PASS: Created default payment template")
        
        # Get clients
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No doula clients available for testing")
        
        # Create invoice WITHOUT payment_instructions_text
        invoice_payload = {
            "client_id": clients[0]["client_id"],
            "description": "TEST_Invoice for autofill test",
            "amount": 300.00
            # No payment_instructions_text provided!
        }
        invoice_resp = doula_session.post(
            f"{BASE_URL}/api/doula/invoices",
            json=invoice_payload
        )
        assert invoice_resp.status_code == 200
        invoice = invoice_resp.json()
        
        # Verify that payment_instructions_text was auto-filled
        assert invoice.get("payment_instructions_text") == "AUTO_FILLED: Please pay via Venmo to @autofilltest"
        print("PASS: Invoice payment instructions were auto-filled from default template")


# Fixtures
@pytest.fixture
def doula_session():
    """Login as Doula and return authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
    )
    
    if response.status_code != 200:
        pytest.skip(f"Doula login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    if data.get("session_token"):
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    print(f"Logged in as Doula: {data.get('full_name', DOULA_EMAIL)}")
    return session


@pytest.fixture
def midwife_session():
    """Login as Midwife and return authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
    )
    
    if response.status_code != 200:
        pytest.skip(f"Midwife login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    if data.get("session_token"):
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    print(f"Logged in as Midwife: {data.get('full_name', MIDWIFE_EMAIL)}")
    return session


@pytest.fixture
def mom_session():
    """Login as Mom and return authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
    )
    
    if response.status_code != 200:
        pytest.skip(f"Mom login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    if data.get("session_token"):
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    print(f"Logged in as Mom: {data.get('full_name', MOM_EMAIL)}")
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
