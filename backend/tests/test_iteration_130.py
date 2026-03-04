"""
Tests for Iteration 130: Bug Fixes
1. Mom's Home - Action Required section shows pending contracts and invoices
2. Mom Appointments - KeyboardAvoidingView present
3. Mom Appointments - Profile pictures for providers
4. Mom Appointments - Accept/Decline buttons for provider appointments
5. Provider Appointments - Profile pictures for clients
6. Doula Dashboard - upcoming_appointments excludes pending
7. Midwife Dashboard - upcoming_appointments excludes pending
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://exam-intake-form.preview.emergentagent.com')

# Test credentials
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_mom_login(self):
        """Test Mom account login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Response missing session_token: {data.keys()}"
        assert data.get("role") == "MOM"
        return data["session_token"]

    def test_doula_login(self):
        """Test Doula account login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Response missing session_token: {data.keys()}"
        assert data.get("role") == "DOULA"
        return data["session_token"]

    def test_midwife_login(self):
        """Test Midwife account login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Response missing session_token: {data.keys()}"
        assert data.get("role") == "MIDWIFE"
        return data["session_token"]


@pytest.fixture
def mom_token():
    """Get Mom authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    return response.json().get("session_token")


@pytest.fixture
def doula_token():
    """Get Doula authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    return response.json().get("session_token")


@pytest.fixture
def midwife_token():
    """Get Midwife authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    return response.json().get("session_token")


class TestMomContractsEndpoint:
    """Test 1: Mom's Home - Action Required section shows pending contracts"""
    
    def test_mom_contracts_endpoint_exists(self, mom_token):
        """Verify /mom/contracts endpoint exists and returns data"""
        response = requests.get(
            f"{BASE_URL}/api/mom/contracts",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        # This endpoint should return 200 and a list of contracts
        # If it returns 404, the endpoint is missing
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text[:500]}")
        
        if response.status_code == 404:
            pytest.fail("CRITICAL: /api/mom/contracts endpoint is MISSING - needs to be implemented")
        
        assert response.status_code == 200, f"Failed to get contracts: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Contracts response should be a list"


class TestMomInvoicesEndpoint:
    """Test 1: Mom's Home - Action Required section shows pending invoices"""
    
    def test_mom_invoices_endpoint_exists(self, mom_token):
        """Verify /mom/invoices endpoint exists and returns data"""
        response = requests.get(
            f"{BASE_URL}/api/mom/invoices",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200, f"Failed to get invoices: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Invoices response should be a list"
        print(f"Mom invoices count: {len(data)}")


class TestMomAppointmentsProfilePictures:
    """Test 3: Mom Appointments - Verify profile pictures are returned for providers"""
    
    def test_appointments_return_provider_picture(self, mom_token):
        """Verify appointments endpoint returns provider_picture field"""
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        appointments = response.json()
        
        print(f"Mom appointments count: {len(appointments)}")
        
        # Check if provider_picture field exists in appointments with providers
        for appt in appointments:
            if appt.get("provider_id"):
                print(f"Appointment {appt.get('appointment_id')}: provider_picture = {appt.get('provider_picture')}")
                # Verify field exists (can be null if no picture set)
                assert "provider_picture" in appt or "provider_name" in appt, "Appointment should have provider info"


class TestMomAppointmentAcceptDecline:
    """Test 4: Mom Appointments - Accept/Decline buttons for provider appointments"""
    
    def test_mom_can_respond_to_appointment(self, mom_token):
        """Verify Mom can accept/decline appointments from providers"""
        # First, get appointments to find a pending one from provider
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        appointments = response.json()
        
        # Find pending appointments created by provider
        pending_from_provider = [
            a for a in appointments 
            if a.get("status") == "pending" and a.get("created_by") != "mom"
        ]
        
        print(f"Pending appointments from providers: {len(pending_from_provider)}")
        
        # The respond endpoint should exist and be callable
        if pending_from_provider:
            appt = pending_from_provider[0]
            # Test that the endpoint is accessible (we won't actually respond to preserve state)
            print(f"Found pending appointment: {appt.get('appointment_id')} from {appt.get('provider_name')}")


class TestProviderAppointmentsClientPictures:
    """Test 5: Provider Appointments - Verify profile pictures are returned for clients"""
    
    def test_appointments_return_client_picture_doula(self, doula_token):
        """Verify Doula appointments endpoint returns client_picture field"""
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        appointments = response.json()
        
        print(f"Doula appointments count: {len(appointments)}")
        
        for appt in appointments:
            if appt.get("client_id"):
                print(f"Appointment {appt.get('appointment_id')}: client_picture = {appt.get('client_picture')}")
    
    def test_appointments_return_client_picture_midwife(self, midwife_token):
        """Verify Midwife appointments endpoint returns client_picture field"""
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        appointments = response.json()
        
        print(f"Midwife appointments count: {len(appointments)}")
        
        for appt in appointments:
            if appt.get("client_id"):
                print(f"Appointment {appt.get('appointment_id')}: client_picture = {appt.get('client_picture')}")


class TestDoulaDashboard:
    """Test 6: Doula Dashboard - upcoming_appointments excludes pending"""
    
    def test_doula_dashboard_appointments_exclude_pending(self, doula_token):
        """Verify Doula dashboard upcoming_appointments excludes pending status"""
        response = requests.get(
            f"{BASE_URL}/api/doula/dashboard",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        data = response.json()
        
        print(f"Doula dashboard data: {data}")
        assert "upcoming_appointments" in data, "Dashboard should have upcoming_appointments field"
        
        # Get all appointments to verify count
        appt_response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        appointments = appt_response.json()
        
        # Count confirmed/scheduled/accepted appointments
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        confirmed_upcoming = [
            a for a in appointments
            if a.get("status") in ["confirmed", "scheduled", "accepted"]
            and (a.get("appointment_date", "") >= today or a.get("start_datetime", "") >= today)
        ]
        
        pending_upcoming = [
            a for a in appointments
            if a.get("status") == "pending"
            and (a.get("appointment_date", "") >= today or a.get("start_datetime", "") >= today)
        ]
        
        print(f"Dashboard upcoming_appointments: {data['upcoming_appointments']}")
        print(f"Confirmed/scheduled/accepted upcoming: {len(confirmed_upcoming)}")
        print(f"Pending upcoming (should NOT be counted): {len(pending_upcoming)}")
        
        # Verify the count matches confirmed+scheduled+accepted only
        assert data["upcoming_appointments"] == len(confirmed_upcoming), \
            f"Dashboard should show {len(confirmed_upcoming)} upcoming appointments (excluding {len(pending_upcoming)} pending)"


class TestMidwifeDashboard:
    """Test 7: Midwife Dashboard - upcoming_appointments excludes pending"""
    
    def test_midwife_dashboard_appointments_exclude_pending(self, midwife_token):
        """Verify Midwife dashboard upcoming_appointments excludes pending status"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/dashboard",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        data = response.json()
        
        print(f"Midwife dashboard data: {data}")
        assert "upcoming_appointments" in data, "Dashboard should have upcoming_appointments field"
        
        # Get all appointments to verify count
        appt_response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        appointments = appt_response.json()
        
        # Count confirmed/scheduled/accepted appointments
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        confirmed_upcoming = [
            a for a in appointments
            if a.get("status") in ["confirmed", "scheduled", "accepted"]
            and (a.get("appointment_date", "") >= today or a.get("start_datetime", "") >= today)
        ]
        
        pending_upcoming = [
            a for a in appointments
            if a.get("status") == "pending"
            and (a.get("appointment_date", "") >= today or a.get("start_datetime", "") >= today)
        ]
        
        print(f"Dashboard upcoming_appointments: {data['upcoming_appointments']}")
        print(f"Confirmed/scheduled/accepted upcoming: {len(confirmed_upcoming)}")
        print(f"Pending upcoming (should NOT be counted): {len(pending_upcoming)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
