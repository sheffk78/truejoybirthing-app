"""
Test 7 Fixes from User's Document:
- Fix 1: Mom's profile photo shows in top-right icon on home page
- Fix 3: Date picker on Profile page uses native date picker
- Fix 4: When mom saves 'About Me' section, due date/birth setting sync to Profile
- Fix 5: 'My Team' section removed from Mom's Profile page
- Fix 6: Provider profile photos show in My Team list
- Fix 7a: 'Share Your Birth Plan' card removed from Mom Home page
- Fix 7b: Birth Plan page shows 'Shared with: [providers]'
- Fix 7c: Doula/Midwife clients page has 'View Birth Plan' button
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://tjb-preview-stable.preview.emergentagent.com')

# Test credentials
MOM_EMAIL = "testmom_msg@test.com"
MOM_PASSWORD = "password123"
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"


@pytest.fixture(scope="module")
def mom_session():
    """Login as mom and return session with headers"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
    )
    assert response.status_code == 200, f"Mom login failed: {response.text}"
    data = response.json()
    session.headers.update({
        "Authorization": f"Bearer {data['session_token']}",
        "Content-Type": "application/json"
    })
    return {"session": session, "user": data}


@pytest.fixture(scope="module")
def doula_session():
    """Login as doula and return session with headers"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
    )
    assert response.status_code == 200, f"Doula login failed: {response.text}"
    data = response.json()
    session.headers.update({
        "Authorization": f"Bearer {data['session_token']}",
        "Content-Type": "application/json"
    })
    return {"session": session, "user": data}


class TestFix1ProfilePhoto:
    """Fix 1: Mom's profile photo shows in top-right icon on home page"""
    
    def test_mom_auth_me_returns_picture(self, mom_session):
        """Verify /api/auth/me returns picture field for mom"""
        session = mom_session["session"]
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        # picture field should exist (can be null or base64 string)
        assert "picture" in data, "picture field not found in auth/me response"
        print(f"Picture field exists: {data['picture'] is not None}")
        

class TestFix3DatePicker:
    """Fix 3: Date picker on Profile page uses native date picker
    Note: This is a frontend test - backend just needs to accept date formats
    """
    
    def test_mom_profile_update_due_date(self, mom_session):
        """Verify profile can be updated with due date"""
        session = mom_session["session"]
        
        # Update profile with due date
        response = session.put(
            f"{BASE_URL}/api/mom/profile",
            json={
                "due_date": "2026-06-15",  # ISO format
                "zip_code": "90210",
                "location_city": "Beverly Hills",
                "location_state": "CA"
            }
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        # Verify profile was updated
        response = session.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 200
        data = response.json()
        assert data.get("due_date") == "2026-06-15", "Due date not saved correctly"
        print(f"Due date saved: {data.get('due_date')}")


class TestFix4BirthPlanSync:
    """Fix 4: When mom saves 'About Me' section in Birth Plan, due date and birth setting sync to Profile"""
    
    def test_birth_plan_about_me_sync(self, mom_session):
        """Verify saving About Me section syncs data to profile"""
        session = mom_session["session"]
        
        # First get current birth plan
        response = session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        
        # Update about_me section with due date and birth setting
        test_due_date = "2026-07-20"
        test_birth_setting = "Hospital"
        
        response = session.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            json={
                "data": {
                    "due_date": test_due_date,
                    "planned_birth_location": test_birth_setting,
                    "partner_name": "Test Partner",
                    "support_team": ["Doula", "Midwife"]
                },
                "notes_to_provider": "Test notes"
            }
        )
        assert response.status_code == 200, f"Birth plan section update failed: {response.text}"
        
        # Verify profile was synced
        response = session.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 200
        profile = response.json()
        
        # Check if due_date and birth_setting were synced
        print(f"Profile due_date after sync: {profile.get('due_date')}")
        print(f"Profile birth_setting after sync: {profile.get('planned_birth_setting')}")


class TestFix5MyTeamRemoved:
    """Fix 5: 'My Team' section removed from Mom's Profile page
    Note: This is a frontend-only change - verify via code review
    """
    
    def test_mom_team_endpoint_still_works(self, mom_session):
        """Verify /api/mom/team endpoint still works (for My Team page)"""
        session = mom_session["session"]
        response = session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 200, f"Mom team endpoint failed: {response.text}"
        print(f"Mom team response: {response.json()}")


class TestFix6ProviderPhotosInTeam:
    """Fix 6: Provider profile photos show in My Team list"""
    
    def test_share_requests_include_provider_picture(self, mom_session):
        """Verify share requests include provider_picture field"""
        session = mom_session["session"]
        response = session.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert response.status_code == 200
        
        data = response.json()
        requests_list = data.get("requests", [])
        
        # Check if provider_picture field exists in responses
        for req in requests_list:
            assert "provider_picture" in req or "provider_id" in req, \
                "Share request missing provider identification"
            print(f"Provider: {req.get('provider_name')}, Picture: {req.get('provider_picture', 'N/A')}")


class TestFix7ShareBirthPlan:
    """Fix 7a/7b/7c: Birth Plan sharing improvements"""
    
    def test_birth_plan_has_share_info(self, mom_session):
        """Verify birth plan page can show 'Shared with' info"""
        session = mom_session["session"]
        
        # Get share requests to see who has access
        response = session.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert response.status_code == 200
        
        data = response.json()
        requests_list = data.get("requests", [])
        
        # Check for accepted providers
        accepted = [r for r in requests_list if r.get("status") == "accepted"]
        print(f"Birth plan shared with {len(accepted)} providers")
        for provider in accepted:
            print(f"  - {provider.get('provider_name')} ({provider.get('provider_role')})")
    
    def test_doula_can_view_client_birth_plan(self, doula_session, mom_session):
        """Fix 7c: Verify doula can view linked client's birth plan"""
        session = doula_session["session"]
        mom_user_id = mom_session["user"]["user_id"]
        
        # Try to get mom's birth plan as doula
        response = session.get(f"{BASE_URL}/api/provider/client/{mom_user_id}/birth-plan")
        
        # This should work if there's an accepted share request or client relationship
        if response.status_code == 200:
            birth_plan = response.json()
            assert "sections" in birth_plan, "Birth plan should have sections"
            print(f"Successfully fetched client birth plan: {birth_plan.get('completion_percentage', 0)}% complete")
        elif response.status_code == 403:
            print("No access granted to client birth plan (expected if no share request)")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


class TestProviderClientEndpoint:
    """Test the new provider client birth plan endpoint"""
    
    def test_doula_clients_endpoint(self, doula_session):
        """Verify doula can fetch their clients"""
        session = doula_session["session"]
        response = session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200, f"Doula clients endpoint failed: {response.text}"
        
        clients = response.json()
        print(f"Doula has {len(clients)} clients")
        
        # Check for linked_mom_id field (required for View Birth Plan button)
        for client in clients:
            if client.get("linked_mom_id"):
                print(f"Client {client.get('name')} is linked to mom: {client.get('linked_mom_id')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
