"""
Auth Routes Phase 4 Testing

Tests for migrated auth routes from server.py to routes/auth.py:
- POST /api/auth/login - Login with email/password
- POST /api/auth/register - Register new user
- POST /api/auth/google-session - Google OAuth (endpoint reachability only)
- GET /api/auth/me - Get current authenticated user
- POST /api/auth/logout - Logout and clear session
- PUT /api/auth/set-role - Update user role
- PUT /api/auth/update-profile - Update user profile

Uses demo accounts: demo.doula@truejoybirthing.com and demo.mom@truejoybirthing.com
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')
if not BASE_URL:
    raise ValueError("No backend URL configured. Set EXPO_PUBLIC_BACKEND_URL or REACT_APP_BACKEND_URL")

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


class TestAuthLogin:
    """Test /api/auth/login endpoint"""
    
    def test_login_with_valid_doula_credentials(self):
        """Login with valid doula credentials returns user data and session_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert "session_token" in data, "Response should contain session_token"
        assert data["email"] == DOULA_EMAIL
        assert data["role"] == "DOULA"
        print(f"PASS: Doula login successful, user_id: {data['user_id']}")
    
    def test_login_with_valid_mom_credentials(self):
        """Login with valid mom credentials returns user data and session_token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "email" in data
        assert "session_token" in data
        assert data["email"] == MOM_EMAIL
        assert data["role"] == "MOM"
        print(f"PASS: Mom login successful, user_id: {data['user_id']}")
    
    def test_login_with_invalid_password(self):
        """Login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": "wrongpassword123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid password correctly rejected with 401")
    
    def test_login_with_nonexistent_email(self):
        """Login with nonexistent email returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "anypassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Nonexistent email correctly rejected with 401")
    
    def test_login_with_missing_password(self):
        """Login without password returns 422 validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: Missing password correctly returns 422")
    
    def test_login_with_invalid_email_format(self):
        """Login with invalid email format returns 422"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "notanemail", "password": "password123"}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: Invalid email format correctly returns 422")


class TestAuthMe:
    """Test GET /api/auth/me endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        if response.status_code == 200:
            self.session_token = response.json().get("session_token")
            self.user_id = response.json().get("user_id")
        else:
            pytest.skip("Could not login to get session token")
    
    def test_get_me_with_valid_session(self):
        """GET /api/auth/me with valid session returns user with profile data"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert "onboarding_completed" in data
        assert "profile" in data  # Profile data based on role
        
        assert data["email"] == DOULA_EMAIL
        assert data["user_id"] == self.user_id
        print(f"PASS: GET /me returns user data with profile for role {data['role']}")
    
    def test_get_me_without_auth(self):
        """GET /api/auth/me without authentication returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /me without auth correctly returns 401")
    
    def test_get_me_with_invalid_token(self):
        """GET /api/auth/me with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /me with invalid token correctly returns 401")
    
    def test_get_me_mom_returns_mom_profile(self):
        """GET /api/auth/me for mom user returns mom profile data"""
        # Login as mom
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MOM_EMAIL, "password": MOM_PASSWORD}
        )
        if login_resp.status_code != 200:
            pytest.skip("Could not login as mom")
        
        mom_token = login_resp.json().get("session_token")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["role"] == "MOM"
        assert "profile" in data
        print(f"PASS: GET /me for mom returns profile data")


class TestAuthLogout:
    """Test POST /api/auth/logout endpoint"""
    
    def test_logout_clears_session(self):
        """POST /api/auth/logout clears session"""
        # First login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert login_resp.status_code == 200
        session_token = login_resp.json().get("session_token")
        
        # Verify session is valid
        me_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        assert me_resp.status_code == 200, "Session should be valid before logout"
        
        # Logout
        logout_resp = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {session_token}"},
            cookies={"session_token": session_token}
        )
        assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
        assert "message" in logout_resp.json()
        print("PASS: Logout returns success message")
        
        # Verify session is invalidated
        me_resp_after = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {session_token}"}
        )
        assert me_resp_after.status_code == 401, "Session should be invalidated after logout"
        print("PASS: Session correctly invalidated after logout")
    
    def test_logout_without_session(self):
        """POST /api/auth/logout without session still returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        # Should still return 200 even without a session (graceful handling)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Logout without session returns 200 (graceful)")


class TestAuthSetRole:
    """Test PUT /api/auth/set-role endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        if response.status_code == 200:
            self.session_token = response.json().get("session_token")
            self.original_role = response.json().get("role")
        else:
            pytest.skip("Could not login to get session token")
    
    def test_set_role_updates_role(self):
        """PUT /api/auth/set-role updates user role"""
        # Get current role first
        me_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        original_role = me_resp.json().get("role")
        
        # Set role to MIDWIFE
        new_role = "MIDWIFE" if original_role != "MIDWIFE" else "DOULA"
        response = requests.put(
            f"{BASE_URL}/api/auth/set-role",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={"role": new_role}
        )
        assert response.status_code == 200, f"Set role failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert data["role"] == new_role
        print(f"PASS: Role updated to {new_role}")
        
        # Verify via GET /me
        me_resp_after = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        assert me_resp_after.json()["role"] == new_role
        print("PASS: GET /me confirms role update")
        
        # Restore original role
        requests.put(
            f"{BASE_URL}/api/auth/set-role",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={"role": original_role}
        )
    
    def test_set_role_invalid_role_returns_400(self):
        """PUT /api/auth/set-role with invalid role returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/auth/set-role",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={"role": "INVALID_ROLE"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Invalid role correctly returns 400")
    
    def test_set_role_without_auth_returns_401(self):
        """PUT /api/auth/set-role without auth returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/auth/set-role",
            json={"role": "DOULA"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Set role without auth correctly returns 401")


class TestAuthUpdateProfile:
    """Test PUT /api/auth/update-profile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        if response.status_code == 200:
            self.session_token = response.json().get("session_token")
        else:
            pytest.skip("Could not login to get session token")
    
    def test_update_profile_full_name(self):
        """PUT /api/auth/update-profile updates full_name"""
        # Get original name
        me_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        original_name = me_resp.json().get("full_name")
        
        # Update name
        new_name = f"Test Name {uuid.uuid4().hex[:6]}"
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={"full_name": new_name}
        )
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert data.get("full_name") == new_name
        print(f"PASS: Profile name updated to {new_name}")
        
        # Restore original name
        requests.put(
            f"{BASE_URL}/api/auth/update-profile",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={"full_name": original_name}
        )
    
    def test_update_profile_picture(self):
        """PUT /api/auth/update-profile updates picture URL"""
        test_picture_url = "https://example.com/test-picture.jpg"
        
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={"picture": test_picture_url}
        )
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        data = response.json()
        
        assert data.get("picture") == test_picture_url
        print("PASS: Profile picture updated")
    
    def test_update_profile_no_fields_returns_400(self):
        """PUT /api/auth/update-profile with no valid fields returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile",
            headers={"Authorization": f"Bearer {self.session_token}"},
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Empty update correctly returns 400")
    
    def test_update_profile_without_auth_returns_401(self):
        """PUT /api/auth/update-profile without auth returns 401"""
        response = requests.put(
            f"{BASE_URL}/api/auth/update-profile",
            json={"full_name": "Test Name"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Update profile without auth correctly returns 401")


class TestAuthGoogleSession:
    """Test POST /api/auth/google-session endpoint (reachability only)"""
    
    def test_google_session_endpoint_reachable(self):
        """POST /api/auth/google-session endpoint is reachable"""
        # Test without session_id should return 400
        response = requests.post(
            f"{BASE_URL}/api/auth/google-session",
            json={}
        )
        assert response.status_code == 400, f"Expected 400 for missing session_id, got {response.status_code}"
        assert "session_id" in response.json().get("detail", "").lower()
        print("PASS: Google session endpoint reachable, returns 400 for missing session_id")
    
    def test_google_session_invalid_session_id(self):
        """POST /api/auth/google-session with invalid session_id returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google-session",
            json={"session_id": "invalid_session_id_123"}
        )
        # Should return 401 because the session_id is invalid
        assert response.status_code == 401, f"Expected 401 for invalid session_id, got {response.status_code}"
        print("PASS: Invalid session_id correctly returns 401")


class TestAuthRegister:
    """Test POST /api/auth/register endpoint"""
    
    def test_register_duplicate_email_returns_400(self):
        """POST /api/auth/register with existing email returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": DOULA_EMAIL,
                "password": "TestPassword123!",
                "full_name": "Test User"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already registered" in response.json().get("detail", "").lower()
        print("PASS: Duplicate email registration correctly returns 400")
    
    def test_register_without_password_returns_400(self):
        """POST /api/auth/register without password returns 400"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "full_name": "Test User"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "password" in response.json().get("detail", "").lower()
        print("PASS: Registration without password correctly returns 400")
    
    def test_register_missing_full_name_returns_422(self):
        """POST /api/auth/register without full_name returns 422"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": unique_email,
                "password": "TestPassword123!"
            }
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: Registration without full_name correctly returns 422")


class TestCoreProviderNavigation:
    """Test that core provider navigation still works after auth migration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as doula and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        if response.status_code == 200:
            self.session_token = response.json().get("session_token")
            self.user_id = response.json().get("user_id")
        else:
            pytest.skip("Could not login to get session token")
    
    def test_provider_clients_endpoint_works(self):
        """GET /api/provider/clients works with authenticated session"""
        response = requests.get(
            f"{BASE_URL}/api/provider/clients",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        assert response.status_code == 200, f"Provider clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Provider clients returns {len(data)} clients")
    
    def test_notifications_endpoint_works(self):
        """GET /api/notifications works with authenticated session"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        assert response.status_code == 200, f"Notifications failed: {response.text}"
        data = response.json()
        assert "notifications" in data
        print(f"PASS: Notifications endpoint returns {len(data.get('notifications', []))} notifications")
    
    def test_messages_conversations_endpoint_works(self):
        """GET /api/messages/conversations works with authenticated session"""
        response = requests.get(
            f"{BASE_URL}/api/messages/conversations",
            headers={"Authorization": f"Bearer {self.session_token}"}
        )
        assert response.status_code == 200, f"Messages conversations failed: {response.text}"
        data = response.json()
        # API returns {"conversations": [...]} object
        assert "conversations" in data or isinstance(data, list)
        conversations = data.get("conversations", data) if isinstance(data, dict) else data
        print(f"PASS: Messages conversations returns {len(conversations)} conversations")
    
    def test_health_check(self):
        """GET /api/health returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print("PASS: Health check passes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
