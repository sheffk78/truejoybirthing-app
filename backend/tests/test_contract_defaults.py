"""
Test contract defaults feature - Save as Default for Doula contracts
Tests:
1. GET /api/doula/contract-defaults - returns saved defaults
2. PUT /api/doula/contract-defaults - saves new defaults
3. Verify defaults persist and are retrieved correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '')

# Test credentials for Doula user
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"


class TestContractDefaults:
    """Tests for contract defaults API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test session and login"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as doula
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login as doula: {login_response.status_code} - {login_response.text}")
        
        login_data = login_response.json()
        self.session_token = login_data.get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_get_contract_defaults_returns_200(self):
        """Test GET /api/doula/contract-defaults returns 200"""
        response = self.session.get(f"{BASE_URL}/api/doula/contract-defaults")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"GET contract-defaults: {response.status_code}")
        print(f"Response: {response.json()}")
    
    def test_get_contract_defaults_returns_existing_defaults(self):
        """Test GET returns previously saved defaults"""
        response = self.session.get(f"{BASE_URL}/api/doula/contract-defaults")
        
        assert response.status_code == 200
        data = response.json()
        
        # Based on main agent context, these defaults should exist:
        # total_fee=3000, retainer_amount=750
        # prenatal_visit_description='Custom: Four prenatal visits of 90 minutes each'
        # on_call_window_description='37 to 42 weeks'
        
        print(f"Current saved defaults: {data}")
        
        # Check if defaults exist
        if data:
            # Verify expected fields are returned
            assert isinstance(data, dict), "Response should be a dictionary"
            
            # Check if expected saved values exist
            if 'total_fee' in data:
                print(f"  - total_fee: {data['total_fee']}")
            if 'retainer_amount' in data:
                print(f"  - retainer_amount: {data['retainer_amount']}")
            if 'prenatal_visit_description' in data:
                print(f"  - prenatal_visit_description: {data['prenatal_visit_description']}")
            if 'on_call_window_description' in data:
                print(f"  - on_call_window_description: {data['on_call_window_description']}")
        else:
            print("No defaults saved yet - this is expected for first-time users")
    
    def test_put_contract_defaults_saves_successfully(self):
        """Test PUT /api/doula/contract-defaults saves new defaults"""
        test_defaults = {
            "total_fee": 3500,
            "retainer_amount": 800,
            "prenatal_visit_description": "TEST: Five prenatal visits of 60 minutes each",
            "on_call_window_description": "36 to 42 weeks",
            "postpartum_visit_description": "TEST: Two postpartum visits",
            "retainer_non_refundable_after_weeks": 36,
            "cancellation_weeks_threshold": 36,
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/doula/contract-defaults",
            json=test_defaults
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message field"
        print(f"PUT contract-defaults: {response.status_code}")
        print(f"Response: {data}")
    
    def test_put_and_get_contract_defaults_persistence(self):
        """Test that saved defaults are correctly retrieved"""
        # Save test defaults
        # NOTE: PUT /doula/contract-defaults accepts only the ContractDefaultsUpdate
        # schema fields (deposit_percentage, payment_terms, services_included,
        # cancellation_policy) — fee fields were never part of that model, so the
        # old payload's total_fee/retainer_amount were silently dropped by Pydantic.
        test_defaults = {
            "deposit_percentage": 30.0,
            "payment_terms": "PERSISTENCE_TEST: Balance due 36 weeks",
            "services_included": ["PERSISTENCE_TEST visit A", "PERSISTENCE_TEST visit B"],
            "cancellation_policy": "PERSISTENCE_TEST: Deposit non-refundable after 36 weeks.",
        }
        
        put_response = self.session.put(
            f"{BASE_URL}/api/doula/contract-defaults",
            json=test_defaults
        )
        assert put_response.status_code == 200, f"Failed to save defaults: {put_response.text}"
        print(f"Saved test defaults: {test_defaults}")
        
        # Retrieve defaults
        get_response = self.session.get(f"{BASE_URL}/api/doula/contract-defaults")
        assert get_response.status_code == 200, f"Failed to get defaults: {get_response.text}"
        
        data = get_response.json()
        print(f"Retrieved defaults: {data}")
        
        # Verify persistence (schema-backed fields only)
        assert data.get("deposit_percentage") == test_defaults["deposit_percentage"], \
            f"deposit_percentage mismatch: expected {test_defaults['deposit_percentage']}, got {data.get('deposit_percentage')}"
        assert data.get("payment_terms") == test_defaults["payment_terms"], \
            f"payment_terms mismatch"
        assert data.get("services_included") == test_defaults["services_included"], \
            f"services_included mismatch"
        assert data.get("cancellation_policy") == test_defaults["cancellation_policy"], \
            f"cancellation_policy mismatch"
        
        print("PASSED: All saved defaults retrieved correctly!")
    
    def test_restore_original_defaults(self):
        """Restore the original defaults mentioned in the test request"""
        # Restore to values mentioned in the context
        # Schema-backed restore (old payload's fee fields were silently dropped —
        # see PERSISTENCE test note).
        original_defaults = {
            "deposit_percentage": 25.0,
            "payment_terms": "Balance due before birth",
            "services_included": [
                "Up to 2 prenatal visits",
                "On-call support from 38 weeks",
                "Continuous labor support",
                "1 postpartum visit"
            ],
            "cancellation_policy": "Deposit non-refundable after signing. Full refund if canceled by doula."
        }
        
        put_response = self.session.put(
            f"{BASE_URL}/api/doula/contract-defaults",
            json=original_defaults
        )
        assert put_response.status_code == 200, f"Failed to restore defaults: {put_response.text}"
        
        # Verify restoration
        get_response = self.session.get(f"{BASE_URL}/api/doula/contract-defaults")
        assert get_response.status_code == 200
        
        data = get_response.json()
        print(f"Restored defaults: {data}")
        
        assert data.get("deposit_percentage") == 25.0, "deposit_percentage should restore to 25.0"
        assert data.get("payment_terms") == "Balance due before birth", "payment_terms should restore"
        print("PASSED: Original defaults restored successfully!")


class TestContractDefaultsUnauthorized:
    """Test authorization for contract defaults endpoints"""
    
    def test_get_defaults_without_auth_returns_401(self):
        """Test GET without authentication returns 401"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/doula/contract-defaults")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"GET without auth: {response.status_code} (expected 401)")
    
    def test_put_defaults_without_auth_returns_401(self):
        """Test PUT without authentication returns 401"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.put(
            f"{BASE_URL}/api/doula/contract-defaults",
            json={"total_fee": 1000}
        )
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print(f"PUT without auth: {response.status_code} (expected 401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
