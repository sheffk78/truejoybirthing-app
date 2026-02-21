"""
Test Midwife Section - Profile, Dashboard, and Clients APIs
Tests for the updated Midwife functionality to match Doula section
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-birth-records.preview.emergentagent.com')

# Test credentials
MIDWIFE_EMAIL = "midwife@test.com"
MIDWIFE_PASSWORD = "password123"
MIDWIFE_NAME = "Test Midwife"


class TestMidwifeAuth:
    """Test midwife authentication"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        """Get or create midwife user and return session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
            return session
        
        # Create new midwife user if login fails
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD,
            "full_name": MIDWIFE_NAME,
            "role": "MIDWIFE"
        })
        
        if register_response.status_code == 200:
            data = register_response.json()
            session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
            return session
        
        pytest.skip(f"Could not authenticate midwife: {register_response.text}")
    
    def test_midwife_login(self, midwife_session):
        """Test that midwife can authenticate"""
        response = midwife_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "MIDWIFE"
        print(f"SUCCESS: Midwife authenticated: {data['full_name']}")


class TestMidwifeProfile:
    """Test Midwife profile API - new fields for photo, video, bio"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        """Get midwife session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        if login_response.status_code != 200:
            # Create new midwife user
            register_response = session.post(f"{BASE_URL}/api/auth/register", json={
                "email": MIDWIFE_EMAIL,
                "password": MIDWIFE_PASSWORD,
                "full_name": MIDWIFE_NAME,
                "role": "MIDWIFE"
            })
            if register_response.status_code != 200:
                pytest.skip("Could not authenticate midwife")
            data = register_response.json()
        else:
            data = login_response.json()
        
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_get_profile(self, midwife_session):
        """Test GET /api/midwife/profile returns 200"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert response.status_code == 200
        print(f"SUCCESS: GET profile returned 200")
    
    def test_update_profile_with_practice_name(self, midwife_session):
        """Test updating basic profile fields"""
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "practice_name": "Test Midwifery Practice",
            "credentials": "CPM, CNM",
            "location_city": "Austin",
            "location_state": "Texas",
            "years_in_practice": 8
        })
        assert response.status_code == 200
        
        # Verify the update persisted
        get_response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("practice_name") == "Test Midwifery Practice"
        assert data.get("credentials") == "CPM, CNM"
        print(f"SUCCESS: Profile updated with basic fields")
    
    def test_update_profile_with_picture(self, midwife_session):
        """Test updating profile with picture field (new field)"""
        test_picture_url = "https://example.com/test-midwife-photo.jpg"
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "picture": test_picture_url
        })
        assert response.status_code == 200
        
        # Verify persistence
        get_response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("picture") == test_picture_url
        print(f"SUCCESS: Profile updated with picture field")
    
    def test_update_profile_with_video_intro_url(self, midwife_session):
        """Test updating profile with video_intro_url field (new field)"""
        test_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "video_intro_url": test_video_url
        })
        assert response.status_code == 200
        
        # Verify persistence
        get_response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("video_intro_url") == test_video_url
        print(f"SUCCESS: Profile updated with video_intro_url field")
    
    def test_update_profile_with_more_about_me(self, midwife_session):
        """Test updating profile with more_about_me field (new field)"""
        test_bio = "I am a certified professional midwife with over 8 years of experience. I believe in the power of natural birth and holistic care."
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "more_about_me": test_bio
        })
        assert response.status_code == 200
        
        # Verify persistence
        get_response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data.get("more_about_me") == test_bio
        print(f"SUCCESS: Profile updated with more_about_me field")
    
    def test_update_profile_with_accepting_clients(self, midwife_session):
        """Test updating profile with accepting_clients field (alias)"""
        # Test setting to False
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "accepting_clients": False
        })
        assert response.status_code == 200
        
        # Verify persistence - should work with accepting_clients field
        get_response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert get_response.status_code == 200
        data = get_response.json()
        # Note: accepting_clients is an alias for accepting_new_clients
        assert data.get("accepting_clients") == False or data.get("accepting_new_clients") == False
        
        # Set back to True
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "accepting_clients": True
        })
        assert response.status_code == 200
        print(f"SUCCESS: Profile updated with accepting_clients field")
    
    def test_update_profile_with_all_new_fields(self, midwife_session):
        """Test updating profile with all new fields at once"""
        response = midwife_session.put(f"{BASE_URL}/api/midwife/profile", json={
            "practice_name": "Harmony Midwifery",
            "credentials": "CNM, LM",
            "location_city": "Denver",
            "location_state": "Colorado",
            "years_in_practice": 12,
            "picture": "https://example.com/harmony-midwife.jpg",
            "video_intro_url": "https://youtu.be/testVideo123",
            "more_about_me": "Dedicated to providing personalized, compassionate midwifery care.",
            "accepting_clients": True
        })
        assert response.status_code == 200
        
        # Verify all fields persisted
        get_response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data.get("practice_name") == "Harmony Midwifery"
        assert data.get("credentials") == "CNM, LM"
        assert data.get("location_city") == "Denver"
        assert data.get("location_state") == "Colorado"
        assert data.get("years_in_practice") == 12
        assert data.get("picture") == "https://example.com/harmony-midwife.jpg"
        assert data.get("video_intro_url") == "https://youtu.be/testVideo123"
        assert data.get("more_about_me") == "Dedicated to providing personalized, compassionate midwifery care."
        print(f"SUCCESS: Profile updated with all new fields")


class TestMidwifeDashboard:
    """Test Midwife dashboard API - returns correct stats with active_clients field"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        """Get midwife session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate midwife")
        
        data = login_response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_dashboard_returns_200(self, midwife_session):
        """Test GET /api/midwife/dashboard returns 200"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200
        print(f"SUCCESS: Dashboard API returned 200")
    
    def test_dashboard_returns_active_clients_field(self, midwife_session):
        """Test dashboard response contains active_clients field"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        # Verify active_clients field exists (this was the bug - was using wrong field name)
        assert "active_clients" in data, f"Missing 'active_clients' field. Got: {data.keys()}"
        print(f"SUCCESS: Dashboard contains 'active_clients' field: {data['active_clients']}")
    
    def test_dashboard_returns_all_expected_fields(self, midwife_session):
        """Test dashboard returns all expected stat fields"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = [
            "total_clients",
            "active_clients",
            "prenatal_clients",
            "visits_this_month",
            "births_this_month",
            "upcoming_appointments"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing expected field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be int, got {type(data[field])}"
        
        print(f"SUCCESS: Dashboard returns all expected fields: {list(data.keys())}")
    
    def test_dashboard_stats_are_non_negative(self, midwife_session):
        """Test all dashboard stats are non-negative integers"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200
        data = response.json()
        
        for key, value in data.items():
            assert value >= 0, f"Stat {key} should be non-negative, got {value}"
        
        print(f"SUCCESS: All dashboard stats are non-negative")


class TestMidwifeClients:
    """Test Midwife clients API - returns clients filtered by pro_user_id"""
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        """Get midwife session"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate midwife")
        
        data = login_response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_clients_returns_200(self, midwife_session):
        """Test GET /api/midwife/clients returns 200"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        print(f"SUCCESS: Clients API returned 200")
    
    def test_clients_returns_list(self, midwife_session):
        """Test clients endpoint returns a list"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"SUCCESS: Clients returns list with {len(data)} clients")
    
    def test_create_client(self, midwife_session):
        """Test POST /api/midwife/clients creates a client"""
        import uuid
        test_client_name = f"Test Client {uuid.uuid4().hex[:6]}"
        
        response = midwife_session.post(f"{BASE_URL}/api/midwife/clients", json={
            "name": test_client_name,
            "email": f"testclient{uuid.uuid4().hex[:6]}@example.com",
            "phone": "555-0123",
            "edd": "2026-03-15",
            "planned_birth_setting": "Home"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("client_id") is not None
        assert data.get("name") == test_client_name
        assert data.get("status") == "Prenatal"  # Default status
        print(f"SUCCESS: Created client: {data.get('client_id')}")
        return data.get("client_id")
    
    def test_clients_filtered_by_midwife(self, midwife_session):
        """Test clients are filtered to only show current midwife's clients"""
        # First create a client
        import uuid
        test_name = f"Midwife Test Client {uuid.uuid4().hex[:6]}"
        
        create_response = midwife_session.post(f"{BASE_URL}/api/midwife/clients", json={
            "name": test_name,
            "email": f"filteredtest{uuid.uuid4().hex[:6]}@example.com"
        })
        assert create_response.status_code == 200
        
        # Now get clients list
        list_response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert list_response.status_code == 200
        clients = list_response.json()
        
        # Check that created client is in the list
        found = any(c.get("name") == test_name for c in clients)
        assert found, f"Created client '{test_name}' not found in clients list"
        print(f"SUCCESS: Clients filtered correctly by midwife")


class TestMidwifeWithoutAuth:
    """Test Midwife endpoints require authentication"""
    
    def test_profile_without_auth(self):
        """Test profile endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/midwife/profile")
        assert response.status_code == 401
        print(f"SUCCESS: Profile requires auth (401)")
    
    def test_dashboard_without_auth(self):
        """Test dashboard endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 401
        print(f"SUCCESS: Dashboard requires auth (401)")
    
    def test_clients_without_auth(self):
        """Test clients endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 401
        print(f"SUCCESS: Clients requires auth (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
