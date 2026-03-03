"""
Test Doula Section Bug Fixes - Iteration 73
Tests for:
1. Dashboard stats API returns correct active_clients count
2. Contract creation API works without 422 error
3. Invoice creation API works without errors
4. Contract quick edit (PUT) works
5. Doula client list shows connected clients correctly
"""

import pytest
import requests
import os

# Use the public API URL
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-platform-qa.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"
MOM_EMAIL = "testmom_msg@test.com"
MOM_PASSWORD = "password123"

# Test client ID for contract/invoice tests
TEST_CLIENT_ID = "client_5a266da7daed"


class TestDoulaLogin:
    """Test doula authentication"""
    
    def test_doula_login(self):
        """Test doula can login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.text[:500] if response.text else 'empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_token" in data, "session_token not in response"
        assert data.get("role") == "DOULA", f"Expected role DOULA, got {data.get('role')}"
        
        # Store token for other tests
        TestDoulaLogin.session_token = data["session_token"]
        TestDoulaLogin.user_id = data.get("user_id")
        print(f"Login successful. User ID: {data.get('user_id')}")
        return data["session_token"]


class TestDoulaDashboard:
    """Test doula dashboard stats endpoint"""
    
    def test_dashboard_returns_correct_stats(self):
        """Test dashboard API returns all expected fields including active_clients"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get dashboard
        response = requests.get(
            f"{BASE_URL}/api/doula/dashboard",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Dashboard response status: {response.status_code}")
        print(f"Dashboard response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all expected fields are present
        assert "total_clients" in data, "total_clients not in response"
        assert "active_clients" in data, "active_clients not in response"
        assert "pending_invoices" in data, "pending_invoices not in response"
        assert "contracts_pending_signature" in data, "contracts_pending_signature not in response"
        assert "upcoming_appointments" in data, "upcoming_appointments not in response"
        
        # Verify counts are integers
        assert isinstance(data["total_clients"], int), f"total_clients should be int, got {type(data['total_clients'])}"
        assert isinstance(data["active_clients"], int), f"active_clients should be int, got {type(data['active_clients'])}"
        
        print(f"Dashboard stats: total_clients={data['total_clients']}, active_clients={data['active_clients']}")
        print(f"  pending_invoices={data['pending_invoices']}, contracts_pending={data['contracts_pending_signature']}")


class TestDoulaClients:
    """Test doula clients endpoint"""
    
    def test_get_doula_clients(self):
        """Test doula can retrieve client list"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get clients
        response = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Clients response status: {response.status_code}")
        print(f"Number of clients: {len(response.json()) if response.status_code == 200 else 'N/A'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of clients"
        
        # Check structure of each client if any exist
        if len(data) > 0:
            client = data[0]
            print(f"Sample client: {client}")
            assert "client_id" in client, "client_id not in client"
            assert "name" in client, "name not in client"
    
    def test_verify_test_client_exists(self):
        """Verify the test client exists for contract/invoice tests"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get clients
        response = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        clients = response.json()
        client_ids = [c.get("client_id") for c in clients]
        print(f"Available client IDs: {client_ids}")
        
        # Store a valid client ID for other tests
        if clients:
            TestDoulaClients.valid_client_id = clients[0]["client_id"]
            TestDoulaClients.valid_client_name = clients[0]["name"]
            print(f"Using client: {TestDoulaClients.valid_client_name} ({TestDoulaClients.valid_client_id})")
        else:
            pytest.skip("No clients available for testing")


class TestDoulaContractCreation:
    """Test doula contract creation (bug fix for 422 error)"""
    
    def test_create_contract_success(self):
        """Test contract creation works without 422 error"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get a valid client ID
        clients_resp = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        if clients_resp.status_code != 200 or not clients_resp.json():
            pytest.skip("No clients available for contract creation test")
        
        client = clients_resp.json()[0]
        client_id = client.get("client_id")
        client_name = client.get("name", "Test Client")
        
        # Create contract with minimal required fields
        contract_data = {
            "client_id": client_id,
            "client_name": client_name,
            "estimated_due_date": "2026-06-01",
            "total_fee": 1500.0,
            "retainer_amount": 500.0,
            "final_payment_due_description": "Day after birth"
        }
        
        print(f"Creating contract with data: {contract_data}")
        
        response = requests.post(
            f"{BASE_URL}/api/doula/contracts",
            headers={"Authorization": f"Bearer {token}"},
            json=contract_data
        )
        print(f"Create contract response status: {response.status_code}")
        print(f"Create contract response: {response.text[:1000] if response.text else 'empty'}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contract_id" in data, "contract_id not in response"
        assert data.get("status") == "Draft", f"Expected status 'Draft', got {data.get('status')}"
        assert data.get("total_fee") == 1500.0, f"total_fee mismatch"
        assert data.get("remaining_balance") == 1000.0, f"remaining_balance should be 1000, got {data.get('remaining_balance')}"
        
        # Store contract ID for other tests
        TestDoulaContractCreation.test_contract_id = data["contract_id"]
        print(f"Contract created successfully: {data['contract_id']}")
    
    def test_contract_creation_does_not_422(self):
        """Specifically test that contract creation doesn't return 422 validation error"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get a valid client ID
        clients_resp = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        if clients_resp.status_code != 200 or not clients_resp.json():
            pytest.skip("No clients available")
        
        client = clients_resp.json()[0]
        
        # Test with various payloads that previously caused 422
        contract_data = {
            "client_id": client.get("client_id"),
            "client_name": client.get("name", "Test"),
            "estimated_due_date": "2026-07-15",
            "total_fee": 2000.0,
            "retainer_amount": 600.0,
            "final_payment_due_description": "Day after birth",
            # Optional fields
            "prenatal_visit_description": "Two prenatal visits",
            "on_call_window_description": "37-42 weeks",
            "postpartum_visit_description": "One postpartum visit within 2 weeks"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/doula/contracts",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=contract_data
        )
        
        # Main assertion: NOT a 422 error
        assert response.status_code != 422, f"Got 422 validation error: {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        print("Contract creation successful - no 422 error!")


class TestDoulaContractQuickEdit:
    """Test doula contract quick edit (PUT) functionality"""
    
    def test_contract_quick_edit_works(self):
        """Test that PUT /doula/contracts/{id} works for quick edits"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # First create a contract
        clients_resp = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        if clients_resp.status_code != 200 or not clients_resp.json():
            pytest.skip("No clients available")
        
        client = clients_resp.json()[0]
        
        # Create contract
        contract_data = {
            "client_id": client.get("client_id"),
            "client_name": client.get("name", "Test"),
            "estimated_due_date": "2026-08-01",
            "total_fee": 1800.0,
            "retainer_amount": 500.0,
            "final_payment_due_description": "Day after birth"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/doula/contracts",
            headers={"Authorization": f"Bearer {token}"},
            json=contract_data
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        contract_id = create_resp.json()["contract_id"]
        
        # Now test quick edit (PUT)
        update_data = {
            "total_fee": 2200.0,
            "retainer_amount": 700.0,
            "special_arrangements": "Client prefers text communication"
        }
        
        print(f"Updating contract {contract_id} with: {update_data}")
        
        response = requests.put(
            f"{BASE_URL}/api/doula/contracts/{contract_id}",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=update_data
        )
        print(f"Update response status: {response.status_code}")
        print(f"Update response: {response.text}")
        
        # Should not be 422 or 500
        assert response.status_code != 422, f"Got 422 validation error: {response.text}"
        assert response.status_code != 500, f"Got 500 server error: {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the update by fetching the contract
        get_resp = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}"
        )
        if get_resp.status_code == 200:
            contract = get_resp.json().get("contract", {})
            assert contract.get("total_fee") == 2200.0, f"total_fee not updated"
            assert contract.get("remaining_balance") == 1500.0, f"remaining_balance should be 1500"
            print("Contract quick edit verified successfully!")


class TestDoulaInvoiceCreation:
    """Test doula invoice creation functionality"""
    
    def test_create_invoice_success(self):
        """Test invoice creation works without errors"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get a valid client ID
        clients_resp = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        if clients_resp.status_code != 200 or not clients_resp.json():
            pytest.skip("No clients available for invoice creation test")
        
        client = clients_resp.json()[0]
        client_id = client.get("client_id")
        
        # Create invoice with required fields
        invoice_data = {
            "client_id": client_id,
            "description": "Test Invoice - Birth Doula Services",
            "amount": 1500.0,
            "issue_date": "2026-01-15",
            "due_date": "2026-02-15",
            "notes_for_client": "Thank you for choosing our services"
        }
        
        print(f"Creating invoice with data: {invoice_data}")
        
        response = requests.post(
            f"{BASE_URL}/api/doula/invoices",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=invoice_data
        )
        print(f"Create invoice response status: {response.status_code}")
        print(f"Create invoice response: {response.text[:1000] if response.text else 'empty'}")
        
        # Should not be 422 or 500
        assert response.status_code != 422, f"Got 422 validation error: {response.text}"
        assert response.status_code != 500, f"Got 500 server error: {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invoice_id" in data, "invoice_id not in response"
        assert data.get("status") == "Draft", f"Expected status 'Draft', got {data.get('status')}"
        assert data.get("amount") == 1500.0, f"amount mismatch"
        assert data.get("client_name") == client.get("name"), f"client_name mismatch"
        
        print(f"Invoice created successfully: {data['invoice_id']}")
        TestDoulaInvoiceCreation.test_invoice_id = data["invoice_id"]
    
    def test_invoice_creation_with_all_fields(self):
        """Test invoice creation with all optional fields"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        # Get a valid client ID
        clients_resp = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {token}"}
        )
        if clients_resp.status_code != 200 or not clients_resp.json():
            pytest.skip("No clients available")
        
        client = clients_resp.json()[0]
        
        # Create invoice with all fields
        invoice_data = {
            "client_id": client.get("client_id"),
            "invoice_number": "INV-2026-TEST-001",
            "description": "Complete Birth Doula Package",
            "amount": 2500.0,
            "issue_date": "2026-01-20",
            "due_date": "2026-02-20",
            "payment_instructions_text": "Please pay via Venmo @TestDoula or Zelle",
            "notes_for_client": "Package includes prenatal visits, birth support, and postpartum visit"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/doula/invoices",
            headers={"Authorization": f"Bearer {token}"},
            json=invoice_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("invoice_number") == "INV-2026-TEST-001"
        assert data.get("payment_instructions_text") == "Please pay via Venmo @TestDoula or Zelle"
        print("Full invoice creation successful!")


class TestDoulaGetContracts:
    """Test doula contracts retrieval"""
    
    def test_get_contracts_list(self):
        """Test retrieving list of contracts"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/doula/contracts",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Get contracts response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of contracts"
        print(f"Number of contracts: {len(data)}")
        
        if data:
            contract = data[0]
            print(f"Sample contract status: {contract.get('status')}")
            assert "contract_id" in contract
            assert "client_name" in contract
            assert "status" in contract


class TestDoulaGetInvoices:
    """Test doula invoices retrieval"""
    
    def test_get_invoices_list(self):
        """Test retrieving list of invoices"""
        # Login first
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200, "Login failed"
        token = login_resp.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/doula/invoices",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Get invoices response status: {response.status_code}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of invoices"
        print(f"Number of invoices: {len(data)}")
        
        if data:
            invoice = data[0]
            print(f"Sample invoice: ID={invoice.get('invoice_id')}, status={invoice.get('status')}")
            assert "invoice_id" in invoice
            assert "client_name" in invoice
            assert "status" in invoice


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
