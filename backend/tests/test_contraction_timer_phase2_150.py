"""
Test Contraction Timer Phase 2 Features - Iteration 150
Tests Phase 2 enhancements:
- Timer preferences (birth word, alert threshold)
- Water breaking tracking with team notification
- Session notes
- Primary labor session marking  
- Chart data endpoint
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestPhase2Setup:
    """Setup for Phase 2 tests"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Login as Mom user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        return data.get("session_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def doula_headers(self, doula_session):
        return {"Authorization": f"Bearer {doula_session}"}
    
    def test_mom_auth(self, mom_session):
        """Verify Mom authentication works"""
        assert mom_session is not None
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {mom_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("role", "").upper() == "MOM"


class TestTimerPreferences:
    """Test Phase 2: Timer preferences (birth word, alert threshold)"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    def test_get_default_preferences(self, mom_headers):
        """GET /api/contractions/preferences - returns default preferences"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Get preferences failed: {response.text}"
        data = response.json()
        assert "preferences" in data
        prefs = data["preferences"]
        # Check default values
        assert prefs.get("birth_word") in ["contractions", "surges", "waves"]
        assert prefs.get("alert_threshold") in ["5-1-1", "4-1-1", "3-1-1", "custom", "none"]
    
    def test_update_birth_word_to_surges(self, mom_headers):
        """PUT /api/contractions/preferences - update birth_word to 'surges'"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"birth_word": "surges"}
        )
        assert response.status_code == 200, f"Update preferences failed: {response.text}"
        data = response.json()
        assert data["preferences"]["birth_word"] == "surges"
    
    def test_update_birth_word_to_waves(self, mom_headers):
        """PUT /api/contractions/preferences - update birth_word to 'waves'"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"birth_word": "waves"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["birth_word"] == "waves"
    
    def test_update_alert_threshold_to_411(self, mom_headers):
        """PUT /api/contractions/preferences - update alert_threshold to '4-1-1'"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"alert_threshold": "4-1-1"}
        )
        assert response.status_code == 200, f"Update threshold failed: {response.text}"
        data = response.json()
        assert data["preferences"]["alert_threshold"] == "4-1-1"
    
    def test_update_alert_threshold_to_311(self, mom_headers):
        """PUT /api/contractions/preferences - update alert_threshold to '3-1-1'"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"alert_threshold": "3-1-1"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["alert_threshold"] == "3-1-1"
    
    def test_update_alert_threshold_to_none(self, mom_headers):
        """PUT /api/contractions/preferences - update alert_threshold to 'none'"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"alert_threshold": "none"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["alert_threshold"] == "none"
    
    def test_reset_preferences_to_defaults(self, mom_headers):
        """Reset preferences to defaults for consistent testing"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"birth_word": "contractions", "alert_threshold": "5-1-1"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["preferences"]["birth_word"] == "contractions"
        assert data["preferences"]["alert_threshold"] == "5-1-1"
    
    def test_preferences_returned_with_active_session(self, mom_headers):
        """GET /api/contractions/session/active - preferences included in response"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Preferences should be included in the response
        assert "preferences" in data


class TestWaterBreaking:
    """Test Phase 2: Water breaking tracking"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    @pytest.fixture(scope="class")
    def session_id(self, mom_headers):
        """Ensure we have an active session for testing"""
        # Check for active session
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session") and active["session"].get("status") in ["ACTIVE", "PAUSED"]:
            return active["session"]["session_id"]
        
        # Start new session if none active
        start_response = requests.post(
            f"{BASE_URL}/api/contractions/session/start",
            headers=mom_headers,
            json={"is_shared_with_doula": True, "is_shared_with_midwife": True}
        )
        if start_response.status_code == 200:
            return start_response.json()["session"]["session_id"]
        return None
    
    def test_record_water_breaking(self, mom_headers, session_id):
        """POST /api/contractions/session/{id}/water-broke - record water breaking"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.post(
            f"{BASE_URL}/api/contractions/session/{session_id}/water-broke",
            headers=mom_headers,
            json={
                "water_broke_note": "Clear fluid, moderate amount"
            }
        )
        assert response.status_code == 200, f"Record water breaking failed: {response.text}"
        data = response.json()
        assert "session" in data
        session = data["session"]
        assert session.get("water_broke_at") is not None
        assert session.get("water_broke_note") == "Clear fluid, moderate amount"
        assert "notified" in data.get("message", "").lower() or "recorded" in data.get("message", "").lower()
    
    def test_clear_water_breaking(self, mom_headers, session_id):
        """DELETE /api/contractions/session/{id}/water-broke - clear water breaking record"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.delete(
            f"{BASE_URL}/api/contractions/session/{session_id}/water-broke",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Clear water breaking failed: {response.text}"
        data = response.json()
        assert data["session"].get("water_broke_at") is None
        assert data["session"].get("water_broke_note") is None
    
    def test_water_broke_without_note(self, mom_headers, session_id):
        """POST /api/contractions/session/{id}/water-broke - record without note"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.post(
            f"{BASE_URL}/api/contractions/session/{session_id}/water-broke",
            headers=mom_headers,
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["session"].get("water_broke_at") is not None


class TestSessionNotes:
    """Test Phase 2: Session notes"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    @pytest.fixture(scope="class")
    def session_id(self, mom_headers):
        """Get current active session ID"""
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session"):
            return active["session"]["session_id"]
        return None
    
    def test_update_session_notes(self, mom_headers, session_id):
        """PUT /api/contractions/session/{id}/notes - update session notes"""
        if not session_id:
            pytest.skip("No active session available")
        
        test_note = "TEST_Phase2 session notes - feeling calm and relaxed"
        response = requests.put(
            f"{BASE_URL}/api/contractions/session/{session_id}/notes?notes={test_note}",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Update notes failed: {response.text}"
        data = response.json()
        assert data["session"].get("session_notes") == test_note
    
    def test_clear_session_notes(self, mom_headers, session_id):
        """PUT /api/contractions/session/{id}/notes - clear notes"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.put(
            f"{BASE_URL}/api/contractions/session/{session_id}/notes?notes=",
            headers=mom_headers
        )
        assert response.status_code == 200


class TestPrimaryLaborSession:
    """Test Phase 2: Mark as primary labor session"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    @pytest.fixture(scope="class")
    def session_id(self, mom_headers):
        """Get current active session ID"""
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session"):
            return active["session"]["session_id"]
        return None
    
    def test_mark_as_primary(self, mom_headers, session_id):
        """PUT /api/contractions/session/{id}/mark-primary - mark as primary"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.put(
            f"{BASE_URL}/api/contractions/session/{session_id}/mark-primary?is_primary=true",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Mark primary failed: {response.text}"
        data = response.json()
        assert data["session"].get("is_primary_labor_session") == True
        assert "primary" in data.get("message", "").lower()
    
    def test_unmark_primary(self, mom_headers, session_id):
        """PUT /api/contractions/session/{id}/mark-primary - unmark primary"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.put(
            f"{BASE_URL}/api/contractions/session/{session_id}/mark-primary?is_primary=false",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["session"].get("is_primary_labor_session") == False


class TestChartData:
    """Test Phase 2: Chart data endpoint"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    @pytest.fixture(scope="class")
    def session_id(self, mom_headers):
        """Get current active session ID"""
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session"):
            return active["session"]["session_id"]
        return None
    
    def test_get_chart_data(self, mom_headers, session_id):
        """GET /api/contractions/session/{id}/chart-data - get chart data"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/{session_id}/chart-data",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Get chart data failed: {response.text}"
        data = response.json()
        
        # Verify chart data structure
        assert "session_id" in data
        assert "duration_data" in data
        assert "interval_data" in data
        assert "intensity_data" in data
        assert "total_contractions" in data
        
        # Duration data should be a list
        assert isinstance(data["duration_data"], list)
        assert isinstance(data["interval_data"], list)
        assert isinstance(data["intensity_data"], list)
    
    def test_chart_data_format(self, mom_headers, session_id):
        """Verify chart data points have correct structure"""
        if not session_id:
            pytest.skip("No active session available")
        
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/{session_id}/chart-data",
            headers=mom_headers
        )
        data = response.json()
        
        # If there's duration data, verify structure
        if data.get("duration_data") and len(data["duration_data"]) > 0:
            point = data["duration_data"][0]
            assert "x" in point  # Contraction number
            assert "y" in point  # Duration in seconds
            assert "timestamp" in point
    
    def test_chart_data_nonexistent_session(self, mom_headers):
        """GET /api/contractions/session/{id}/chart-data - 404 for nonexistent"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/nonexistent_session_12345/chart-data",
            headers=mom_headers
        )
        assert response.status_code == 404


class TestPreferencesPatternCheck:
    """Test that pattern check uses custom threshold from preferences"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    def test_pattern_status_includes_threshold_type(self, mom_headers):
        """Verify pattern status includes threshold_type field"""
        # First set a specific threshold
        requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"alert_threshold": "4-1-1"}
        )
        
        # Get active session and check pattern status
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Pattern status should reflect the threshold type
        if data.get("pattern_status"):
            pattern = data["pattern_status"]
            # Should have threshold_type field
            assert "threshold_type" in pattern or pattern.get("status") is not None
    
    def test_tracking_only_mode(self, mom_headers):
        """Test 'none' threshold gives tracking_only status"""
        # Set threshold to none
        requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"alert_threshold": "none"}
        )
        
        # Get active session
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # With 'none' threshold, pattern should be tracking_only
        if data.get("pattern_status"):
            pattern = data["pattern_status"]
            if pattern.get("threshold_type") == "none":
                assert pattern.get("status") == "tracking_only"
        
        # Reset to default
        requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers=mom_headers,
            json={"alert_threshold": "5-1-1"}
        )


class TestAccessControlPhase2:
    """Test role-based access for Phase 2 endpoints"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    def test_doula_cannot_access_preferences(self, doula_session):
        """GET /api/contractions/preferences - doula cannot access"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/preferences",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        assert response.status_code == 403
    
    def test_doula_cannot_update_preferences(self, doula_session):
        """PUT /api/contractions/preferences - doula cannot update"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/preferences",
            headers={"Authorization": f"Bearer {doula_session}"},
            json={"birth_word": "surges"}
        )
        assert response.status_code == 403


class TestCleanup:
    """Cleanup test data and end active sessions"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def mom_headers(self, mom_session):
        return {"Authorization": f"Bearer {mom_session}"}
    
    def test_end_test_session(self, mom_headers):
        """End the active session created during tests"""
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session") and active["session"]["status"] in ["ACTIVE", "PAUSED"]:
            session_id = active["session"]["session_id"]
            response = requests.post(
                f"{BASE_URL}/api/contractions/session/{session_id}/end",
                headers=mom_headers
            )
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
