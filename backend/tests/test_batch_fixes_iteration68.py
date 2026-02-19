"""
Backend tests for Batch Fixes from user document - Iteration 68

Testing:
1. Doula dashboard 'Upcoming Appts' counter
2. Midwife dashboard 'Upcoming Appts' counter
3. Midwife appointments filter tabs (handled in frontend)
4. Doula profile zip code lookup
5. Provider birth plan PDF export endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://provider-consolidate.preview.emergentagent.com"

# Test credentials
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife_ui@test.com"
MIDWIFE_PASSWORD = "password123"
MOM_EMAIL = "testmom_msg@test.com"
MOM_PASSWORD = "password123"


class TestSession:
    """Singleton-like session holder for tests"""
    doula_token = None
    midwife_token = None
    mom_token = None


@pytest.fixture(scope="module")
def doula_session():
    """Login as doula and get session token"""
    if TestSession.doula_token:
        return TestSession.doula_token
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    if response.status_code == 200:
        TestSession.doula_token = response.json().get("session_token")
        return TestSession.doula_token
    pytest.skip(f"Doula login failed: {response.status_code}")


@pytest.fixture(scope="module")
def midwife_session():
    """Login as midwife and get session token"""
    if TestSession.midwife_token:
        return TestSession.midwife_token
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    if response.status_code == 200:
        TestSession.midwife_token = response.json().get("session_token")
        return TestSession.midwife_token
    pytest.skip(f"Midwife login failed: {response.status_code}")


@pytest.fixture(scope="module")
def mom_session():
    """Login as mom and get session token"""
    if TestSession.mom_token:
        return TestSession.mom_token
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    if response.status_code == 200:
        TestSession.mom_token = response.json().get("session_token")
        return TestSession.mom_token
    pytest.skip(f"Mom login failed: {response.status_code}")


class TestDoulaDashboardUpcomingAppts:
    """Test: Doula dashboard shows 'Upcoming Appts' counter"""
    
    def test_doula_dashboard_returns_upcoming_appointments(self, doula_session):
        """Verify doula dashboard returns upcoming_appointments field"""
        response = requests.get(
            f"{BASE_URL}/api/doula/dashboard",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        
        assert response.status_code == 200, f"Dashboard fetch failed: {response.text}"
        
        data = response.json()
        assert "upcoming_appointments" in data, "Missing upcoming_appointments field"
        assert isinstance(data["upcoming_appointments"], int), "upcoming_appointments should be integer"
        
        # Also verify other expected fields
        assert "active_clients" in data
        assert "contracts_pending_signature" in data
        assert "pending_invoices" in data
        
        print(f"Doula dashboard stats: {data}")


class TestMidwifeDashboardUpcomingAppts:
    """Test: Midwife dashboard shows 'Upcoming Appts' counter"""
    
    def test_midwife_dashboard_returns_upcoming_appointments(self, midwife_session):
        """Verify midwife dashboard returns upcoming_appointments field"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/dashboard",
            headers={"Authorization": f"Bearer {midwife_session}"}
        )
        
        assert response.status_code == 200, f"Dashboard fetch failed: {response.text}"
        
        data = response.json()
        assert "upcoming_appointments" in data, "Missing upcoming_appointments field"
        assert isinstance(data["upcoming_appointments"], int), "upcoming_appointments should be integer"
        
        # Also verify other expected fields
        assert "prenatal_clients" in data
        assert "visits_this_month" in data
        assert "births_this_month" in data
        
        print(f"Midwife dashboard stats: {data}")


class TestZipCodeLookup:
    """Test: Zip code lookup for doula profile edit"""
    
    def test_zipcode_lookup_valid(self):
        """Test valid zip code returns city and state"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/90210")
        
        assert response.status_code == 200, f"Zip lookup failed: {response.text}"
        
        data = response.json()
        assert "city" in data
        assert "state" in data
        assert "zip_code" in data
        assert data["city"] == "Beverly Hills"
        assert data["state"] == "California"
        
        print(f"Zip lookup result: {data}")
    
    def test_zipcode_lookup_invalid(self):
        """Test invalid zip code returns 404"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/00000")
        
        assert response.status_code == 404, f"Expected 404 for invalid zip, got {response.status_code}"
    
    def test_zipcode_lookup_different_zip(self):
        """Test another zip code to verify lookup works generally"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/10001")  # New York
        
        assert response.status_code == 200, f"Zip lookup failed: {response.text}"
        
        data = response.json()
        assert "city" in data
        assert "state" in data
        assert data["state"] == "New York"
        
        print(f"NYC zip lookup result: {data}")


class TestProviderBirthPlanPDF:
    """Test: Provider can export client birth plan as PDF"""
    
    def test_provider_birth_plan_pdf_endpoint_exists(self, doula_session):
        """Verify the PDF export endpoint exists and requires auth"""
        # First get share requests to find a connected mom
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not fetch share requests")
        
        requests_data = response.json().get("requests", [])
        accepted_requests = [r for r in requests_data if r.get("status") == "accepted"]
        
        if not accepted_requests:
            # Try to find clients with linked_mom_id
            clients_response = requests.get(
                f"{BASE_URL}/api/doula/clients",
                headers={"Authorization": f"Bearer {doula_session}"}
            )
            
            if clients_response.status_code == 200:
                clients = clients_response.json()
                linked_clients = [c for c in clients if c.get("linked_mom_id")]
                if linked_clients:
                    mom_id = linked_clients[0]["linked_mom_id"]
                    # Try PDF endpoint
                    pdf_response = requests.get(
                        f"{BASE_URL}/api/provider/client/{mom_id}/birth-plan/pdf",
                        headers={"Authorization": f"Bearer {doula_session}"}
                    )
                    # Should either succeed or return 403 (no share) or 404 (no plan)
                    assert pdf_response.status_code in [200, 403, 404], f"Unexpected status: {pdf_response.status_code}"
                    print(f"PDF endpoint response: {pdf_response.status_code}")
                    return
            
            pytest.skip("No accepted share requests or linked clients found")
        
        # Use first accepted request's mom_id
        mom_id = accepted_requests[0]["mom_user_id"]
        
        pdf_response = requests.get(
            f"{BASE_URL}/api/provider/client/{mom_id}/birth-plan/pdf",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        
        # Should return PDF (200) or 404 if birth plan doesn't exist
        assert pdf_response.status_code in [200, 404], f"Unexpected status: {pdf_response.status_code}"
        
        if pdf_response.status_code == 200:
            # Verify it's a PDF
            content_type = pdf_response.headers.get("content-type", "")
            assert "application/pdf" in content_type or "application/octet-stream" in content_type
            print(f"PDF export successful, content-type: {content_type}")
        else:
            print(f"No birth plan found for mom {mom_id}")
    
    def test_provider_pdf_without_auth_fails(self):
        """Verify PDF endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/client/some_id/birth-plan/pdf")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestMidwifeAppointmentsFiltering:
    """Test: Midwife appointments endpoint supports type filtering (backend API)"""
    
    def test_appointments_endpoint_returns_appointment_type(self, midwife_session):
        """Verify appointments include appointment_type for filtering"""
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {midwife_session}"}
        )
        
        assert response.status_code == 200, f"Failed to fetch appointments: {response.text}"
        
        appointments = response.json()
        
        # If there are appointments, check they have appointment_type field
        if appointments:
            for appt in appointments[:3]:  # Check first 3
                assert "appointment_type" in appt, "Missing appointment_type field"
                print(f"Appointment type: {appt['appointment_type']}")
        else:
            print("No appointments found - endpoint works correctly")


class TestDoulaDashboardFullResponse:
    """Comprehensive test of doula dashboard response"""
    
    def test_doula_dashboard_complete_structure(self, doula_session):
        """Verify all expected fields in doula dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/doula/dashboard",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields
        required_fields = [
            "total_clients",
            "active_clients",
            "pending_invoices",
            "contracts_pending_signature",
            "upcoming_appointments"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"{field} should be integer"
        
        print(f"Doula dashboard complete: {data}")


class TestMidwifeDashboardFullResponse:
    """Comprehensive test of midwife dashboard response"""
    
    def test_midwife_dashboard_complete_structure(self, midwife_session):
        """Verify all expected fields in midwife dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/dashboard",
            headers={"Authorization": f"Bearer {midwife_session}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields
        required_fields = [
            "total_clients",
            "prenatal_clients",
            "visits_this_month",
            "births_this_month",
            "upcoming_appointments"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"{field} should be integer"
        
        print(f"Midwife dashboard complete: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
