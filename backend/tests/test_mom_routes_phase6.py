"""
Test Mom Routes Phase 6 - Backend Refactoring
Tests Mom routes migrated from server.py to routes/mom.py

Endpoints tested:
- GET /api/mom/profile - Get mom profile
- POST /api/mom/onboarding - Complete mom onboarding
- PUT /api/mom/profile - Update mom profile
- GET /api/mom/midwife-visits - Get midwife visits
- GET /api/mom/team - Get connected providers
- GET /api/mom/team-providers - Get providers for messaging
- GET /api/mom/invoices - Get invoices for mom
- GET /api/mom/invoices/{invoice_id} - Get specific invoice
- POST /api/mom/appointments - Create appointment request

Auth regression tests:
- POST /api/auth/login - Login
- GET /api/auth/me - Get current user

Provider regression tests:
- GET /api/provider/clients - Get provider clients
- GET /api/provider/dashboard - Get provider dashboard
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")


class TestSetup:
    """Basic setup and health check tests"""

    def test_base_url_configured(self):
        """Verify BASE_URL is configured"""
        assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
        print(f"Testing against: {BASE_URL}")

    def test_health_check(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("Health check passed")


class TestAuthLogin:
    """Auth endpoint tests for login functionality"""

    @pytest.fixture
    def mom_credentials(self):
        return {
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        }

    @pytest.fixture
    def doula_credentials(self):
        return {
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        }

    def test_mom_login_success(self, mom_credentials):
        """Test mom can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=mom_credentials
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["email"] == mom_credentials["email"]
        assert data["role"] == "MOM"
        print(f"Mom login successful: {data['full_name']}")

    def test_doula_login_success(self, doula_credentials):
        """Test doula can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=doula_credentials
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["email"] == doula_credentials["email"]
        assert data["role"] == "DOULA"
        print(f"Doula login successful: {data['full_name']}")


@pytest.fixture(scope="module")
def mom_session():
    """Get authenticated session for mom user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        }
    )
    if response.status_code != 200:
        pytest.skip("Mom login failed")
    session_token = response.json()["session_token"]
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {session_token}",
        "Content-Type": "application/json"
    })
    return session


@pytest.fixture(scope="module")
def doula_session():
    """Get authenticated session for doula user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        }
    )
    if response.status_code != 200:
        pytest.skip("Doula login failed")
    session_token = response.json()["session_token"]
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {session_token}",
        "Content-Type": "application/json"
    })
    return session


class TestMomProfile:
    """Test Mom Profile endpoints - GET /api/mom/profile"""

    def test_get_mom_profile_success(self, mom_session):
        """Test mom can get their profile"""
        response = mom_session.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"Mom profile retrieved: {data}")

    def test_get_mom_profile_requires_auth(self):
        """Test mom profile requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 401
        print("Mom profile requires auth - correct")

    def test_get_mom_profile_requires_mom_role(self, doula_session):
        """Test mom profile endpoint rejects non-mom users"""
        response = doula_session.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 403
        print("Mom profile rejects doula - correct")


class TestMomProfileUpdate:
    """Test Mom Profile update endpoint - PUT /api/mom/profile"""

    def test_update_mom_profile_success(self, mom_session):
        """Test mom can update their profile"""
        update_data = {
            "location_city": "Test City",
            "location_state": "TS"
        }
        response = mom_session.put(
            f"{BASE_URL}/api/mom/profile",
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Profile updated"
        print("Mom profile updated successfully")

    def test_update_mom_profile_requires_auth(self):
        """Test profile update requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/mom/profile",
            json={"location_city": "Test"}
        )
        assert response.status_code == 401
        print("Profile update requires auth - correct")


class TestMomOnboarding:
    """Test Mom Onboarding endpoint - POST /api/mom/onboarding"""

    def test_onboarding_success(self, mom_session):
        """Test mom can complete onboarding"""
        onboarding_data = {
            "due_date": "2026-06-15",
            "planned_birth_setting": "Hospital",
            "zip_code": "90210",
            "location_city": "Beverly Hills",
            "location_state": "CA"
        }
        response = mom_session.post(
            f"{BASE_URL}/api/mom/onboarding",
            json=onboarding_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Onboarding completed"
        assert "profile" in data
        profile = data["profile"]
        assert profile["due_date"] == "2026-06-15"
        assert profile["planned_birth_setting"] == "Hospital"
        print(f"Onboarding completed: {profile}")

    def test_onboarding_requires_auth(self):
        """Test onboarding requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            json={"due_date": "2026-06-15"}
        )
        assert response.status_code == 401
        print("Onboarding requires auth - correct")

    def test_onboarding_requires_mom_role(self, doula_session):
        """Test onboarding rejects non-mom users"""
        response = doula_session.post(
            f"{BASE_URL}/api/mom/onboarding",
            json={"due_date": "2026-06-15"}
        )
        assert response.status_code == 403
        print("Onboarding rejects doula - correct")


class TestMomTeam:
    """Test Mom Team endpoint - GET /api/mom/team"""

    def test_get_team_success(self, mom_session):
        """Test mom can get their care team"""
        response = mom_session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Mom team retrieved: {len(data)} providers")
        # If team has providers, verify structure
        if data:
            provider = data[0]
            assert "provider" in provider
            assert "share_request" in provider

    def test_get_team_requires_auth(self):
        """Test team endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 401
        print("Team requires auth - correct")

    def test_get_team_requires_mom_role(self, doula_session):
        """Test team endpoint rejects non-mom users"""
        response = doula_session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 403
        print("Team rejects doula - correct")


class TestMomTeamProviders:
    """Test Mom Team Providers endpoint - GET /api/mom/team-providers"""

    def test_get_team_providers_success(self, mom_session):
        """Test mom can get providers for messaging"""
        response = mom_session.get(f"{BASE_URL}/api/mom/team-providers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Team providers for messaging: {len(data)} providers")
        # If providers exist, verify structure
        if data:
            provider = data[0]
            assert "user_id" in provider
            assert "full_name" in provider
            assert "role" in provider

    def test_get_team_providers_requires_auth(self):
        """Test team-providers requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mom/team-providers")
        assert response.status_code == 401
        print("Team providers requires auth - correct")


class TestMomMidwifeVisits:
    """Test Mom Midwife Visits endpoint - GET /api/mom/midwife-visits"""

    def test_get_midwife_visits_success(self, mom_session):
        """Test mom can get midwife visits"""
        response = mom_session.get(f"{BASE_URL}/api/mom/midwife-visits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Midwife visits retrieved: {len(data)} visits")
        # If visits exist, verify structure
        if data:
            visit = data[0]
            assert "visit_date" in visit or "provider_name" in visit

    def test_get_midwife_visits_requires_auth(self):
        """Test midwife-visits requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mom/midwife-visits")
        assert response.status_code == 401
        print("Midwife visits requires auth - correct")

    def test_get_midwife_visits_requires_mom_role(self, doula_session):
        """Test midwife-visits rejects non-mom users"""
        response = doula_session.get(f"{BASE_URL}/api/mom/midwife-visits")
        assert response.status_code == 403
        print("Midwife visits rejects doula - correct")


class TestMomInvoices:
    """Test Mom Invoices endpoints - GET /api/mom/invoices"""

    def test_get_invoices_success(self, mom_session):
        """Test mom can get their invoices"""
        response = mom_session.get(f"{BASE_URL}/api/mom/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Invoices retrieved: {len(data)} invoices")
        # If invoices exist, verify structure
        if data:
            invoice = data[0]
            assert "invoice_id" in invoice or "amount" in invoice

    def test_get_invoices_requires_auth(self):
        """Test invoices requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mom/invoices")
        assert response.status_code == 401
        print("Invoices requires auth - correct")

    def test_get_invoices_requires_mom_role(self, doula_session):
        """Test invoices rejects non-mom users"""
        response = doula_session.get(f"{BASE_URL}/api/mom/invoices")
        assert response.status_code == 403
        print("Invoices rejects doula - correct")


class TestMomInvoiceById:
    """Test Mom Invoice by ID endpoint - GET /api/mom/invoices/{invoice_id}"""

    def test_get_invoice_not_found(self, mom_session):
        """Test getting non-existent invoice returns 404"""
        response = mom_session.get(f"{BASE_URL}/api/mom/invoices/nonexistent_invoice")
        assert response.status_code == 404
        print("Invoice not found returns 404 - correct")

    def test_get_invoice_requires_auth(self):
        """Test invoice by ID requires authentication"""
        response = requests.get(f"{BASE_URL}/api/mom/invoices/some_id")
        assert response.status_code == 401
        print("Invoice by ID requires auth - correct")


class TestMomAppointments:
    """Test Mom Appointments endpoint - POST /api/mom/appointments"""

    def test_create_appointment_requires_auth(self):
        """Test appointment creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/mom/appointments",
            json={"provider_id": "test", "title": "Test"}
        )
        assert response.status_code == 401
        print("Appointment creation requires auth - correct")

    def test_create_appointment_requires_provider_id(self, mom_session):
        """Test appointment creation requires provider_id"""
        response = mom_session.post(
            f"{BASE_URL}/api/mom/appointments",
            json={"title": "Test Appointment"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "provider_id" in data.get("detail", "").lower()
        print("Appointment requires provider_id - correct")

    def test_create_appointment_requires_connection(self, mom_session):
        """Test appointment creation requires connection with provider"""
        response = mom_session.post(
            f"{BASE_URL}/api/mom/appointments",
            json={
                "provider_id": "nonexistent_provider",
                "title": "Test Appointment"
            }
        )
        assert response.status_code == 403
        data = response.json()
        assert "connected" in data.get("detail", "").lower()
        print("Appointment requires connection - correct")


class TestAuthRoutesRegression:
    """Regression tests - Auth routes should still work after refactoring"""

    def test_login_endpoint_works(self):
        """Test login endpoint still works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo.mom@truejoybirthing.com",
                "password": "DemoScreenshot2024!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        print("Auth login endpoint works")

    def test_me_endpoint_works(self, mom_session):
        """Test /auth/me endpoint still works"""
        response = mom_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert data["role"] == "MOM"
        print("Auth me endpoint works")


class TestProviderRoutesRegression:
    """Regression tests - Provider routes should still work after refactoring"""

    def test_provider_clients_endpoint(self, doula_session):
        """Test provider/clients endpoint still works"""
        response = doula_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Provider clients endpoint works: {len(data)} clients")

    def test_provider_dashboard_endpoint(self, doula_session):
        """Test provider/dashboard endpoint still works"""
        response = doula_session.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data or "user" in data
        print("Provider dashboard endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
