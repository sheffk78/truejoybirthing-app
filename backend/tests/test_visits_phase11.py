"""
Phase 11 Testing: Visit Routes Migration
Tests for visit routes migrated from server.py to routes/visits.py

Endpoints tested:
- Basic Midwife Visits: GET/POST/PUT /api/midwife/visits
- Prenatal Visit Assessments: GET/POST/PUT/DELETE /api/midwife/clients/{client_id}/prenatal-visits
- Birth Summaries: GET/POST/PUT /api/midwife/birth-summaries
- Provider Unified Visits: GET/POST/PUT/DELETE /api/provider/visits
- Role-based access control (MIDWIFE only)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment - public URL for testing
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://client-photo-sync.preview.emergentagent.com')

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Basic setup and health check tests"""
    
    def test_base_url_configured(self):
        """Verify base URL is properly configured"""
        assert BASE_URL is not None
        assert BASE_URL.startswith("http")
        print(f"Base URL: {BASE_URL}")
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("Health check passed")


class TestAuthLogin:
    """Authentication tests"""
    
    def test_midwife_login_success(self):
        """Test midwife can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        print(f"Midwife login successful: {data['full_name']}")
    
    def test_doula_login_success(self):
        """Test doula can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "DOULA"
        print(f"Doula login successful: {data['full_name']}")


@pytest.fixture(scope="module")
def midwife_session():
    """Get authenticated midwife session"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip("Midwife login failed")
    data = response.json()
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {data['session_token']}",
        "Content-Type": "application/json"
    })
    # Return user data directly (not nested under 'user' key)
    user_data = {
        "user_id": data["user_id"],
        "email": data["email"],
        "full_name": data["full_name"],
        "role": data["role"]
    }
    return session, user_data


@pytest.fixture(scope="module")
def doula_session():
    """Get authenticated doula session"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip("Doula login failed")
    data = response.json()
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {data['session_token']}",
        "Content-Type": "application/json"
    })
    # Return user data directly (not nested under 'user' key)
    user_data = {
        "user_id": data["user_id"],
        "email": data["email"],
        "full_name": data["full_name"],
        "role": data["role"]
    }
    return session, user_data


@pytest.fixture(scope="module")
def test_client_id(midwife_session):
    """Get or create a test client for midwife"""
    session, user = midwife_session
    
    # Get existing clients
    response = session.get(f"{BASE_URL}/api/midwife/clients")
    if response.status_code == 200:
        clients = response.json()
        if clients and len(clients) > 0:
            # Return first existing client
            print(f"Using existing client: {clients[0].get('name', 'Unknown')}")
            return clients[0]["client_id"]
    
    # Create a test client if none exists
    test_client = {
        "name": f"TEST_VisitClient_{uuid.uuid4().hex[:6]}",
        "email": f"test_visit_{uuid.uuid4().hex[:6]}@test.com",
        "phone": "555-123-4567",
        "edd": "2026-06-15",
        "planned_birth_setting": "Home"
    }
    response = session.post(f"{BASE_URL}/api/midwife/clients", json=test_client)
    if response.status_code in [200, 201]:
        client_id = response.json().get("client_id")
        print(f"Created test client: {client_id}")
        return client_id
    
    pytest.skip("Could not get or create test client")


# ============== BASIC MIDWIFE VISITS TESTS ==============

class TestMidwifeVisitsCRUD:
    """Tests for basic midwife visits: GET/POST/PUT /api/midwife/visits"""
    
    def test_get_visits_requires_auth(self):
        """Test that GET /api/midwife/visits requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/visits")
        assert response.status_code == 401
        print("GET /api/midwife/visits correctly requires auth")
    
    def test_get_visits_as_midwife(self, midwife_session):
        """Test midwife can get visits"""
        session, user = midwife_session
        response = session.get(f"{BASE_URL}/api/midwife/visits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/midwife/visits returned {len(data)} visits")
    
    def test_create_visit(self, midwife_session, test_client_id):
        """Test creating a basic midwife visit"""
        session, user = midwife_session
        
        visit_data = {
            "client_id": test_client_id,
            "visit_date": "2026-01-20",
            "visit_type": "Prenatal",
            "gestational_age": "32 weeks",
            "blood_pressure": "118/72",
            "weight": "145 lbs",
            "fetal_heart_rate": "150 bpm",
            "summary_for_mom": "TEST_Visit: Everything looks great today!",
            "private_note": "TEST_Visit: Client is progressing well."
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/visits", json=visit_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "visit_id" in data
        assert data["client_id"] == test_client_id
        assert data["visit_type"] == "Prenatal"
        assert data["blood_pressure"] == "118/72"
        assert data["summary_for_mom"] == "TEST_Visit: Everything looks great today!"
        assert "_id" not in data  # Verify no MongoDB ObjectId
        
        print(f"Created visit: {data['visit_id']}")
        return data["visit_id"]
    
    def test_create_and_update_visit(self, midwife_session, test_client_id):
        """Test creating and updating a visit"""
        session, user = midwife_session
        
        # Create visit
        visit_data = {
            "client_id": test_client_id,
            "visit_date": "2026-01-21",
            "visit_type": "Postpartum",
            "blood_pressure": "120/80",
            "weight": "140 lbs",
            "summary_for_mom": "TEST_Visit: Postpartum checkup - mom doing well",
            "private_note": "TEST_Visit: Recovery on track"
        }
        
        create_response = session.post(f"{BASE_URL}/api/midwife/visits", json=visit_data)
        assert create_response.status_code == 200
        created_visit = create_response.json()
        visit_id = created_visit["visit_id"]
        
        # Update visit
        update_data = {
            "blood_pressure": "116/74",
            "summary_for_mom": "TEST_Visit: Updated - excellent recovery!",
            "private_note": "TEST_Visit: Updated notes"
        }
        
        update_response = session.put(
            f"{BASE_URL}/api/midwife/visits/{visit_id}",
            json=update_data
        )
        assert update_response.status_code == 200
        print(f"Updated visit: {visit_id}")
    
    def test_get_visits_filtered_by_client(self, midwife_session, test_client_id):
        """Test filtering visits by client_id"""
        session, user = midwife_session
        
        response = session.get(
            f"{BASE_URL}/api/midwife/visits",
            params={"client_id": test_client_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned visits should be for this client
        for visit in data:
            assert visit["client_id"] == test_client_id
        
        print(f"Found {len(data)} visits for client {test_client_id}")
    
    def test_update_nonexistent_visit_returns_404(self, midwife_session):
        """Test updating a non-existent visit returns 404"""
        session, user = midwife_session
        
        response = session.put(
            f"{BASE_URL}/api/midwife/visits/nonexistent_visit_12345",
            json={"summary_for_mom": "This should fail"}
        )
        assert response.status_code == 404
        print("PUT nonexistent visit correctly returns 404")


# ============== PRENATAL VISIT ASSESSMENTS TESTS ==============

class TestPrenatalVisitAssessments:
    """Tests for prenatal visit assessments with vitals and well-being scores"""
    
    def test_get_prenatal_visits_requires_auth(self, test_client_id):
        """Test GET prenatal visits requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits"
        )
        assert response.status_code == 401
        print("GET prenatal visits correctly requires auth")
    
    def test_get_prenatal_visits(self, midwife_session, test_client_id):
        """Test midwife can get prenatal visits for a client"""
        session, user = midwife_session
        
        response = session.get(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET prenatal visits returned {len(data)} visits for client {test_client_id}")
    
    def test_create_prenatal_visit_assessment(self, midwife_session, test_client_id):
        """Test creating a prenatal visit assessment with vitals and well-being scores"""
        session, user = midwife_session
        
        assessment_data = {
            "visit_date": "2026-01-22",
            "urinalysis": "Normal",
            "urinalysis_note": "TEST: Clear, no protein",
            "blood_pressure": "115/70",
            "fetal_heart_rate": 148,
            "fundal_height": 32.5,
            "weight": 150.0,
            "weight_unit": "lbs",
            "eating_score": 4,
            "eating_note": "TEST: Good appetite",
            "water_score": 5,
            "water_note": "TEST: Excellent hydration",
            "emotional_score": 4,
            "emotional_note": "TEST: Feeling positive",
            "physical_score": 3,
            "physical_note": "TEST: Some tiredness",
            "mental_score": 4,
            "mental_note": "TEST: Clear and focused",
            "spiritual_score": 5,
            "spiritual_note": "TEST: At peace",
            "general_notes": "TEST_Prenatal: Overall healthy visit"
        }
        
        response = session.post(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits",
            json=assessment_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "prenatal_visit_id" in data
        assert data["client_id"] == test_client_id
        assert data["blood_pressure"] == "115/70"
        assert data["fetal_heart_rate"] == 148
        assert data["eating_score"] == 4
        assert data["water_score"] == 5
        assert "summary" in data  # Auto-generated summary
        assert "_id" not in data
        
        print(f"Created prenatal visit assessment: {data['prenatal_visit_id']}")
        return data["prenatal_visit_id"]
    
    def test_get_single_prenatal_visit(self, midwife_session, test_client_id):
        """Test getting a single prenatal visit by ID"""
        session, user = midwife_session
        
        # First create a visit
        create_data = {
            "visit_date": "2026-01-23",
            "blood_pressure": "120/78",
            "fetal_heart_rate": 145,
            "general_notes": "TEST_GetSingle: Test visit"
        }
        create_response = session.post(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits",
            json=create_data
        )
        assert create_response.status_code == 200
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Get the single visit
        response = session.get(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits/{visit_id}"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["prenatal_visit_id"] == visit_id
        assert data["blood_pressure"] == "120/78"
        assert "_id" not in data
        
        print(f"Retrieved prenatal visit: {visit_id}")
    
    def test_update_prenatal_visit(self, midwife_session, test_client_id):
        """Test updating a prenatal visit assessment"""
        session, user = midwife_session
        
        # Create a visit
        create_data = {
            "visit_date": "2026-01-24",
            "blood_pressure": "118/72",
            "fetal_heart_rate": 150,
            "weight": 148.0,
            "general_notes": "TEST_Update: Initial notes"
        }
        create_response = session.post(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits",
            json=create_data
        )
        assert create_response.status_code == 200
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Update the visit
        update_data = {
            "blood_pressure": "116/70",
            "eating_score": 5,
            "eating_note": "TEST_Update: Improved diet",
            "general_notes": "TEST_Update: Updated notes after discussion"
        }
        
        response = session.put(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits/{visit_id}",
            json=update_data
        )
        assert response.status_code == 200
        print(f"Updated prenatal visit: {visit_id}")
    
    def test_delete_prenatal_visit(self, midwife_session, test_client_id):
        """Test deleting a prenatal visit assessment"""
        session, user = midwife_session
        
        # Create a visit to delete
        create_data = {
            "visit_date": "2026-01-25",
            "blood_pressure": "120/80",
            "general_notes": "TEST_Delete: This will be deleted"
        }
        create_response = session.post(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits",
            json=create_data
        )
        assert create_response.status_code == 200
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Delete the visit
        response = session.delete(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits/{visit_id}"
        )
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = session.get(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits/{visit_id}"
        )
        assert get_response.status_code == 404
        
        print(f"Deleted prenatal visit: {visit_id}")
    
    def test_delete_nonexistent_prenatal_visit_returns_404(self, midwife_session, test_client_id):
        """Test deleting a non-existent prenatal visit returns 404"""
        session, user = midwife_session
        
        response = session.delete(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits/nonexistent_pv_12345"
        )
        assert response.status_code == 404
        print("DELETE nonexistent prenatal visit correctly returns 404")
    
    def test_prenatal_visit_for_nonexistent_client_returns_404(self, midwife_session):
        """Test accessing prenatal visits for non-existent client returns 404"""
        session, user = midwife_session
        
        response = session.get(
            f"{BASE_URL}/api/midwife/clients/nonexistent_client_12345/prenatal-visits"
        )
        assert response.status_code == 404
        print("GET prenatal visits for nonexistent client correctly returns 404")


# ============== BIRTH SUMMARIES TESTS ==============

class TestBirthSummaries:
    """Tests for birth summaries: GET/POST/PUT /api/midwife/birth-summaries"""
    
    def test_get_birth_summaries_requires_auth(self):
        """Test GET birth summaries requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/birth-summaries")
        assert response.status_code == 401
        print("GET birth summaries correctly requires auth")
    
    def test_get_birth_summaries(self, midwife_session):
        """Test midwife can get birth summaries"""
        session, user = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/birth-summaries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET birth summaries returned {len(data)} summaries")
    
    def test_create_birth_summary(self, midwife_session):
        """Test creating a birth summary"""
        session, user = midwife_session
        
        # Create a unique client for this birth summary
        test_client = {
            "name": f"TEST_BirthSummaryClient_{uuid.uuid4().hex[:6]}",
            "email": f"test_birth_{uuid.uuid4().hex[:6]}@test.com",
            "edd": "2026-01-10",
            "planned_birth_setting": "Home"
        }
        client_response = session.post(f"{BASE_URL}/api/midwife/clients", json=test_client)
        if client_response.status_code not in [200, 201]:
            pytest.skip("Could not create test client for birth summary")
        
        client_id = client_response.json()["client_id"]
        
        summary_data = {
            "client_id": client_id,
            "birth_datetime": "2026-01-10T14:30:00",
            "birth_place": "Home",
            "mode_of_birth": "Spontaneous Vaginal",
            "newborn_details": "TEST_Birth: Healthy baby girl, 7lbs 8oz, APGAR 9/10",
            "complications": "None",
            "summary_note": "TEST_Birth: Beautiful home birth, mother and baby doing well"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/birth-summaries", json=summary_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary_id" in data
        assert data["client_id"] == client_id
        assert data["birth_place"] == "Home"
        assert data["mode_of_birth"] == "Spontaneous Vaginal"
        assert "_id" not in data
        
        print(f"Created birth summary: {data['summary_id']}")
        return data["summary_id"], client_id
    
    def test_create_duplicate_birth_summary_fails(self, midwife_session):
        """Test creating duplicate birth summary for same client fails"""
        session, user = midwife_session
        
        # Create a client
        test_client = {
            "name": f"TEST_DuplicateBirthClient_{uuid.uuid4().hex[:6]}",
            "email": f"test_dup_{uuid.uuid4().hex[:6]}@test.com",
            "edd": "2026-01-15",
            "planned_birth_setting": "Birth Center"
        }
        client_response = session.post(f"{BASE_URL}/api/midwife/clients", json=test_client)
        if client_response.status_code not in [200, 201]:
            pytest.skip("Could not create test client")
        
        client_id = client_response.json()["client_id"]
        
        # Create first birth summary
        summary_data = {
            "client_id": client_id,
            "birth_datetime": "2026-01-15T10:00:00",
            "birth_place": "Birth Center",
            "mode_of_birth": "Spontaneous Vaginal"
        }
        
        first_response = session.post(f"{BASE_URL}/api/midwife/birth-summaries", json=summary_data)
        assert first_response.status_code == 200
        
        # Try to create duplicate
        second_response = session.post(f"{BASE_URL}/api/midwife/birth-summaries", json=summary_data)
        assert second_response.status_code == 400
        print("Duplicate birth summary correctly rejected")
    
    def test_update_birth_summary(self, midwife_session):
        """Test updating a birth summary"""
        session, user = midwife_session
        
        # Create a client and birth summary
        test_client = {
            "name": f"TEST_UpdateBirthClient_{uuid.uuid4().hex[:6]}",
            "email": f"test_update_{uuid.uuid4().hex[:6]}@test.com",
            "edd": "2026-01-20",
            "planned_birth_setting": "Hospital"
        }
        client_response = session.post(f"{BASE_URL}/api/midwife/clients", json=test_client)
        if client_response.status_code not in [200, 201]:
            pytest.skip("Could not create test client")
        
        client_id = client_response.json()["client_id"]
        
        # Create birth summary
        summary_data = {
            "client_id": client_id,
            "birth_datetime": "2026-01-20T08:00:00",
            "birth_place": "Hospital",
            "mode_of_birth": "Cesarean",
            "summary_note": "TEST_UpdateBirth: Initial note"
        }
        
        create_response = session.post(f"{BASE_URL}/api/midwife/birth-summaries", json=summary_data)
        assert create_response.status_code == 200
        summary_id = create_response.json()["summary_id"]
        
        # Update the birth summary
        update_data = {
            "newborn_details": "TEST_UpdateBirth: Healthy baby boy, 8lbs",
            "complications": "TEST_UpdateBirth: Cord around neck, resolved",
            "summary_note": "TEST_UpdateBirth: Updated with full details"
        }
        
        response = session.put(
            f"{BASE_URL}/api/midwife/birth-summaries/{summary_id}",
            json=update_data
        )
        assert response.status_code == 200
        print(f"Updated birth summary: {summary_id}")
    
    def test_update_nonexistent_birth_summary_returns_404(self, midwife_session):
        """Test updating non-existent birth summary returns 404"""
        session, user = midwife_session
        
        response = session.put(
            f"{BASE_URL}/api/midwife/birth-summaries/nonexistent_summary_12345",
            json={"summary_note": "This should fail"}
        )
        assert response.status_code == 404
        print("PUT nonexistent birth summary correctly returns 404")


# ============== PROVIDER UNIFIED VISITS TESTS ==============

class TestProviderUnifiedVisits:
    """Tests for provider unified visits: GET/POST/PUT/DELETE /api/provider/visits"""
    
    def test_get_provider_visits_requires_auth(self):
        """Test GET provider visits requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/visits")
        assert response.status_code == 401
        print("GET provider visits correctly requires auth")
    
    def test_get_provider_visits_as_midwife(self, midwife_session):
        """Test midwife can get unified visits"""
        session, user = midwife_session
        
        response = session.get(f"{BASE_URL}/api/provider/visits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET provider visits returned {len(data)} visits")
    
    def test_get_provider_visits_filtered_by_client(self, midwife_session, test_client_id):
        """Test filtering provider visits by client_id"""
        session, user = midwife_session
        
        response = session.get(
            f"{BASE_URL}/api/provider/visits",
            params={"client_id": test_client_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} provider visits for client {test_client_id}")
    
    def test_get_provider_visits_filtered_by_type(self, midwife_session):
        """Test filtering provider visits by visit_type"""
        session, user = midwife_session
        
        response = session.get(
            f"{BASE_URL}/api/provider/visits",
            params={"visit_type": "Prenatal"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} Prenatal visits")
    
    def test_get_provider_visits_include_inactive_clients(self, midwife_session):
        """Test including inactive clients in visits"""
        session, user = midwife_session
        
        response = session.get(
            f"{BASE_URL}/api/provider/visits",
            params={"include_inactive_clients": "true"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} visits including inactive clients")
    
    def test_create_provider_visit(self, midwife_session, test_client_id):
        """Test creating a unified provider visit"""
        session, user = midwife_session
        
        visit_data = {
            "client_id": test_client_id,
            "visit_date": "2026-01-26",
            "visit_type": "Prenatal",
            "blood_pressure": "120/75",
            "fetal_heart_rate": 152,
            "fundal_height": 33.0,
            "weight": 155.0,
            "weight_unit": "lbs",
            "eating_score": 4,
            "water_score": 4,
            "general_notes": "TEST_Provider: Unified visit - all vitals good"
        }
        
        response = session.post(f"{BASE_URL}/api/provider/visits", json=visit_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "visit_id" in data
        assert data["client_id"] == test_client_id
        assert data["visit_type"] == "Prenatal"
        assert "appointment_id" in data  # Should auto-create appointment
        assert "summary" in data  # Auto-generated summary
        assert "_id" not in data
        
        print(f"Created provider visit: {data['visit_id']}, appointment: {data['appointment_id']}")
        return data["visit_id"]
    
    def test_create_provider_visit_requires_client_id(self, midwife_session):
        """Test creating provider visit without client_id fails"""
        session, user = midwife_session
        
        visit_data = {
            "visit_date": "2026-01-27",
            "visit_type": "Prenatal"
        }
        
        response = session.post(f"{BASE_URL}/api/provider/visits", json=visit_data)
        assert response.status_code == 400
        print("Create provider visit without client_id correctly rejected")
    
    def test_update_provider_visit(self, midwife_session, test_client_id):
        """Test updating a provider visit"""
        session, user = midwife_session
        
        # Create a visit
        create_data = {
            "client_id": test_client_id,
            "visit_date": "2026-01-28",
            "visit_type": "Prenatal",
            "blood_pressure": "118/74",
            "general_notes": "TEST_ProviderUpdate: Initial note"
        }
        
        create_response = session.post(f"{BASE_URL}/api/provider/visits", json=create_data)
        assert create_response.status_code == 200
        visit_id = create_response.json()["visit_id"]
        
        # Update the visit
        update_data = {
            "blood_pressure": "116/72",
            "fetal_heart_rate": 148,
            "general_notes": "TEST_ProviderUpdate: Updated with additional vitals"
        }
        
        response = session.put(
            f"{BASE_URL}/api/provider/visits/{visit_id}",
            json=update_data
        )
        assert response.status_code == 200
        print(f"Updated provider visit: {visit_id}")
    
    def test_delete_provider_visit(self, midwife_session, test_client_id):
        """Test deleting a provider visit"""
        session, user = midwife_session
        
        # Create a visit to delete
        create_data = {
            "client_id": test_client_id,
            "visit_date": "2026-01-29",
            "visit_type": "Postpartum",
            "general_notes": "TEST_ProviderDelete: This will be deleted"
        }
        
        create_response = session.post(f"{BASE_URL}/api/provider/visits", json=create_data)
        assert create_response.status_code == 200
        visit_id = create_response.json()["visit_id"]
        
        # Delete the visit
        response = session.delete(f"{BASE_URL}/api/provider/visits/{visit_id}")
        assert response.status_code == 200
        print(f"Deleted provider visit: {visit_id}")
    
    def test_delete_nonexistent_provider_visit_returns_404(self, midwife_session):
        """Test deleting non-existent provider visit returns 404"""
        session, user = midwife_session
        
        response = session.delete(f"{BASE_URL}/api/provider/visits/nonexistent_visit_12345")
        assert response.status_code == 404
        print("DELETE nonexistent provider visit correctly returns 404")
    
    def test_update_nonexistent_provider_visit_returns_404(self, midwife_session):
        """Test updating non-existent provider visit returns 404"""
        session, user = midwife_session
        
        response = session.put(
            f"{BASE_URL}/api/provider/visits/nonexistent_visit_12345",
            json={"general_notes": "This should fail"}
        )
        assert response.status_code == 404
        print("PUT nonexistent provider visit correctly returns 404")


# ============== ROLE-BASED ACCESS CONTROL TESTS ==============

class TestRoleBasedAccessControl:
    """Tests verifying Doula cannot access Midwife-only visit routes"""
    
    def test_doula_cannot_get_midwife_visits(self, doula_session):
        """Test Doula cannot access GET /api/midwife/visits"""
        session, user = doula_session
        
        response = session.get(f"{BASE_URL}/api/midwife/visits")
        assert response.status_code == 403
        print("Doula correctly denied access to GET /api/midwife/visits")
    
    def test_doula_cannot_create_midwife_visit(self, doula_session):
        """Test Doula cannot access POST /api/midwife/visits"""
        session, user = doula_session
        
        visit_data = {
            "client_id": "some_client",
            "visit_date": "2026-01-30",
            "visit_type": "Prenatal"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/visits", json=visit_data)
        assert response.status_code == 403
        print("Doula correctly denied access to POST /api/midwife/visits")
    
    def test_doula_cannot_get_birth_summaries(self, doula_session):
        """Test Doula cannot access GET /api/midwife/birth-summaries"""
        session, user = doula_session
        
        response = session.get(f"{BASE_URL}/api/midwife/birth-summaries")
        assert response.status_code == 403
        print("Doula correctly denied access to GET /api/midwife/birth-summaries")
    
    def test_doula_cannot_create_birth_summary(self, doula_session):
        """Test Doula cannot access POST /api/midwife/birth-summaries"""
        session, user = doula_session
        
        summary_data = {
            "client_id": "some_client",
            "birth_datetime": "2026-01-30T10:00:00",
            "birth_place": "Home",
            "mode_of_birth": "Spontaneous Vaginal"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/birth-summaries", json=summary_data)
        assert response.status_code == 403
        print("Doula correctly denied access to POST /api/midwife/birth-summaries")
    
    def test_doula_cannot_get_provider_visits(self, doula_session):
        """Test Doula cannot access GET /api/provider/visits (MIDWIFE only)"""
        session, user = doula_session
        
        response = session.get(f"{BASE_URL}/api/provider/visits")
        assert response.status_code == 403
        print("Doula correctly denied access to GET /api/provider/visits")
    
    def test_doula_cannot_create_provider_visit(self, doula_session):
        """Test Doula cannot access POST /api/provider/visits"""
        session, user = doula_session
        
        visit_data = {
            "client_id": "some_client",
            "visit_date": "2026-01-30",
            "visit_type": "Prenatal"
        }
        
        response = session.post(f"{BASE_URL}/api/provider/visits", json=visit_data)
        assert response.status_code == 403
        print("Doula correctly denied access to POST /api/provider/visits")
    
    def test_doula_cannot_get_prenatal_visits(self, doula_session):
        """Test Doula cannot access prenatal visit assessments"""
        session, user = doula_session
        
        response = session.get(
            f"{BASE_URL}/api/midwife/clients/some_client_id/prenatal-visits"
        )
        assert response.status_code == 403
        print("Doula correctly denied access to prenatal visit assessments")


# ============== OBJECT ID SERIALIZATION TESTS ==============

class TestObjectIdSerialization:
    """Tests verifying MongoDB ObjectId is not included in responses"""
    
    def test_midwife_visits_no_objectid(self, midwife_session):
        """Test midwife visits responses don't include _id"""
        session, user = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/visits")
        assert response.status_code == 200
        data = response.json()
        
        for visit in data:
            assert "_id" not in visit, f"Found _id in visit: {visit.get('visit_id')}"
        
        print(f"Verified {len(data)} visits have no _id field")
    
    def test_provider_visits_no_objectid(self, midwife_session):
        """Test provider visits responses don't include _id"""
        session, user = midwife_session
        
        response = session.get(f"{BASE_URL}/api/provider/visits")
        assert response.status_code == 200
        data = response.json()
        
        for visit in data:
            assert "_id" not in visit, f"Found _id in visit: {visit.get('visit_id')}"
        
        print(f"Verified {len(data)} provider visits have no _id field")
    
    def test_birth_summaries_no_objectid(self, midwife_session):
        """Test birth summaries responses don't include _id"""
        session, user = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/birth-summaries")
        assert response.status_code == 200
        data = response.json()
        
        for summary in data:
            assert "_id" not in summary, f"Found _id in summary: {summary.get('summary_id')}"
        
        print(f"Verified {len(data)} birth summaries have no _id field")


# ============== VISIT SUMMARY GENERATION TESTS ==============

class TestVisitSummaryGeneration:
    """Tests for auto-generated visit summaries"""
    
    def test_provider_visit_generates_summary(self, midwife_session, test_client_id):
        """Test provider visit auto-generates summary from vitals"""
        session, user = midwife_session
        
        visit_data = {
            "client_id": test_client_id,
            "visit_date": "2026-01-30",
            "visit_type": "Prenatal",
            "blood_pressure": "118/74",
            "fetal_heart_rate": 150,
            "fundal_height": 32.0,
            "weight": 148.5,
            "weight_unit": "lbs"
        }
        
        response = session.post(f"{BASE_URL}/api/provider/visits", json=visit_data)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "BP 118/74" in summary
        assert "FHR 150" in summary
        assert "FH 32.0 cm" in summary
        assert "Wt 148.5 lbs" in summary
        
        print(f"Generated summary: {summary}")
    
    def test_prenatal_visit_generates_summary(self, midwife_session, test_client_id):
        """Test prenatal visit assessment auto-generates summary"""
        session, user = midwife_session
        
        assessment_data = {
            "visit_date": "2026-01-31",
            "blood_pressure": "120/80",
            "fetal_heart_rate": 145,
            "fundal_height": 33.5,
            "weight": 152.0,
            "weight_unit": "kg"
        }
        
        response = session.post(
            f"{BASE_URL}/api/midwife/clients/{test_client_id}/prenatal-visits",
            json=assessment_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        summary = data["summary"]
        assert "BP 120/80" in summary
        assert "FHR 145" in summary
        assert "kg" in summary  # Weight unit should be preserved
        
        print(f"Generated prenatal summary: {summary}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
