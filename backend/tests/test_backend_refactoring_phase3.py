"""
Backend Refactoring Phase 3 - Notifications and Messages Routes Tests

Tests for:
- GET /api/notifications - Get notifications with unread count
- PUT /api/notifications/{id}/read - Mark notification as read
- PUT /api/notifications/read-all - Mark all notifications as read
- GET /api/messages/conversations - Get conversation list
- GET /api/messages/{user_id} - Get messages between users
- GET /api/messages/unread/count - Get unread message count
- POST /api/messages - Send a message
- GET /api/messages/client/{client_id} - Get client messages (provider only)
"""

import pytest
import requests
import os
from datetime import datetime

# Use environment variable for base URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://tjb-preview-stable.preview.emergentagent.com"

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


class TestAuthSetup:
    """Test authentication setup for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as doula and return authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"session": session, "user": data}
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Login as mom and return authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Mom login failed: {response.text}")
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"session": session, "user": data}
    
    def test_doula_login_works(self, doula_session):
        """Verify doula login works"""
        assert doula_session["user"]["email"] == DOULA_EMAIL
        assert doula_session["user"]["role"] == "DOULA"
        print(f"Doula logged in: {doula_session['user']['user_id']}")


class TestNotificationsRoutes:
    """Tests for /api/notifications endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session for tests"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session
    
    def test_get_notifications_returns_list_and_count(self, auth_session):
        """GET /api/notifications - Returns notifications with unread_count"""
        response = auth_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "notifications" in data, "Response missing 'notifications' field"
        assert "unread_count" in data, "Response missing 'unread_count' field"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        print(f"Notifications returned: {len(data['notifications'])}, Unread: {data['unread_count']}")
    
    def test_get_notifications_unread_only_filter(self, auth_session):
        """GET /api/notifications?unread_only=true - Filters unread notifications"""
        response = auth_session.get(f"{BASE_URL}/api/notifications", params={"unread_only": True})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "notifications" in data
        assert "unread_count" in data
        # All returned notifications should be unread (if any)
        for notif in data["notifications"]:
            assert notif.get("read") == False, f"Expected unread notification, got: {notif}"
        print(f"Unread only filter: {len(data['notifications'])} notifications")
    
    def test_get_notifications_without_auth_fails(self):
        """GET /api/notifications without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated request correctly rejected")
    
    def test_mark_nonexistent_notification_returns_404(self, auth_session):
        """PUT /api/notifications/nonexistent/read - Returns 404"""
        response = auth_session.put(f"{BASE_URL}/api/notifications/nonexistent_id_123/read")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent notification correctly returns 404")
    
    def test_mark_all_notifications_read(self, auth_session):
        """PUT /api/notifications/read-all - Marks all notifications as read"""
        response = auth_session.put(f"{BASE_URL}/api/notifications/read-all")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Mark all read response: {data}")
        
        # Verify unread count is 0
        verify_response = auth_session.get(f"{BASE_URL}/api/notifications")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["unread_count"] == 0, f"Expected 0 unread, got {verify_data['unread_count']}"
        print("Verified: unread_count is 0 after mark-all-read")


class TestMessagesRoutes:
    """Tests for /api/messages endpoints"""
    
    @pytest.fixture(scope="class")
    def doula_auth(self):
        """Get authenticated doula session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"session": session, "user": data}
    
    @pytest.fixture(scope="class")
    def mom_auth(self):
        """Get authenticated mom session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Mom login failed: {response.text}")
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"session": session, "user": data}
    
    def test_get_conversations_returns_list(self, doula_auth):
        """GET /api/messages/conversations - Returns conversation list"""
        response = doula_auth["session"].get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "conversations" in data, "Response missing 'conversations' field"
        assert isinstance(data["conversations"], list), "conversations should be a list"
        
        # Verify conversation structure if there are any
        if data["conversations"]:
            conv = data["conversations"][0]
            expected_fields = ["other_user_id", "other_user_name", "unread_count", "last_message_content"]
            for field in expected_fields:
                assert field in conv, f"Conversation missing '{field}' field"
        
        print(f"Conversations returned: {len(data['conversations'])}")
    
    def test_get_unread_message_count(self, doula_auth):
        """GET /api/messages/unread/count - Returns unread count"""
        response = doula_auth["session"].get(f"{BASE_URL}/api/messages/unread/count")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "unread_count" in data, "Response missing 'unread_count' field"
        assert isinstance(data["unread_count"], int), "unread_count should be integer"
        print(f"Unread message count: {data['unread_count']}")
    
    def test_get_messages_with_nonexistent_user(self, doula_auth):
        """GET /api/messages/{user_id} - Returns 404 for non-existent user"""
        response = doula_auth["session"].get(f"{BASE_URL}/api/messages/nonexistent_user_id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent user correctly returns 404")
    
    def test_send_message_to_nonexistent_user_fails(self, doula_auth):
        """POST /api/messages - Fails for non-existent recipient"""
        response = doula_auth["session"].post(f"{BASE_URL}/api/messages", json={
            "receiver_id": "nonexistent_user_999",
            "content": "Test message"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Message to non-existent user correctly rejected")
    
    def test_send_message_to_self_fails(self, doula_auth):
        """POST /api/messages - Cannot send message to yourself"""
        user_id = doula_auth["user"]["user_id"]
        response = doula_auth["session"].post(f"{BASE_URL}/api/messages", json={
            "receiver_id": user_id,
            "content": "Message to self"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Message to self correctly rejected")
    
    def test_send_empty_message_fails(self, doula_auth):
        """POST /api/messages - Empty message content rejected"""
        # First get a valid user to send to (from conversations)
        conv_response = doula_auth["session"].get(f"{BASE_URL}/api/messages/conversations")
        if conv_response.status_code != 200 or not conv_response.json().get("conversations"):
            pytest.skip("No conversations available to test empty message")
        
        other_user_id = conv_response.json()["conversations"][0]["other_user_id"]
        response = doula_auth["session"].post(f"{BASE_URL}/api/messages", json={
            "receiver_id": other_user_id,
            "content": "   "  # Empty/whitespace content
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Empty message content correctly rejected")
    
    def test_get_client_messages_requires_provider_role(self, doula_auth):
        """GET /api/messages/client/{client_id} - Requires DOULA/MIDWIFE role"""
        # First get a client_id from the doula's clients
        clients_response = doula_auth["session"].get(f"{BASE_URL}/api/provider/clients")
        if clients_response.status_code != 200:
            pytest.skip("Could not fetch provider clients")
        
        clients = clients_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0].get("client_id")
        if not client_id:
            pytest.skip("Client has no client_id")
        
        response = doula_auth["session"].get(f"{BASE_URL}/api/messages/client/{client_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert isinstance(response.json(), list), "Client messages should be a list"
        print(f"Client messages retrieved: {len(response.json())} messages")
    
    def test_get_client_messages_nonexistent_client(self, doula_auth):
        """GET /api/messages/client/{client_id} - Returns 404 for non-existent client"""
        response = doula_auth["session"].get(f"{BASE_URL}/api/messages/client/nonexistent_client_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent client correctly returns 404")
    
    def test_messages_without_auth_fails(self):
        """GET /api/messages/conversations without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated request correctly rejected")


class TestMessagingFlow:
    """End-to-end messaging flow tests (if mom account available)"""
    
    @pytest.fixture(scope="class")
    def doula_auth(self):
        """Get authenticated doula session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"session": session, "user": data}
    
    @pytest.fixture(scope="class")
    def mom_auth(self):
        """Get authenticated mom session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Mom login failed: {response.text}")
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"session": session, "user": data}
    
    def test_get_messages_between_users(self, doula_auth):
        """GET /api/messages/{user_id} - Get messages between two users"""
        # Get conversations first to find a valid user
        conv_response = doula_auth["session"].get(f"{BASE_URL}/api/messages/conversations")
        if conv_response.status_code != 200 or not conv_response.json().get("conversations"):
            pytest.skip("No conversations available")
        
        other_user_id = conv_response.json()["conversations"][0]["other_user_id"]
        response = doula_auth["session"].get(f"{BASE_URL}/api/messages/{other_user_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "messages" in data, "Response missing 'messages' field"
        assert "other_user" in data, "Response missing 'other_user' field"
        assert isinstance(data["messages"], list)
        
        # Verify other_user structure
        other_user = data["other_user"]
        assert "user_id" in other_user
        assert "full_name" in other_user
        
        print(f"Messages with {other_user.get('full_name')}: {len(data['messages'])}")


class TestLoginAndCoreNavigation:
    """Verify login and core provider navigation still works"""
    
    def test_login_doula(self):
        """Login as doula succeeds"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data["role"] == "DOULA"
        assert "session_token" in data
        print(f"Doula login successful: {data['user_id']}")
    
    def test_get_current_user(self):
        """GET /api/auth/me - Returns current user info"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["email"] == DOULA_EMAIL
        assert data["role"] == "DOULA"
        print(f"Auth/me successful: {data['full_name']}")
    
    def test_get_provider_clients(self):
        """GET /api/provider/clients - Returns client list"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["session_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200, f"Failed: {response.text}"
        clients = response.json()
        assert isinstance(clients, list)
        print(f"Provider clients: {len(clients)} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
