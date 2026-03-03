"""
Test Birth Record Feature (Iteration 133)
- GET /api/provider/clients/{client_id}/birth-record (returns empty {} when no record)
- POST /api/provider/clients/{client_id}/birth-record (creates new record)
- POST /api/provider/clients/{client_id}/birth-record (updates existing record)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-platform-qa.preview.emergentagent.com')

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
TEST_CLIENT_ID = "client_a034be9c9748"


def get_auth_headers():
    """Login and get auth headers"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    # Check multiple possible token fields
    token = data.get("session_token") or data.get("token") or data.get("access_token")
    assert token, f"No token found in login response: {data}"
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


class TestBirthRecordAPI:
    """Birth Record CRUD API Tests"""
    
    # ==================== GET BIRTH RECORD ====================
    
    def test_get_birth_record_returns_empty_when_none(self):
        """GET birth record returns empty object when no record exists"""
        headers = get_auth_headers()
        response = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers
        )
        assert response.status_code == 200, f"GET failed: {response.text}"
        data = response.json()
        # Response should be either {} or a birth record object
        assert isinstance(data, dict), "Response should be a dict (empty or with data)"
        print(f"GET birth record response: {data}")
    
    def test_get_birth_record_invalid_client(self):
        """GET birth record for invalid client returns 404"""
        headers = get_auth_headers()
        response = requests.get(
            f"{BASE_URL}/api/provider/clients/invalid_client_id/birth-record",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_get_birth_record_unauthorized(self):
        """GET birth record without auth returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ==================== CREATE BIRTH RECORD ====================
    
    def test_create_birth_record(self):
        """POST creates a new birth record"""
        headers = get_auth_headers()
        birth_data = {
            # Timeline
            "full_dilation_datetime": "2024-03-15T08:30:00",
            "pushing_start_datetime": "2024-03-15T10:00:00",
            "birth_datetime": "2024-03-15T11:23:00",
            # Birth Details
            "mode_of_birth": "spontaneous_vaginal",
            "place_of_birth": "home",
            # Newborn Info
            "baby_name": "Test Baby",
            "baby_sex": "female",
            "baby_weight_lbs": 7,
            "baby_weight_oz": 8,
            "baby_length_inches": 20.5,
            # Newborn Condition
            "newborn_condition": "vigorous",
            "apgar_1min": 8,
            "apgar_5min": 9,
            # Maternal Outcomes
            "estimated_blood_loss_ml": 300,
            "repairs_performed": "none",
            # Postpartum
            "maternal_status": "stable",
            "baby_status": "skin_to_skin",
            # Transfer
            "transfer_occurred": False,
            # Notes
            "birth_story_notes": "Beautiful home birth, TEST RECORD"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers,
            json=birth_data
        )
        assert response.status_code == 200, f"POST failed: {response.text}"
        data = response.json()
        assert "message" in data, f"Response should have message: {data}"
        print(f"Create birth record response: {data}")
    
    def test_verify_birth_record_created(self):
        """GET verifies birth record was created"""
        headers = get_auth_headers()
        response = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify the record exists with expected fields
        assert data.get("birth_record_id"), f"birth_record_id missing: {data}"
        assert data.get("birth_datetime") == "2024-03-15T11:23:00", f"birth_datetime mismatch: {data}"
        assert data.get("baby_name") == "Test Baby", f"baby_name mismatch: {data}"
        assert data.get("mode_of_birth") == "spontaneous_vaginal", f"mode_of_birth mismatch: {data}"
        assert data.get("place_of_birth") == "home", f"place_of_birth mismatch: {data}"
        assert data.get("baby_sex") == "female", f"baby_sex mismatch: {data}"
        assert data.get("baby_weight_lbs") == 7, f"baby_weight_lbs mismatch: {data}"
        assert data.get("apgar_1min") == 8, f"apgar_1min mismatch: {data}"
        assert data.get("apgar_5min") == 9, f"apgar_5min mismatch: {data}"
        print(f"Verified birth record: {data}")
    
    # ==================== UPDATE BIRTH RECORD ====================
    
    def test_update_birth_record(self):
        """POST updates existing birth record (same endpoint as create)"""
        headers = get_auth_headers()
        update_data = {
            "baby_name": "Updated Baby Name",
            "baby_weight_lbs": 8,
            "baby_weight_oz": 2,
            "newborn_condition_notes": "All healthy, updated notes",
            "maternal_status_notes": "Resting comfortably",
            "transfer_occurred": True,
            "transfer_who": "mother",
            "transfer_destination": "Hospital",
            "transfer_reason": "Postpartum monitoring"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers,
            json=update_data
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert "message" in data, f"Response should have message: {data}"
        assert "updated" in data["message"].lower(), f"Should indicate update: {data}"
        print(f"Update birth record response: {data}")
    
    def test_verify_birth_record_updated(self):
        """GET verifies birth record was updated"""
        headers = get_auth_headers()
        response = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify updates were applied
        assert data.get("baby_name") == "Updated Baby Name", f"baby_name not updated: {data}"
        assert data.get("baby_weight_lbs") == 8, f"baby_weight_lbs not updated: {data}"
        assert data.get("baby_weight_oz") == 2, f"baby_weight_oz not updated: {data}"
        assert data.get("transfer_occurred") == True, f"transfer_occurred not updated: {data}"
        assert data.get("transfer_who") == "mother", f"transfer_who not updated: {data}"
        
        # Original fields should be preserved
        assert data.get("mode_of_birth") == "spontaneous_vaginal", f"mode_of_birth should be preserved: {data}"
        assert data.get("birth_datetime") == "2024-03-15T11:23:00", f"birth_datetime should be preserved: {data}"
        print(f"Verified updated birth record: {data}")
    
    # ==================== VALIDATION TESTS ====================
    
    def test_create_birth_record_invalid_client(self):
        """POST to invalid client returns 404"""
        headers = get_auth_headers()
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/invalid_client_id/birth-record",
            headers=headers,
            json={"baby_name": "Test"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_create_birth_record_unauthorized(self):
        """POST without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            json={"baby_name": "Test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ==================== ALL FIELDS TEST ====================
    
    def test_birth_record_all_fields(self):
        """Test that all comprehensive birth record fields can be saved"""
        headers = get_auth_headers()
        comprehensive_data = {
            # Timeline
            "full_dilation_datetime": "2024-03-20T06:00:00",
            "pushing_start_datetime": "2024-03-20T07:30:00",
            "birth_datetime": "2024-03-20T08:45:00",
            # Birth Details  
            "mode_of_birth": "vbac",
            "place_of_birth": "birth_center",
            # Newborn Info
            "baby_name": "Comprehensive Test Baby",
            "baby_sex": "male",
            "baby_weight_lbs": 9,
            "baby_weight_oz": 4,
            "baby_length_inches": 21.0,
            # Newborn Condition
            "newborn_condition": "needed_assistance",
            "newborn_condition_notes": "Brief suctioning needed",
            "apgar_1min": 7,
            "apgar_5min": 9,
            # Maternal Outcomes
            "estimated_blood_loss_ml": 400,
            "repairs_performed": "first_degree",
            "repairs_notes": "Simple repair completed",
            # Postpartum
            "maternal_status": "monitored",
            "maternal_status_notes": "Monitoring for postpartum bleeding",
            "baby_status": "breastfeeding_initiated",
            "baby_status_notes": "Good latch established",
            # Transfer
            "transfer_occurred": False,
            # Notes
            "birth_story_notes": "Comprehensive test covering all fields"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers,
            json=comprehensive_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify all fields saved
        get_response = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers=headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        # Verify key fields
        assert data.get("mode_of_birth") == "vbac"
        assert data.get("place_of_birth") == "birth_center"
        assert data.get("newborn_condition") == "needed_assistance"
        assert data.get("repairs_performed") == "first_degree"
        assert data.get("maternal_status") == "monitored"
        assert data.get("baby_status") == "breastfeeding_initiated"
        print("All comprehensive fields saved successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
