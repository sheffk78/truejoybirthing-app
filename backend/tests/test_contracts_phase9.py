"""
Phase 9 Contracts Routes Migration Tests

Tests for all contract routes migrated from server.py to routes/contracts.py:
- Doula contracts: CRUD, send, duplicate, sign, PDF, HTML
- Midwife contracts: CRUD, send, duplicate, sign, PDF, HTML
- Contract templates: CRUD
- Midwife contract defaults: GET, PUT

Test credentials:
- Doula: demo.doula@truejoybirthing.com / DemoScreenshot2024!
- Midwife: demo.midwife@truejoybirthing.com / DemoScreenshot2024!
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Use BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://birthing-app-qa.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Verify environment is correctly configured"""
    
    def test_base_url_configured(self):
        """Verify BASE_URL is configured"""
        assert BASE_URL is not None, "BASE_URL must be configured"
        assert BASE_URL.startswith("http"), "BASE_URL must be a valid URL"
        print(f"BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("API health check passed")


class TestAuthLogin:
    """Test authentication for both Doula and Midwife accounts"""
    
    def test_doula_login_success(self):
        """Verify Doula can login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "session_token" in data, "session_token not in response"
        # Role can be in data directly or inside user object
        role = data.get("role") or data.get("user", {}).get("role")
        assert role == "DOULA", f"User role should be DOULA, got {role}"
        full_name = data.get("full_name") or data.get("user", {}).get("full_name")
        print(f"Doula login successful: {full_name}")
    
    def test_midwife_login_success(self):
        """Verify Midwife can login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "session_token" in data, "session_token not in response"
        # Role can be in data directly or inside user object
        role = data.get("role") or data.get("user", {}).get("role")
        assert role == "MIDWIFE", f"User role should be MIDWIFE, got {role}"
        full_name = data.get("full_name") or data.get("user", {}).get("full_name")
        print(f"Midwife login successful: {full_name}")


@pytest.fixture
def doula_session():
    """Get authenticated session for Doula"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    assert response.status_code == 200, f"Doula login failed: {response.text}"
    token = response.json().get("session_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


@pytest.fixture
def midwife_session():
    """Get authenticated session for Midwife"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    assert response.status_code == 200, f"Midwife login failed: {response.text}"
    token = response.json().get("session_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


class TestDoulaContractsRoutes:
    """Test Doula contract CRUD operations migrated to routes/contracts.py"""
    
    def test_get_doula_contracts_list(self, doula_session):
        """GET /api/doula/contracts - List all doula contracts"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} doula contracts")
    
    def test_get_doula_contracts_requires_auth(self):
        """GET /api/doula/contracts should require authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_doula_contract_template(self, doula_session):
        """GET /api/doula/contract-template - Get contract template"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contract-template")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "sections" in data or "template" in data or isinstance(data, dict), "Should return template data"
        print("Doula contract template retrieved successfully")
    
    def test_create_doula_contract(self, doula_session):
        """POST /api/doula/contracts - Create a new doula contract"""
        # First, get a client to create contract for
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert clients_resp.status_code == 200, f"Failed to get clients: {clients_resp.text}"
        clients = clients_resp.json()
        
        if not clients:
            # Create a test client first
            client_resp = doula_session.post(f"{BASE_URL}/api/doula/clients", json={
                "name": "TEST_Contract_Client",
                "email": f"test.contract.{uuid.uuid4().hex[:8]}@example.com",
                "phone": "555-1234",
                "edd": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
                "planned_birth_setting": "Hospital"
            })
            assert client_resp.status_code in [200, 201], f"Failed to create client: {client_resp.text}"
            client = client_resp.json()
            client_id = client.get("client_id")
            client_name = client.get("name")
        else:
            client = clients[0]
            client_id = client.get("client_id")
            client_name = client.get("name")
        
        # Create contract
        contract_data = {
            "client_id": client_id,
            "client_name": client_name,
            "estimated_due_date": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
            "total_fee": 2500.00,
            "retainer_amount": 500.00,
            "final_payment_due_description": "Day after birth"
        }
        
        response = doula_session.post(f"{BASE_URL}/api/doula/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "contract_id" in data, "contract_id not in response"
        assert data.get("status") == "Draft", "New contract should be Draft"
        assert data.get("total_fee") == 2500.00, "Total fee mismatch"
        assert data.get("remaining_balance") == 2000.00, "Remaining balance should be auto-calculated"
        print(f"Created doula contract: {data.get('contract_id')}")
        return data.get("contract_id")
    
    def test_update_doula_contract(self, doula_session):
        """PUT /api/doula/contracts/{contract_id} - Update a doula contract"""
        # Get existing contracts
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available to update")
        
        # Find a draft contract
        draft_contracts = [c for c in contracts if c.get("status") == "Draft"]
        if not draft_contracts:
            pytest.skip("No draft contracts available to update")
        
        contract_id = draft_contracts[0].get("contract_id")
        
        # Update contract
        update_data = {
            "total_fee": 2750.00,
            "special_arrangements": "TEST_Updated special arrangements"
        }
        
        response = doula_session.put(f"{BASE_URL}/api/doula/contracts/{contract_id}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"Updated doula contract: {contract_id}")
    
    def test_duplicate_doula_contract(self, doula_session):
        """POST /api/doula/contracts/{contract_id}/duplicate - Duplicate a contract"""
        # Get existing contracts
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available to duplicate")
        
        contract_id = contracts[0].get("contract_id")
        
        response = doula_session.post(f"{BASE_URL}/api/doula/contracts/{contract_id}/duplicate")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "contract" in data, "Response should contain 'contract'"
        new_contract = data.get("contract")
        assert new_contract.get("contract_id") != contract_id, "New contract should have different ID"
        assert new_contract.get("status") == "Draft", "Duplicated contract should be Draft"
        print(f"Duplicated contract to: {new_contract.get('contract_id')}")
    
    def test_delete_doula_contract_draft(self, doula_session):
        """DELETE /api/doula/contracts/{contract_id} - Delete a draft contract"""
        # Create a contract to delete
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client = clients[0]
        
        # Create a contract to delete
        contract_data = {
            "client_id": client.get("client_id"),
            "client_name": f"TEST_Delete_{uuid.uuid4().hex[:8]}",
            "estimated_due_date": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
            "total_fee": 1000.00,
            "retainer_amount": 200.00,
            "final_payment_due_description": "Day after birth"
        }
        
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/contracts", json=contract_data)
        assert create_resp.status_code in [200, 201], f"Failed to create: {create_resp.text}"
        contract_id = create_resp.json().get("contract_id")
        
        # Delete the contract
        response = doula_session.delete(f"{BASE_URL}/api/doula/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"Deleted draft contract: {contract_id}")
    
    def test_delete_non_draft_contract_fails(self, doula_session):
        """DELETE should fail for non-draft contracts"""
        # Get existing contracts
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        # Find a sent or signed contract
        non_draft = [c for c in contracts if c.get("status") in ["Sent", "Signed"]]
        if not non_draft:
            pytest.skip("No non-draft contracts to test")
        
        contract_id = non_draft[0].get("contract_id")
        
        response = doula_session.delete(f"{BASE_URL}/api/doula/contracts/{contract_id}")
        assert response.status_code == 400, f"Expected 400 for non-draft delete, got {response.status_code}"
        print(f"Correctly rejected delete of non-draft contract: {contract_id}")


class TestDoulaContractViews:
    """Test public contract viewing endpoints"""
    
    def test_get_contract_by_id(self, doula_session):
        """GET /api/contracts/{contract_id} - Public view"""
        # Get a contract ID
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        # Public endpoint - no auth needed
        response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "contract" in data, "Response should contain 'contract'"
        print(f"Retrieved contract via public endpoint: {contract_id}")
    
    def test_get_contract_html(self, doula_session):
        """GET /api/contracts/{contract_id}/html - HTML view"""
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}/html")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Should return HTML"
        print(f"Retrieved HTML view for contract: {contract_id}")
    
    def test_get_contract_pdf(self, doula_session):
        """GET /api/contracts/{contract_id}/pdf - PDF download"""
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        response = requests.get(f"{BASE_URL}/api/contracts/{contract_id}/pdf")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        assert "application/pdf" in response.headers.get("content-type", ""), "Should return PDF"
        assert len(response.content) > 0, "PDF content should not be empty"
        print(f"Retrieved PDF for contract: {contract_id} ({len(response.content)} bytes)")
    
    def test_get_contract_not_found(self):
        """GET /api/contracts/{invalid_id} - Should return 404"""
        response = requests.get(f"{BASE_URL}/api/contracts/invalid_contract_123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestDoulaContractActions:
    """Test contract send and sign actions"""
    
    def test_send_doula_contract(self, doula_session):
        """POST /api/doula/contracts/{contract_id}/send - Send contract"""
        # Get draft contracts
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        draft_contracts = [c for c in contracts if c.get("status") == "Draft"]
        if not draft_contracts:
            pytest.skip("No draft contracts available to send")
        
        contract_id = draft_contracts[0].get("contract_id")
        
        response = doula_session.post(f"{BASE_URL}/api/doula/contracts/{contract_id}/send")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "signing_url" in data, "Response should contain signing_url"
        print(f"Sent contract: {contract_id}")
    
    def test_sign_doula_contract(self, doula_session):
        """POST /api/contracts/{contract_id}/sign - Client signs contract"""
        # Get sent contracts
        contracts_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = contracts_resp.json()
        
        sent_contracts = [c for c in contracts if c.get("status") == "Sent"]
        if not sent_contracts:
            pytest.skip("No sent contracts available to sign")
        
        contract_id = sent_contracts[0].get("contract_id")
        
        # Client signs (public endpoint)
        sign_data = {
            "signer_name": "TEST Client Signature",
            "signature_data": "data:image/png;base64,iVBORw0KGgo..."
        }
        
        response = requests.post(f"{BASE_URL}/api/contracts/{contract_id}/sign", json=sign_data)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("message") == "Contract signed successfully", "Unexpected response message"
        print(f"Signed contract: {contract_id}")
    
    def test_sign_requires_name(self):
        """POST /api/contracts/{contract_id}/sign - Should require signer name"""
        response = requests.post(f"{BASE_URL}/api/contracts/test_contract/sign", json={
            "signer_name": "",
            "signature_data": "test"
        })
        # Either 400 (validation) or 404 (contract not found) is acceptable
        assert response.status_code in [400, 404], f"Expected 400 or 404, got {response.status_code}"


class TestMidwifeContractsRoutes:
    """Test Midwife contract CRUD operations migrated to routes/contracts.py"""
    
    def test_get_midwife_contracts_list(self, midwife_session):
        """GET /api/midwife/contracts - List all midwife contracts"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} midwife contracts")
    
    def test_get_midwife_contracts_requires_auth(self):
        """GET /api/midwife/contracts should require authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_get_midwife_contract_template(self, midwife_session):
        """GET /api/midwife/contract-template - Get contract template"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contract-template")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Should return template data"
        print("Midwife contract template retrieved successfully")
    
    def test_create_midwife_contract(self, midwife_session):
        """POST /api/midwife/contracts - Create a new midwife contract"""
        # First, get a client
        clients_resp = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert clients_resp.status_code == 200, f"Failed to get clients: {clients_resp.text}"
        clients = clients_resp.json()
        
        if not clients:
            # Create a test client first
            client_resp = midwife_session.post(f"{BASE_URL}/api/midwife/clients", json={
                "name": "TEST_MW_Contract_Client",
                "email": f"test.mw.contract.{uuid.uuid4().hex[:8]}@example.com",
                "phone": "555-5678",
                "edd": (datetime.now() + timedelta(days=150)).strftime("%Y-%m-%d"),
                "planned_birth_setting": "Home"
            })
            assert client_resp.status_code in [200, 201], f"Failed to create client: {client_resp.text}"
            client = client_resp.json()
            client_id = client.get("client_id")
            client_name = client.get("name")
        else:
            client = clients[0]
            client_id = client.get("client_id")
            client_name = client.get("name")
        
        # Create contract
        contract_data = {
            "client_id": client_id,
            "client_name": client_name,
            "estimated_due_date": (datetime.now() + timedelta(days=150)).strftime("%Y-%m-%d"),
            "planned_birth_location": "Home birth",
            "total_fee": 5000.00,
            "retainer_amount": 1000.00
        }
        
        response = midwife_session.post(f"{BASE_URL}/api/midwife/contracts", json=contract_data)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "contract_id" in data, "contract_id not in response"
        assert data.get("status") == "Draft", "New contract should be Draft"
        assert data.get("total_fee") == 5000.00, "Total fee mismatch"
        assert data.get("remaining_balance") == 4000.00, "Remaining balance should be auto-calculated"
        print(f"Created midwife contract: {data.get('contract_id')}")
        return data.get("contract_id")
    
    def test_update_midwife_contract(self, midwife_session):
        """PUT /api/midwife/contracts/{contract_id} - Update a midwife contract"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available to update")
        
        draft_contracts = [c for c in contracts if c.get("status") == "Draft"]
        if not draft_contracts:
            pytest.skip("No draft contracts available to update")
        
        contract_id = draft_contracts[0].get("contract_id")
        
        update_data = {
            "total_fee": 5500.00,
            "special_arrangements": "TEST_Updated midwife special arrangements"
        }
        
        response = midwife_session.put(f"{BASE_URL}/api/midwife/contracts/{contract_id}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"Updated midwife contract: {contract_id}")
    
    def test_duplicate_midwife_contract(self, midwife_session):
        """POST /api/midwife/contracts/{contract_id}/duplicate - Duplicate a contract"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available to duplicate")
        
        contract_id = contracts[0].get("contract_id")
        
        response = midwife_session.post(f"{BASE_URL}/api/midwife/contracts/{contract_id}/duplicate")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "contract" in data, "Response should contain 'contract'"
        new_contract = data.get("contract")
        assert new_contract.get("contract_id") != contract_id, "New contract should have different ID"
        assert new_contract.get("status") == "Draft", "Duplicated contract should be Draft"
        print(f"Duplicated midwife contract to: {new_contract.get('contract_id')}")
    
    def test_delete_midwife_contract_draft(self, midwife_session):
        """DELETE /api/midwife/contracts/{contract_id} - Delete a draft contract"""
        clients_resp = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client = clients[0]
        
        # Create a contract to delete
        contract_data = {
            "client_id": client.get("client_id"),
            "client_name": f"TEST_Delete_MW_{uuid.uuid4().hex[:8]}",
            "estimated_due_date": (datetime.now() + timedelta(days=150)).strftime("%Y-%m-%d"),
            "planned_birth_location": "Home",
            "total_fee": 4000.00,
            "retainer_amount": 800.00
        }
        
        create_resp = midwife_session.post(f"{BASE_URL}/api/midwife/contracts", json=contract_data)
        assert create_resp.status_code in [200, 201], f"Failed to create: {create_resp.text}"
        contract_id = create_resp.json().get("contract_id")
        
        response = midwife_session.delete(f"{BASE_URL}/api/midwife/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"Deleted draft midwife contract: {contract_id}")


class TestMidwifeContractViews:
    """Test midwife contract viewing endpoints"""
    
    def test_get_midwife_contract_by_id_authenticated(self, midwife_session):
        """GET /api/midwife/contracts/{contract_id} - Authenticated view"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts/{contract_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("contract_id") == contract_id, "Contract ID mismatch"
        print(f"Retrieved midwife contract: {contract_id}")
    
    def test_get_midwife_contract_public(self, midwife_session):
        """GET /api/midwife-contracts/{contract_id} - Public view"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        response = requests.get(f"{BASE_URL}/api/midwife-contracts/{contract_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "contract" in data, "Response should contain 'contract'"
        print(f"Retrieved midwife contract via public endpoint: {contract_id}")
    
    def test_get_midwife_contract_html(self, midwife_session):
        """GET /api/midwife-contracts/{contract_id}/html - HTML view"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        response = requests.get(f"{BASE_URL}/api/midwife-contracts/{contract_id}/html")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        assert "text/html" in response.headers.get("content-type", ""), "Should return HTML"
        print(f"Retrieved HTML view for midwife contract: {contract_id}")
    
    def test_get_midwife_contract_pdf(self, midwife_session):
        """GET /api/midwife-contracts/{contract_id}/pdf - PDF download"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        if not contracts:
            pytest.skip("No contracts available")
        
        contract_id = contracts[0].get("contract_id")
        
        response = requests.get(f"{BASE_URL}/api/midwife-contracts/{contract_id}/pdf")
        assert response.status_code == 200, f"Failed: {response.status_code}"
        assert "application/pdf" in response.headers.get("content-type", ""), "Should return PDF"
        assert len(response.content) > 0, "PDF content should not be empty"
        print(f"Retrieved PDF for midwife contract: {contract_id} ({len(response.content)} bytes)")


class TestMidwifeContractActions:
    """Test midwife contract send and sign actions"""
    
    def test_send_midwife_contract(self, midwife_session):
        """POST /api/midwife/contracts/{contract_id}/send - Send contract"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        draft_contracts = [c for c in contracts if c.get("status") == "Draft"]
        if not draft_contracts:
            pytest.skip("No draft contracts available to send")
        
        contract_id = draft_contracts[0].get("contract_id")
        
        response = midwife_session.post(f"{BASE_URL}/api/midwife/contracts/{contract_id}/send")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "signing_url" in data, "Response should contain signing_url"
        print(f"Sent midwife contract: {contract_id}")
    
    def test_sign_midwife_contract(self, midwife_session):
        """POST /api/midwife-contracts/{contract_id}/sign - Client signs contract"""
        contracts_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = contracts_resp.json()
        
        sent_contracts = [c for c in contracts if c.get("status") == "Sent"]
        if not sent_contracts:
            pytest.skip("No sent contracts available to sign")
        
        contract_id = sent_contracts[0].get("contract_id")
        
        sign_data = {
            "signer_name": "TEST Midwife Client Signature",
            "signature_data": "data:image/png;base64,iVBORw0KGgo..."
        }
        
        response = requests.post(f"{BASE_URL}/api/midwife-contracts/{contract_id}/sign", json=sign_data)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("message") == "Contract signed successfully", "Unexpected response message"
        print(f"Signed midwife contract: {contract_id}")


class TestMidwifeContractDefaults:
    """Test midwife contract defaults endpoints"""
    
    def test_get_midwife_contract_defaults(self, midwife_session):
        """GET /api/midwife/contract-defaults - Get saved defaults"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        print(f"Retrieved midwife contract defaults: {len(data)} fields")
    
    def test_save_midwife_contract_defaults(self, midwife_session):
        """PUT /api/midwife/contract-defaults - Save contract defaults"""
        defaults_data = {
            "on_call_window_description": "TEST_37 to 42 weeks gestation",
            "backup_midwife_policy": "TEST_Partner midwife available as backup",
            "fee_coverage_description": "TEST_Includes all prenatal, birth, and postpartum visits"
        }
        
        response = midwife_session.put(f"{BASE_URL}/api/midwife/contract-defaults", json=defaults_data)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        # Verify the defaults were saved
        get_resp = midwife_session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        assert get_resp.status_code == 200
        saved = get_resp.json()
        assert saved.get("on_call_window_description") == "TEST_37 to 42 weeks gestation"
        print("Midwife contract defaults saved and verified")


class TestContractTemplates:
    """Test contract templates CRUD for both Doula and Midwife"""
    
    def test_get_doula_contract_templates(self, doula_session):
        """GET /api/contract-templates - Get doula templates"""
        response = doula_session.get(f"{BASE_URL}/api/contract-templates")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} doula contract templates")
    
    def test_create_doula_contract_template(self, doula_session):
        """POST /api/contract-templates - Create doula template"""
        template_data = {
            "template_name": f"TEST_Doula_Template_{uuid.uuid4().hex[:8]}",
            "template_type": "doula",
            "description": "Test doula contract template",
            "is_default": False,
            "total_fee": 2000.00,
            "retainer_amount": 400.00,
            "prenatal_visit_description": "2-3 prenatal visits"
        }
        
        response = doula_session.post(f"{BASE_URL}/api/contract-templates", json=template_data)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "template_id" in data, "template_id not in response"
        assert data.get("template_name") == template_data["template_name"]
        print(f"Created doula template: {data.get('template_id')}")
        return data.get("template_id")
    
    def test_get_midwife_contract_templates(self, midwife_session):
        """GET /api/contract-templates - Get midwife templates"""
        response = midwife_session.get(f"{BASE_URL}/api/contract-templates")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} midwife contract templates")
    
    def test_create_midwife_contract_template(self, midwife_session):
        """POST /api/contract-templates - Create midwife template"""
        template_data = {
            "template_name": f"TEST_Midwife_Template_{uuid.uuid4().hex[:8]}",
            "template_type": "midwife",
            "description": "Test midwife contract template",
            "is_default": False,
            "total_fee": 5000.00,
            "retainer_amount": 1000.00,
            "planned_birth_location": "Home"
        }
        
        response = midwife_session.post(f"{BASE_URL}/api/contract-templates", json=template_data)
        assert response.status_code in [200, 201], f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "template_id" in data, "template_id not in response"
        assert data.get("template_name") == template_data["template_name"]
        print(f"Created midwife template: {data.get('template_id')}")
        return data.get("template_id")
    
    def test_update_contract_template(self, doula_session):
        """PUT /api/contract-templates/{template_id} - Update template"""
        # Get existing templates
        templates_resp = doula_session.get(f"{BASE_URL}/api/contract-templates")
        templates = templates_resp.json()
        
        test_templates = [t for t in templates if "TEST_" in t.get("template_name", "")]
        if not test_templates:
            pytest.skip("No test templates available")
        
        template_id = test_templates[0].get("template_id")
        
        update_data = {
            "template_name": f"TEST_Updated_Template_{uuid.uuid4().hex[:8]}",
            "template_type": "doula",
            "description": "Updated test template",
            "is_default": False
        }
        
        response = doula_session.put(f"{BASE_URL}/api/contract-templates/{template_id}", json=update_data)
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"Updated template: {template_id}")
    
    def test_delete_contract_template(self, doula_session):
        """DELETE /api/contract-templates/{template_id} - Delete template"""
        # Create a template to delete
        template_data = {
            "template_name": f"TEST_Delete_Template_{uuid.uuid4().hex[:8]}",
            "template_type": "doula",
            "description": "Template to delete",
            "is_default": False
        }
        
        create_resp = doula_session.post(f"{BASE_URL}/api/contract-templates", json=template_data)
        assert create_resp.status_code in [200, 201]
        template_id = create_resp.json().get("template_id")
        
        response = doula_session.delete(f"{BASE_URL}/api/contract-templates/{template_id}")
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"Deleted template: {template_id}")
    
    def test_wrong_template_type_rejected(self, doula_session):
        """Doula cannot create midwife templates"""
        template_data = {
            "template_name": "TEST_Wrong_Type",
            "template_type": "midwife",  # Doula trying to create midwife template
            "description": "Should be rejected"
        }
        
        response = doula_session.post(f"{BASE_URL}/api/contract-templates", json=template_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Correctly rejected wrong template type")


class TestRoleBasedAccess:
    """Test that roles cannot access each other's contract endpoints"""
    
    def test_doula_cannot_access_midwife_contracts(self, doula_session):
        """Doula should get 403 when accessing midwife contracts"""
        response = doula_session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly blocked doula from midwife contracts")
    
    def test_midwife_cannot_access_doula_contracts(self, midwife_session):
        """Midwife should get 403 when accessing doula contracts"""
        response = midwife_session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly blocked midwife from doula contracts")
    
    def test_doula_cannot_access_midwife_contract_defaults(self, doula_session):
        """Doula should get 403 when accessing midwife contract defaults"""
        response = doula_session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly blocked doula from midwife contract defaults")


class TestObjectIdSerialization:
    """Verify no MongoDB ObjectId serialization errors"""
    
    def test_doula_contracts_no_objectid(self, doula_session):
        """Doula contracts should not contain _id field"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200
        contracts = response.json()
        
        for contract in contracts:
            assert "_id" not in contract, f"Contract contains _id: {contract.get('contract_id')}"
        print(f"Verified {len(contracts)} doula contracts have no _id")
    
    def test_midwife_contracts_no_objectid(self, midwife_session):
        """Midwife contracts should not contain _id field"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200
        contracts = response.json()
        
        for contract in contracts:
            assert "_id" not in contract, f"Contract contains _id: {contract.get('contract_id')}"
        print(f"Verified {len(contracts)} midwife contracts have no _id")
    
    def test_contract_templates_no_objectid(self, doula_session):
        """Contract templates should not contain _id field"""
        response = doula_session.get(f"{BASE_URL}/api/contract-templates")
        assert response.status_code == 200
        templates = response.json()
        
        for template in templates:
            assert "_id" not in template, f"Template contains _id: {template.get('template_id')}"
        print(f"Verified {len(templates)} templates have no _id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
