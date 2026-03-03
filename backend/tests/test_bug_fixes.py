"""
Backend API tests for True Joy Birthing bug fixes
Tests the 6 bugs that were fixed in the Midwife area

Bug #1: Birth plan not viewable for clients - /provider/shared-birth-plan/{mom_user_id}
Bug #2: Contract birth setting not pre-filled (frontend - uses same API)
Bug #3: Contract send not working on web (frontend only - Alert.alert fix)
Bug #4: Invoice click does nothing for non-draft invoices (frontend only)
Bug #5: Breadcrumb client name goes to Dashboard (frontend only)
Bug #6: Appointment creation auto-opens new form (frontend only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBugFix1_BirthPlanAccess:
    """Test Bug #1 - Birth plan should be viewable for clients linked to the provider"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get authentication token for midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Midwife authentication failed")
    
    def test_get_clients_list(self, midwife_token):
        """Test that midwife can get clients list"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        print(f"Found {len(clients)} clients")
        return clients
    
    def test_birth_plan_access_for_linked_client(self, midwife_token):
        """Bug #1: Birth plan should be accessible for linked clients"""
        # First get clients to find linked_mom_id
        clients_response = requests.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        # Find a client with linked_mom_id
        linked_client = next((c for c in clients if c.get('linked_mom_id')), None)
        if not linked_client:
            pytest.skip("No linked clients found to test")
        
        mom_user_id = linked_client['linked_mom_id']
        print(f"Testing birth plan access for mom_user_id: {mom_user_id}")
        
        # Test the birth plan API - this was returning 403 before the fix
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plan/{mom_user_id}",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        
        # Should return 200 now (was 403 before the fix)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "mom" in data or "plan" in data or "mom_profile" in data, "Response should contain birth plan data"
        
        # Check if birth setting is available (used for Bug #2)
        if "mom_profile" in data:
            print(f"Birth setting: {data['mom_profile'].get('planned_birth_setting', 'N/A')}")
    
    def test_birth_plan_access_denied_for_non_linked_user(self, midwife_token):
        """Test that birth plan access is denied for non-linked mom users"""
        # Use a fake/non-linked mom_user_id
        fake_mom_id = "non_existent_mom_12345"
        
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plan/{fake_mom_id}",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        
        # Should return 403 or 404 for non-linked users
        assert response.status_code in [403, 404], f"Expected 403/404 for non-linked user, got {response.status_code}"


class TestContractsAPI:
    """Test Contracts API functionality"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get authentication token for midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Midwife authentication failed")
    
    def test_get_contracts_list(self, midwife_token):
        """Test contracts list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200
        contracts = response.json()
        assert isinstance(contracts, list)
        print(f"Found {len(contracts)} contracts")
    
    def test_send_contract_api(self, midwife_token):
        """Test contract send API (Bug #3 - the API itself, frontend uses window.confirm)"""
        # Get contracts to find a draft one
        response = requests.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        contracts = response.json()
        
        draft_contract = next((c for c in contracts if c.get('status') == 'Draft'), None)
        if not draft_contract:
            pytest.skip("No draft contracts to test send functionality")
        
        contract_id = draft_contract['contract_id']
        
        # Send contract
        send_response = requests.post(
            f"{BASE_URL}/api/midwife/contracts/{contract_id}/send",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        
        # Should succeed
        assert send_response.status_code == 200, f"Failed to send contract: {send_response.text}"
        
        # Verify status changed
        verify_response = requests.get(
            f"{BASE_URL}/api/midwife/contracts",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        updated_contracts = verify_response.json()
        updated_contract = next((c for c in updated_contracts if c['contract_id'] == contract_id), None)
        
        assert updated_contract is not None
        assert updated_contract['status'] == 'Sent', f"Contract status should be 'Sent', got {updated_contract['status']}"


class TestInvoicesAPI:
    """Test Invoices API functionality (Bug #4 is frontend-only)"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get authentication token for midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Midwife authentication failed")
    
    def test_get_invoices_list(self, midwife_token):
        """Test invoices list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/invoices",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200
        invoices = response.json()
        assert isinstance(invoices, list)
        print(f"Found {len(invoices)} invoices")


class TestAppointmentsAPI:
    """Test Appointments API functionality (Bug #6 is frontend-only)"""
    
    @pytest.fixture
    def midwife_token(self):
        """Get authentication token for midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip("Midwife authentication failed")
    
    def test_get_appointments_list(self, midwife_token):
        """Test appointments list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/provider/appointments",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200
        appointments = response.json()
        assert isinstance(appointments, list)
        print(f"Found {len(appointments)} appointments")
    
    def test_create_appointment(self, midwife_token):
        """Test appointment creation API"""
        # Get clients first
        clients_response = requests.get(
            f"{BASE_URL}/api/midwife/clients",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        clients = clients_response.json()
        linked_client = next((c for c in clients if c.get('linked_mom_id')), None)
        
        if not linked_client:
            pytest.skip("No linked clients for appointment test")
        
        # Create appointment
        create_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {midwife_token}"},
            json={
                "client_id": linked_client['client_id'],
                "appointment_date": "2026-03-10",
                "appointment_time": "10:00",
                "appointment_type": "Prenatal Visit",
                "location": "Test Location",
                "is_virtual": False,
                "notes": "TEST_appointment_from_pytest"
            }
        )
        
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        created = create_response.json()
        # Response may have appointment nested inside 'appointment' key
        if "appointment" in created:
            assert "appointment_id" in created["appointment"]
        else:
            assert "appointment_id" in created or "id" in created
        print(f"Created appointment successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
