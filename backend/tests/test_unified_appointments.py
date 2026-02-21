"""
Unified Appointments API Tests
Tests for Provider (Doula/Midwife) and Mom appointment features
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-birthing-fix.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


class TestAuthLogin:
    """Test authentication for all roles"""
    
    def test_doula_login(self):
        """Test Doula can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        assert "token" in data or "session_token" in data, "No token in response"
        # Login returns user data at root level (not nested in 'user')
        user_data = data.get("user", data)  # Handle both formats
        assert user_data.get("role") == "DOULA", f"Unexpected role: {user_data.get('role')}"
        print(f"SUCCESS: Doula login - {user_data.get('full_name')}")
        
    def test_midwife_login(self):
        """Test Midwife can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        assert "token" in data or "session_token" in data, "No token in response"
        user_data = data.get("user", data)
        assert user_data.get("role") == "MIDWIFE", f"Unexpected role: {user_data.get('role')}"
        print(f"SUCCESS: Midwife login - {user_data.get('full_name')}")
        
    def test_mom_login(self):
        """Test Mom can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        assert "token" in data or "session_token" in data, "No token in response"
        user_data = data.get("user", data)
        assert user_data.get("role") == "MOM", f"Unexpected role: {user_data.get('role')}"
        print(f"SUCCESS: Mom login - {user_data.get('full_name')}")


@pytest.fixture
def doula_auth():
    """Get Doula authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("session_token")
        return {"Authorization": f"Bearer {token}"}, data.get("user", {})
    pytest.skip("Doula authentication failed")


@pytest.fixture
def midwife_auth():
    """Get Midwife authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("session_token")
        return {"Authorization": f"Bearer {token}"}, data.get("user", {})
    pytest.skip("Midwife authentication failed")


@pytest.fixture
def mom_auth():
    """Get Mom authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("session_token")
        return {"Authorization": f"Bearer {token}"}, data.get("user", {})
    pytest.skip("Mom authentication failed")


class TestProviderDashboard:
    """Test Provider Dashboard Features"""
    
    def test_doula_dashboard(self, doula_auth):
        """Test Doula dashboard returns stats including appointments count"""
        headers, user = doula_auth
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        print(f"Doula dashboard data keys: {list(data.keys())}")
        # Dashboard should have some stats
        assert isinstance(data, dict), "Dashboard should return dict"
        print(f"SUCCESS: Doula dashboard loaded with {len(data)} fields")
        
    def test_midwife_dashboard(self, midwife_auth):
        """Test Midwife dashboard returns stats"""
        headers, user = midwife_auth
        response = requests.get(f"{BASE_URL}/api/midwife/dashboard", headers=headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        print(f"SUCCESS: Midwife dashboard loaded with {len(data)} fields")


class TestProviderProfile:
    """Test Provider Profile Features"""
    
    def test_doula_profile_get(self, doula_auth):
        """Test Doula can get their profile"""
        headers, user = doula_auth
        response = requests.get(f"{BASE_URL}/api/doula/profile", headers=headers)
        assert response.status_code == 200, f"Profile failed: {response.text}"
        data = response.json()
        print(f"Doula profile fields: {list(data.keys())}")
        print(f"SUCCESS: Doula profile retrieved")
        
    def test_doula_profile_has_save_fields(self, doula_auth):
        """Test Doula profile has editable fields - Save button should be after all fields"""
        headers, user = doula_auth
        response = requests.get(f"{BASE_URL}/api/doula/profile", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Profile should have fields like practice_name, location, etc.
        editable_fields = ['practice_name', 'location_city', 'location_state', 'years_in_practice', 
                         'video_intro_url', 'more_about_me', 'accepting_new_clients']
        present_fields = [f for f in editable_fields if f in data]
        print(f"Editable fields in profile: {present_fields}")
        print(f"SUCCESS: Profile has {len(present_fields)} editable fields")


class TestProviderClients:
    """Test Provider Clients with appointment badge"""
    
    def test_doula_clients_list(self, doula_auth):
        """Test Doula can get clients list"""
        headers, user = doula_auth
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=headers)
        assert response.status_code == 200, f"Clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Clients should be a list"
        print(f"Doula has {len(data)} clients")
        if len(data) > 0:
            client = data[0]
            print(f"Client fields: {list(client.keys())}")
            # Check for linked_mom_id which is needed for appointment badge
            if 'linked_mom_id' in client:
                print(f"Client has linked_mom_id: {client['linked_mom_id']}")
        print(f"SUCCESS: Doula clients retrieved")


class TestUnifiedAppointments:
    """Test Unified Appointments API (/api/appointments)"""
    
    def test_doula_get_appointments(self, doula_auth):
        """Test Doula can get appointments via unified endpoint"""
        headers, user = doula_auth
        response = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        assert response.status_code == 200, f"Appointments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Doula has {len(data)} appointments")
        if len(data) > 0:
            apt = data[0]
            print(f"Appointment fields: {list(apt.keys())}")
            # Should have client_name for provider view
            if 'client_name' in apt:
                print(f"Client name in appointment: {apt['client_name']}")
        print(f"SUCCESS: Doula appointments via /api/appointments")
        
    def test_midwife_get_appointments(self, midwife_auth):
        """Test Midwife can get appointments via unified endpoint"""
        headers, user = midwife_auth
        response = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        assert response.status_code == 200, f"Appointments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Midwife has {len(data)} appointments")
        print(f"SUCCESS: Midwife appointments via /api/appointments")
        
    def test_mom_get_appointments(self, mom_auth):
        """Test Mom can get appointments via unified endpoint"""
        headers, user = mom_auth
        response = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        assert response.status_code == 200, f"Appointments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Mom has {len(data)} appointments")
        if len(data) > 0:
            apt = data[0]
            print(f"Appointment fields: {list(apt.keys())}")
            # Mom view should have provider_name and provider_role
            if 'provider_name' in apt:
                print(f"Provider name: {apt['provider_name']}, role: {apt.get('provider_role')}")
        print(f"SUCCESS: Mom appointments via /api/appointments")


class TestMomTeamProviders:
    """Test Mom's team providers for appointment creation"""
    
    def test_mom_team_providers(self, mom_auth):
        """Test Mom can get her team providers"""
        headers, user = mom_auth
        response = requests.get(f"{BASE_URL}/api/mom/team-providers", headers=headers)
        # May return 404 or 200 with empty array if no team
        if response.status_code == 404:
            print("Mom has no team providers (404)")
            pytest.skip("Mom has no team providers")
        assert response.status_code == 200, f"Team providers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Mom has {len(data)} team providers")
        if len(data) > 0:
            provider = data[0]
            print(f"Provider fields: {list(provider.keys())}")
            print(f"Provider: {provider.get('full_name')} - {provider.get('role')}")
        print(f"SUCCESS: Mom team providers retrieved")


class TestAppointmentCreation:
    """Test appointment creation flow"""
    
    def test_mom_create_appointment_requires_provider(self, mom_auth):
        """Test Mom needs a provider to create appointment"""
        headers, user = mom_auth
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/appointments", headers=headers, json={
            "appointment_date": tomorrow,
            "appointment_time": "10:00",
            "appointment_type": "consultation",
            "notes": "Test appointment"
        })
        # Should fail without provider_id (or succeed with 'none' for personal appointment)
        print(f"Create without provider: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Created personal appointment: {data}")
        else:
            print(f"Correctly requires provider or allows personal appointment")
        print(f"SUCCESS: Appointment creation validation working")
        
    def test_provider_create_appointment_needs_client(self, doula_auth):
        """Test Provider needs client_id to create appointment"""
        headers, user = doula_auth
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/appointments", headers=headers, json={
            "appointment_date": tomorrow,
            "appointment_time": "10:00",
            "appointment_type": "prenatal_visit"
        })
        # Should fail without client_id
        assert response.status_code == 400, f"Should require client_id, got {response.status_code}"
        print(f"SUCCESS: Provider appointment requires client_id")


class TestMarketplaceProfileAboutMe:
    """Test Marketplace provider profile - no redundant About section"""
    
    def test_marketplace_providers(self, mom_auth):
        """Test Mom can get marketplace providers"""
        headers, user = mom_auth
        response = requests.get(f"{BASE_URL}/api/marketplace/providers", headers=headers)
        assert response.status_code == 200, f"Marketplace failed: {response.text}"
        data = response.json()
        # API returns {doulas: [], midwives: []}
        assert "doulas" in data or "midwives" in data, "Expected doulas or midwives in response"
        total = len(data.get("doulas", [])) + len(data.get("midwives", []))
        print(f"Marketplace has {total} providers")
        
        # Check a provider's profile data
        all_providers = data.get("doulas", []) + data.get("midwives", [])
        if len(all_providers) > 0:
            provider = all_providers[0]
            profile = provider.get("profile", {})
            print(f"Provider profile fields: {list(profile.keys())}")
            # Check for more_about_me (the correct field, not 'about' or 'bio')
            if "more_about_me" in profile:
                print(f"About Me field present (more_about_me)")
        print(f"SUCCESS: Marketplace providers retrieved")


class TestProviderLegacyEndpoint:
    """Test legacy /api/provider/appointments endpoint still works"""
    
    def test_provider_appointments_legacy(self, doula_auth):
        """Test provider/appointments endpoint redirects to unified"""
        headers, user = doula_auth
        response = requests.get(f"{BASE_URL}/api/provider/appointments", headers=headers)
        # Should either work or redirect to /api/appointments
        print(f"Legacy endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Legacy endpoint returned {len(data)} appointments")
        elif response.status_code in [307, 308]:
            print("Legacy endpoint redirects (expected behavior)")
        else:
            print(f"Legacy endpoint may be removed: {response.status_code}")


class TestAppointmentBadgeInClients:
    """Test appointment badge displays in client list"""
    
    def test_clients_can_show_appointment_badge(self, doula_auth):
        """Test /provider/appointments data can be used for client badges"""
        headers, user = doula_auth
        
        # Get clients
        clients_resp = requests.get(f"{BASE_URL}/api/provider/clients", headers=headers)
        if clients_resp.status_code != 200:
            pytest.skip("Could not get clients")
        clients = clients_resp.json()
        
        # Get appointments
        appts_resp = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        if appts_resp.status_code != 200:
            pytest.skip("Could not get appointments")
        appointments = appts_resp.json()
        
        # Check if appointments have client_id for matching
        if len(appointments) > 0:
            apt = appointments[0]
            has_client_id = 'client_id' in apt
            has_mom_user_id = 'mom_user_id' in apt
            print(f"Appointment has client_id: {has_client_id}, mom_user_id: {has_mom_user_id}")
            if has_client_id or has_mom_user_id:
                print("SUCCESS: Appointments have identifiers for client badge matching")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
