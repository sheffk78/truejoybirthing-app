"""
Dashboard Stats Test - Verifying the fix for doula dashboard returning correct stats
Tests that:
- active_clients returns correct count (not 0)
- contracts_pending_signature returns correct count (was 'pending_contracts')
- pending_invoices returns correct count (was 'unpaid_invoices')
- upcoming_appointments returns correct count
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardStats:
    """Test dashboard stats endpoint returns correct values"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        if not BASE_URL:
            pytest.skip("BASE_URL not set")
        
        # Login as doula
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        
        if response.status_code != 200:
            pytest.skip(f"Login failed: {response.status_code}")
        
        self.token = response.json().get("session_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_doula_dashboard_stats_keys(self):
        """Test that dashboard returns all expected keys"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=self.headers)
        
        assert response.status_code == 200, f"Dashboard returned {response.status_code}"
        data = response.json()
        
        # Check all expected keys exist
        expected_keys = [
            "active_clients",
            "total_clients",
            "contracts_pending_signature",
            "pending_invoices",
            "upcoming_appointments",
            "unread_messages"
        ]
        
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
            print(f"  {key}: {data[key]}")
    
    def test_active_clients_count(self):
        """Test active_clients returns 1 (not 0)"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # We know there is 1 active client (Emma Johnson with status 'Contract Sent')
        assert data["active_clients"] == 1, f"Expected 1 active client, got {data['active_clients']}"
        print(f"  active_clients: {data['active_clients']} (PASS)")
    
    def test_pending_contracts_count(self):
        """Test contracts_pending_signature returns 1"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Key name should be contracts_pending_signature (not pending_contracts)
        assert "contracts_pending_signature" in data, "Key should be 'contracts_pending_signature'"
        assert data["contracts_pending_signature"] == 1, f"Expected 1 pending contract, got {data['contracts_pending_signature']}"
        print(f"  contracts_pending_signature: {data['contracts_pending_signature']} (PASS)")
    
    def test_pending_invoices_count(self):
        """Test pending_invoices returns 0"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Key name should be pending_invoices (not unpaid_invoices)
        assert "pending_invoices" in data, "Key should be 'pending_invoices'"
        assert data["pending_invoices"] == 0, f"Expected 0 pending invoices, got {data['pending_invoices']}"
        print(f"  pending_invoices: {data['pending_invoices']} (PASS)")
    
    def test_upcoming_appointments_count(self):
        """Test upcoming_appointments returns 4"""
        response = requests.get(f"{BASE_URL}/api/doula/dashboard", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["upcoming_appointments"] == 4, f"Expected 4 upcoming appointments, got {data['upcoming_appointments']}"
        print(f"  upcoming_appointments: {data['upcoming_appointments']} (PASS)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
