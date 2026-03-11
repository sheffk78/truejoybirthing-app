"""
Test suite for ProviderClientDetail refactoring verification (Iteration 135)
Tests: Login, Client Detail loading, Prenatal/Labor/Birth sections, PDF download
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bug-fixes-p0.preview.emergentagent.com')

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
TEST_CLIENT_ID = "client_a034be9c9748"


class TestMidwifeLogin:
    """Test midwife authentication"""
    
    def test_midwife_login_success(self):
        """Test successful midwife login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        assert data["email"] == MIDWIFE_EMAIL
        print(f"Login successful: {data['full_name']}")


@pytest.fixture
def auth_token():
    """Get authentication token for midwife"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip("Authentication failed")


class TestClientDetail:
    """Test client detail and related sections"""
    
    def test_get_clients_list(self, auth_token):
        """Test fetching clients list"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        assert len(clients) > 0
        print(f"Found {len(clients)} clients")
    
    def test_get_client_detail(self, auth_token):
        """Test fetching specific client detail"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        client = response.json()
        assert client["client_id"] == TEST_CLIENT_ID
        assert "name" in client
        print(f"Client detail: {client['name']}")


class TestPrenatalVisitSection:
    """Test Prenatal Visit endpoints (refactored component)"""
    
    def test_get_prenatal_visits(self, auth_token):
        """Test fetching prenatal visits for a client"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        visits = response.json()
        assert isinstance(visits, list)
        print(f"Found {len(visits)} prenatal visits")


class TestLaborSection:
    """Test Labor Records endpoints (refactored component)"""
    
    def test_get_labor_records(self, auth_token):
        """Test fetching labor records for a client"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        records = response.json()
        assert isinstance(records, list)
        print(f"Found {len(records)} labor records")
        
        if records:
            record = records[0]
            # Verify expected fields
            assert "labor_record_id" in record
            assert "client_id" in record


class TestBirthRecordSection:
    """Test Birth Record endpoints (refactored component)"""
    
    def test_get_birth_record(self, auth_token):
        """Test fetching birth record for a client"""
        response = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        record = response.json()
        assert record["client_id"] == TEST_CLIENT_ID
        assert "birth_record_id" in record
        print(f"Birth record: Baby {record.get('baby_name', 'N/A')}")
    
    def test_birth_summary_pdf_download(self, auth_token):
        """Test PDF download endpoint returns valid PDF"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "application/pdf"
        assert "Content-Disposition" in response.headers
        assert "attachment" in response.headers["Content-Disposition"]
        print(f"PDF download successful: {response.headers.get('Content-Disposition')}")
    
    def test_birth_summary_preview(self, auth_token):
        """Test birth summary preview endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "client_name" in data
        assert "labor_records_count" in data
        assert "has_birth_record" in data
        assert data["can_generate"] == True
        print(f"Preview: {data['client_name']}, {data['labor_records_count']} labor records")


class TestRefactoringIntegrity:
    """Test that refactored components integrate correctly"""
    
    def test_client_detail_integration(self, auth_token):
        """Test that client detail loads all sections data"""
        # Get client
        client_resp = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert client_resp.status_code == 200
        
        # Get prenatal visits
        visits_resp = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/prenatal-visits",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert visits_resp.status_code == 200
        
        # Get labor records
        labor_resp = requests.get(
            f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/labor-records",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert labor_resp.status_code == 200
        
        # Get birth record
        birth_resp = requests.get(
            f"{BASE_URL}/api/provider/clients/{TEST_CLIENT_ID}/birth-record",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert birth_resp.status_code == 200
        
        print("All client detail sections load successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
