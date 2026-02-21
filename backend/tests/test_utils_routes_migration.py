"""
Test cases for migrated utility routes from server.py to routes/utils.py
Tests: /api/lookup/zipcode and /api/weekly-content endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://joy-birthing-fix.preview.emergentagent.com')


class TestZipCodeLookupMigration:
    """Verify zip code lookup route works after migration to utils.py"""

    def test_valid_zipcode_90210_beverly_hills(self):
        """Test zip code lookup for Beverly Hills, CA (90210)"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/90210")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["zip_code"] == "90210"
        assert data["city"] == "Beverly Hills"
        assert data["state"] == "California"
        assert data["state_abbreviation"] == "CA"
        assert data["country"] == "United States"
        print("✓ Zipcode 90210 returns Beverly Hills, CA")

    def test_invalid_zipcode_returns_404(self):
        """Test invalid zip code returns 404 error"""
        response = requests.get(f"{BASE_URL}/api/lookup/zipcode/invalid")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "Invalid zip code" in data["detail"]
        print("✓ Invalid zipcode returns 404 with proper error message")


class TestWeeklyContentMigration:
    """Verify weekly content routes work after migration to utils.py"""

    @pytest.fixture(scope="class")
    def mom_session(self):
        """Get session token for demo Mom account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        
        if response.status_code != 200:
            pytest.skip(f"Failed to login as demo mom: {response.status_code}")
        
        return response.json().get("session_token")

    def test_weekly_content_all_returns_all_weeks(self):
        """Test /api/weekly-content/all returns 42 pregnancy + 6 postpartum weeks"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify pregnancy array
        assert "pregnancy" in data
        assert len(data["pregnancy"]) == 42, f"Expected 42 pregnancy weeks, got {len(data['pregnancy'])}"
        
        # Verify postpartum array
        assert "postpartum" in data
        assert len(data["postpartum"]) == 6, f"Expected 6 postpartum weeks, got {len(data['postpartum'])}"
        
        # Verify structure of week entries
        for week in data["pregnancy"][:3]:
            assert "week" in week
            assert "tip" in week
            assert "affirmation" in week
            assert len(week["tip"]) > 0
            assert len(week["affirmation"]) > 0
        
        print("✓ /api/weekly-content/all returns 42 pregnancy + 6 postpartum weeks with correct structure")

    def test_weekly_content_with_mom_auth(self, mom_session):
        """Test /api/weekly-content returns personalized weekly tip and affirmation for Mom"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {mom_session}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "week" in data
        assert "display_week" in data
        assert "is_postpartum" in data
        assert "postpartum_week" in data
        assert "tip" in data
        assert "affirmation" in data
        
        # Verify content
        assert isinstance(data["week"], int)
        assert "Week" in data["display_week"]
        assert len(data["tip"]) > 0
        assert len(data["affirmation"]) > 0
        
        print(f"✓ /api/weekly-content returns personalized content for {data['display_week']}")

    def test_weekly_content_requires_authentication(self):
        """Test /api/weekly-content requires MOM role authentication"""
        response = requests.get(f"{BASE_URL}/api/weekly-content")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ /api/weekly-content requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
