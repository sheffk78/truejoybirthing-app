"""
Test Suite for True Joy Birthing Subscription System
Tests: GET /api/subscription/pricing, GET /api/subscription/status, 
       POST /api/subscription/start-trial, POST /api/subscription/activate,
       POST /api/subscription/cancel

NOTE: This uses MOCK in-app purchases - real StoreKit/Google Play NOT implemented
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://birth-team-platform.preview.emergentagent.com')

def unique_id():
    """Generate a unique identifier for test data"""
    return f"{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"

class TestSubscriptionPricing:
    """Test subscription pricing endpoint - public, no auth required"""
    
    def test_get_pricing_returns_plans(self):
        """GET /api/subscription/pricing - returns plans with prices and features"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plans" in data, "Response should have 'plans' key"
        assert "mom_features" in data, "Response should have 'mom_features' key"
        
        # Verify plans structure
        plans = data["plans"]
        assert len(plans) == 2, "Should have 2 plans (monthly and annual)"
        
        # Check monthly plan
        monthly_plan = next((p for p in plans if p["id"] == "monthly"), None)
        assert monthly_plan is not None, "Monthly plan not found"
        assert monthly_plan["price"] == 29.0, "Monthly price should be $29"
        assert monthly_plan["period"] == "month"
        assert monthly_plan["trial_days"] == 30
        assert len(monthly_plan["features"]) > 0, "Monthly plan should have features"
        
        # Check annual plan
        annual_plan = next((p for p in plans if p["id"] == "annual"), None)
        assert annual_plan is not None, "Annual plan not found"
        assert annual_plan["price"] == 276.0, "Annual price should be $276"
        assert annual_plan["period"] == "year"
        assert annual_plan["trial_days"] == 30
        assert "savings" in annual_plan, "Annual plan should show savings"
        
        # Check mom features
        mom_features = data["mom_features"]
        assert len(mom_features) > 0, "Mom features should be listed"
        print(f"✅ Pricing endpoint returns {len(plans)} plans and {len(mom_features)} mom features")


class TestMomSubscriptionStatus:
    """Test subscription status for MOM users - always FREE"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Create a fresh MOM user for each test"""
        self.client = api_client
        uid = unique_id()
        
        # Register MOM user
        register_data = {
            "email": f"TEST_subtest_mom_{uid}@test.com",
            "full_name": "Test Subscription Mom",
            "role": "MOM",
            "password": "password123"
        }
        response = self.client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Failed to register MOM: {response.text}"
        
        data = response.json()
        self.session_token = data["session_token"]
        self.user_id = data["user_id"]
        self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
        
        # Cleanup: Delete test user (optional - test data cleanup)
    
    def test_mom_subscription_status_free(self):
        """GET /api/subscription/status - Mom user shows 'free' status with full access"""
        response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["has_pro_access"] == True, "Mom should have pro access (full features free)"
        assert data["subscription_status"] == "free", f"Mom should have 'free' status, got {data['subscription_status']}"
        assert data["plan_type"] == "mom_free", f"Plan type should be 'mom_free', got {data.get('plan_type')}"
        assert data["is_mom"] == True, "is_mom flag should be True"
        assert data["is_trial"] == False, "Mom should not be in trial"
        print(f"✅ MOM subscription status: {data['subscription_status']} with access={data['has_pro_access']}")


class TestDoulaSubscriptionWorkflow:
    """Test full subscription workflow for DOULA users"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Create a fresh DOULA user for each test"""
        self.client = api_client
        uid = unique_id()
        
        # Register DOULA user
        register_data = {
            "email": f"TEST_subtest_doula_{uid}@test.com",
            "full_name": "Test Subscription Doula",
            "role": "DOULA",
            "password": "password123"
        }
        response = self.client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Failed to register DOULA: {response.text}"
        
        data = response.json()
        self.session_token = data["session_token"]
        self.user_id = data["user_id"]
        self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_doula_no_subscription_status(self):
        """GET /api/subscription/status - Doula with no subscription shows 'none' status"""
        response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["has_pro_access"] == False, "Doula without subscription should not have pro access"
        assert data["subscription_status"] == "none", f"Status should be 'none', got {data['subscription_status']}"
        assert data["is_mom"] == False, "is_mom flag should be False for Doula"
        print(f"✅ DOULA without subscription: status={data['subscription_status']}, access={data['has_pro_access']}")
    
    def test_doula_start_trial(self):
        """POST /api/subscription/start-trial - starts 30-day trial for PRO users"""
        response = self.client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "monthly"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "trial_end_date" in data, "Response should have trial_end_date"
        assert data["plan_type"] == "monthly"
        assert data["days_remaining"] == 30
        assert "message" in data
        print(f"✅ Trial started: {data['message']}, ends {data['trial_end_date']}")
        
        # Verify status after trial
        status_response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert status_response.status_code == 200
        
        status_data = status_response.json()
        assert status_data["has_pro_access"] == True, "Doula in trial should have pro access"
        assert status_data["subscription_status"] == "trial", f"Status should be 'trial', got {status_data['subscription_status']}"
        assert status_data["is_trial"] == True
        assert status_data["days_remaining"] == 30 or status_data["days_remaining"] == 29  # Day boundary might shift
        print(f"✅ Status after trial: {status_data['subscription_status']}, days_remaining={status_data['days_remaining']}")
    
    def test_doula_activate_subscription_monthly(self):
        """POST /api/subscription/activate - activates paid subscription (mock)"""
        # First start trial (or skip if we want to test direct activation)
        response = self.client.post(
            f"{BASE_URL}/api/subscription/activate",
            json={"plan_type": "monthly"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscription_end_date" in data, "Response should have subscription_end_date"
        assert data["plan_type"] == "monthly"
        assert "message" in data
        print(f"✅ Subscription activated: {data['message']}, ends {data['subscription_end_date']}")
        
        # Verify status after activation
        status_response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert status_response.status_code == 200
        
        status_data = status_response.json()
        assert status_data["has_pro_access"] == True
        assert status_data["subscription_status"] == "active"
        assert status_data["is_trial"] == False
        print(f"✅ Status after activation: {status_data['subscription_status']}")
    
    def test_doula_cancel_subscription(self):
        """POST /api/subscription/cancel - cancels subscription"""
        # First activate a subscription
        self.client.post(
            f"{BASE_URL}/api/subscription/activate",
            json={"plan_type": "monthly"}
        )
        
        # Then cancel
        response = self.client.post(f"{BASE_URL}/api/subscription/cancel")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✅ Subscription cancelled: {data['message']}")
        
        # Verify status after cancellation
        status_response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert status_response.status_code == 200
        
        status_data = status_response.json()
        assert status_data["subscription_status"] == "cancelled"
        assert status_data["has_pro_access"] == False  # Cancelled means no access
        print(f"✅ Status after cancellation: {status_data['subscription_status']}")


class TestMidwifeSubscriptionWorkflow:
    """Test subscription workflow for MIDWIFE users"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Create a fresh MIDWIFE user for each test"""
        self.client = api_client
        uid = unique_id()
        
        # Register MIDWIFE user
        register_data = {
            "email": f"TEST_subtest_midwife_{uid}@test.com",
            "full_name": "Test Subscription Midwife",
            "role": "MIDWIFE",
            "password": "password123"
        }
        response = self.client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Failed to register MIDWIFE: {response.text}"
        
        data = response.json()
        self.session_token = data["session_token"]
        self.user_id = data["user_id"]
        self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_midwife_no_subscription_status(self):
        """GET /api/subscription/status - Midwife with no subscription shows 'none' status"""
        response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["has_pro_access"] == False
        assert data["subscription_status"] == "none"
        assert data["is_mom"] == False
        print(f"✅ MIDWIFE without subscription: status={data['subscription_status']}")
    
    def test_midwife_start_annual_trial(self):
        """POST /api/subscription/start-trial - Midwife starts annual plan trial"""
        response = self.client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "annual"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan_type"] == "annual"
        assert data["days_remaining"] == 30
        print(f"✅ Midwife annual trial started: {data['trial_end_date']}")
    
    def test_midwife_activate_annual_subscription(self):
        """POST /api/subscription/activate - Midwife activates annual subscription"""
        response = self.client.post(
            f"{BASE_URL}/api/subscription/activate",
            json={"plan_type": "annual"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["plan_type"] == "annual"
        assert "subscription_end_date" in data
        print(f"✅ Midwife annual subscription activated: {data['subscription_end_date']}")


class TestSubscriptionEdgeCases:
    """Test edge cases and error handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Create a fresh DOULA user"""
        self.client = api_client
        uid = unique_id()
        
        register_data = {
            "email": f"TEST_subtest_edge_{uid}@test.com",
            "full_name": "Test Edge Case Doula",
            "role": "DOULA",
            "password": "password123"
        }
        response = self.client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200
        
        data = response.json()
        self.session_token = data["session_token"]
        self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_cannot_start_trial_with_active_subscription(self):
        """Should not allow starting trial when already subscribed"""
        # First start trial
        response1 = self.client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "monthly"}
        )
        assert response1.status_code == 200
        
        # Try to start another trial - should fail
        response2 = self.client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "annual"}
        )
        assert response2.status_code == 400, f"Expected 400, got {response2.status_code}"
        print(f"✅ Correctly rejected duplicate trial: {response2.json().get('detail')}")
    
    def test_invalid_plan_type(self):
        """Should reject invalid plan types"""
        response = self.client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "invalid_plan"}
        )
        assert response.status_code == 400
        print(f"✅ Correctly rejected invalid plan type: {response.json().get('detail')}")
    
    def test_cancel_nonexistent_subscription(self):
        """Should handle cancelling when no subscription exists"""
        response = self.client.post(f"{BASE_URL}/api/subscription/cancel")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Correctly returned 404 for non-existent subscription")


class TestSubscriptionAuthRequired:
    """Test that subscription endpoints require authentication"""
    
    def test_status_requires_auth(self):
        """GET /api/subscription/status - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Status endpoint correctly requires auth")
    
    def test_start_trial_requires_auth(self):
        """POST /api/subscription/start-trial - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "monthly"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Start trial endpoint correctly requires auth")
    
    def test_pricing_is_public(self):
        """GET /api/subscription/pricing - should be public (no auth)"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ Pricing endpoint correctly allows public access")


@pytest.fixture
def api_client():
    """Shared requests session for tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
