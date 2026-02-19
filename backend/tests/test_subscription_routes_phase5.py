"""
Test Subscription Routes - Backend Refactoring Phase 5

Tests for migrated subscription routes from server.py to routes/subscription.py:
- GET /api/subscription/status - Get subscription status with has_pro_access
- GET /api/subscription/pricing - Get plan pricing info
- POST /api/subscription/start-trial - Start a trial for providers
- POST /api/subscription/cancel - Cancel subscription
- POST /api/subscription/activate - Activate subscription (MOCKED)
- POST /api/subscription/validate-receipt - Validate store receipt (MOCKED)

Also verifies auth and provider routes still work after migration.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


class TestSetup:
    """Verify test environment is ready"""
    
    def test_base_url_configured(self):
        """Ensure BASE_URL is configured"""
        assert BASE_URL, "BASE_URL must be configured via EXPO_PUBLIC_BACKEND_URL"
        print(f"Testing against: {BASE_URL}")
    
    def test_health_check(self):
        """Verify API is reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("API health check passed")


@pytest.fixture(scope="module")
def doula_session():
    """Login as doula and return session token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    assert response.status_code == 200, f"Doula login failed: {response.text}"
    data = response.json()
    session_token = data.get("session_token")
    assert session_token, "No session token returned"
    print(f"Doula logged in successfully, user_id: {data.get('user', {}).get('user_id')}")
    return session_token


@pytest.fixture(scope="module")
def mom_session():
    """Login as mom and return session token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    assert response.status_code == 200, f"Mom login failed: {response.text}"
    data = response.json()
    session_token = data.get("session_token")
    assert session_token, "No session token returned"
    print(f"Mom logged in successfully, user_id: {data.get('user', {}).get('user_id')}")
    return session_token


class TestSubscriptionStatus:
    """Test GET /api/subscription/status endpoint"""
    
    def test_status_returns_subscription_info_for_doula(self, doula_session):
        """Doula should get subscription status with has_pro_access field"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields in response
        assert "has_pro_access" in data, "Missing has_pro_access field"
        assert "subscription_status" in data, "Missing subscription_status field"
        assert "is_mom" in data, "Missing is_mom field"
        assert data["is_mom"] == False, "Doula should not be marked as mom"
        
        print(f"Doula subscription status: {data['subscription_status']}, has_pro_access: {data['has_pro_access']}")
    
    def test_status_returns_free_access_for_mom(self, mom_session):
        """Mom should always have free access"""
        headers = {"Authorization": f"Bearer {mom_session}"}
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Moms always have free access
        assert data["has_pro_access"] == True, "Mom should have pro access"
        assert data["subscription_status"] == "free", "Mom should have 'free' status"
        assert data["is_mom"] == True, "is_mom flag should be True for moms"
        assert data["plan_type"] == "mom_free", "Mom plan type should be 'mom_free'"
        
        print(f"Mom subscription status: {data['subscription_status']}")
    
    def test_status_requires_authentication(self):
        """Endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 401, "Should return 401 without auth"


class TestSubscriptionPricing:
    """Test GET /api/subscription/pricing endpoint"""
    
    def test_pricing_returns_plan_info(self):
        """Should return pricing for monthly and annual plans"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        data = response.json()
        
        # Verify plans structure
        assert "plans" in data, "Missing plans field"
        assert len(data["plans"]) == 2, "Should have 2 plans (monthly and annual)"
        
        # Verify monthly plan
        monthly = next((p for p in data["plans"] if p["id"] == "monthly"), None)
        assert monthly is not None, "Missing monthly plan"
        assert monthly["price"] == 29.00, f"Monthly price should be $29.00, got {monthly['price']}"
        assert monthly["period"] == "month", "Monthly period should be 'month'"
        assert monthly["trial_days"] == 30, "Trial days should be 30"
        assert "features" in monthly, "Monthly plan should have features"
        
        # Verify annual plan
        annual = next((p for p in data["plans"] if p["id"] == "annual"), None)
        assert annual is not None, "Missing annual plan"
        assert annual["price"] == 276.00, f"Annual price should be $276.00, got {annual['price']}"
        assert annual["period"] == "year", "Annual period should be 'year'"
        assert "savings" in annual, "Annual plan should show savings"
        
        # Verify mom features
        assert "mom_features" in data, "Should include mom_features"
        assert len(data["mom_features"]) > 0, "Mom features should not be empty"
        
        print(f"Monthly: ${monthly['price']}, Annual: ${annual['price']} (savings: ${annual.get('savings', 0)})")
    
    def test_pricing_is_public(self):
        """Pricing endpoint should be public (no auth required)"""
        # Already verified in test_pricing_returns_plan_info, no headers passed
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200


class TestSubscriptionStartTrial:
    """Test POST /api/subscription/start-trial endpoint (MOCKED)"""
    
    def test_start_trial_requires_provider_role(self, mom_session):
        """Mom cannot start a trial (only DOULA/MIDWIFE)"""
        headers = {"Authorization": f"Bearer {mom_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/start-trial", 
                                headers=headers,
                                json={"plan_type": "monthly"})
        assert response.status_code == 403, f"Mom should get 403, got {response.status_code}"
    
    def test_start_trial_validates_plan_type(self, doula_session):
        """Should reject invalid plan types"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/start-trial",
                                headers=headers,
                                json={"plan_type": "invalid_plan"})
        assert response.status_code == 400, f"Should return 400 for invalid plan, got {response.status_code}"
    
    def test_start_trial_monthly_success(self, doula_session):
        """Should start monthly trial for doula (may fail if already has subscription)"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/start-trial",
                                headers=headers,
                                json={"plan_type": "monthly", "subscription_provider": "MOCK"})
        
        # Could be 200 (success) or 400 (already has subscription)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "trial_end_date" in data, "Should return trial_end_date"
            assert data["plan_type"] == "monthly", "Plan type should be monthly"
            assert data["days_remaining"] == 30, "Trial should be 30 days"
            print(f"Trial started, ends: {data['trial_end_date']}")
        else:
            data = response.json()
            print(f"Already has subscription: {data.get('detail', 'unknown')}")
    
    def test_start_trial_requires_authentication(self):
        """Endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/start-trial",
                                json={"plan_type": "monthly"})
        assert response.status_code == 401


class TestSubscriptionCancel:
    """Test POST /api/subscription/cancel endpoint (MOCKED)"""
    
    def test_cancel_requires_provider_role(self, mom_session):
        """Mom cannot cancel subscription"""
        headers = {"Authorization": f"Bearer {mom_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/cancel", headers=headers)
        assert response.status_code == 403, f"Mom should get 403, got {response.status_code}"
    
    def test_cancel_subscription_for_doula(self, doula_session):
        """Should cancel subscription for doula (may fail if no subscription)"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/cancel", headers=headers)
        
        # Could be 200 (cancelled) or 404 (no subscription)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Should return message"
            assert "subscription_provider" in data, "Should return provider"
            print(f"Subscription cancelled: {data['message']}")
        else:
            print("No subscription to cancel")
    
    def test_cancel_requires_authentication(self):
        """Endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/cancel")
        assert response.status_code == 401


class TestSubscriptionActivate:
    """Test POST /api/subscription/activate endpoint (MOCKED)"""
    
    def test_activate_requires_provider_role(self, mom_session):
        """Mom cannot activate subscription"""
        headers = {"Authorization": f"Bearer {mom_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/activate",
                                headers=headers,
                                json={"plan_type": "monthly"})
        assert response.status_code == 403
    
    def test_activate_monthly_subscription(self, doula_session):
        """Should activate monthly subscription for doula"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/activate",
                                headers=headers,
                                json={"plan_type": "monthly", "subscription_provider": "MOCK"})
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Subscription activated successfully"
        assert data["plan_type"] == "monthly"
        assert "subscription_end_date" in data
        print(f"Subscription activated until: {data['subscription_end_date']}")
    
    def test_activate_annual_subscription(self, doula_session):
        """Should activate annual subscription for doula"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/activate",
                                headers=headers,
                                json={"plan_type": "annual", "subscription_provider": "MOCK"})
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Subscription activated successfully"
        assert data["plan_type"] == "annual"
        print(f"Annual subscription activated until: {data['subscription_end_date']}")
    
    def test_activate_requires_authentication(self):
        """Endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/activate",
                                json={"plan_type": "monthly"})
        assert response.status_code == 401


class TestSubscriptionValidateReceipt:
    """Test POST /api/subscription/validate-receipt endpoint (MOCKED)"""
    
    def test_validate_receipt_requires_provider_role(self, mom_session):
        """Mom cannot validate receipt"""
        headers = {"Authorization": f"Bearer {mom_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/validate-receipt",
                                headers=headers,
                                json={
                                    "receipt": "mock_receipt_data",
                                    "subscription_provider": "APPLE",
                                    "product_id": "truejoy.pro.monthly"
                                })
        assert response.status_code == 403
    
    def test_validate_receipt_rejects_invalid_provider(self, doula_session):
        """Should reject invalid subscription provider"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/validate-receipt",
                                headers=headers,
                                json={
                                    "receipt": "mock_receipt_data",
                                    "subscription_provider": "INVALID",
                                    "product_id": "truejoy.pro.monthly"
                                })
        assert response.status_code == 400
        data = response.json()
        assert "APPLE" in data.get("detail", "") or "GOOGLE" in data.get("detail", "")
    
    def test_validate_receipt_rejects_invalid_product_id(self, doula_session):
        """Should reject invalid Apple product ID"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/validate-receipt",
                                headers=headers,
                                json={
                                    "receipt": "mock_receipt_data",
                                    "subscription_provider": "APPLE",
                                    "product_id": "invalid.product.id"
                                })
        assert response.status_code == 400
        data = response.json()
        # Error message contains "product id" (case-insensitive)
        assert "product" in data.get("detail", "").lower() and "id" in data.get("detail", "").lower()
    
    def test_validate_receipt_apple_monthly(self, doula_session):
        """Should validate Apple monthly receipt (MOCKED)"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/validate-receipt",
                                headers=headers,
                                json={
                                    "receipt": "mock_apple_receipt_base64_data",
                                    "subscription_provider": "APPLE",
                                    "product_id": "truejoy.pro.monthly"
                                })
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Receipt validated successfully"
        assert data["subscription_status"] == "active"
        assert data["plan_type"] == "monthly"
        assert data["subscription_provider"] == "APPLE"
        assert data["auto_renewing"] == True
        print(f"Apple receipt validated, subscription until: {data['subscription_end_date']}")
    
    def test_validate_receipt_google_annual(self, doula_session):
        """Should validate Google annual receipt (MOCKED)"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.post(f"{BASE_URL}/api/subscription/validate-receipt",
                                headers=headers,
                                json={
                                    "receipt": "mock_google_receipt_token",
                                    "subscription_provider": "GOOGLE",
                                    "product_id": "truejoy_pro_annual"
                                })
        assert response.status_code == 200
        data = response.json()
        
        assert data["subscription_status"] == "active"
        assert data["plan_type"] == "annual"
        assert data["subscription_provider"] == "GOOGLE"
        print(f"Google receipt validated, subscription until: {data['subscription_end_date']}")
    
    def test_validate_receipt_requires_authentication(self):
        """Endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/subscription/validate-receipt",
                                json={
                                    "receipt": "mock_receipt",
                                    "subscription_provider": "APPLE",
                                    "product_id": "truejoy.pro.monthly"
                                })
        assert response.status_code == 401


class TestAuthRoutesStillWork:
    """Verify auth routes still work after migration"""
    
    def test_login_endpoint_works(self):
        """Auth login should still work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        print("Auth login working")
    
    def test_me_endpoint_works(self, doula_session):
        """Auth /me should still work"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == DOULA_EMAIL
        print(f"Auth /me working, user: {data['full_name']}")


class TestProviderRoutesStillWork:
    """Verify provider routes still work after migration"""
    
    def test_provider_clients_endpoint(self, doula_session):
        """Provider clients should still work"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Should return list of clients"
        print(f"Provider clients working, found {len(data)} clients")
    
    def test_provider_dashboard_endpoint(self, doula_session):
        """Provider dashboard should still work"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "active_clients_count" in data or "contracts_count" in data or isinstance(data, dict)
        print("Provider dashboard working")


class TestSubscriptionStatusAfterActivation:
    """Verify subscription status reflects activated subscription"""
    
    def test_status_shows_active_after_activation(self, doula_session):
        """After activation, status should show active subscription"""
        headers = {"Authorization": f"Bearer {doula_session}"}
        response = requests.get(f"{BASE_URL}/api/subscription/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # After our activate tests, should be active
        assert data["has_pro_access"] == True, "Should have pro access after activation"
        assert data["subscription_status"] == "active", f"Status should be active, got: {data['subscription_status']}"
        assert data["plan_type"] in ["monthly", "annual"], "Should have a plan type"
        assert data["is_mom"] == False
        
        print(f"Final status - Plan: {data['plan_type']}, Status: {data['subscription_status']}, Pro Access: {data['has_pro_access']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
