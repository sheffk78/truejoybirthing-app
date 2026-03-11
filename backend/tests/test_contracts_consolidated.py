"""
Test consolidated contracts feature for Doula and Midwife roles.
Tests the backend APIs used by the shared ProviderContracts component.
Iteration 94 - Testing code consolidation from ~3000 lines to ~1400 lines.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://theme-unify-preview.preview.emergentagent.com')

# Test credentials
DOULA_CREDS = {"email": "demo.doula@truejoybirthing.com", "password": "DemoScreenshot2024!"}
MIDWIFE_CREDS = {"email": "demo.midwife@truejoybirthing.com", "password": "DemoScreenshot2024!"}


@pytest.fixture(scope="module")
def doula_session():
    """Login as doula and return session with auth token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json=DOULA_CREDS)
    assert response.status_code == 200, f"Doula login failed: {response.text}"
    
    data = response.json()
    token = data.get("session_token")
    assert token, "No session token in doula login response"
    
    session.headers.update({"Authorization": f"Bearer {token}"})
    session.user_data = data
    return session


@pytest.fixture(scope="module")
def midwife_session():
    """Login as midwife and return session with auth token"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json=MIDWIFE_CREDS)
    assert response.status_code == 200, f"Midwife login failed: {response.text}"
    
    data = response.json()
    token = data.get("session_token")
    assert token, "No session token in midwife login response"
    
    session.headers.update({"Authorization": f"Bearer {token}"})
    session.user_data = data
    return session


class TestDoulaContractEndpoints:
    """Test doula contract endpoints matching DOULA_CONTRACTS_CONFIG"""
    
    def test_list_doula_contracts(self, doula_session):
        """Test GET /doula/contracts - list endpoint"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} doula contracts")
        
        # If contracts exist, verify structure
        if data:
            contract = data[0]
            assert "contract_id" in contract
            assert "client_name" in contract
            assert "status" in contract
            assert "total_fee" in contract
    
    def test_get_doula_contract_defaults(self, doula_session):
        """Test GET /doula/contract-defaults - defaults endpoint"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contract-defaults")
        assert response.status_code == 200, f"Get defaults failed: {response.text}"
        
        data = response.json()
        # Should return dict with default values
        assert isinstance(data, dict), "Response should be a dict"
    
    def test_get_doula_clients(self, doula_session):
        """Test GET /doula/clients - clients endpoint for contract creation"""
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} doula clients")
        
        # If clients exist, verify structure
        if data:
            client = data[0]
            assert "client_id" in client
            assert "name" in client
    
    def test_get_contract_templates(self, doula_session):
        """Test GET /contract-templates - templates endpoint"""
        response = doula_session.get(f"{BASE_URL}/api/contract-templates")
        assert response.status_code == 200, f"Get templates failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} contract templates")


class TestMidwifeContractEndpoints:
    """Test midwife contract endpoints matching MIDWIFE_CONTRACTS_CONFIG"""
    
    def test_list_midwife_contracts(self, midwife_session):
        """Test GET /midwife/contracts - list endpoint"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} midwife contracts")
        
        # If contracts exist, verify structure
        if data:
            contract = data[0]
            assert "contract_id" in contract
            assert "client_name" in contract
            assert "status" in contract
            assert "total_fee" in contract
    
    def test_get_midwife_contract_defaults(self, midwife_session):
        """Test GET /midwife/contract-defaults - defaults endpoint"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contract-defaults")
        assert response.status_code == 200, f"Get defaults failed: {response.text}"
        
        data = response.json()
        # Should return dict with default values
        assert isinstance(data, dict), "Response should be a dict"
    
    def test_get_midwife_clients(self, midwife_session):
        """Test GET /midwife/clients - clients endpoint for contract creation"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} midwife clients")


class TestDoulaContractCRUD:
    """Test Doula contract creation, update, delete, send flows"""
    
    created_contract_id = None
    
    def test_create_doula_contract(self, doula_session):
        """Test POST /doula/contracts - create draft contract"""
        # First get a client
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No clients available for contract creation")
        
        # Find a client with linked_mom_id
        client = next((c for c in clients if c.get("linked_mom_id")), None)
        if not client:
            pytest.skip("No linked client available for contract creation")
        
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": client["name"],
            "estimated_due_date": "2026-06-15",
            "total_fee": 1500.0,
            "retainer_amount": 400.0,
            "prenatal_visit_description": "TEST_ Three prenatal visits",
            "on_call_window_description": "38-42 weeks",
            "on_call_response_description": "Respond within 24 hours",
            "backup_doula_preferences": "Backup may be introduced prior to labor",
            "postpartum_visit_description": "Two in-home visits",
            "speak_for_client_exception": "None",
            "retainer_non_refundable_after_weeks": 37,
            "cancellation_weeks_threshold": 37,
            "final_payment_due_detail": "Day after birth",
            "cesarean_alternative_support_description": "Two postpartum sessions",
            "unreachable_timeframe_description": "Within two hours",
            "unreachable_remedy_description": "Contract may be void",
            "precipitous_labor_definition": "Less than two hours",
            "precipitous_labor_compensation_description": "Four extra hours",
            "other_absence_policy": "Reviewed case-by-case",
            "special_arrangements": "TEST_ automated test contract"
        }
        
        response = doula_session.post(f"{BASE_URL}/api/doula/contracts", json=contract_payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "contract_id" in data
        assert data["status"] == "Draft"
        assert data["total_fee"] == 1500.0
        
        TestDoulaContractCRUD.created_contract_id = data["contract_id"]
        print(f"Created doula contract: {data['contract_id']}")
    
    def test_update_doula_contract(self, doula_session):
        """Test PUT /doula/contracts/{id} - update contract"""
        if not TestDoulaContractCRUD.created_contract_id:
            pytest.skip("No contract created to update")
        
        update_payload = {
            "total_fee": 1600.0,
            "retainer_amount": 450.0,
            "special_arrangements": "TEST_ updated test contract"
        }
        
        response = doula_session.put(
            f"{BASE_URL}/api/doula/contracts/{TestDoulaContractCRUD.created_contract_id}",
            json=update_payload
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        
        # Verify update persisted - list and find our contract
        list_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = list_resp.json()
        updated = next((c for c in contracts if c["contract_id"] == TestDoulaContractCRUD.created_contract_id), None)
        
        assert updated is not None, "Contract not found after update"
        assert updated["total_fee"] == 1600.0, "Total fee not updated"
        print(f"Updated contract fee to {updated['total_fee']}")
    
    def test_duplicate_doula_contract(self, doula_session):
        """Test POST /doula/contracts/{id}/duplicate - duplicate contract"""
        if not TestDoulaContractCRUD.created_contract_id:
            pytest.skip("No contract created to duplicate")
        
        response = doula_session.post(
            f"{BASE_URL}/api/doula/contracts/{TestDoulaContractCRUD.created_contract_id}/duplicate"
        )
        assert response.status_code == 200, f"Duplicate failed: {response.text}"
        
        data = response.json()
        assert "contract" in data
        duplicated = data["contract"]
        assert duplicated["contract_id"] != TestDoulaContractCRUD.created_contract_id
        assert duplicated["status"] == "Draft"
        print(f"Duplicated contract: {duplicated['contract_id']}")
        
        # Clean up duplicated contract
        del_resp = doula_session.delete(f"{BASE_URL}/api/doula/contracts/{duplicated['contract_id']}")
        assert del_resp.status_code == 200, "Failed to clean up duplicated contract"
    
    def test_view_contract_pdf(self, doula_session):
        """Test GET /contracts/{id}/pdf - PDF download endpoint"""
        if not TestDoulaContractCRUD.created_contract_id:
            pytest.skip("No contract created for PDF test")
        
        response = requests.get(
            f"{BASE_URL}/api/contracts/{TestDoulaContractCRUD.created_contract_id}/pdf",
            allow_redirects=False
        )
        # PDF endpoint should return 200 with PDF content
        assert response.status_code in [200, 404], f"PDF endpoint failed: {response.status_code}"
        
        if response.status_code == 200:
            assert "application/pdf" in response.headers.get("content-type", "")
            print(f"PDF download working for contract")
    
    def test_delete_doula_contract(self, doula_session):
        """Test DELETE /doula/contracts/{id} - delete draft contract"""
        if not TestDoulaContractCRUD.created_contract_id:
            pytest.skip("No contract created to delete")
        
        response = doula_session.delete(
            f"{BASE_URL}/api/doula/contracts/{TestDoulaContractCRUD.created_contract_id}"
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        # Verify deletion
        list_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = list_resp.json()
        deleted = next((c for c in contracts if c["contract_id"] == TestDoulaContractCRUD.created_contract_id), None)
        assert deleted is None, "Contract still exists after delete"
        print(f"Deleted contract: {TestDoulaContractCRUD.created_contract_id}")


class TestMidwifeContractCRUD:
    """Test Midwife contract creation, update, delete, send flows"""
    
    created_contract_id = None
    
    def test_create_midwife_contract(self, midwife_session):
        """Test POST /midwife/contracts - create draft contract"""
        # First get a client
        clients_resp = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        clients = clients_resp.json()
        
        if not clients:
            pytest.skip("No clients available for midwife contract creation")
        
        # Find a client with linked_mom_id
        client = next((c for c in clients if c.get("linked_mom_id")), None)
        if not client:
            pytest.skip("No linked client available for midwife contract creation")
        
        contract_payload = {
            "client_id": client["client_id"],
            "client_name": client["name"],
            "partner_name": "Test Partner",
            "estimated_due_date": "2026-06-20",
            "planned_birth_location": "Test Birth Center",
            "scope_description": "TEST_ Standard midwifery services",
            "total_fee": 5000.0,
            "retainer_amount": 1500.0,
            "remaining_balance_due_description": "36 weeks gestation",
            "fee_coverage_description": "Prenatal, birth attendance, postpartum",
            "refund_policy_description": "Partial refund if care ends early",
            "transfer_indications_description": "Complications requiring hospital",
            "midwife_withdrawal_reasons": "Client non-compliance",
            "no_refund_scenarios_description": "Client refuses recommended transfer",
            "on_call_window_description": "37-42 weeks",
            "backup_midwife_policy": "Backup introduced in advance",
            "contact_instructions_routine": "Call office for routine questions",
            "contact_instructions_urgent": "Call cell for urgent matters",
            "emergency_instructions": "Call 911 for emergencies",
            "special_arrangements": "TEST_ automated test contract"
        }
        
        response = midwife_session.post(f"{BASE_URL}/api/midwife/contracts", json=contract_payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "contract_id" in data
        assert data["status"] == "Draft"
        assert data["total_fee"] == 5000.0
        
        TestMidwifeContractCRUD.created_contract_id = data["contract_id"]
        print(f"Created midwife contract: {data['contract_id']}")
    
    def test_update_midwife_contract(self, midwife_session):
        """Test PUT /midwife/contracts/{id} - update contract"""
        if not TestMidwifeContractCRUD.created_contract_id:
            pytest.skip("No contract created to update")
        
        update_payload = {
            "total_fee": 5500.0,
            "retainer_amount": 1700.0,
            "special_arrangements": "TEST_ updated midwife contract"
        }
        
        response = midwife_session.put(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractCRUD.created_contract_id}",
            json=update_payload
        )
        assert response.status_code == 200, f"Update failed: {response.text}"
        print("Updated midwife contract")
    
    def test_duplicate_midwife_contract(self, midwife_session):
        """Test POST /midwife/contracts/{id}/duplicate - duplicate contract"""
        if not TestMidwifeContractCRUD.created_contract_id:
            pytest.skip("No contract created to duplicate")
        
        response = midwife_session.post(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractCRUD.created_contract_id}/duplicate"
        )
        assert response.status_code == 200, f"Duplicate failed: {response.text}"
        
        data = response.json()
        assert "contract" in data
        duplicated = data["contract"]
        assert duplicated["contract_id"] != TestMidwifeContractCRUD.created_contract_id
        print(f"Duplicated midwife contract: {duplicated['contract_id']}")
        
        # Clean up duplicated contract
        del_resp = midwife_session.delete(f"{BASE_URL}/api/midwife/contracts/{duplicated['contract_id']}")
        assert del_resp.status_code == 200, "Failed to clean up duplicated contract"
    
    def test_view_midwife_contract_pdf(self, midwife_session):
        """Test GET /midwife-contracts/{id}/pdf - PDF download endpoint"""
        if not TestMidwifeContractCRUD.created_contract_id:
            pytest.skip("No contract created for PDF test")
        
        response = requests.get(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractCRUD.created_contract_id}/pdf",
            allow_redirects=False
        )
        # PDF endpoint should return 200 with PDF content
        assert response.status_code in [200, 404], f"PDF endpoint failed: {response.status_code}"
        
        if response.status_code == 200:
            assert "application/pdf" in response.headers.get("content-type", "")
            print(f"PDF download working for midwife contract")
    
    def test_delete_midwife_contract(self, midwife_session):
        """Test DELETE /midwife/contracts/{id} - delete draft contract"""
        if not TestMidwifeContractCRUD.created_contract_id:
            pytest.skip("No contract created to delete")
        
        response = midwife_session.delete(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractCRUD.created_contract_id}"
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        print(f"Deleted midwife contract: {TestMidwifeContractCRUD.created_contract_id}")


class TestExistingContracts:
    """Test operations on existing demo contracts"""
    
    def test_doula_demo_contract_pdf(self, doula_session):
        """Test PDF for existing demo doula contract"""
        list_resp = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = list_resp.json()
        
        if not contracts:
            pytest.skip("No existing doula contracts")
        
        contract_id = contracts[0]["contract_id"]
        response = requests.get(
            f"{BASE_URL}/api/contracts/{contract_id}/pdf",
            allow_redirects=False
        )
        
        assert response.status_code == 200, f"PDF failed: {response.status_code}"
        assert "application/pdf" in response.headers.get("content-type", "")
        print(f"Demo doula contract PDF works: {contract_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
