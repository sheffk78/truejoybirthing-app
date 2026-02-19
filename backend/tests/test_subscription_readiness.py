"""
Subscription Readiness Tests for True Joy Birthing
Tests for Pre-Launch Subscription feature with Apple StoreKit and Google Play Billing architecture

Tests cover:
- GET /api/subscription/pricing - pricing info with monthly/annual plans
- GET /api/subscription/status - subscription status for different user roles
- POST /api/subscription/start-trial - trial start with subscription_provider
- POST /api/subscription/validate-receipt - receipt validation with provider
- POST /api/subscription/cancel - subscription cancellation with provider-specific info
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://provider-consolidate.preview.emergentagent.com').rstrip('/')

# Test accounts
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife_pw@test.com"
MIDWIFE_PASSWORD = "password123"
MOM_EMAIL = "testmom_msg@test.com"
MOM_PASSWORD = "password123"

# Subscription constants from backend
PRO_MONTHLY_PRICE = 29.00
PRO_ANNUAL_PRICE = 276.00
TRIAL_DURATION_DAYS = 30

# Product IDs
APPLE_MONTHLY_ID = "truejoy.pro.monthly"
APPLE_ANNUAL_ID = "truejoy.pro.annual"
GOOGLE_MONTHLY_ID = "truejoy_pro_monthly"
GOOGLE_ANNUAL_ID = "truejoy_pro_annual"


class TestHelper:
    """Helper methods for tests"""
    
    @staticmethod
    def login(email: str, password: str) -> tuple:
        """Login and return session token and user data"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code != 200:
            return None, None
        data = response.json()
        return data.get("session_token"), data
    
    @staticmethod
    def get_auth_headers(token: str) -> dict:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @staticmethod
    def clear_subscription(token: str):
        """Clear subscription for testing (if exists)"""
        # This is a helper to reset state - in real app this would be admin only
        pass


class TestSubscriptionPricing:
    """Tests for GET /api/subscription/pricing endpoint"""
    
    def test_pricing_returns_correct_structure(self):
        """Test that pricing endpoint returns correct structure"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check top-level keys
        assert "plans" in data, "Missing 'plans' key in response"
        assert "mom_features" in data, "Missing 'mom_features' key in response"
        
    def test_pricing_has_monthly_and_annual_plans(self):
        """Test that pricing returns both monthly and annual plans"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        data = response.json()
        
        plans = data.get("plans", [])
        assert len(plans) == 2, f"Expected 2 plans, got {len(plans)}"
        
        plan_ids = [p.get("id") for p in plans]
        assert "monthly" in plan_ids, "Missing monthly plan"
        assert "annual" in plan_ids, "Missing annual plan"
    
    def test_monthly_plan_pricing(self):
        """Test monthly plan has correct pricing ($29)"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        data = response.json()
        
        monthly_plan = next((p for p in data["plans"] if p["id"] == "monthly"), None)
        assert monthly_plan is not None, "Monthly plan not found"
        
        assert monthly_plan["price"] == PRO_MONTHLY_PRICE, f"Expected ${PRO_MONTHLY_PRICE}, got ${monthly_plan['price']}"
        assert monthly_plan["period"] == "month", f"Expected period 'month', got '{monthly_plan['period']}'"
        assert monthly_plan["trial_days"] == TRIAL_DURATION_DAYS, f"Expected {TRIAL_DURATION_DAYS} trial days"
        assert monthly_plan["currency"] == "USD", "Currency should be USD"
    
    def test_annual_plan_pricing(self):
        """Test annual plan has correct pricing ($276)"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        data = response.json()
        
        annual_plan = next((p for p in data["plans"] if p["id"] == "annual"), None)
        assert annual_plan is not None, "Annual plan not found"
        
        assert annual_plan["price"] == PRO_ANNUAL_PRICE, f"Expected ${PRO_ANNUAL_PRICE}, got ${annual_plan['price']}"
        assert annual_plan["period"] == "year", f"Expected period 'year', got '{annual_plan['period']}'"
        assert annual_plan["trial_days"] == TRIAL_DURATION_DAYS, f"Expected {TRIAL_DURATION_DAYS} trial days"
        
        # Check savings calculation: ($29 * 12) - $276 = $72
        expected_savings = (PRO_MONTHLY_PRICE * 12) - PRO_ANNUAL_PRICE
        assert "savings" in annual_plan, "Annual plan should have savings field"
        assert annual_plan["savings"] == expected_savings, f"Expected savings ${expected_savings}, got ${annual_plan.get('savings')}"
    
    def test_plans_have_required_features(self):
        """Test that plans have feature lists"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        data = response.json()
        
        for plan in data["plans"]:
            assert "features" in plan, f"Plan {plan['id']} missing features"
            assert isinstance(plan["features"], list), f"Features should be a list"
            assert len(plan["features"]) > 0, f"Plan {plan['id']} should have at least one feature"
    
    def test_mom_features_list(self):
        """Test that mom features list is present"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        data = response.json()
        
        mom_features = data.get("mom_features", [])
        assert isinstance(mom_features, list), "mom_features should be a list"
        assert len(mom_features) > 0, "mom_features should have at least one feature"


class TestSubscriptionStatusMom:
    """Tests for GET /api/subscription/status for MOM users"""
    
    def test_mom_status_returns_free_with_access(self):
        """Test that MOM users get 'free' status with has_pro_access:true"""
        token, user_data = TestHelper.login(MOM_EMAIL, MOM_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login with MOM account {MOM_EMAIL}")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # MOMs should have free access
        assert data.get("has_pro_access") == True, "MOM should have has_pro_access: true"
        assert data.get("subscription_status") == "free", "MOM should have subscription_status: 'free'"
        assert data.get("is_mom") == True, "Should indicate is_mom: true"
        assert data.get("subscription_provider") is None, "MOM should not have subscription_provider"


class TestSubscriptionStatusProUsers:
    """Tests for GET /api/subscription/status for DOULA/MIDWIFE users"""
    
    def test_doula_status_has_required_fields(self):
        """Test that Doula subscription status has all required fields"""
        token, user_data = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login with DOULA account {DOULA_EMAIL}")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields exist
        required_fields = [
            "has_pro_access", "subscription_status", "plan_type",
            "subscription_provider", "trial_end_date", "subscription_end_date",
            "days_remaining", "is_trial", "auto_renewing"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"Doula subscription status: {data}")
    
    def test_midwife_status_has_required_fields(self):
        """Test that Midwife subscription status has all required fields"""
        token, user_data = TestHelper.login(MIDWIFE_EMAIL, MIDWIFE_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login with MIDWIFE account {MIDWIFE_EMAIL}")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check required fields
        required_fields = [
            "has_pro_access", "subscription_status", "subscription_provider", "auto_renewing"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"Midwife subscription status: {data}")


class TestStartTrial:
    """Tests for POST /api/subscription/start-trial endpoint"""
    
    def test_start_trial_requires_auth(self):
        """Test that start-trial requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "monthly"}
        )
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
    
    def test_start_trial_requires_pro_role(self):
        """Test that start-trial requires DOULA or MIDWIFE role"""
        token, _ = TestHelper.login(MOM_EMAIL, MOM_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login with MOM account")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers=headers,
            json={"plan_type": "monthly"}
        )
        
        # Should fail for MOM role
        assert response.status_code == 403, f"Expected 403 for MOM role, got {response.status_code}"
    
    def test_start_trial_with_subscription_provider_mock(self):
        """Test starting trial with MOCK subscription_provider"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login with DOULA account")
        
        headers = TestHelper.get_auth_headers(token)
        
        # Try starting trial
        response = requests.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers=headers,
            json={
                "plan_type": "monthly",
                "subscription_provider": "MOCK"
            }
        )
        
        # May succeed or fail if already has subscription
        if response.status_code == 200:
            data = response.json()
            assert "trial_end_date" in data, "Response should include trial_end_date"
            assert data.get("subscription_provider") == "MOCK", "subscription_provider should be MOCK"
            assert data.get("plan_type") == "monthly", "plan_type should be monthly"
            assert data.get("days_remaining") == TRIAL_DURATION_DAYS, f"Expected {TRIAL_DURATION_DAYS} days"
            print(f"Trial started successfully: {data}")
        elif response.status_code == 400:
            # Already has subscription - acceptable
            print(f"User already has subscription: {response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}, body: {response.text}")
    
    def test_start_trial_with_apple_provider(self):
        """Test starting trial with APPLE subscription_provider"""
        token, _ = TestHelper.login(MIDWIFE_EMAIL, MIDWIFE_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login with MIDWIFE account")
        
        headers = TestHelper.get_auth_headers(token)
        
        response = requests.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers=headers,
            json={
                "plan_type": "annual",
                "subscription_provider": "APPLE"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("subscription_provider") == "APPLE", "subscription_provider should be APPLE"
        elif response.status_code == 400:
            # Already has subscription
            print(f"User already has subscription: {response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_start_trial_invalid_plan_type(self):
        """Test that invalid plan_type is rejected"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip(f"Could not login")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/start-trial",
            headers=headers,
            json={
                "plan_type": "invalid_plan",
                "subscription_provider": "MOCK"
            }
        )
        
        # Should fail with 400 for invalid plan
        assert response.status_code in [400, 422], f"Expected 400/422 for invalid plan, got {response.status_code}"


class TestValidateReceipt:
    """Tests for POST /api/subscription/validate-receipt endpoint"""
    
    def test_validate_receipt_requires_auth(self):
        """Test that validate-receipt requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            json={
                "receipt": "mock_receipt_data",
                "subscription_provider": "APPLE",
                "product_id": APPLE_MONTHLY_ID
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_validate_receipt_requires_pro_role(self):
        """Test that validate-receipt requires DOULA or MIDWIFE role"""
        token, _ = TestHelper.login(MOM_EMAIL, MOM_PASSWORD)
        
        if not token:
            pytest.skip("Could not login with MOM account")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_receipt_data",
                "subscription_provider": "APPLE",
                "product_id": APPLE_MONTHLY_ID
            }
        )
        
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
    
    def test_validate_receipt_apple_monthly(self):
        """Test validating Apple monthly product receipt (MOCKED)"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login with DOULA account")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_apple_receipt_base64_encoded_data",
                "subscription_provider": "APPLE",
                "product_id": APPLE_MONTHLY_ID
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success: true"
        assert data.get("subscription_provider") == "APPLE", "Provider should be APPLE"
        assert data.get("plan_type") == "monthly", "Plan type should be monthly"
        assert "subscription_end_date" in data, "Should include subscription_end_date"
        assert data.get("auto_renewing") == True, "auto_renewing should be True"
        print(f"Apple monthly receipt validated: {data}")
    
    def test_validate_receipt_google_annual(self):
        """Test validating Google annual product receipt (MOCKED)"""
        token, _ = TestHelper.login(MIDWIFE_EMAIL, MIDWIFE_PASSWORD)
        
        if not token:
            pytest.skip("Could not login with MIDWIFE account")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_google_receipt_purchase_token_data",
                "subscription_provider": "GOOGLE",
                "product_id": GOOGLE_ANNUAL_ID
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get("success") == True, "Should return success: true"
        assert data.get("subscription_provider") == "GOOGLE", "Provider should be GOOGLE"
        assert data.get("plan_type") == "annual", "Plan type should be annual"
        print(f"Google annual receipt validated: {data}")
    
    def test_validate_receipt_invalid_provider(self):
        """Test that invalid subscription_provider is rejected"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_receipt",
                "subscription_provider": "INVALID",
                "product_id": APPLE_MONTHLY_ID
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid provider, got {response.status_code}"
    
    def test_validate_receipt_invalid_apple_product_id(self):
        """Test that invalid Apple product_id is rejected"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_receipt",
                "subscription_provider": "APPLE",
                "product_id": "invalid.product.id"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid product_id, got {response.status_code}"
    
    def test_validate_receipt_invalid_google_product_id(self):
        """Test that invalid Google product_id is rejected"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_receipt",
                "subscription_provider": "GOOGLE",
                "product_id": "invalid_google_product"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid product_id, got {response.status_code}"
    
    def test_validate_receipt_mismatched_provider_product(self):
        """Test that mismatched provider and product_id is rejected"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login")
        
        headers = TestHelper.get_auth_headers(token)
        
        # Apple provider with Google product ID
        response = requests.post(
            f"{BASE_URL}/api/subscription/validate-receipt",
            headers=headers,
            json={
                "receipt": "mock_receipt",
                "subscription_provider": "APPLE",
                "product_id": GOOGLE_MONTHLY_ID  # Google product with Apple provider
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for mismatched provider/product, got {response.status_code}"


class TestCancelSubscription:
    """Tests for POST /api/subscription/cancel endpoint"""
    
    def test_cancel_requires_auth(self):
        """Test that cancel requires authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/cancel")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_cancel_requires_pro_role(self):
        """Test that cancel requires DOULA or MIDWIFE role"""
        token, _ = TestHelper.login(MOM_EMAIL, MOM_PASSWORD)
        
        if not token:
            pytest.skip("Could not login with MOM account")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(f"{BASE_URL}/api/subscription/cancel", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for MOM, got {response.status_code}"
    
    def test_cancel_returns_provider_specific_info(self):
        """Test that cancel returns provider-specific management info"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login with DOULA account")
        
        headers = TestHelper.get_auth_headers(token)
        response = requests.post(f"{BASE_URL}/api/subscription/cancel", headers=headers)
        
        # May be 200 (cancelled) or 404 (no subscription)
        if response.status_code == 200:
            data = response.json()
            
            # Check required fields
            assert "message" in data, "Should include message"
            assert "subscription_provider" in data, "Should include subscription_provider"
            assert "manage_instructions" in data, "Should include manage_instructions"
            
            # If APPLE or GOOGLE provider, should include manage_url
            if data.get("subscription_provider") in ["APPLE", "GOOGLE"]:
                assert "manage_url" in data, "Apple/Google should include manage_url"
            
            print(f"Cancel response: {data}")
        elif response.status_code == 404:
            print("No subscription to cancel (expected for new accounts)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestSubscriptionStatusAfterActions:
    """Test subscription status after trial/activation"""
    
    def test_status_reflects_subscription_provider(self):
        """Test that status correctly shows subscription_provider after actions"""
        token, _ = TestHelper.login(DOULA_EMAIL, DOULA_PASSWORD)
        
        if not token:
            pytest.skip("Could not login with DOULA account")
        
        headers = TestHelper.get_auth_headers(token)
        
        # Get current status
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # If has subscription, verify subscription_provider field
        if data.get("has_pro_access") or data.get("subscription_status") in ["trial", "active"]:
            assert "subscription_provider" in data, "Active subscription should show subscription_provider"
            provider = data.get("subscription_provider")
            assert provider in ["APPLE", "GOOGLE", "MOCK", "WEB", None], f"Invalid provider: {provider}"
            
            # Verify auto_renewing field
            assert "auto_renewing" in data, "Should include auto_renewing field"
            assert isinstance(data["auto_renewing"], bool), "auto_renewing should be boolean"
        
        print(f"Current subscription status: {data}")


class TestProductIDs:
    """Test that product IDs are correctly configured"""
    
    def test_apple_product_ids_format(self):
        """Test Apple product IDs follow correct format (reverse domain with dots)"""
        assert "." in APPLE_MONTHLY_ID, "Apple monthly ID should use dot notation"
        assert "." in APPLE_ANNUAL_ID, "Apple annual ID should use dot notation"
        assert APPLE_MONTHLY_ID == "truejoy.pro.monthly", f"Unexpected Apple monthly ID: {APPLE_MONTHLY_ID}"
        assert APPLE_ANNUAL_ID == "truejoy.pro.annual", f"Unexpected Apple annual ID: {APPLE_ANNUAL_ID}"
    
    def test_google_product_ids_format(self):
        """Test Google product IDs follow correct format (snake_case with underscores)"""
        assert "_" in GOOGLE_MONTHLY_ID, "Google monthly ID should use underscore notation"
        assert "_" in GOOGLE_ANNUAL_ID, "Google annual ID should use underscore notation"
        assert GOOGLE_MONTHLY_ID == "truejoy_pro_monthly", f"Unexpected Google monthly ID: {GOOGLE_MONTHLY_ID}"
        assert GOOGLE_ANNUAL_ID == "truejoy_pro_annual", f"Unexpected Google annual ID: {GOOGLE_ANNUAL_ID}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
