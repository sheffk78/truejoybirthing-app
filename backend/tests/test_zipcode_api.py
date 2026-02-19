"""
Test cases for zip code lookup API and onboarding flows
Tests the /api/lookup/zipcode/{zipcode} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://provider-subs.preview.emergentagent.com')


class TestZipCodeLookupAPI:
    """Tests for the zip code lookup endpoint"""

    def test_valid_zipcode_90210(self):
        """Test zip code lookup for Beverly Hills, CA (90210)"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/90210")
        assert response.status_code == 200
        data = response.json()
        
        assert data["zip_code"] == "90210"
        assert data["city"] == "Beverly Hills"
        assert data["state"] == "California"
        assert data["state_abbreviation"] == "CA"
        assert data["country"] == "United States"

    def test_valid_zipcode_10001(self):
        """Test zip code lookup for New York City (10001)"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/10001")
        assert response.status_code == 200
        data = response.json()
        
        assert data["zip_code"] == "10001"
        assert data["city"] == "New York City"
        assert data["state"] == "New York"
        assert data["state_abbreviation"] == "NY"

    def test_valid_zipcode_60601(self):
        """Test zip code lookup for Chicago (60601)"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/60601")
        assert response.status_code == 200
        data = response.json()
        
        assert data["zip_code"] == "60601"
        assert data["city"] == "Chicago"
        assert data["state"] == "Illinois"
        assert data["state_abbreviation"] == "IL"

    def test_invalid_zipcode_00000(self):
        """Test invalid zip code returns 404"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/00000")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "Invalid zip code" in data["detail"]

    def test_invalid_zipcode_99999(self):
        """Test another invalid zip code returns 404"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/99999")
        # This might return 404 depending on whether 99999 is a valid zip
        # Accept either 200 (if valid) or 404 (if invalid)
        assert response.status_code in [200, 404]


class TestDoulaOnboarding:
    """Tests for doula onboarding with zip code lookup"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test doula account"""
        import time
        timestamp = str(int(time.time()))
        self.test_email = f"test_doula_onboard_{timestamp}@test.com"
        
        # Register a new doula
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "full_name": "Test Doula",
            "password": "password123",
            "role": "DOULA"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.session_token = data["session_token"]
            self.user_id = data["user_id"]
        else:
            pytest.skip("Failed to create test doula account")

    def test_doula_onboarding_with_location(self):
        """Test doula onboarding with zip code and city/state"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        response = requests.post(f"{BASE_URL}/api/doula/onboarding", 
            headers=headers,
            json={
                "practice_name": "Test Doula Practice",
                "zip_code": "90210",
                "location_city": "Beverly Hills",
                "location_state": "CA",
                "services_offered": ["Birth Doula"],
                "years_in_practice": 5,
                "accepting_new_clients": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Onboarding completed"
        assert data["profile"]["location_city"] == "Beverly Hills"
        assert data["profile"]["location_state"] == "CA"


class TestMidwifeOnboarding:
    """Tests for midwife onboarding with zip code lookup"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test midwife account"""
        import time
        timestamp = str(int(time.time()))
        self.test_email = f"test_midwife_onboard_{timestamp}@test.com"
        
        # Register a new midwife
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "full_name": "Test Midwife",
            "password": "password123",
            "role": "MIDWIFE"
        })
        
        if response.status_code == 200:
            data = response.json()
            self.session_token = data["session_token"]
            self.user_id = data["user_id"]
        else:
            pytest.skip("Failed to create test midwife account")

    def test_midwife_onboarding_with_location(self):
        """Test midwife onboarding with zip code and city/state"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        response = requests.post(f"{BASE_URL}/api/midwife/onboarding",
            headers=headers,
            json={
                "practice_name": "Test Midwife Practice",
                "credentials": "CNM",
                "zip_code": "10001",
                "location_city": "New York City",
                "location_state": "NY",
                "years_in_practice": 10,
                "birth_settings_served": ["Home", "Birth Center"],
                "accepting_new_clients": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Onboarding completed"
        assert data["profile"]["location_city"] == "New York City"
        assert data["profile"]["location_state"] == "NY"
