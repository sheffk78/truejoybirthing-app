"""
Birth Plan API Tests - Iteration 3
Tests for the 9 birth plan sections with all CRUD operations
Updated for testing with provided session token
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://birth-team-platform.preview.emergentagent.com').rstrip('/')
# Provided test session token
SESSION_TOKEN = "session_dc13e4b27ecd4ae88c9cd3a54be242d7"
TEST_EMAIL = "birthplantest_1771201212@test.com"

# Expected 9 birth plan sections per the PDF specifications
EXPECTED_SECTIONS = [
    {"section_id": "about_me", "title": "About Me & My Preferences"},
    {"section_id": "labor_delivery", "title": "Labor & Delivery Preferences"},
    {"section_id": "pain_management", "title": "Pain Management"},
    {"section_id": "monitoring_iv", "title": "Labor Environment & Comfort"},
    {"section_id": "induction_interventions", "title": "Induction & Birth Interventions"},
    {"section_id": "pushing_safe_word", "title": "Pushing, Delivery & Safe Word"},
    {"section_id": "post_delivery", "title": "Post-Delivery Preferences"},
    {"section_id": "newborn_care", "title": "Newborn Care Preferences"},
    {"section_id": "other_considerations", "title": "Other Important Considerations"},
]

@pytest.fixture
def auth_headers():
    """Auth headers for authenticated requests"""
    return {
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Content-Type": "application/json"
    }

class TestAuthVerification:
    """Verify test user authentication is working"""
    
    def test_auth_me_returns_user_data(self, auth_headers):
        """GET /api/auth/me returns authenticated user"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["role"] == "MOM"
        assert data["email"] == TEST_EMAIL
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
        
    def test_birth_plan_has_correct_section_ids_and_titles(self, auth_headers):
        """All 9 expected section IDs and titles are present"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        sections = {s["section_id"]: s["title"] for s in data["sections"]}
        
        for expected in EXPECTED_SECTIONS:
            expected_id = expected["section_id"]
            expected_title = expected["title"]
            assert expected_id in sections, f"Missing section: {expected_id}"
            assert sections[expected_id] == expected_title, f"Wrong title for {expected_id}: got '{sections[expected_id]}', expected '{expected_title}'"
            print(f"✓ Section {expected_id}: '{sections[expected_id]}'")
    
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
    """Test PUT /api/birth-plan/section/{section_id} endpoint - one section at a time"""
    
    def test_update_about_me_section(self, auth_headers):
        """Update about_me section with PDF-specified fields"""
        payload = {
            "data": {
                "motherName": "Test Mom",
                "partnerName": "Test Partner",
                "emailAddress": TEST_EMAIL,
                "phoneNumber": "(555) 123-4567",
                "dueDate": "03/15/2026",
                "birthSupport": "John Doe (Partner), Jane Smith (Doula)",
                "doctorName": "Dr. Smith"
            },
            "notes_to_provider": "Please explain all procedures"
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
        """Update labor_delivery section with multiselect fields from PDF"""
        payload = {
            "data": {
                "clothingPreference": ["Hospital Gown"],
                "fetalMonitoring": ["Continuous External Monitoring (Belly Band)", "Intermittent External Monitoring (Doppler)"],
                "fetalMonitoringNotes": "Prefer minimal restriction",
                "ivSalineLock": ["Saline Lock Only"],
                "ivRationale": "",
                "eatingDrinking": "Yes",
                "eatingDrinkingNotes": "Water and light snacks"
            },
            "notes_to_provider": "I prefer a calm environment"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/labor_delivery",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated labor_delivery section with multiselect options")
        
    def test_update_pain_management_section(self, auth_headers):
        """Update pain_management section from PDF"""
        payload = {
            "data": {
                "painManagement": ["Epidural", "Nitrous Oxide (not standard)"],
                "painManagementOther": "Will try breathing techniques first"
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
        """Update monitoring_iv (Labor Environment & Comfort) section from PDF"""
        payload = {
            "data": {
                "laborEnvironment": ["Lighting", "Specific Sounds/Music", "Aromatherapy"],
                "environmentDescription": "Dim lights, calming music, lavender essential oil",
                "counterPressure": "Yes",
                "counterPressureDescription": "Firm counter pressure on my lower back during contractions",
                "physicalTouch": "Yes",
                "physicalTouchDetails": "Back rubs and hand holding"
            },
            "notes_to_provider": "I'm very sensitive to bright lights"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/monitoring_iv",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        print("✓ Updated monitoring_iv (Labor Environment) section")
        
    def test_update_induction_interventions_section(self, auth_headers):
        """Update induction_interventions section from PDF"""
        payload = {
            "data": {
                "inductionInterventions": ["Membrane Sweep", "Balloon Foley"],
                "inductionOther": "",
                "birthingInterventions": ["Vacuum Extraction"],
                "birthingOther": "",
                "movementDuringLabor": ["Free movement (walk, change positions as needed)", "Exercise ball", "Peanut ball"]
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
        """Update pushing_safe_word section with safe word from PDF"""
        payload = {
            "data": {
                "cervicalChecks": "Yes, only when asked for",
                "cervicalCheckFrequency": "",
                "pushing": "Mother-Led Pushing (intuitive pushing)",
                "mirrorDuringDelivery": "Yes",
                "photographyVideography": "Both Photos and Video",
                "safeWord": "PAUSE",
                "birthWordPreference": "Contractions being called surges"
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
        """Update post_delivery section from PDF"""
        payload = {
            "data": {
                "immediateSkinToSkin": "Yes",
                "delayedCordClamping": ["Yes", "Until placenta is completely drained and cord is limp and white"],
                "cuttingTheCord": "Partner",
                "cordCuttingOther": "",
                "placentaDelivery": "Spontaneous (natural delivery)",
                "placentaRetention": "Keep Placenta",
                "postpartumPitocin": "No",
                "postpartumPitocinRationale": "Prefer natural process unless medically necessary",
                "goldenHour": "Undisturbed bonding time with minimal interruptions",
                "feedingMethod": "Breastfeeding",
                "formulaType": ""
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
        """Update newborn_care section from PDF"""
        payload = {
            "data": {
                "antibacterialEyeOintment": "Yes",
                "hepatitisBVaccine": "Yes",
                "vitaminKShot": "Yes",
                "vernixCleaning": "Leave",
                "circumcision": ["No"],
                "newbornCareLocation": "Rooming-in (baby stays with mother)",
                "babyFootprints": "Yes"
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
        """Update other_considerations section from PDF"""
        payload = {
            "data": {
                "otherPreferences": "Thank you for respecting my preferences",
                "religiousCultural": "No specific requests",
                "allergies": "Penicillin allergy",
                "visitors": "Partner only during labor",
                "photographyNotes": "Professional photographer for birth",
                "musicPreferences": "Calm instrumental playlist"
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


class TestBirthPlanPersistence:
    """Test that data persists correctly after updates"""
        
    def test_verify_all_sections_persisted(self, auth_headers):
        """GET birth plan verifies all section data was persisted"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        data = response.json()
        
        # Find about_me section and verify it has data
        about_me = next((s for s in data["sections"] if s["section_id"] == "about_me"), None)
        assert about_me is not None
        assert about_me["status"] == "Complete"
        assert about_me["data"].get("motherName") == "Test Mom"
        print("✓ about_me section data correctly persisted")
        
        # Find pushing_safe_word section and verify safe word
        pushing = next((s for s in data["sections"] if s["section_id"] == "pushing_safe_word"), None)
        assert pushing is not None
        assert pushing["data"].get("safeWord") == "PAUSE"
        print("✓ pushing_safe_word safe word correctly persisted")
        
    def test_completion_percentage_increases_with_sections(self, auth_headers):
        """Completion percentage should reflect completed sections"""
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=auth_headers)
        data = response.json()
        
        completed_count = sum(1 for s in data["sections"] if s["status"] == "Complete")
        expected_percentage = (completed_count / 9) * 100
        
        # Allow some floating point variance
        assert abs(data["completion_percentage"] - expected_percentage) < 1, \
            f"Completion percentage mismatch: got {data['completion_percentage']}, expected ~{expected_percentage}"
        print(f"✓ Completion percentage correct: {data['completion_percentage']}% ({completed_count}/9 sections)")


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
        
    def test_export_plan_has_9_sections(self, auth_headers):
        """Export plan contains all 9 sections"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/export", headers=auth_headers)
        data = response.json()
        
        assert len(data["plan"]["sections"]) == 9
        print("✓ Export contains all 9 sections")


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
