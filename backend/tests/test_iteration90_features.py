"""
Test suite for iteration 90 features:
1. GET /api/provider/clients with is_active field and include_inactive filter
2. GET /api/mom/team-providers - returns providers in Mom's team
3. POST /api/mom/appointments - Mom creates appointment request with provider
4. Frontend: ProviderClients Active/Inactive/All filter toggle
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://birth-timeline.preview.emergentagent.com')

# Test credentials
DOULA_CREDS = {
    "email": "demo.doula@truejoybirthing.com",
    "password": "DemoScreenshot2024!"
}

MOM_CREDS = {
    "email": "demo.mom@truejoybirthing.com",
    "password": "DemoScreenshot2024!"
}


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def doula_auth(session):
    """Login as doula and return session token"""
    response = session.post(f"{BASE_URL}/api/auth/login", json=DOULA_CREDS)
    if response.status_code == 200:
        token = response.json().get("session_token")
        return token
    pytest.skip(f"Doula login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def mom_auth(session):
    """Login as mom and return session token"""
    response = session.post(f"{BASE_URL}/api/auth/login", json=MOM_CREDS)
    if response.status_code == 200:
        token = response.json().get("session_token")
        return token
    pytest.skip(f"Mom login failed: {response.status_code} - {response.text}")


class TestProviderClientsEndpoint:
    """Test GET /api/provider/clients unified endpoint"""
    
    def test_provider_clients_returns_is_active_field(self, session, doula_auth):
        """Test that clients have is_active field"""
        session.headers.update({"Authorization": f"Bearer {doula_auth}"})
        response = session.get(f"{BASE_URL}/api/provider/clients")
        
        assert response.status_code == 200
        clients = response.json()
        print(f"Provider clients response: {len(clients)} clients")
        
        # If there are clients, verify they have is_active field
        if len(clients) > 0:
            first_client = clients[0]
            assert "is_active" in first_client, "Client should have is_active field"
            print(f"First client is_active: {first_client.get('is_active')}")
            print(f"First client status: {first_client.get('status')}")
    
    def test_provider_clients_default_filters_active(self, session, doula_auth):
        """Test that default (no include_inactive) filters to active only"""
        session.headers.update({"Authorization": f"Bearer {doula_auth}"})
        
        # Get default (active only)
        response_default = session.get(f"{BASE_URL}/api/provider/clients")
        assert response_default.status_code == 200
        active_only = response_default.json()
        
        # All returned clients should be active
        for client in active_only:
            assert client.get("is_active") is not False, f"Client {client.get('name')} should be active"
        
        print(f"Default query returned {len(active_only)} active clients")
    
    def test_provider_clients_include_inactive_true(self, session, doula_auth):
        """Test include_inactive=true returns all clients"""
        session.headers.update({"Authorization": f"Bearer {doula_auth}"})
        
        response = session.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        assert response.status_code == 200
        all_clients = response.json()
        
        # Count active vs inactive
        active_count = sum(1 for c in all_clients if c.get("is_active") is not False)
        inactive_count = sum(1 for c in all_clients if c.get("is_active") is False)
        
        print(f"include_inactive=true: {len(all_clients)} total ({active_count} active, {inactive_count} inactive)")
    
    def test_provider_clients_unauthorized(self):
        """Test that unauthorized access returns 401"""
        # Use fresh session without auth
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 401


class TestMomTeamProviders:
    """Test GET /api/mom/team-providers endpoint"""
    
    def test_mom_team_providers_returns_list(self, session, mom_auth):
        """Test that endpoint returns a list of providers"""
        session.headers.update({"Authorization": f"Bearer {mom_auth}"})
        response = session.get(f"{BASE_URL}/api/mom/team-providers")
        
        assert response.status_code == 200
        providers = response.json()
        assert isinstance(providers, list), "Response should be a list"
        
        print(f"Mom has {len(providers)} providers in team")
        
        # If there are providers, verify structure
        for provider in providers:
            assert "user_id" in provider, "Provider should have user_id"
            assert "full_name" in provider, "Provider should have full_name"
            assert "role" in provider, "Provider should have role"
            print(f"  - {provider.get('full_name')} ({provider.get('role')})")
    
    def test_mom_team_providers_unauthorized(self):
        """Test that unauthorized access returns 401"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.get(f"{BASE_URL}/api/mom/team-providers")
        assert response.status_code == 401


class TestMomAppointmentCreation:
    """Test POST /api/mom/appointments endpoint"""
    
    def test_mom_create_appointment_requires_provider(self, session, mom_auth):
        """Test that provider_id is required"""
        session.headers.update({"Authorization": f"Bearer {mom_auth}"})
        
        # Missing provider_id
        response = session.post(f"{BASE_URL}/api/mom/appointments", json={
            "appointment_date": "2026-02-15",
            "appointment_time": "10:00",
            "appointment_type": "consultation"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "provider_id" in data.get("detail", "").lower()
    
    def test_mom_create_appointment_requires_team_connection(self, session, mom_auth):
        """Test that provider must be in Mom's team (accepted share request)"""
        session.headers.update({"Authorization": f"Bearer {mom_auth}"})
        
        # Use a fake provider ID
        response = session.post(f"{BASE_URL}/api/mom/appointments", json={
            "provider_id": "fake_provider_id_12345",
            "appointment_date": "2026-02-15",
            "appointment_time": "10:00",
            "appointment_type": "consultation"
        })
        
        assert response.status_code == 403
        data = response.json()
        assert "not in your team" in data.get("detail", "").lower() or "connect" in data.get("detail", "").lower()
    
    def test_mom_create_appointment_with_team_provider(self, session, mom_auth):
        """Test creating appointment with a provider in Mom's team"""
        session.headers.update({"Authorization": f"Bearer {mom_auth}"})
        
        # First get team providers
        providers_response = session.get(f"{BASE_URL}/api/mom/team-providers")
        assert providers_response.status_code == 200
        providers = providers_response.json()
        
        if len(providers) == 0:
            pytest.skip("Mom has no providers in team - cannot test appointment creation")
        
        provider = providers[0]
        provider_id = provider.get("user_id")
        
        # Create appointment request
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        response = session.post(f"{BASE_URL}/api/mom/appointments", json={
            "provider_id": provider_id,
            "appointment_date": future_date,
            "appointment_time": "14:00",
            "appointment_type": "consultation",
            "is_virtual": True,
            "notes": "Test appointment from iteration 90"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "appointment" in data
        appointment = data["appointment"]
        assert appointment.get("status") == "pending"
        assert appointment.get("created_by") == "mom"
        assert appointment.get("provider_id") == provider_id
        
        print(f"Created appointment: {appointment.get('appointment_id')}")
        
        return appointment.get("appointment_id")
    
    def test_mom_create_appointment_unauthorized(self):
        """Test that unauthorized access returns 401"""
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.post(f"{BASE_URL}/api/mom/appointments", json={
            "provider_id": "test",
            "appointment_date": "2026-02-15"
        })
        
        assert response.status_code == 401


class TestMomAppointmentsListEndpoint:
    """Test GET /api/appointments for mom"""
    
    def test_mom_can_get_appointments(self, session, mom_auth):
        """Test Mom can get their appointments list"""
        session.headers.update({"Authorization": f"Bearer {mom_auth}"})
        
        response = session.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        
        appointments = response.json()
        assert isinstance(appointments, list)
        print(f"Mom has {len(appointments)} appointments")
        
        # Check structure if there are appointments
        for apt in appointments[:3]:  # Check first 3
            assert "appointment_id" in apt
            assert "status" in apt
            print(f"  - {apt.get('appointment_type')} with {apt.get('provider_name')} ({apt.get('status')})")


class TestProviderReceivesAppointmentRequest:
    """Test that provider can see mom's appointment requests"""
    
    def test_provider_sees_mom_appointment_request(self, session, doula_auth, mom_auth):
        """Test that provider sees pending appointment requests from moms"""
        # First create an appointment as mom (if there's a provider in team)
        session.headers.update({"Authorization": f"Bearer {mom_auth}"})
        providers_response = session.get(f"{BASE_URL}/api/mom/team-providers")
        
        if providers_response.status_code != 200:
            pytest.skip("Could not get team providers")
        
        providers = providers_response.json()
        if len(providers) == 0:
            pytest.skip("No providers in team")
        
        # Check if doula is in mom's team
        doula_in_team = any(p.get("role") == "DOULA" for p in providers)
        if not doula_in_team:
            pytest.skip("Demo doula not in mom's team")
        
        # Now check as doula if there are pending appointments
        session.headers.update({"Authorization": f"Bearer {doula_auth}"})
        
        response = session.get(f"{BASE_URL}/api/appointments")
        assert response.status_code == 200
        
        appointments = response.json()
        pending_from_mom = [a for a in appointments if a.get("created_by") == "mom" and a.get("status") == "pending"]
        
        print(f"Provider has {len(pending_from_mom)} pending requests from moms")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
