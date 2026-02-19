"""
Test suite for provider_id field naming standardization (Tech debt cleanup).
Tests that provider_id/provider_type fields work correctly after migration from
pro_user_id/pro_type across all affected endpoints.

Features tested:
1. Doula dashboard and client endpoints
2. Midwife dashboard and client endpoints  
3. Invoices endpoints with new provider_id field
4. Contracts endpoints with new provider_id field
5. Contract templates for both roles
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://cleanup-refactor.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture(scope="module")
def doula_session():
    """Authenticate as doula and return session with token."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Doula login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    token = data.get("session_token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session, data


@pytest.fixture(scope="module")
def midwife_session():
    """Authenticate as midwife and return session with token."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Midwife login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    token = data.get("session_token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    
    return session, data


class TestDoulaEndpointsAfterStandardization:
    """Test Doula endpoints work correctly with provider_id standardization."""
    
    def test_doula_dashboard_loads(self, doula_session):
        """Doula dashboard should load with provider_id field queries."""
        session, user_data = doula_session
        
        response = session.get(f"{BASE_URL}/api/doula/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        # Dashboard should have expected fields
        assert "total_clients" in data
        assert "active_clients" in data
        assert "pending_invoices" in data
        assert "contracts_pending" in data
        print(f"Doula Dashboard: {data['total_clients']} clients, {data['active_clients']} active")
    
    def test_doula_clients_list(self, doula_session):
        """Doula clients endpoint should return data with provider_id."""
        session, user_data = doula_session
        
        response = session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200, f"Clients list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Clients should be a list"
        
        if len(data) > 0:
            client = data[0]
            # Verify client has provider_id field (the new standardized field)
            assert "provider_id" in client, "Client should have provider_id field"
            assert "provider_type" in client, "Client should have provider_type field"
            assert client["provider_type"] == "DOULA"
            print(f"Doula has {len(data)} clients, first client provider_id: {client['provider_id']}")
        else:
            print("Doula has no clients")
    
    def test_doula_client_create_uses_provider_id(self, doula_session):
        """Creating a client should store provider_id field."""
        session, user_data = doula_session
        
        # Create a test client
        test_client = {
            "name": "TEST_ProviderID_Client",
            "email": "test.providerid@example.com",
            "edd": "2026-08-15",
            "planned_birth_setting": "Hospital"
        }
        
        response = session.post(f"{BASE_URL}/api/doula/clients", json=test_client)
        assert response.status_code == 201, f"Create client failed: {response.text}"
        
        data = response.json()
        assert "client_id" in data
        assert "provider_id" in data, "Created client should have provider_id"
        assert "provider_type" in data, "Created client should have provider_type"
        assert data["provider_type"] == "DOULA"
        
        client_id = data["client_id"]
        print(f"Created test client {client_id} with provider_id: {data['provider_id']}")
        
        # Clean up - delete the test client
        delete_response = session.delete(f"{BASE_URL}/api/doula/clients/{client_id}")
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        print(f"Cleaned up test client {client_id}")


class TestMidwifeEndpointsAfterStandardization:
    """Test Midwife endpoints work correctly with provider_id standardization."""
    
    def test_midwife_dashboard_loads(self, midwife_session):
        """Midwife dashboard should load with provider_id field queries."""
        session, user_data = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert "total_clients" in data
        assert "prenatal_clients" in data
        assert "active_clients" in data
        print(f"Midwife Dashboard: {data['total_clients']} clients, {data['prenatal_clients']} prenatal")
    
    def test_midwife_clients_list(self, midwife_session):
        """Midwife clients endpoint should return data with provider_id."""
        session, user_data = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200, f"Clients list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Clients should be a list"
        
        if len(data) > 0:
            client = data[0]
            # Verify client has provider_id field
            assert "provider_id" in client, "Client should have provider_id field"
            assert "provider_type" in client, "Client should have provider_type field"  
            assert client["provider_type"] == "MIDWIFE"
            print(f"Midwife has {len(data)} clients, first client provider_id: {client['provider_id']}")
        else:
            print("Midwife has no clients")
    
    def test_midwife_client_create_uses_provider_id(self, midwife_session):
        """Creating a midwife client should store provider_id field."""
        session, user_data = midwife_session
        
        test_client = {
            "name": "TEST_Midwife_ProviderID",
            "email": "test.midwifeproviderid@example.com",
            "edd": "2026-09-20",
            "planned_birth_setting": "Home"
        }
        
        response = session.post(f"{BASE_URL}/api/midwife/clients", json=test_client)
        assert response.status_code == 201, f"Create client failed: {response.text}"
        
        data = response.json()
        assert "client_id" in data
        assert "provider_id" in data, "Created client should have provider_id"
        assert "provider_type" in data, "Created client should have provider_type"
        assert data["provider_type"] == "MIDWIFE"
        
        client_id = data["client_id"]
        print(f"Created midwife test client {client_id} with provider_id: {data['provider_id']}")
        
        # Clean up
        delete_response = session.delete(f"{BASE_URL}/api/midwife/clients/{client_id}")
        assert delete_response.status_code in [200, 204], f"Delete failed: {delete_response.text}"
        print(f"Cleaned up test client {client_id}")


class TestInvoicesWithProviderIdStandardization:
    """Test invoices work correctly with provider_id field."""
    
    def test_doula_invoices_list(self, doula_session):
        """Doula invoices should use provider_id for filtering."""
        session, _ = doula_session
        
        response = session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            invoice = data[0]
            assert "provider_id" in invoice, "Invoice should have provider_id"
            assert "provider_type" in invoice, "Invoice should have provider_type"
            print(f"Doula has {len(data)} invoices")
        else:
            print("Doula has no invoices")
    
    def test_midwife_invoices_list(self, midwife_session):
        """Midwife invoices should use provider_id for filtering."""
        session, _ = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 200, f"Invoices list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            invoice = data[0]
            assert "provider_id" in invoice, "Invoice should have provider_id"
            assert "provider_type" in invoice, "Invoice should have provider_type"
            print(f"Midwife has {len(data)} invoices")
        else:
            print("Midwife has no invoices")


class TestContractsWithProviderIdStandardization:
    """Test contracts work correctly with provider_id field."""
    
    def test_doula_contracts_list(self, doula_session):
        """Doula contracts should be accessible."""
        session, _ = doula_session
        
        response = session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200, f"Contracts list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Doula has {len(data)} contracts")
    
    def test_midwife_contracts_list(self, midwife_session):
        """Midwife contracts should be accessible."""
        session, _ = midwife_session
        
        response = session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200, f"Contracts list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Midwife has {len(data)} contracts")


class TestContractTemplatesWithProviderIdStandardization:
    """Test contract templates work correctly with provider_id field."""
    
    def test_doula_contract_templates(self, doula_session):
        """Doula contract templates should use provider_id."""
        session, _ = doula_session
        
        response = session.get(f"{BASE_URL}/api/contract-templates?template_type=doula")
        assert response.status_code == 200, f"Templates list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            template = data[0]
            assert "provider_id" in template, "Template should have provider_id"
            print(f"Doula has {len(data)} contract templates")
        else:
            print("Doula has no contract templates")
    
    def test_midwife_contract_templates(self, midwife_session):
        """Midwife contract templates should use provider_id."""
        session, _ = midwife_session
        
        response = session.get(f"{BASE_URL}/api/contract-templates?template_type=midwife")
        assert response.status_code == 200, f"Templates list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            template = data[0]
            assert "provider_id" in template, "Template should have provider_id"
            print(f"Midwife has {len(data)} contract templates")
        else:
            print("Midwife has no contract templates")


class TestProviderIdHelperFunctions:
    """Test the client_utils helper functions work correctly."""
    
    def test_doula_client_details_use_provider_id(self, doula_session):
        """Verify client details endpoint uses provider_id for queries."""
        session, _ = doula_session
        
        # First get a client
        list_response = session.get(f"{BASE_URL}/api/doula/clients")
        assert list_response.status_code == 200
        
        clients = list_response.json()
        if len(clients) == 0:
            pytest.skip("No clients to test details endpoint")
        
        client_id = clients[0]["client_id"]
        
        # Get client details
        response = session.get(f"{BASE_URL}/api/doula/clients/{client_id}")
        assert response.status_code == 200, f"Client details failed: {response.text}"
        
        data = response.json()
        assert "provider_id" in data
        print(f"Client details for {client_id} uses provider_id: {data['provider_id']}")
    
    def test_midwife_client_details_use_provider_id(self, midwife_session):
        """Verify midwife client details endpoint uses provider_id for queries."""
        session, _ = midwife_session
        
        # First get a client
        list_response = session.get(f"{BASE_URL}/api/midwife/clients")
        assert list_response.status_code == 200
        
        clients = list_response.json()
        if len(clients) == 0:
            pytest.skip("No clients to test details endpoint")
        
        client_id = clients[0]["client_id"]
        
        # Get client details
        response = session.get(f"{BASE_URL}/api/midwife/clients/{client_id}")
        assert response.status_code == 200, f"Client details failed: {response.text}"
        
        data = response.json()
        assert "provider_id" in data
        print(f"Midwife client details for {client_id} uses provider_id: {data['provider_id']}")


class TestNotesWithProviderIdStandardization:
    """Test notes work correctly with provider_id field."""
    
    def test_doula_notes_list(self, doula_session):
        """Doula notes should use provider_id for filtering."""
        session, _ = doula_session
        
        response = session.get(f"{BASE_URL}/api/doula/notes")
        assert response.status_code == 200, f"Notes list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            note = data[0]
            assert "provider_id" in note, "Note should have provider_id"
            print(f"Doula has {len(data)} notes")
        else:
            print("Doula has no notes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
