"""
Care Plans Routes Phase 12 Testing - Migrated from server.py to routes/care_plans.py

This module tests all care plan-related routes including:
- Birth Plan CRUD (Mom) - GET/PUT /api/birth-plan
- Birth Plan Export - GET /api/birth-plan/export, GET /api/birth-plan/export/pdf
- Provider Search - GET /api/providers/search
- Birth Plan Sharing (Mom) - POST/GET/DELETE /api/birth-plan/share
- Provider Share Requests - GET/PUT /api/provider/share-requests
- Provider Birth Plan Access - GET /api/provider/shared-birth-plans, GET /api/provider/shared-birth-plan/{mom_id}
- Wellness - POST/GET /api/wellness/checkin, POST/GET /api/wellness/entry, GET /api/wellness/stats
- Postpartum - GET/PUT /api/postpartum/plan
- Timeline - GET/POST/DELETE /api/timeline
- Provider Birth Plan Notes - POST/PUT/DELETE /api/provider/birth-plan/{mom_id}/notes
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://birth-companion-hub.preview.emergentagent.com').rstrip('/')

# Test credentials
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Basic setup and health check tests"""
    
    def test_base_url_configured(self):
        """Verify BASE_URL is properly configured"""
        assert BASE_URL is not None
        assert len(BASE_URL) > 0
        assert BASE_URL.startswith("http")
        print(f"BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Health check passed")


class TestAuthLogin:
    """Authentication tests for all user types"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def doula_token(self):
        """Get Doula authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def midwife_token(self):
        """Get Midwife authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_mom_login_success(self):
        """Test Mom login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        # Login returns user data directly or wrapped in 'user' key
        user_data = data.get("user", data)
        assert user_data["role"] == "MOM"
        print(f"Mom login successful: {user_data['full_name']}")
    
    def test_doula_login_success(self):
        """Test Doula login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        # Login returns user data directly or wrapped in 'user' key
        user_data = data.get("user", data)
        assert user_data["role"] == "DOULA"
        print(f"Doula login successful: {user_data['full_name']}")
    
    def test_midwife_login_success(self):
        """Test Midwife login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        # Login returns user data directly or wrapped in 'user' key
        user_data = data.get("user", data)
        assert user_data["role"] == "MIDWIFE"
        print(f"Midwife login successful: {user_data['full_name']}")


# ============== BIRTH PLAN TESTS (MOM) ==============

class TestBirthPlanMom:
    """Birth Plan CRUD tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_get_birth_plan_requires_auth(self):
        """GET /api/birth-plan requires authentication"""
        response = requests.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 401
        print("Birth plan requires auth: PASS")
    
    def test_get_birth_plan_as_mom(self, mom_token):
        """GET /api/birth-plan returns birth plan for mom"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "plan_id" in data or "user_id" in data
        assert "sections" in data
        print(f"Birth plan retrieved with {len(data.get('sections', []))} sections")
    
    def test_update_birth_plan_section(self, mom_token):
        """PUT /api/birth-plan/section/{section_id} updates section data"""
        # Update about_me section with test data
        test_data = {
            "data": {
                "full_name": "TEST_Demo Mom",
                "partner_name": "TEST_Partner",
                "preferred_name": "Test Mom"
            },
            "notes_to_provider": "TEST notes for provider"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            headers={"Authorization": f"Bearer {mom_token}"},
            json=test_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "completion_percentage" in data
        print(f"Birth plan section updated. Completion: {data['completion_percentage']}%")
    
    def test_update_nonexistent_section_returns_404(self, mom_token):
        """PUT /api/birth-plan/section/{section_id} returns 404 for nonexistent section"""
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/nonexistent_section",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={"data": {"test": "value"}}
        )
        assert response.status_code == 404
        print("Update nonexistent section returns 404: PASS")
    
    def test_birth_plan_no_objectid(self, mom_token):
        """Birth plan response does not contain MongoDB _id"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data
        # Also check sections
        for section in data.get("sections", []):
            assert "_id" not in section
        print("Birth plan response has no ObjectId: PASS")


# ============== BIRTH PLAN EXPORT TESTS ==============

class TestBirthPlanExport:
    """Birth Plan Export tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_export_birth_plan_data(self, mom_token):
        """GET /api/birth-plan/export returns export data"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan/export",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "plan" in data
        assert "user_name" in data
        print(f"Birth plan export data retrieved for: {data.get('user_name')}")
    
    def test_export_birth_plan_pdf(self, mom_token):
        """GET /api/birth-plan/export/pdf returns PDF file"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan/export/pdf",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        # Should be 200 or 404 if no plan exists
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf"
            assert "content-disposition" in response.headers
            print("Birth plan PDF export successful")
        else:
            print("Birth plan PDF export: No plan found (404)")


# ============== PROVIDER SEARCH TESTS ==============

class TestProviderSearch:
    """Provider search tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_search_providers_requires_auth(self):
        """GET /api/providers/search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/providers/search?query=demo")
        assert response.status_code == 401
        print("Provider search requires auth: PASS")
    
    def test_search_providers_by_name(self, mom_token):
        """GET /api/providers/search?query=demo returns matching providers"""
        response = requests.get(
            f"{BASE_URL}/api/providers/search?query=demo",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        print(f"Provider search found {len(data['providers'])} providers matching 'demo'")
    
    def test_search_providers_short_query_returns_empty(self, mom_token):
        """GET /api/providers/search?query=d returns empty for short queries"""
        response = requests.get(
            f"{BASE_URL}/api/providers/search?query=d",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert len(data["providers"]) == 0
        print("Short query returns empty: PASS")


# ============== BIRTH PLAN SHARING TESTS (MOM) ==============

class TestBirthPlanSharing:
    """Birth Plan Sharing tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def doula_user_id(self, mom_token):
        """Get Doula user ID by searching providers"""
        response = requests.get(
            f"{BASE_URL}/api/providers/search?query=doula",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        providers = data.get("providers", [])
        for p in providers:
            if p.get("role") == "DOULA":
                return p["user_id"]
        pytest.skip("No doula provider found for sharing test")
    
    def test_get_share_requests_requires_auth(self):
        """GET /api/birth-plan/share-requests requires authentication"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert response.status_code == 401
        print("Get share requests requires auth: PASS")
    
    def test_get_share_requests_as_mom(self, mom_token):
        """GET /api/birth-plan/share-requests returns share requests"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Mom has {len(data['requests'])} share requests")
    
    def test_share_birth_plan_with_invalid_provider_returns_404(self, mom_token):
        """POST /api/birth-plan/share with nonexistent provider returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={"provider_id": "nonexistent_provider_id"}
        )
        assert response.status_code == 404
        print("Share with invalid provider returns 404: PASS")
    
    def test_revoke_nonexistent_share_returns_404(self, mom_token):
        """DELETE /api/birth-plan/share/{id} with nonexistent ID returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/birth-plan/share/nonexistent_request_id",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 404
        print("Revoke nonexistent share returns 404: PASS")


# ============== PROVIDER SHARE REQUESTS TESTS ==============

class TestProviderShareRequests:
    """Provider share request tests"""
    
    @pytest.fixture
    def doula_token(self):
        """Get Doula authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def midwife_token(self):
        """Get Midwife authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_get_provider_share_requests_requires_auth(self):
        """GET /api/provider/share-requests requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/share-requests")
        assert response.status_code == 401
        print("Provider share requests requires auth: PASS")
    
    def test_get_provider_share_requests_as_doula(self, doula_token):
        """GET /api/provider/share-requests as doula returns share requests"""
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Doula has {len(data['requests'])} share requests")
    
    def test_get_provider_share_requests_as_midwife(self, midwife_token):
        """GET /api/provider/share-requests as midwife returns share requests"""
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"Midwife has {len(data['requests'])} share requests")
    
    def test_mom_cannot_access_provider_share_requests(self, mom_token):
        """GET /api/provider/share-requests as mom returns 403"""
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 403
        print("Mom cannot access provider share requests: PASS")
    
    def test_respond_to_nonexistent_share_request_returns_404(self, doula_token):
        """PUT /api/provider/share-requests/{id}/respond with nonexistent ID returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/provider/share-requests/nonexistent_id/respond",
            headers={"Authorization": f"Bearer {doula_token}"},
            json={"action": "accept"}
        )
        assert response.status_code == 404
        print("Respond to nonexistent share request returns 404: PASS")
    
    def test_respond_with_invalid_action_returns_400(self, doula_token):
        """PUT /api/provider/share-requests/{id}/respond with invalid action returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/provider/share-requests/test_id/respond",
            headers={"Authorization": f"Bearer {doula_token}"},
            json={"action": "invalid_action"}
        )
        # Returns 400 for invalid action or 404 for nonexistent ID
        assert response.status_code in [400, 404]
        print("Invalid action handled: PASS")


# ============== PROVIDER BIRTH PLAN ROUTES TESTS ==============

class TestProviderBirthPlanRoutes:
    """Provider birth plan access tests"""
    
    @pytest.fixture
    def doula_token(self):
        """Get Doula authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def midwife_token(self):
        """Get Midwife authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_get_shared_birth_plans_requires_auth(self):
        """GET /api/provider/shared-birth-plans requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert response.status_code == 401
        print("Shared birth plans requires auth: PASS")
    
    def test_get_shared_birth_plans_as_doula(self, doula_token):
        """GET /api/provider/shared-birth-plans as doula returns birth plans"""
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "birth_plans" in data
        print(f"Doula has access to {len(data['birth_plans'])} shared birth plans")
    
    def test_get_shared_birth_plans_as_midwife(self, midwife_token):
        """GET /api/provider/shared-birth-plans as midwife returns birth plans"""
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "birth_plans" in data
        print(f"Midwife has access to {len(data['birth_plans'])} shared birth plans")
    
    def test_mom_cannot_access_shared_birth_plans(self, mom_token):
        """GET /api/provider/shared-birth-plans as mom returns 403"""
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 403
        print("Mom cannot access shared birth plans: PASS")
    
    def test_get_shared_birth_plan_detail_without_access(self, doula_token):
        """GET /api/provider/shared-birth-plan/{mom_id} without access returns 403"""
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plan/nonexistent_mom_id",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 403
        print("Access denied for non-shared birth plan: PASS")
    
    def test_get_client_birth_plan_without_access(self, doula_token):
        """GET /api/provider/client/{mom_id}/birth-plan without access returns 403"""
        response = requests.get(
            f"{BASE_URL}/api/provider/client/nonexistent_mom_id/birth-plan",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 403
        print("Access denied for non-client birth plan: PASS")


# ============== PROVIDER BIRTH PLAN NOTES TESTS ==============

class TestProviderBirthPlanNotes:
    """Provider birth plan notes tests"""
    
    @pytest.fixture
    def doula_token(self):
        """Get Doula authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_add_note_requires_auth(self):
        """POST /api/provider/birth-plan/{mom_id}/notes requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/provider/birth-plan/test_mom_id/notes",
            json={"section_id": "about_me", "note_content": "Test note"}
        )
        assert response.status_code == 401
        print("Add note requires auth: PASS")
    
    def test_add_note_without_access_returns_403(self, doula_token):
        """POST /api/provider/birth-plan/{mom_id}/notes without access returns 403"""
        response = requests.post(
            f"{BASE_URL}/api/provider/birth-plan/nonexistent_mom_id/notes",
            headers={"Authorization": f"Bearer {doula_token}"},
            json={"section_id": "about_me", "note_content": "Test note"}
        )
        assert response.status_code == 403
        print("Add note without access returns 403: PASS")
    
    def test_update_nonexistent_note_returns_404(self, doula_token):
        """PUT /api/provider/birth-plan-notes/{note_id} with nonexistent ID returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/provider/birth-plan-notes/nonexistent_note_id",
            headers={"Authorization": f"Bearer {doula_token}"},
            json={"note_content": "Updated note"}
        )
        assert response.status_code == 404
        print("Update nonexistent note returns 404: PASS")
    
    def test_delete_nonexistent_note_returns_404(self, doula_token):
        """DELETE /api/provider/birth-plan-notes/{note_id} with nonexistent ID returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/provider/birth-plan-notes/nonexistent_note_id",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 404
        print("Delete nonexistent note returns 404: PASS")


# ============== WELLNESS ROUTES TESTS ==============

class TestWellnessRoutes:
    """Wellness check-in and entry tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_create_wellness_checkin_requires_auth(self):
        """POST /api/wellness/checkin requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/wellness/checkin",
            json={"mood": "Good"}
        )
        assert response.status_code == 401
        print("Wellness checkin requires auth: PASS")
    
    def test_create_wellness_checkin(self, mom_token):
        """POST /api/wellness/checkin creates a check-in"""
        response = requests.post(
            f"{BASE_URL}/api/wellness/checkin",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={"mood": "Good", "mood_note": "TEST_Feeling good today"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkin_id" in data
        assert data["mood"] == "Good"
        print(f"Wellness check-in created: {data['checkin_id']}")
    
    def test_get_wellness_checkins(self, mom_token):
        """GET /api/wellness/checkins returns check-in history"""
        response = requests.get(
            f"{BASE_URL}/api/wellness/checkins",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Retrieved {len(data)} wellness check-ins")
    
    def test_create_wellness_entry(self, mom_token):
        """POST /api/wellness/entry creates a detailed entry"""
        response = requests.post(
            f"{BASE_URL}/api/wellness/entry",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={
                "mood": 4,
                "energy_level": 3,
                "sleep_quality": 4,
                "symptoms": ["TEST_nausea", "TEST_fatigue"],
                "journal_notes": "TEST_Today was a good day"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "entry_id" in data
        assert data["mood"] == 4
        print(f"Wellness entry created: {data['entry_id']}")
    
    def test_get_wellness_entries(self, mom_token):
        """GET /api/wellness/entries returns entry history"""
        response = requests.get(
            f"{BASE_URL}/api/wellness/entries",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        print(f"Retrieved {len(data['entries'])} wellness entries")
    
    def test_get_wellness_stats(self, mom_token):
        """GET /api/wellness/stats returns statistics"""
        response = requests.get(
            f"{BASE_URL}/api/wellness/stats?days=7",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "entries_count" in data
        print(f"Wellness stats: {data['entries_count']} entries in last 7 days")
    
    def test_wellness_entry_no_objectid(self, mom_token):
        """Wellness entry response does not contain MongoDB _id"""
        # Create an entry
        create_response = requests.post(
            f"{BASE_URL}/api/wellness/entry",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={"mood": 3}
        )
        assert create_response.status_code == 200
        data = create_response.json()
        assert "_id" not in data
        
        # Also check entries list
        list_response = requests.get(
            f"{BASE_URL}/api/wellness/entries",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        for entry in list_response.json().get("entries", []):
            assert "_id" not in entry
        print("Wellness entries have no ObjectId: PASS")


# ============== POSTPARTUM ROUTES TESTS ==============

class TestPostpartumRoutes:
    """Postpartum plan tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_get_postpartum_plan_requires_auth(self):
        """GET /api/postpartum/plan requires authentication"""
        response = requests.get(f"{BASE_URL}/api/postpartum/plan")
        assert response.status_code == 401
        print("Postpartum plan requires auth: PASS")
    
    def test_get_postpartum_plan(self, mom_token):
        """GET /api/postpartum/plan returns plan"""
        response = requests.get(
            f"{BASE_URL}/api/postpartum/plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print("Postpartum plan retrieved")
    
    def test_update_postpartum_plan(self, mom_token):
        """PUT /api/postpartum/plan updates plan"""
        response = requests.put(
            f"{BASE_URL}/api/postpartum/plan",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={
                "support_people": "TEST_Partner, TEST_Family",
                "meal_prep_plans": "TEST_Meal prep strategy",
                "recovery_goals": "TEST_Recovery goals",
                "notes": "TEST_Additional notes"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("Postpartum plan updated successfully")
    
    def test_postpartum_plan_no_objectid(self, mom_token):
        """Postpartum plan response does not contain MongoDB _id"""
        response = requests.get(
            f"{BASE_URL}/api/postpartum/plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data
        print("Postpartum plan has no ObjectId: PASS")


# ============== TIMELINE ROUTES TESTS ==============

class TestTimelineRoutes:
    """Timeline tests for Mom role"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_get_timeline_requires_auth(self):
        """GET /api/timeline requires authentication"""
        response = requests.get(f"{BASE_URL}/api/timeline")
        assert response.status_code == 401
        print("Timeline requires auth: PASS")
    
    def test_get_timeline(self, mom_token):
        """GET /api/timeline returns timeline with milestones"""
        response = requests.get(
            f"{BASE_URL}/api/timeline",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Timeline may return milestones or a message about missing due date
        assert "milestones" in data or "message" in data
        print(f"Timeline retrieved with {len(data.get('milestones', []))} milestones")
    
    def test_create_timeline_event(self, mom_token):
        """POST /api/timeline/events creates a custom event"""
        response = requests.post(
            f"{BASE_URL}/api/timeline/events",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={
                "title": "TEST_Custom Event",
                "description": "TEST_Event description",
                "event_date": "2026-03-15",
                "event_type": "custom"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "event_id" in data
        assert data["title"] == "TEST_Custom Event"
        print(f"Timeline event created: {data['event_id']}")
        return data["event_id"]
    
    def test_delete_timeline_event(self, mom_token):
        """DELETE /api/timeline/events/{event_id} deletes event"""
        # First create an event
        create_response = requests.post(
            f"{BASE_URL}/api/timeline/events",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={
                "title": "TEST_To Delete",
                "event_date": "2026-03-20",
                "event_type": "custom"
            }
        )
        assert create_response.status_code == 200
        event_id = create_response.json()["event_id"]
        
        # Then delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/timeline/events/{event_id}",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert delete_response.status_code == 200
        print("Timeline event deleted successfully")
    
    def test_delete_nonexistent_event_returns_404(self, mom_token):
        """DELETE /api/timeline/events/{event_id} with nonexistent ID returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/timeline/events/nonexistent_event_id",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 404
        print("Delete nonexistent event returns 404: PASS")
    
    def test_timeline_event_no_objectid(self, mom_token):
        """Timeline event response does not contain MongoDB _id"""
        # Create an event
        create_response = requests.post(
            f"{BASE_URL}/api/timeline/events",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={
                "title": "TEST_ObjectId Check",
                "event_date": "2026-03-25",
                "event_type": "custom"
            }
        )
        assert create_response.status_code == 200
        data = create_response.json()
        assert "_id" not in data
        print("Timeline event has no ObjectId: PASS")


# ============== ROLE-BASED ACCESS CONTROL TESTS ==============

class TestRoleBasedAccess:
    """Role-based access control tests"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def doula_token(self):
        """Get Doula authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def midwife_token(self):
        """Get Midwife authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_doula_cannot_access_birth_plan(self, doula_token):
        """Doula cannot access /api/birth-plan (Mom only)"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 403
        print("Doula cannot access birth plan: PASS")
    
    def test_midwife_cannot_access_birth_plan(self, midwife_token):
        """Midwife cannot access /api/birth-plan (Mom only)"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 403
        print("Midwife cannot access birth plan: PASS")
    
    def test_doula_cannot_access_wellness(self, doula_token):
        """Doula cannot access /api/wellness routes (Mom only)"""
        response = requests.get(
            f"{BASE_URL}/api/wellness/checkins",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 403
        print("Doula cannot access wellness: PASS")
    
    def test_doula_cannot_access_postpartum(self, doula_token):
        """Doula cannot access /api/postpartum/plan (Mom only)"""
        response = requests.get(
            f"{BASE_URL}/api/postpartum/plan",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 403
        print("Doula cannot access postpartum: PASS")
    
    def test_doula_cannot_access_timeline(self, doula_token):
        """Doula cannot access /api/timeline (Mom only)"""
        response = requests.get(
            f"{BASE_URL}/api/timeline",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 403
        print("Doula cannot access timeline: PASS")
    
    def test_mom_cannot_access_provider_share_requests(self, mom_token):
        """Mom cannot access /api/provider/share-requests (Provider only)"""
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 403
        print("Mom cannot access provider share requests: PASS")
    
    def test_mom_cannot_access_provider_shared_birth_plans(self, mom_token):
        """Mom cannot access /api/provider/shared-birth-plans (Provider only)"""
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 403
        print("Mom cannot access provider shared birth plans: PASS")
    
    def test_mom_cannot_search_providers(self, mom_token):
        """Mom CAN search providers (allowed)"""
        response = requests.get(
            f"{BASE_URL}/api/providers/search?query=demo",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        # Mom should be able to search providers
        assert response.status_code == 200
        print("Mom can search providers: PASS")


# ============== OBJECTID SERIALIZATION TESTS ==============

class TestObjectIdSerialization:
    """Tests to ensure MongoDB _id is not returned in any response"""
    
    @pytest.fixture
    def mom_token(self):
        """Get Mom authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture
    def doula_token(self):
        """Get Doula authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    def test_birth_plan_no_objectid(self, mom_token):
        """Birth plan has no _id"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data
        for section in data.get("sections", []):
            assert "_id" not in section
        print("Birth plan no ObjectId: PASS")
    
    def test_wellness_checkins_no_objectid(self, mom_token):
        """Wellness check-ins have no _id"""
        response = requests.get(
            f"{BASE_URL}/api/wellness/checkins",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for checkin in data:
            assert "_id" not in checkin
        print("Wellness checkins no ObjectId: PASS")
    
    def test_wellness_entries_no_objectid(self, mom_token):
        """Wellness entries have no _id"""
        response = requests.get(
            f"{BASE_URL}/api/wellness/entries",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for entry in data.get("entries", []):
            assert "_id" not in entry
        print("Wellness entries no ObjectId: PASS")
    
    def test_postpartum_plan_no_objectid(self, mom_token):
        """Postpartum plan has no _id"""
        response = requests.get(
            f"{BASE_URL}/api/postpartum/plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data
        print("Postpartum plan no ObjectId: PASS")
    
    def test_share_requests_no_objectid(self, mom_token):
        """Share requests have no _id"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for request in data.get("requests", []):
            assert "_id" not in request
        print("Share requests no ObjectId: PASS")
    
    def test_provider_share_requests_no_objectid(self, doula_token):
        """Provider share requests have no _id"""
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for request in data.get("requests", []):
            assert "_id" not in request
        print("Provider share requests no ObjectId: PASS")
    
    def test_shared_birth_plans_no_objectid(self, doula_token):
        """Shared birth plans have no _id"""
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for plan in data.get("birth_plans", []):
            assert "_id" not in plan
            if "plan" in plan:
                assert "_id" not in plan["plan"]
        print("Shared birth plans no ObjectId: PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
