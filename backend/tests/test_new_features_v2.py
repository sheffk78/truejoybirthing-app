"""
Test file for newly added features in True Joy Birthing App:
- Doula Notes API
- Midwife Dashboard, Clients, Visits, Birth Summaries APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/') or "https://mama-care-platform.preview.emergentagent.com"

# Test credentials from main agent
DOULA_EMAIL = "doula2_1771213474@test.com"
DOULA_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife_1771216891@test.com"
MIDWIFE_PASSWORD = "password123"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def doula_token(api_client):
    """Get doula authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip(f"Doula authentication failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def midwife_token(api_client):
    """Get midwife authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip(f"Midwife authentication failed: {response.status_code} - {response.text}")

@pytest.fixture(scope="module")
def doula_client(api_client, doula_token):
    """Session with doula auth header"""
    api_client.headers.update({"Authorization": f"Bearer {doula_token}"})
    return api_client

@pytest.fixture(scope="module")
def midwife_client(api_client, midwife_token):
    """Session with midwife auth header"""
    api_client.headers.update({"Authorization": f"Bearer {midwife_token}"})
    return api_client

# ===========================================
# DOULA NOTES API TESTS
# ===========================================
class TestDoulaNotesAPI:
    """Tests for Doula Notes endpoints"""
    
    def test_get_doula_notes_returns_array(self, api_client, doula_token):
        """GET /api/doula/notes returns array"""
        response = api_client.get(
            f"{BASE_URL}/api/doula/notes",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/doula/notes returns array with {len(data)} notes")
    
    def test_create_doula_note(self, api_client, doula_token):
        """POST /api/doula/notes creates a note"""
        # First get a client ID to associate the note with
        clients_response = api_client.get(
            f"{BASE_URL}/api/doula/clients",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert clients_response.status_code == 200, f"Failed to get clients: {clients_response.text}"
        clients = clients_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available to create note for")
        
        client_id = clients[0]["client_id"]
        
        # Create the note
        test_note = {
            "client_id": client_id,
            "note_type": "Prenatal",
            "content": f"TEST_Note created at {uuid.uuid4().hex[:8]}",
            "date": "2026-01-15"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/doula/notes",
            headers={"Authorization": f"Bearer {doula_token}"},
            json=test_note
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        note = response.json()
        assert "note_id" in note, "Note should have note_id"
        assert note["client_id"] == client_id, "client_id should match"
        assert note["note_type"] == "Prenatal", "note_type should match"
        assert "TEST_Note" in note["content"], "content should match"
        print(f"PASS: POST /api/doula/notes creates note with ID {note['note_id']}")
        
        # Verify persistence by getting notes again
        notes_response = api_client.get(
            f"{BASE_URL}/api/doula/notes",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert notes_response.status_code == 200
        notes = notes_response.json()
        created_note = next((n for n in notes if n["note_id"] == note["note_id"]), None)
        assert created_note is not None, "Created note should be in notes list"
        print(f"PASS: Note persisted and visible in GET /api/doula/notes")


# ===========================================
# MIDWIFE DASHBOARD API TESTS
# ===========================================
class TestMidwifeDashboardAPI:
    """Tests for Midwife Dashboard endpoint"""
    
    def test_get_midwife_dashboard_returns_stats(self, api_client, midwife_token):
        """GET /api/midwife/dashboard returns stats"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/dashboard",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_clients" in data, "Should have total_clients"
        assert "prenatal_clients" in data, "Should have prenatal_clients"
        assert "visits_this_month" in data, "Should have visits_this_month"
        assert "births_this_month" in data, "Should have births_this_month"
        
        # Stats should be integers
        assert isinstance(data["total_clients"], int), "total_clients should be int"
        assert isinstance(data["prenatal_clients"], int), "prenatal_clients should be int"
        print(f"PASS: GET /api/midwife/dashboard returns stats: {data}")


# ===========================================
# MIDWIFE CLIENTS API TESTS
# ===========================================
class TestMidwifeClientsAPI:
    """Tests for Midwife Clients endpoints"""
    
    def test_get_midwife_clients_returns_array(self, api_client, midwife_token):
        """GET /api/midwife/clients returns array"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/midwife/clients returns array with {len(data)} clients")
    
    def test_create_midwife_client(self, api_client, midwife_token):
        """POST /api/midwife/clients creates client"""
        test_client = {
            "name": f"TEST_MidwifeClient_{uuid.uuid4().hex[:8]}",
            "email": f"test_mw_client_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "555-0199",
            "edd": "2026-06-15",
            "planned_birth_setting": "Home"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"},
            json=test_client
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        client = response.json()
        assert "client_id" in client, "Should have client_id"
        assert client["name"] == test_client["name"], "Name should match"
        assert client["provider_type"] == "MIDWIFE", "provider_type should be MIDWIFE"
        assert client["status"] == "Prenatal", "Default status should be Prenatal"
        print(f"PASS: POST /api/midwife/clients creates client with ID {client['client_id']}")
        
        # Verify persistence
        clients_response = api_client.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        clients = clients_response.json()
        created_client = next((c for c in clients if c["client_id"] == client["client_id"]), None)
        assert created_client is not None, "Created client should be in clients list"
        print(f"PASS: Client persisted and visible in GET /api/midwife/clients")
        
        return client


# ===========================================
# MIDWIFE VISITS API TESTS
# ===========================================
class TestMidwifeVisitsAPI:
    """Tests for Midwife Visits endpoints"""
    
    @pytest.fixture(scope="class")
    def midwife_test_client(self, api_client, midwife_token):
        """Create a test client for visits tests"""
        test_client = {
            "name": f"TEST_VisitClient_{uuid.uuid4().hex[:8]}",
            "email": f"test_visit_{uuid.uuid4().hex[:8]}@test.com",
            "edd": "2026-07-01",
            "planned_birth_setting": "Birth Center"
        }
        response = api_client.post(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"},
            json=test_client
        )
        if response.status_code != 200:
            # Try to get existing client
            clients_response = api_client.get(
                f"{BASE_URL}/api/midwife/clients",
                headers={"Authorization": f"Bearer {midwife_token}"}
            )
            clients = clients_response.json()
            if clients:
                return clients[0]
            pytest.skip("Cannot create or get test client for visits")
        return response.json()
    
    def test_get_midwife_visits_returns_array(self, api_client, midwife_token):
        """GET /api/midwife/visits returns array"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/visits",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/midwife/visits returns array with {len(data)} visits")
    
    def test_create_midwife_visit(self, api_client, midwife_token, midwife_test_client):
        """POST /api/midwife/visits creates visit"""
        test_visit = {
            "client_id": midwife_test_client["client_id"],
            "visit_date": "2026-01-15",
            "visit_type": "Prenatal",
            "gestational_age": "32 weeks",
            "blood_pressure": "120/80",
            "weight": "145 lbs",
            "fetal_heart_rate": "140 bpm",
            "note": f"TEST_Visit note {uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/midwife/visits",
            headers={"Authorization": f"Bearer {midwife_token}"},
            json=test_visit
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        visit = response.json()
        assert "visit_id" in visit, "Should have visit_id"
        assert visit["client_id"] == test_visit["client_id"], "client_id should match"
        assert visit["visit_type"] == "Prenatal", "visit_type should match"
        print(f"PASS: POST /api/midwife/visits creates visit with ID {visit['visit_id']}")
        
        # Verify persistence
        visits_response = api_client.get(
            f"{BASE_URL}/api/midwife/visits",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        visits = visits_response.json()
        created_visit = next((v for v in visits if v["visit_id"] == visit["visit_id"]), None)
        assert created_visit is not None, "Created visit should be in visits list"
        print(f"PASS: Visit persisted and visible in GET /api/midwife/visits")


# ===========================================
# MIDWIFE BIRTH SUMMARIES API TESTS
# ===========================================
class TestMidwifeBirthSummariesAPI:
    """Tests for Midwife Birth Summaries endpoints"""
    
    @pytest.fixture(scope="class")
    def midwife_birth_client(self, api_client, midwife_token):
        """Create a test client for birth summary tests"""
        test_client = {
            "name": f"TEST_BirthClient_{uuid.uuid4().hex[:8]}",
            "email": f"test_birth_{uuid.uuid4().hex[:8]}@test.com",
            "edd": "2026-01-10",
            "planned_birth_setting": "Home"
        }
        response = api_client.post(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"},
            json=test_client
        )
        if response.status_code != 200:
            pytest.skip(f"Cannot create test client for birth summary: {response.text}")
        return response.json()
    
    def test_get_midwife_birth_summaries_returns_array(self, api_client, midwife_token):
        """GET /api/midwife/birth-summaries returns array"""
        response = api_client.get(
            f"{BASE_URL}/api/midwife/birth-summaries",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/midwife/birth-summaries returns array with {len(data)} summaries")
    
    def test_create_birth_summary(self, api_client, midwife_token, midwife_birth_client):
        """POST /api/midwife/birth-summaries creates summary"""
        test_summary = {
            "client_id": midwife_birth_client["client_id"],
            "birth_datetime": "2026-01-10 14:30",
            "birth_place": "Home",
            "mode_of_birth": "Spontaneous Vaginal",
            "newborn_details": "TEST_Baby 7 lbs 8 oz, Female, APGARs 9/9",
            "complications": None,
            "summary_note": f"TEST_Birth went smoothly {uuid.uuid4().hex[:8]}"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/midwife/birth-summaries",
            headers={"Authorization": f"Bearer {midwife_token}"},
            json=test_summary
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        summary = response.json()
        assert "summary_id" in summary, "Should have summary_id"
        assert summary["client_id"] == test_summary["client_id"], "client_id should match"
        assert summary["birth_place"] == "Home", "birth_place should match"
        assert summary["mode_of_birth"] == "Spontaneous Vaginal", "mode_of_birth should match"
        print(f"PASS: POST /api/midwife/birth-summaries creates summary with ID {summary['summary_id']}")
        
        # Verify persistence
        summaries_response = api_client.get(
            f"{BASE_URL}/api/midwife/birth-summaries",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        summaries = summaries_response.json()
        created_summary = next((s for s in summaries if s["summary_id"] == summary["summary_id"]), None)
        assert created_summary is not None, "Created summary should be in summaries list"
        print(f"PASS: Birth summary persisted and visible in GET /api/midwife/birth-summaries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
