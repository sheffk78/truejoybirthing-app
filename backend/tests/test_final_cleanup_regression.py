"""
Final Cleanup Regression Tests - Iteration 110

Tests to verify all routes work correctly after final backend refactoring:
- Removed duplicate routes from server.py
- Deleted legacy provider.py
- Added Mom appointment routes to mom.py

Focus areas:
1. Provider Dashboard (DOULA and MIDWIFE)
2. Provider Clients
3. Provider Appointments
4. Provider Notes
5. Mom Birth Plan
6. Mom Timeline
7. Mom Appointments (new routes in mom.py)
8. Care Plans (wellness, postpartum, share requests)
9. Midwife routes (/api/midwife/*)
10. Doula routes (/api/doula/*)
11. Health check
12. Role-based access control
"""

import pytest
import requests
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://joy-colors-system.preview.emergentagent.com")

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture(scope="module")
def doula_session():
    """Get authenticated session for doula"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    assert response.status_code == 200, f"Doula login failed: {response.text}"
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data.get('session_token', data.get('token'))}"})
    return session


@pytest.fixture(scope="module")
def midwife_session():
    """Get authenticated session for midwife"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    assert response.status_code == 200, f"Midwife login failed: {response.text}"
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data.get('session_token', data.get('token'))}"})
    return session


@pytest.fixture(scope="module")
def mom_session():
    """Get authenticated session for mom"""
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    assert response.status_code == 200, f"Mom login failed: {response.text}"
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data.get('session_token', data.get('token'))}"})
    return session


class TestHealthCheck:
    """Health check - basic sanity test"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✅ Health check: {data}")


class TestProviderDashboard:
    """Provider Dashboard - GET /api/provider/dashboard"""
    
    def test_doula_dashboard(self, doula_session):
        """Doula should access provider dashboard"""
        response = doula_session.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 200
        data = response.json()
        # Check expected fields
        assert "total_clients" in data
        assert "active_clients" in data
        assert "upcoming_appointments" in data
        print(f"✅ Doula dashboard: total_clients={data.get('total_clients')}, active_clients={data.get('active_clients')}")
    
    def test_midwife_dashboard(self, midwife_session):
        """Midwife should access provider dashboard with role-specific stats"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 200
        data = response.json()
        # Check expected fields including midwife-specific
        assert "total_clients" in data
        assert "active_clients" in data
        assert "upcoming_appointments" in data
        # Midwife-specific stats
        assert "visits_this_month" in data or "prenatal_clients" in data
        print(f"✅ Midwife dashboard: total_clients={data.get('total_clients')}, visits_this_month={data.get('visits_this_month')}")


class TestProviderClients:
    """Provider Clients - GET /api/provider/clients"""
    
    def test_doula_get_clients(self, doula_session):
        """Doula should get clients list"""
        response = doula_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Doula clients: {len(data)} clients returned")
    
    def test_midwife_get_clients(self, midwife_session):
        """Midwife should get clients list"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Midwife clients: {len(data)} clients returned")


class TestProviderAppointments:
    """Provider Appointments - GET/POST /api/provider/appointments"""
    
    def test_doula_get_appointments(self, doula_session):
        """Doula should get appointments"""
        response = doula_session.get(f"{BASE_URL}/api/provider/appointments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Doula appointments: {len(data)} appointments returned")
    
    def test_midwife_get_appointments(self, midwife_session):
        """Midwife should get appointments"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/appointments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Midwife appointments: {len(data)} appointments returned")


class TestProviderNotes:
    """Provider Notes - GET/POST /api/provider/notes"""
    
    def test_doula_get_notes(self, doula_session):
        """Doula should get notes"""
        response = doula_session.get(f"{BASE_URL}/api/provider/notes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Doula notes: {len(data)} notes returned")
    
    def test_midwife_get_notes(self, midwife_session):
        """Midwife should get notes"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/notes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Midwife notes: {len(data)} notes returned")


class TestMomBirthPlan:
    """Mom Birth Plan - GET /api/birth-plan"""
    
    def test_mom_get_birth_plan(self, mom_session):
        """Mom should get birth plan"""
        response = mom_session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data or "plan_id" in data
        print(f"✅ Mom birth plan: plan_id={data.get('plan_id')}")


class TestMomTimeline:
    """Mom Timeline - GET /api/timeline"""
    
    def test_mom_get_timeline(self, mom_session):
        """Mom should get timeline"""
        response = mom_session.get(f"{BASE_URL}/api/timeline")
        assert response.status_code == 200
        data = response.json()
        # Can have milestones or a message if no due date
        assert "milestones" in data or "message" in data
        print(f"✅ Mom timeline: current_week={data.get('current_week')}, milestones={len(data.get('milestones', []))}")


class TestMomAppointments:
    """Mom Appointments - GET/POST/PUT/DELETE /api/mom/appointments (new routes)"""
    
    def test_mom_get_appointments(self, mom_session):
        """Mom should get her appointments"""
        response = mom_session.get(f"{BASE_URL}/api/mom/appointments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Mom appointments: {len(data)} appointments returned")


class TestCarePlansWellness:
    """Care Plans - Wellness routes"""
    
    def test_mom_get_wellness_checkins(self, mom_session):
        """Mom should get wellness check-ins"""
        response = mom_session.get(f"{BASE_URL}/api/wellness/checkins")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Mom wellness checkins: {len(data)} check-ins returned")
    
    def test_mom_get_wellness_entries(self, mom_session):
        """Mom should get wellness entries"""
        response = mom_session.get(f"{BASE_URL}/api/wellness/entries")
        assert response.status_code == 200
        data = response.json()
        # Can be a dict with 'entries' key or a list
        if isinstance(data, dict):
            assert "entries" in data
        print(f"✅ Mom wellness entries returned")
    
    def test_mom_get_wellness_stats(self, mom_session):
        """Mom should get wellness stats"""
        response = mom_session.get(f"{BASE_URL}/api/wellness/stats")
        assert response.status_code == 200
        data = response.json()
        assert "entries_count" in data
        print(f"✅ Mom wellness stats: entries_count={data.get('entries_count')}")


class TestCarePlansPostpartum:
    """Care Plans - Postpartum routes"""
    
    def test_mom_get_postpartum_plan(self, mom_session):
        """Mom should get postpartum plan"""
        response = mom_session.get(f"{BASE_URL}/api/postpartum/plan")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data or "plan_id" in data
        print(f"✅ Mom postpartum plan returned")


class TestCarePlansShareRequests:
    """Care Plans - Share requests routes"""
    
    def test_mom_get_share_requests(self, mom_session):
        """Mom should get her share requests"""
        response = mom_session.get(f"{BASE_URL}/api/birth-plan/share-requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✅ Mom share requests: {len(data.get('requests', []))} requests")
    
    def test_doula_get_share_requests(self, doula_session):
        """Doula should get share requests from moms"""
        response = doula_session.get(f"{BASE_URL}/api/provider/share-requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✅ Doula share requests: {len(data.get('requests', []))} requests")
    
    def test_midwife_get_share_requests(self, midwife_session):
        """Midwife should get share requests from moms"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/share-requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✅ Midwife share requests: {len(data.get('requests', []))} requests")


class TestMidwifeRoutes:
    """Midwife-specific routes - /api/midwife/*"""
    
    def test_midwife_profile(self, midwife_session):
        """GET /api/midwife/profile"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/profile")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✅ Midwife profile: user_id={data.get('user_id')}")
    
    def test_midwife_dashboard(self, midwife_session):
        """GET /api/midwife/dashboard"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "active_clients" in data or "prenatal_clients" in data
        print(f"✅ Midwife dashboard: active_clients={data.get('active_clients')}, prenatal_clients={data.get('prenatal_clients')}")
    
    def test_midwife_clients(self, midwife_session):
        """GET /api/midwife/clients"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Midwife clients: {len(data)} clients")
    
    def test_midwife_notes(self, midwife_session):
        """GET /api/midwife/notes"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/notes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Midwife notes: {len(data)} notes")


class TestDoulaRoutes:
    """Doula-specific routes - /api/doula/*"""
    
    def test_doula_profile(self, doula_session):
        """GET /api/doula/profile"""
        response = doula_session.get(f"{BASE_URL}/api/doula/profile")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✅ Doula profile: user_id={data.get('user_id')}")
    
    def test_doula_dashboard(self, doula_session):
        """GET /api/doula/dashboard"""
        response = doula_session.get(f"{BASE_URL}/api/doula/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "active_clients" in data
        print(f"✅ Doula dashboard: active_clients={data.get('active_clients')}")
    
    def test_doula_clients(self, doula_session):
        """GET /api/doula/clients"""
        response = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Doula clients: {len(data)} clients")
    
    def test_doula_notes(self, doula_session):
        """GET /api/doula/notes"""
        response = doula_session.get(f"{BASE_URL}/api/doula/notes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Doula notes: {len(data)} notes")
    
    def test_doula_contract_defaults(self, doula_session):
        """GET /api/doula/contract-defaults"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contract-defaults")
        assert response.status_code == 200
        data = response.json()
        assert "deposit_percentage" in data or "services_included" in data or "user_id" in data
        print(f"✅ Doula contract defaults returned")


class TestMomRoutes:
    """Mom-specific routes - /api/mom/*"""
    
    def test_mom_profile(self, mom_session):
        """GET /api/mom/profile"""
        response = mom_session.get(f"{BASE_URL}/api/mom/profile")
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✅ Mom profile: user_id={data.get('user_id')}, due_date={data.get('due_date')}")
    
    def test_mom_team(self, mom_session):
        """GET /api/mom/team"""
        response = mom_session.get(f"{BASE_URL}/api/mom/team")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Mom team: {len(data)} team members")
    
    def test_mom_invoices(self, mom_session):
        """GET /api/mom/invoices"""
        response = mom_session.get(f"{BASE_URL}/api/mom/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Mom invoices: {len(data)} invoices")


class TestRoleBasedAccessControl:
    """Role-based access control - ensure Mom is blocked from provider routes"""
    
    def test_mom_cannot_access_provider_dashboard(self, mom_session):
        """Mom should NOT access /api/provider/dashboard"""
        response = mom_session.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 403
        print(f"✅ Mom correctly blocked from provider dashboard (403)")
    
    def test_mom_cannot_access_provider_clients(self, mom_session):
        """Mom should NOT access /api/provider/clients"""
        response = mom_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 403
        print(f"✅ Mom correctly blocked from provider clients (403)")
    
    def test_mom_cannot_access_provider_appointments(self, mom_session):
        """Mom should NOT access /api/provider/appointments"""
        response = mom_session.get(f"{BASE_URL}/api/provider/appointments")
        assert response.status_code == 403
        print(f"✅ Mom correctly blocked from provider appointments (403)")
    
    def test_mom_cannot_access_provider_notes(self, mom_session):
        """Mom should NOT access /api/provider/notes"""
        response = mom_session.get(f"{BASE_URL}/api/provider/notes")
        assert response.status_code == 403
        print(f"✅ Mom correctly blocked from provider notes (403)")
    
    def test_doula_cannot_access_birth_plan(self, doula_session):
        """Doula should NOT access /api/birth-plan (mom-only)"""
        response = doula_session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 403
        print(f"✅ Doula correctly blocked from birth plan (403)")
    
    def test_midwife_cannot_access_birth_plan(self, midwife_session):
        """Midwife should NOT access /api/birth-plan (mom-only)"""
        response = midwife_session.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 403
        print(f"✅ Midwife correctly blocked from birth plan (403)")


class TestProvidersSharedBirthPlans:
    """Provider access to shared birth plans"""
    
    def test_doula_shared_birth_plans(self, doula_session):
        """Doula can get shared birth plans"""
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert response.status_code == 200
        data = response.json()
        assert "birth_plans" in data
        print(f"✅ Doula shared birth plans: {len(data.get('birth_plans', []))} plans")
    
    def test_midwife_shared_birth_plans(self, midwife_session):
        """Midwife can get shared birth plans"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert response.status_code == 200
        data = response.json()
        assert "birth_plans" in data
        print(f"✅ Midwife shared birth plans: {len(data.get('birth_plans', []))} plans")


class TestProviderSearchForMom:
    """Mom can search for providers"""
    
    def test_mom_search_providers(self, mom_session):
        """Mom should search for providers"""
        response = mom_session.get(f"{BASE_URL}/api/providers/search?query=demo")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        print(f"✅ Mom provider search: {len(data.get('providers', []))} providers found")


class TestContractsAndInvoices:
    """Contracts and invoices - verify these routes still work"""
    
    def test_doula_get_contracts(self, doula_session):
        """Doula gets contracts via /api/doula/contracts"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Doula contracts returned")
    
    def test_doula_get_invoices(self, doula_session):
        """Doula gets invoices via /api/doula/invoices"""
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Doula invoices returned")
    
    def test_midwife_get_contracts(self, midwife_session):
        """Midwife gets contracts via /api/midwife/contracts"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Midwife contracts returned")
    
    def test_midwife_get_invoices(self, midwife_session):
        """Midwife gets invoices via /api/midwife/invoices"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/invoices")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Midwife invoices returned")


class TestAuthRoutes:
    """Auth routes - verify these still work"""
    
    def test_get_me_doula(self, doula_session):
        """GET /api/auth/me for doula"""
        response = doula_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == DOULA_EMAIL
        assert data.get("role") == "DOULA"
        print(f"✅ Auth /me for doula: {data.get('email')}, role={data.get('role')}")
    
    def test_get_me_midwife(self, midwife_session):
        """GET /api/auth/me for midwife"""
        response = midwife_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == MIDWIFE_EMAIL
        assert data.get("role") == "MIDWIFE"
        print(f"✅ Auth /me for midwife: {data.get('email')}, role={data.get('role')}")
    
    def test_get_me_mom(self, mom_session):
        """GET /api/auth/me for mom"""
        response = mom_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == MOM_EMAIL
        assert data.get("role") == "MOM"
        print(f"✅ Auth /me for mom: {data.get('email')}, role={data.get('role')}")


class TestVisitsRoutes:
    """Visit routes for midwife"""
    
    def test_midwife_get_visits(self, midwife_session):
        """Midwife gets visits via /api/midwife/visits"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/visits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Midwife visits: {len(data)} visits returned")
    
    def test_provider_get_visits(self, midwife_session):
        """Provider gets visits via /api/provider/visits"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/visits")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Provider visits: {len(data)} visits returned")


class TestMessagesRoutes:
    """Messages routes"""
    
    def test_doula_get_conversations(self, doula_session):
        """Doula gets message conversations"""
        response = doula_session.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200
        data = response.json()
        # Can be a list or dict with conversations
        print(f"✅ Doula messages/conversations returned")
    
    def test_mom_get_conversations(self, mom_session):
        """Mom gets message conversations"""
        response = mom_session.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200
        print(f"✅ Mom messages/conversations returned")


class TestNotificationsRoutes:
    """Notifications routes"""
    
    def test_doula_get_notifications(self, doula_session):
        """Doula gets notifications"""
        response = doula_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Doula notifications returned")
    
    def test_mom_get_notifications(self, mom_session):
        """Mom gets notifications"""
        response = mom_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Mom notifications returned")


class TestSubscriptionRoutes:
    """Subscription routes"""
    
    def test_doula_get_subscription(self, doula_session):
        """Doula gets subscription status"""
        response = doula_session.get(f"{BASE_URL}/api/subscription/status")
        assert response.status_code == 200
        data = response.json()
        assert "has_pro_access" in data or "subscription_status" in data
        print(f"✅ Doula subscription status: has_pro_access={data.get('has_pro_access')}, status={data.get('subscription_status')}")


class TestMarketplaceRoutes:
    """Marketplace routes"""
    
    def test_marketplace_providers(self, mom_session):
        """Mom can get marketplace providers via /api/marketplace/providers"""
        response = mom_session.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✅ Marketplace providers returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
