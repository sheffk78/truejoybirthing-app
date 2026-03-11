"""
Phase 8 Backend Refactoring Tests: Doula and Midwife Client/Notes Routes

Tests the migrated client and notes routes from server.py to modular routers:
- Doula clients: GET/POST /api/doula/clients, GET/PUT /api/doula/clients/{client_id}
- Doula notes: GET/POST /api/doula/notes, PUT/DELETE /api/doula/notes/{note_id}
- Midwife clients: GET/POST /api/midwife/clients, GET/PUT /api/midwife/clients/{client_id}
- Midwife notes: GET/POST /api/midwife/notes, PUT/DELETE /api/midwife/notes/{note_id}
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://theme-unify-preview.preview.emergentagent.com').rstrip('/')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Basic setup tests"""
    
    def test_base_url_configured(self):
        """Verify BASE_URL is set"""
        assert BASE_URL, "BASE_URL must be configured"
        print(f"BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        """Verify backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"Health check: {data}")


class TestAuthLogin:
    """Login tests for test accounts"""
    
    def test_doula_login_success(self):
        """Test doula login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Response keys: {data.keys()}"
        assert data["role"] == "DOULA"
        print(f"Doula login successful: {data['email']}")
    
    def test_midwife_login_success(self):
        """Test midwife login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Response keys: {data.keys()}"
        assert data["role"] == "MIDWIFE"
        print(f"Midwife login successful: {data['email']}")


# ============== DOULA CLIENT TESTS ==============

class TestDoulaClients:
    """Tests for Doula client routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get doula auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_doula_clients_list(self):
        """GET /api/doula/clients - List all clients"""
        response = requests.get(f"{BASE_URL}/api/doula/clients", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/doula/clients: {len(data)} clients found")
        # Verify no ObjectId in response
        for client in data:
            assert "_id" not in client, "ObjectId should not be in response"
    
    def test_get_doula_clients_requires_auth(self):
        """GET /api/doula/clients - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("GET /api/doula/clients requires auth: PASS")
    
    def test_create_doula_client(self):
        """POST /api/doula/clients - Create new client"""
        unique_id = uuid.uuid4().hex[:8]
        client_data = {
            "name": f"TEST_Doula_Client_{unique_id}",
            "email": f"test_doula_client_{unique_id}@example.com",
            "phone": "555-0101",
            "edd": "2026-06-15",
            "planned_birth_setting": "Hospital"
        }
        response = requests.post(f"{BASE_URL}/api/doula/clients", 
                                 headers=self.headers, json=client_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "client_id" in data, "Response should contain client_id"
        assert data["name"] == client_data["name"]
        assert data["email"] == client_data["email"]
        assert data["provider_type"] == "DOULA"
        assert "_id" not in data, "ObjectId should not be in response"
        print(f"POST /api/doula/clients: Created {data['client_id']}")
        # Store for cleanup
        self.created_client_id = data["client_id"]
        return data["client_id"]
    
    def test_get_doula_client_by_id(self):
        """GET /api/doula/clients/{client_id} - Get specific client"""
        # First create a client
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(f"{BASE_URL}/api/doula/clients", 
                                        headers=self.headers, json={
            "name": f"TEST_GetClient_{unique_id}",
            "email": f"test_get_{unique_id}@example.com"
        })
        assert create_response.status_code == 200
        client_id = create_response.json()["client_id"]
        
        # Get the client
        response = requests.get(f"{BASE_URL}/api/doula/clients/{client_id}", 
                               headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["client_id"] == client_id
        assert "contracts" in data, "Should include related contracts"
        assert "invoices" in data, "Should include related invoices"
        assert "appointments" in data, "Should include related appointments"
        assert "notes" in data, "Should include related notes"
        assert "_id" not in data, "ObjectId should not be in response"
        print(f"GET /api/doula/clients/{client_id}: Found with related data")
    
    def test_get_doula_client_not_found(self):
        """GET /api/doula/clients/{client_id} - Non-existent client"""
        response = requests.get(f"{BASE_URL}/api/doula/clients/nonexistent_id", 
                               headers=self.headers)
        assert response.status_code == 404
        print("GET /api/doula/clients/nonexistent_id: 404 PASS")
    
    def test_update_doula_client(self):
        """PUT /api/doula/clients/{client_id} - Update client"""
        # First create a client
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(f"{BASE_URL}/api/doula/clients", 
                                        headers=self.headers, json={
            "name": f"TEST_UpdateClient_{unique_id}"
        })
        assert create_response.status_code == 200
        client_id = create_response.json()["client_id"]
        
        # Update the client
        update_data = {
            "phone": "555-9999",
            "status": "Active",
            "internal_notes": "Updated via test"
        }
        response = requests.put(f"{BASE_URL}/api/doula/clients/{client_id}", 
                               headers=self.headers, json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PUT /api/doula/clients/{client_id}: Updated successfully")
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/doula/clients/{client_id}", 
                                   headers=self.headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["phone"] == "555-9999"
        assert get_data["status"] == "Active"
        print(f"Verified update persistence: phone={get_data['phone']}, status={get_data['status']}")
    
    def test_update_doula_client_not_found(self):
        """PUT /api/doula/clients/{client_id} - Non-existent client"""
        response = requests.put(f"{BASE_URL}/api/doula/clients/nonexistent_id", 
                               headers=self.headers, json={"name": "test"})
        assert response.status_code == 404
        print("PUT /api/doula/clients/nonexistent_id: 404 PASS")


# ============== DOULA NOTES TESTS ==============

class TestDoulaNotes:
    """Tests for Doula notes routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get doula auth token and create a test client"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a test client for notes
        unique_id = uuid.uuid4().hex[:8]
        client_response = requests.post(f"{BASE_URL}/api/doula/clients", 
                                        headers=self.headers, json={
            "name": f"TEST_NoteClient_{unique_id}"
        })
        if client_response.status_code == 200:
            self.test_client_id = client_response.json()["client_id"]
        else:
            # Try to use existing clients
            clients_response = requests.get(f"{BASE_URL}/api/doula/clients", 
                                           headers=self.headers)
            if clients_response.status_code == 200 and len(clients_response.json()) > 0:
                self.test_client_id = clients_response.json()[0]["client_id"]
            else:
                pytest.skip("No test client available")
    
    def test_get_doula_notes_list(self):
        """GET /api/doula/notes - List all notes"""
        response = requests.get(f"{BASE_URL}/api/doula/notes", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/doula/notes: {len(data)} notes found")
        for note in data:
            assert "_id" not in note, "ObjectId should not be in response"
    
    def test_get_doula_notes_by_client(self):
        """GET /api/doula/notes?client_id=xxx - Filter notes by client"""
        response = requests.get(f"{BASE_URL}/api/doula/notes", 
                               headers=self.headers,
                               params={"client_id": self.test_client_id})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/doula/notes?client_id={self.test_client_id}: {len(data)} notes")
    
    def test_get_doula_notes_requires_auth(self):
        """GET /api/doula/notes - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/doula/notes")
        assert response.status_code == 401
        print("GET /api/doula/notes requires auth: PASS")
    
    def test_create_doula_note(self):
        """POST /api/doula/notes - Create new note"""
        note_data = {
            "client_id": self.test_client_id,
            "content": f"Test note created at {datetime.now().isoformat()}",
            "note_type": "prenatal"
        }
        response = requests.post(f"{BASE_URL}/api/doula/notes", 
                                headers=self.headers, json=note_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "note_id" in data, "Response should contain note_id"
        assert data["client_id"] == self.test_client_id
        assert data["content"] == note_data["content"]
        assert data["note_type"] == "prenatal"
        assert "_id" not in data, "ObjectId should not be in response"
        print(f"POST /api/doula/notes: Created {data['note_id']}")
        return data["note_id"]
    
    def test_create_doula_note_invalid_client(self):
        """POST /api/doula/notes - Invalid client returns 404"""
        note_data = {
            "client_id": "nonexistent_client",
            "content": "This should fail"
        }
        response = requests.post(f"{BASE_URL}/api/doula/notes", 
                                headers=self.headers, json=note_data)
        assert response.status_code == 404
        print("POST /api/doula/notes with invalid client: 404 PASS")
    
    def test_update_doula_note(self):
        """PUT /api/doula/notes/{note_id} - Update note"""
        # First create a note
        create_response = requests.post(f"{BASE_URL}/api/doula/notes", 
                                        headers=self.headers, json={
            "client_id": self.test_client_id,
            "content": "Original content"
        })
        assert create_response.status_code == 200
        note_id = create_response.json()["note_id"]
        
        # Update the note
        update_data = {
            "content": "Updated content",
            "note_type": "general"
        }
        response = requests.put(f"{BASE_URL}/api/doula/notes/{note_id}", 
                               headers=self.headers, json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PUT /api/doula/notes/{note_id}: Updated successfully")
    
    def test_update_doula_note_not_found(self):
        """PUT /api/doula/notes/{note_id} - Non-existent note"""
        response = requests.put(f"{BASE_URL}/api/doula/notes/nonexistent_note", 
                               headers=self.headers, json={"content": "test"})
        assert response.status_code == 404
        print("PUT /api/doula/notes/nonexistent: 404 PASS")
    
    def test_delete_doula_note(self):
        """DELETE /api/doula/notes/{note_id} - Delete note"""
        # First create a note
        create_response = requests.post(f"{BASE_URL}/api/doula/notes", 
                                        headers=self.headers, json={
            "client_id": self.test_client_id,
            "content": "To be deleted"
        })
        assert create_response.status_code == 200
        note_id = create_response.json()["note_id"]
        
        # Delete the note
        response = requests.delete(f"{BASE_URL}/api/doula/notes/{note_id}", 
                                  headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"DELETE /api/doula/notes/{note_id}: Deleted successfully")
        
        # Verify deletion - GET notes should not include this note
        notes_response = requests.get(f"{BASE_URL}/api/doula/notes", headers=self.headers)
        notes = notes_response.json()
        note_ids = [n["note_id"] for n in notes]
        assert note_id not in note_ids, "Deleted note should not be in list"
        print(f"Verified deletion: note {note_id} not in list")
    
    def test_delete_doula_note_not_found(self):
        """DELETE /api/doula/notes/{note_id} - Non-existent note"""
        response = requests.delete(f"{BASE_URL}/api/doula/notes/nonexistent_note", 
                                  headers=self.headers)
        assert response.status_code == 404
        print("DELETE /api/doula/notes/nonexistent: 404 PASS")


# ============== MIDWIFE CLIENT TESTS ==============

class TestMidwifeClients:
    """Tests for Midwife client routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get midwife auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_midwife_clients_list(self):
        """GET /api/midwife/clients - List all clients"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/midwife/clients: {len(data)} clients found")
        for client in data:
            assert "_id" not in client, "ObjectId should not be in response"
    
    def test_get_midwife_clients_requires_auth(self):
        """GET /api/midwife/clients - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 401
        print("GET /api/midwife/clients requires auth: PASS")
    
    def test_create_midwife_client(self):
        """POST /api/midwife/clients - Create new client"""
        unique_id = uuid.uuid4().hex[:8]
        client_data = {
            "name": f"TEST_Midwife_Client_{unique_id}",
            "email": f"test_midwife_client_{unique_id}@example.com",
            "phone": "555-0202",
            "edd": "2026-07-20",
            "planned_birth_setting": "Home",
            "lmp": "2025-10-15",
            "gravida": 2,
            "para": 1
        }
        response = requests.post(f"{BASE_URL}/api/midwife/clients", 
                                headers=self.headers, json=client_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "client_id" in data
        assert data["name"] == client_data["name"]
        assert data["email"] == client_data["email"]
        assert data["provider_type"] == "MIDWIFE"
        assert data["lmp"] == client_data["lmp"]
        assert data["gravida"] == 2
        assert data["para"] == 1
        assert "_id" not in data, "ObjectId should not be in response"
        print(f"POST /api/midwife/clients: Created {data['client_id']}")
        return data["client_id"]
    
    def test_get_midwife_client_by_id(self):
        """GET /api/midwife/clients/{client_id} - Get specific client"""
        # First create a client
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(f"{BASE_URL}/api/midwife/clients", 
                                        headers=self.headers, json={
            "name": f"TEST_GetMidwifeClient_{unique_id}"
        })
        assert create_response.status_code == 200
        client_id = create_response.json()["client_id"]
        
        # Get the client
        response = requests.get(f"{BASE_URL}/api/midwife/clients/{client_id}", 
                               headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["client_id"] == client_id
        assert "contracts" in data
        assert "invoices" in data
        assert "visits" in data, "Midwife client should include visits"
        assert "notes" in data
        assert "_id" not in data
        print(f"GET /api/midwife/clients/{client_id}: Found with related data")
    
    def test_get_midwife_client_not_found(self):
        """GET /api/midwife/clients/{client_id} - Non-existent client"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients/nonexistent_id", 
                               headers=self.headers)
        assert response.status_code == 404
        print("GET /api/midwife/clients/nonexistent_id: 404 PASS")
    
    def test_update_midwife_client(self):
        """PUT /api/midwife/clients/{client_id} - Update client"""
        # First create a client
        unique_id = uuid.uuid4().hex[:8]
        create_response = requests.post(f"{BASE_URL}/api/midwife/clients", 
                                        headers=self.headers, json={
            "name": f"TEST_UpdateMidwifeClient_{unique_id}"
        })
        assert create_response.status_code == 200
        client_id = create_response.json()["client_id"]
        
        # Update the client
        update_data = {
            "phone": "555-8888",
            "status": "Prenatal",
            "gravida": 3,
            "para": 2
        }
        response = requests.put(f"{BASE_URL}/api/midwife/clients/{client_id}", 
                               headers=self.headers, json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PUT /api/midwife/clients/{client_id}: Updated successfully")
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/midwife/clients/{client_id}", 
                                   headers=self.headers)
        get_data = get_response.json()
        assert get_data["phone"] == "555-8888"
        assert get_data["gravida"] == 3
        assert get_data["para"] == 2
        print(f"Verified update: gravida={get_data['gravida']}, para={get_data['para']}")
    
    def test_update_midwife_client_not_found(self):
        """PUT /api/midwife/clients/{client_id} - Non-existent client"""
        response = requests.put(f"{BASE_URL}/api/midwife/clients/nonexistent_id", 
                               headers=self.headers, json={"name": "test"})
        assert response.status_code == 404
        print("PUT /api/midwife/clients/nonexistent_id: 404 PASS")


# ============== MIDWIFE NOTES TESTS ==============

class TestMidwifeNotes:
    """Tests for Midwife notes routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get midwife auth token and create a test client"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a test client for notes
        unique_id = uuid.uuid4().hex[:8]
        client_response = requests.post(f"{BASE_URL}/api/midwife/clients", 
                                        headers=self.headers, json={
            "name": f"TEST_MidwifeNoteClient_{unique_id}"
        })
        if client_response.status_code == 200:
            self.test_client_id = client_response.json()["client_id"]
        else:
            clients_response = requests.get(f"{BASE_URL}/api/midwife/clients", 
                                           headers=self.headers)
            if clients_response.status_code == 200 and len(clients_response.json()) > 0:
                self.test_client_id = clients_response.json()[0]["client_id"]
            else:
                pytest.skip("No test client available")
    
    def test_get_midwife_notes_list(self):
        """GET /api/midwife/notes - List all notes"""
        response = requests.get(f"{BASE_URL}/api/midwife/notes", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/midwife/notes: {len(data)} notes found")
        for note in data:
            assert "_id" not in note, "ObjectId should not be in response"
    
    def test_get_midwife_notes_by_client(self):
        """GET /api/midwife/notes?client_id=xxx - Filter notes by client"""
        response = requests.get(f"{BASE_URL}/api/midwife/notes", 
                               headers=self.headers,
                               params={"client_id": self.test_client_id})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/midwife/notes?client_id={self.test_client_id}: {len(data)} notes")
    
    def test_get_midwife_notes_requires_auth(self):
        """GET /api/midwife/notes - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/midwife/notes")
        assert response.status_code == 401
        print("GET /api/midwife/notes requires auth: PASS")
    
    def test_create_midwife_note(self):
        """POST /api/midwife/notes - Create new note"""
        note_data = {
            "client_id": self.test_client_id,
            "content": f"Midwife test note at {datetime.now().isoformat()}",
            "note_type": "visit"
        }
        response = requests.post(f"{BASE_URL}/api/midwife/notes", 
                                headers=self.headers, json=note_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "note_id" in data
        assert data["client_id"] == self.test_client_id
        assert data["content"] == note_data["content"]
        assert data["note_type"] == "visit"
        assert "_id" not in data
        print(f"POST /api/midwife/notes: Created {data['note_id']}")
        return data["note_id"]
    
    def test_create_midwife_note_invalid_client(self):
        """POST /api/midwife/notes - Invalid client returns 404"""
        note_data = {
            "client_id": "nonexistent_client",
            "content": "This should fail"
        }
        response = requests.post(f"{BASE_URL}/api/midwife/notes", 
                                headers=self.headers, json=note_data)
        assert response.status_code == 404
        print("POST /api/midwife/notes with invalid client: 404 PASS")
    
    def test_update_midwife_note(self):
        """PUT /api/midwife/notes/{note_id} - Update note"""
        # First create a note
        create_response = requests.post(f"{BASE_URL}/api/midwife/notes", 
                                        headers=self.headers, json={
            "client_id": self.test_client_id,
            "content": "Original midwife note"
        })
        assert create_response.status_code == 200
        note_id = create_response.json()["note_id"]
        
        # Update the note
        update_data = {
            "content": "Updated midwife note content",
            "note_type": "general"
        }
        response = requests.put(f"{BASE_URL}/api/midwife/notes/{note_id}", 
                               headers=self.headers, json=update_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PUT /api/midwife/notes/{note_id}: Updated successfully")
    
    def test_update_midwife_note_not_found(self):
        """PUT /api/midwife/notes/{note_id} - Non-existent note"""
        response = requests.put(f"{BASE_URL}/api/midwife/notes/nonexistent_note", 
                               headers=self.headers, json={"content": "test"})
        assert response.status_code == 404
        print("PUT /api/midwife/notes/nonexistent: 404 PASS")
    
    def test_delete_midwife_note(self):
        """DELETE /api/midwife/notes/{note_id} - Delete note"""
        # First create a note
        create_response = requests.post(f"{BASE_URL}/api/midwife/notes", 
                                        headers=self.headers, json={
            "client_id": self.test_client_id,
            "content": "Midwife note to be deleted"
        })
        assert create_response.status_code == 200
        note_id = create_response.json()["note_id"]
        
        # Delete the note
        response = requests.delete(f"{BASE_URL}/api/midwife/notes/{note_id}", 
                                  headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"DELETE /api/midwife/notes/{note_id}: Deleted successfully")
        
        # Verify deletion
        notes_response = requests.get(f"{BASE_URL}/api/midwife/notes", headers=self.headers)
        notes = notes_response.json()
        note_ids = [n["note_id"] for n in notes]
        assert note_id not in note_ids
        print(f"Verified deletion: note {note_id} not in list")
    
    def test_delete_midwife_note_not_found(self):
        """DELETE /api/midwife/notes/{note_id} - Non-existent note"""
        response = requests.delete(f"{BASE_URL}/api/midwife/notes/nonexistent_note", 
                                  headers=self.headers)
        assert response.status_code == 404
        print("DELETE /api/midwife/notes/nonexistent: 404 PASS")


# ============== CROSS-ROLE ACCESS TESTS ==============

class TestRoleBasedAccess:
    """Tests for role-based access control"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get tokens for both roles"""
        # Doula token
        doula_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        self.doula_token = doula_response.json()["session_token"]
        self.doula_headers = {"Authorization": f"Bearer {self.doula_token}"}
        
        # Midwife token
        midwife_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        self.midwife_token = midwife_response.json()["session_token"]
        self.midwife_headers = {"Authorization": f"Bearer {self.midwife_token}"}
    
    def test_doula_cannot_access_midwife_clients(self):
        """Doula cannot access midwife client routes"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients", 
                               headers=self.doula_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Doula accessing /api/midwife/clients: 403 PASS")
    
    def test_doula_cannot_access_midwife_notes(self):
        """Doula cannot access midwife notes routes"""
        response = requests.get(f"{BASE_URL}/api/midwife/notes", 
                               headers=self.doula_headers)
        assert response.status_code == 403
        print("Doula accessing /api/midwife/notes: 403 PASS")
    
    def test_midwife_cannot_access_doula_clients(self):
        """Midwife cannot access doula client routes"""
        response = requests.get(f"{BASE_URL}/api/doula/clients", 
                               headers=self.midwife_headers)
        assert response.status_code == 403
        print("Midwife accessing /api/doula/clients: 403 PASS")
    
    def test_midwife_cannot_access_doula_notes(self):
        """Midwife cannot access doula notes routes"""
        response = requests.get(f"{BASE_URL}/api/doula/notes", 
                               headers=self.midwife_headers)
        assert response.status_code == 403
        print("Midwife accessing /api/doula/notes: 403 PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
