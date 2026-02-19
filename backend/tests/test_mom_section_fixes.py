"""
Test suite for Mom's Section fixes - Iteration 69
Testing:
1. Marketplace search with 'search' parameter (name, city, state, zip)
2. Backend API endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://backend-refactor-53.preview.emergentagent.com')


class TestMarketplaceSearch:
    """Test marketplace search functionality with multi-field search"""
    
    def setup_method(self):
        """Set up test credentials"""
        self.session = requests.Session()
        # Login as mom
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testmom_msg@test.com", "password": "password123"}
        )
        if login_resp.status_code == 200:
            token = login_resp.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_marketplace_providers_endpoint_exists(self):
        """Test that marketplace providers endpoint is accessible"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "doulas" in data, "Response should contain 'doulas' key"
        assert "midwives" in data, "Response should contain 'midwives' key"
        print(f"SUCCESS: Marketplace endpoint returns {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
    
    def test_marketplace_search_by_name(self):
        """Test search by provider name"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?search=test")
        assert response.status_code == 200
        data = response.json()
        # Just verify endpoint accepts search parameter
        print(f"SUCCESS: Name search returns {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
    
    def test_marketplace_search_by_city(self):
        """Test search by city"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?search=Austin")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: City search returns {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
    
    def test_marketplace_search_by_state(self):
        """Test search by state"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?search=Texas")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: State search returns {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
    
    def test_marketplace_search_by_zip(self):
        """Test search by zip code"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?search=78701")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Zip search returns {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
    
    def test_marketplace_filter_by_type_doula(self):
        """Test filtering by provider type - DOULA"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?provider_type=DOULA")
        assert response.status_code == 200
        data = response.json()
        # When filtering by DOULA, midwives should be empty
        assert len(data["midwives"]) == 0, "Should not return midwives when filtering for DOULA"
        print(f"SUCCESS: DOULA filter returns {len(data['doulas'])} doulas only")
    
    def test_marketplace_filter_by_type_midwife(self):
        """Test filtering by provider type - MIDWIFE"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?provider_type=MIDWIFE")
        assert response.status_code == 200
        data = response.json()
        # When filtering by MIDWIFE, doulas should be empty
        assert len(data["doulas"]) == 0, "Should not return doulas when filtering for MIDWIFE"
        print(f"SUCCESS: MIDWIFE filter returns {len(data['midwives'])} midwives only")
    
    def test_marketplace_combined_search_and_filter(self):
        """Test combining search with provider type filter"""
        response = self.session.get(f"{BASE_URL}/api/marketplace/providers?search=test&provider_type=DOULA")
        assert response.status_code == 200
        data = response.json()
        assert len(data["midwives"]) == 0, "Should not return midwives when filtering for DOULA"
        print(f"SUCCESS: Combined filter returns {len(data['doulas'])} doulas")


class TestZipCodeLookup:
    """Test zip code lookup endpoint"""
    
    def test_zip_code_lookup_valid(self):
        """Test valid zip code lookup"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/78701")
        assert response.status_code == 200
        data = response.json()
        assert "city" in data, "Response should contain 'city'"
        assert "state" in data, "Response should contain 'state'"
        print(f"SUCCESS: Zip lookup returns city={data['city']}, state={data['state']}")
    
    def test_zip_code_lookup_invalid(self):
        """Test invalid zip code"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/00000")
        # Invalid zip should return 404
        assert response.status_code in [404, 500], f"Expected 404 or 500 for invalid zip, got {response.status_code}"
        print(f"SUCCESS: Invalid zip returns appropriate error status {response.status_code}")


class TestMomProfileEndpoints:
    """Test Mom profile and related endpoints"""
    
    def setup_method(self):
        """Set up test credentials"""
        self.session = requests.Session()
        # Login as mom
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testmom_msg@test.com", "password": "password123"}
        )
        if login_resp.status_code == 200:
            token = login_resp.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_mom_profile_get(self):
        """Test getting mom profile"""
        response = self.session.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Mom profile fetched with keys: {list(data.keys())}")
    
    def test_mom_team_get(self):
        """Test getting mom's care team"""
        response = self.session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 200
        print(f"SUCCESS: Mom team endpoint works")
    
    def test_birth_plan_get(self):
        """Test getting birth plan"""
        response = self.session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data or "plan_id" in data, "Birth plan should have sections or plan_id"
        print(f"SUCCESS: Birth plan fetched")
    
    def test_timeline_get(self):
        """Test getting timeline"""
        response = self.session.get(f"{BASE_URL}/api/timeline")
        # Timeline might return 200 or 404 if not set up
        assert response.status_code in [200, 404]
        print(f"SUCCESS: Timeline endpoint returns status {response.status_code}")
    
    def test_timeline_events_create(self):
        """Test creating timeline event (appointment)"""
        event_data = {
            "title": "Test Appointment",
            "description": "Test description",
            "event_date": "2026-02-15",
            "event_type": "appointment"
        }
        response = self.session.post(f"{BASE_URL}/api/timeline/events", json=event_data)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print(f"SUCCESS: Timeline event created")


class TestBirthPlanSectionUpdate:
    """Test birth plan section update with date picker fields"""
    
    def setup_method(self):
        """Set up test credentials"""
        self.session = requests.Session()
        # Login as mom
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testmom_msg@test.com", "password": "password123"}
        )
        if login_resp.status_code == 200:
            token = login_resp.json().get("session_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_birth_plan_about_me_update_with_due_date(self):
        """Test updating about_me section with dueDate field"""
        section_data = {
            "data": {
                "dueDate": "2026-06-15",
                "motherName": "Test Mom",
                "birthLocation": "Hospital"
            }
        }
        response = self.session.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            json=section_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"SUCCESS: Birth plan about_me section updated with dueDate")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
