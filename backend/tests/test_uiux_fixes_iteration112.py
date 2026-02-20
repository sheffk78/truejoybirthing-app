"""
Test UI/UX Fixes for Iteration 112

Tests the following fixes:
1. Dashboard stats: active_clients, upcoming_appointments, contracts_pending_signature, pending_invoices
2. Provider Clients filter: Active/Inactive/Leads options
3. Provider Client Timeline: contracts query now checks doula_id/midwife_id
4. Provider Notes creation: POST /api/provider/notes with client_id
5. Provider Contracts creation: POST /api/doula/contracts with client_id
6. Provider Invoices creation: POST /api/doula/invoices with client_id
7. Notes/Contracts/Invoices appear in client timeline after creation
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get base URL from environment - using the public URL
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://midwife-labor.preview.emergentagent.com')

# Test credentials
DOULA_CREDS = {"email": "demo.doula@truejoybirthing.com", "password": "DemoScreenshot2024!"}
MIDWIFE_CREDS = {"email": "demo.midwife@truejoybirthing.com", "password": "DemoScreenshot2024!"}

# Test data prefix for cleanup
TEST_PREFIX = "TEST_UI112_"


class TestSetup:
    """Setup and authentication tests"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print(f"PASS: Health check - API is accessible")
    
    def test_doula_login(self):
        """Test doula login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DOULA_CREDS)
        assert response.status_code == 200, f"Doula login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        print(f"PASS: Doula login successful")
        return data["session_token"]
    
    def test_midwife_login(self):
        """Test midwife login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MIDWIFE_CREDS)
        assert response.status_code == 200, f"Midwife login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "session_token" in data, "No session_token in response"
        print(f"PASS: Midwife login successful")
        return data["session_token"]


@pytest.fixture(scope="module")
def doula_token():
    """Get doula auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DOULA_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Doula login failed: {response.status_code}")
    return response.json()["session_token"]


@pytest.fixture(scope="module")
def midwife_token():
    """Get midwife auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=MIDWIFE_CREDS)
    if response.status_code != 200:
        pytest.skip(f"Midwife login failed: {response.status_code}")
    return response.json()["session_token"]


@pytest.fixture(scope="module")
def doula_headers(doula_token):
    """Headers for doula API requests"""
    return {"Authorization": f"Bearer {doula_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def midwife_headers(midwife_token):
    """Headers for midwife API requests"""
    return {"Authorization": f"Bearer {midwife_token}", "Content-Type": "application/json"}


class TestDashboardStats:
    """Test dashboard returns correct stats fields"""
    
    def test_doula_dashboard_has_active_clients(self, doula_headers):
        """Dashboard should return active_clients count"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=doula_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.status_code}"
        data = response.json()
        
        assert "active_clients" in data, "Missing active_clients in dashboard"
        assert isinstance(data["active_clients"], int), "active_clients should be int"
        print(f"PASS: Doula dashboard has active_clients = {data['active_clients']}")
    
    def test_doula_dashboard_has_upcoming_appointments(self, doula_headers):
        """Dashboard should return upcoming_appointments count"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "upcoming_appointments" in data, "Missing upcoming_appointments in dashboard"
        assert isinstance(data["upcoming_appointments"], int), "upcoming_appointments should be int"
        print(f"PASS: Doula dashboard has upcoming_appointments = {data['upcoming_appointments']}")
    
    def test_doula_dashboard_has_contracts_pending_signature(self, doula_headers):
        """Dashboard should return contracts_pending_signature count"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "contracts_pending_signature" in data, "Missing contracts_pending_signature in dashboard"
        assert isinstance(data["contracts_pending_signature"], int), "contracts_pending_signature should be int"
        print(f"PASS: Doula dashboard has contracts_pending_signature = {data['contracts_pending_signature']}")
    
    def test_doula_dashboard_has_pending_invoices(self, doula_headers):
        """Dashboard should return pending_invoices count"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "pending_invoices" in data, "Missing pending_invoices in dashboard"
        assert isinstance(data["pending_invoices"], int), "pending_invoices should be int"
        print(f"PASS: Doula dashboard has pending_invoices = {data['pending_invoices']}")
    
    def test_midwife_dashboard_has_role_specific_stats(self, midwife_headers):
        """Midwife dashboard should have role-specific stats"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=midwife_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Midwife-specific stats
        assert "visits_this_month" in data, "Missing visits_this_month in midwife dashboard"
        assert "births_this_month" in data, "Missing births_this_month in midwife dashboard"
        assert "prenatal_clients" in data, "Missing prenatal_clients in midwife dashboard"
        
        # Also should have common stats
        assert "active_clients" in data, "Missing active_clients in midwife dashboard"
        assert "upcoming_appointments" in data, "Missing upcoming_appointments in midwife dashboard"
        
        print(f"PASS: Midwife dashboard has all required stats")
        print(f"  - active_clients: {data.get('active_clients')}")
        print(f"  - upcoming_appointments: {data.get('upcoming_appointments')}")
        print(f"  - visits_this_month: {data.get('visits_this_month')}")
        print(f"  - births_this_month: {data.get('births_this_month')}")
        print(f"  - prenatal_clients: {data.get('prenatal_clients')}")


class TestClientFilter:
    """Test client filter with Active/Inactive/Leads options"""
    
    def test_get_clients_default_active_only(self, doula_headers):
        """Default client fetch should return active clients only"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=doula_headers)
        assert response.status_code == 200, f"Get clients failed: {response.status_code}"
        data = response.json()
        
        # All returned clients should be active by default (is_active != false)
        for client in data:
            # is_active should be True for all clients when include_inactive=false (default)
            assert client.get("is_active") is not False, f"Found inactive client {client.get('client_id')} in active filter"
        
        print(f"PASS: Default client list returns {len(data)} active clients")
    
    def test_get_clients_include_inactive(self, doula_headers):
        """include_inactive=true should return all clients"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert response.status_code == 200, f"Get clients failed: {response.status_code}"
        data = response.json()
        
        # Should return clients with is_active field
        if len(data) > 0:
            assert "is_active" in data[0], "Client missing is_active field"
        
        print(f"PASS: Include inactive returns {len(data)} total clients")
    
    def test_get_clients_status_filter_lead(self, doula_headers):
        """status_filter=Lead should return only Lead status clients"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?status_filter=Lead&include_inactive=true", headers=doula_headers)
        assert response.status_code == 200, f"Get clients with status filter failed: {response.status_code}"
        data = response.json()
        
        for client in data:
            assert client.get("status") == "Lead", f"Client {client.get('client_id')} has status {client.get('status')}, expected Lead"
        
        print(f"PASS: Status filter 'Lead' returns {len(data)} leads")
    
    def test_client_has_is_active_field(self, doula_headers):
        """Each client should have is_active computed field"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            client = data[0]
            assert "is_active" in client, "Client missing is_active field"
            assert isinstance(client["is_active"], bool), "is_active should be boolean"
            print(f"PASS: Clients have is_active field (sample: {client.get('is_active')})")
        else:
            print(f"PASS: No clients to verify is_active field (empty list)")


class TestProviderNotesCreation:
    """Test provider notes creation with client_id"""
    
    def test_create_note_requires_client_id(self, doula_headers):
        """Creating note without client_id should fail"""
        note_data = {
            "title": f"{TEST_PREFIX}Note Without Client",
            "content": "This should fail",
            "note_type": "General"
        }
        response = requests.post(f"{BASE_URL}/api/provider/notes", json=note_data, headers=doula_headers)
        assert response.status_code == 400, f"Expected 400 for missing client_id, got {response.status_code}"
        print(f"PASS: Create note without client_id returns 400")
    
    def test_create_note_with_client_id(self, doula_headers):
        """Creating note with valid client_id should succeed"""
        # First get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        note_data = {
            "client_id": client_id,
            "title": f"{TEST_PREFIX}Test Note",
            "content": "Test content for note creation",
            "note_type": "General"
        }
        response = requests.post(f"{BASE_URL}/api/provider/notes", json=note_data, headers=doula_headers)
        assert response.status_code in [200, 201], f"Create note failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "note_id" in data, "Response missing note_id"
        assert data.get("client_id") == client_id, "Response client_id doesn't match"
        
        print(f"PASS: Created note {data.get('note_id')} for client {client_id}")
        return data.get("note_id"), client_id


class TestProviderContractsCreation:
    """Test provider contracts creation with client_id"""
    
    def test_create_doula_contract_with_client_id(self, doula_headers):
        """Creating contract with valid client_id should succeed"""
        # First get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client = clients[0]
        client_id = client["client_id"]
        client_name = client.get("name", "Test Client")
        due_date = client.get("due_date") or client.get("edd") or (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        contract_data = {
            "client_id": client_id,
            "client_name": client_name,
            "estimated_due_date": due_date,
            "title": f"{TEST_PREFIX}Test Contract",
            "services_included": ["Birth Support", "Postpartum Support"],
            "total_fee": 1500.00,
            "deposit_amount": 500.00,
            "retainer_amount": 500.00,
            "status": "Draft"
        }
        response = requests.post(f"{BASE_URL}/api/doula/contracts", json=contract_data, headers=doula_headers)
        assert response.status_code in [200, 201], f"Create contract failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "contract_id" in data, "Response missing contract_id"
        
        print(f"PASS: Created contract {data.get('contract_id')} for client {client_id}")
        return data.get("contract_id"), client_id


class TestProviderInvoicesCreation:
    """Test provider invoices creation with client_id"""
    
    def test_create_doula_invoice_with_client_id(self, doula_headers):
        """Creating invoice with valid client_id should succeed"""
        # First get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        invoice_data = {
            "client_id": client_id,
            "description": f"{TEST_PREFIX}Test Invoice",
            "amount": 500.00,
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": "Draft"
        }
        response = requests.post(f"{BASE_URL}/api/doula/invoices", json=invoice_data, headers=doula_headers)
        assert response.status_code in [200, 201], f"Create invoice failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "invoice_id" in data, "Response missing invoice_id"
        
        print(f"PASS: Created invoice {data.get('invoice_id')} for client {client_id}")
        return data.get("invoice_id"), client_id


class TestClientTimelineContractsQuery:
    """Test that client timeline returns contracts checking doula_id/midwife_id"""
    
    def test_doula_timeline_returns_contracts(self, doula_headers):
        """Timeline should return contracts for doula (checking doula_id)"""
        # Get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        # Get timeline
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=doula_headers)
        assert response.status_code == 200, f"Get timeline failed: {response.status_code}"
        data = response.json()
        
        assert "timeline" in data, "Response missing timeline array"
        assert "client" in data, "Response missing client object"
        
        # Check if there are any contract items
        contract_items = [item for item in data["timeline"] if item.get("type") == "contract"]
        print(f"PASS: Timeline for client {client_id} has {len(contract_items)} contracts")
        
        # Verify contract item structure
        if len(contract_items) > 0:
            contract = contract_items[0]
            assert "id" in contract, "Contract item missing id"
            assert "date" in contract, "Contract item missing date"
            assert "title" in contract, "Contract item missing title"
            print(f"  Contract structure verified: id={contract.get('id')}, title={contract.get('title')}")
    
    def test_midwife_timeline_returns_contracts(self, midwife_headers):
        """Timeline should return contracts for midwife (checking midwife_id)"""
        # Get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=midwife_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        # Get timeline
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=midwife_headers)
        assert response.status_code == 200, f"Get timeline failed: {response.status_code}"
        data = response.json()
        
        assert "timeline" in data, "Response missing timeline array"
        
        contract_items = [item for item in data["timeline"] if item.get("type") == "contract"]
        print(f"PASS: Midwife timeline for client {client_id} has {len(contract_items)} contracts")


class TestTimelineShowsCreatedItems:
    """Test that notes/contracts/invoices appear in timeline after creation"""
    
    def test_created_note_appears_in_timeline(self, doula_headers):
        """After creating a note, it should appear in client timeline"""
        # Get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        # Create a note
        note_data = {
            "client_id": client_id,
            "title": f"{TEST_PREFIX}Timeline Test Note",
            "content": "This note should appear in timeline",
            "note_type": "General"
        }
        create_resp = requests.post(f"{BASE_URL}/api/provider/notes", json=note_data, headers=doula_headers)
        assert create_resp.status_code in [200, 201], f"Create note failed: {create_resp.status_code}"
        note_id = create_resp.json().get("note_id")
        
        # Get timeline
        timeline_resp = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=doula_headers)
        assert timeline_resp.status_code == 200
        timeline_data = timeline_resp.json()
        
        # Find the note in timeline
        note_items = [item for item in timeline_data["timeline"] if item.get("type") == "note" and item.get("id") == note_id]
        assert len(note_items) > 0, f"Created note {note_id} not found in timeline"
        
        print(f"PASS: Created note {note_id} appears in client timeline")
    
    def test_created_contract_appears_in_timeline(self, doula_headers):
        """After creating a contract, it should appear in client timeline"""
        # Get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client = clients[0]
        client_id = client["client_id"]
        client_name = client.get("name", "Test Client")
        due_date = client.get("due_date") or client.get("edd") or (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        # Create a contract
        contract_data = {
            "client_id": client_id,
            "client_name": client_name,
            "estimated_due_date": due_date,
            "title": f"{TEST_PREFIX}Timeline Test Contract",
            "services_included": ["Test Service"],
            "total_fee": 100.00,
            "retainer_amount": 50.00,
            "status": "Draft"
        }
        create_resp = requests.post(f"{BASE_URL}/api/doula/contracts", json=contract_data, headers=doula_headers)
        assert create_resp.status_code in [200, 201], f"Create contract failed: {create_resp.status_code} - {create_resp.text}"
        contract_id = create_resp.json().get("contract_id")
        
        # Get timeline
        timeline_resp = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=doula_headers)
        assert timeline_resp.status_code == 200
        timeline_data = timeline_resp.json()
        
        # Find the contract in timeline
        contract_items = [item for item in timeline_data["timeline"] if item.get("type") == "contract" and item.get("id") == contract_id]
        assert len(contract_items) > 0, f"Created contract {contract_id} not found in timeline"
        
        print(f"PASS: Created contract {contract_id} appears in client timeline")
    
    def test_created_invoice_appears_in_timeline(self, doula_headers):
        """After creating an invoice, it should appear in client timeline"""
        # Get a client
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        # Create an invoice
        invoice_data = {
            "client_id": client_id,
            "description": f"{TEST_PREFIX}Timeline Test Invoice",
            "amount": 100.00,
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": "Draft"
        }
        create_resp = requests.post(f"{BASE_URL}/api/doula/invoices", json=invoice_data, headers=doula_headers)
        assert create_resp.status_code in [200, 201], f"Create invoice failed: {create_resp.status_code}"
        invoice_id = create_resp.json().get("invoice_id")
        
        # Get timeline
        timeline_resp = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=doula_headers)
        assert timeline_resp.status_code == 200
        timeline_data = timeline_resp.json()
        
        # Find the invoice in timeline
        invoice_items = [item for item in timeline_data["timeline"] if item.get("type") == "invoice" and item.get("id") == invoice_id]
        assert len(invoice_items) > 0, f"Created invoice {invoice_id} not found in timeline"
        
        print(f"PASS: Created invoice {invoice_id} appears in client timeline")


class TestClientDetailResponse:
    """Test client detail endpoint returns _counts"""
    
    def test_client_detail_has_counts(self, doula_headers):
        """Client detail should have _counts object"""
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        
        detail_resp = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}", headers=doula_headers)
        assert detail_resp.status_code == 200, f"Get client detail failed: {detail_resp.status_code}"
        data = detail_resp.json()
        
        assert "_counts" in data, "Client detail missing _counts"
        counts = data["_counts"]
        
        assert "appointments" in counts, "_counts missing appointments"
        assert "notes" in counts, "_counts missing notes"
        assert "contracts" in counts, "_counts missing contracts"
        assert "invoices" in counts, "_counts missing invoices"
        
        print(f"PASS: Client detail has _counts: appointments={counts['appointments']}, notes={counts['notes']}, contracts={counts['contracts']}, invoices={counts['invoices']}")


class TestNoObjectIdInResponses:
    """Verify no MongoDB _id in responses"""
    
    def test_dashboard_no_objectid(self, doula_headers):
        """Dashboard should not contain _id"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data, "Dashboard contains _id"
        print(f"PASS: Dashboard has no _id")
    
    def test_clients_no_objectid(self, doula_headers):
        """Clients list should not contain _id"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        
        for client in data:
            assert "_id" not in client, f"Client {client.get('client_id')} contains _id"
        
        print(f"PASS: Clients list has no _id")
    
    def test_timeline_no_objectid(self, doula_headers):
        """Timeline should not contain _id"""
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=doula_headers)
        if clients_resp.status_code != 200 or len(clients_resp.json()) == 0:
            pytest.skip("No clients for timeline test")
        
        client_id = clients_resp.json()[0]["client_id"]
        
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=doula_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "_id" not in data, "Timeline contains _id"
        assert "_id" not in data.get("client", {}), "Timeline client contains _id"
        
        for item in data.get("timeline", []):
            assert "_id" not in item, f"Timeline item {item.get('id')} contains _id"
            assert "_id" not in item.get("data", {}), f"Timeline item data contains _id"
        
        print(f"PASS: Timeline has no _id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
