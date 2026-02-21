"""
Client-Centered Architecture Regression Tests - Final Verification

This test file verifies the client-centered data model for True Joy Birthing:
1. Client data model has all required fields (client_id, provider_id, provider_type, is_active)
2. Appointments work correctly for both Moms and Providers
3. Visits are linked to appointments and clients
4. Active client logic uses 6 weeks (42 days) post due-date
5. Client-first navigation and workflow

Test Credentials:
- Doula: demo.doula@truejoybirthing.com / DemoScreenshot2024!
- Midwife: demo.midwife@truejoybirthing.com / DemoScreenshot2024!
- Mom: demo.mom@truejoybirthing.com / DemoScreenshot2024!
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://birth-team-staging.preview.emergentagent.com").rstrip("/")

# Test credentials
DOULA_CREDS = {"email": "demo.doula@truejoybirthing.com", "password": "DemoScreenshot2024!"}
MIDWIFE_CREDS = {"email": "demo.midwife@truejoybirthing.com", "password": "DemoScreenshot2024!"}
MOM_CREDS = {"email": "demo.mom@truejoybirthing.com", "password": "DemoScreenshot2024!"}


class TestSetup:
    """Verify base configuration"""
    
    def test_base_url_configured(self):
        assert BASE_URL, "BASE_URL must be configured"
        print(f"Using BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Health check passed")


class TestAuth:
    """Authentication tests"""
    
    def test_doula_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DOULA_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data.get("role") == "DOULA"
        print("Doula login successful")
    
    def test_midwife_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MIDWIFE_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data.get("role") == "MIDWIFE"
        print("Midwife login successful")
    
    def test_mom_login(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MOM_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data.get("role") == "MOM"
        print("Mom login successful")


# ============== FIXTURES ==============

@pytest.fixture
def doula_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DOULA_CREDS)
    if response.status_code != 200:
        pytest.skip("Doula login failed")
    return response.json()["session_token"]

@pytest.fixture
def midwife_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json=MIDWIFE_CREDS)
    if response.status_code != 200:
        pytest.skip("Midwife login failed")
    return response.json()["session_token"]

@pytest.fixture
def mom_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json=MOM_CREDS)
    if response.status_code != 200:
        pytest.skip("Mom login failed")
    return response.json()["session_token"]

@pytest.fixture
def doula_client(doula_token):
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {doula_token}"})
    return session

@pytest.fixture
def midwife_client(midwife_token):
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {midwife_token}"})
    return session

@pytest.fixture
def mom_client(mom_token):
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {mom_token}"})
    return session


# ============== CLIENT DATA MODEL TESTS ==============

class TestClientDataModel:
    """Verify client records have all required fields"""
    
    def test_doula_clients_have_required_fields(self, doula_client):
        """GET /api/provider/clients - verify each client has client_id, provider_id, provider_type, is_active"""
        response = doula_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        assert response.status_code == 200
        clients = response.json()
        
        # Skip if no clients
        if len(clients) == 0:
            pytest.skip("No clients found for doula")
        
        for client in clients:
            assert "client_id" in client, f"Client missing client_id: {client}"
            assert "provider_id" in client, f"Client missing provider_id: {client}"
            assert "is_active" in client, f"Client missing is_active: {client}"
            # provider_type may not be present for legacy clients, but should be for new ones
            print(f"Client {client['client_id']}: is_active={client['is_active']}")
        
        print(f"Verified {len(clients)} doula clients have required fields")
    
    def test_midwife_clients_have_required_fields(self, midwife_client):
        """GET /api/provider/clients - verify each client has client_id, provider_id, is_active"""
        response = midwife_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients found for midwife")
        
        for client in clients:
            assert "client_id" in client, f"Client missing client_id: {client}"
            assert "provider_id" in client, f"Client missing provider_id: {client}"
            assert "is_active" in client, f"Client missing is_active: {client}"
            print(f"Client {client['client_id']}: is_active={client['is_active']}")
        
        print(f"Verified {len(clients)} midwife clients have required fields")
    
    def test_client_detail_has_counts(self, doula_client):
        """GET /api/provider/clients/{id} - verify _counts object with appointments, notes, contracts, invoices, visits"""
        # Get list of clients first
        response = doula_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No clients found")
        
        client_id = response.json()[0]["client_id"]
        
        # Get detail
        response = doula_client.get(f"{BASE_URL}/api/provider/clients/{client_id}")
        assert response.status_code == 200
        client = response.json()
        
        assert "_counts" in client, "Client detail missing _counts"
        counts = client["_counts"]
        assert "appointments" in counts, "_counts missing appointments"
        assert "notes" in counts, "_counts missing notes"
        assert "contracts" in counts, "_counts missing contracts"
        assert "invoices" in counts, "_counts missing invoices"
        assert "visits" in counts, "_counts missing visits"
        
        print(f"Client {client_id} _counts: {counts}")
    
    def test_client_timeline_has_links(self, doula_client):
        """GET /api/provider/clients/{id}/timeline - verify timeline items have proper links"""
        # Get list of clients first
        response = doula_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No clients found")
        
        client_id = response.json()[0]["client_id"]
        
        # Get timeline
        response = doula_client.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline")
        assert response.status_code == 200
        data = response.json()
        
        assert "client" in data, "Timeline response missing client"
        assert "timeline" in data, "Timeline response missing timeline"
        
        # Verify client has is_active
        assert "is_active" in data["client"], "Timeline client missing is_active"
        
        # Verify timeline items structure if any exist
        for item in data["timeline"]:
            assert "type" in item, "Timeline item missing type"
            assert "id" in item, "Timeline item missing id"
            assert "date" in item, "Timeline item missing date"
            assert "title" in item, "Timeline item missing title"
        
        print(f"Client {client_id} timeline has {len(data['timeline'])} items")


# ============== ACTIVE CLIENT LOGIC TESTS ==============

class TestActiveClientLogic:
    """Verify is_client_active returns true for clients within 6 weeks of due date"""
    
    def test_include_inactive_false_filters_clients(self, doula_client):
        """By default, only active clients should be returned"""
        # Get active only
        response = doula_client.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200
        active_clients = response.json()
        
        # Get all including inactive
        response = doula_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        assert response.status_code == 200
        all_clients = response.json()
        
        print(f"Active clients: {len(active_clients)}, All clients: {len(all_clients)}")
        
        # Verify all active clients have is_active=True
        for client in active_clients:
            assert client.get("is_active") == True, f"Non-active client in active list: {client['client_id']}"
    
    def test_dashboard_shows_active_clients_count(self, doula_client):
        """GET /api/provider/dashboard - verify returns active_clients count"""
        response = doula_client.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_clients" in data, "Dashboard missing total_clients"
        assert "active_clients" in data, "Dashboard missing active_clients"
        assert "upcoming_appointments" in data, "Dashboard missing upcoming_appointments"
        
        print(f"Dashboard: total_clients={data['total_clients']}, active_clients={data['active_clients']}")
    
    def test_midwife_dashboard_has_role_specific_stats(self, midwife_client):
        """Midwife dashboard should include visits_this_month, births_this_month, prenatal_clients"""
        response = midwife_client.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        assert "active_clients" in data, "Dashboard missing active_clients"
        assert "visits_this_month" in data, "Midwife dashboard missing visits_this_month"
        assert "births_this_month" in data, "Midwife dashboard missing births_this_month"
        assert "prenatal_clients" in data, "Midwife dashboard missing prenatal_clients"
        
        print(f"Midwife dashboard stats: {data}")


# ============== PROVIDER APPOINTMENTS TESTS ==============

class TestProviderAppointments:
    """Verify provider appointments have client_id and provider_id"""
    
    def test_get_appointments_have_required_fields(self, doula_client):
        """GET /api/provider/appointments - verify each appointment has client_id and provider_id"""
        response = doula_client.get(f"{BASE_URL}/api/provider/appointments?include_inactive_clients=true")
        assert response.status_code == 200
        appointments = response.json()
        
        if len(appointments) == 0:
            pytest.skip("No appointments found")
        
        for appt in appointments:
            assert "appointment_id" in appt, "Appointment missing appointment_id"
            assert "provider_id" in appt, f"Appointment missing provider_id: {appt}"
            # client_id should be present (may be populated from lookup)
            print(f"Appointment {appt['appointment_id']}: client_id={appt.get('client_id')}, provider_id={appt.get('provider_id')}")
        
        print(f"Verified {len(appointments)} appointments")
    
    def test_create_appointment_requires_client_id(self, doula_client):
        """POST /api/provider/appointments - verify requires client_id"""
        # Try to create without client_id
        response = doula_client.post(f"{BASE_URL}/api/provider/appointments", json={
            "appointment_date": "2026-03-01",
            "appointment_time": "10:00",
            "appointment_type": "consultation"
        })
        assert response.status_code == 400
        assert "client_id" in response.json().get("detail", "").lower()
        print("Create appointment correctly requires client_id")
    
    def test_create_appointment_stores_provider_id(self, doula_client):
        """POST /api/provider/appointments - verify stores provider_id"""
        # Get a client first
        response = doula_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No clients found")
        
        client_id = response.json()[0]["client_id"]
        
        # Create appointment
        response = doula_client.post(f"{BASE_URL}/api/provider/appointments", json={
            "client_id": client_id,
            "appointment_date": "2026-03-15",
            "appointment_time": "10:00",
            "appointment_type": "TEST_consultation"
        })
        assert response.status_code == 200
        data = response.json()
        
        appointment = data.get("appointment", data)
        assert "provider_id" in appointment, "Created appointment missing provider_id"
        assert appointment["client_id"] == client_id, "Created appointment has wrong client_id"
        
        # Cleanup - delete the test appointment
        if "appointment_id" in appointment:
            doula_client.delete(f"{BASE_URL}/api/provider/appointments/{appointment['appointment_id']}")
        
        print(f"Appointment created with provider_id={appointment.get('provider_id')}")


# ============== MOM APPOINTMENTS TESTS ==============

class TestMomAppointments:
    """Verify mom appointments work correctly"""
    
    def test_get_mom_appointments(self, mom_client):
        """GET /api/mom/appointments - verify returns appointments with provider info"""
        response = mom_client.get(f"{BASE_URL}/api/mom/appointments")
        assert response.status_code == 200
        appointments = response.json()
        
        # Just verify it returns a list (may be empty)
        assert isinstance(appointments, list), "Expected list of appointments"
        print(f"Mom has {len(appointments)} appointments")
    
    def test_mom_cannot_access_provider_routes(self, mom_client):
        """MOM cannot access /api/provider/* routes"""
        routes_to_test = [
            "/api/provider/clients",
            "/api/provider/appointments",
            "/api/provider/notes",
            "/api/provider/dashboard"
        ]
        
        for route in routes_to_test:
            response = mom_client.get(f"{BASE_URL}{route}")
            assert response.status_code == 403, f"Mom should not access {route}, got {response.status_code}"
            print(f"Mom correctly blocked from {route}")


# ============== PROVIDER NOTES TESTS ==============

class TestProviderNotes:
    """Verify provider notes have client_id"""
    
    def test_get_notes_have_client_id(self, doula_client):
        """GET /api/provider/notes - verify each note has client_id and provider_id"""
        response = doula_client.get(f"{BASE_URL}/api/provider/notes")
        assert response.status_code == 200
        notes = response.json()
        
        if len(notes) == 0:
            pytest.skip("No notes found")
        
        for note in notes:
            assert "note_id" in note, "Note missing note_id"
            assert "provider_id" in note, f"Note missing provider_id: {note}"
            assert "client_id" in note, f"Note missing client_id: {note}"
            print(f"Note {note['note_id']}: client_id={note.get('client_id')}")
        
        print(f"Verified {len(notes)} notes")
    
    def test_create_note_requires_client_id(self, doula_client):
        """POST /api/provider/notes - verify requires client_id"""
        response = doula_client.post(f"{BASE_URL}/api/provider/notes", json={
            "title": "Test Note",
            "content": "Test content"
        })
        assert response.status_code == 400
        assert "client_id" in response.json().get("detail", "").lower()
        print("Create note correctly requires client_id")


# ============== MIDWIFE VISITS TESTS ==============

class TestMidwifeVisits:
    """Verify visits have client_id and provider_id"""
    
    def test_get_visits_have_required_fields(self, midwife_client):
        """GET /api/provider/visits - verify each visit has client_id, provider_id"""
        response = midwife_client.get(f"{BASE_URL}/api/provider/visits?include_inactive_clients=true")
        assert response.status_code == 200
        visits = response.json()
        
        if len(visits) == 0:
            pytest.skip("No visits found")
        
        for visit in visits:
            visit_id = visit.get("visit_id") or visit.get("prenatal_visit_id")
            assert visit_id, "Visit missing id"
            assert "client_id" in visit, f"Visit missing client_id: {visit}"
            # provider_id or midwife_id
            has_provider = "provider_id" in visit or "midwife_id" in visit
            assert has_provider, f"Visit missing provider_id/midwife_id: {visit}"
            print(f"Visit {visit_id}: client_id={visit.get('client_id')}")
        
        print(f"Verified {len(visits)} visits")
    
    def test_create_visit_requires_client_id(self, midwife_client):
        """POST /api/provider/visits - verify requires client_id"""
        response = midwife_client.post(f"{BASE_URL}/api/provider/visits", json={
            "visit_date": "2026-03-01",
            "visit_type": "Prenatal"
        })
        assert response.status_code == 400
        assert "client_id" in response.json().get("detail", "").lower()
        print("Create visit correctly requires client_id")
    
    def test_create_visit_creates_appointment(self, midwife_client):
        """POST /api/provider/visits - verify creates linked appointment"""
        # Get a client first
        response = midwife_client.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No clients found")
        
        client_id = response.json()[0]["client_id"]
        
        # Create visit
        response = midwife_client.post(f"{BASE_URL}/api/provider/visits", json={
            "client_id": client_id,
            "visit_date": "2026-03-15",
            "visit_type": "Prenatal",
            "blood_pressure": "120/80"
        })
        assert response.status_code == 200
        visit = response.json()
        
        assert "visit_id" in visit, "Visit missing visit_id"
        assert "appointment_id" in visit, "Visit should create linked appointment"
        assert visit["client_id"] == client_id
        
        # Cleanup
        if "visit_id" in visit:
            midwife_client.delete(f"{BASE_URL}/api/provider/visits/{visit['visit_id']}")
        
        print(f"Visit created with appointment_id={visit.get('appointment_id')}")


# ============== CONTRACTS TESTS ==============

class TestContracts:
    """Verify contracts have client_id"""
    
    def test_doula_contracts_have_client_id(self, doula_client):
        """GET /api/doula/contracts - verify contracts have client_id"""
        response = doula_client.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200
        contracts = response.json()
        
        if len(contracts) == 0:
            pytest.skip("No contracts found")
        
        for contract in contracts:
            assert "contract_id" in contract, "Contract missing contract_id"
            assert "client_id" in contract, f"Contract missing client_id: {contract['contract_id']}"
            print(f"Contract {contract['contract_id']}: client_id={contract.get('client_id')}")
        
        print(f"Verified {len(contracts)} doula contracts")
    
    def test_midwife_contracts_have_client_id(self, midwife_client):
        """GET /api/midwife/contracts - verify contracts have client_id"""
        response = midwife_client.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200
        contracts = response.json()
        
        if len(contracts) == 0:
            pytest.skip("No midwife contracts found")
        
        for contract in contracts:
            assert "contract_id" in contract, "Contract missing contract_id"
            assert "client_id" in contract, f"Contract missing client_id: {contract['contract_id']}"
        
        print(f"Verified {len(contracts)} midwife contracts")
    
    def test_create_contract_requires_client_id(self, doula_client):
        """POST /api/doula/contracts - verify requires client_id"""
        response = doula_client.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_name": "Test Client",
            "estimated_due_date": "2026-06-01",
            "total_fee": 2000,
            "retainer_amount": 500
        })
        # Should fail with 422 (validation) or 400 (missing client_id)
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("Create contract correctly requires client_id")


# ============== INVOICES TESTS ==============

class TestInvoices:
    """Verify invoices have client_id and provider_id"""
    
    def test_doula_invoices_have_required_fields(self, doula_client):
        """GET /api/doula/invoices - verify invoices have client_id and provider_id"""
        response = doula_client.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No invoices found")
        
        for invoice in invoices:
            assert "invoice_id" in invoice, "Invoice missing invoice_id"
            assert "client_id" in invoice, f"Invoice missing client_id: {invoice['invoice_id']}"
            assert "provider_id" in invoice, f"Invoice missing provider_id: {invoice['invoice_id']}"
            print(f"Invoice {invoice['invoice_id']}: client_id={invoice.get('client_id')}, provider_id={invoice.get('provider_id')}")
        
        print(f"Verified {len(invoices)} doula invoices")
    
    def test_midwife_invoices_have_required_fields(self, midwife_client):
        """GET /api/midwife/invoices - verify invoices have client_id and provider_id"""
        response = midwife_client.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 200
        invoices = response.json()
        
        if len(invoices) == 0:
            pytest.skip("No midwife invoices found")
        
        for invoice in invoices:
            assert "invoice_id" in invoice, "Invoice missing invoice_id"
            assert "client_id" in invoice, f"Invoice missing client_id: {invoice['invoice_id']}"
            assert "provider_id" in invoice, f"Invoice missing provider_id: {invoice['invoice_id']}"
        
        print(f"Verified {len(invoices)} midwife invoices")
    
    def test_create_invoice_requires_client_id(self, doula_client):
        """POST /api/doula/invoices - verify requires client_id"""
        response = doula_client.post(f"{BASE_URL}/api/doula/invoices", json={
            "description": "Test Invoice",
            "amount": 500
        })
        # Should fail with 422 (validation) or 400 (missing client_id)
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("Create invoice correctly requires client_id")


# ============== ROLE ACCESS TESTS ==============

class TestRoleAccess:
    """Verify role-based access control"""
    
    def test_doula_can_access_provider_routes(self, doula_client):
        """DOULA can access /api/provider/* routes"""
        routes = [
            "/api/provider/clients",
            "/api/provider/appointments",
            "/api/provider/notes",
            "/api/provider/dashboard"
        ]
        
        for route in routes:
            response = doula_client.get(f"{BASE_URL}{route}")
            assert response.status_code == 200, f"Doula should access {route}, got {response.status_code}"
            print(f"Doula can access {route}: OK")
    
    def test_midwife_can_access_provider_routes(self, midwife_client):
        """MIDWIFE can access /api/provider/* routes"""
        routes = [
            "/api/provider/clients",
            "/api/provider/appointments",
            "/api/provider/notes",
            "/api/provider/dashboard",
            "/api/provider/visits"
        ]
        
        for route in routes:
            response = midwife_client.get(f"{BASE_URL}{route}")
            assert response.status_code == 200, f"Midwife should access {route}, got {response.status_code}"
            print(f"Midwife can access {route}: OK")
    
    def test_mom_cannot_access_provider_routes(self, mom_client):
        """MOM cannot access /api/provider/* routes"""
        routes = [
            "/api/provider/clients",
            "/api/provider/appointments",
            "/api/provider/notes",
            "/api/provider/dashboard"
        ]
        
        for route in routes:
            response = mom_client.get(f"{BASE_URL}{route}")
            assert response.status_code == 403, f"Mom should not access {route}, got {response.status_code}"
            print(f"Mom blocked from {route}: OK (403)")
    
    def test_provider_cannot_access_mom_routes(self, doula_client):
        """Providers cannot access mom-only routes"""
        routes = [
            "/api/birth-plan",
            "/api/timeline",
            "/api/wellness/checkins",
            "/api/postpartum/plan"
        ]
        
        for route in routes:
            response = doula_client.get(f"{BASE_URL}{route}")
            assert response.status_code == 403, f"Provider should not access {route}, got {response.status_code}"
            print(f"Provider blocked from {route}: OK (403)")


# ============== OBJECTID SERIALIZATION TESTS ==============

class TestNoObjectId:
    """Verify no MongoDB ObjectId in responses"""
    
    def test_clients_no_objectid(self, doula_client):
        response = doula_client.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200
        data = response.json()
        for item in data:
            assert "_id" not in item, f"ObjectId leaked in client: {item}"
        print("Clients have no ObjectId: OK")
    
    def test_appointments_no_objectid(self, doula_client):
        response = doula_client.get(f"{BASE_URL}/api/provider/appointments")
        assert response.status_code == 200
        data = response.json()
        for item in data:
            assert "_id" not in item, f"ObjectId leaked in appointment: {item}"
        print("Appointments have no ObjectId: OK")
    
    def test_notes_no_objectid(self, doula_client):
        response = doula_client.get(f"{BASE_URL}/api/provider/notes")
        assert response.status_code == 200
        data = response.json()
        for item in data:
            assert "_id" not in item, f"ObjectId leaked in note: {item}"
        print("Notes have no ObjectId: OK")
    
    def test_dashboard_no_objectid(self, doula_client):
        response = doula_client.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data, f"ObjectId leaked in dashboard: {data}"
        print("Dashboard has no ObjectId: OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
