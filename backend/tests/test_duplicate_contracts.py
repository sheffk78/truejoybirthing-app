"""
Test Suite: Duplicate Contract Feature for Doula and Midwife
Tests the new duplicate contract API endpoints for both provider types.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mama-care-platform.preview.emergentagent.com')

# Test credentials
MIDWIFE_EMAIL = "testmidwife@test.com"
MIDWIFE_PASSWORD = "password123"
DOULA_EMAIL = "marketplace_doula@test.com"
DOULA_PASSWORD = "password123"


class TestMidwifeDuplicateContract:
    """Test midwife contract duplicate functionality"""
    
    midwife_token = None
    original_contract_id = None
    duplicated_contract_id = None
    test_client_id = None
    
    def test_01_midwife_login(self):
        """Test midwife login to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        print(f"Midwife login response: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        TestMidwifeDuplicateContract.midwife_token = data["session_token"]
        print(f"Midwife logged in successfully, user_id: {data.get('user_id')}")
    
    def test_02_get_midwife_clients(self):
        """Get midwife clients to ensure there's at least one for testing"""
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        response = requests.get(f"{BASE_URL}/api/midwife/clients", headers=headers)
        print(f"Get clients response: {response.status_code}")
        assert response.status_code == 200
        clients = response.json()
        print(f"Found {len(clients)} midwife clients")
        if clients:
            TestMidwifeDuplicateContract.test_client_id = clients[0]["client_id"]
            print(f"Using client_id: {TestMidwifeDuplicateContract.test_client_id}")
    
    def test_03_get_midwife_contracts(self):
        """Get existing midwife contracts to find one to duplicate"""
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        response = requests.get(f"{BASE_URL}/api/midwife/contracts", headers=headers)
        print(f"Get contracts response: {response.status_code}")
        assert response.status_code == 200
        contracts = response.json()
        print(f"Found {len(contracts)} midwife contracts")
        if contracts:
            TestMidwifeDuplicateContract.original_contract_id = contracts[0]["contract_id"]
            print(f"Will duplicate contract_id: {TestMidwifeDuplicateContract.original_contract_id}")
            print(f"Original contract client_name: {contracts[0].get('client_name')}")
            print(f"Original contract status: {contracts[0].get('status')}")
    
    def test_04_create_contract_if_needed(self):
        """Create a contract if none exist for testing duplicate"""
        if TestMidwifeDuplicateContract.original_contract_id:
            print("Contract already exists, skipping creation")
            return
        
        if not TestMidwifeDuplicateContract.test_client_id:
            pytest.skip("No client available to create contract")
        
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        contract_data = {
            "client_id": TestMidwifeDuplicateContract.test_client_id,
            "client_name": "Test Client for Duplicate",
            "estimated_due_date": "2025-06-15",
            "planned_birth_location": "Home Birth",
            "total_fee": 5000.00,
            "retainer_amount": 1500.00,
            "remaining_balance": 3500.00,
            "scope_description": "Full midwifery care",
            "on_call_window_description": "37-42 weeks"
        }
        response = requests.post(f"{BASE_URL}/api/midwife/contracts", headers=headers, json=contract_data)
        print(f"Create contract response: {response.status_code}")
        if response.status_code in [200, 201]:
            data = response.json()
            TestMidwifeDuplicateContract.original_contract_id = data.get("contract_id")
            print(f"Created contract: {TestMidwifeDuplicateContract.original_contract_id}")
        else:
            print(f"Create contract failed: {response.text}")
    
    def test_05_duplicate_midwife_contract(self):
        """Test duplicating a midwife contract"""
        if not TestMidwifeDuplicateContract.original_contract_id:
            pytest.skip("No contract available to duplicate")
        
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        response = requests.post(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeDuplicateContract.original_contract_id}/duplicate",
            headers=headers
        )
        print(f"Duplicate contract response: {response.status_code}")
        print(f"Response: {response.text}")
        assert response.status_code == 200, f"Duplicate failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Contract duplicated successfully"
        assert "contract" in data
        
        # Verify duplicated contract properties
        new_contract = data["contract"]
        TestMidwifeDuplicateContract.duplicated_contract_id = new_contract["contract_id"]
        
        # Verify key fields
        assert new_contract["client_id"] is None, "Duplicated contract should have null client_id"
        assert "[Copy of" in new_contract["client_name"], "Duplicated contract should have [Copy of...] prefix"
        assert new_contract["status"] == "Draft", "Duplicated contract should be Draft status"
        assert new_contract["client_signature"] is None, "Duplicated contract should have no client signature"
        assert new_contract["midwife_signature"] is None, "Duplicated contract should have no midwife signature"
        
        print(f"Duplicated contract created: {new_contract['contract_id']}")
        print(f"Client name: {new_contract['client_name']}")
        print(f"Status: {new_contract['status']}")
        print(f"Total fee preserved: ${new_contract.get('total_fee', 0)}")
    
    def test_06_verify_duplicated_contract_in_list(self):
        """Verify duplicated contract appears in contracts list"""
        if not TestMidwifeDuplicateContract.duplicated_contract_id:
            pytest.skip("No duplicated contract to verify")
        
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        response = requests.get(f"{BASE_URL}/api/midwife/contracts", headers=headers)
        assert response.status_code == 200
        
        contracts = response.json()
        duplicated = next((c for c in contracts if c["contract_id"] == TestMidwifeDuplicateContract.duplicated_contract_id), None)
        
        assert duplicated is not None, "Duplicated contract should appear in list"
        assert "[Copy of" in duplicated["client_name"]
        print(f"Verified duplicated contract in list: {duplicated['contract_id']}")
    
    def test_07_duplicate_nonexistent_contract_fails(self):
        """Test that duplicating a non-existent contract fails with 404"""
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        response = requests.post(
            f"{BASE_URL}/api/midwife/contracts/nonexistent_contract_xyz/duplicate",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent contract, got {response.status_code}"
        print("Correctly returns 404 for non-existent contract")
    
    def test_08_cleanup_duplicated_contract(self):
        """Delete the duplicated contract (cleanup)"""
        if not TestMidwifeDuplicateContract.duplicated_contract_id:
            pytest.skip("No duplicated contract to cleanup")
        
        headers = {"Authorization": f"Bearer {TestMidwifeDuplicateContract.midwife_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeDuplicateContract.duplicated_contract_id}",
            headers=headers
        )
        print(f"Delete duplicated contract response: {response.status_code}")
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        print("Cleaned up duplicated contract")


class TestDoulaDuplicateContract:
    """Test doula contract duplicate functionality"""
    
    doula_token = None
    original_contract_id = None
    duplicated_contract_id = None
    test_client_id = None
    
    def test_01_doula_login(self):
        """Test doula login to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        print(f"Doula login response: {response.status_code}")
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        TestDoulaDuplicateContract.doula_token = data["session_token"]
        print(f"Doula logged in successfully, user_id: {data.get('user_id')}")
    
    def test_02_get_doula_clients(self):
        """Get doula clients"""
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        response = requests.get(f"{BASE_URL}/api/doula/clients", headers=headers)
        print(f"Get doula clients response: {response.status_code}")
        assert response.status_code == 200
        clients = response.json()
        print(f"Found {len(clients)} doula clients")
        if clients:
            TestDoulaDuplicateContract.test_client_id = clients[0]["client_id"]
            print(f"Using client_id: {TestDoulaDuplicateContract.test_client_id}")
    
    def test_03_get_doula_contracts(self):
        """Get existing doula contracts"""
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        response = requests.get(f"{BASE_URL}/api/doula/contracts", headers=headers)
        print(f"Get doula contracts response: {response.status_code}")
        assert response.status_code == 200
        contracts = response.json()
        print(f"Found {len(contracts)} doula contracts")
        if contracts:
            TestDoulaDuplicateContract.original_contract_id = contracts[0]["contract_id"]
            print(f"Will duplicate contract_id: {TestDoulaDuplicateContract.original_contract_id}")
            print(f"Original contract client_name: {contracts[0].get('client_name')}")
    
    def test_04_create_doula_client_if_needed(self):
        """Create a client if none exist"""
        if TestDoulaDuplicateContract.test_client_id:
            print("Client already exists, skipping creation")
            return
        
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        client_data = {
            "name": "Test Client for Doula Duplicate",
            "email": "testclient.doula@example.com",
            "edd": "2025-07-01",
            "planned_birth_setting": "Hospital"
        }
        response = requests.post(f"{BASE_URL}/api/doula/clients", headers=headers, json=client_data)
        print(f"Create client response: {response.status_code}")
        if response.status_code in [200, 201]:
            data = response.json()
            TestDoulaDuplicateContract.test_client_id = data.get("client_id")
            print(f"Created client: {TestDoulaDuplicateContract.test_client_id}")
    
    def test_05_create_doula_contract_if_needed(self):
        """Create a contract if none exist for testing duplicate"""
        if TestDoulaDuplicateContract.original_contract_id:
            print("Contract already exists, skipping creation")
            return
        
        if not TestDoulaDuplicateContract.test_client_id:
            pytest.skip("No client available to create contract")
        
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        contract_data = {
            "client_id": TestDoulaDuplicateContract.test_client_id,
            "client_name": "Test Client for Doula Duplicate",
            "estimated_due_date": "2025-07-01",
            "total_fee": 2500.00,
            "retainer_amount": 750.00,
            "remaining_balance": 1750.00,
            "prenatal_visit_description": "Three prenatal visits",
            "on_call_window_description": "38-42 weeks",
            "postpartum_visit_description": "Two postpartum visits"
        }
        response = requests.post(f"{BASE_URL}/api/doula/contracts", headers=headers, json=contract_data)
        print(f"Create doula contract response: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code in [200, 201]:
            data = response.json()
            TestDoulaDuplicateContract.original_contract_id = data.get("contract_id")
            print(f"Created doula contract: {TestDoulaDuplicateContract.original_contract_id}")
    
    def test_06_duplicate_doula_contract(self):
        """Test duplicating a doula contract"""
        if not TestDoulaDuplicateContract.original_contract_id:
            pytest.skip("No contract available to duplicate")
        
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        response = requests.post(
            f"{BASE_URL}/api/doula/contracts/{TestDoulaDuplicateContract.original_contract_id}/duplicate",
            headers=headers
        )
        print(f"Duplicate doula contract response: {response.status_code}")
        print(f"Response: {response.text}")
        assert response.status_code == 200, f"Duplicate failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Contract duplicated successfully"
        assert "contract" in data
        
        # Verify duplicated contract properties
        new_contract = data["contract"]
        TestDoulaDuplicateContract.duplicated_contract_id = new_contract["contract_id"]
        
        # Verify key fields
        assert new_contract["client_id"] is None, "Duplicated contract should have null client_id"
        assert "[Copy of" in new_contract["client_name"], "Duplicated contract should have [Copy of...] prefix"
        assert new_contract["status"] == "Draft", "Duplicated contract should be Draft status"
        assert new_contract["client_signature"] is None, "Duplicated contract should have no client signature"
        assert new_contract["doula_signature"] is None, "Duplicated contract should have no doula signature"
        
        print(f"Duplicated doula contract created: {new_contract['contract_id']}")
        print(f"Client name: {new_contract['client_name']}")
        print(f"Status: {new_contract['status']}")
        print(f"Total fee preserved: ${new_contract.get('total_fee', 0)}")
    
    def test_07_verify_duplicated_doula_contract_in_list(self):
        """Verify duplicated doula contract appears in contracts list"""
        if not TestDoulaDuplicateContract.duplicated_contract_id:
            pytest.skip("No duplicated contract to verify")
        
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        response = requests.get(f"{BASE_URL}/api/doula/contracts", headers=headers)
        assert response.status_code == 200
        
        contracts = response.json()
        duplicated = next((c for c in contracts if c["contract_id"] == TestDoulaDuplicateContract.duplicated_contract_id), None)
        
        assert duplicated is not None, "Duplicated contract should appear in list"
        assert "[Copy of" in duplicated["client_name"]
        print(f"Verified duplicated doula contract in list: {duplicated['contract_id']}")
    
    def test_08_doula_delete_contract_endpoint(self):
        """Test that doula delete contract endpoint works"""
        if not TestDoulaDuplicateContract.duplicated_contract_id:
            pytest.skip("No duplicated contract to delete")
        
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/doula/contracts/{TestDoulaDuplicateContract.duplicated_contract_id}",
            headers=headers
        )
        print(f"Delete doula contract response: {response.status_code}")
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        print("Successfully deleted duplicated doula contract")
    
    def test_09_duplicate_nonexistent_doula_contract_fails(self):
        """Test that duplicating a non-existent contract fails with 404"""
        headers = {"Authorization": f"Bearer {TestDoulaDuplicateContract.doula_token}"}
        response = requests.post(
            f"{BASE_URL}/api/doula/contracts/nonexistent_contract_xyz/duplicate",
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent contract, got {response.status_code}"
        print("Correctly returns 404 for non-existent doula contract")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
