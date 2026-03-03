"""
Midwife Contracts E2E Test Suite
Tests the full contract workflow: login, create, list, send, sign, PDF download, delete
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://client-photo-sync.preview.emergentagent.com")

# Test credentials from requirements
MIDWIFE_EMAIL = "testmidwife@test.com"
MIDWIFE_PASSWORD = "password123"

class TestMidwifeContractsE2E:
    """E2E tests for midwife contract management system"""
    
    @pytest.fixture(scope="class")
    def api_client(self):
        """Shared requests session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture(scope="class")
    def midwife_auth(self, api_client):
        """Authenticate as midwife and return token"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        
        if response.status_code != 200:
            pytest.skip(f"Failed to authenticate midwife: {response.text}")
        
        data = response.json()
        token = data.get("session_token")
        user_id = data.get("user_id")
        full_name = data.get("full_name")
        
        return {"token": token, "user_id": user_id, "full_name": full_name}
    
    @pytest.fixture(scope="class")
    def auth_headers(self, midwife_auth):
        """Return auth headers for authenticated requests"""
        return {"Authorization": f"Bearer {midwife_auth['token']}"}
    
    def test_01_midwife_login(self, api_client):
        """Test midwife can login successfully"""
        response = api_client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        print(f"✓ Midwife login successful - User: {data.get('full_name')}")
    
    def test_02_get_midwife_clients(self, api_client, auth_headers):
        """Test getting midwife's clients list"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        clients = response.json()
        assert isinstance(clients, list)
        print(f"✓ Got {len(clients)} clients")
        
        # Store first client for contract tests
        if clients:
            return clients[0]
        return None
    
    def test_03_get_existing_contracts(self, api_client, auth_headers):
        """Test getting list of existing contracts"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get contracts: {response.text}"
        contracts = response.json()
        assert isinstance(contracts, list)
        print(f"✓ Got {len(contracts)} existing contracts")
        return contracts
    
    def test_04_get_contract_template(self, api_client, auth_headers):
        """Test getting the midwife contract template"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/contract-template",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        template = response.json()
        assert "sections" in template or isinstance(template, dict)
        print(f"✓ Got contract template")
        return template
    
    def test_05_create_new_contract(self, api_client, auth_headers, midwife_auth):
        """Test creating a new midwife contract with all required fields"""
        # First get clients
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=auth_headers
        )
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available to create contract for")
        
        client = clients[0]
        unique_id = uuid.uuid4().hex[:8]
        
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": f"Test Client {unique_id}",
            "partner_name": "Test Partner",
            "estimated_due_date": "2026-06-15",
            "planned_birth_location": "Home birth at client's residence",
            "scope_description": "Full prenatal, birth, and postpartum care",
            "total_fee": 5000.00,
            "retainer_amount": 1500.00,
            "remaining_balance_due_description": "36 weeks' gestation",
            "fee_coverage_description": "Prenatal care, birth attendance, and 6 weeks postpartum",
            "refund_policy_description": "Partial refund if care ends before birth",
            "transfer_indications_description": "Transfer if complications arise",
            "client_refusal_of_transfer_note": "",
            "midwife_withdrawal_reasons": "",
            "no_refund_scenarios_description": "No refund if client refuses recommended transfer",
            "on_call_window_description": "37 to 42 weeks of pregnancy",
            "backup_midwife_policy": "Backup midwife available if primary unavailable",
            "contact_instructions_routine": "Text or call during office hours",
            "contact_instructions_urgent": "Call for urgent symptoms",
            "emergency_instructions": "Call 911 for emergencies",
            "special_arrangements": "None at this time"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers,
            json=contract_payload
        )
        
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        contract = response.json()
        
        assert "contract_id" in contract
        assert contract["status"] == "Draft"
        assert contract["total_fee"] == 5000.00
        assert contract["retainer_amount"] == 1500.00
        assert contract["remaining_balance"] == 3500.00  # Auto-calculated
        
        print(f"✓ Created contract: {contract['contract_id']}")
        return contract
    
    def test_06_get_contract_detail(self, api_client, auth_headers):
        """Test getting a specific contract's details"""
        # Get contracts first
        contracts_response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers
        )
        contracts = contracts_response.json()
        
        if not contracts:
            pytest.skip("No contracts to test detail view")
        
        contract_id = contracts[0]["contract_id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts/{contract_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get contract: {response.text}"
        contract = response.json()
        assert contract["contract_id"] == contract_id
        print(f"✓ Got contract detail for {contract_id}")
        return contract
    
    def test_07_get_public_contract_view(self, api_client, auth_headers):
        """Test public contract view endpoint"""
        # Get contracts first
        contracts_response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers
        )
        contracts = contracts_response.json()
        
        if not contracts:
            pytest.skip("No contracts to test public view")
        
        contract_id = contracts[0]["contract_id"]
        
        # Public endpoint - no auth needed
        response = api_client.get(
            f"{BASE_URL}/api/midwife-contracts/{contract_id}"
        )
        
        assert response.status_code == 200, f"Failed to get public contract: {response.text}"
        data = response.json()
        assert "contract" in data
        assert "client" in data
        assert "midwife" in data
        print(f"✓ Got public contract view for {contract_id}")
    
    def test_08_get_contract_html(self, api_client, auth_headers):
        """Test getting HTML version of contract"""
        # Get contracts first
        contracts_response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers
        )
        contracts = contracts_response.json()
        
        if not contracts:
            pytest.skip("No contracts to test HTML view")
        
        contract_id = contracts[0]["contract_id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/midwife-contracts/{contract_id}/html"
        )
        
        assert response.status_code == 200, f"Failed to get HTML: {response.text}"
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Got contract HTML for {contract_id}")
    
    def test_09_download_contract_pdf(self, api_client, auth_headers):
        """Test PDF download functionality"""
        # Get contracts first
        contracts_response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers
        )
        contracts = contracts_response.json()
        
        if not contracts:
            pytest.skip("No contracts to test PDF download")
        
        contract_id = contracts[0]["contract_id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/midwife-contracts/{contract_id}/pdf",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to download PDF: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        print(f"✓ Downloaded PDF for {contract_id} ({len(response.content)} bytes)")
    
    def test_10_send_contract(self, api_client, auth_headers):
        """Test sending a contract to client (creates midwife signature)"""
        # Create a new contract first
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client = clients[0]
        unique_id = uuid.uuid4().hex[:8]
        
        # Create contract
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": f"Send Test {unique_id}",
            "estimated_due_date": "2026-07-01",
            "planned_birth_location": "Home",
            "total_fee": 4000.00,
            "retainer_amount": 1000.00,
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers,
            json=contract_payload
        )
        
        assert create_response.status_code == 200
        contract = create_response.json()
        contract_id = contract["contract_id"]
        
        # Send the contract
        response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts/{contract_id}/send",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to send contract: {response.text}"
        data = response.json()
        assert "message" in data
        
        # Verify contract status changed
        verify_response = api_client.get(
            f"{BASE_URL}/api/midwife/contracts/{contract_id}",
            headers=auth_headers
        )
        updated_contract = verify_response.json()
        assert updated_contract["status"] == "Sent"
        assert updated_contract["midwife_signature"] is not None
        
        print(f"✓ Contract {contract_id} sent successfully")
        return contract_id
    
    def test_11_client_sign_contract(self, api_client, auth_headers):
        """Test client signing a sent contract"""
        # Create and send a contract first
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client = clients[0]
        unique_id = uuid.uuid4().hex[:8]
        
        # Create contract
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": f"Sign Test {unique_id}",
            "estimated_due_date": "2026-08-01",
            "planned_birth_location": "Birth Center",
            "total_fee": 4500.00,
            "retainer_amount": 1200.00,
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers,
            json=contract_payload
        )
        contract = create_response.json()
        contract_id = contract["contract_id"]
        
        # Send the contract
        send_response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts/{contract_id}/send",
            headers=auth_headers
        )
        assert send_response.status_code == 200
        
        # Client signs (public endpoint, no auth)
        sign_response = api_client.post(
            f"{BASE_URL}/api/midwife-contracts/{contract_id}/sign",
            json={
                "signer_name": f"Test Client {unique_id}",
                "signature_data": "test_signature_data"
            }
        )
        
        assert sign_response.status_code == 200, f"Failed to sign contract: {sign_response.text}"
        
        # Verify contract is now signed
        verify_response = api_client.get(
            f"{BASE_URL}/api/midwife-contracts/{contract_id}"
        )
        data = verify_response.json()
        assert data["contract"]["status"] == "Signed"
        assert data["contract"]["client_signature"] is not None
        
        print(f"✓ Contract {contract_id} signed by client")
    
    def test_12_cannot_sign_draft_contract(self, api_client, auth_headers):
        """Test that client cannot sign a draft contract"""
        # Create a draft contract
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client = clients[0]
        unique_id = uuid.uuid4().hex[:8]
        
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": f"Draft Test {unique_id}",
            "estimated_due_date": "2026-09-01",
            "planned_birth_location": "Home",
            "total_fee": 3000.00,
            "retainer_amount": 800.00,
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers,
            json=contract_payload
        )
        contract = create_response.json()
        contract_id = contract["contract_id"]
        
        # Try to sign without sending
        sign_response = api_client.post(
            f"{BASE_URL}/api/midwife-contracts/{contract_id}/sign",
            json={"signer_name": "Test Client"}
        )
        
        assert sign_response.status_code == 400, "Should not be able to sign draft contract"
        print(f"✓ Correctly prevented signing draft contract")
    
    def test_13_delete_draft_contract(self, api_client, auth_headers):
        """Test deleting a draft contract - EXPECTED TO FAIL (no backend endpoint)"""
        # Create a draft contract
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=auth_headers
        )
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client = clients[0]
        unique_id = uuid.uuid4().hex[:8]
        
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": f"Delete Test {unique_id}",
            "estimated_due_date": "2026-10-01",
            "planned_birth_location": "Home",
            "total_fee": 2500.00,
            "retainer_amount": 500.00,
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/midwife/contracts",
            headers=auth_headers,
            json=contract_payload
        )
        contract = create_response.json()
        contract_id = contract["contract_id"]
        
        # Try to delete
        delete_response = api_client.delete(
            f"{BASE_URL}/api/midwife/contracts/{contract_id}",
            headers=auth_headers
        )
        
        # This is expected to fail since there's no DELETE endpoint
        if delete_response.status_code == 405 or delete_response.status_code == 404:
            print(f"✗ DELETE endpoint not implemented (status: {delete_response.status_code})")
            pytest.fail("DELETE endpoint for midwife contracts is not implemented in backend")
        
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        print(f"✓ Deleted draft contract {contract_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
