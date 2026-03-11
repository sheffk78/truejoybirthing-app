"""
Phase 13: Provider Unified Routes Migration Tests
Tests all provider/* routes migrated from server.py to routes/provider_unified.py

Routes tested:
- GET /api/provider/clients - Get all clients
- GET /api/provider/clients/{id} - Get client detail
- PUT /api/provider/clients/{id} - Update client
- GET /api/provider/clients/{id}/timeline - Get client timeline
- GET /api/provider/appointments - Get appointments
- POST /api/provider/appointments - Create appointment
- PUT /api/provider/appointments/{id} - Update appointment
- DELETE /api/provider/appointments/{id} - Delete appointment
- GET /api/provider/notes - Get notes
- POST /api/provider/notes - Create note
- PUT /api/provider/notes/{id} - Update note
- DELETE /api/provider/notes/{id} - Delete note
- GET /api/provider/clients/{id}/birth-record - Get birth record
- POST /api/provider/clients/{id}/birth-record - Create/update birth record
- GET /api/provider/dashboard - Get dashboard stats

Both DOULA and MIDWIFE roles should have access to all provider/* routes.
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

# Use EXPO_PUBLIC_BACKEND_URL for API access
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://timer-icons-nav.preview.emergentagent.com').rstrip('/')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Test environment setup"""
    
    def test_base_url_configured(self):
        """Verify BASE_URL is properly configured"""
        assert BASE_URL, "BASE_URL must be set"
        assert BASE_URL.startswith("http"), f"BASE_URL must be a valid URL: {BASE_URL}"
        print(f"✓ BASE_URL: {BASE_URL}")
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ API health check passed")


class TestAuthLogin:
    """Test authentication for test users"""
    
    def test_doula_login_success(self):
        """Test Doula login returns valid session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "DOULA"
        print(f"✓ Doula login successful: {data['user_id']}")
    
    def test_midwife_login_success(self):
        """Test Midwife login returns valid session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        print(f"✓ Midwife login successful: {data['user_id']}")


class TestProviderClientsDoula:
    """Test /api/provider/clients/* routes for DOULA role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.user_id = data["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_clients_list(self):
        """Test GET /api/provider/clients returns list"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula clients list: {len(data)} clients")
        # Verify no ObjectId in response
        for client in data[:3]:
            assert "_id" not in client, "Should not have MongoDB _id"
            assert "client_id" in client
            assert "is_active" in client
    
    def test_get_clients_with_include_inactive(self):
        """Test GET /api/provider/clients with include_inactive=true"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula clients (with inactive): {len(data)} clients")
    
    def test_get_clients_with_status_filter(self):
        """Test GET /api/provider/clients with status_filter"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?status_filter=Active", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned clients should have Active status
        for client in data:
            assert client.get("status") == "Active", f"Expected Active status, got: {client.get('status')}"
        print(f"✓ Doula active clients: {len(data)}")
    
    def test_get_client_detail(self):
        """Test GET /api/provider/clients/{id} returns client with counts"""
        # First get list to get a client_id
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "client_id" in data
        assert "is_active" in data
        assert "_counts" in data
        assert "appointments" in data["_counts"]
        assert "notes" in data["_counts"]
        assert "_id" not in data
        print(f"✓ Doula client detail retrieved: {client_id}")
    
    def test_get_client_detail_not_found(self):
        """Test GET /api/provider/clients/{id} with invalid id returns 404"""
        response = requests.get(f"{BASE_URL}/api/provider/clients/nonexistent_id", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ Non-existent client returns 404")
    
    def test_update_client(self):
        """Test PUT /api/provider/clients/{id} updates client"""
        # Get a client to update
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        # Find a TEST_ client or use first available
        test_client = next((c for c in clients if c.get("name", "").startswith("TEST_")), clients[0])
        client_id = test_client["client_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/provider/clients/{client_id}", 
            headers=self.headers,
            json={"status": "Active", "phone": "555-TEST"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Client updated"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}", headers=self.headers)
        updated_client = verify_response.json()
        assert updated_client.get("status") == "Active"
        print(f"✓ Doula client updated: {client_id}")


class TestProviderClientsMidwife:
    """Test /api/provider/clients/* routes for MIDWIFE role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.user_id = data["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_clients_list(self):
        """Test GET /api/provider/clients works for MIDWIFE"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Midwife clients list: {len(data)} clients")
    
    def test_get_client_detail_with_visits_count(self):
        """Test GET /api/provider/clients/{id} includes visits count for MIDWIFE"""
        # Get a client
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Midwife should have visits in _counts
        assert "_counts" in data
        assert "visits" in data["_counts"]
        print(f"✓ Midwife client detail includes visits count: {data['_counts'].get('visits')}")


class TestProviderClientTimeline:
    """Test /api/provider/clients/{id}/timeline routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_client_timeline(self):
        """Test GET /api/provider/clients/{id}/timeline returns timeline data"""
        # Get a client first
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "client" in data
        assert "timeline" in data
        assert isinstance(data["timeline"], list)
        assert "_id" not in data
        print(f"✓ Client timeline retrieved: {len(data['timeline'])} items")
    
    def test_get_client_timeline_not_found(self):
        """Test GET /api/provider/clients/{id}/timeline with invalid id returns 404"""
        response = requests.get(f"{BASE_URL}/api/provider/clients/nonexistent_id/timeline", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ Non-existent client timeline returns 404")


class TestProviderAppointmentsDoula:
    """Test /api/provider/appointments/* routes for DOULA"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.user_id = data["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_appointments(self):
        """Test GET /api/provider/appointments returns list"""
        response = requests.get(f"{BASE_URL}/api/provider/appointments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula appointments: {len(data)}")
    
    def test_get_appointments_with_filters(self):
        """Test GET /api/provider/appointments with various filters"""
        # Test upcoming_only
        response = requests.get(f"{BASE_URL}/api/provider/appointments?upcoming_only=true", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Upcoming appointments filter works")
    
    def test_create_appointment(self):
        """Test POST /api/provider/appointments creates appointment"""
        # Get a client first
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        # Find a TEST_ client
        test_client = next((c for c in clients if c.get("name", "").startswith("TEST_")), clients[0])
        client_id = test_client["client_id"]
        
        # Create appointment
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        appt_data = {
            "client_id": client_id,
            "appointment_date": tomorrow,
            "appointment_time": "10:00",
            "appointment_type": "consultation",
            "location": "Office",
            "notes": "TEST_Appt_Phase13"
        }
        
        response = requests.post(f"{BASE_URL}/api/provider/appointments", headers=self.headers, json=appt_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Appointment created"
        assert "appointment" in data
        assert "_id" not in data["appointment"]
        
        # Store appointment_id for cleanup
        self.created_appt_id = data["appointment"]["appointment_id"]
        print(f"✓ Appointment created: {self.created_appt_id}")
        return self.created_appt_id
    
    def test_create_appointment_without_client_id(self):
        """Test POST /api/provider/appointments without client_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/provider/appointments", 
            headers=self.headers, 
            json={"appointment_date": "2026-03-01", "appointment_time": "10:00"}
        )
        assert response.status_code == 400
        print(f"✓ Missing client_id returns 400")
    
    def test_create_appointment_with_invalid_client(self):
        """Test POST /api/provider/appointments with invalid client_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/provider/appointments", 
            headers=self.headers, 
            json={"client_id": "nonexistent_client", "appointment_date": "2026-03-01"}
        )
        assert response.status_code == 404
        print(f"✓ Invalid client_id returns 404")
    
    def test_update_appointment(self):
        """Test PUT /api/provider/appointments/{id} updates appointment"""
        # First create an appointment
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/provider/appointments", 
            headers=self.headers,
            json={"client_id": client_id, "appointment_date": tomorrow, "appointment_time": "11:00"}
        )
        assert create_response.status_code == 200
        appt_id = create_response.json()["appointment"]["appointment_id"]
        
        # Update appointment
        response = requests.put(
            f"{BASE_URL}/api/provider/appointments/{appt_id}", 
            headers=self.headers,
            json={"status": "confirmed", "notes": "Updated via test"}
        )
        assert response.status_code == 200
        assert response.json().get("message") == "Appointment updated"
        print(f"✓ Appointment updated: {appt_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/provider/appointments/{appt_id}", headers=self.headers)
    
    def test_update_appointment_not_found(self):
        """Test PUT /api/provider/appointments/{id} with invalid id returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/provider/appointments/nonexistent_appt", 
            headers=self.headers,
            json={"status": "confirmed"}
        )
        assert response.status_code == 404
        print(f"✓ Non-existent appointment update returns 404")
    
    def test_delete_appointment(self):
        """Test DELETE /api/provider/appointments/{id} deletes appointment"""
        # First create an appointment
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/provider/appointments", 
            headers=self.headers,
            json={"client_id": client_id, "appointment_date": tomorrow, "appointment_time": "14:00"}
        )
        assert create_response.status_code == 200
        appt_id = create_response.json()["appointment"]["appointment_id"]
        
        # Delete appointment
        response = requests.delete(f"{BASE_URL}/api/provider/appointments/{appt_id}", headers=self.headers)
        assert response.status_code == 200
        assert response.json().get("message") == "Appointment deleted"
        print(f"✓ Appointment deleted: {appt_id}")
    
    def test_delete_appointment_not_found(self):
        """Test DELETE /api/provider/appointments/{id} with invalid id returns 404"""
        response = requests.delete(f"{BASE_URL}/api/provider/appointments/nonexistent_appt", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ Non-existent appointment delete returns 404")


class TestProviderNotesDoula:
    """Test /api/provider/notes/* routes for DOULA"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.user_id = data["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_notes(self):
        """Test GET /api/provider/notes returns list"""
        response = requests.get(f"{BASE_URL}/api/provider/notes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check no ObjectId
        for note in data[:3]:
            assert "_id" not in note
        print(f"✓ Doula notes: {len(data)}")
    
    def test_get_notes_filtered_by_client(self):
        """Test GET /api/provider/notes with client_id filter"""
        # Get a client first
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/notes?client_id={client_id}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Notes filtered by client: {len(data)}")
    
    def test_create_note(self):
        """Test POST /api/provider/notes creates note"""
        # Get a client first
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        unique_id = uuid.uuid4().hex[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/provider/notes", 
            headers=self.headers,
            json={
                "client_id": client_id,
                "content": f"TEST_Note_Phase13_{unique_id}",
                "note_type": "General",
                "title": "Test Note"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "note_id" in data
        assert "_id" not in data
        print(f"✓ Note created: {data['note_id']}")
        return data["note_id"]
    
    def test_create_note_without_client_id(self):
        """Test POST /api/provider/notes without client_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/provider/notes", 
            headers=self.headers,
            json={"content": "Test content", "note_type": "General"}
        )
        assert response.status_code == 400
        print(f"✓ Missing client_id returns 400")
    
    def test_create_note_with_invalid_client(self):
        """Test POST /api/provider/notes with invalid client_id returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/provider/notes", 
            headers=self.headers,
            json={"client_id": "nonexistent_client", "content": "Test"}
        )
        assert response.status_code == 404
        print(f"✓ Invalid client_id returns 404")
    
    def test_update_note(self):
        """Test PUT /api/provider/notes/{id} updates note"""
        # First create a note
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        unique_id = uuid.uuid4().hex[:8]
        
        create_response = requests.post(
            f"{BASE_URL}/api/provider/notes", 
            headers=self.headers,
            json={"client_id": client_id, "content": f"Original_{unique_id}", "note_type": "General"}
        )
        assert create_response.status_code == 200
        note_id = create_response.json()["note_id"]
        
        # Update note
        response = requests.put(
            f"{BASE_URL}/api/provider/notes/{note_id}", 
            headers=self.headers,
            json={"content": "Updated content", "note_type": "Prenatal"}
        )
        assert response.status_code == 200
        assert response.json().get("message") == "Note updated"
        print(f"✓ Note updated: {note_id}")
    
    def test_update_note_not_found(self):
        """Test PUT /api/provider/notes/{id} with invalid id returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/provider/notes/nonexistent_note", 
            headers=self.headers,
            json={"content": "Updated"}
        )
        assert response.status_code == 404
        print(f"✓ Non-existent note update returns 404")
    
    def test_delete_note(self):
        """Test DELETE /api/provider/notes/{id} deletes note"""
        # First create a note
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        unique_id = uuid.uuid4().hex[:8]
        
        create_response = requests.post(
            f"{BASE_URL}/api/provider/notes", 
            headers=self.headers,
            json={"client_id": client_id, "content": f"ToDelete_{unique_id}", "note_type": "General"}
        )
        assert create_response.status_code == 200
        note_id = create_response.json()["note_id"]
        
        # Delete note
        response = requests.delete(f"{BASE_URL}/api/provider/notes/{note_id}", headers=self.headers)
        assert response.status_code == 200
        assert response.json().get("message") == "Note deleted"
        print(f"✓ Note deleted: {note_id}")
    
    def test_delete_note_not_found(self):
        """Test DELETE /api/provider/notes/{id} with invalid id returns 404"""
        response = requests.delete(f"{BASE_URL}/api/provider/notes/nonexistent_note", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ Non-existent note delete returns 404")


class TestProviderBirthRecordMidwife:
    """Test /api/provider/clients/{id}/birth-record routes for MIDWIFE"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.user_id = data["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_get_birth_record(self):
        """Test GET /api/provider/clients/{id}/birth-record returns record or empty"""
        # Get a client first
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/birth-record", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Can be empty dict or have data
        assert isinstance(data, dict)
        if data:
            assert "_id" not in data
        print(f"✓ Birth record retrieved (empty={len(data)==0})")
    
    def test_get_birth_record_not_found(self):
        """Test GET /api/provider/clients/{id}/birth-record with invalid client returns 404"""
        response = requests.get(f"{BASE_URL}/api/provider/clients/nonexistent/birth-record", headers=self.headers)
        assert response.status_code == 404
        print(f"✓ Non-existent client birth record returns 404")
    
    def test_create_birth_record(self):
        """Test POST /api/provider/clients/{id}/birth-record creates record"""
        # Get a client first
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        # Find a TEST_ client
        test_client = next((c for c in clients if c.get("name", "").startswith("TEST_")), clients[0])
        client_id = test_client["client_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/{client_id}/birth-record", 
            headers=self.headers,
            json={
                "birth_date": "2026-02-15",
                "birth_weight": "7 lbs 8 oz",
                "birth_time": "14:30",
                "delivery_method": "vaginal",
                "notes": "TEST_BirthRecord_Phase13"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Birth record created/updated: {data['message']}")
    
    def test_create_birth_record_for_nonexistent_client(self):
        """Test POST /api/provider/clients/{id}/birth-record with invalid client returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/nonexistent/birth-record", 
            headers=self.headers,
            json={"birth_date": "2026-02-15"}
        )
        assert response.status_code == 404
        print(f"✓ Non-existent client birth record create returns 404")


class TestProviderBirthRecordDoula:
    """Test DOULA can also access birth record routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_doula_can_get_birth_record(self):
        """Test DOULA can access GET /api/provider/clients/{id}/birth-record"""
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/birth-record", headers=self.headers)
        assert response.status_code == 200
        print(f"✓ Doula can access birth record")
    
    def test_doula_can_create_birth_record(self):
        """Test DOULA can POST /api/provider/clients/{id}/birth-record"""
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available for testing")
        
        test_client = next((c for c in clients if c.get("name", "").startswith("TEST_")), clients[0])
        client_id = test_client["client_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/provider/clients/{client_id}/birth-record", 
            headers=self.headers,
            json={"birth_date": "2026-02-20", "notes": "Doula birth record"}
        )
        assert response.status_code == 200
        print(f"✓ Doula can create birth record")


class TestProviderDashboard:
    """Test /api/provider/dashboard routes"""
    
    def test_doula_dashboard_stats(self):
        """Test GET /api/provider/dashboard returns stats for DOULA"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        token = response.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check common stats
        assert "total_clients" in data
        assert "active_clients" in data
        assert "upcoming_appointments" in data
        # DOULA should NOT have midwife-specific stats
        assert "visits_this_month" not in data or data.get("visits_this_month") == 0
        print(f"✓ Doula dashboard: total={data['total_clients']}, active={data['active_clients']}")
    
    def test_midwife_dashboard_stats(self):
        """Test GET /api/provider/dashboard returns role-specific stats for MIDWIFE"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        token = response.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check common stats
        assert "total_clients" in data
        assert "active_clients" in data
        assert "upcoming_appointments" in data
        
        # MIDWIFE should have additional stats
        assert "visits_this_month" in data
        assert "births_this_month" in data
        assert "prenatal_clients" in data
        print(f"✓ Midwife dashboard: total={data['total_clients']}, visits={data['visits_this_month']}, births={data['births_this_month']}")


class TestRoleBasedAccess:
    """Test that Mom cannot access provider/* routes"""
    
    def test_mom_cannot_access_provider_clients(self):
        """Test MOM cannot access GET /api/provider/clients"""
        # Login as Mom
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Mom account not available")
        
        token = response.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Mom cannot access /api/provider/clients (403)")
    
    def test_mom_cannot_access_provider_appointments(self):
        """Test MOM cannot access GET /api/provider/appointments"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Mom account not available")
        
        token = response.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/provider/appointments", headers=headers)
        assert response.status_code == 403
        print(f"✓ Mom cannot access /api/provider/appointments (403)")
    
    def test_mom_cannot_access_provider_dashboard(self):
        """Test MOM cannot access GET /api/provider/dashboard"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Mom account not available")
        
        token = response.json()["session_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=headers)
        assert response.status_code == 403
        print(f"✓ Mom cannot access /api/provider/dashboard (403)")


class TestObjectIdSerialization:
    """Test that no MongoDB ObjectId (_id) appears in responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_clients_no_objectid(self):
        """Test /api/provider/clients response has no _id"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for client in data[:5]:
            assert "_id" not in client, f"Found _id in client: {client.get('client_id')}"
        print(f"✓ Clients response has no ObjectId")
    
    def test_appointments_no_objectid(self):
        """Test /api/provider/appointments response has no _id"""
        response = requests.get(f"{BASE_URL}/api/provider/appointments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for appt in data[:5]:
            assert "_id" not in appt
        print(f"✓ Appointments response has no ObjectId")
    
    def test_notes_no_objectid(self):
        """Test /api/provider/notes response has no _id"""
        response = requests.get(f"{BASE_URL}/api/provider/notes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        for note in data[:5]:
            assert "_id" not in note
        print(f"✓ Notes response has no ObjectId")
    
    def test_dashboard_no_objectid(self):
        """Test /api/provider/dashboard response has no _id"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "_id" not in data
        print(f"✓ Dashboard response has no ObjectId")


class TestMidwifeSpecificFeatures:
    """Test Midwife-specific features in provider routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as Midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["session_token"]
        self.user_id = data["user_id"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_midwife_can_create_appointments(self):
        """Test Midwife can create appointments via provider routes"""
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0]["client_id"]
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/provider/appointments", 
            headers=self.headers,
            json={
                "client_id": client_id,
                "appointment_date": tomorrow,
                "appointment_time": "15:00",
                "appointment_type": "prenatal_visit"
            }
        )
        assert response.status_code == 200
        print(f"✓ Midwife can create appointments via provider routes")
        
        # Cleanup
        appt_id = response.json()["appointment"]["appointment_id"]
        requests.delete(f"{BASE_URL}/api/provider/appointments/{appt_id}", headers=self.headers)
    
    def test_midwife_can_create_notes(self):
        """Test Midwife can create notes via provider routes"""
        list_response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        clients = list_response.json()
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0]["client_id"]
        unique_id = uuid.uuid4().hex[:8]
        
        response = requests.post(
            f"{BASE_URL}/api/provider/notes", 
            headers=self.headers,
            json={
                "client_id": client_id,
                "content": f"TEST_MidwifeNote_{unique_id}",
                "note_type": "Prenatal"
            }
        )
        assert response.status_code == 200
        print(f"✓ Midwife can create notes via provider routes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
