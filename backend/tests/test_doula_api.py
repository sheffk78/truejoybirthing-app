"""
Test suite for DOULA API endpoints
Testing: Dashboard, Clients, Contracts, Invoices
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-birth-dev.preview.emergentagent.com')

# Test credentials
MOM_EMAIL = "sharemom2_1771213474@test.com"
MOM_PASSWORD = "password123"
DOULA_EMAIL = "doula2_1771213474@test.com"
DOULA_PASSWORD = "password123"


class TestMomLogin:
    """Test MOM user login flow"""
    
    def test_mom_login_success(self):
        """Test MOM can login successfully"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        
        assert response.status_code == 200, f"MOM login failed: {response.text}"
        data = response.json()
        # Login returns user data directly (not nested in "user" key)
        assert "email" in data
        assert data["email"] == MOM_EMAIL
        assert data["role"] == "MOM"
        print(f"MOM login successful: {data['full_name']}")


class TestDoulaLogin:
    """Test DOULA user login flow"""
    
    def test_doula_login_success(self):
        """Test DOULA can login successfully"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        
        assert response.status_code == 200, f"DOULA login failed: {response.text}"
        data = response.json()
        # Login returns user data directly (not nested in "user" key)
        assert "email" in data
        assert data["email"] == DOULA_EMAIL
        assert data["role"] == "DOULA"
        print(f"DOULA login successful: {data['full_name']}")


class TestDoulaDashboard:
    """Test DOULA dashboard API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as DOULA before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert login_response.status_code == 200, f"DOULA login failed: {login_response.text}"
        
        # Get cookies for auth
        self.cookies = login_response.cookies
        self.session.cookies.update(self.cookies)
    
    def test_get_dashboard_returns_stats(self):
        """Test GET /api/doula/dashboard returns expected stats"""
        response = self.session.get(f"{BASE_URL}/api/doula/dashboard")
        
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        
        # Verify all expected fields exist
        assert "total_clients" in data
        assert "active_clients" in data
        assert "pending_invoices" in data
        assert "contracts_pending_signature" in data
        
        # Verify types
        assert isinstance(data["total_clients"], int)
        assert isinstance(data["active_clients"], int)
        assert isinstance(data["pending_invoices"], int)
        assert isinstance(data["contracts_pending_signature"], int)
        
        print(f"Dashboard stats: {data}")


class TestDoulaClients:
    """Test DOULA clients CRUD API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as DOULA before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert login_response.status_code == 200
        self.session.cookies.update(login_response.cookies)
    
    def test_get_clients_returns_array(self):
        """Test GET /api/doula/clients returns array"""
        response = self.session.get(f"{BASE_URL}/api/doula/clients")
        
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"Clients count: {len(data)}")
    
    def test_create_client_success(self):
        """Test POST /api/doula/clients creates a new client"""
        unique_id = uuid.uuid4().hex[:8]
        client_data = {
            "name": f"TEST_Client_{unique_id}",
            "email": f"test_client_{unique_id}@test.com",
            "phone": "555-123-4567",
            "edd": "2026-06-15",
            "planned_birth_setting": "Hospital"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/doula/clients",
            json=client_data
        )
        
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        
        # Verify returned data
        assert "client_id" in data
        assert data["name"] == client_data["name"]
        assert data["email"] == client_data["email"]
        assert data["status"] == "Lead"
        
        # Verify persistence - GET the client back
        get_response = self.session.get(f"{BASE_URL}/api/doula/clients/{data['client_id']}")
        assert get_response.status_code == 200, f"Get client failed: {get_response.text}"
        
        fetched_data = get_response.json()
        assert fetched_data["client"]["name"] == client_data["name"]
        
        print(f"Created client: {data['client_id']}")


class TestDoulaContracts:
    """Test DOULA contracts CRUD API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as DOULA and create a test client"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert login_response.status_code == 200
        self.session.cookies.update(login_response.cookies)
        
        # Create a test client for contracts
        unique_id = uuid.uuid4().hex[:8]
        client_response = self.session.post(
            f"{BASE_URL}/api/doula/clients",
            json={
                "name": f"TEST_Contract_Client_{unique_id}",
                "email": f"test_contract_{unique_id}@test.com"
            }
        )
        if client_response.status_code == 200:
            self.test_client_id = client_response.json()["client_id"]
        else:
            # Get existing clients if creation fails
            clients = self.session.get(f"{BASE_URL}/api/doula/clients").json()
            self.test_client_id = clients[0]["client_id"] if clients else None
    
    def test_get_contracts_returns_array(self):
        """Test GET /api/doula/contracts returns array"""
        response = self.session.get(f"{BASE_URL}/api/doula/contracts")
        
        assert response.status_code == 200, f"Get contracts failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"Contracts count: {len(data)}")
    
    def test_create_contract_success(self):
        """Test POST /api/doula/contracts creates a new contract"""
        if not self.test_client_id:
            pytest.skip("No test client available")
        
        unique_id = uuid.uuid4().hex[:8]
        contract_data = {
            "client_id": self.test_client_id,
            "contract_title": f"TEST_Birth Doula Services_{unique_id}",
            "services_description": "Full birth doula support",
            "total_fee": 1500.00,
            "payment_schedule_description": "50% deposit, 50% at 36 weeks",
            "cancellation_policy": "Full refund if cancelled before 28 weeks"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/doula/contracts",
            json=contract_data
        )
        
        assert response.status_code == 200, f"Create contract failed: {response.text}"
        data = response.json()
        
        # Verify returned data
        assert "contract_id" in data
        assert data["contract_title"] == contract_data["contract_title"]
        assert data["total_fee"] == contract_data["total_fee"]
        assert data["status"] == "Draft"
        
        # Verify persistence
        contracts = self.session.get(f"{BASE_URL}/api/doula/contracts").json()
        contract_ids = [c["contract_id"] for c in contracts]
        assert data["contract_id"] in contract_ids, "Contract not persisted"
        
        print(f"Created contract: {data['contract_id']}")


class TestDoulaInvoices:
    """Test DOULA invoices CRUD API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as DOULA and create a test client"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert login_response.status_code == 200
        self.session.cookies.update(login_response.cookies)
        
        # Create a test client for invoices
        unique_id = uuid.uuid4().hex[:8]
        client_response = self.session.post(
            f"{BASE_URL}/api/doula/clients",
            json={
                "name": f"TEST_Invoice_Client_{unique_id}",
                "email": f"test_invoice_{unique_id}@test.com"
            }
        )
        if client_response.status_code == 200:
            self.test_client_id = client_response.json()["client_id"]
        else:
            clients = self.session.get(f"{BASE_URL}/api/doula/clients").json()
            self.test_client_id = clients[0]["client_id"] if clients else None
    
    def test_get_invoices_returns_array(self):
        """Test GET /api/doula/invoices returns array"""
        response = self.session.get(f"{BASE_URL}/api/doula/invoices")
        
        assert response.status_code == 200, f"Get invoices failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), f"Expected array, got {type(data)}"
        print(f"Invoices count: {len(data)}")
    
    def test_create_invoice_success(self):
        """Test POST /api/doula/invoices creates a new invoice"""
        if not self.test_client_id:
            pytest.skip("No test client available")
        
        unique_id = uuid.uuid4().hex[:8]
        invoice_data = {
            "client_id": self.test_client_id,
            "invoice_title": f"TEST_Deposit Payment_{unique_id}",
            "amount": 750.00,
            "due_date": "2026-02-15",
            "notes": "First payment for doula services"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/doula/invoices",
            json=invoice_data
        )
        
        assert response.status_code == 200, f"Create invoice failed: {response.text}"
        data = response.json()
        
        # Verify returned data
        assert "invoice_id" in data
        assert data["invoice_title"] == invoice_data["invoice_title"]
        assert data["amount"] == invoice_data["amount"]
        assert data["status"] == "Draft"
        
        # Verify persistence
        invoices = self.session.get(f"{BASE_URL}/api/doula/invoices").json()
        invoice_ids = [i["invoice_id"] for i in invoices]
        assert data["invoice_id"] in invoice_ids, "Invoice not persisted"
        
        print(f"Created invoice: {data['invoice_id']}")


class TestMomScreenAPIs:
    """Test APIs used by MOM screens"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as MOM before each test"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert login_response.status_code == 200, f"MOM login failed: {login_response.text}"
        self.session.cookies.update(login_response.cookies)
    
    def test_timeline_api(self):
        """Test GET /api/timeline for MOM Timeline screen"""
        response = self.session.get(f"{BASE_URL}/api/timeline")
        
        assert response.status_code == 200, f"Timeline API failed: {response.text}"
        data = response.json()
        
        # Verify expected fields
        assert "milestones" in data
        assert "custom_events" in data
        assert isinstance(data["milestones"], list)
        
        print(f"Timeline: current_week={data.get('current_week')}, milestones={len(data['milestones'])}")
    
    def test_wellness_entries_api(self):
        """Test GET /api/wellness/entries for MOM Wellness screen"""
        response = self.session.get(f"{BASE_URL}/api/wellness/entries")
        
        assert response.status_code == 200, f"Wellness entries API failed: {response.text}"
        data = response.json()
        
        assert "entries" in data
        assert isinstance(data["entries"], list)
        
        print(f"Wellness entries count: {len(data['entries'])}")
    
    def test_postpartum_plan_api(self):
        """Test GET /api/postpartum/plan for MOM Postpartum screen"""
        response = self.session.get(f"{BASE_URL}/api/postpartum/plan")
        
        assert response.status_code == 200, f"Postpartum plan API failed: {response.text}"
        data = response.json()
        
        # Just check it returns a valid response (might be empty plan)
        assert isinstance(data, dict)
        
        print(f"Postpartum plan loaded: has_support_people={bool(data.get('support_people'))}")
    
    def test_mom_team_api(self):
        """Test GET /api/mom/team for MOM My Team screen"""
        response = self.session.get(f"{BASE_URL}/api/mom/team")
        
        assert response.status_code == 200, f"Mom team API failed: {response.text}"
        data = response.json()
        
        # Team API returns object with doula and midwife keys
        assert isinstance(data, dict)
        assert "doula" in data or "midwife" in data
        
        print(f"Team data: doula={bool(data.get('doula'))}, midwife={bool(data.get('midwife'))}")
    
    def test_birth_plan_api(self):
        """Test GET /api/birth-plan for MOM home screen"""
        response = self.session.get(f"{BASE_URL}/api/birth-plan")
        
        assert response.status_code == 200, f"Birth plan API failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "sections" in data
        assert "completion_percentage" in data
        
        print(f"Birth plan: {data['completion_percentage']}% complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
