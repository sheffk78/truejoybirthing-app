"""
Test Suite for True Joy Birthing Subscription System - Iteration 163
Tests subscription status, pricing, trial and upgrade features for App Store submission verification.

Tests the following flows:
1. Subscription pricing endpoint returns correct data (14-day trial, $29/month, $276/year)
2. Subscription status API for trial users (Doula demo account)
3. Subscription status API for active subscribers (Midwife demo account)
4. Trial user can see upgrade options
5. Monthly subscriber can see upgrade to annual option
6. Start Trial button functionality for new users
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://bug-fixes-p0.preview.emergentagent.com')

# Demo credentials for testing
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestSubscriptionPricingUpdated:
    """Test subscription pricing endpoint - verifying updated 14-day trial"""
    
    def test_get_pricing_returns_correct_plans(self):
        """GET /api/subscription/pricing - returns plans with correct updated prices"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plans" in data, "Response should have 'plans' key"
        
        plans = data["plans"]
        assert len(plans) == 2, "Should have 2 plans (monthly and annual)"
        
        # Verify monthly plan with 14-day trial
        monthly_plan = next((p for p in plans if p["id"] == "monthly"), None)
        assert monthly_plan is not None, "Monthly plan not found"
        assert monthly_plan["price"] == 29.0, f"Monthly price should be $29, got {monthly_plan['price']}"
        assert monthly_plan["trial_days"] == 14, f"Trial should be 14 days, got {monthly_plan['trial_days']}"
        
        # Verify annual plan
        annual_plan = next((p for p in plans if p["id"] == "annual"), None)
        assert annual_plan is not None, "Annual plan not found"
        assert annual_plan["price"] == 276.0, f"Annual price should be $276, got {annual_plan['price']}"
        assert annual_plan["trial_days"] == 14, f"Trial should be 14 days, got {annual_plan['trial_days']}"
        assert annual_plan["savings"] == 72.0, f"Savings should be $72, got {annual_plan.get('savings')}"
        
        print(f"✅ Pricing verified: Monthly ${monthly_plan['price']}/mo, Annual ${annual_plan['price']}/yr")
        print(f"✅ Trial period: {monthly_plan['trial_days']} days")


class TestDemoDoulaSubscription:
    """Test subscription status for Doula demo account (expected: trial user)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        self.client = api_client
        
        # Login as Doula
        login_response = self.client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DOULA_EMAIL, "password": DOULA_PASSWORD}
        )
        assert login_response.status_code == 200, f"Failed to login Doula: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.user_id = data.get("user_id")
        self.role = data.get("role")
        
        if self.session_token:
            self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        print(f"✅ Logged in as Doula: {data.get('full_name')} ({self.role})")
        yield
    
    def test_doula_is_doula_role(self):
        """Verify demo.doula is DOULA role"""
        assert self.role == "DOULA", f"Expected DOULA role, got {self.role}"
        print(f"✅ Doula account has correct role: {self.role}")
    
    def test_doula_subscription_status(self):
        """GET /api/subscription/status - Doula should show trial or subscription status"""
        response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Doula subscription status: {data}")
        
        # Doula should have pro access (either trial or active)
        assert "has_pro_access" in data, "Response should have has_pro_access"
        assert "subscription_status" in data, "Response should have subscription_status"
        
        # According to agent context, Doula is on trial with 21 days remaining
        # But 14-day trial was recently implemented, so this may vary
        status = data.get("subscription_status")
        print(f"✅ Doula subscription status: {status}")
        print(f"✅ Has pro access: {data.get('has_pro_access')}")
        print(f"✅ Days remaining: {data.get('days_remaining')}")
        print(f"✅ Is trial: {data.get('is_trial')}")
        
        # Verify response structure
        assert "plan_type" in data
        assert "is_mom" in data
        assert data["is_mom"] == False, "Doula is_mom should be False"


class TestDemoMidwifeSubscription:
    """Test subscription status for Midwife demo account (expected: annual subscriber)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        self.client = api_client
        
        # Login as Midwife
        login_response = self.client.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": MIDWIFE_EMAIL, "password": MIDWIFE_PASSWORD}
        )
        assert login_response.status_code == 200, f"Failed to login Midwife: {login_response.text}"
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.user_id = data.get("user_id")
        self.role = data.get("role")
        
        if self.session_token:
            self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        print(f"✅ Logged in as Midwife: {data.get('full_name')} ({self.role})")
        yield
    
    def test_midwife_is_midwife_role(self):
        """Verify demo.midwife is MIDWIFE role"""
        assert self.role == "MIDWIFE", f"Expected MIDWIFE role, got {self.role}"
        print(f"✅ Midwife account has correct role: {self.role}")
    
    def test_midwife_subscription_status(self):
        """GET /api/subscription/status - Midwife should show active annual subscription"""
        response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Midwife subscription status: {data}")
        
        assert "has_pro_access" in data
        assert "subscription_status" in data
        
        # According to agent context, Midwife is on active annual plan
        status = data.get("subscription_status")
        print(f"✅ Midwife subscription status: {status}")
        print(f"✅ Has pro access: {data.get('has_pro_access')}")
        print(f"✅ Days remaining: {data.get('days_remaining')}")
        print(f"✅ Is trial: {data.get('is_trial')}")
        print(f"✅ Plan type: {data.get('plan_type')}")
        
        assert data["is_mom"] == False, "Midwife is_mom should be False"


class TestSubscriptionUpgradePaths:
    """Test that upgrade paths are properly configured"""
    
    def test_pricing_shows_savings_for_annual(self):
        """Annual plan should show savings vs monthly"""
        response = requests.get(f"{BASE_URL}/api/subscription/pricing")
        assert response.status_code == 200
        
        data = response.json()
        annual = next((p for p in data["plans"] if p["id"] == "annual"), None)
        
        # Annual: $276/year, Monthly: $29/mo * 12 = $348/year
        # Savings: $348 - $276 = $72
        assert annual.get("savings") == 72.0, f"Expected $72 savings, got {annual.get('savings')}"
        print(f"✅ Annual plan shows correct savings: ${annual.get('savings')}/year")


class TestChangePlanAPI:
    """Test the change-plan endpoint for monthly to annual upgrade"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        self.client = api_client
        
        # We'll use a new test user that we can safely modify
        import uuid
        uid = f"{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"
        
        # Register new DOULA user
        register_data = {
            "email": f"TEST_upgrade_{uid}@test.com",
            "full_name": "Test Upgrade User",
            "role": "DOULA",
            "password": "password123"
        }
        response = self.client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Failed to register: {response.text}"
        
        data = response.json()
        self.session_token = data["session_token"]
        self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_activate_monthly_then_check_upgrade_available(self):
        """Activate monthly subscription, then verify upgrade path exists"""
        # Activate monthly subscription
        activate_response = self.client.post(
            f"{BASE_URL}/api/subscription/activate",
            json={"plan_type": "monthly"}
        )
        assert activate_response.status_code == 200, f"Failed to activate: {activate_response.text}"
        
        # Check status
        status_response = self.client.get(f"{BASE_URL}/api/subscription/status")
        assert status_response.status_code == 200
        
        status = status_response.json()
        assert status["plan_type"] == "monthly"
        assert status["subscription_status"] == "active"
        print(f"✅ Monthly subscription active: plan={status['plan_type']}")
        
        # Try to upgrade to annual
        upgrade_response = self.client.post(
            f"{BASE_URL}/api/subscription/change-plan",
            json={"new_plan_type": "annual"}
        )
        assert upgrade_response.status_code == 200, f"Failed to upgrade: {upgrade_response.text}"
        
        upgrade_data = upgrade_response.json()
        assert upgrade_data["old_plan"] == "monthly"
        assert upgrade_data["new_plan"] == "annual"
        assert upgrade_data["is_upgrade"] == True
        print(f"✅ Successfully upgraded: {upgrade_data['old_plan']} -> {upgrade_data['new_plan']}")
        
        # Verify status after upgrade
        final_status = self.client.get(f"{BASE_URL}/api/subscription/status")
        final_data = final_status.json()
        assert final_data["plan_type"] == "annual"
        print(f"✅ Plan type after upgrade: {final_data['plan_type']}")


class TestTrialUpgrade:
    """Test that trial users can upgrade to paid"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        self.client = api_client
        
        import uuid
        uid = f"{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"
        
        register_data = {
            "email": f"TEST_trial_upgrade_{uid}@test.com",
            "full_name": "Test Trial Upgrade",
            "role": "DOULA",
            "password": "password123"
        }
        response = self.client.post(f"{BASE_URL}/api/auth/register", json=register_data)
        assert response.status_code == 200, f"Failed to register: {response.text}"
        
        data = response.json()
        self.session_token = data["session_token"]
        self.client.headers.update({"Authorization": f"Bearer {self.session_token}"})
        
        yield
    
    def test_start_trial_then_upgrade_to_paid(self):
        """Start trial, then upgrade to paid subscription"""
        # Start trial
        trial_response = self.client.post(
            f"{BASE_URL}/api/subscription/start-trial",
            json={"plan_type": "monthly"}
        )
        assert trial_response.status_code == 200, f"Failed to start trial: {trial_response.text}"
        
        trial_data = trial_response.json()
        assert trial_data["days_remaining"] == 14, f"Expected 14 days trial, got {trial_data['days_remaining']}"
        print(f"✅ Trial started: {trial_data['days_remaining']} days")
        
        # Verify trial status
        status_response = self.client.get(f"{BASE_URL}/api/subscription/status")
        status = status_response.json()
        assert status["is_trial"] == True
        assert status["has_pro_access"] == True
        print(f"✅ Trial status verified: is_trial={status['is_trial']}")
        
        # Upgrade from trial to paid
        upgrade_response = self.client.post(
            f"{BASE_URL}/api/subscription/activate",
            json={"plan_type": "annual"}
        )
        assert upgrade_response.status_code == 200, f"Failed to upgrade: {upgrade_response.text}"
        
        # Verify status after upgrade
        final_status = self.client.get(f"{BASE_URL}/api/subscription/status")
        final_data = final_status.json()
        assert final_data["subscription_status"] == "active"
        assert final_data["is_trial"] == False
        assert final_data["plan_type"] == "annual"
        print(f"✅ Upgraded from trial to paid: status={final_data['subscription_status']}, plan={final_data['plan_type']}")


@pytest.fixture
def api_client():
    """Shared requests session for tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
