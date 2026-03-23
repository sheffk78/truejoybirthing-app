"""
Test Suite for Weekly Tips and Affirmations Feature
Tests GET /api/weekly-content/all and GET /api/weekly-content (personalized)
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Get base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://bundle-resolve.preview.emergentagent.com')

class TestWeeklyContentAll:
    """Test GET /api/weekly-content/all endpoint (returns all 42 pregnancy + 6 postpartum weeks)"""
    
    def test_weekly_content_all_returns_200(self):
        """Test that /weekly-content/all returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ /api/weekly-content/all returns 200")
    
    def test_weekly_content_all_has_pregnancy_array(self):
        """Test that response contains pregnancy array"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        assert "pregnancy" in data, "Response missing 'pregnancy' key"
        assert isinstance(data["pregnancy"], list), "pregnancy should be a list"
        print("✓ Response contains pregnancy array")
    
    def test_weekly_content_all_has_postpartum_array(self):
        """Test that response contains postpartum array"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        assert "postpartum" in data, "Response missing 'postpartum' key"
        assert isinstance(data["postpartum"], list), "postpartum should be a list"
        print("✓ Response contains postpartum array")
    
    def test_pregnancy_has_42_weeks(self):
        """Test that pregnancy array has exactly 42 weeks"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        pregnancy = data.get("pregnancy", [])
        assert len(pregnancy) == 42, f"Expected 42 pregnancy weeks, got {len(pregnancy)}"
        print(f"✓ Pregnancy array has {len(pregnancy)} weeks")
    
    def test_postpartum_has_6_weeks(self):
        """Test that postpartum array has exactly 6 weeks"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        postpartum = data.get("postpartum", [])
        assert len(postpartum) == 6, f"Expected 6 postpartum weeks, got {len(postpartum)}"
        print(f"✓ Postpartum array has {len(postpartum)} weeks")
    
    def test_pregnancy_weeks_have_correct_structure(self):
        """Test that each pregnancy week has week, tip, and affirmation fields"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        for idx, week_data in enumerate(data.get("pregnancy", []), start=1):
            assert "week" in week_data, f"Week {idx} missing 'week' field"
            assert "tip" in week_data, f"Week {idx} missing 'tip' field"
            assert "affirmation" in week_data, f"Week {idx} missing 'affirmation' field"
            assert week_data["week"] == idx, f"Week number mismatch: expected {idx}, got {week_data['week']}"
        print("✓ All pregnancy weeks have correct structure (week, tip, affirmation)")
    
    def test_postpartum_weeks_have_correct_structure(self):
        """Test that each postpartum week has week, tip, and affirmation fields"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        for idx, week_data in enumerate(data.get("postpartum", []), start=1):
            assert "week" in week_data, f"Postpartum week {idx} missing 'week' field"
            assert "tip" in week_data, f"Postpartum week {idx} missing 'tip' field"
            assert "affirmation" in week_data, f"Postpartum week {idx} missing 'affirmation' field"
            assert week_data["week"] == idx, f"Postpartum week number mismatch: expected {idx}, got {week_data['week']}"
        print("✓ All postpartum weeks have correct structure (week, tip, affirmation)")
    
    def test_pregnancy_tips_not_empty(self):
        """Test that pregnancy tips are not empty strings"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        empty_tips = []
        for week_data in data.get("pregnancy", []):
            if not week_data.get("tip"):
                empty_tips.append(week_data["week"])
        assert len(empty_tips) == 0, f"Empty tips found for weeks: {empty_tips}"
        print("✓ All 42 pregnancy tips have content")
    
    def test_pregnancy_affirmations_not_empty(self):
        """Test that pregnancy affirmations are not empty strings"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        empty_affirmations = []
        for week_data in data.get("pregnancy", []):
            if not week_data.get("affirmation"):
                empty_affirmations.append(week_data["week"])
        assert len(empty_affirmations) == 0, f"Empty affirmations found for weeks: {empty_affirmations}"
        print("✓ All 42 pregnancy affirmations have content")
    
    def test_postpartum_tips_not_empty(self):
        """Test that postpartum tips are not empty strings"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        empty_tips = []
        for week_data in data.get("postpartum", []):
            if not week_data.get("tip"):
                empty_tips.append(week_data["week"])
        assert len(empty_tips) == 0, f"Empty postpartum tips found for weeks: {empty_tips}"
        print("✓ All 6 postpartum tips have content")
    
    def test_postpartum_affirmations_not_empty(self):
        """Test that postpartum affirmations are not empty strings"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        empty_affirmations = []
        for week_data in data.get("postpartum", []):
            if not week_data.get("affirmation"):
                empty_affirmations.append(week_data["week"])
        assert len(empty_affirmations) == 0, f"Empty postpartum affirmations found for weeks: {empty_affirmations}"
        print("✓ All 6 postpartum affirmations have content")
    
    def test_specific_week_content_samples(self):
        """Test specific week content samples to verify data integrity"""
        response = requests.get(f"{BASE_URL}/api/weekly-content/all")
        data = response.json()
        
        # Check Week 1 pregnancy tip contains expected content
        week1 = data["pregnancy"][0]
        assert "journal" in week1["tip"].lower() or "cycle" in week1["tip"].lower(), "Week 1 tip doesn't match expected content"
        
        # Check Week 20 (halfway) contains expected content
        week20 = data["pregnancy"][19]
        assert week20["week"] == 20
        assert len(week20["tip"]) > 50, "Week 20 tip seems too short"
        
        # Check postpartum week 1 tip
        pp_week1 = data["postpartum"][0]
        assert "recovery" in pp_week1["tip"].lower() or "first week" in pp_week1["tip"].lower() or "skin-to-skin" in pp_week1["tip"].lower(), "Postpartum week 1 tip doesn't match expected content"
        
        print("✓ Sample content verified for weeks 1, 20, and postpartum week 1")


class TestWeeklyContentPersonalized:
    """Test GET /api/weekly-content endpoint (personalized based on due date)"""
    
    @pytest.fixture(scope="class")
    def test_mom_session(self):
        """Create a test mom user with due date 20 weeks from now"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_weekly_mom_{unique_id}@test.com"
        
        # Register user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "full_name": "Weekly Test Mom",
            "password": "TestPass123!",
            "role": "MOM"
        })
        
        if register_response.status_code != 200:
            pytest.skip(f"Failed to register test user: {register_response.text}")
        
        session_token = register_response.json().get("session_token")
        user_id = register_response.json().get("user_id")
        
        # Calculate due date 20 weeks from now
        due_date = (datetime.now() + timedelta(weeks=20)).strftime("%Y-%m-%d")
        
        # Complete onboarding with due date
        onboarding_response = requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            headers={"Authorization": f"Bearer {session_token}"},
            json={
                "due_date": due_date,
                "planned_birth_setting": "Hospital",
                "location_city": "Test City",
                "location_state": "CA"
            }
        )
        
        if onboarding_response.status_code != 200:
            print(f"Warning: Onboarding response: {onboarding_response.status_code} - {onboarding_response.text}")
        
        yield {
            "session_token": session_token,
            "user_id": user_id,
            "email": email,
            "due_date": due_date,
            "expected_week": 20  # 40 weeks total - 20 weeks until due = week 20
        }
    
    def test_personalized_content_requires_auth(self):
        """Test that /weekly-content requires authentication"""
        response = requests.get(f"{BASE_URL}/api/weekly-content")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ /api/weekly-content requires authentication")
    
    def test_personalized_content_returns_200_for_mom(self, test_mom_session):
        """Test that authenticated mom gets 200 response"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Authenticated mom gets 200 response")
    
    def test_personalized_content_has_correct_structure(self, test_mom_session):
        """Test that personalized response has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        data = response.json()
        
        required_fields = ["week", "display_week", "is_postpartum", "postpartum_week", "tip", "affirmation"]
        for field in required_fields:
            assert field in data, f"Response missing '{field}' field"
        
        print(f"✓ Response has all required fields: {required_fields}")
    
    def test_personalized_content_week_calculation(self, test_mom_session):
        """Test that week is calculated correctly based on due date"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        data = response.json()
        
        # With due date 20 weeks from now, mom should be at week 20 (40 - 20)
        expected_week = test_mom_session["expected_week"]
        actual_week = data.get("week")
        
        # Allow a 1-week margin for calculation differences
        assert abs(actual_week - expected_week) <= 1, f"Expected week ~{expected_week}, got {actual_week}"
        print(f"✓ Week calculated correctly: {actual_week} (expected ~{expected_week})")
    
    def test_personalized_content_not_postpartum(self, test_mom_session):
        """Test that mom with future due date is not marked as postpartum"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        data = response.json()
        
        assert data.get("is_postpartum") == False, "Mom with future due date should not be postpartum"
        assert data.get("postpartum_week") is None, "postpartum_week should be None for pregnancy"
        print("✓ Mom correctly marked as not postpartum")
    
    def test_personalized_content_has_tip(self, test_mom_session):
        """Test that personalized response includes a tip"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        data = response.json()
        
        tip = data.get("tip")
        assert tip is not None, "Tip should not be None"
        assert isinstance(tip, str), "Tip should be a string"
        assert len(tip) > 20, f"Tip seems too short: {tip}"
        print(f"✓ Personalized tip received ({len(tip)} chars)")
    
    def test_personalized_content_has_affirmation(self, test_mom_session):
        """Test that personalized response includes an affirmation"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        data = response.json()
        
        affirmation = data.get("affirmation")
        assert affirmation is not None, "Affirmation should not be None"
        assert isinstance(affirmation, str), "Affirmation should be a string"
        assert len(affirmation) > 10, f"Affirmation seems too short: {affirmation}"
        print(f"✓ Personalized affirmation received ({len(affirmation)} chars)")
    
    def test_personalized_content_display_week_format(self, test_mom_session):
        """Test that display_week is formatted correctly"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {test_mom_session['session_token']}"}
        )
        data = response.json()
        
        display_week = data.get("display_week")
        assert display_week is not None, "display_week should not be None"
        assert "Week" in display_week, f"display_week should contain 'Week': {display_week}"
        print(f"✓ Display week formatted correctly: {display_week}")


class TestWeeklyContentWithoutDueDate:
    """Test GET /api/weekly-content for mom without due date configured"""
    
    @pytest.fixture(scope="class")
    def mom_without_due_date(self):
        """Create a test mom user without completing full onboarding"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_nodue_mom_{unique_id}@test.com"
        
        # Register user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "full_name": "No Due Date Mom",
            "password": "TestPass123!",
            "role": "MOM"
        })
        
        if register_response.status_code != 200:
            pytest.skip(f"Failed to register test user: {register_response.text}")
        
        session_token = register_response.json().get("session_token")
        
        yield {"session_token": session_token, "email": email}
    
    def test_mom_without_due_date_gets_fallback(self, mom_without_due_date):
        """Test that mom without due date gets fallback content"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {mom_without_due_date['session_token']}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should get fallback content
        assert data.get("week") is None, "Week should be None without due date"
        assert data.get("tip") is not None, "Should still have a fallback tip"
        assert "onboarding" in data.get("tip", "").lower() or "due date" in data.get("tip", "").lower(), \
            "Fallback tip should mention onboarding or due date"
        
        print("✓ Mom without due date gets appropriate fallback content")


class TestWeeklyContentEdgeCases:
    """Test edge cases for weekly content calculations"""
    
    @pytest.fixture(scope="class")
    def postpartum_mom(self):
        """Create a test mom with due date in the past (postpartum)"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_postpartum_mom_{unique_id}@test.com"
        
        # Register user
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "full_name": "Postpartum Test Mom",
            "password": "TestPass123!",
            "role": "MOM"
        })
        
        if register_response.status_code != 200:
            pytest.skip(f"Failed to register test user: {register_response.text}")
        
        session_token = register_response.json().get("session_token")
        
        # Set due date 2 weeks ago (postpartum week 2-3)
        due_date = (datetime.now() - timedelta(weeks=2)).strftime("%Y-%m-%d")
        
        onboarding_response = requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            headers={"Authorization": f"Bearer {session_token}"},
            json={
                "due_date": due_date,
                "planned_birth_setting": "Hospital"
            }
        )
        
        yield {"session_token": session_token, "email": email, "due_date": due_date}
    
    def test_postpartum_mom_gets_postpartum_content(self, postpartum_mom):
        """Test that mom past due date gets postpartum content"""
        response = requests.get(
            f"{BASE_URL}/api/weekly-content",
            headers={"Authorization": f"Bearer {postpartum_mom['session_token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("is_postpartum") == True, "Mom past due date should be marked postpartum"
        assert data.get("postpartum_week") is not None, "postpartum_week should not be None"
        assert 1 <= data.get("postpartum_week", 0) <= 6, f"Postpartum week should be 1-6, got {data.get('postpartum_week')}"
        assert "Postpartum" in data.get("display_week", ""), "display_week should mention Postpartum"
        
        print(f"✓ Postpartum mom gets correct content: {data.get('display_week')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
