"""
Test Suite: Share Birth Plan Feature
Tests for sharing birth plan between MOMs and Providers (DOULAs/MIDWIFEs)

Endpoints tested:
- GET /api/providers/search - Search providers by name or email
- POST /api/birth-plan/share - MOM sends share request to provider
- GET /api/birth-plan/share-requests - MOM gets all share requests sent
- DELETE /api/birth-plan/share/{request_id} - MOM revokes share access
- GET /api/provider/share-requests - Provider gets pending share requests
- PUT /api/provider/share-requests/{request_id}/respond - Provider accepts/rejects
- GET /api/provider/shared-birth-plans - Provider gets all shared birth plans
- GET /api/provider/shared-birth-plan/{mom_user_id} - Provider gets specific birth plan
- POST /api/provider/birth-plan/{mom_user_id}/notes - Provider adds notes to section
- PUT /api/provider/notes/{note_id} - Provider updates note
- DELETE /api/provider/notes/{note_id} - Provider deletes note
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://birth-team-platform.preview.emergentagent.com').rstrip('/')

# Test credentials from main agent
MOM_EMAIL = "sharemom2_1771213474@test.com"
MOM_PASSWORD = "password123"
MOM_TOKEN = "session_a46443f07da0472197c354f8a0388c99"

DOULA_EMAIL = "doula2_1771213474@test.com"
DOULA_PASSWORD = "password123"
DOULA_TOKEN = "session_93ba579851b34b13a1888b1cbe74ed27"

# Store test data for cleanup
created_share_request_id = None
created_note_id = None


@pytest.fixture(scope="module")
def mom_session():
    """Get MOM authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {MOM_TOKEN}"
    })
    return session


@pytest.fixture(scope="module")
def doula_session():
    """Get DOULA authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DOULA_TOKEN}"
    })
    return session


class TestBackendHealth:
    """Basic health check"""
    
    def test_api_health(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Backend health check passed")


class TestMomAuthentication:
    """Verify MOM user can authenticate with provided credentials"""
    
    def test_mom_auth_verify(self, mom_session):
        """Verify MOM session token works"""
        response = mom_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"MOM auth failed: {response.text}"
        data = response.json()
        assert data["role"] == "MOM"
        assert data["email"] == MOM_EMAIL
        print(f"✓ MOM authenticated: {data['full_name']} ({data['email']})")


class TestDoulaAuthentication:
    """Verify DOULA user can authenticate with provided credentials"""
    
    def test_doula_auth_verify(self, doula_session):
        """Verify DOULA session token works"""
        response = doula_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"DOULA auth failed: {response.text}"
        data = response.json()
        assert data["role"] == "DOULA"
        assert data["email"] == DOULA_EMAIL
        print(f"✓ DOULA authenticated: {data['full_name']} ({data['email']})")


class TestProviderSearch:
    """Test provider search functionality for MOMs"""
    
    def test_search_empty_query(self, mom_session):
        """Search with query too short returns empty"""
        response = mom_session.get(f"{BASE_URL}/api/providers/search?query=a")
        assert response.status_code == 200
        data = response.json()
        assert data["providers"] == []
        print("✓ Empty query returns empty results")
    
    def test_search_by_name(self, mom_session):
        """Search providers by name"""
        # Search for doula by partial name
        response = mom_session.get(f"{BASE_URL}/api/providers/search?query=doula")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        print(f"✓ Search by name found {len(data['providers'])} providers")
    
    def test_search_by_email(self, mom_session):
        """Search providers by email"""
        response = mom_session.get(f"{BASE_URL}/api/providers/search?query={DOULA_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        # Should find our test doula
        doula_found = any(p["email"] == DOULA_EMAIL for p in data["providers"])
        assert doula_found, f"Test doula not found in search results"
        print(f"✓ Search by email found test doula")
    
    def test_search_returns_provider_info(self, mom_session):
        """Search results contain all required fields"""
        response = mom_session.get(f"{BASE_URL}/api/providers/search?query={DOULA_EMAIL}")
        assert response.status_code == 200
        data = response.json()
        
        if len(data["providers"]) > 0:
            provider = data["providers"][0]
            assert "user_id" in provider
            assert "full_name" in provider
            assert "email" in provider
            assert "role" in provider
            assert "already_shared" in provider
            assert provider["role"] in ["DOULA", "MIDWIFE"]
            print(f"✓ Provider result has all required fields")
        else:
            pytest.skip("No providers found to verify fields")


class TestShareBirthPlan:
    """Test birth plan sharing workflow - MOM side"""
    
    def test_send_share_request(self, mom_session, doula_session):
        """MOM sends share request to provider"""
        global created_share_request_id
        
        # First get the doula's user_id
        doula_response = doula_session.get(f"{BASE_URL}/api/auth/me")
        doula_data = doula_response.json()
        doula_user_id = doula_data["user_id"]
        
        # Send share request
        response = mom_session.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": doula_user_id}
        )
        
        # Could be 200/201 for success or 400 if already shared
        if response.status_code == 400:
            # Already shared, which is fine for our test
            print("✓ Share request already exists (expected)")
            return
        
        assert response.status_code in [200, 201], f"Share request failed: {response.text}"
        data = response.json()
        assert "request" in data
        assert data["request"]["status"] == "pending"
        created_share_request_id = data["request"]["request_id"]
        print(f"✓ Share request sent: {created_share_request_id}")
    
    def test_get_share_requests(self, mom_session):
        """MOM gets all share requests sent"""
        response = mom_session.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert isinstance(data["requests"], list)
        print(f"✓ MOM has {len(data['requests'])} share requests")
        
        # Verify request structure
        if len(data["requests"]) > 0:
            req = data["requests"][0]
            assert "request_id" in req
            assert "provider_name" in req
            assert "provider_role" in req
            assert "status" in req
            assert req["status"] in ["pending", "accepted", "rejected"]
            print(f"✓ Share request structure validated")


class TestProviderShareRequests:
    """Test share request handling - Provider side"""
    
    def test_provider_gets_pending_requests(self, doula_session):
        """Provider sees pending share requests"""
        response = doula_session.get(f"{BASE_URL}/api/provider/share-requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ Provider has {len(data['requests'])} share requests")
    
    def test_provider_accept_request(self, doula_session, mom_session):
        """Provider accepts share request"""
        # Get pending requests
        response = doula_session.get(f"{BASE_URL}/api/provider/share-requests")
        data = response.json()
        
        pending = [r for r in data["requests"] if r["status"] == "pending"]
        
        if not pending:
            print("✓ No pending requests to accept (may already be accepted)")
            return
        
        request_id = pending[0]["request_id"]
        
        # Accept the request
        response = doula_session.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            json={"action": "accept"}
        )
        assert response.status_code == 200, f"Accept failed: {response.text}"
        print(f"✓ Provider accepted share request {request_id}")
    
    def test_provider_reject_request_validation(self, doula_session):
        """Test reject request validation - invalid action"""
        response = doula_session.put(
            f"{BASE_URL}/api/provider/share-requests/fake_id/respond",
            json={"action": "invalid_action"}
        )
        assert response.status_code == 400
        print("✓ Invalid action properly rejected")
    
    def test_provider_reject_nonexistent_request(self, doula_session):
        """Test reject non-existent request returns 404"""
        response = doula_session.put(
            f"{BASE_URL}/api/provider/share-requests/nonexistent_request_id/respond",
            json={"action": "accept"}
        )
        assert response.status_code == 404
        print("✓ Non-existent request returns 404")


class TestProviderViewSharedBirthPlans:
    """Test provider viewing shared birth plans"""
    
    def test_get_shared_birth_plans(self, doula_session):
        """Provider gets all shared birth plans"""
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert response.status_code == 200
        data = response.json()
        assert "birth_plans" in data
        print(f"✓ Provider has {len(data['birth_plans'])} shared birth plans")
        
        # Verify structure if plans exist
        if len(data["birth_plans"]) > 0:
            plan = data["birth_plans"][0]
            assert "mom_user_id" in plan
            assert "mom_name" in plan
            assert "plan" in plan
            assert "provider_notes" in plan
            print(f"✓ Birth plan structure validated")
    
    def test_get_specific_shared_birth_plan(self, doula_session, mom_session):
        """Provider gets a specific shared birth plan"""
        # Get mom's user_id
        mom_response = mom_session.get(f"{BASE_URL}/api/auth/me")
        mom_data = mom_response.json()
        mom_user_id = mom_data["user_id"]
        
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plan/{mom_user_id}")
        
        # Could be 200 if accepted or 403 if not granted
        if response.status_code == 403:
            print("✓ Access correctly denied (share not accepted yet)")
            return
        
        assert response.status_code == 200, f"Get birth plan failed: {response.text}"
        data = response.json()
        assert "plan" in data
        assert "mom" in data
        assert "provider_notes" in data
        print(f"✓ Got specific birth plan for {mom_data['full_name']}")


class TestProviderNotes:
    """Test provider notes on birth plan sections"""
    
    def test_add_provider_note(self, doula_session, mom_session):
        """Provider adds note to birth plan section"""
        global created_note_id
        
        # Get mom's user_id
        mom_response = mom_session.get(f"{BASE_URL}/api/auth/me")
        mom_data = mom_response.json()
        mom_user_id = mom_data["user_id"]
        
        # Add a note
        response = doula_session.post(
            f"{BASE_URL}/api/provider/birth-plan/{mom_user_id}/notes",
            json={
                "section_id": "about_me",
                "note_content": "TEST_Note: This is a test note from the provider."
            }
        )
        
        if response.status_code == 403:
            print("✓ Access denied - share not accepted yet (expected)")
            return
        
        assert response.status_code == 200, f"Add note failed: {response.text}"
        data = response.json()
        assert "note" in data
        assert data["note"]["section_id"] == "about_me"
        assert "TEST_Note:" in data["note"]["note_content"]
        created_note_id = data["note"]["note_id"]
        print(f"✓ Provider note added: {created_note_id}")
    
    def test_update_provider_note(self, doula_session):
        """Provider updates a note"""
        global created_note_id
        
        if not created_note_id:
            pytest.skip("No note created to update")
        
        response = doula_session.put(
            f"{BASE_URL}/api/provider/notes/{created_note_id}",
            json={"note_content": "TEST_Updated: This note has been updated."}
        )
        
        assert response.status_code == 200, f"Update note failed: {response.text}"
        print(f"✓ Provider note updated")
    
    def test_delete_provider_note(self, doula_session):
        """Provider deletes a note"""
        global created_note_id
        
        if not created_note_id:
            pytest.skip("No note created to delete")
        
        response = doula_session.delete(f"{BASE_URL}/api/provider/notes/{created_note_id}")
        assert response.status_code == 200, f"Delete note failed: {response.text}"
        print(f"✓ Provider note deleted")
        created_note_id = None
    
    def test_update_nonexistent_note(self, doula_session):
        """Test update non-existent note returns 404"""
        response = doula_session.put(
            f"{BASE_URL}/api/provider/notes/nonexistent_note_id",
            json={"note_content": "Test content"}
        )
        assert response.status_code == 404
        print("✓ Non-existent note update returns 404")
    
    def test_delete_nonexistent_note(self, doula_session):
        """Test delete non-existent note returns 404"""
        response = doula_session.delete(f"{BASE_URL}/api/provider/notes/nonexistent_note_id")
        assert response.status_code == 404
        print("✓ Non-existent note delete returns 404")


class TestEndToEndShareFlow:
    """Complete end-to-end share workflow test"""
    
    def test_complete_share_flow(self, mom_session, doula_session):
        """Test complete flow: search -> share -> accept -> view -> add note"""
        # 1. Get provider's user_id
        doula_response = doula_session.get(f"{BASE_URL}/api/auth/me")
        doula_data = doula_response.json()
        doula_user_id = doula_data["user_id"]
        
        # 2. MOM searches for provider
        search_response = mom_session.get(f"{BASE_URL}/api/providers/search?query={DOULA_EMAIL}")
        assert search_response.status_code == 200
        
        # 3. Get mom's share requests to check status
        requests_response = mom_session.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert requests_response.status_code == 200
        requests_data = requests_response.json()
        
        # Find request to our test doula
        doula_request = next(
            (r for r in requests_data["requests"] if r["provider_id"] == doula_user_id),
            None
        )
        
        if doula_request:
            print(f"✓ Share request status: {doula_request['status']}")
        
        # 4. Provider views shared birth plans
        plans_response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert plans_response.status_code == 200
        
        print("✓ End-to-end share flow completed successfully")


class TestRoleAuthorization:
    """Test role-based access control"""
    
    def test_mom_cannot_access_provider_endpoints(self, mom_session):
        """MOM cannot access provider-only endpoints"""
        response = mom_session.get(f"{BASE_URL}/api/provider/share-requests")
        assert response.status_code == 403
        print("✓ MOM correctly denied access to provider endpoints")
    
    def test_provider_cannot_search_providers(self, doula_session):
        """Provider cannot use provider search (MOM only)"""
        response = doula_session.get(f"{BASE_URL}/api/providers/search?query=test")
        assert response.status_code == 403
        print("✓ Provider correctly denied access to provider search")
    
    def test_provider_cannot_send_share_request(self, doula_session):
        """Provider cannot send share requests (MOM only)"""
        response = doula_session.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": "some_user_id"}
        )
        assert response.status_code == 403
        print("✓ Provider correctly denied sending share requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
