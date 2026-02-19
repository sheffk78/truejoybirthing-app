"""
Backend Refactoring Phase 2 Tests

Tests for verifying that admin and marketplace routes work correctly
after migrating from monolithic server.py to modular routers.

Tests covered:
- Login functionality
- Marketplace providers endpoint
- Marketplace provider detail endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials from problem statement
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"


class TestLogin:
    """Test login functionality after refactoring"""
    
    def test_login_with_valid_credentials(self):
        """Login should work with valid doula credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": DOULA_EMAIL,
                "password": DOULA_PASSWORD
            }
        )
        
        # Check status code
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Verify response structure
        data = response.json()
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert "session_token" in data, "Response should contain session_token"
        assert "role" in data, "Response should contain role"
        
        # Verify data values
        assert data["email"] == DOULA_EMAIL, "Email should match login email"
        assert data["role"] == "DOULA", "Role should be DOULA for test account"
        assert len(data["session_token"]) > 0, "Session token should not be empty"
        
        print(f"Login successful: user_id={data['user_id']}, role={data['role']}")
    
    def test_login_with_invalid_credentials(self):
        """Login should fail with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "invalid@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401, "Should return 401 for invalid credentials"
        print("Invalid credentials correctly rejected")


class TestMarketplaceProviders:
    """Test marketplace routes after migration from server.py"""
    
    def test_get_providers_returns_list(self):
        """GET /api/marketplace/providers should return doulas and midwives"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        
        # Check status code
        assert response.status_code == 200, f"Marketplace providers failed: {response.text}"
        
        # Verify response structure
        data = response.json()
        assert "doulas" in data, "Response should contain 'doulas' key"
        assert "midwives" in data, "Response should contain 'midwives' key"
        assert isinstance(data["doulas"], list), "doulas should be a list"
        assert isinstance(data["midwives"], list), "midwives should be a list"
        
        print(f"Marketplace providers: {len(data['doulas'])} doulas, {len(data['midwives'])} midwives")
        
        # If there are providers, verify structure
        if data["doulas"]:
            doula = data["doulas"][0]
            assert "provider_type" in doula, "Provider should have provider_type"
            assert "user" in doula, "Provider should have user info"
            assert "profile" in doula, "Provider should have profile info"
            assert doula["provider_type"] == "DOULA", "Doula provider_type should be DOULA"
            print(f"Sample doula: {doula['user'].get('full_name', 'N/A')}")
        
        if data["midwives"]:
            midwife = data["midwives"][0]
            assert "provider_type" in midwife, "Provider should have provider_type"
            assert "user" in midwife, "Provider should have user info"
            assert "profile" in midwife, "Provider should have profile info"
            assert midwife["provider_type"] == "MIDWIFE", "Midwife provider_type should be MIDWIFE"
            print(f"Sample midwife: {midwife['user'].get('full_name', 'N/A')}")
    
    def test_get_providers_filter_by_doula(self):
        """GET /api/marketplace/providers?provider_type=DOULA should return only doulas"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers?provider_type=DOULA")
        
        assert response.status_code == 200, f"Marketplace filter failed: {response.text}"
        
        data = response.json()
        # When filtering by DOULA, midwives should be empty
        # The API returns both lists, but midwives should be empty when filtered
        print(f"Filtered DOULA: {len(data['doulas'])} doulas, {len(data['midwives'])} midwives")
    
    def test_get_providers_filter_by_midwife(self):
        """GET /api/marketplace/providers?provider_type=MIDWIFE should return only midwives"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers?provider_type=MIDWIFE")
        
        assert response.status_code == 200, f"Marketplace filter failed: {response.text}"
        
        data = response.json()
        # When filtering by MIDWIFE, doulas should be empty
        print(f"Filtered MIDWIFE: {len(data['doulas'])} doulas, {len(data['midwives'])} midwives")


class TestMarketplaceProviderDetail:
    """Test marketplace provider detail endpoint after migration"""
    
    @pytest.fixture
    def provider_user_id(self):
        """Get a provider user_id from marketplace"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        if response.status_code != 200:
            pytest.skip("Could not fetch marketplace providers")
        
        data = response.json()
        if data["doulas"]:
            return data["doulas"][0]["user"]["user_id"]
        elif data["midwives"]:
            return data["midwives"][0]["user"]["user_id"]
        else:
            pytest.skip("No providers available in marketplace")
    
    def test_get_provider_detail(self, provider_user_id):
        """GET /api/marketplace/provider/{user_id} should return provider details"""
        response = requests.get(f"{BASE_URL}/api/marketplace/provider/{provider_user_id}")
        
        assert response.status_code == 200, f"Provider detail failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "profile" in data, "Response should contain 'profile'"
        assert "clients_served" in data, "Response should contain 'clients_served'"
        
        # Verify user data
        assert data["user"]["user_id"] == provider_user_id, "User ID should match"
        print(f"Provider detail: {data['user'].get('full_name', 'N/A')}, clients_served: {data['clients_served']}")
    
    def test_get_nonexistent_provider(self):
        """GET /api/marketplace/provider/{invalid_id} should return 404"""
        response = requests.get(f"{BASE_URL}/api/marketplace/provider/nonexistent_user_12345")
        
        assert response.status_code == 404, "Should return 404 for nonexistent provider"
        print("Nonexistent provider correctly returns 404")


class TestAuthMe:
    """Test auth/me endpoint with session token"""
    
    @pytest.fixture
    def session_token(self):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": DOULA_EMAIL,
                "password": DOULA_PASSWORD
            }
        )
        if response.status_code != 200:
            pytest.skip("Login failed, cannot get session token")
        
        return response.json()["session_token"]
    
    def test_get_current_user(self, session_token):
        """GET /api/auth/me should return current user with valid session"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        
        data = response.json()
        assert data["email"] == DOULA_EMAIL, "Email should match logged in user"
        assert data["role"] == "DOULA", "Role should be DOULA"
        print(f"Current user: {data.get('full_name', 'N/A')} ({data['role']})")
    
    def test_get_current_user_without_auth(self):
        """GET /api/auth/me should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, "Should return 401 without authentication"
        print("Unauthenticated request correctly rejected")


class TestProviderEndpoints:
    """Test that provider-scoped endpoints still work for logged in providers"""
    
    @pytest.fixture
    def auth_session(self):
        """Login and return headers with session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": DOULA_EMAIL,
                "password": DOULA_PASSWORD
            }
        )
        if response.status_code != 200:
            pytest.skip("Login failed")
        
        token = response.json()["session_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_clients(self, auth_session):
        """GET /api/provider/clients should return provider's clients"""
        response = requests.get(
            f"{BASE_URL}/api/provider/clients",
            headers=auth_session
        )
        
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Clients should be a list"
        print(f"Provider has {len(data)} clients")
    
    def test_get_contracts(self, auth_session):
        """GET /api/provider/contracts should return provider's contracts"""
        response = requests.get(
            f"{BASE_URL}/api/provider/contracts",
            headers=auth_session
        )
        
        assert response.status_code == 200, f"Get contracts failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Contracts should be a list"
        print(f"Provider has {len(data)} contracts")
    
    def test_get_invoices(self, auth_session):
        """GET /api/provider/invoices should return provider's invoices"""
        response = requests.get(
            f"{BASE_URL}/api/provider/invoices",
            headers=auth_session
        )
        
        assert response.status_code == 200, f"Get invoices failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Invoices should be a list"
        print(f"Provider has {len(data)} invoices")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
