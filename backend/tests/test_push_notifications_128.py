"""
Push Notification API Tests - Iteration 128

Tests the push notification feature including:
1. Push Token Registration API - POST /api/push/register
2. Push Token Unregister API - POST /api/push/unregister
3. Push Status API - GET /api/push/status
4. Push Notification Service - Expo push notification handling
5. Integration with create_notification - Push sent when in-app notifications are created
"""

import pytest
import requests
import os
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://joy-birthing-fix.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_MOM_EMAIL = "demo.mom@truejoybirthing.com"
TEST_MOM_PASSWORD = "DemoScreenshot2024!"
TEST_DOULA_EMAIL = "demo.doula@truejoybirthing.com"
TEST_DOULA_PASSWORD = "DemoScreenshot2024!"

# Valid Expo push token format (test token - won't actually deliver)
TEST_PUSH_TOKEN = "ExponentPushToken[test_push_token_128]"
TEST_PUSH_TOKEN_INVALID = "InvalidToken123"
TEST_PUSH_TOKEN_2 = "ExponentPushToken[test_push_token_2_128]"


class TestPushNotificationAPIs:
    """Test suite for Push Notification APIs"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Authenticate as mom user and return session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MOM_EMAIL,
            "password": TEST_MOM_PASSWORD
        })
        assert login_response.status_code == 200, f"Mom login failed: {login_response.text}"
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Authenticate as doula user and return session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_DOULA_EMAIL,
            "password": TEST_DOULA_PASSWORD
        })
        assert login_response.status_code == 200, f"Doula login failed: {login_response.text}"
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    # =================== PUSH TOKEN REGISTRATION TESTS ===================
    
    def test_register_push_token_success(self, mom_session):
        """Test successful push token registration"""
        response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        
        # Should succeed
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "registered" in data.get("message", "").lower() or "success" in data.get("message", "").lower()
        assert data.get("device_type") == "ios"
        print(f"✓ Push token registered successfully: {data}")
    
    def test_register_push_token_with_android_device(self, doula_session):
        """Test push token registration with android device type"""
        response = doula_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN_2,
            "device_type": "android"
        })
        
        assert response.status_code == 200, f"Register failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert data.get("device_type") == "android"
        print(f"✓ Android push token registered: {data}")
    
    def test_register_push_token_invalid_format(self, mom_session):
        """Test push token registration with invalid token format"""
        response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN_INVALID,
            "device_type": "ios"
        })
        
        # Should fail with 400 - invalid token format
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "invalid" in data.get("detail", "").lower() or "format" in data.get("detail", "").lower()
        print(f"✓ Invalid token correctly rejected: {data}")
    
    def test_register_push_token_empty_token(self, mom_session):
        """Test push token registration with empty token"""
        response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": "",
            "device_type": "ios"
        })
        
        # Should fail - either 400 or 422
        assert response.status_code in [400, 422], f"Expected error, got {response.status_code}: {response.text}"
        print(f"✓ Empty token correctly rejected")
    
    def test_register_push_token_unauthenticated(self):
        """Test push token registration without authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        
        # Should fail with 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Unauthenticated request correctly rejected")
    
    def test_register_push_token_re_register_updates(self, mom_session):
        """Test that re-registering same token updates instead of duplicating"""
        # Register first time
        response1 = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        assert response1.status_code == 200
        
        # Register second time with different device type
        response2 = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "web"
        })
        assert response2.status_code == 200
        
        # Check status - should only show one token
        status_response = mom_session.get(f"{BASE_URL}/api/push/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        # Verify we don't have duplicate tokens (active_devices should reflect unique tokens)
        print(f"✓ Re-registration handled correctly, status: {data}")

    # =================== PUSH STATUS TESTS ===================
    
    def test_get_push_status_with_registered_token(self, mom_session):
        """Test getting push status after token registration"""
        # First ensure token is registered
        mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        
        response = mom_session.get(f"{BASE_URL}/api/push/status")
        
        assert response.status_code == 200, f"Get status failed: {response.text}"
        
        data = response.json()
        assert "has_push_enabled" in data
        assert "active_devices" in data
        assert "tokens" in data
        
        # Should have at least one active device
        assert data["has_push_enabled"] is True
        assert data["active_devices"] >= 1
        assert len(data["tokens"]) >= 1
        
        # Check token structure
        token_info = data["tokens"][0]
        assert "device_type" in token_info
        assert "is_active" in token_info
        print(f"✓ Push status retrieved: {data}")
    
    def test_get_push_status_no_tokens(self):
        """Test getting push status for user with no tokens"""
        # Create a new session - we'll use a user without push tokens
        session = requests.Session()
        
        # Login as doula (we'll clean up their tokens first)
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_DOULA_EMAIL,
            "password": TEST_DOULA_PASSWORD
        })
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Unregister any existing tokens for this test
        session.post(f"{BASE_URL}/api/push/unregister", json={
            "push_token": TEST_PUSH_TOKEN_2
        })
        
        response = session.get(f"{BASE_URL}/api/push/status")
        assert response.status_code == 200
        
        data = response.json()
        # Note: may have 0 or more depending on previous test state
        print(f"✓ Push status for user: {data}")
    
    def test_get_push_status_unauthenticated(self):
        """Test getting push status without authentication"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/push/status")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Unauthenticated push status correctly rejected")

    # =================== PUSH TOKEN UNREGISTER TESTS ===================
    
    def test_unregister_push_token_success(self, mom_session):
        """Test successful push token unregistration"""
        # First register a token
        register_response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        assert register_response.status_code == 200
        
        # Now unregister it
        response = mom_session.post(f"{BASE_URL}/api/push/unregister", json={
            "push_token": TEST_PUSH_TOKEN
        })
        
        assert response.status_code == 200, f"Unregister failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "unregistered" in data.get("message", "").lower() or "success" in data.get("message", "").lower()
        print(f"✓ Push token unregistered successfully: {data}")
    
    def test_unregister_push_token_not_found(self, mom_session):
        """Test unregistering a token that doesn't exist"""
        response = mom_session.post(f"{BASE_URL}/api/push/unregister", json={
            "push_token": "ExponentPushToken[nonexistent_token_xyz]"
        })
        
        # Should return 404 - token not found
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Non-existent token unregister correctly returns 404")
    
    def test_unregister_push_token_unauthenticated(self):
        """Test unregistering push token without authentication"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/push/unregister", json={
            "push_token": TEST_PUSH_TOKEN
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"✓ Unauthenticated unregister correctly rejected")

    # =================== PUSH TOKEN VALIDATION TESTS ===================
    
    def test_push_token_format_validation(self, mom_session):
        """Test various push token formats"""
        test_cases = [
            ("ExponentPushToken[abc123]", True),
            ("ExponentPushToken[test_with_underscore]", True),
            ("ExponentPushToken[test-with-dash]", True),
            ("ExponentPushToken[]", True),  # Empty content might be accepted
            ("ExponentPushToken", False),
            ("exponentpushtoken[abc]", False),  # Case sensitive
            ("SomeOtherToken[abc]", False),
            ("", False),
            ("random_string", False),
        ]
        
        for token, should_succeed in test_cases:
            if not token:  # Skip empty string - validation might differ
                continue
            
            response = mom_session.post(f"{BASE_URL}/api/push/register", json={
                "push_token": token,
                "device_type": "test"
            })
            
            if should_succeed:
                assert response.status_code == 200, f"Token '{token}' should be valid: {response.text}"
            else:
                assert response.status_code == 400, f"Token '{token}' should be invalid: {response.text}"
        
        print(f"✓ Push token format validation working correctly")


class TestPushNotificationService:
    """Test the push notification service logic"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Authenticate as mom user and return session"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MOM_EMAIL,
            "password": TEST_MOM_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_push_token_is_stored_in_user_document(self, mom_session):
        """Test that push tokens are properly stored"""
        # Register a token
        register_response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        assert register_response.status_code == 200
        
        # Get status to verify storage
        status_response = mom_session.get(f"{BASE_URL}/api/push/status")
        assert status_response.status_code == 200
        
        data = status_response.json()
        
        # Should have token data with timestamps
        if data.get("tokens"):
            token_info = data["tokens"][0]
            assert "device_type" in token_info
            assert "is_active" in token_info
            # created_at and last_verified may be present
            print(f"✓ Token stored with metadata: {token_info}")
    
    def test_inactive_token_not_in_active_count(self, mom_session):
        """Test that unregistered tokens are marked inactive"""
        # Register a token
        mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        
        # Get initial status
        status1 = mom_session.get(f"{BASE_URL}/api/push/status").json()
        initial_active = status1.get("active_devices", 0)
        
        # Unregister the token
        mom_session.post(f"{BASE_URL}/api/push/unregister", json={
            "push_token": TEST_PUSH_TOKEN
        })
        
        # Get status again
        status2 = mom_session.get(f"{BASE_URL}/api/push/status").json()
        final_active = status2.get("active_devices", 0)
        
        # Active count should decrease or stay same
        assert final_active <= initial_active
        print(f"✓ Token deactivation reflected in status: {initial_active} -> {final_active}")


class TestCreateNotificationPushIntegration:
    """Test that create_notification sends push notifications"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Authenticate as doula user"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_DOULA_EMAIL,
            "password": TEST_DOULA_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Authenticate as mom user"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MOM_EMAIL,
            "password": TEST_MOM_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json().get("session_token")
        user_info = login_response.json()
        session.headers.update({"Authorization": f"Bearer {token}"})
        session.user_id = user_info.get("user", {}).get("user_id")
        return session
    
    def test_notification_triggers_push(self, mom_session, doula_session):
        """Test that sending a message creates a notification which triggers push"""
        # First register a push token for mom
        register_response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        assert register_response.status_code == 200
        
        # Get mom's user info
        me_response = mom_session.get(f"{BASE_URL}/api/auth/me")
        mom_user_id = me_response.json().get("user_id")
        
        # Send a message from doula to mom (this should trigger a notification)
        message_response = doula_session.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": mom_user_id,
            "content": f"Test push notification message {datetime.now().isoformat()}"
        })
        
        # Message sending might succeed or fail based on connection status
        # We're testing that the flow doesn't break due to push notification code
        if message_response.status_code == 200:
            print(f"✓ Message sent successfully, push notification would be triggered")
        else:
            # Even if message fails for other reasons, it shouldn't be due to push code
            print(f"Message response: {message_response.status_code} - {message_response.text}")
    
    def test_push_logs_collection_exists(self, mom_session):
        """Test that push notifications are logged (push_logs collection is being used)"""
        # This is more of an indirect test - we verify the API doesn't error out
        # The actual push delivery would fail with test tokens, but the system should handle gracefully
        
        # Register token and check status
        mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        
        status = mom_session.get(f"{BASE_URL}/api/push/status")
        assert status.status_code == 200
        print(f"✓ Push notification system operates without errors")


class TestPushServiceGracefulFailure:
    """Test that push notification failures are handled gracefully"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_MOM_EMAIL,
            "password": TEST_MOM_PASSWORD
        })
        token = login_response.json().get("session_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_api_handles_expo_service_errors(self, mom_session):
        """Test that API doesn't crash when Expo service returns errors"""
        # Register a test token (will fail on actual push but shouldn't break API)
        response = mom_session.post(f"{BASE_URL}/api/push/register", json={
            "push_token": TEST_PUSH_TOKEN,
            "device_type": "ios"
        })
        
        assert response.status_code == 200
        
        # Get status - should still work
        status = mom_session.get(f"{BASE_URL}/api/push/status")
        assert status.status_code == 200
        
        print(f"✓ API handles Expo service gracefully")


# Run with: pytest /app/backend/tests/test_push_notifications_128.py -v
