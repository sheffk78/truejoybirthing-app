"""
Test file for Midwife Contract Defaults, Contract Creation, and Invoice Creation
Tests the bug fixes for JSON.stringify errors and new contract-defaults endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://true-joy-preview-1.preview.emergentagent.com')

class TestMidwifeAuth:
    """Test midwife authentication setup"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login or register midwife user and return session token"""
        # Try login first
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "midwife@test.com",
            "password": "password123"
        })
        
        if login_resp.status_code == 200:
            token = login_resp.json().get("session_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        
        # Register if login fails
        register_resp = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": "midwife@test.com",
            "password": "password123",
            "full_name": "Test Midwife",
            "role": "MIDWIFE"
        })
        
        if register_resp.status_code == 200:
            token = register_resp.json().get("session_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        
        pytest.skip("Could not authenticate midwife user")
    
    def test_midwife_login(self, session, auth_token):
        """Verify midwife is authenticated"""
        assert auth_token is not None
        print(f"PASSED: Midwife authenticated with token")


class TestMidwifeContractDefaults:
    """Test the new /api/midwife/contract-defaults GET and PUT endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login midwife user"""
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "midwife@test.com",
            "password": "password123"
        })
        
        if login_resp.status_code != 200:
            # Try register
            register_resp = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": "midwife@test.com",
                "password": "password123",
                "full_name": "Test Midwife",
                "role": "MIDWIFE"
            })
            if register_resp.status_code == 200:
                token = register_resp.json().get("session_token")
                session.headers.update({"Authorization": f"Bearer {token}"})
                return token
            pytest.skip("Could not authenticate midwife user")
        
        token = login_resp.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return token
    
    def test_get_contract_defaults_empty_or_data(self, session, auth_token):
        """GET /api/midwife/contract-defaults returns empty object or saved defaults"""
        response = session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be a dictionary"
        print(f"PASSED: GET contract-defaults returns {len(data)} fields (empty or saved)")
    
    def test_get_contract_defaults_without_auth(self, session):
        """GET /api/midwife/contract-defaults without auth returns 401"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASSED: GET contract-defaults without auth returns 401")
    
    def test_put_contract_defaults_saves_successfully(self, session, auth_token):
        """PUT /api/midwife/contract-defaults saves defaults successfully"""
        defaults_data = {
            "total_fee": "5000",
            "retainer_amount": "1500",
            "remaining_balance_due_description": "36 weeks gestation",
            "fee_coverage_description": "Test fee coverage",
            "refund_policy_description": "Test refund policy",
            "planned_birth_location": "Home",
            "scope_description": "Test scope description",
            "transfer_indications_description": "Test transfer indications",
            "client_refusal_of_transfer_note": "Test refusal note",
            "midwife_withdrawal_reasons": "Test withdrawal reasons",
            "no_refund_scenarios_description": "Test no-refund scenarios",
            "on_call_window_description": "37 to 42 weeks",
            "backup_midwife_policy": "Test backup policy",
            "contact_instructions_routine": "Test routine contact",
            "contact_instructions_urgent": "Test urgent contact",
            "emergency_instructions": "Test emergency instructions",
            "special_arrangements": "Test special arrangements"
        }
        
        response = session.put(
            f"{BASE_URL}/api/midwife/contract-defaults",
            json=defaults_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message field"
        assert data["message"] == "Contract defaults saved", f"Unexpected message: {data['message']}"
        print("PASSED: PUT contract-defaults saves successfully")
    
    def test_get_contract_defaults_returns_saved_data(self, session, auth_token):
        """GET /api/midwife/contract-defaults returns previously saved data"""
        response = session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify some saved fields
        assert data.get("total_fee") == "5000", f"Expected total_fee='5000', got {data.get('total_fee')}"
        assert data.get("on_call_window_description") == "37 to 42 weeks"
        assert data.get("scope_description") == "Test scope description"
        print(f"PASSED: GET contract-defaults returns saved data with {len(data)} fields")
    
    def test_put_contract_defaults_without_auth(self, session):
        """PUT /api/midwife/contract-defaults without auth returns 401"""
        no_auth_session = requests.Session()
        response = no_auth_session.put(
            f"{BASE_URL}/api/midwife/contract-defaults",
            json={"total_fee": "5000"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASSED: PUT contract-defaults without auth returns 401")


class TestMidwifeContractCreation:
    """Test midwife contract creation API - verify no 422 errors from JSON.stringify bug"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login midwife user"""
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "midwife@test.com",
            "password": "password123"
        })
        
        if login_resp.status_code != 200:
            register_resp = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": "midwife@test.com",
                "password": "password123",
                "full_name": "Test Midwife",
                "role": "MIDWIFE"
            })
            if register_resp.status_code == 200:
                token = register_resp.json().get("session_token")
                session.headers.update({"Authorization": f"Bearer {token}"})
                return token
            pytest.skip("Could not authenticate midwife user")
        
        token = login_resp.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return token
    
    @pytest.fixture(scope="class")
    def test_client(self, session, auth_token):
        """Create a test client for contract creation"""
        # Check if test client already exists
        clients_resp = session.get(f"{BASE_URL}/api/midwife/clients")
        if clients_resp.status_code == 200:
            clients = clients_resp.json()
            for client in clients:
                if client.get("name") == "TEST_Contract_Client":
                    return client
        
        # Create new test client
        client_data = {
            "name": "TEST_Contract_Client",
            "email": "test_contract_client@test.com",
            "phone": "555-1234",
            "edd": "2025-12-15",
            "planned_birth_setting": "Home"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/clients", json=client_data)
        if response.status_code in [200, 201]:
            return response.json()
        
        pytest.skip(f"Could not create test client: {response.text}")
    
    def test_create_contract_with_valid_data(self, session, auth_token, test_client):
        """POST /api/midwife/contracts creates contract without 422 errors"""
        contract_data = {
            "client_id": test_client["client_id"],
            "client_name": "TEST_Contract_Client",
            "partner_name": "Test Partner",
            "estimated_due_date": "2025-12-15",
            "planned_birth_location": "Home at Test Address",
            "scope_description": "Full midwifery care including prenatal visits, birth attendance, and postpartum care",
            "total_fee": 5000.00,
            "retainer_amount": 1500.00,
            "remaining_balance_due_description": "36 weeks' gestation",
            "fee_coverage_description": "Includes all standard midwifery care",
            "refund_policy_description": "Partial refund available before 36 weeks",
            "transfer_indications_description": "Transfer recommended for complications",
            "midwife_withdrawal_reasons": "Standard withdrawal reasons",
            "no_refund_scenarios_description": "No refund after 36 weeks",
            "on_call_window_description": "37 to 42 weeks",
            "backup_midwife_policy": "Backup midwife available",
            "contact_instructions_routine": "Call during office hours",
            "contact_instructions_urgent": "Text for urgent matters",
            "emergency_instructions": "Call 911 for emergencies",
            "special_arrangements": "None at this time"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/contracts", json=contract_data)
        
        # Key assertion: No 422 error (JSON.stringify bug would cause this)
        assert response.status_code != 422, f"Got 422 error (possible JSON.stringify bug): {response.text}"
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        contract = response.json()
        assert "contract_id" in contract, "Contract should have contract_id"
        assert contract["client_name"] == "TEST_Contract_Client"
        assert contract["total_fee"] == 5000.00
        assert contract["remaining_balance"] == 3500.00  # 5000 - 1500
        assert contract["status"] == "Draft"
        
        print(f"PASSED: Contract created successfully with ID {contract['contract_id']}")
        return contract
    
    def test_create_contract_with_minimal_data(self, session, auth_token, test_client):
        """POST /api/midwife/contracts with only required fields"""
        contract_data = {
            "client_id": test_client["client_id"],
            "client_name": "TEST_Contract_Client",
            "estimated_due_date": "2025-12-20",
            "planned_birth_location": "Birth Center",
            "total_fee": 4500.00,
            "retainer_amount": 1000.00
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/contracts", json=contract_data)
        
        assert response.status_code != 422, f"Got 422 error with minimal data: {response.text}"
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        contract = response.json()
        assert contract["remaining_balance"] == 3500.00  # Auto-calculated
        print("PASSED: Contract created with minimal data")
    
    def test_get_contracts_list(self, session, auth_token):
        """GET /api/midwife/contracts returns contracts list"""
        response = session.get(f"{BASE_URL}/api/midwife/contracts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        contracts = response.json()
        assert isinstance(contracts, list), "Response should be a list"
        print(f"PASSED: GET contracts returns {len(contracts)} contracts")


class TestMidwifeInvoiceCreation:
    """Test midwife invoice creation API - verify no 422 errors from JSON.stringify bug"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login midwife user"""
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "midwife@test.com",
            "password": "password123"
        })
        
        if login_resp.status_code != 200:
            register_resp = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": "midwife@test.com",
                "password": "password123",
                "full_name": "Test Midwife",
                "role": "MIDWIFE"
            })
            if register_resp.status_code == 200:
                token = register_resp.json().get("session_token")
                session.headers.update({"Authorization": f"Bearer {token}"})
                return token
            pytest.skip("Could not authenticate midwife user")
        
        token = login_resp.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return token
    
    @pytest.fixture(scope="class")
    def test_client(self, session, auth_token):
        """Get or create test client for invoice creation"""
        clients_resp = session.get(f"{BASE_URL}/api/midwife/clients")
        if clients_resp.status_code == 200:
            clients = clients_resp.json()
            if len(clients) > 0:
                return clients[0]
        
        # Create new test client
        client_data = {
            "name": "TEST_Invoice_Client",
            "email": "test_invoice_client@test.com",
            "edd": "2025-12-15",
            "planned_birth_setting": "Home"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/clients", json=client_data)
        if response.status_code in [200, 201]:
            return response.json()
        
        pytest.skip(f"Could not create test client: {response.text}")
    
    def test_create_invoice_with_valid_data(self, session, auth_token, test_client):
        """POST /api/midwife/invoices creates invoice without 422 errors"""
        invoice_data = {
            "client_id": test_client["client_id"],
            "description": "Midwifery Services - Retainer",
            "amount": 1500.00,
            "issue_date": "2025-01-10",
            "due_date": "2025-01-25",
            "payment_instructions_text": "Please pay via Venmo @TestMidwife",
            "notes_for_client": "Thank you for choosing our services"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/invoices", json=invoice_data)
        
        # Key assertion: No 422 error (JSON.stringify bug would cause this)
        assert response.status_code != 422, f"Got 422 error (possible JSON.stringify bug): {response.text}"
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        invoice = response.json()
        assert "invoice_id" in invoice, "Invoice should have invoice_id"
        assert "invoice_number" in invoice, "Invoice should have invoice_number"
        assert invoice["description"] == "Midwifery Services - Retainer"
        assert invoice["amount"] == 1500.00
        assert invoice["status"] == "Draft"
        
        print(f"PASSED: Invoice created with ID {invoice['invoice_id']}, number {invoice['invoice_number']}")
    
    def test_create_invoice_with_minimal_data(self, session, auth_token, test_client):
        """POST /api/midwife/invoices with only required fields"""
        invoice_data = {
            "client_id": test_client["client_id"],
            "description": "Test Invoice - Minimal",
            "amount": 500.00
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/invoices", json=invoice_data)
        
        assert response.status_code != 422, f"Got 422 error with minimal data: {response.text}"
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        invoice = response.json()
        assert invoice["issue_date"] is not None, "Issue date should be auto-set"
        print("PASSED: Invoice created with minimal data")
    
    def test_get_invoices_list(self, session, auth_token):
        """GET /api/midwife/invoices returns invoices list"""
        response = session.get(f"{BASE_URL}/api/midwife/invoices")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        invoices = response.json()
        assert isinstance(invoices, list), "Response should be a list"
        print(f"PASSED: GET invoices returns {len(invoices)} invoices")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Login midwife user"""
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "midwife@test.com",
            "password": "password123"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("session_token")
            session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        pytest.skip("Could not authenticate")
    
    def test_cleanup_draft_contracts(self, session, auth_token):
        """Clean up test contracts (draft only)"""
        response = session.get(f"{BASE_URL}/api/midwife/contracts")
        if response.status_code == 200:
            contracts = response.json()
            deleted = 0
            for contract in contracts:
                if contract.get("status") == "Draft" and "TEST_" in contract.get("client_name", ""):
                    del_resp = session.delete(f"{BASE_URL}/api/midwife/contracts/{contract['contract_id']}")
                    if del_resp.status_code in [200, 204]:
                        deleted += 1
            print(f"PASSED: Cleaned up {deleted} test contracts")
    
    def test_cleanup_draft_invoices(self, session, auth_token):
        """Clean up test invoices (draft only)"""
        response = session.get(f"{BASE_URL}/api/midwife/invoices")
        if response.status_code == 200:
            invoices = response.json()
            deleted = 0
            for invoice in invoices:
                if invoice.get("status") == "Draft" and "Test" in invoice.get("description", ""):
                    del_resp = session.delete(f"{BASE_URL}/api/midwife/invoices/{invoice['invoice_id']}")
                    if del_resp.status_code in [200, 204]:
                        deleted += 1
            print(f"PASSED: Cleaned up {deleted} test invoices")
