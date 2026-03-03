"""
Labor Records API Tests - iteration 132
Tests the Labor Record feature for midwives:
- GET /api/midwife/clients/{client_id}/labor-records
- POST /api/midwife/clients/{client_id}/labor-records
- PUT /api/midwife/clients/{client_id}/labor-records/{record_id}
- DELETE /api/midwife/clients/{client_id}/labor-records/{record_id}
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://care-plan-test.preview.emergentagent.com').rstrip('/')

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
TEST_CLIENT_ID = "client_a034be9c9748"


@pytest.fixture(scope="module")
def midwife_session():
    """Authenticate as midwife and return session with token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    
    data = response.json()
    token = data.get('session_token')
    assert token, "No session_token returned"
    
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


class TestLaborRecordsGet:
    """Tests for GET labor records"""
    
    def test_get_labor_records_success(self, midwife_session):
        """GET /api/midwife/clients/{client_id}/labor-records returns records"""
        response = midwife_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least one existing record
        assert len(data) >= 1, "Expected at least 1 labor record"
        
        # Validate record structure
        record = data[0]
        assert "labor_record_id" in record
        assert "client_id" in record
        assert "entry_datetime" in record
        assert "summary" in record
        
    def test_get_labor_records_invalid_client(self, midwife_session):
        """GET with invalid client returns 404"""
        response = midwife_session.get(
            f"{BASE_URL}/api/midwife/clients/invalid_client_123/labor-records"
        )
        assert response.status_code == 404


class TestLaborRecordsCRUD:
    """Tests for Create, Update, Delete labor records"""
    
    def test_create_labor_record(self, midwife_session):
        """POST /api/midwife/clients/{client_id}/labor-records creates record"""
        test_id = uuid.uuid4().hex[:8]
        
        payload = {
            "labor_stage": "early",
            "dilation_cm": 3,
            "effacement_percent": 50,
            "station": "-2",
            "contractions_per_10min": 2,
            "contraction_duration_sec": 45,
            "contraction_strength": "mild",
            "membranes_status": "intact",
            "maternal_bp": "118/76",
            "maternal_pulse": 82,
            "fetal_heart_rate": 140,
            "general_notes": f"TEST_LABOR_{test_id} - pytest test record"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["labor_record_id"].startswith("labor_")
        assert data["labor_stage"] == "early"
        assert data["dilation_cm"] == 3.0
        assert data["effacement_percent"] == 50
        assert data["station"] == "-2"
        assert data["maternal_bp"] == "118/76"
        assert data["fetal_heart_rate"] == 140
        assert "summary" in data
        
        # Store for cleanup
        pytest.test_record_id = data["labor_record_id"]
        
    def test_update_labor_record(self, midwife_session):
        """PUT /api/midwife/clients/{client_id}/labor-records/{record_id} updates"""
        record_id = getattr(pytest, 'test_record_id', None)
        if not record_id:
            pytest.skip("No record to update - create test failed")
        
        update_payload = {
            "labor_stage": "active",
            "dilation_cm": 5,
            "effacement_percent": 70,
            "station": "-1",
            "contraction_strength": "moderate",
            "general_notes": "Updated to active labor"
        }
        
        response = midwife_session.put(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/{record_id}",
            json=update_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["labor_stage"] == "active"
        assert data["dilation_cm"] == 5.0
        assert data["station"] == "-1"
        
        # Verify with GET
        get_response = midwife_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/{record_id}"
        )
        assert get_response.status_code == 200
        assert get_response.json()["labor_stage"] == "active"
        
    def test_delete_labor_record(self, midwife_session):
        """DELETE /api/midwife/clients/{client_id}/labor-records/{record_id} deletes"""
        record_id = getattr(pytest, 'test_record_id', None)
        if not record_id:
            pytest.skip("No record to delete - create test failed")
        
        response = midwife_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/{record_id}"
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Labor record deleted"
        
        # Verify deletion with GET
        verify_response = midwife_session.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/{record_id}"
        )
        assert verify_response.status_code == 404


class TestLaborRecordsValidation:
    """Tests for labor record validation and edge cases"""
    
    def test_create_minimal_record(self, midwife_session):
        """Create record with minimal fields (just general notes)"""
        payload = {
            "general_notes": "TEST - minimal labor record"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        record_id = data["labor_record_id"]
        assert data["summary"] == "Labor update"  # Default summary when no fields
        
        # Cleanup
        midwife_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/{record_id}"
        )
        
    def test_create_full_record(self, midwife_session):
        """Create record with all fields populated"""
        payload = {
            "labor_stage": "transition",
            "stage_notes": "Patient very focused",
            "dilation_cm": 8,
            "effacement_percent": 95,
            "station": "0",
            "contractions_per_10min": 5,
            "contraction_duration_sec": 90,
            "contraction_strength": "strong",
            "membranes_status": "ruptured",
            "rupture_time": "10:30",
            "fluid_color": "clear",
            "fluid_amount": "normal",
            "maternal_bp": "130/82",
            "maternal_pulse": 98,
            "maternal_temp": 98.8,
            "maternal_respirations": 20,
            "maternal_position": "hands and knees",
            "pain_coping_level": 8,
            "coping_methods": "breathing, water therapy, partner massage",
            "emotional_status": "Determined and focused",
            "fetal_heart_rate": 148,
            "fhr_baseline": "normal",
            "fhr_variability": "moderate",
            "decelerations": "none",
            "fetal_concerns": "None noted",
            "interventions": "Position changes, IV fluids",
            "medications_given": "None",
            "communication_notes": "OB notified of progress",
            "general_notes": "TEST - full record for validation"
        }
        
        response = midwife_session.post(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        record_id = data["labor_record_id"]
        
        # Verify all fields
        assert data["labor_stage"] == "transition"
        assert data["dilation_cm"] == 8.0
        assert data["fhr_baseline"] == "normal"
        assert data["maternal_position"] == "hands and knees"
        assert "Transition | 8.0cm" in data["summary"]
        
        # Cleanup
        midwife_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/{record_id}"
        )
        
    def test_update_nonexistent_record(self, midwife_session):
        """PUT to non-existent record returns 404"""
        response = midwife_session.put(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/labor_nonexistent123",
            json={"dilation_cm": 10}
        )
        assert response.status_code == 404
        
    def test_delete_nonexistent_record(self, midwife_session):
        """DELETE non-existent record returns 404"""
        response = midwife_session.delete(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records/labor_nonexistent456"
        )
        assert response.status_code == 404


class TestLaborRecordsAuthorization:
    """Tests for authorization on labor records"""
    
    def test_unauthorized_access(self):
        """Access without auth token returns 401/403"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records"
        )
        assert response.status_code in [401, 403]
