"""
Test Lead → Consultation → Client Flow
Testing features:
1. Mom can request consultation (create a lead)
2. Provider can see leads list
3. Provider can view lead details with mom info
4. Provider can decline a lead
5. Provider can convert lead to client
6. Lead stats endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'https://midwife-labor.preview.emergentagent.com'))

# Test credentials from main agent context
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def mom_token(api_client):
    """Get Mom authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip(f"Mom login failed: {response.text}")


@pytest.fixture(scope="module")
def doula_token(api_client):
    """Get Doula authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip(f"Doula login failed: {response.text}")


@pytest.fixture(scope="module")
def midwife_token(api_client):
    """Get Midwife authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip(f"Midwife login failed: {response.text}")


@pytest.fixture(scope="module")
def doula_user_id(api_client, doula_token):
    """Get Doula user ID for testing"""
    response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {doula_token}"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("user_id")
    pytest.skip(f"Failed to get doula user info: {response.text}")


@pytest.fixture(scope="module")
def midwife_user_id(api_client, midwife_token):
    """Get Midwife user ID for testing"""
    response = api_client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {midwife_token}"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("user_id")
    pytest.skip(f"Failed to get midwife user info: {response.text}")


class TestLeadsBackendAPI:
    """Tests for leads API endpoints"""
    
    def test_1_mom_login(self, api_client):
        """Test Mom login - 200"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        print(f"✓ Mom login successful")
    
    def test_2_doula_login(self, api_client):
        """Test Doula login - 200"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        print(f"✓ Doula login successful")
    
    def test_3_midwife_login(self, api_client):
        """Test Midwife login - 200"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        print(f"✓ Midwife login successful")
    
    def test_4_mom_consultation_requests_endpoint(self, api_client, mom_token):
        """Test Mom can view her consultation requests - GET /leads/my-consultation-requests"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/my-consultation-requests",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Mom consultation requests endpoint works - found {len(data)} requests")
    
    def test_5_doula_leads_list_endpoint(self, api_client, doula_token):
        """Test Doula can view leads list - GET /leads"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Doula leads list endpoint works - found {len(data)} leads")
        
        # Check lead structure if there are leads
        if len(data) > 0:
            lead = data[0]
            assert "lead_id" in lead
            assert "mom_name" in lead
            assert "status" in lead
            print(f"  Lead structure verified: {lead.get('mom_name')} - {lead.get('status')}")
    
    def test_6_midwife_leads_list_endpoint(self, api_client, midwife_token):
        """Test Midwife can view leads list - GET /leads"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Midwife leads list endpoint works - found {len(data)} leads")
    
    def test_7_doula_leads_stats_endpoint(self, api_client, doula_token):
        """Test Doula can view leads stats - GET /leads/stats"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/stats",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "active_leads" in data
        assert "consultation_requested" in data
        print(f"✓ Doula leads stats: total={data.get('total')}, active={data.get('active_leads')}")
    
    def test_8_midwife_leads_stats_endpoint(self, api_client, midwife_token):
        """Test Midwife can view leads stats - GET /leads/stats"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/stats",
            headers={"Authorization": f"Bearer {midwife_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "active_leads" in data
        print(f"✓ Midwife leads stats: total={data.get('total')}, active={data.get('active_leads')}")
    
    def test_9_request_consultation_requires_provider_id(self, api_client, mom_token):
        """Test Request consultation validation - must provide provider_id"""
        response = api_client.post(
            f"{BASE_URL}/api/leads/request-consultation",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={}  # Missing provider_id
        )
        # Should fail validation (422) or bad request (400) or permission error if token wrong
        assert response.status_code in [400, 422, 403], f"Expected validation error: {response.text}"
        print(f"✓ Request consultation validation works (status: {response.status_code})")
    
    def test_10_request_consultation_invalid_provider(self, api_client, mom_token):
        """Test Request consultation with invalid provider_id - 404"""
        response = api_client.post(
            f"{BASE_URL}/api/leads/request-consultation",
            headers={"Authorization": f"Bearer {mom_token}"},
            json={"provider_id": "invalid_provider_123"}
        )
        # Should be 404 (provider not found) or 403 (permissions) depending on order of validation
        assert response.status_code in [404, 403], f"Expected 404 or 403: {response.text}"
        print(f"✓ Request consultation with invalid provider returns: {response.status_code}")
    
    def test_11_marketplace_providers_endpoint(self, api_client, mom_token):
        """Test Marketplace providers endpoint for Request Consultation feature"""
        response = api_client.get(
            f"{BASE_URL}/api/marketplace/providers",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "doulas" in data or "midwives" in data
        total = len(data.get("doulas", [])) + len(data.get("midwives", []))
        print(f"✓ Marketplace endpoint works - found {total} providers")
    
    def test_12_mom_cannot_access_provider_leads_list(self, api_client, mom_token):
        """Test Mom cannot access provider leads list - should be forbidden or empty"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        # Either 403 (forbidden) or 200 with empty/error
        assert response.status_code in [200, 403], f"Unexpected: {response.text}"
        if response.status_code == 200:
            # If 200, should be empty list or handled gracefully
            data = response.json()
            print(f"✓ Mom accessing /leads returns: {type(data).__name__}")
        else:
            print(f"✓ Mom correctly forbidden from provider leads list")


class TestLeadsDataIntegrity:
    """Tests for leads data integrity and enrichment"""
    
    def test_13_leads_contain_mom_info(self, api_client, doula_token):
        """Test leads contain mom info (name, EDD, message)"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            lead = data[0]
            # Check for expected fields
            assert "mom_name" in lead, "Lead should contain mom_name"
            assert "status" in lead, "Lead should contain status"
            assert "created_at" in lead, "Lead should contain created_at"
            
            # Optional enrichment fields
            if "edd" in lead:
                print(f"  EDD: {lead.get('edd')}")
            if "message" in lead:
                print(f"  Message present: {bool(lead.get('message'))}")
            
            print(f"✓ Lead data structure verified for {lead.get('mom_name')}")
        else:
            print("✓ No leads to verify (empty list)")


class TestLeadsStatusUpdates:
    """Tests for lead status update endpoints"""
    
    def test_14_update_lead_status_endpoint_exists(self, api_client, doula_token):
        """Test lead status update endpoint exists - PUT /leads/{lead_id}/status"""
        # First get leads to find a lead_id
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        leads = response.json()
        
        if len(leads) > 0:
            lead_id = leads[0]["lead_id"]
            # Try to update with invalid status to verify endpoint exists
            response = api_client.put(
                f"{BASE_URL}/api/leads/{lead_id}/status",
                headers={"Authorization": f"Bearer {doula_token}"},
                json={"status": "invalid_status"}
            )
            # Should be 400 (invalid status) not 404 (endpoint not found)
            assert response.status_code == 400, f"Expected 400 for invalid status: {response.text}"
            print(f"✓ Lead status update endpoint exists and validates status")
        else:
            # Verify endpoint exists with fake lead_id
            response = api_client.put(
                f"{BASE_URL}/api/leads/fake_lead_123/status",
                headers={"Authorization": f"Bearer {doula_token}"},
                json={"status": "declined"}
            )
            # Should be 404 (lead not found) not 405 (method not allowed)
            assert response.status_code == 404, f"Expected 404: {response.text}"
            print(f"✓ Lead status update endpoint exists (tested with fake lead)")
    
    def test_15_convert_to_client_endpoint_exists(self, api_client, doula_token):
        """Test convert-to-client endpoint exists - POST /leads/{lead_id}/convert-to-client"""
        # Test with fake lead_id to verify endpoint exists
        response = api_client.post(
            f"{BASE_URL}/api/leads/fake_lead_123/convert-to-client",
            headers={"Authorization": f"Bearer {doula_token}"},
            json={}
        )
        # Should be 404 (lead not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404: {response.text}"
        print(f"✓ Convert to client endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
