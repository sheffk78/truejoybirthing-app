"""
Midwife Client Detail Page - Backend API Tests
Iteration 126 - Testing the refactored client-detail.tsx page APIs

Tests cover:
1. Midwife Login
2. Midwife Dashboard endpoint
3. Midwife Clients List endpoint
4. Midwife Client Detail endpoint (with related data)
5. Prenatal Visits CRUD operations
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://bug-fixes-p0.preview.emergentagent.com")

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestMidwifeLogin:
    """Midwife authentication tests"""
    
    def test_midwife_login_success(self):
        """Test midwife can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Missing session_token in response"
        assert data["role"] == "MIDWIFE", "Role should be MIDWIFE"
        assert data["email"] == MIDWIFE_EMAIL
        assert "user_id" in data
        print(f"Login successful - user_id: {data['user_id']}")
    
    def test_midwife_login_invalid_credentials(self):
        """Test login fails with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401


class TestMidwifeDashboard:
    """Midwife dashboard API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_dashboard(self):
        """Test GET /api/midwife/dashboard returns correct stats"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields exist
        expected_fields = [
            "prenatal_clients", "active_clients", "total_clients",
            "contracts_pending_signature", "pending_invoices",
            "visits_this_month", "births_this_month", "upcoming_appointments"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify numeric values
        assert isinstance(data["prenatal_clients"], int)
        assert isinstance(data["active_clients"], int)
        assert data["total_clients"] >= 0
        print(f"Dashboard: {data['prenatal_clients']} prenatal, {data['active_clients']} active clients")


class TestMidwifeClients:
    """Midwife clients API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.test_client_id = None
    
    def test_get_clients_list(self):
        """Test GET /api/midwife/clients returns list"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} clients")
    
    def test_create_client(self):
        """Test POST /api/midwife/clients creates a new client"""
        client_data = {
            "name": "TEST_Pytest_Client",
            "email": "test.pytest@example.com",
            "phone": "555-999-8888",
            "edd": "2026-07-15",
            "planned_birth_setting": "Birth Center"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/midwife/clients",
            headers=self.headers,
            json=client_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "client_id" in data
        assert data["name"] == client_data["name"]
        assert data["email"] == client_data["email"]
        assert data["status"] == "Prenatal"
        self.test_client_id = data["client_id"]
        print(f"Created client: {data['client_id']}")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{data['client_id']}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == client_data["name"]
    
    def test_get_client_detail(self):
        """Test GET /api/midwife/clients/{client_id} returns client with related data"""
        # First create a test client
        client_data = {
            "name": "TEST_Detail_Client",
            "email": "test.detail@example.com",
            "edd": "2026-08-01"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/midwife/clients",
            headers=self.headers,
            json=client_data
        )
        assert create_response.status_code == 200
        client_id = create_response.json()["client_id"]
        
        # Get client detail
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{client_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["client_id"] == client_id
        assert data["name"] == client_data["name"]
        # Verify related data arrays exist
        assert "contracts" in data
        assert "invoices" in data
        assert "visits" in data
        assert "notes" in data
        print(f"Client detail retrieved with related data")
    
    def test_get_nonexistent_client(self):
        """Test GET with invalid client_id returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/nonexistent_client_xyz",
            headers=self.headers
        )
        assert response.status_code == 404


class TestPrenatalVisits:
    """Prenatal visits CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login, get token, and create test client"""
        # Login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test client
        client_data = {
            "name": f"TEST_PV_Client_{datetime.now().strftime('%H%M%S')}",
            "email": "test.pv@example.com",
            "edd": "2026-06-15"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/midwife/clients",
            headers=self.headers,
            json=client_data
        )
        assert create_response.status_code == 200
        self.client_id = create_response.json()["client_id"]
        self.visit_ids = []
    
    def test_get_prenatal_visits_empty(self):
        """Test GET /api/midwife/clients/{client_id}/prenatal-visits returns empty list for new client"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"New client has {len(data)} prenatal visits")
    
    def test_create_prenatal_visit(self):
        """Test POST /api/midwife/clients/{client_id}/prenatal-visits creates visit"""
        visit_data = {
            "visit_date": "2026-02-20",
            "blood_pressure": "118/76",
            "fetal_heart_rate": 142,
            "fundal_height": 26.5,
            "weight": 145.0,
            "weight_unit": "lbs",
            "eating_score": 4,
            "eating_note": "Eating well",
            "water_score": 3,
            "emotional_score": 5,
            "general_notes": "All vitals normal"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits",
            headers=self.headers,
            json=visit_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "prenatal_visit_id" in data
        assert data["blood_pressure"] == visit_data["blood_pressure"]
        assert data["fetal_heart_rate"] == visit_data["fetal_heart_rate"]
        assert data["fundal_height"] == visit_data["fundal_height"]
        assert "summary" in data  # Auto-generated summary
        self.visit_ids.append(data["prenatal_visit_id"])
        print(f"Created prenatal visit: {data['prenatal_visit_id']}")
        print(f"Summary: {data['summary']}")
        
        # Verify with GET
        get_response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits",
            headers=self.headers
        )
        assert get_response.status_code == 200
        visits = get_response.json()
        assert len(visits) >= 1
    
    def test_update_prenatal_visit(self):
        """Test PUT /api/midwife/clients/{client_id}/prenatal-visits/{visit_id}"""
        # Create visit first
        visit_data = {
            "visit_date": "2026-02-19",
            "blood_pressure": "120/80",
            "fetal_heart_rate": 140
        }
        create_response = requests.post(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits",
            headers=self.headers,
            json=visit_data
        )
        assert create_response.status_code == 200
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Update visit
        update_data = {
            "blood_pressure": "116/74",
            "fetal_heart_rate": 145,
            "general_notes": "Updated notes after recheck"
        }
        update_response = requests.put(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits/{visit_id}",
            headers=self.headers,
            json=update_data
        )
        assert update_response.status_code == 200
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits/{visit_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        updated = get_response.json()
        assert updated["blood_pressure"] == update_data["blood_pressure"]
        assert updated["fetal_heart_rate"] == update_data["fetal_heart_rate"]
        print("Prenatal visit updated successfully")
    
    def test_delete_prenatal_visit(self):
        """Test DELETE /api/midwife/clients/{client_id}/prenatal-visits/{visit_id}"""
        # Create visit first
        visit_data = {
            "visit_date": "2026-02-18",
            "blood_pressure": "110/70"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits",
            headers=self.headers,
            json=visit_data
        )
        assert create_response.status_code == 200
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Delete visit
        delete_response = requests.delete(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits/{visit_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{self.client_id}/prenatal-visits/{visit_id}",
            headers=self.headers
        )
        assert get_response.status_code == 404
        print("Prenatal visit deleted successfully")
    
    def test_prenatal_visit_invalid_client(self):
        """Test prenatal visit with non-existent client returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/nonexistent_client/prenatal-visits",
            headers=self.headers
        )
        assert response.status_code == 404


class TestProviderUnifiedClients:
    """Test unified provider/clients endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        self.token = response.json()["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_provider_clients_list(self):
        """Test GET /api/provider/clients returns clients for midwife"""
        response = requests.get(
            f"{BASE_URL}/api/provider/clients",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Provider unified clients endpoint: {len(data)} clients")
    
    def test_provider_clients_include_inactive(self):
        """Test GET /api/provider/clients?include_inactive=true"""
        response = requests.get(
            f"{BASE_URL}/api/provider/clients?include_inactive=true",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Including inactive: {len(data)} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
