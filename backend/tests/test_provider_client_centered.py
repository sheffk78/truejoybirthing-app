"""
Comprehensive Backend Tests for Client-Centered Architecture
Tests: Unified provider routes - /api/provider/clients, /api/provider/clients/{id},
       /api/provider/clients/{id}/timeline, /api/provider/dashboard
       Active/Inactive client filtering, _counts aggregation
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials - using demo accounts
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestDoulaUnifiedProviderRoutes:
    """Test unified /api/provider/* routes for DOULA role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Doula and get session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.user_id = data.get("user_id")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
    
    def test_unified_provider_clients_default(self):
        """Test GET /api/provider/clients returns clients with is_active field - default (active only)"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify each client has is_active field
        for client in data:
            assert "is_active" in client, f"Client missing is_active field: {client}"
            assert "client_id" in client, f"Client missing client_id: {client}"
            # Default query should only return active clients
            assert client["is_active"] == True, f"Default query returned inactive client: {client.get('client_id')}"
        
        print(f"✓ Unified provider clients (active only): {len(data)} clients returned")
        return data
    
    def test_unified_provider_clients_include_inactive(self):
        """Test GET /api/provider/clients?include_inactive=true returns all clients including inactive"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Verify each client has is_active field
        active_count = 0
        inactive_count = 0
        for client in data:
            assert "is_active" in client, f"Client missing is_active field"
            if client["is_active"]:
                active_count += 1
            else:
                inactive_count += 1
        
        print(f"✓ Unified provider clients (include_inactive=true): {len(data)} total, {active_count} active, {inactive_count} inactive")
    
    def test_unified_provider_client_detail_with_counts(self):
        """Test GET /api/provider/clients/{client_id} returns client with _counts aggregation"""
        # First get clients list
        clients_response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available to test detail endpoint")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify _counts object
        assert "_counts" in data, "Client detail missing _counts object"
        counts = data["_counts"]
        expected_count_fields = ["appointments", "notes", "contracts", "invoices", "visits"]
        for field in expected_count_fields:
            assert field in counts, f"Missing count field: {field}"
            assert isinstance(counts[field], int), f"{field} should be integer"
        
        # Verify is_active is present
        assert "is_active" in data, "Client detail missing is_active field"
        
        print(f"✓ Client detail with _counts: {data['name']} - appointments:{counts['appointments']}, notes:{counts['notes']}, contracts:{counts['contracts']}, invoices:{counts['invoices']}")
    
    def test_unified_provider_client_detail_not_found(self):
        """Test GET /api/provider/clients/{client_id} returns 404 for non-existent client"""
        response = requests.get(f"{BASE_URL}/api/provider/clients/invalid_client_123", headers=self.headers)
        assert response.status_code == 404
        print("✓ Client detail correctly returns 404 for non-existent client")
    
    def test_unified_provider_client_timeline(self):
        """Test GET /api/provider/clients/{client_id}/timeline returns client info and timeline items"""
        # First get clients list
        clients_response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available to test timeline endpoint")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "client" in data, "Timeline response missing 'client'"
        assert "timeline" in data, "Timeline response missing 'timeline'"
        
        # Verify client has is_active
        assert "is_active" in data["client"], "Client in timeline response missing is_active"
        
        # Verify timeline is a list
        assert isinstance(data["timeline"], list), "Timeline should be a list"
        
        # If timeline has items, verify structure
        for item in data["timeline"]:
            assert "type" in item, f"Timeline item missing 'type': {item}"
            assert "id" in item, f"Timeline item missing 'id': {item}"
            assert "date" in item, f"Timeline item missing 'date': {item}"
            assert "title" in item, f"Timeline item missing 'title': {item}"
            assert item["type"] in ["appointment", "visit", "note", "contract", "invoice"], f"Invalid timeline item type: {item['type']}"
        
        print(f"✓ Client timeline: {data['client']['name']} - {len(data['timeline'])} timeline items")
    
    def test_unified_provider_dashboard(self):
        """Test GET /api/provider/dashboard returns unified dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify core stats
        assert "total_clients" in data, "Dashboard missing total_clients"
        assert "active_clients" in data, "Dashboard missing active_clients"
        assert "upcoming_appointments" in data, "Dashboard missing upcoming_appointments"
        
        # Verify counts are integers
        assert isinstance(data["total_clients"], int)
        assert isinstance(data["active_clients"], int)
        assert isinstance(data["upcoming_appointments"], int)
        
        # active_clients should be <= total_clients
        assert data["active_clients"] <= data["total_clients"], "Active clients cannot exceed total clients"
        
        print(f"✓ Provider dashboard: total={data['total_clients']}, active={data['active_clients']}, upcoming_appts={data['upcoming_appointments']}")


class TestMidwifeUnifiedProviderRoutes:
    """Test unified /api/provider/* routes for MIDWIFE role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Midwife and get session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        self.session_token = data.get("session_token")
        self.user_id = data.get("user_id")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
    
    def test_unified_provider_clients_midwife(self):
        """Test GET /api/provider/clients returns clients for Midwife with is_active field"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        for client in data:
            assert "is_active" in client, f"Client missing is_active field"
            assert "client_id" in client
        
        print(f"✓ Midwife unified provider clients: {len(data)} clients returned")
    
    def test_unified_provider_clients_with_inactive_midwife(self):
        """Test GET /api/provider/clients?include_inactive=true for Midwife"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Midwife unified provider clients (include_inactive): {len(data)} total")
    
    def test_unified_provider_dashboard_midwife_specific_stats(self):
        """Test GET /api/provider/dashboard returns Midwife-specific stats"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify core stats
        assert "total_clients" in data
        assert "active_clients" in data
        assert "upcoming_appointments" in data
        
        # Verify Midwife-specific stats
        assert "visits_this_month" in data, "Midwife dashboard missing visits_this_month"
        assert "births_this_month" in data, "Midwife dashboard missing births_this_month"
        assert "prenatal_clients" in data, "Midwife dashboard missing prenatal_clients"
        
        print(f"✓ Midwife dashboard: total={data['total_clients']}, active={data['active_clients']}, visits_this_month={data['visits_this_month']}, births_this_month={data['births_this_month']}")
    
    def test_unified_provider_client_timeline_midwife(self):
        """Test GET /api/provider/clients/{client_id}/timeline returns visits for Midwife"""
        # First get clients list
        clients_response = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available to test timeline endpoint")
        
        client_id = clients[0]["client_id"]
        response = requests.get(f"{BASE_URL}/api/provider/clients/{client_id}/timeline", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "client" in data
        assert "timeline" in data
        assert "is_active" in data["client"]
        
        # Check if there are visit type items (specific to midwife)
        visit_items = [item for item in data["timeline"] if item["type"] == "visit"]
        print(f"✓ Midwife client timeline: {data['client']['name']} - {len(data['timeline'])} items ({len(visit_items)} visits)")


class TestClientActiveInactiveLogic:
    """Test the is_active computation logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
    
    def test_filtering_difference_active_vs_all(self):
        """Test that include_inactive=true returns >= clients than default"""
        # Get active only
        response_active = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        active_clients = response_active.json()
        
        # Get all including inactive
        response_all = requests.get(f"{BASE_URL}/api/provider/clients?include_inactive=true", headers=self.headers)
        all_clients = response_all.json()
        
        assert len(all_clients) >= len(active_clients), "All clients should be >= active clients"
        print(f"✓ Filtering logic: active={len(active_clients)}, all={len(all_clients)}")


class TestStatusFilter:
    """Test status filtering on clients endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as Doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        data = response.json()
        self.session_token = data.get("session_token")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        yield
    
    def test_status_filter(self):
        """Test filtering clients by status"""
        response = requests.get(f"{BASE_URL}/api/provider/clients?status_filter=Active&include_inactive=true", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # All returned clients should have the filtered status
        for client in data:
            if client.get("status"):
                assert client["status"] == "Active", f"Status filter returned wrong status: {client['status']}"
        
        print(f"✓ Status filter: {len(data)} clients with Active status")


class TestUnauthorizedAccess:
    """Test that unified routes require authentication"""
    
    def test_provider_clients_unauthorized(self):
        """Test /api/provider/clients requires auth"""
        response = requests.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 401
        print("✓ Provider clients correctly requires authentication")
    
    def test_provider_dashboard_unauthorized(self):
        """Test /api/provider/dashboard requires auth"""
        response = requests.get(f"{BASE_URL}/api/provider/dashboard")
        assert response.status_code == 401
        print("✓ Provider dashboard correctly requires authentication")
    
    def test_provider_client_timeline_unauthorized(self):
        """Test /api/provider/clients/{id}/timeline requires auth"""
        response = requests.get(f"{BASE_URL}/api/provider/clients/some_id/timeline")
        assert response.status_code == 401
        print("✓ Provider client timeline correctly requires authentication")


class TestMomAccessDenied:
    """Test that Mom role cannot access provider routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create or login as a Mom user"""
        # Try to login with demo Mom account
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code == 200:
            data = response.json()
            self.session_token = data.get("session_token")
            self.headers = {"Authorization": f"Bearer {self.session_token}"}
            self.has_mom_account = True
        else:
            self.has_mom_account = False
        yield
    
    def test_mom_cannot_access_provider_clients(self):
        """Test Mom role gets 403 on provider routes"""
        if not self.has_mom_account:
            pytest.skip("No Mom account available for testing")
        
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=self.headers)
        assert response.status_code == 403, f"Expected 403 for Mom accessing provider route, got {response.status_code}"
        print("✓ Mom correctly denied access to provider routes")
    
    def test_mom_cannot_access_provider_dashboard(self):
        """Test Mom role gets 403 on provider dashboard"""
        if not self.has_mom_account:
            pytest.skip("No Mom account available for testing")
        
        response = requests.get(f"{BASE_URL}/api/provider/dashboard", headers=self.headers)
        assert response.status_code == 403
        print("✓ Mom correctly denied access to provider dashboard")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
