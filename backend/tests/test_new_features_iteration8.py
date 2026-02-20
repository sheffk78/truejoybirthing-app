"""
Test file for iteration 8: Midwife Notes, Provider Marketplace, and Admin Panel
Tests newly added features as per review request.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://modular-migration.preview.emergentagent.com')

# Test credentials from previous iterations
MOM_EMAIL = "sharemom2_1771213474@test.com"
MOM_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife_1771216891@test.com"
MIDWIFE_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def midwife_auth(api_client):
    """Get midwife authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    assert response.status_code == 200, f"Midwife login failed: {response.text}"
    data = response.json()
    print(f"Midwife logged in: {data.get('full_name')} (role: {data.get('role')})")
    return data.get("session_token")


@pytest.fixture(scope="module")
def mom_auth(api_client):
    """Get mom authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    assert response.status_code == 200, f"Mom login failed: {response.text}"
    data = response.json()
    print(f"Mom logged in: {data.get('full_name')} (role: {data.get('role')})")
    return data.get("session_token")


@pytest.fixture(scope="module")
def admin_auth(api_client):
    """Create and get admin authentication token"""
    admin_email = f"testadmin_{int(datetime.now().timestamp())}@test.com"
    admin_password = "adminpass123"
    
    reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": admin_email,
        "password": admin_password,
        "full_name": "Test Admin Iter8",
        "role": "ADMIN"
    })
    
    if reg_response.status_code == 200:
        print(f"Created new admin: {admin_email}")
        return reg_response.json().get("session_token")
    
    pytest.skip("Could not register admin user")


class TestMidwifeNotes:
    """Test Midwife Notes feature"""
    
    def test_get_midwife_notes_returns_array(self, api_client, midwife_auth):
        """GET /api/midwife/notes returns array"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/notes",
            headers={"Authorization": f"Bearer {midwife_auth}"}
        )
        print(f"GET midwife/notes response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        print(f"Midwife has {len(data)} notes")
    
    def test_create_midwife_note(self, api_client, midwife_auth):
        """POST /api/midwife/notes creates note"""
        # First get a client to add note for
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_auth}"}
        )
        assert clients_response.status_code == 200, f"Get clients failed: {clients_response.text}"
        clients = clients_response.json()
        
        if len(clients) == 0:
            # Create a test client first
            client_response = api_client.post(
                f"{BASE_URL}/api/midwife/clients",
                headers={"Authorization": f"Bearer {midwife_auth}"},
                json={
                    "name": "TEST_NoteClient_Iter8",
                    "email": "testnote_iter8@test.com",
                    "edd": "2025-08-15",
                    "planned_birth_setting": "Home"
                }
            )
            assert client_response.status_code == 200
            client_id = client_response.json()["client_id"]
            print(f"Created test client: {client_id}")
        else:
            client_id = clients[0]["client_id"]
            print(f"Using existing client: {client_id}")
        
        # Create note
        note_data = {
            "client_id": client_id,
            "note_type": "Prenatal",
            "content": f"TEST_iter8: Prenatal assessment completed. All vitals normal. Test note created at {datetime.now().isoformat()}",
            "date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/midwife/notes",
            headers={"Authorization": f"Bearer {midwife_auth}"},
            json=note_data
        )
        print(f"POST midwife/notes response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "note_id" in data, "Note should have note_id"
        assert data["note_type"] == "Prenatal"
        assert "TEST_iter8" in data["content"]
        print(f"Created note: {data['note_id']}")


class TestMarketplace:
    """Test Provider Marketplace feature"""
    
    def test_get_marketplace_providers_returns_array(self, api_client):
        """GET /api/marketplace/providers returns providers"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/providers")
        print(f"GET marketplace/providers response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "doulas" in data, "Response should have doulas array"
        assert "midwives" in data, "Response should have midwives array"
        assert isinstance(data["doulas"], list)
        assert isinstance(data["midwives"], list)
        
        print(f"Marketplace has {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
        
        # Validate provider structure if any exist
        for provider in data["doulas"]:
            assert "user" in provider
            assert "profile" in provider
            assert provider["user"]["role"] == "DOULA"
        
        for provider in data["midwives"]:
            assert "user" in provider
            assert "profile" in provider
            assert provider["user"]["role"] == "MIDWIFE"
    
    def test_marketplace_filter_by_doula(self, api_client):
        """GET /api/marketplace/providers?provider_type=DOULA filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/providers?provider_type=DOULA")
        print(f"GET marketplace/providers?provider_type=DOULA response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data["midwives"], list)
        assert len(data["midwives"]) == 0, "Midwives should be empty when filtering by DOULA"
        print(f"DOULA filter: {len(data['doulas'])} doulas, {len(data['midwives'])} midwives")
    
    def test_marketplace_filter_by_midwife(self, api_client):
        """GET /api/marketplace/providers?provider_type=MIDWIFE filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/providers?provider_type=MIDWIFE")
        print(f"GET marketplace/providers?provider_type=MIDWIFE response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data["doulas"], list)
        assert len(data["doulas"]) == 0, "Doulas should be empty when filtering by MIDWIFE"
        print(f"MIDWIFE filter: {len(data['doulas'])} doulas, {len(data['midwives'])} midwives")


class TestAdminPanel:
    """Test Admin Panel features"""
    
    def test_admin_endpoints_require_admin_role(self, api_client, mom_auth):
        """Admin endpoints require ADMIN role - test with non-admin"""
        # Try to access admin users endpoint as MOM (should fail)
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {mom_auth}"}
        )
        print(f"Admin users as MOM: {response.status_code}")
        assert response.status_code == 403, "Non-admin should be forbidden"
    
    def test_admin_users_endpoint(self, api_client, admin_auth):
        """GET /api/admin/users returns user list"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_auth}"}
        )
        print(f"GET admin/users response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        print(f"Admin sees {len(data)} users")
        
        # Verify user structure
        if len(data) > 0:
            user = data[0]
            assert "user_id" in user
            assert "email" in user
            assert "role" in user
            assert "password_hash" not in user, "Password hash should be excluded"
    
    def test_admin_content_endpoint(self, api_client, admin_auth):
        """GET /api/admin/content returns content items"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/content",
            headers={"Authorization": f"Bearer {admin_auth}"}
        )
        print(f"GET admin/content response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text[:500]}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        print(f"Admin content has {len(data)} sections")
        
        # Verify content structure
        if len(data) > 0:
            item = data[0]
            assert "section_id" in item
        
        # Should have all birth plan sections (9 sections)
        assert len(data) >= 9, f"Should have at least 9 birth plan sections, got {len(data)}"
    
    def test_admin_users_with_role_filter(self, api_client, admin_auth):
        """GET /api/admin/users?role=MOM filters users by role"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/users?role=MOM",
            headers={"Authorization": f"Bearer {admin_auth}"}
        )
        print(f"GET admin/users?role=MOM response: {response.status_code}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # All users should have MOM role
        for user in data:
            assert user["role"] == "MOM", f"User {user['email']} has role {user['role']}, expected MOM"
        
        print(f"Found {len(data)} users with MOM role")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
