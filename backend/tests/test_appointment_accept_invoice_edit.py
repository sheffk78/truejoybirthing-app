"""
Test Appointment Accept/Decline Flow and Invoice Editing Features
Tests for:
- PUT /api/appointments/{id}/respond - Accept/Decline appointments
- PUT /api/doula/invoices/{id} - Update invoice status
- POST /api/doula/invoices/{id}/send-reminder - Send reminder
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://doula-connect-3.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture(scope="module")
def doula_auth():
    """Get Doula authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    assert response.status_code == 200, f"Doula login failed: {response.text}"
    data = response.json()
    token = data.get("token") or data.get("session_token")
    return {"Authorization": f"Bearer {token}"}, data


@pytest.fixture(scope="module")
def mom_auth():
    """Get Mom authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    assert response.status_code == 200, f"Mom login failed: {response.text}"
    data = response.json()
    token = data.get("token") or data.get("session_token")
    return {"Authorization": f"Bearer {token}"}, data


class TestAppointmentRespond:
    """Test PUT /api/appointments/{id}/respond endpoint"""
    
    def test_respond_endpoint_exists(self, doula_auth):
        """Test respond endpoint returns proper error for invalid appointment"""
        headers, _ = doula_auth
        response = requests.put(
            f"{BASE_URL}/api/appointments/invalid_id/respond",
            headers=headers,
            json={"response": "accepted"}
        )
        # Should return 404 for non-existent appointment, not 500
        assert response.status_code in [404, 400], f"Expected 404 or 400, got {response.status_code}: {response.text}"
        print(f"SUCCESS: Respond endpoint returns {response.status_code} for invalid appointment")
        
    def test_respond_requires_valid_response(self, doula_auth):
        """Test respond endpoint validates response value"""
        headers, _ = doula_auth
        # Get appointments to find a real one
        appts = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        if appts.status_code == 200 and len(appts.json()) > 0:
            apt_id = appts.json()[0]["appointment_id"]
            response = requests.put(
                f"{BASE_URL}/api/appointments/{apt_id}/respond",
                headers=headers,
                json={"response": "invalid_response"}
            )
            # Should return 400 for invalid response value
            assert response.status_code == 400, f"Expected 400 for invalid response, got {response.status_code}"
            print(f"SUCCESS: Endpoint validates response values")
        else:
            pytest.skip("No appointments to test")
            
    def test_respond_accepts_appointment(self, doula_auth, mom_auth):
        """Test provider can accept mom's pending appointment"""
        doula_headers, _ = doula_auth
        mom_headers, mom_data = mom_auth
        
        # First, get team providers for mom
        team_resp = requests.get(f"{BASE_URL}/api/mom/team-providers", headers=mom_headers)
        if team_resp.status_code != 200 or len(team_resp.json()) == 0:
            pytest.skip("Mom has no team providers")
            
        provider = team_resp.json()[0]
        provider_id = provider.get("user_id") or provider.get("provider_id")
        
        # Create a pending appointment from mom to provider
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        create_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=mom_headers,
            json={
                "provider_id": provider_id,
                "appointment_date": tomorrow,
                "appointment_time": "14:00",
                "appointment_type": "consultation",
                "description": "TEST_respond_appointment"
            }
        )
        
        if create_resp.status_code != 200:
            print(f"Could not create test appointment: {create_resp.text}")
            pytest.skip("Could not create test appointment")
            
        appt = create_resp.json().get("appointment", {})
        apt_id = appt.get("appointment_id")
        
        if not apt_id:
            pytest.skip("No appointment_id returned")
            
        print(f"Created test appointment {apt_id} with status: {appt.get('status')}")
        
        # Now provider accepts the appointment
        accept_resp = requests.put(
            f"{BASE_URL}/api/appointments/{apt_id}/respond",
            headers=doula_headers,
            json={"response": "accepted"}
        )
        
        assert accept_resp.status_code == 200, f"Accept failed: {accept_resp.text}"
        print(f"SUCCESS: Provider accepted appointment - {accept_resp.json()}")
        
        # Verify status changed to confirmed
        verify_resp = requests.get(f"{BASE_URL}/api/appointments", headers=doula_headers)
        if verify_resp.status_code == 200:
            for apt in verify_resp.json():
                if apt["appointment_id"] == apt_id:
                    assert apt["status"] == "confirmed", f"Status should be confirmed, got {apt['status']}"
                    print(f"SUCCESS: Appointment status is now 'confirmed'")
                    break
                    
    def test_respond_declines_appointment(self, doula_auth, mom_auth):
        """Test provider can decline mom's pending appointment"""
        doula_headers, _ = doula_auth
        mom_headers, mom_data = mom_auth
        
        # Get team providers
        team_resp = requests.get(f"{BASE_URL}/api/mom/team-providers", headers=mom_headers)
        if team_resp.status_code != 200 or len(team_resp.json()) == 0:
            pytest.skip("Mom has no team providers")
            
        provider = team_resp.json()[0]
        provider_id = provider.get("user_id") or provider.get("provider_id")
        
        # Create appointment
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        create_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=mom_headers,
            json={
                "provider_id": provider_id,
                "appointment_date": tomorrow,
                "appointment_time": "15:00",
                "appointment_type": "prenatal_visit",
                "description": "TEST_decline_appointment"
            }
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test appointment")
            
        appt = create_resp.json().get("appointment", {})
        apt_id = appt.get("appointment_id")
        
        if not apt_id:
            pytest.skip("No appointment_id returned")
        
        # Provider declines
        decline_resp = requests.put(
            f"{BASE_URL}/api/appointments/{apt_id}/respond",
            headers=doula_headers,
            json={"response": "declined"}
        )
        
        assert decline_resp.status_code == 200, f"Decline failed: {decline_resp.text}"
        print(f"SUCCESS: Provider declined appointment")


class TestInvoiceStatusUpdate:
    """Test PUT /api/doula/invoices/{id} for status updates"""
    
    def test_get_invoices(self, doula_auth):
        """Test getting all invoices"""
        headers, _ = doula_auth
        response = requests.get(f"{BASE_URL}/api/doula/invoices", headers=headers)
        assert response.status_code == 200, f"Get invoices failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of invoices"
        print(f"SUCCESS: Doula has {len(data)} invoices")
        return data
        
    def test_update_invoice_status_to_paid(self, doula_auth):
        """Test updating invoice status to Paid via PUT"""
        headers, _ = doula_auth
        
        # Get invoices
        invoices = requests.get(f"{BASE_URL}/api/doula/invoices", headers=headers).json()
        
        # Find a Sent invoice to mark as paid
        sent_invoices = [i for i in invoices if i.get("status") == "Sent"]
        if len(sent_invoices) == 0:
            # Try to create and send a test invoice
            print("No Sent invoices found, skipping mark-paid test via PUT")
            pytest.skip("No Sent invoices to test")
            
        invoice = sent_invoices[0]
        invoice_id = invoice["invoice_id"]
        
        # Update status to Paid via PUT
        response = requests.put(
            f"{BASE_URL}/api/doula/invoices/{invoice_id}",
            headers=headers,
            json={"status": "Paid"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        print(f"SUCCESS: Updated invoice {invoice_id} status to Paid")
        
        # Verify status changed
        verify = requests.get(f"{BASE_URL}/api/doula/invoices/{invoice_id}", headers=headers)
        if verify.status_code == 200:
            assert verify.json().get("status") == "Paid", "Status should be Paid"
            print("SUCCESS: Verified invoice status is Paid")
            
    def test_update_invoice_status_to_sent(self, doula_auth):
        """Test updating invoice status back to Sent (mark unpaid)"""
        headers, _ = doula_auth
        
        # Get invoices
        invoices = requests.get(f"{BASE_URL}/api/doula/invoices", headers=headers).json()
        
        # Find a Paid invoice to mark as unpaid
        paid_invoices = [i for i in invoices if i.get("status") == "Paid"]
        if len(paid_invoices) == 0:
            print("No Paid invoices found, skipping mark-unpaid test")
            pytest.skip("No Paid invoices to test")
            
        invoice = paid_invoices[0]
        invoice_id = invoice["invoice_id"]
        
        # Update status to Sent (mark unpaid)
        response = requests.put(
            f"{BASE_URL}/api/doula/invoices/{invoice_id}",
            headers=headers,
            json={"status": "Sent"}
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        print(f"SUCCESS: Updated invoice {invoice_id} status back to Sent (mark unpaid)")


class TestInvoiceSendReminder:
    """Test POST /api/doula/invoices/{id}/send-reminder"""
    
    def test_send_reminder_on_sent_invoice(self, doula_auth):
        """Test sending reminder for Sent invoice"""
        headers, _ = doula_auth
        
        # Get invoices
        invoices = requests.get(f"{BASE_URL}/api/doula/invoices", headers=headers).json()
        
        # Find a Sent invoice
        sent_invoices = [i for i in invoices if i.get("status") == "Sent"]
        if len(sent_invoices) == 0:
            print("No Sent invoices found")
            pytest.skip("No Sent invoices to test reminder")
            
        invoice = sent_invoices[0]
        invoice_id = invoice["invoice_id"]
        
        # Send reminder
        response = requests.post(
            f"{BASE_URL}/api/doula/invoices/{invoice_id}/send-reminder",
            headers=headers
        )
        assert response.status_code == 200, f"Send reminder failed: {response.text}"
        print(f"SUCCESS: Sent reminder for invoice {invoice_id}")
        
    def test_send_reminder_fails_on_paid_invoice(self, doula_auth):
        """Test reminder fails for non-Sent status"""
        headers, _ = doula_auth
        
        # Get invoices
        invoices = requests.get(f"{BASE_URL}/api/doula/invoices", headers=headers).json()
        
        # Find a Paid invoice
        paid_invoices = [i for i in invoices if i.get("status") == "Paid"]
        if len(paid_invoices) == 0:
            pytest.skip("No Paid invoices to test")
            
        invoice = paid_invoices[0]
        invoice_id = invoice["invoice_id"]
        
        # Try to send reminder - should fail
        response = requests.post(
            f"{BASE_URL}/api/doula/invoices/{invoice_id}/send-reminder",
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for Paid invoice, got {response.status_code}"
        print(f"SUCCESS: Reminder correctly fails for Paid invoice")


class TestInvoiceMarkPaid:
    """Test POST /api/doula/invoices/{id}/mark-paid"""
    
    def test_mark_paid_endpoint(self, doula_auth):
        """Test mark-paid endpoint works"""
        headers, _ = doula_auth
        
        # Get invoices
        invoices = requests.get(f"{BASE_URL}/api/doula/invoices", headers=headers).json()
        
        # Find a Sent invoice
        sent_invoices = [i for i in invoices if i.get("status") == "Sent"]
        if len(sent_invoices) == 0:
            pytest.skip("No Sent invoices to test mark-paid")
            
        invoice = sent_invoices[0]
        invoice_id = invoice["invoice_id"]
        
        # Mark as paid via POST endpoint
        response = requests.post(
            f"{BASE_URL}/api/doula/invoices/{invoice_id}/mark-paid",
            headers=headers
        )
        assert response.status_code == 200, f"Mark paid failed: {response.text}"
        print(f"SUCCESS: Marked invoice {invoice_id} as paid via POST")


class TestInvoiceCRUD:
    """Test invoice CRUD operations"""
    
    def test_create_invoice(self, doula_auth):
        """Test creating a new invoice"""
        headers, _ = doula_auth
        
        # Get clients first
        clients_resp = requests.get(f"{BASE_URL}/api/doula/clients", headers=headers)
        if clients_resp.status_code != 200 or len(clients_resp.json()) == 0:
            pytest.skip("No clients to create invoice for")
            
        client = clients_resp.json()[0]
        client_id = client["client_id"]
        
        # Create invoice
        response = requests.post(
            f"{BASE_URL}/api/doula/invoices",
            headers=headers,
            json={
                "client_id": client_id,
                "description": "TEST_invoice_crud",
                "amount": 100.00,
                "issue_date": datetime.now().strftime("%Y-%m-%d"),
                "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            }
        )
        assert response.status_code == 200, f"Create invoice failed: {response.text}"
        data = response.json()
        assert "invoice_id" in data, "No invoice_id in response"
        assert data.get("status") == "Draft", f"Expected Draft status, got {data.get('status')}"
        print(f"SUCCESS: Created invoice {data['invoice_id']}")
        return data["invoice_id"]


class TestProviderAppointmentsList:
    """Test provider sees appointments with Accept/Decline options"""
    
    def test_provider_sees_pending_appointments(self, doula_auth):
        """Test provider can see pending appointments"""
        headers, _ = doula_auth
        response = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        assert response.status_code == 200, f"Get appointments failed: {response.text}"
        
        appointments = response.json()
        pending = [a for a in appointments if a.get("status") == "pending"]
        confirmed = [a for a in appointments if a.get("status") == "confirmed"]
        
        print(f"Total appointments: {len(appointments)}")
        print(f"Pending (awaiting response): {len(pending)}")
        print(f"Confirmed: {len(confirmed)}")
        
        # Check appointment structure has necessary fields
        if len(appointments) > 0:
            apt = appointments[0]
            required_fields = ["appointment_id", "status", "appointment_date"]
            for field in required_fields:
                assert field in apt, f"Missing field: {field}"
            print(f"SUCCESS: Appointment has all required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
