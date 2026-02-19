"""
Comprehensive Backend Tests for Provider (Doula/Midwife) Unified Components
Tests: Login, Dashboard, Clients, Messages, Invoices, Profile APIs for both roles
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife@test.com"
MIDWIFE_PASSWORD = "password123"


class TestDoulaAPIs:
    """Test Doula-specific API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Doula and get session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.user_id = data.get("user_id")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
    
    def test_doula_login(self):
        """Test Doula login returns valid session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "DOULA"
        assert data["email"] == DOULA_EMAIL
        print(f"✓ Doula login successful, user_id: {data.get('user_id')}")
    
    def test_doula_dashboard(self):
        """Test Doula dashboard returns stats"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Check expected stats fields for Doula
        expected_fields = ["active_clients", "upcoming_appointments", "contracts_pending_signature", "pending_invoices"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Doula dashboard: {data}")
    
    def test_doula_profile_get(self):
        """Test Doula profile retrieval"""
        response = requests.get(f"{BASE_URL}/api/doula/profile", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✓ Doula profile retrieved")
    
    def test_doula_profile_update(self):
        """Test Doula profile update with Doula-specific field (accepting_new_clients)"""
        response = requests.put(f"{BASE_URL}/api/doula/profile", headers=self.headers, json={
            "practice_name": "TEST_Doula Practice",
            "accepting_new_clients": True,
            "years_in_practice": 5
        })
        assert response.status_code == 200
        data = response.json()
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/doula/profile", headers=self.headers)
        profile = get_response.json()
        assert profile.get("practice_name") == "TEST_Doula Practice"
        print(f"✓ Doula profile updated and verified")
    
    def test_doula_clients_list(self):
        """Test Doula clients list"""
        response = requests.get(f"{BASE_URL}/api/doula/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula clients list retrieved, count: {len(data)}")
    
    def test_doula_invoices_list(self):
        """Test Doula invoices list"""
        response = requests.get(f"{BASE_URL}/api/doula/invoices", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula invoices list retrieved, count: {len(data)}")
    
    def test_doula_contracts_list(self):
        """Test Doula contracts list"""
        response = requests.get(f"{BASE_URL}/api/doula/contracts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula contracts list retrieved, count: {len(data)}")
    
    def test_provider_share_requests(self):
        """Test provider share requests endpoint"""
        response = requests.get(f"{BASE_URL}/api/provider/share-requests", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ Provider share requests retrieved")
    
    def test_messages_conversations(self):
        """Test messages conversations endpoint"""
        response = requests.get(f"{BASE_URL}/api/messages/conversations", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        print(f"✓ Messages conversations retrieved")
    
    def test_payment_instructions_list(self):
        """Test payment instructions templates list"""
        response = requests.get(f"{BASE_URL}/api/payment-instructions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payment instructions retrieved")
    
    def test_subscription_status(self):
        """Test subscription status endpoint"""
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "subscription_status" in data or "has_pro_access" in data
        print(f"✓ Subscription status retrieved")


class TestMidwifeAPIs:
    """Test Midwife-specific API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Midwife and get session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.user_id = data.get("user_id")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
    
    def test_midwife_login(self):
        """Test Midwife login returns valid session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        assert data["email"] == MIDWIFE_EMAIL
        print(f"✓ Midwife login successful, user_id: {data.get('user_id')}")
    
    def test_midwife_dashboard(self):
        """Test Midwife dashboard returns stats"""
        response = requests.get(f"{BASE_URL}/api/midwife/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Check expected stats fields for Midwife
        expected_fields = ["prenatal_clients", "upcoming_appointments", "visits_this_month", "births_this_month"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Midwife dashboard: {data}")
    
    def test_midwife_profile_get(self):
        """Test Midwife profile retrieval"""
        response = requests.get(f"{BASE_URL}/api/midwife/profile", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✓ Midwife profile retrieved")
    
    def test_midwife_profile_update_with_credentials(self):
        """Test Midwife profile update with Midwife-specific field (credentials)"""
        response = requests.put(f"{BASE_URL}/api/midwife/profile", headers=self.headers, json={
            "practice_name": "TEST_Midwife Practice",
            "credentials": "CPM",
            "accepting_clients": True,
            "years_in_practice": 10
        })
        assert response.status_code == 200
        # Verify the update
        get_response = requests.get(f"{BASE_URL}/api/midwife/profile", headers=self.headers)
        profile = get_response.json()
        assert profile.get("practice_name") == "TEST_Midwife Practice"
        assert profile.get("credentials") == "CPM"
        print(f"✓ Midwife profile updated with credentials field")
    
    def test_midwife_clients_list(self):
        """Test Midwife clients list"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Midwife clients list retrieved, count: {len(data)}")
        return data
    
    def test_midwife_invoices_list(self):
        """Test Midwife invoices list"""
        response = requests.get(f"{BASE_URL}/api/midwife/invoices", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Midwife invoices list retrieved, count: {len(data)}")
    
    def test_midwife_contracts_list(self):
        """Test Midwife contracts list"""
        response = requests.get(f"{BASE_URL}/api/midwife/contracts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Midwife contracts list retrieved, count: {len(data)}")
    
    def test_midwife_client_prenatal_visits(self):
        """Test Midwife prenatal visits for a client (if clients exist)"""
        # First get clients list
        clients_response = requests.get(f"{BASE_URL}/api/midwife/clients", headers=self.headers)
        clients = clients_response.json()
        
        if clients and len(clients) > 0:
            client_id = clients[0].get("client_id")
            # Get prenatal visits
            response = requests.get(f"{BASE_URL}/api/midwife/clients/{client_id}/prenatal-visits", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Midwife prenatal visits for client {client_id}: {len(data)} visits")
        else:
            print("⚠ No clients to test prenatal visits endpoint")
    
    def test_provider_share_requests(self):
        """Test provider share requests endpoint for Midwife"""
        response = requests.get(f"{BASE_URL}/api/provider/share-requests", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ Provider share requests for Midwife retrieved")
    
    def test_messages_conversations_midwife(self):
        """Test messages conversations endpoint for Midwife"""
        response = requests.get(f"{BASE_URL}/api/messages/conversations", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        print(f"✓ Messages conversations for Midwife retrieved")


class TestSharedProviderAPIs:
    """Test shared APIs that work for both Doula and Midwife"""
    
    @pytest.fixture(autouse=True)
    def setup_doula(self):
        """Login as Doula for shared tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        data = response.json()
        self.doula_token = data.get("session_token")
        self.doula_headers = {"Authorization": f"Bearer {self.doula_token}"}
        yield
    
    def test_auth_me_doula(self):
        """Test /auth/me returns correct user data for Doula"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.doula_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "DOULA"
        assert data["email"] == DOULA_EMAIL
        print(f"✓ Auth/me for Doula successful")
    
    def test_auth_me_midwife(self):
        """Test /auth/me returns correct user data for Midwife"""
        # Login as Midwife
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        token = login_response.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "MIDWIFE"
        assert data["email"] == MIDWIFE_EMAIL
        print(f"✓ Auth/me for Midwife successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
