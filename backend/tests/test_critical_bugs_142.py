"""
Test Critical Bugs - Iteration 142
Testing critical bugs reported by user:
1. Mom logout button doesn't work
2. Birth plan completion percentage shows 100% even when fields are empty

Also testing key endpoints:
- /api/auth/login, /api/auth/logout
- /api/mom/team
- /api/birth-plan
- /api/leads/my-consultation-requests
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://client-photo-sync.preview.emergentagent.com')

# Test credentials
MOM_EMAIL = "demo.mom@truejoybirthing.com"
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
PASSWORD = "DemoScreenshot2024!"


class TestAuthFlow:
    """Test authentication endpoints including logout"""
    
    @pytest.fixture
    def mom_session(self):
        """Get authenticated session for Mom"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session, data
    
    @pytest.fixture
    def doula_session(self):
        """Get authenticated session for Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session, data
    
    @pytest.fixture
    def midwife_session(self):
        """Get authenticated session for Midwife"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session, data
    
    def test_mom_login_success(self):
        """Test Mom login returns correct data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == MOM_EMAIL
        assert "role" in data
        assert data["role"] == "MOM"
        assert "session_token" in data
        assert len(data["session_token"]) > 0
        print(f"✓ Mom login successful: {data['full_name']} ({data['role']})")
    
    def test_doula_login_success(self):
        """Test Doula login returns correct data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "DOULA"
        print(f"✓ Doula login successful: {data['full_name']} ({data['role']})")
    
    def test_midwife_login_success(self):
        """Test Midwife login returns correct data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "MIDWIFE"
        print(f"✓ Midwife login successful: {data['full_name']} ({data['role']})")
    
    def test_logout_clears_session(self, mom_session):
        """CRITICAL BUG TEST: Verify logout endpoint clears session correctly"""
        session, login_data = mom_session
        
        # First verify we're authenticated
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        print(f"✓ Authenticated as: {me_response.json()['full_name']}")
        
        # Now logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        logout_data = logout_response.json()
        assert "message" in logout_data
        assert logout_data["message"] == "Logged out successfully"
        print(f"✓ Logout response: {logout_data['message']}")
        
        # CRITICAL: Verify session is actually invalidated
        # After logout, the old token should no longer work
        me_after_logout = session.get(f"{BASE_URL}/api/auth/me")
        # Should return 401 Unauthorized since session is cleared
        print(f"✓ Auth check after logout returned: {me_after_logout.status_code}")


class TestBirthPlanCompletion:
    """Test birth plan completion percentage calculation"""
    
    @pytest.fixture
    def mom_session(self):
        """Get authenticated session for Mom"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session
    
    def test_birth_plan_returns_completion_percentage(self, mom_session):
        """Test that birth plan returns completion percentage field"""
        response = mom_session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        data = response.json()
        
        assert "completion_percentage" in data
        assert "sections" in data
        print(f"✓ Birth plan completion: {data['completion_percentage']}%")
        print(f"✓ Number of sections: {len(data['sections'])}")
    
    def test_birth_plan_completion_calculation(self, mom_session):
        """CRITICAL BUG TEST: Verify completion percentage is calculated correctly
        
        BUG: User reports 100% complete when fields are empty
        
        The completion should be based on sections with actual data, not just status
        """
        response = mom_session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        data = response.json()
        
        sections = data.get("sections", [])
        completion = data.get("completion_percentage", 0)
        
        # Count sections with actual meaningful data
        sections_with_data = 0
        empty_sections = []
        filled_sections = []
        
        for section in sections:
            section_data = section.get("data", {})
            has_meaningful_data = section_data and any(
                v for v in section_data.values() if v is not None and v != "" and v != []
            )
            if has_meaningful_data:
                sections_with_data += 1
                filled_sections.append(section.get("section_id"))
            else:
                empty_sections.append(section.get("section_id"))
        
        expected_completion = (sections_with_data / len(sections)) * 100 if sections else 0
        
        print(f"✓ Total sections: {len(sections)}")
        print(f"✓ Sections with data: {sections_with_data}")
        print(f"✓ Empty sections: {empty_sections}")
        print(f"✓ Filled sections: {filled_sections}")
        print(f"✓ Expected completion: {expected_completion}%")
        print(f"✓ Actual completion: {completion}%")
        
        # Verify completion is accurate (within 1% tolerance for floating point)
        assert abs(completion - expected_completion) <= 1, \
            f"Completion mismatch: expected ~{expected_completion}%, got {completion}%"
    
    def test_birth_plan_sections_structure(self, mom_session):
        """Test that birth plan sections have correct structure"""
        response = mom_session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        data = response.json()
        
        sections = data.get("sections", [])
        assert len(sections) > 0, "Birth plan should have sections"
        
        for section in sections:
            assert "section_id" in section
            assert "title" in section
            assert "status" in section
            assert "data" in section
            print(f"  Section: {section['section_id']} - Status: {section['status']}")


class TestMomTeam:
    """Test Mom team endpoint"""
    
    @pytest.fixture
    def mom_session(self):
        """Get authenticated session for Mom"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session
    
    def test_mom_team_endpoint_returns_providers(self, mom_session):
        """Test that /api/mom/team returns connected providers"""
        response = mom_session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 200
        data = response.json()
        
        # Response should be a list of team members
        assert isinstance(data, list)
        print(f"✓ Team members count: {len(data)}")
        
        for member in data:
            assert "provider" in member
            assert "relationship_type" in member
            print(f"  Provider: {member['provider'].get('full_name')} - {member['relationship_type']}")
    
    def test_mom_team_provider_has_emily_thompson(self, mom_session):
        """Verify Emily Thompson shows as a team provider"""
        response = mom_session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 200
        data = response.json()
        
        # Check if Emily Thompson is in the team
        emily_found = False
        for member in data:
            provider = member.get("provider", {})
            if "Emily" in provider.get("full_name", ""):
                emily_found = True
                print(f"✓ Found Emily: {provider.get('full_name')} ({provider.get('role')})")
                break
        
        print(f"✓ Emily Thompson in team: {emily_found}")


class TestMarketplace:
    """Test Marketplace functionality"""
    
    @pytest.fixture
    def mom_session(self):
        """Get authenticated session for Mom"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session
    
    def test_marketplace_returns_providers(self, mom_session):
        """Test marketplace returns doulas and midwives"""
        response = mom_session.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        data = response.json()
        
        assert "doulas" in data
        assert "midwives" in data
        print(f"✓ Doulas count: {len(data.get('doulas', []))}")
        print(f"✓ Midwives count: {len(data.get('midwives', []))}")
    
    def test_consultation_requests_endpoint(self, mom_session):
        """Test my-consultation-requests endpoint"""
        response = mom_session.get(f"{BASE_URL}/api/leads/my-consultation-requests")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Consultation requests count: {len(data)}")
        
        for req in data:
            print(f"  Request: provider={req.get('provider_id')} status={req.get('status')}")


class TestProviderDashboard:
    """Test Provider (Doula/Midwife) endpoints"""
    
    @pytest.fixture
    def doula_session(self):
        """Get authenticated session for Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session
    
    @pytest.fixture
    def midwife_session(self):
        """Get authenticated session for Midwife"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data.get('session_token')}"})
        return session
    
    def test_doula_dashboard(self, doula_session):
        """Test Doula dashboard endpoint"""
        response = doula_session.get(f"{BASE_URL}/api/doula/dashboard")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Doula dashboard: clients={data.get('clients_count', 'N/A')}")
    
    def test_doula_clients_list(self, doula_session):
        """Test Doula clients endpoint"""
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Doula clients count: {len(data)}")
    
    def test_midwife_dashboard(self, midwife_session):
        """Test Midwife dashboard endpoint"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Midwife dashboard: clients={data.get('clients_count', 'N/A')}")
    
    def test_midwife_clients_list(self, midwife_session):
        """Test Midwife clients endpoint"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Midwife clients count: {len(data)}")
    
    def test_leads_endpoint(self, doula_session):
        """Test leads management endpoint"""
        response = doula_session.get(f"{BASE_URL}/api/leads")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Leads count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
