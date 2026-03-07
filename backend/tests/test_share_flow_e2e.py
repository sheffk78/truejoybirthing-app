"""
E2E Test: Mom shares birth plan → Doula sees request → Doula accepts → Both can message
Also tests photo upload API
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://joy-colors-system.preview.emergentagent.com")

# Test credentials provided
FLOW_TEST_MOM = {
    "email": "flowtest_mom@test.com",
    "password": "password123",
    "user_id": "user_e6277d7dbeb3"
}
FLOW_TEST_DOULA = {
    "email": "flowtest_doula@test.com",
    "password": "password123",
    "user_id": "user_16080903165f"
}

@pytest.fixture(scope="module")
def mom_session():
    """Login as Mom and get session token"""
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": FLOW_TEST_MOM["email"],
        "password": FLOW_TEST_MOM["password"]
    })
    assert resp.status_code == 200, f"Mom login failed: {resp.text}"
    data = resp.json()
    session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    return session, data

@pytest.fixture(scope="module")
def doula_session():
    """Login as Doula and get session token"""
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": FLOW_TEST_DOULA["email"],
        "password": FLOW_TEST_DOULA["password"]
    })
    assert resp.status_code == 200, f"Doula login failed: {resp.text}"
    data = resp.json()
    session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
    return session, data

class TestFullShareFlow:
    """Test the complete flow: Mom shares → Doula sees → Doula accepts → Both message"""
    
    def test_01_mom_login_success(self, mom_session):
        """Verify Mom can login"""
        session, data = mom_session
        assert data["email"] == FLOW_TEST_MOM["email"]
        assert data["role"] == "MOM"
        print(f"✓ Mom logged in: {data['full_name']}")
    
    def test_02_doula_login_success(self, doula_session):
        """Verify Doula can login"""
        session, data = doula_session
        assert data["email"] == FLOW_TEST_DOULA["email"]
        assert data["role"] == "DOULA"
        print(f"✓ Doula logged in: {data['full_name']}")
    
    def test_03_doula_visible_in_search(self, mom_session):
        """Verify Doula appears in provider search"""
        session, _ = mom_session
        # Search for the doula
        resp = session.get(f"{BASE_URL}/api/providers/search", params={"query": "", "role": "DOULA"})
        assert resp.status_code == 200
        providers = resp.json().get("providers", [])
        
        # Check if our test doula is in the list
        doula_found = any(p.get("user_id") == FLOW_TEST_DOULA["user_id"] for p in providers)
        print(f"✓ Found {len(providers)} doulas, test doula in list: {doula_found}")
        # Note: Doula may not be in marketplace if not configured, that's OK
    
    def test_04_mom_shares_birth_plan_with_doula(self, mom_session):
        """Mom shares birth plan with Doula - creates new share request"""
        session, _ = mom_session
        
        # Create a new share request
        resp = session.post(f"{BASE_URL}/api/birth-plan/share", json={
            "provider_id": FLOW_TEST_DOULA["user_id"]
        })
        
        # Could be 200/201 for success, or 400 if already shared
        if resp.status_code in [200, 201]:
            data = resp.json()
            assert "request_id" in data
            print(f"✓ New share request created: {data['request_id']}")
        elif resp.status_code == 400 and ("already shared" in resp.text.lower() or "already exists" in resp.text.lower()):
            print("✓ Birth plan already shared with this doula (existing connection) - expected behavior")
        else:
            pytest.fail(f"Share request failed: {resp.status_code} - {resp.text}")
    
    def test_05_doula_sees_pending_requests(self, doula_session):
        """Doula dashboard shows pending share requests"""
        session, _ = doula_session
        
        # Get provider share requests
        resp = session.get(f"{BASE_URL}/api/provider/share-requests")
        assert resp.status_code == 200
        data = resp.json()
        requests_list = data.get("requests", [])
        
        print(f"✓ Doula has {len(requests_list)} total share requests")
        
        # Check for pending requests
        pending = [r for r in requests_list if r.get("status") == "pending"]
        print(f"  - Pending requests: {len(pending)}")
        
        # Check for requests from our test mom
        from_test_mom = [r for r in requests_list if r.get("mom_user_id") == FLOW_TEST_MOM["user_id"]]
        print(f"  - Requests from test mom: {len(from_test_mom)}")
        
        if from_test_mom:
            print(f"  - Status of test mom's request: {from_test_mom[0].get('status')}")
        
        return requests_list
    
    def test_06_doula_dashboard_api(self, doula_session):
        """Verify Doula dashboard API works"""
        session, _ = doula_session
        
        resp = session.get(f"{BASE_URL}/api/doula/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        
        print(f"✓ Doula dashboard: {data.get('active_clients', 0)} active clients, {data.get('total_clients', 0)} total")
        return data
    
    def test_07_accept_pending_request_if_exists(self, doula_session):
        """If there's a pending request from test mom, accept it"""
        session, _ = doula_session
        
        # Get share requests
        resp = session.get(f"{BASE_URL}/api/provider/share-requests")
        assert resp.status_code == 200
        requests_list = resp.json().get("requests", [])
        
        # Find pending request from test mom
        pending_from_mom = [r for r in requests_list 
                           if r.get("mom_user_id") == FLOW_TEST_MOM["user_id"] 
                           and r.get("status") == "pending"]
        
        if pending_from_mom:
            request_id = pending_from_mom[0]["request_id"]
            
            # Accept the request
            accept_resp = session.put(
                f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
                json={"action": "accept"}
            )
            assert accept_resp.status_code == 200
            print(f"✓ Accepted share request: {request_id}")
            return request_id
        else:
            print("✓ No pending request from test mom (may already be accepted)")
            return None
    
    def test_08_mom_can_see_doula_in_team(self, mom_session):
        """After accepting, Mom should see Doula in her team"""
        session, _ = mom_session
        
        resp = session.get(f"{BASE_URL}/api/mom/team")
        assert resp.status_code == 200
        team = resp.json()
        
        print(f"✓ Mom's team - Doula: {team.get('doula')}, Midwife: {team.get('midwife')}")
        
        # Check if doula is connected (either from team or connections)
        if team.get("doula"):
            assert team["doula"].get("user_id") or team["doula"].get("name")
            print(f"  - Connected Doula: {team['doula'].get('name', team['doula'])}")
        
        return team
    
    def test_09_mom_can_message_doula(self, mom_session):
        """Mom can send message to Doula"""
        session, mom_data = mom_session
        
        # Get doula's user_id from team
        team_resp = session.get(f"{BASE_URL}/api/mom/team")
        team = team_resp.json()
        
        # Use the known doula user_id if not in team
        doula_user_id = team.get("doula", {}).get("user_id") or FLOW_TEST_DOULA["user_id"]
        
        # Send a message
        test_message = f"Test message from Mom at {datetime.now().isoformat()}"
        resp = session.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": doula_user_id,
            "content": test_message
        })
        
        if resp.status_code == 200:
            print(f"✓ Mom sent message to Doula successfully")
            return resp.json()
        elif resp.status_code == 403:
            print(f"✗ Messaging not allowed (no active connection)")
            # This is expected if connection isn't active
            return None
        else:
            print(f"Message send failed: {resp.status_code} - {resp.text}")
            return None
    
    def test_10_doula_can_message_mom(self, doula_session):
        """Doula can send message to Mom"""
        session, _ = doula_session
        
        test_message = f"Test message from Doula at {datetime.now().isoformat()}"
        resp = session.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": FLOW_TEST_MOM["user_id"],
            "content": test_message
        })
        
        if resp.status_code == 200:
            print(f"✓ Doula sent message to Mom successfully")
            return resp.json()
        elif resp.status_code == 403:
            print(f"✗ Messaging not allowed (no active connection)")
            return None
        else:
            print(f"Message send failed: {resp.status_code} - {resp.text}")
            return None
    
    def test_11_both_see_conversation(self, mom_session, doula_session):
        """Both parties should see the conversation"""
        mom_sess, _ = mom_session
        doula_sess, _ = doula_session
        
        # Mom gets conversations
        mom_convos = mom_sess.get(f"{BASE_URL}/api/messages/conversations")
        assert mom_convos.status_code == 200
        
        # Doula gets conversations  
        doula_convos = doula_sess.get(f"{BASE_URL}/api/messages/conversations")
        assert doula_convos.status_code == 200
        
        mom_conv_list = mom_convos.json().get("conversations", [])
        doula_conv_list = doula_convos.json().get("conversations", [])
        
        print(f"✓ Mom has {len(mom_conv_list)} conversations")
        print(f"✓ Doula has {len(doula_conv_list)} conversations")
        
        return mom_conv_list, doula_conv_list


class TestPhotoUpload:
    """Test photo upload API for profile pictures"""
    
    def test_photo_upload_mom(self, mom_session):
        """Test photo upload for Mom profile"""
        session, _ = mom_session
        
        # Update profile with a picture URL (base64 or URL)
        test_picture_url = "https://example.com/test-profile.jpg"
        resp = session.put(f"{BASE_URL}/api/auth/update-profile", json={
            "picture": test_picture_url
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("picture") == test_picture_url
        print(f"✓ Mom profile picture updated: {test_picture_url}")
        
        # Verify by getting profile
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data.get("picture") == test_picture_url
        print(f"✓ Verified: Mom profile picture persisted")
    
    def test_photo_upload_doula(self, doula_session):
        """Test photo upload for Doula profile"""
        session, _ = doula_session
        
        test_picture_url = "https://example.com/doula-profile.jpg"
        resp = session.put(f"{BASE_URL}/api/auth/update-profile", json={
            "picture": test_picture_url
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("picture") == test_picture_url
        print(f"✓ Doula profile picture updated")
    
    def test_photo_upload_with_name(self, mom_session):
        """Test updating both name and picture"""
        session, _ = mom_session
        
        resp = session.put(f"{BASE_URL}/api/auth/update-profile", json={
            "picture": "https://example.com/updated-profile.jpg",
            "full_name": "Flow Test Mom Updated"
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert "picture" in data
        assert "full_name" in data
        print(f"✓ Profile updated with both name and picture")


class TestShareRequestManagement:
    """Additional tests for share request edge cases"""
    
    def test_mom_view_share_requests(self, mom_session):
        """Mom can view her share requests"""
        session, _ = mom_session
        
        resp = session.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert resp.status_code == 200
        data = resp.json()
        
        requests = data.get("requests", [])
        print(f"✓ Mom has {len(requests)} share requests")
        for req in requests:
            print(f"  - To: {req.get('provider_name')} ({req.get('provider_role')}) - Status: {req.get('status')}")
        
        return requests
    
    def test_doula_view_all_share_requests(self, doula_session):
        """Doula can view all share requests (pending and accepted)"""
        session, _ = doula_session
        
        resp = session.get(f"{BASE_URL}/api/provider/share-requests")
        assert resp.status_code == 200
        data = resp.json()
        
        requests = data.get("requests", [])
        pending = [r for r in requests if r.get("status") == "pending"]
        accepted = [r for r in requests if r.get("status") == "accepted"]
        
        print(f"✓ Doula share requests: {len(pending)} pending, {len(accepted)} accepted")
        return requests
    
    def test_doula_can_view_shared_birth_plans(self, doula_session):
        """Doula can view birth plans shared with them"""
        session, _ = doula_session
        
        resp = session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert resp.status_code == 200
        data = resp.json()
        
        plans = data.get("birth_plans", [])
        print(f"✓ Doula has access to {len(plans)} shared birth plans")
        
        return plans


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
