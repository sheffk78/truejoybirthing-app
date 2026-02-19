"""
Test Suite for Backend Refactoring Phase 7 - Doula and Midwife Routes
=====================================================================
Tests Doula routes migrated to routes/doula.py:
- POST /api/doula/onboarding - Complete doula onboarding
- GET /api/doula/profile - Get doula profile
- PUT /api/doula/profile - Update doula profile
- GET /api/doula/dashboard - Get doula dashboard stats
- GET /api/doula/contract-defaults - Get default contract settings
- PUT /api/doula/contract-defaults - Update contract defaults

Tests Midwife routes migrated to routes/midwife.py:
- POST /api/midwife/onboarding - Complete midwife onboarding
- GET /api/midwife/profile - Get midwife profile
- PUT /api/midwife/profile - Update midwife profile
- GET /api/midwife/dashboard - Get midwife dashboard stats

Also regression tests for auth and mom routes from previous phases.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Verify test environment is properly configured"""
    
    def test_base_url_configured(self):
        """Verify BASE_URL environment variable is set"""
        assert BASE_URL, "BASE_URL must be configured (from EXPO_PUBLIC_BACKEND_URL)"
        assert BASE_URL.startswith("http"), f"BASE_URL must be a valid URL: {BASE_URL}"
        print(f"Using BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        """Verify backend server is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("Health check passed")


class TestAuthLogin:
    """Test authentication for all user types"""
    
    def test_doula_login_success(self):
        """Verify doula can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200, f"Doula login failed: {response.status_code}"
        data = response.json()
        assert "user" in data or "token" in data, "Login response missing user/token"
        print(f"Doula login successful - user: {data.get('user', {}).get('email', 'N/A')}")
    
    def test_midwife_login_success(self):
        """Verify midwife can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200, f"Midwife login failed: {response.status_code}"
        data = response.json()
        assert "user" in data or "token" in data, "Login response missing user/token"
        print(f"Midwife login successful - user: {data.get('user', {}).get('email', 'N/A')}")
    
    def test_mom_login_success(self):
        """Verify mom can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200, f"Mom login failed: {response.status_code}"
        data = response.json()
        assert "user" in data or "token" in data, "Login response missing user/token"
        print(f"Mom login successful - user: {data.get('user', {}).get('email', 'N/A')}")


# ============== DOULA ROUTES TESTS ==============

class TestDoulaProfile:
    """Test GET /api/doula/profile endpoint"""
    
    @pytest.fixture
    def doula_token(self):
        """Get doula auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_doula_profile_success(self, doula_token):
        """Doula can retrieve their profile"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        response = requests.get(f"{BASE_URL}/api/doula/profile", headers=headers)
        assert response.status_code == 200, f"Get doula profile failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data, "Profile missing user_id"
        print(f"Doula profile retrieved: user_id={data.get('user_id')}")
    
    def test_get_doula_profile_requires_auth(self):
        """Doula profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Doula profile correctly requires auth")
    
    def test_get_doula_profile_requires_doula_role(self):
        """Doula profile requires DOULA role (not MOM)"""
        # Login as mom
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        mom_token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {mom_token}"}
        
        response = requests.get(f"{BASE_URL}/api/doula/profile", headers=headers)
        assert response.status_code == 403, f"Expected 403 for MOM accessing doula profile, got {response.status_code}"
        print("Doula profile correctly requires DOULA role")


class TestDoulaProfileUpdate:
    """Test PUT /api/doula/profile endpoint"""
    
    @pytest.fixture
    def doula_token(self):
        """Get doula auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_update_doula_profile_success(self, doula_token):
        """Doula can update their profile"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        update_data = {
            "bio": "Test bio for Phase 7 testing",
            "experience_years": 5
        }
        response = requests.put(
            f"{BASE_URL}/api/doula/profile",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update doula profile failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, "Update response missing message"
        print(f"Doula profile updated: {data.get('message')}")
    
    def test_update_doula_profile_requires_auth(self):
        """Doula profile update requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/doula/profile",
            json={"bio": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Doula profile update correctly requires auth")


class TestDoulaOnboarding:
    """Test POST /api/doula/onboarding endpoint"""
    
    @pytest.fixture
    def doula_token(self):
        """Get doula auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_doula_onboarding_success(self, doula_token):
        """Doula can complete onboarding"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        onboarding_data = {
            "full_name": "Demo Doula",
            "bio": "Experienced birth doula",
            "experience_years": 5,
            "certifications": ["DONA", "CAPPA"],
            "services_offered": ["Birth Doula", "Postpartum Doula"],
            "location_city": "San Francisco",
            "location_state": "CA",
            "zip_code": "94105"
        }
        response = requests.post(
            f"{BASE_URL}/api/doula/onboarding",
            headers=headers,
            json=onboarding_data
        )
        assert response.status_code == 200, f"Doula onboarding failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, "Onboarding response missing message"
        assert "profile" in data, "Onboarding response missing profile"
        print(f"Doula onboarding completed: {data.get('message')}")
    
    def test_doula_onboarding_requires_auth(self):
        """Doula onboarding requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/doula/onboarding",
            json={"full_name": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Doula onboarding correctly requires auth")
    
    def test_doula_onboarding_requires_doula_role(self):
        """Doula onboarding requires DOULA role"""
        # Login as mom
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        mom_token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {mom_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/doula/onboarding",
            headers=headers,
            json={"full_name": "Test"}
        )
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
        print("Doula onboarding correctly requires DOULA role")


class TestDoulaDashboard:
    """Test GET /api/doula/dashboard endpoint"""
    
    @pytest.fixture
    def doula_token(self):
        """Get doula auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_doula_dashboard_success(self, doula_token):
        """Doula can retrieve dashboard stats"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=headers)
        assert response.status_code == 200, f"Get doula dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        # Verify expected dashboard fields
        expected_fields = ["active_clients", "total_clients", "pending_contracts", "unpaid_invoices", "upcoming_appointments", "unread_messages"]
        for field in expected_fields:
            assert field in data, f"Dashboard missing field: {field}"
        print(f"Doula dashboard retrieved: active_clients={data.get('active_clients')}, total_clients={data.get('total_clients')}")
    
    def test_get_doula_dashboard_requires_auth(self):
        """Doula dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Doula dashboard correctly requires auth")
    
    def test_get_doula_dashboard_requires_doula_role(self):
        """Doula dashboard requires DOULA role"""
        # Login as mom
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        mom_token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {mom_token}"}
        
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=headers)
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
        print("Doula dashboard correctly requires DOULA role")


class TestDoulaContractDefaults:
    """Test GET/PUT /api/doula/contract-defaults endpoint"""
    
    @pytest.fixture
    def doula_token(self):
        """Get doula auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_contract_defaults_success(self, doula_token):
        """Doula can retrieve contract defaults"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        response = requests.get(f"{BASE_URL}/api/doula/contract-defaults", headers=headers)
        assert response.status_code == 200, f"Get contract defaults failed: {response.status_code} - {response.text}"
        data = response.json()
        # Verify expected default fields
        assert "deposit_percentage" in data, "Missing deposit_percentage"
        assert "payment_terms" in data, "Missing payment_terms"
        assert "services_included" in data, "Missing services_included"
        print(f"Contract defaults retrieved: deposit_percentage={data.get('deposit_percentage')}")
    
    def test_get_contract_defaults_requires_auth(self):
        """Contract defaults requires authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/contract-defaults")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Contract defaults correctly requires auth")
    
    def test_update_contract_defaults_success(self, doula_token):
        """Doula can update contract defaults"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        update_data = {
            "deposit_percentage": 30.0,
            "payment_terms": "Full payment due at 36 weeks"
        }
        response = requests.put(
            f"{BASE_URL}/api/doula/contract-defaults",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update contract defaults failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, "Update response missing message"
        print(f"Contract defaults updated: {data.get('message')}")


# ============== MIDWIFE ROUTES TESTS ==============

class TestMidwifeProfile:
    """Test GET /api/midwife/profile endpoint"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get midwife auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_midwife_profile_success(self, midwife_token):
        """Midwife can retrieve their profile"""
        headers = {"Authorization": f"Bearer {midwife_token}"}
        response = requests.get(f"{BASE_URL}/api/midwife/profile", headers=headers)
        assert response.status_code == 200, f"Get midwife profile failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "user_id" in data, "Profile missing user_id"
        print(f"Midwife profile retrieved: user_id={data.get('user_id')}")
    
    def test_get_midwife_profile_requires_auth(self):
        """Midwife profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/profile")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Midwife profile correctly requires auth")
    
    def test_get_midwife_profile_requires_midwife_role(self):
        """Midwife profile requires MIDWIFE role (not MOM)"""
        # Login as mom
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        mom_token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {mom_token}"}
        
        response = requests.get(f"{BASE_URL}/api/midwife/profile", headers=headers)
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
        print("Midwife profile correctly requires MIDWIFE role")


class TestMidwifeProfileUpdate:
    """Test PUT /api/midwife/profile endpoint"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get midwife auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_update_midwife_profile_success(self, midwife_token):
        """Midwife can update their profile"""
        headers = {"Authorization": f"Bearer {midwife_token}"}
        update_data = {
            "bio": "Test bio for Phase 7 testing",
            "experience_years": 10,
            "credentials": "CNM"
        }
        response = requests.put(
            f"{BASE_URL}/api/midwife/profile",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update midwife profile failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, "Update response missing message"
        print(f"Midwife profile updated: {data.get('message')}")
    
    def test_update_midwife_profile_requires_auth(self):
        """Midwife profile update requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/midwife/profile",
            json={"bio": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Midwife profile update correctly requires auth")


class TestMidwifeOnboarding:
    """Test POST /api/midwife/onboarding endpoint"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get midwife auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_midwife_onboarding_success(self, midwife_token):
        """Midwife can complete onboarding"""
        headers = {"Authorization": f"Bearer {midwife_token}"}
        onboarding_data = {
            "full_name": "Demo Midwife",
            "bio": "Certified nurse midwife",
            "experience_years": 10,
            "certifications": ["CNM", "ACNM"],
            "credentials": "CNM",
            "license_number": "CA12345",
            "license_state": "CA",
            "services_offered": ["Prenatal Care", "Birth Services", "Postpartum Care"],
            "birth_settings_served": ["home", "birth_center"],
            "location_city": "San Francisco",
            "location_state": "CA",
            "zip_code": "94105"
        }
        response = requests.post(
            f"{BASE_URL}/api/midwife/onboarding",
            headers=headers,
            json=onboarding_data
        )
        assert response.status_code == 200, f"Midwife onboarding failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "message" in data, "Onboarding response missing message"
        assert "profile" in data, "Onboarding response missing profile"
        print(f"Midwife onboarding completed: {data.get('message')}")
    
    def test_midwife_onboarding_requires_auth(self):
        """Midwife onboarding requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/midwife/onboarding",
            json={"full_name": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Midwife onboarding correctly requires auth")
    
    def test_midwife_onboarding_requires_midwife_role(self):
        """Midwife onboarding requires MIDWIFE role"""
        # Login as mom
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        mom_token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {mom_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/midwife/onboarding",
            headers=headers,
            json={"full_name": "Test"}
        )
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
        print("Midwife onboarding correctly requires MIDWIFE role")


class TestMidwifeDashboard:
    """Test GET /api/midwife/dashboard endpoint"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get midwife auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_get_midwife_dashboard_success(self, midwife_token):
        """Midwife can retrieve dashboard stats"""
        headers = {"Authorization": f"Bearer {midwife_token}"}
        response = requests.get(f"{BASE_URL}/api/midwife/dashboard", headers=headers)
        assert response.status_code == 200, f"Get midwife dashboard failed: {response.status_code} - {response.text}"
        data = response.json()
        # Verify expected dashboard fields
        expected_fields = ["prenatal_clients", "active_clients", "total_clients", "pending_contracts", "unpaid_invoices", "upcoming_visits", "upcoming_appointments", "unread_messages"]
        for field in expected_fields:
            assert field in data, f"Dashboard missing field: {field}"
        print(f"Midwife dashboard retrieved: prenatal_clients={data.get('prenatal_clients')}, active_clients={data.get('active_clients')}")
    
    def test_get_midwife_dashboard_requires_auth(self):
        """Midwife dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Midwife dashboard correctly requires auth")
    
    def test_get_midwife_dashboard_requires_midwife_role(self):
        """Midwife dashboard requires MIDWIFE role"""
        # Login as mom
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        mom_token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {mom_token}"}
        
        response = requests.get(f"{BASE_URL}/api/midwife/dashboard", headers=headers)
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
        print("Midwife dashboard correctly requires MIDWIFE role")


# ============== REGRESSION TESTS ==============

class TestAuthRoutesRegression:
    """Verify auth routes still work after migration"""
    
    def test_login_endpoint_works(self):
        """POST /api/auth/login still works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.status_code}"
        print("Auth login endpoint works")
    
    def test_me_endpoint_works(self):
        """GET /api/auth/me still works"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Me endpoint failed: {response.status_code}"
        data = response.json()
        assert "email" in data or "user" in data, "Me endpoint response invalid"
        print("Auth me endpoint works")


class TestMomRoutesRegression:
    """Verify mom routes still work after doula/midwife migration"""
    
    @pytest.fixture
    def mom_token(self):
        """Get mom auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_mom_profile_endpoint(self, mom_token):
        """GET /api/mom/profile still works"""
        headers = {"Authorization": f"Bearer {mom_token}"}
        response = requests.get(f"{BASE_URL}/api/mom/profile", headers=headers)
        assert response.status_code == 200, f"Mom profile failed: {response.status_code}"
        print("Mom profile endpoint works")
    
    def test_mom_team_endpoint(self, mom_token):
        """GET /api/mom/team still works"""
        headers = {"Authorization": f"Bearer {mom_token}"}
        response = requests.get(f"{BASE_URL}/api/mom/team", headers=headers)
        assert response.status_code == 200, f"Mom team failed: {response.status_code}"
        print("Mom team endpoint works")


class TestProviderRoutesRegression:
    """Verify provider routes still work after migration"""
    
    @pytest.fixture
    def doula_token(self):
        """Get doula auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_provider_clients_endpoint(self, doula_token):
        """GET /api/provider/clients still works"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=headers)
        assert response.status_code == 200, f"Provider clients failed: {response.status_code}"
        print("Provider clients endpoint works")
    
    def test_provider_dashboard_endpoint(self, doula_token):
        """GET /api/provider/dashboard still works"""
        headers = {"Authorization": f"Bearer {doula_token}"}
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=headers)
        assert response.status_code == 200, f"Provider dashboard failed: {response.status_code}"
        print("Provider dashboard endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
