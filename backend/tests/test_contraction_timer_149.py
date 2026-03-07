"""
Test Contraction Timer Feature - Iteration 149
Tests all contraction timer APIs including:
- Session management (start, end, get active, history)
- Contraction timing (start, stop, manual add)
- Contraction CRUD (update, delete)
- 5-1-1 pattern detection
- Team sharing and provider dashboard
- Summary export
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestContractionTimerSetup:
    """Setup and authentication tests"""
    
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
    def midwife_session(self):
        """Login as Midwife user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        return data.get("session_token") or data.get("token")
    
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


class TestSessionManagement:
    """Test contraction session lifecycle"""
    
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
    
    def test_get_active_session_no_session(self, mom_headers):
        """GET /api/contractions/session/active - returns null session when no active"""
        # First clean up any existing sessions
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Either no session or we need to end existing one
        if data.get("session") and data["session"].get("status") in ["ACTIVE", "PAUSED"]:
            # End existing session first
            session_id = data["session"]["session_id"]
            end_response = requests.post(
                f"{BASE_URL}/api/contractions/session/{session_id}/end",
                headers=mom_headers
            )
            assert end_response.status_code == 200
    
    def test_start_session(self, mom_headers):
        """POST /api/contractions/session/start - start new session"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/session/start",
            headers=mom_headers,
            json={
                "is_shared_with_doula": True,
                "is_shared_with_midwife": False
            }
        )
        assert response.status_code == 200, f"Start session failed: {response.text}"
        data = response.json()
        assert "session" in data
        session = data["session"]
        assert session["status"] == "ACTIVE"
        assert session["is_shared_with_doula"] == True
        assert session["is_shared_with_midwife"] == False
        assert "session_id" in session
        return session
    
    def test_get_active_session_with_session(self, mom_headers):
        """GET /api/contractions/session/active - returns active session"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "session" in data
        assert "contractions" in data
        assert "stats" in data
        assert "pattern_status" in data
    
    def test_cannot_start_duplicate_session(self, mom_headers):
        """POST /api/contractions/session/start - cannot start when one already active"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/session/start",
            headers=mom_headers,
            json={"is_shared_with_doula": False, "is_shared_with_midwife": False}
        )
        assert response.status_code == 400
        assert "already have an active session" in response.json().get("detail", "").lower()
    
    def test_update_session_sharing(self, mom_headers):
        """PUT /api/contractions/session/{id} - update sharing preferences"""
        # Get active session ID
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        session_id = active["session"]["session_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/contractions/session/{session_id}",
            headers=mom_headers,
            json={"is_shared_with_midwife": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["session"]["is_shared_with_midwife"] == True


class TestContractionTiming:
    """Test contraction start/stop timing"""
    
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
    
    def test_start_contraction(self, mom_headers):
        """POST /api/contractions/start - start timing a contraction"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/start",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Start contraction failed: {response.text}"
        data = response.json()
        assert "contraction" in data
        contraction = data["contraction"]
        assert contraction["end_time"] is None
        assert "contraction_id" in contraction
        assert contraction["source"] == "TIMER"
    
    def test_cannot_start_when_one_running(self, mom_headers):
        """POST /api/contractions/start - cannot start when one already in progress"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/start",
            headers=mom_headers
        )
        assert response.status_code == 400
        assert "already in progress" in response.json().get("detail", "").lower()
    
    def test_stop_contraction_with_intensity(self, mom_headers):
        """POST /api/contractions/stop - stop with intensity"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/stop?intensity=MODERATE",
            headers=mom_headers
        )
        assert response.status_code == 200, f"Stop contraction failed: {response.text}"
        data = response.json()
        assert "contraction" in data
        contraction = data["contraction"]
        assert contraction["end_time"] is not None
        assert contraction["intensity"] == "MODERATE"
        assert contraction["duration_seconds"] is not None
        assert "stats" in data
        assert "pattern_status" in data
    
    def test_start_and_stop_mild(self, mom_headers):
        """Start and stop another contraction with MILD intensity"""
        # Start
        start_response = requests.post(
            f"{BASE_URL}/api/contractions/start",
            headers=mom_headers
        )
        assert start_response.status_code == 200
        
        # Stop with MILD
        stop_response = requests.post(
            f"{BASE_URL}/api/contractions/stop?intensity=MILD",
            headers=mom_headers
        )
        assert stop_response.status_code == 200
        data = stop_response.json()
        assert data["contraction"]["intensity"] == "MILD"
        # Verify interval was calculated
        assert data["contraction"]["interval_seconds_to_previous"] is not None
    
    def test_start_and_stop_strong(self, mom_headers):
        """Start and stop contraction with STRONG intensity"""
        # Start
        requests.post(f"{BASE_URL}/api/contractions/start", headers=mom_headers)
        
        # Stop with STRONG
        stop_response = requests.post(
            f"{BASE_URL}/api/contractions/stop?intensity=STRONG",
            headers=mom_headers
        )
        assert stop_response.status_code == 200
        assert stop_response.json()["contraction"]["intensity"] == "STRONG"
    
    def test_stop_without_intensity(self, mom_headers):
        """POST /api/contractions/stop - stop without intensity (skip)"""
        requests.post(f"{BASE_URL}/api/contractions/start", headers=mom_headers)
        
        response = requests.post(
            f"{BASE_URL}/api/contractions/stop",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["contraction"]["intensity"] is None


class TestManualContraction:
    """Test manual contraction entry"""
    
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
    
    def test_add_manual_contraction(self, mom_headers):
        """POST /api/contractions/manual - add manual contraction"""
        # Add a manual contraction for 1 hour ago
        start_time = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"
        end_time = (datetime.utcnow() - timedelta(hours=1) + timedelta(seconds=65)).isoformat() + "Z"
        
        response = requests.post(
            f"{BASE_URL}/api/contractions/manual",
            headers=mom_headers,
            json={
                "start_time": start_time,
                "end_time": end_time,
                "intensity": "MODERATE",
                "notes": "TEST_manual entry",
                "source": "MANUAL"
            }
        )
        assert response.status_code == 200, f"Manual add failed: {response.text}"
        data = response.json()
        assert "contraction" in data
        contraction = data["contraction"]
        assert contraction["source"] == "MANUAL"
        assert contraction["intensity"] == "MODERATE"
        assert contraction["duration_seconds"] == 65
        assert "TEST_manual" in (contraction.get("notes") or "")


class TestContractionCRUD:
    """Test contraction update and delete"""
    
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
    
    def test_update_contraction(self, mom_headers):
        """PUT /api/contractions/{id} - update contraction"""
        # Get active session contractions
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("contractions") and len(active["contractions"]) > 0:
            contraction_id = active["contractions"][0]["contraction_id"]
            
            response = requests.put(
                f"{BASE_URL}/api/contractions/{contraction_id}",
                headers=mom_headers,
                json={
                    "intensity": "STRONG",
                    "notes": "TEST_updated note"
                }
            )
            assert response.status_code == 200, f"Update failed: {response.text}"
            data = response.json()
            assert data["contraction"]["intensity"] == "STRONG"
            assert "TEST_updated" in (data["contraction"].get("notes") or "")
    
    def test_delete_contraction(self, mom_headers):
        """DELETE /api/contractions/{id} - delete contraction"""
        # First add a test contraction to delete
        start_time = (datetime.utcnow() - timedelta(minutes=30)).isoformat() + "Z"
        end_time = (datetime.utcnow() - timedelta(minutes=29)).isoformat() + "Z"
        
        add_response = requests.post(
            f"{BASE_URL}/api/contractions/manual",
            headers=mom_headers,
            json={
                "start_time": start_time,
                "end_time": end_time,
                "intensity": "MILD",
                "notes": "TEST_to_delete"
            }
        )
        assert add_response.status_code == 200
        contraction_id = add_response.json()["contraction"]["contraction_id"]
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/contractions/{contraction_id}",
            headers=mom_headers
        )
        assert delete_response.status_code == 200
        assert "deleted" in delete_response.json().get("message", "").lower()
    
    def test_update_nonexistent_returns_404(self, mom_headers):
        """PUT /api/contractions/{id} - 404 for nonexistent"""
        response = requests.put(
            f"{BASE_URL}/api/contractions/nonexistent_id_12345",
            headers=mom_headers,
            json={"intensity": "MILD"}
        )
        assert response.status_code == 404
    
    def test_delete_nonexistent_returns_404(self, mom_headers):
        """DELETE /api/contractions/{id} - 404 for nonexistent"""
        response = requests.delete(
            f"{BASE_URL}/api/contractions/nonexistent_id_12345",
            headers=mom_headers
        )
        assert response.status_code == 404


class TestSummaryAndExport:
    """Test session summary and export"""
    
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
    
    def test_get_session_summary(self, mom_headers):
        """GET /api/contractions/session/{id}/summary - get detailed summary"""
        # Get active session ID
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session"):
            session_id = active["session"]["session_id"]
            
            response = requests.get(
                f"{BASE_URL}/api/contractions/session/{session_id}/summary",
                headers=mom_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "session" in data
            assert "contractions" in data
            assert "stats" in data
            assert "pattern_status" in data
            assert "intensity_breakdown" in data
    
    def test_export_session_summary(self, mom_headers):
        """GET /api/contractions/session/{id}/export - export summary text"""
        active = requests.get(
            f"{BASE_URL}/api/contractions/session/active",
            headers=mom_headers
        ).json()
        
        if active.get("session"):
            session_id = active["session"]["session_id"]
            
            response = requests.get(
                f"{BASE_URL}/api/contractions/session/{session_id}/export",
                headers=mom_headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "summary_text" in data
            assert "CONTRACTION TIMING SUMMARY" in data["summary_text"]
            assert "True Joy Birthing" in data["summary_text"]


class TestSessionHistory:
    """Test session history"""
    
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
    
    def test_get_sessions_history(self, mom_headers):
        """GET /api/contractions/sessions/history - get past sessions"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/sessions/history",
            headers=mom_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "sessions" in data
        assert isinstance(data["sessions"], list)


class TestTeamSharing:
    """Test team sharing and provider access"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    @pytest.fixture(scope="class")
    def midwife_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    def test_doula_get_active_clients(self, doula_session):
        """GET /api/contractions/team/active-clients - doula dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/team/active-clients",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "active_clients" in data
        assert isinstance(data["active_clients"], list)
    
    def test_midwife_get_active_clients(self, midwife_session):
        """GET /api/contractions/team/active-clients - midwife dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/contractions/team/active-clients",
            headers={"Authorization": f"Bearer {midwife_session}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "active_clients" in data


class TestAccessControl:
    """Test role-based access control"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        return response.json().get("session_token") or response.json().get("token")
    
    def test_doula_cannot_start_session(self, doula_session):
        """POST /api/contractions/session/start - doula cannot start session"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/session/start",
            headers={"Authorization": f"Bearer {doula_session}"},
            json={"is_shared_with_doula": False, "is_shared_with_midwife": False}
        )
        assert response.status_code == 403
    
    def test_doula_cannot_start_contraction(self, doula_session):
        """POST /api/contractions/start - doula cannot time contractions"""
        response = requests.post(
            f"{BASE_URL}/api/contractions/start",
            headers={"Authorization": f"Bearer {doula_session}"}
        )
        assert response.status_code == 403
    
    def test_unauthenticated_returns_401(self):
        """All endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/contractions/session/active")
        assert response.status_code == 401


class TestEndSession:
    """Test session end and cleanup"""
    
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
    
    def test_end_session(self, mom_headers):
        """POST /api/contractions/session/{id}/end - end session"""
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
            data = response.json()
            assert data["session"]["status"] == "ENDED"
            assert data["session"]["ended_at"] is not None
    
    def test_cannot_end_already_ended(self, mom_headers):
        """POST /api/contractions/session/{id}/end - cannot end already ended session"""
        history = requests.get(
            f"{BASE_URL}/api/contractions/sessions/history",
            headers=mom_headers
        ).json()
        
        if history.get("sessions") and len(history["sessions"]) > 0:
            ended_session = next(
                (s for s in history["sessions"] if s["status"] == "ENDED"),
                None
            )
            if ended_session:
                response = requests.post(
                    f"{BASE_URL}/api/contractions/session/{ended_session['session_id']}/end",
                    headers=mom_headers
                )
                assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
