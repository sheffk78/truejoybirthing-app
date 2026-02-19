"""
Birth Plan API Tests
Tests for the 9 birth plan sections with all CRUD operations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://provider-subs.preview.emergentagent.com').rstrip('/')
SESSION_TOKEN = "session_da507d0afef44a36b86836e42407a759"  # Test user session

# Expected 9 birth plan sections
EXPECTED_SECTIONS = [
    "about_me",
    "labor_delivery",
    "pain_management",
    "monitoring_iv",
    "induction_interventions",
    "pushing_safe_word",
    "post_delivery",
    "newborn_care",
    "other_considerations"
]

@pytest.fixture
def auth_headers():
    """Auth headers for authenticated requests"""
    return {
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    }

class TestAuthAndUserVerification:
    """Verify test user authentication is working"""
    
    def test_auth_me_returns_user_data(self, auth_headers):
        """GET /api/auth/me returns authenticated user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["role"] == "MOM"
        assert data["email"] == "testmom_1771199999@example.com"
        print(f"✓ Auth verified for user: {data['email']}")


class TestBirthPlanGet:
    """Test GET /api/birth-plan endpoint"""
    
    def test_birth_plan_returns_9_sections(self, auth_headers):
        """GET /api/birth-plan returns all 9 sections"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plan_id" in data
        assert "sections" in data
        assert len(data["sections"]) == 9, f"Expected 9 sections, got {len(data['sections'])}"
        print(f"✓ Birth plan has {len(data['sections'])} sections")
        
    def test_birth_plan_has_correct_section_ids(self, auth_headers):
        """All 9 expected section IDs are present"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        section_ids = [s["section_id"] for s in data["sections"]]
        
        for expected_id in EXPECTED_SECTIONS:
            assert expected_id in section_ids, f"Missing section: {expected_id}"
            print(f"✓ Found section: {expected_id}")
    
    def test_birth_plan_section_structure(self, auth_headers):
        """Each section has correct structure"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        data = response.json()
        
        for section in data["sections"]:
            assert "section_id" in section
            assert "title" in section
            assert "status" in section
            assert "data" in section
            assert section["status"] in ["Not started", "In progress", "Complete"]
        
        print("✓ All sections have correct structure")
    
    def test_birth_plan_has_completion_percentage(self, auth_headers):
        """Birth plan includes completion_percentage field"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        data = response.json()
        
        assert "completion_percentage" in data
        assert isinstance(data["completion_percentage"], (int, float))
        print(f"✓ Completion percentage: {data['completion_percentage']}%")


class TestBirthPlanSectionUpdate:
    """Test PUT /api/birth-plan/section/{section_id} endpoint"""
    
    def test_update_about_me_section(self, auth_headers):
        """Update about_me section with data and notes_to_provider"""
        payload = {
            "data": {
                "supportPeople": "Partner, Mom, Sister",
                "birthExperience": "Yes, this is my first baby",
                "birthVision": "A calm, supportive environment"
            },
            "notes_to_provider": "I have anxiety, please explain procedures before doing them"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Section updated"
        assert "completion_percentage" in data
        print(f"✓ Updated about_me section, completion: {data['completion_percentage']}%")
        
    def test_update_labor_delivery_section(self, auth_headers):
        """Update labor_delivery section with multiselect options"""
        payload = {
            "data": {
                "laborEnvironment": ["Dim lighting", "Music playing", "Freedom to move around"],
                "laborPositions": ["Walking/standing", "Sitting on birth ball"],
                "hydration": "I want to eat and drink as desired",
                "cervicalChecks": "Minimal - only when necessary"
            },
            "notes_to_provider": "I prefer a quiet environment"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/labor_delivery",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated labor_delivery section with multiselect options")
        
    def test_update_pain_management_section(self, auth_headers):
        """Update pain_management section"""
        payload = {
            "data": {
                "painPhilosophy": "I'm open to medication if needed",
                "naturalMethods": ["Breathing techniques", "Massage", "Hydrotherapy (shower/tub)"],
                "medicationOptions": ["Epidural", "Nitrous oxide (laughing gas)"],
                "epiduralTiming": "Try natural methods first"
            },
            "notes_to_provider": None
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/pain_management",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated pain_management section")
        
    def test_update_monitoring_iv_section(self, auth_headers):
        """Update monitoring_iv section"""
        payload = {
            "data": {
                "fetalMonitoring": "Intermittent monitoring (allows more movement)",
                "ivAccess": "Hep-lock only (no continuous fluids)",
                "ivPlacement": "Non-dominant hand preferred"
            },
            "notes_to_provider": "I'm scared of needles"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/monitoring_iv",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated monitoring_iv section")
        
    def test_update_induction_interventions_section(self, auth_headers):
        """Update induction_interventions section"""
        payload = {
            "data": {
                "inductionFeelings": "I'd like to discuss all options first",
                "inductionMethods": ["Natural methods first (walking, nipple stimulation)", "Discuss options when the time comes"],
                "episiotomy": "Prefer to avoid - allow natural tearing",
                "assistedDelivery": "Please discuss with me first"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/induction_interventions",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated induction_interventions section")
        
    def test_update_pushing_safe_word_section(self, auth_headers):
        """Update pushing_safe_word section with text input for safe word"""
        payload = {
            "data": {
                "pushingPosition": ["Side-lying", "Whatever feels right"],
                "pushingGuidance": "Mother-directed (push when I feel the urge)",
                "mirrorUse": "Maybe - ask me in the moment",
                "touchBaby": "Yes",
                "safeWord": "PAUSE",
                "safeWordMeaning": "Everyone stops, room gets quiet, partner checks in with me"
            },
            "notes_to_provider": "My safe word means I need a moment to collect myself"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/pushing_safe_word",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated pushing_safe_word section with safe word")
        
    def test_update_post_delivery_section(self, auth_headers):
        """Update post_delivery section"""
        payload = {
            "data": {
                "cordClamping": "Delayed cord clamping (wait until cord stops pulsing)",
                "cordCutting": "Partner/support person",
                "skinToSkin": "Yes - place baby on my chest immediately",
                "goldenHour": ["Minimize interruptions", "Initiate breastfeeding", "Take photos/videos"],
                "placentaDelivery": "Natural/physiological delivery"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/post_delivery",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated post_delivery section")
        
    def test_update_newborn_care_section(self, auth_headers):
        """Update newborn_care section"""
        payload = {
            "data": {
                "babyLocation": "Room with me 24/7",
                "feedingPlan": "Breastfeeding only",
                "feedingSupport": ["Lactation consultant visit", "Help with latching"],
                "newbornProcedures": ["Vitamin K injection", "Hearing screening", "Metabolic screening (heel prick)"],
                "bathing": "Delay 24+ hours",
                "pacifier": "No pacifiers please"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/newborn_care",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated newborn_care section")
        
    def test_update_other_considerations_section(self, auth_headers):
        """Update other_considerations section"""
        payload = {
            "data": {
                "photography": ["Partner/support person taking photos", "Photos of baby immediately after"],
                "students": "Please ask first each time",
                "visitors": "Only my partner and mom during labor, others can visit after delivery",
                "music": "Calm instrumental playlist on Spotify"
            },
            "notes_to_provider": "Thank you for supporting my birth preferences!"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/other_considerations",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated other_considerations section")
        
    def test_invalid_section_returns_404(self, auth_headers):
        """Updating non-existent section returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/invalid_section",
            headers=auth_headers,
            json={"data": {}}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid section correctly returns 404")
        
    def test_verify_section_data_persisted(self, auth_headers):
        """GET birth plan verifies data was persisted"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        data = response.json()
        
        # Find about_me section and verify it has data
        about_me = next((s for s in data["sections"] if s["section_id"] == "about_me"), None)
        assert about_me is not None
        assert about_me["status"] == "Complete"
        assert "supportPeople" in about_me["data"]
        print("✓ Section data correctly persisted to database")
        
    def test_section_status_updates_correctly(self, auth_headers):
        """Section status changes from Not started to Complete when data added"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        data = response.json()
        
        # Check statuses
        statuses = {s["section_id"]: s["status"] for s in data["sections"]}
        
        # Sections we updated should be Complete
        for section_id in ["about_me", "labor_delivery", "pain_management"]:
            assert statuses.get(section_id) == "Complete", f"{section_id} should be Complete"
            
        print("✓ Section statuses updated correctly")


class TestBirthPlanExport:
    """Test GET /api/birth-plan/export endpoint"""
    
    def test_export_returns_plan_data(self, auth_headers):
        """Export endpoint returns birth plan with user info"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/export", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "plan" in data
        assert "user_name" in data
        assert "due_date" in data
        assert "birth_setting" in data
        assert "export_note" in data
        print("✓ Export returns all required fields")
        
    def test_export_plan_has_sections(self, auth_headers):
        """Export plan contains all 9 sections"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/export", headers=auth_headers)
        data = response.json()
        
        assert len(data["plan"]["sections"]) == 9
        print("✓ Export contains all 9 sections")
        
    def test_export_includes_updated_data(self, auth_headers):
        """Export includes the section data we saved"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/export", headers=auth_headers)
        data = response.json()
        
        about_me = next((s for s in data["plan"]["sections"] if s["section_id"] == "about_me"), None)
        assert about_me is not None
        assert len(about_me["data"]) > 0
        print("✓ Export includes saved section data")


class TestUnauthorizedAccess:
    """Test endpoints require authentication"""
    
    def test_birth_plan_requires_auth(self):
        """GET /api/birth-plan without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 401
        print("✓ Birth plan correctly requires authentication")
        
    def test_section_update_requires_auth(self):
        """PUT section without auth returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            json={"data": {}}
        )
        assert response.status_code == 401
        print("✓ Section update correctly requires authentication")
        
    def test_export_requires_auth(self):
        """GET export without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/export")
        assert response.status_code == 401
        print("✓ Export correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
