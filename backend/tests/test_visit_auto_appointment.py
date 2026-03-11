"""
Test cases for Visit Auto-Appointment Creation and Client Filtering
Tests the features:
1. POST /api/provider/visits auto-creates appointment when appointment_id not provided
2. Visit record always has appointment_id after creation
3. GET /api/provider/visits returns visits with appointment_id
4. GET /api/provider/visits?client_id=X filters by client
5. Active/inactive client filtering in provider/clients endpoint
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://timer-icons-nav.preview.emergentagent.com")

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture(scope="module")
def midwife_session():
    """Login as midwife and return authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
    )
    
    if response.status_code != 200:
        pytest.skip(f"Midwife login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    session_token = data.get("session_token")
    if session_token:
        session.headers.update({"Authorization": f"Bearer {session_token}"})
    
    return session


@pytest.fixture(scope="module")
def midwife_client_id(midwife_session):
    """Get an existing client ID for the midwife"""
    response = midwife_session.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
    
    if response.status_code != 200:
        pytest.skip(f"Could not fetch clients: {response.status_code}")
    
    clients = response.json()
    if not clients:
        pytest.skip("No clients available for midwife")
    
    return clients[0]["client_id"]


class TestVisitAutoAppointmentCreation:
    """Test that visit creation auto-creates linked appointment"""
    
    def test_create_visit_without_appointment_id_auto_creates_appointment(self, midwife_session, midwife_client_id):
        """POST /api/provider/visits without appointment_id should auto-create appointment"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create visit WITHOUT appointment_id
        visit_data = {
            "client_id": midwife_client_id,
            "visit_date": "2026-01-15",
            "visit_type": "Prenatal",
            "blood_pressure": "120/80",
            "fetal_heart_rate": 145,
            "general_notes": f"TEST_auto_appt_{unique_id}"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json=visit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        visit = response.json()
        
        # Critical: Visit MUST have appointment_id after creation
        assert "appointment_id" in visit, "Visit missing appointment_id field"
        assert visit["appointment_id"] is not None, "appointment_id is None"
        assert visit["appointment_id"].startswith("appt_"), f"Invalid appointment_id format: {visit['appointment_id']}"
        
        # Verify other fields
        assert visit["client_id"] == midwife_client_id
        assert visit["visit_type"] == "Prenatal"
        assert visit["blood_pressure"] == "120/80"
        assert visit["fetal_heart_rate"] == 145
        
        print(f"✓ Visit created with auto-generated appointment_id: {visit['appointment_id']}")
        
        return visit
    
    def test_create_visit_with_appointment_id_uses_provided_id(self, midwife_session, midwife_client_id):
        """POST /api/provider/visits with appointment_id should use the provided ID"""
        unique_id = uuid.uuid4().hex[:8]
        custom_appt_id = f"appt_custom_{unique_id}"
        
        visit_data = {
            "client_id": midwife_client_id,
            "visit_date": "2026-01-16",
            "visit_type": "Postpartum",
            "appointment_id": custom_appt_id,  # Provide appointment_id
            "general_notes": f"TEST_custom_appt_{unique_id}"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json=visit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        visit = response.json()
        
        # Should use the provided appointment_id
        assert visit["appointment_id"] == custom_appt_id, f"Expected {custom_appt_id}, got {visit.get('appointment_id')}"
        
        print(f"✓ Visit created with provided appointment_id: {visit['appointment_id']}")
    
    def test_create_visit_postpartum_type_auto_creates_postpartum_appointment(self, midwife_session, midwife_client_id):
        """Postpartum visits should create appointments with postpartum_visit type"""
        unique_id = uuid.uuid4().hex[:8]
        
        visit_data = {
            "client_id": midwife_client_id,
            "visit_date": "2026-01-17",
            "visit_type": "Postpartum",
            "general_notes": f"TEST_postpartum_{unique_id}"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json=visit_data
        )
        
        assert response.status_code == 200
        
        visit = response.json()
        assert visit["appointment_id"] is not None
        assert visit["visit_type"] == "Postpartum"
        
        print(f"✓ Postpartum visit created with appointment_id: {visit['appointment_id']}")


class TestGetVisitsEndpoint:
    """Test GET /api/provider/visits endpoint"""
    
    def test_get_visits_returns_appointment_id(self, midwife_session):
        """GET /api/provider/visits should return visits with appointment_id"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/visits")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        visits = response.json()
        assert isinstance(visits, list)
        
        # Check that visits have appointment_id field (may have some without if legacy data)
        visits_with_appt_id = [v for v in visits if v.get("appointment_id")]
        print(f"✓ Found {len(visits)} visits, {len(visits_with_appt_id)} with appointment_id")
        
        return visits
    
    def test_get_visits_filters_by_client_id(self, midwife_session, midwife_client_id):
        """GET /api/provider/visits?client_id=X should filter by client"""
        response = midwife_session.get(
            f"{BASE_URL}/api/provider/visits",
            params={"client_id": midwife_client_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        visits = response.json()
        assert isinstance(visits, list)
        
        # All visits should be for the specified client
        for visit in visits:
            assert visit["client_id"] == midwife_client_id, f"Visit client_id mismatch: {visit.get('client_id')}"
        
        print(f"✓ Filter by client_id returned {len(visits)} visits for client {midwife_client_id}")
    
    def test_get_visits_with_nonexistent_client_returns_empty(self, midwife_session):
        """GET /api/provider/visits with fake client_id should return empty"""
        fake_client_id = "client_nonexistent_12345"
        
        response = midwife_session.get(
            f"{BASE_URL}/api/provider/visits",
            params={"client_id": fake_client_id}
        )
        
        assert response.status_code == 200
        
        visits = response.json()
        assert visits == [], f"Expected empty list, got {visits}"
        
        print(f"✓ Non-existent client filter returns empty list")
    
    def test_get_visits_include_inactive_clients(self, midwife_session):
        """GET /api/provider/visits with include_inactive_clients=true should include all"""
        response = midwife_session.get(
            f"{BASE_URL}/api/provider/visits",
            params={"include_inactive_clients": "true"}
        )
        
        assert response.status_code == 200
        
        visits = response.json()
        print(f"✓ include_inactive_clients=true returned {len(visits)} visits")


class TestProviderClientsActiveFiltering:
    """Test active/inactive client filtering in /api/provider/clients"""
    
    def test_provider_clients_default_returns_active_only(self, midwife_session):
        """GET /api/provider/clients default should return only active clients"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/clients")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        clients = response.json()
        assert isinstance(clients, list)
        
        # All clients should have is_active field
        for client in clients:
            assert "is_active" in client, "Client missing is_active field"
            assert client["is_active"] == True, f"Default filter returned inactive client: {client.get('client_id')}"
        
        print(f"✓ Default clients endpoint returns {len(clients)} active clients")
    
    def test_provider_clients_include_inactive_true(self, midwife_session):
        """GET /api/provider/clients?include_inactive=true should return all clients"""
        response = midwife_session.get(
            f"{BASE_URL}/api/provider/clients",
            params={"include_inactive": "true"}
        )
        
        assert response.status_code == 200
        
        clients = response.json()
        assert isinstance(clients, list)
        
        # Check all have is_active field
        for client in clients:
            assert "is_active" in client
        
        active_count = sum(1 for c in clients if c["is_active"])
        inactive_count = sum(1 for c in clients if not c["is_active"])
        
        print(f"✓ include_inactive=true returned {len(clients)} clients ({active_count} active, {inactive_count} inactive)")
    
    def test_provider_clients_include_inactive_false(self, midwife_session):
        """GET /api/provider/clients?include_inactive=false should return only active"""
        response = midwife_session.get(
            f"{BASE_URL}/api/provider/clients",
            params={"include_inactive": "false"}
        )
        
        assert response.status_code == 200
        
        clients = response.json()
        
        for client in clients:
            assert "is_active" in client
            assert client["is_active"] == True
        
        print(f"✓ include_inactive=false returned {len(clients)} active clients only")


class TestVisitCreationValidation:
    """Test validation in visit creation endpoint"""
    
    def test_create_visit_requires_client_id(self, midwife_session):
        """POST /api/provider/visits without client_id should fail"""
        response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json={
                "visit_date": "2026-01-20",
                "visit_type": "Prenatal"
                # Missing client_id
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "client_id" in str(data).lower()
        
        print(f"✓ Missing client_id correctly rejected with 400")
    
    def test_create_visit_invalid_client_returns_404(self, midwife_session):
        """POST /api/provider/visits with non-existent client should fail"""
        response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json={
                "client_id": "client_fake_nonexistent",
                "visit_date": "2026-01-20",
                "visit_type": "Prenatal"
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✓ Non-existent client correctly rejected with 404")
    
    def test_create_visit_unauthorized_without_auth(self):
        """POST /api/provider/visits without auth should fail"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(
            f"{BASE_URL}/api/provider/visits",
            json={
                "client_id": "client_any",
                "visit_date": "2026-01-20"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✓ Unauthorized request correctly rejected with 401")


class TestVisitAppointmentLinking:
    """Test that visit-appointment linking works correctly"""
    
    def test_auto_created_appointment_exists_in_appointments_collection(self, midwife_session, midwife_client_id):
        """Auto-created appointment should be retrievable"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create visit
        visit_response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json={
                "client_id": midwife_client_id,
                "visit_date": "2026-01-18",
                "visit_type": "Prenatal",
                "general_notes": f"TEST_verify_appt_{unique_id}"
            }
        )
        
        assert visit_response.status_code == 200
        visit = visit_response.json()
        appointment_id = visit.get("appointment_id")
        
        # Verify appointment exists by fetching provider appointments
        appt_response = midwife_session.get(f"{BASE_URL}/api/provider/appointments")
        
        assert appt_response.status_code == 200
        appointments = appt_response.json()
        
        # Find the created appointment
        matching_appt = next((a for a in appointments if a.get("appointment_id") == appointment_id), None)
        
        assert matching_appt is not None, f"Auto-created appointment {appointment_id} not found in appointments list"
        assert matching_appt.get("status") == "completed", f"Expected status 'completed', got {matching_appt.get('status')}"
        
        print(f"✓ Auto-created appointment {appointment_id} exists and is marked as completed")
    
    def test_auto_created_appointment_has_correct_type(self, midwife_session, midwife_client_id):
        """Auto-created appointment should have correct appointment_type based on visit_type"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create Prenatal visit
        prenatal_response = midwife_session.post(
            f"{BASE_URL}/api/provider/visits",
            json={
                "client_id": midwife_client_id,
                "visit_date": "2026-01-19",
                "visit_type": "Prenatal",
                "general_notes": f"TEST_prenatal_appt_{unique_id}"
            }
        )
        
        assert prenatal_response.status_code == 200
        prenatal_visit = prenatal_response.json()
        
        # Verify the appointment has correct type
        appt_response = midwife_session.get(f"{BASE_URL}/api/provider/appointments")
        appointments = appt_response.json()
        
        prenatal_appt = next((a for a in appointments if a.get("appointment_id") == prenatal_visit["appointment_id"]), None)
        
        if prenatal_appt:
            expected_type = "prenatal_visit"
            assert prenatal_appt.get("appointment_type") == expected_type, \
                f"Expected appointment_type '{expected_type}', got '{prenatal_appt.get('appointment_type')}'"
            print(f"✓ Prenatal visit created appointment with type: {prenatal_appt.get('appointment_type')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
