"""
Test Newborn Exam API Endpoints - Iteration 148

Tests for: POST/GET/PUT/DELETE /api/newborn-exam/
Features: Midwife creates newborn exam with collapsible sections, toggles, system-by-system examination
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://theme-unify-preview.preview.emergentagent.com').rstrip('/')

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestNewbornExamAPI:
    """Test Newborn Exam CRUD operations for Midwife users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and find a client for testing"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as midwife
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Midwife login failed: {login_response.status_code} - {login_response.text}")
        
        login_data = login_response.json()
        self.token = login_data.get("session_token")
        self.user_id = login_data.get("user", {}).get("user_id")
        
        assert self.token, "No session token in login response"
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get a client for testing
        clients_response = self.session.get(f"{BASE_URL}/api/midwife/clients")
        if clients_response.status_code == 200:
            clients = clients_response.json()
            if clients:
                self.client_id = clients[0].get("client_id")
                self.client_name = clients[0].get("name")
            else:
                pytest.skip("No clients found for midwife")
        else:
            pytest.skip(f"Could not get clients: {clients_response.status_code}")
        
        self.created_exam_id = None
        yield
        
        # Cleanup: delete any test exam created
        if self.created_exam_id:
            try:
                self.session.delete(f"{BASE_URL}/api/newborn-exam/{self.created_exam_id}")
            except:
                pass
    
    def test_01_create_newborn_exam_draft(self):
        """Test creating a new newborn exam as draft"""
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_Baby_{uuid.uuid4().hex[:6]}",
            "parent_names": "Test Parent",
            "date_of_birth": "2024-12-15",
            "place_of_birth": "home",
            "exam_location": "Client's home",
            "examiner_name": "Test Midwife",
            "examiner_credentials": "CPM",
            "temperature": 98.6,
            "temperature_unit": "F",
            "heart_rate": 140,
            "respiratory_rate": 45,
            "current_weight": 7.5,
            "current_weight_unit": "lbs",
            "is_draft": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "exam_id" in data, "Response should contain exam_id"
        assert data["baby_name"] == exam_data["baby_name"], "Baby name should match"
        assert data["is_draft"] == True, "Should be saved as draft"
        assert data["temperature"] == 98.6, "Temperature should match"
        assert data["heart_rate"] == 140, "Heart rate should match"
        
        self.created_exam_id = data["exam_id"]
        print(f"✓ Created newborn exam draft: {self.created_exam_id}")
    
    def test_02_get_newborn_exams_for_client(self):
        """Test getting all newborn exams for a client"""
        # First create an exam
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_GetExams_{uuid.uuid4().hex[:6]}",
            "is_draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        assert create_response.status_code == 200
        self.created_exam_id = create_response.json()["exam_id"]
        
        # Get all exams for client
        response = self.session.get(f"{BASE_URL}/api/newborn-exam/client/{self.client_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Retrieved {len(data)} newborn exams for client")
    
    def test_03_get_single_newborn_exam(self):
        """Test getting a single newborn exam by ID"""
        # First create an exam
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_SingleExam_{uuid.uuid4().hex[:6]}",
            "temperature": 98.4,
            "heart_rate": 135,
            "is_draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        assert create_response.status_code == 200
        exam_id = create_response.json()["exam_id"]
        self.created_exam_id = exam_id
        
        # Get single exam
        response = self.session.get(f"{BASE_URL}/api/newborn-exam/{exam_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["exam_id"] == exam_id, "Exam ID should match"
        assert data["temperature"] == 98.4, "Temperature should match"
        assert data["heart_rate"] == 135, "Heart rate should match"
        print(f"✓ Retrieved single newborn exam: {exam_id}")
    
    def test_04_update_newborn_exam(self):
        """Test updating a newborn exam"""
        # First create an exam
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_UpdateExam_{uuid.uuid4().hex[:6]}",
            "temperature": 98.0,
            "is_draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        assert create_response.status_code == 200
        exam_id = create_response.json()["exam_id"]
        self.created_exam_id = exam_id
        
        # Update the exam
        update_data = {
            "temperature": 99.2,
            "heart_rate": 150,
            "overall_assessment": "healthy",
            "feeding_method": "breast",
            "feeding_quality": "effective"
        }
        
        response = self.session.put(f"{BASE_URL}/api/newborn-exam/{exam_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["temperature"] == 99.2, "Temperature should be updated"
        assert data["heart_rate"] == 150, "Heart rate should be updated"
        assert data["overall_assessment"] == "healthy", "Assessment should be updated"
        assert data["feeding_method"] == "breast", "Feeding method should be updated"
        print(f"✓ Updated newborn exam: {exam_id}")
    
    def test_05_update_exam_with_system_exams(self):
        """Test updating exam with system-by-system examination data"""
        # First create an exam
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_SystemExam_{uuid.uuid4().hex[:6]}",
            "is_draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        assert create_response.status_code == 200
        exam_id = create_response.json()["exam_id"]
        self.created_exam_id = exam_id
        
        # Update with system exam data
        update_data = {
            "exam_skin": {"status": "normal", "notes": ""},
            "exam_head_face": {"status": "normal", "notes": ""},
            "exam_eyes": {"status": "normal", "notes": ""},
            "exam_ears": {"status": "abnormal", "notes": "Small skin tag on left ear"},
            "exam_heart": {"status": "normal", "notes": ""},
            "exam_neurologic_reflexes": {"status": "normal", "notes": "All reflexes present"}
        }
        
        response = self.session.put(f"{BASE_URL}/api/newborn-exam/{exam_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["exam_ears"]["status"] == "abnormal", "Ears exam status should be abnormal"
        assert "skin tag" in data["exam_ears"]["notes"].lower(), "Ears exam notes should contain the finding"
        print(f"✓ Updated exam with system examination data: {exam_id}")
    
    def test_06_save_exam_as_finalized(self):
        """Test saving an exam as finalized (not draft)"""
        # Create a complete exam
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_Finalize_{uuid.uuid4().hex[:6]}",
            "parent_names": "Test Parents",
            "date_of_birth": "2024-12-20",
            "place_of_birth": "home",
            "temperature": 98.6,
            "heart_rate": 140,
            "overall_assessment": "healthy",
            "is_draft": False  # Save as finalized
        }
        
        response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        self.created_exam_id = data["exam_id"]
        assert data["is_draft"] == False, "Should be saved as finalized"
        print(f"✓ Created finalized newborn exam: {data['exam_id']}")
    
    def test_07_delete_newborn_exam(self):
        """Test deleting a newborn exam"""
        # First create an exam
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_DeleteExam_{uuid.uuid4().hex[:6]}",
            "is_draft": True
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        assert create_response.status_code == 200
        exam_id = create_response.json()["exam_id"]
        
        # Delete the exam
        response = self.session.delete(f"{BASE_URL}/api/newborn-exam/{exam_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/newborn-exam/{exam_id}")
        assert get_response.status_code == 404, "Deleted exam should return 404"
        
        # Clear since we already deleted it
        self.created_exam_id = None
        print(f"✓ Deleted newborn exam: {exam_id}")
    
    def test_08_exam_not_found_error(self):
        """Test that accessing non-existent exam returns 404"""
        fake_exam_id = "nbexam_nonexistent123"
        
        response = self.session.get(f"{BASE_URL}/api/newborn-exam/{fake_exam_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent exam returns 404")
    
    def test_09_exam_with_risk_flags(self):
        """Test creating exam with risk flags"""
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_RiskFlags_{uuid.uuid4().hex[:6]}",
            "gestational_age_weeks": 37,
            "gestational_age_days": 4,
            "type_of_birth": "spontaneous_vaginal",
            "risk_flags": ["gbs_positive", "meconium"],
            "risk_flags_notes": "GBS+ mother, meconium in amniotic fluid",
            "is_draft": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        self.created_exam_id = data["exam_id"]
        assert "gbs_positive" in data["risk_flags"], "Risk flags should include GBS+"
        assert "meconium" in data["risk_flags"], "Risk flags should include meconium"
        print(f"✓ Created exam with risk flags: {data['exam_id']}")
    
    def test_10_exam_with_education_given(self):
        """Test creating exam with education checklist"""
        exam_data = {
            "client_id": self.client_id,
            "baby_name": f"TEST_Education_{uuid.uuid4().hex[:6]}",
            "overall_assessment": "healthy",
            "education_given": ["normal_appearance", "feeding_basics", "cord_care", "safe_sleep", "when_to_call"],
            "plan_notes": "Routine follow-up in 1 week",
            "is_draft": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/newborn-exam", json=exam_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        self.created_exam_id = data["exam_id"]
        assert len(data["education_given"]) == 5, "Should have 5 education topics"
        assert "feeding_basics" in data["education_given"], "Education should include feeding basics"
        print(f"✓ Created exam with education checklist: {data['exam_id']}")


class TestNewbornExamAuthorization:
    """Test authorization for Newborn Exam endpoints"""
    
    def test_mom_cannot_access_newborn_exam(self):
        """Test that Mom users cannot access newborn exam endpoints"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as mom
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Mom login failed")
        
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access newborn exam endpoints
        response = session.get(f"{BASE_URL}/api/newborn-exam/client/some_client_id")
        
        # Should get 403 (forbidden) or 404 (not found, since mom doesn't have clients)
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}"
        print("✓ Mom cannot access newborn exam endpoints (expected)")
    
    def test_doula_cannot_access_newborn_exam(self):
        """Test that Doula users cannot access newborn exam endpoints"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as doula
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Doula login failed")
        
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to access newborn exam endpoints
        response = session.get(f"{BASE_URL}/api/newborn-exam/client/some_client_id")
        
        # Should get 403 (forbidden) since only MIDWIFE can access
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Doula cannot access newborn exam endpoints (expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
