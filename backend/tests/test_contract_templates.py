"""
Backend API Tests for Contract Templates Feature
Tests CRUD operations for contract templates for both Doula and Midwife users
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://cleanup-verify.preview.emergentagent.com')

# Test credentials
TEST_DOULA_EMAIL = "testdoula123@test.com"
TEST_DOULA_PASSWORD = "password123"

TEST_MIDWIFE_EMAIL = f"testmidwife_tmpl_{int(time.time())}@test.com"
TEST_MIDWIFE_PASSWORD = "password123"


class TestContractTemplatesDoula:
    """Contract Templates API tests for Doula users"""
    
    session_token = None
    template_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Login as doula before tests"""
        if TestContractTemplatesDoula.session_token is None:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": TEST_DOULA_EMAIL, "password": TEST_DOULA_PASSWORD}
            )
            if response.status_code == 200:
                TestContractTemplatesDoula.session_token = response.json().get("session_token")
            else:
                pytest.skip(f"Failed to login as doula: {response.status_code}")
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestContractTemplatesDoula.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_get_templates_empty(self):
        """Test GET /api/contract-templates returns empty or existing list"""
        response = requests.get(
            f"{BASE_URL}/api/contract-templates",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/contract-templates returned {len(data)} templates")
    
    def test_02_create_template(self):
        """Test POST /api/contract-templates creates a doula template"""
        payload = {
            "template_name": "TEST Standard Birth Doula Package",
            "template_type": "doula",
            "description": "Standard package for birth doula services",
            "is_default": False,
            "total_fee": 2000.00,
            "retainer_amount": 500.00,
            "prenatal_visit_description": "Two 1-hour prenatal visits",
            "on_call_window_description": "38 to 42 weeks",
            "postpartum_visit_description": "One 2-hour postpartum visit"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contract-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "template_id" in data, "Response should include template_id"
        assert data["template_name"] == payload["template_name"]
        assert data["template_type"] == "doula"
        assert data["template_data"]["total_fee"] == payload["total_fee"]
        assert data["template_data"]["retainer_amount"] == payload["retainer_amount"]
        
        TestContractTemplatesDoula.template_id = data["template_id"]
        print(f"PASS: Created doula template {data['template_id']}")
    
    def test_03_get_template_by_id(self):
        """Test GET /api/contract-templates/{id} returns specific template"""
        assert TestContractTemplatesDoula.template_id, "Need template_id from create test"
        
        response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["template_id"] == TestContractTemplatesDoula.template_id
        print(f"PASS: Retrieved template {data['template_id']}")
    
    def test_04_update_template(self):
        """Test PUT /api/contract-templates/{id} updates template"""
        assert TestContractTemplatesDoula.template_id, "Need template_id from create test"
        
        payload = {
            "template_name": "TEST Updated Birth Doula Package",
            "template_type": "doula",
            "description": "Updated description",
            "is_default": False,
            "total_fee": 2500.00,
            "retainer_amount": 750.00,
            "prenatal_visit_description": "Three 1-hour prenatal visits",
            "on_call_window_description": "37 to 42 weeks",
            "postpartum_visit_description": "Two 2-hour postpartum visits"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}",
            headers=self.get_headers()
        )
        data = get_response.json()
        assert data["template_name"] == payload["template_name"]
        assert data["template_data"]["total_fee"] == payload["total_fee"]
        print(f"PASS: Updated template {TestContractTemplatesDoula.template_id}")
    
    def test_05_set_default_template(self):
        """Test POST /api/contract-templates/{id}/set-default sets template as default"""
        assert TestContractTemplatesDoula.template_id, "Need template_id from create test"
        
        response = requests.post(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}/set-default",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's now default
        get_response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}",
            headers=self.get_headers()
        )
        data = get_response.json()
        assert data["is_default"] == True, "Template should be set as default"
        print(f"PASS: Set template as default")
    
    def test_06_delete_template(self):
        """Test DELETE /api/contract-templates/{id} deletes template"""
        assert TestContractTemplatesDoula.template_id, "Need template_id from create test"
        
        response = requests.delete(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesDoula.template_id}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 404, "Deleted template should return 404"
        print(f"PASS: Deleted template {TestContractTemplatesDoula.template_id}")
    
    def test_07_create_template_wrong_type(self):
        """Test POST /api/contract-templates rejects wrong template type"""
        payload = {
            "template_name": "Wrong Type Template",
            "template_type": "midwife",  # Wrong type for doula
            "description": "This should fail",
            "is_default": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contract-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Rejected template with wrong type")


class TestContractTemplatesMidwife:
    """Contract Templates API tests for Midwife users"""
    
    session_token = None
    template_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Register and login as midwife before tests"""
        if TestContractTemplatesMidwife.session_token is None:
            # Register new midwife
            register_response = requests.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "email": TEST_MIDWIFE_EMAIL,
                    "password": TEST_MIDWIFE_PASSWORD,
                    "full_name": "Test Midwife Templates",
                    "role": "MIDWIFE"
                }
            )
            if register_response.status_code == 200:
                TestContractTemplatesMidwife.session_token = register_response.json().get("session_token")
            elif register_response.status_code == 400:
                # Already exists, try login
                login_response = requests.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"email": TEST_MIDWIFE_EMAIL, "password": TEST_MIDWIFE_PASSWORD}
                )
                if login_response.status_code == 200:
                    TestContractTemplatesMidwife.session_token = login_response.json().get("session_token")
                else:
                    pytest.skip(f"Failed to login as midwife: {login_response.status_code}")
            else:
                pytest.skip(f"Failed to register midwife: {register_response.status_code}")
    
    def get_headers(self):
        return {
            "Authorization": f"Bearer {TestContractTemplatesMidwife.session_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_get_templates_empty(self):
        """Test GET /api/contract-templates for midwife"""
        response = requests.get(
            f"{BASE_URL}/api/contract-templates",
            headers=self.get_headers()
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/contract-templates (midwife) returned {len(data)} templates")
    
    def test_02_create_midwife_template(self):
        """Test POST /api/contract-templates creates a midwife template"""
        payload = {
            "template_name": "TEST Standard Midwifery Package",
            "template_type": "midwife",
            "description": "Standard midwifery services package",
            "is_default": False,
            "total_fee": 5000.00,
            "retainer_amount": 1000.00,
            "planned_birth_location": "Home birth",
            "scope_description": "Full prenatal, birth, and postpartum care",
            "on_call_window_description": "37 to 42 weeks"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contract-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "template_id" in data, "Response should include template_id"
        assert data["template_name"] == payload["template_name"]
        assert data["template_type"] == "midwife"
        assert data["template_data"]["total_fee"] == payload["total_fee"]
        
        TestContractTemplatesMidwife.template_id = data["template_id"]
        print(f"PASS: Created midwife template {data['template_id']}")
    
    def test_03_get_template_by_id(self):
        """Test GET /api/contract-templates/{id} for midwife"""
        assert TestContractTemplatesMidwife.template_id, "Need template_id from create test"
        
        response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesMidwife.template_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["template_id"] == TestContractTemplatesMidwife.template_id
        print(f"PASS: Retrieved midwife template {data['template_id']}")
    
    def test_04_update_midwife_template(self):
        """Test PUT /api/contract-templates/{id} for midwife"""
        assert TestContractTemplatesMidwife.template_id, "Need template_id from create test"
        
        payload = {
            "template_name": "TEST Updated Midwifery Package",
            "template_type": "midwife",
            "description": "Updated midwifery package",
            "is_default": True,
            "total_fee": 6000.00,
            "retainer_amount": 1500.00,
            "planned_birth_location": "Birth center",
            "scope_description": "Comprehensive care package",
            "on_call_window_description": "36 to 42 weeks"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesMidwife.template_id}",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesMidwife.template_id}",
            headers=self.get_headers()
        )
        data = get_response.json()
        assert data["template_name"] == payload["template_name"]
        assert data["is_default"] == True
        print(f"PASS: Updated midwife template {TestContractTemplatesMidwife.template_id}")
    
    def test_05_delete_midwife_template(self):
        """Test DELETE /api/contract-templates/{id} for midwife"""
        assert TestContractTemplatesMidwife.template_id, "Need template_id from create test"
        
        response = requests.delete(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesMidwife.template_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/contract-templates/{TestContractTemplatesMidwife.template_id}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 404, "Deleted template should return 404"
        print(f"PASS: Deleted midwife template {TestContractTemplatesMidwife.template_id}")
    
    def test_06_midwife_wrong_type(self):
        """Test POST /api/contract-templates rejects doula type for midwife"""
        payload = {
            "template_name": "Wrong Type Template",
            "template_type": "doula",  # Wrong type for midwife
            "description": "This should fail",
            "is_default": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/contract-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Rejected doula template type for midwife user")


class TestContractTemplatesAuth:
    """Test authentication requirements for contract templates"""
    
    def test_01_get_templates_no_auth(self):
        """Test GET /api/contract-templates requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contract-templates")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: GET /api/contract-templates requires auth")
    
    def test_02_create_template_no_auth(self):
        """Test POST /api/contract-templates requires authentication"""
        payload = {
            "template_name": "Unauthorized Template",
            "template_type": "doula",
            "is_default": False
        }
        response = requests.post(
            f"{BASE_URL}/api/contract-templates",
            json=payload
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: POST /api/contract-templates requires auth")
    
    def test_03_mom_cannot_access_templates(self):
        """Test that MOM role cannot access contract templates"""
        # Register a mom user
        mom_email = f"testmom_tmpl_{int(time.time())}@test.com"
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": mom_email,
                "password": "password123",
                "full_name": "Test Mom",
                "role": "MOM"
            }
        )
        
        if register_response.status_code != 200:
            pytest.skip("Could not register test mom user")
        
        session_token = register_response.json().get("session_token")
        headers = {"Authorization": f"Bearer {session_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contract-templates",
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for MOM role, got {response.status_code}"
        print(f"PASS: MOM role cannot access contract templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
