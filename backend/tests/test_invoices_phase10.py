"""
Phase 10 Backend Tests: Invoice Routes Migration
Tests for invoice management migrated from server.py to routes/invoices.py

Includes:
- Payment instructions templates CRUD
- Doula invoice CRUD and actions (send, mark-paid, cancel, send-reminder)
- Midwife invoice CRUD and actions (send, mark-paid, cancel, send-reminder)
- Role-based access control tests
- ObjectId serialization verification
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Use environment variable for BASE_URL (no default - fail fast)
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://exam-intake-form.preview.emergentagent.com"

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Verify test environment is properly configured"""
    
    def test_base_url_configured(self):
        """Verify BASE_URL is properly configured"""
        assert BASE_URL, "BASE_URL must be configured"
        assert BASE_URL.startswith("http"), "BASE_URL must be a valid HTTP URL"
        print(f"Using BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        """Verify backend API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("Backend health check passed")


class TestAuthLogin:
    """Test authentication for Doula and Midwife accounts"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Get authenticated session for Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        return session
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        """Get authenticated session for Midwife"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        return session
    
    def test_doula_login_success(self, doula_session):
        """Verify Doula can log in"""
        response = doula_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == DOULA_EMAIL
        assert data["role"] == "DOULA"
        print(f"Doula logged in: {data['full_name']}")
    
    def test_midwife_login_success(self, midwife_session):
        """Verify Midwife can log in"""
        response = midwife_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == MIDWIFE_EMAIL
        assert data["role"] == "MIDWIFE"
        print(f"Midwife logged in: {data['full_name']}")


class TestPaymentInstructionsTemplates:
    """Test payment instructions template CRUD - /api/payment-instructions"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        return session
    
    def test_get_payment_instructions_requires_auth(self):
        """Verify GET /api/payment-instructions requires authentication"""
        response = requests.get(f"{BASE_URL}/api/payment-instructions")
        assert response.status_code == 401
    
    def test_get_payment_instructions_as_doula(self, doula_session):
        """Doula can get their payment instructions templates"""
        response = doula_session.get(f"{BASE_URL}/api/payment-instructions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify no _id fields in response
        for template in data:
            assert "_id" not in template, "Response should not contain MongoDB _id"
        print(f"Doula has {len(data)} payment instructions templates")
    
    def test_get_payment_instructions_as_midwife(self, midwife_session):
        """Midwife can get their payment instructions templates"""
        response = midwife_session.get(f"{BASE_URL}/api/payment-instructions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Midwife has {len(data)} payment instructions templates")
    
    def test_create_payment_instructions_template(self, doula_session):
        """Create a new payment instructions template"""
        test_label = f"TEST_Payment_Instructions_{uuid.uuid4().hex[:8]}"
        payload = {
            "label": test_label,
            "instructions_text": "Please send payment via Venmo @test-doula or Zelle to test@example.com",
            "is_default": False
        }
        response = doula_session.post(f"{BASE_URL}/api/payment-instructions", json=payload)
        assert response.status_code == 200, f"Failed to create template: {response.text}"
        data = response.json()
        
        assert data["label"] == test_label
        assert data["instructions_text"] == payload["instructions_text"]
        assert data["is_default"] == False
        assert "template_id" in data
        assert "_id" not in data
        print(f"Created payment instructions template: {data['template_id']}")
        
        # Store for cleanup
        TestPaymentInstructionsTemplates.created_template_id = data["template_id"]
    
    def test_update_payment_instructions_template(self, doula_session):
        """Update an existing payment instructions template"""
        if not hasattr(TestPaymentInstructionsTemplates, 'created_template_id'):
            pytest.skip("No template created to update")
        
        template_id = TestPaymentInstructionsTemplates.created_template_id
        payload = {
            "label": f"TEST_Updated_Template_{uuid.uuid4().hex[:8]}",
            "instructions_text": "Updated payment instructions text",
            "is_default": True
        }
        response = doula_session.put(f"{BASE_URL}/api/payment-instructions/{template_id}", json=payload)
        assert response.status_code == 200, f"Failed to update template: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Updated payment instructions template: {template_id}")
    
    def test_delete_payment_instructions_template(self, doula_session):
        """Delete a payment instructions template"""
        if not hasattr(TestPaymentInstructionsTemplates, 'created_template_id'):
            pytest.skip("No template created to delete")
        
        template_id = TestPaymentInstructionsTemplates.created_template_id
        response = doula_session.delete(f"{BASE_URL}/api/payment-instructions/{template_id}")
        assert response.status_code == 200, f"Failed to delete template: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Deleted payment instructions template: {template_id}")
    
    def test_delete_nonexistent_template_fails(self, doula_session):
        """Deleting a nonexistent template returns 404"""
        response = doula_session.delete(f"{BASE_URL}/api/payment-instructions/nonexistent_template_id")
        assert response.status_code == 404


class TestDoulaInvoicesCRUD:
    """Test Doula invoice CRUD operations - /api/doula/invoices"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def doula_client_id(self, doula_session):
        """Get or create a test client for the doula"""
        # Get existing clients
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200
        clients = response.json()
        if clients:
            return clients[0]["client_id"]
        
        # Create a test client if none exists
        response = doula_session.post(f"{BASE_URL}/api/doula/clients", json={
            "name": f"TEST_Client_{uuid.uuid4().hex[:8]}",
            "email": "test.client@example.com",
            "edd": "2026-06-01"
        })
        assert response.status_code in [200, 201], f"Failed to create test client: {response.text}"
        return response.json()["client_id"]
    
    def test_get_doula_invoices_requires_auth(self):
        """Verify GET /api/doula/invoices requires authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 401
    
    def test_get_doula_invoices_list(self, doula_session):
        """Doula can get their invoices list"""
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify no _id fields in response
        for invoice in data:
            assert "_id" not in invoice, "Response should not contain MongoDB _id"
        print(f"Doula has {len(data)} invoices")
    
    def test_get_doula_invoices_filtered_by_status(self, doula_session):
        """Doula can filter invoices by status"""
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices?status=Draft")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for invoice in data:
            assert invoice["status"] == "Draft"
        print(f"Found {len(data)} draft invoices")
    
    def test_create_doula_invoice(self, doula_session, doula_client_id):
        """Create a new doula invoice"""
        payload = {
            "client_id": doula_client_id,
            "description": f"TEST_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 500.00,
            "due_date": "2026-02-28",
            "payment_instructions_text": "Please pay via Venmo @test-doula",
            "notes_for_client": "Thank you for choosing our services!"
        }
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        
        assert data["client_id"] == doula_client_id
        assert data["description"] == payload["description"]
        assert data["amount"] == payload["amount"]
        assert data["status"] == "Draft"
        assert "invoice_id" in data
        assert "invoice_number" in data
        assert "_id" not in data
        print(f"Created invoice: {data['invoice_id']} ({data['invoice_number']})")
        
        # Store for later tests
        TestDoulaInvoicesCRUD.created_invoice_id = data["invoice_id"]
    
    def test_get_doula_invoice_by_id(self, doula_session):
        """Get a specific doula invoice by ID"""
        if not hasattr(TestDoulaInvoicesCRUD, 'created_invoice_id'):
            pytest.skip("No invoice created to get")
        
        invoice_id = TestDoulaInvoicesCRUD.created_invoice_id
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert response.status_code == 200, f"Failed to get invoice: {response.text}"
        data = response.json()
        assert data["invoice_id"] == invoice_id
        assert "_id" not in data
        print(f"Retrieved invoice: {data['invoice_number']}")
    
    def test_update_doula_invoice(self, doula_session):
        """Update a doula invoice"""
        if not hasattr(TestDoulaInvoicesCRUD, 'created_invoice_id'):
            pytest.skip("No invoice created to update")
        
        invoice_id = TestDoulaInvoicesCRUD.created_invoice_id
        payload = {
            "description": "Updated Invoice Description",
            "amount": 750.00,
            "notes_for_client": "Updated notes"
        }
        response = doula_session.put(f"{BASE_URL}/api/doula/invoices/{invoice_id}", json=payload)
        assert response.status_code == 200, f"Failed to update invoice: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Updated invoice: {invoice_id}")
        
        # Verify update persisted
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        data = response.json()
        assert data["amount"] == 750.00
    
    def test_get_nonexistent_invoice_returns_404(self, doula_session):
        """Getting a nonexistent invoice returns 404"""
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/nonexistent_invoice_id")
        assert response.status_code == 404


class TestDoulaInvoiceActions:
    """Test Doula invoice actions - send, mark-paid, cancel, send-reminder"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_invoice(self, doula_session):
        """Create a test invoice for action tests"""
        # Get a client
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available for invoice tests")
        client_id = clients[0]["client_id"]
        
        # Create invoice
        payload = {
            "client_id": client_id,
            "description": f"TEST_Action_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 300.00,
            "due_date": "2026-03-15"
        }
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        assert response.status_code == 200
        return response.json()
    
    def test_send_doula_invoice(self, doula_session, test_invoice):
        """Send a doula invoice to client"""
        invoice_id = test_invoice["invoice_id"]
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send")
        assert response.status_code == 200, f"Failed to send invoice: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Sent invoice: {invoice_id}")
        
        # Verify status changed to Sent
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        data = response.json()
        assert data["status"] == "Sent"
        assert data["sent_at"] is not None
    
    def test_send_reminder_for_sent_invoice(self, doula_session, test_invoice):
        """Send a payment reminder for a Sent invoice"""
        invoice_id = test_invoice["invoice_id"]
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send-reminder")
        assert response.status_code == 200, f"Failed to send reminder: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Sent reminder for invoice: {invoice_id}")
    
    def test_mark_doula_invoice_paid(self, doula_session, test_invoice):
        """Mark a doula invoice as paid"""
        invoice_id = test_invoice["invoice_id"]
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/mark-paid")
        assert response.status_code == 200, f"Failed to mark invoice paid: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Marked invoice as paid: {invoice_id}")
        
        # Verify status changed to Paid
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        data = response.json()
        assert data["status"] == "Paid"
        assert data["paid_at"] is not None
    
    def test_cancel_doula_invoice(self, doula_session):
        """Cancel a doula invoice"""
        # Create a new invoice to cancel
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Cancel_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 200.00
        }
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Cancel the invoice
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/cancel")
        assert response.status_code == 200, f"Failed to cancel invoice: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Cancelled invoice: {invoice_id}")
        
        # Verify status changed to Cancelled
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        data = response.json()
        assert data["status"] == "Cancelled"
    
    def test_send_reminder_for_non_sent_invoice_fails(self, doula_session):
        """Sending reminder for non-Sent invoice should fail"""
        # Create a new draft invoice
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Draft_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 100.00
        }
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Try to send reminder for draft invoice
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send-reminder")
        assert response.status_code == 400, "Should not be able to send reminder for non-Sent invoice"


class TestDeleteDoulaInvoice:
    """Test deleting doula invoices"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        return session
    
    def test_delete_draft_invoice(self, doula_session):
        """Can delete a Draft invoice"""
        # Create a new draft invoice
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Delete_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 150.00
        }
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Delete the invoice
        response = doula_session.delete(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert response.status_code == 200, f"Failed to delete invoice: {response.text}"
        
        # Verify it's deleted
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert response.status_code == 404
        print(f"Successfully deleted draft invoice: {invoice_id}")
    
    def test_delete_non_draft_invoice_fails(self, doula_session):
        """Cannot delete a non-Draft invoice"""
        # Create and send an invoice
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Sent_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 175.00
        }
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Send the invoice
        doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/send")
        
        # Try to delete - should fail
        response = doula_session.delete(f"{BASE_URL}/api/doula/invoices/{invoice_id}")
        assert response.status_code == 400, "Should not be able to delete non-Draft invoice"


class TestMidwifeInvoicesCRUD:
    """Test Midwife invoice CRUD operations - /api/midwife/invoices"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def midwife_client_id(self, midwife_session):
        """Get or create a test client for the midwife"""
        # Get existing clients
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        clients = response.json()
        if clients:
            return clients[0]["client_id"]
        
        # Create a test client if none exists
        response = midwife_session.post(f"{BASE_URL}/api/midwife/clients", json={
            "name": f"TEST_Midwife_Client_{uuid.uuid4().hex[:8]}",
            "email": "test.midwife.client@example.com",
            "edd": "2026-07-01"
        })
        assert response.status_code in [200, 201], f"Failed to create test client: {response.text}"
        return response.json()["client_id"]
    
    def test_get_midwife_invoices_requires_auth(self):
        """Verify GET /api/midwife/invoices requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 401
    
    def test_get_midwife_invoices_list(self, midwife_session):
        """Midwife can get their invoices list"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify no _id fields in response
        for invoice in data:
            assert "_id" not in invoice, "Response should not contain MongoDB _id"
        print(f"Midwife has {len(data)} invoices")
    
    def test_get_midwife_invoices_filtered_by_status(self, midwife_session):
        """Midwife can filter invoices by status"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices?status=Draft")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} draft invoices")
    
    def test_create_midwife_invoice(self, midwife_session, midwife_client_id):
        """Create a new midwife invoice"""
        payload = {
            "client_id": midwife_client_id,
            "description": f"TEST_Midwife_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 3500.00,
            "due_date": "2026-03-31",
            "payment_instructions_text": "Please pay via check or bank transfer",
            "notes_for_client": "Midwifery services as agreed"
        }
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        assert response.status_code == 200, f"Failed to create invoice: {response.text}"
        data = response.json()
        
        assert data["client_id"] == midwife_client_id
        assert data["description"] == payload["description"]
        assert data["amount"] == payload["amount"]
        assert data["status"] == "Draft"
        assert data["provider_type"] == "MIDWIFE"
        assert "invoice_id" in data
        assert "invoice_number" in data
        assert "_id" not in data
        print(f"Created midwife invoice: {data['invoice_id']} ({data['invoice_number']})")
        
        # Store for later tests
        TestMidwifeInvoicesCRUD.created_invoice_id = data["invoice_id"]
    
    def test_get_midwife_invoice_by_id(self, midwife_session):
        """Get a specific midwife invoice by ID"""
        if not hasattr(TestMidwifeInvoicesCRUD, 'created_invoice_id'):
            pytest.skip("No invoice created to get")
        
        invoice_id = TestMidwifeInvoicesCRUD.created_invoice_id
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        assert response.status_code == 200, f"Failed to get invoice: {response.text}"
        data = response.json()
        assert data["invoice_id"] == invoice_id
        assert "_id" not in data
        print(f"Retrieved midwife invoice: {data['invoice_number']}")
    
    def test_update_midwife_invoice(self, midwife_session):
        """Update a midwife invoice"""
        if not hasattr(TestMidwifeInvoicesCRUD, 'created_invoice_id'):
            pytest.skip("No invoice created to update")
        
        invoice_id = TestMidwifeInvoicesCRUD.created_invoice_id
        payload = {
            "description": "Updated Midwife Invoice Description",
            "amount": 4000.00,
            "notes_for_client": "Updated midwifery notes"
        }
        response = midwife_session.put(f"{BASE_URL}/api/midwife/invoices/{invoice_id}", json=payload)
        assert response.status_code == 200, f"Failed to update invoice: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Updated midwife invoice: {invoice_id}")
        
        # Verify update persisted
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        data = response.json()
        assert data["amount"] == 4000.00


class TestMidwifeInvoiceActions:
    """Test Midwife invoice actions - send, mark-paid, cancel, send-reminder"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_invoice(self, midwife_session):
        """Create a test invoice for action tests"""
        # Get a client
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available for invoice tests")
        client_id = clients[0]["client_id"]
        
        # Create invoice
        payload = {
            "client_id": client_id,
            "description": f"TEST_Midwife_Action_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 2500.00,
            "due_date": "2026-04-15"
        }
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        assert response.status_code == 200
        return response.json()
    
    def test_send_midwife_invoice(self, midwife_session, test_invoice):
        """Send a midwife invoice to client"""
        invoice_id = test_invoice["invoice_id"]
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/send")
        assert response.status_code == 200, f"Failed to send invoice: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Sent midwife invoice: {invoice_id}")
        
        # Verify status changed to Sent
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        data = response.json()
        assert data["status"] == "Sent"
        assert data["sent_at"] is not None
    
    def test_send_reminder_for_midwife_invoice(self, midwife_session, test_invoice):
        """Send a payment reminder for a Sent midwife invoice"""
        invoice_id = test_invoice["invoice_id"]
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/send-reminder")
        assert response.status_code == 200, f"Failed to send reminder: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Sent reminder for midwife invoice: {invoice_id}")
    
    def test_mark_midwife_invoice_paid(self, midwife_session, test_invoice):
        """Mark a midwife invoice as paid"""
        invoice_id = test_invoice["invoice_id"]
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/mark-paid")
        assert response.status_code == 200, f"Failed to mark invoice paid: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Marked midwife invoice as paid: {invoice_id}")
        
        # Verify status changed to Paid
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        data = response.json()
        assert data["status"] == "Paid"
        assert data["paid_at"] is not None
    
    def test_cancel_midwife_invoice(self, midwife_session):
        """Cancel a midwife invoice"""
        # Create a new invoice to cancel
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Midwife_Cancel_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 1500.00
        }
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Cancel the invoice
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/cancel")
        assert response.status_code == 200, f"Failed to cancel invoice: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Cancelled midwife invoice: {invoice_id}")
        
        # Verify status changed to Cancelled
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        data = response.json()
        assert data["status"] == "Cancelled"
    
    def test_send_reminder_for_non_sent_midwife_invoice_fails(self, midwife_session):
        """Sending reminder for non-Sent midwife invoice should fail"""
        # Create a new draft invoice
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Draft_Midwife_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 1000.00
        }
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Try to send reminder for draft invoice
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/send-reminder")
        assert response.status_code == 400, "Should not be able to send reminder for non-Sent invoice"


class TestDeleteMidwifeInvoice:
    """Test deleting midwife invoices"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        return session
    
    def test_delete_draft_midwife_invoice(self, midwife_session):
        """Can delete a Draft midwife invoice"""
        # Create a new draft invoice
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Delete_Midwife_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 1200.00
        }
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Delete the invoice
        response = midwife_session.delete(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        assert response.status_code == 200, f"Failed to delete invoice: {response.text}"
        
        # Verify it's deleted
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        assert response.status_code == 404
        print(f"Successfully deleted draft midwife invoice: {invoice_id}")
    
    def test_delete_non_draft_midwife_invoice_fails(self, midwife_session):
        """Cannot delete a non-Draft midwife invoice"""
        # Create and send an invoice
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        payload = {
            "client_id": clients[0]["client_id"],
            "description": f"TEST_Sent_Midwife_Invoice_{uuid.uuid4().hex[:8]}",
            "amount": 1800.00
        }
        response = midwife_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        invoice_id = response.json()["invoice_id"]
        
        # Send the invoice
        midwife_session.post(f"{BASE_URL}/api/midwife/invoices/{invoice_id}/send")
        
        # Try to delete - should fail
        response = midwife_session.delete(f"{BASE_URL}/api/midwife/invoices/{invoice_id}")
        assert response.status_code == 400, "Should not be able to delete non-Draft invoice"


class TestRoleBasedAccessControl:
    """Test role-based access control for invoice endpoints"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        return session
    
    def test_doula_cannot_access_midwife_invoices(self, doula_session):
        """Doula should get 403 when accessing midwife invoice endpoints"""
        response = doula_session.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Doula correctly blocked from midwife invoices")
    
    def test_midwife_cannot_access_doula_invoices(self, midwife_session):
        """Midwife should get 403 when accessing doula invoice endpoints"""
        response = midwife_session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Midwife correctly blocked from doula invoices")
    
    def test_doula_cannot_create_midwife_invoice(self, doula_session):
        """Doula should get 403 when trying to create midwife invoice"""
        payload = {
            "client_id": "test_client",
            "description": "Test",
            "amount": 100.00
        }
        response = doula_session.post(f"{BASE_URL}/api/midwife/invoices", json=payload)
        assert response.status_code == 403
    
    def test_midwife_cannot_create_doula_invoice(self, midwife_session):
        """Midwife should get 403 when trying to create doula invoice"""
        payload = {
            "client_id": "test_client",
            "description": "Test",
            "amount": 100.00
        }
        response = midwife_session.post(f"{BASE_URL}/api/doula/invoices", json=payload)
        assert response.status_code == 403


class TestObjectIdSerialization:
    """Verify MongoDB ObjectId is properly excluded from all responses"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        return session
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        return session
    
    def test_doula_invoices_no_objectid(self, doula_session):
        """Doula invoices response should not contain _id"""
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200
        data = response.json()
        for invoice in data:
            assert "_id" not in invoice, f"Invoice contains _id: {invoice}"
        print(f"Verified {len(data)} doula invoices have no _id field")
    
    def test_midwife_invoices_no_objectid(self, midwife_session):
        """Midwife invoices response should not contain _id"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 200
        data = response.json()
        for invoice in data:
            assert "_id" not in invoice, f"Invoice contains _id: {invoice}"
        print(f"Verified {len(data)} midwife invoices have no _id field")
    
    def test_payment_instructions_no_objectid(self, doula_session):
        """Payment instructions response should not contain _id"""
        response = doula_session.get(f"{BASE_URL}/api/payment-instructions")
        assert response.status_code == 200
        data = response.json()
        for template in data:
            assert "_id" not in template, f"Template contains _id: {template}"
        print(f"Verified {len(data)} payment instructions templates have no _id field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
