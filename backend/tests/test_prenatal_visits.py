"""
Prenatal Visit Assessment API Tests

Tests all CRUD operations for the prenatal visit assessment feature:
- GET /api/midwife/clients/{client_id}/prenatal-visits - List all visits
- POST /api/midwife/clients/{client_id}/prenatal-visits - Create visit with all fields
- GET /api/midwife/clients/{client_id}/prenatal-visits/{visit_id} - Get single visit
- PUT /api/midwife/clients/{client_id}/prenatal-visits/{visit_id} - Update visit
- DELETE /api/midwife/clients/{client_id}/prenatal-visits/{visit_id} - Delete visit
- Summary generation includes BP, FHR, FH, Weight when provided
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://backend-refactor-53.preview.emergentagent.com').rstrip('/')

# Test credentials from main agent
MIDWIFE_EMAIL = "midwife@test.com"
MIDWIFE_PASSWORD = "password123"
TEST_CLIENT_ID = "client_4e6f8101b891"


class TestMidwifeAuth:
    """Test midwife authentication"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_midwife_login(self, session):
        """Test midwife login and return session token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        print(f"Midwife login successful - user_id: {data['user_id']}")
        return data


class TestPrenatalVisitsAPI:
    """Test prenatal visit assessment CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Create authenticated session for all tests"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    @pytest.fixture(scope="class")
    def created_visit_id(self, auth_session):
        """Track created visit for cleanup"""
        self._created_visit_id = None
        yield
        # Cleanup after class
        if hasattr(self, '_created_visit_id') and self._created_visit_id:
            auth_session.delete(
                f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{self._created_visit_id}"
            )
    
    # === GET List Visits ===
    def test_list_prenatal_visits_returns_200(self, auth_session):
        """GET /api/midwife/clients/{client_id}/prenatal-visits returns 200"""
        response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"List visits returned {len(data)} visits")
    
    def test_list_visits_without_auth_returns_401(self):
        """GET without auth should return 401"""
        session = requests.Session()
        response = session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits"
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated request correctly rejected")
    
    def test_list_visits_invalid_client_returns_404(self, auth_session):
        """GET with invalid client_id returns 404"""
        response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/invalid_client_123/prenatal-visits"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Invalid client correctly rejected with 404")
    
    # === POST Create Visit ===
    def test_create_prenatal_visit_with_all_fields(self, auth_session):
        """POST creates visit with all fields including well-being scores"""
        visit_data = {
            "client_id": TEST_CLIENT_ID,
            "visit_date": "2026-01-15T10:00:00Z",
            # Vitals & Measurements
            "urinalysis": "Normal",
            "urinalysis_note": "Clear specimen",
            "blood_pressure": "118/72",
            "fetal_heart_rate": 145,
            "fundal_height": 28.5,
            "weight": 165.5,
            "weight_unit": "lbs",
            # Well-being scores (1-5)
            "eating_score": 4,
            "eating_note": "Eating well, good appetite",
            "water_score": 3,
            "water_note": "Could drink more water",
            "emotional_score": 5,
            "emotional_note": "Feeling great emotionally",
            "physical_score": 4,
            "physical_note": "Some back discomfort",
            "mental_score": 4,
            "mental_note": "Generally positive mindset",
            "spiritual_score": 5,
            "spiritual_note": "Feeling connected",
            "general_notes": "Routine prenatal visit, all vitals normal"
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json=visit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify returned data
        assert "prenatal_visit_id" in data, "Response should contain prenatal_visit_id"
        assert data["client_id"] == TEST_CLIENT_ID
        assert data["blood_pressure"] == "118/72"
        assert data["fetal_heart_rate"] == 145
        assert data["fundal_height"] == 28.5
        assert data["weight"] == 165.5
        assert data["eating_score"] == 4
        assert data["emotional_score"] == 5
        
        # Verify summary generation
        assert "summary" in data
        summary = data["summary"]
        assert "BP 118/72" in summary, f"Summary should contain BP: {summary}"
        assert "FHR 145" in summary, f"Summary should contain FHR: {summary}"
        assert "FH 28.5 cm" in summary, f"Summary should contain FH: {summary}"
        assert "Wt 165.5 lbs" in summary, f"Summary should contain Wt: {summary}"
        
        print(f"Created visit with ID: {data['prenatal_visit_id']}")
        print(f"Summary generated: {summary}")
        
        # Store for later tests
        self._created_visit_id = data["prenatal_visit_id"]
        return data
    
    def test_create_visit_minimal_data(self, auth_session):
        """POST creates visit with only required fields"""
        visit_data = {
            "client_id": TEST_CLIENT_ID,
            "visit_date": "2026-01-10T09:00:00Z"
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json=visit_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "prenatal_visit_id" in data
        assert data["summary"] == "Visit recorded", f"Minimal visit should have default summary: {data.get('summary')}"
        
        # Cleanup
        auth_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{data['prenatal_visit_id']}"
        )
        print(f"Minimal visit created and cleaned up")
    
    def test_create_visit_without_auth_returns_401(self):
        """POST without auth returns 401"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={"client_id": TEST_CLIENT_ID, "visit_date": "2026-01-15T10:00:00Z"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    # === GET Single Visit ===
    def test_get_single_prenatal_visit(self, auth_session):
        """GET single visit returns complete data"""
        # First create a visit
        visit_data = {
            "client_id": TEST_CLIENT_ID,
            "visit_date": "2026-01-12T11:00:00Z",
            "blood_pressure": "120/80",
            "fetal_heart_rate": 140,
            "eating_score": 5
        }
        
        create_response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json=visit_data
        )
        assert create_response.status_code == 200
        created = create_response.json()
        visit_id = created["prenatal_visit_id"]
        
        # Get the visit
        get_response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        data = get_response.json()
        
        # Verify data persistence
        assert data["prenatal_visit_id"] == visit_id
        assert data["blood_pressure"] == "120/80"
        assert data["fetal_heart_rate"] == 140
        assert data["eating_score"] == 5
        print(f"Single visit GET verified")
        
        # Cleanup
        auth_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
    
    def test_get_nonexistent_visit_returns_404(self, auth_session):
        """GET nonexistent visit returns 404"""
        response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/pv_nonexistent123"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Nonexistent visit correctly returns 404")
    
    # === PUT Update Visit ===
    def test_update_prenatal_visit_vitals(self, auth_session):
        """PUT updates vitals and regenerates summary"""
        # Create visit first
        visit_data = {
            "client_id": TEST_CLIENT_ID,
            "visit_date": "2026-01-13T10:00:00Z",
            "blood_pressure": "115/75",
            "fetal_heart_rate": 138
        }
        
        create_response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json=visit_data
        )
        created = create_response.json()
        visit_id = created["prenatal_visit_id"]
        
        # Update the visit
        update_data = {
            "blood_pressure": "122/78",
            "weight": 168.0,
            "weight_unit": "lbs",
            "fundal_height": 30.0,
            "emotional_score": 4,
            "emotional_note": "Feeling better today"
        }
        
        update_response = auth_session.put(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}",
            json=update_data
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update persisted
        get_response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
        data = get_response.json()
        
        assert data["blood_pressure"] == "122/78", f"BP not updated: {data.get('blood_pressure')}"
        assert data["weight"] == 168.0
        assert data["fundal_height"] == 30.0
        assert data["emotional_score"] == 4
        
        # Verify summary was regenerated
        assert "BP 122/78" in data["summary"], f"Summary not updated: {data.get('summary')}"
        assert "FH 30.0 cm" in data["summary"]
        assert "Wt 168.0 lbs" in data["summary"]
        
        print(f"Visit updated successfully, new summary: {data['summary']}")
        
        # Cleanup
        auth_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
    
    def test_update_visit_empty_body_returns_400(self, auth_session):
        """PUT with empty body returns 400"""
        # Create visit
        create_response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={"client_id": TEST_CLIENT_ID, "visit_date": "2026-01-14T10:00:00Z"}
        )
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Update with empty body
        update_response = auth_session.put(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}",
            json={}
        )
        
        assert update_response.status_code == 400, f"Expected 400, got {update_response.status_code}"
        
        # Cleanup
        auth_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
        print("Empty update correctly rejected with 400")
    
    def test_update_nonexistent_visit_returns_404(self, auth_session):
        """PUT on nonexistent visit returns 404"""
        response = auth_session.put(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/pv_nonexistent456",
            json={"blood_pressure": "120/80"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # === DELETE Visit ===
    def test_delete_prenatal_visit(self, auth_session):
        """DELETE removes visit and returns 200"""
        # Create visit
        create_response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={
                "client_id": TEST_CLIENT_ID,
                "visit_date": "2026-01-16T10:00:00Z",
                "blood_pressure": "118/76"
            }
        )
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Delete the visit
        delete_response = auth_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        # Verify it's deleted
        get_response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
        
        assert get_response.status_code == 404, "Deleted visit should return 404 on GET"
        print("Visit deleted successfully")
    
    def test_delete_nonexistent_visit_returns_404(self, auth_session):
        """DELETE nonexistent visit returns 404"""
        response = auth_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/pv_nonexistent789"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestSummaryGeneration:
    """Test summary generation includes vitals correctly"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_summary_includes_bp_only(self, auth_session):
        """Summary with only BP"""
        response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={
                "client_id": TEST_CLIENT_ID,
                "visit_date": "2026-01-20T10:00:00Z",
                "blood_pressure": "115/70"
            }
        )
        data = response.json()
        assert data["summary"] == "BP 115/70", f"Summary: {data['summary']}"
        
        auth_session.delete(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{data['prenatal_visit_id']}")
    
    def test_summary_includes_fhr_only(self, auth_session):
        """Summary with only FHR"""
        response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={
                "client_id": TEST_CLIENT_ID,
                "visit_date": "2026-01-21T10:00:00Z",
                "fetal_heart_rate": 142
            }
        )
        data = response.json()
        assert data["summary"] == "FHR 142", f"Summary: {data['summary']}"
        
        auth_session.delete(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{data['prenatal_visit_id']}")
    
    def test_summary_includes_all_vitals(self, auth_session):
        """Summary includes all vitals when provided"""
        response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={
                "client_id": TEST_CLIENT_ID,
                "visit_date": "2026-01-22T10:00:00Z",
                "blood_pressure": "120/80",
                "fetal_heart_rate": 150,
                "fundal_height": 32.5,
                "weight": 170,
                "weight_unit": "lbs"
            }
        )
        data = response.json()
        summary = data["summary"]
        
        assert "BP 120/80" in summary, f"Missing BP in summary: {summary}"
        assert "FHR 150" in summary, f"Missing FHR in summary: {summary}"
        assert "FH 32.5 cm" in summary, f"Missing FH in summary: {summary}"
        assert "Wt 170" in summary and "lbs" in summary, f"Missing Wt in summary: {summary}"
        
        print(f"Full summary: {summary}")
        auth_session.delete(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{data['prenatal_visit_id']}")
    
    def test_summary_with_kg_weight_unit(self, auth_session):
        """Summary correctly shows kg weight unit"""
        response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json={
                "client_id": TEST_CLIENT_ID,
                "visit_date": "2026-01-23T10:00:00Z",
                "weight": 75.5,
                "weight_unit": "kg"
            }
        )
        data = response.json()
        assert "Wt 75.5 kg" in data["summary"], f"Summary: {data['summary']}"
        
        auth_session.delete(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{data['prenatal_visit_id']}")


class TestExistingVisit:
    """Test with the existing visit from main agent"""
    
    EXISTING_VISIT_ID = "pv_8c4299012542"
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_get_existing_visit(self, auth_session):
        """Verify existing test visit can be retrieved"""
        response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{self.EXISTING_VISIT_ID}"
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"Existing visit found: {data}")
            assert data["prenatal_visit_id"] == self.EXISTING_VISIT_ID
            assert "summary" in data
            print(f"Existing visit summary: {data.get('summary')}")
        elif response.status_code == 404:
            print("Existing visit not found - may have been cleaned up")
            pytest.skip("Existing test visit not found")


class TestWellBeingScores:
    """Test well-being scores validation and persistence"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_all_wellbeing_scores_persist(self, auth_session):
        """All 6 well-being scores persist correctly"""
        visit_data = {
            "client_id": TEST_CLIENT_ID,
            "visit_date": "2026-01-25T10:00:00Z",
            "eating_score": 1,
            "eating_note": "Poor appetite",
            "water_score": 2,
            "water_note": "Needs improvement",
            "emotional_score": 3,
            "emotional_note": "Neutral",
            "physical_score": 4,
            "physical_note": "Good energy",
            "mental_score": 5,
            "mental_note": "Very positive",
            "spiritual_score": 4,
            "spiritual_note": "Connected"
        }
        
        # Create
        create_response = auth_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            json=visit_data
        )
        assert create_response.status_code == 200
        visit_id = create_response.json()["prenatal_visit_id"]
        
        # Verify via GET
        get_response = auth_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}"
        )
        data = get_response.json()
        
        assert data["eating_score"] == 1
        assert data["eating_note"] == "Poor appetite"
        assert data["water_score"] == 2
        assert data["emotional_score"] == 3
        assert data["physical_score"] == 4
        assert data["mental_score"] == 5
        assert data["spiritual_score"] == 4
        
        print("All well-being scores persisted correctly")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits/{visit_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
