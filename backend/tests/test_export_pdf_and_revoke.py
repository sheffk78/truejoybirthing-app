# Test Export Birth Plan PDF and Cancel/Revoke Invitation features
# Two bug fixes being tested:
# 1) Export Birth Plan PDF - GET /api/birth-plan/export/pdf
# 2) Cancel Invitation - DELETE /api/birth-plan/share/{request_id}

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://care-plan-test.preview.emergentagent.com')

class TestExportPDFAndRevokeInvitation:
    """Test Export PDF and Cancel Invitation features"""
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Create or login test MOM user and return session token"""
        # Try login first
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testmom_export@example.com", "password": "password123"}
        )
        
        if login_resp.status_code == 200:
            data = login_resp.json()
            return {"token": data.get("session_token"), "user_id": data.get("user_id")}
        
        # Create new user if login failed
        register_resp = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": "testmom_export@example.com",
                "password": "password123",
                "full_name": "Test Mom Export",
                "role": "MOM"
            }
        )
        
        if register_resp.status_code in [200, 201]:
            data = register_resp.json()
            return {"token": data.get("session_token"), "user_id": data.get("user_id")}
        
        pytest.skip(f"Failed to create mom user: {register_resp.text}")
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Create or login test DOULA user and return session token"""
        # Try login first
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testdoula_share@example.com", "password": "password123"}
        )
        
        if login_resp.status_code == 200:
            data = login_resp.json()
            return {"token": data.get("session_token"), "user_id": data.get("user_id")}
        
        # Create new user if login failed
        register_resp = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": "testdoula_share@example.com",
                "password": "password123",
                "full_name": "Test Doula Share",
                "role": "DOULA"
            }
        )
        
        if register_resp.status_code in [200, 201]:
            data = register_resp.json()
            return {"token": data.get("session_token"), "user_id": data.get("user_id")}
        
        pytest.skip(f"Failed to create doula user: {register_resp.text}")
    
    def test_01_mom_can_get_birth_plan(self, mom_session):
        """Verify MOM can access birth plan endpoint"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/birth-plan", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "plan_id" in data or "sections" in data, "Birth plan should contain plan_id or sections"
        print(f"✓ MOM can access birth plan: plan_id={data.get('plan_id', 'N/A')}")
    
    def test_02_export_pdf_returns_valid_pdf(self, mom_session):
        """Test Export Birth Plan PDF - GET /api/birth-plan/export/pdf"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/birth-plan/export/pdf", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type is PDF
        content_type = response.headers.get('content-type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Check PDF starts with correct header bytes
        pdf_bytes = response.content
        assert len(pdf_bytes) > 100, f"PDF should be larger than 100 bytes, got {len(pdf_bytes)}"
        assert pdf_bytes[:4] == b'%PDF', f"PDF should start with %PDF header, got: {pdf_bytes[:20]}"
        
        # Check Content-Disposition header for filename
        content_disposition = response.headers.get('content-disposition', '')
        assert 'attachment' in content_disposition, f"Expected attachment disposition, got: {content_disposition}"
        assert '.pdf' in content_disposition.lower(), f"Expected .pdf filename in disposition, got: {content_disposition}"
        
        print(f"✓ Export PDF returns valid PDF - Size: {len(pdf_bytes)} bytes, Header: {pdf_bytes[:10]}")
    
    def test_03_export_pdf_requires_auth(self):
        """Test Export PDF requires authentication"""
        response = requests.get(f"{BASE_URL}/api/birth-plan/export/pdf")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Export PDF correctly requires authentication")
    
    def test_04_export_json_still_works(self, mom_session):
        """Test original export endpoint still works"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/birth-plan/export", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "plan" in data, "Should contain plan field"
        print(f"✓ Original export endpoint still works")
    
    def test_05_create_share_request(self, mom_session, doula_session):
        """Create a share request to test cancellation"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        # First complete mom onboarding if not done
        requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            headers=headers,
            json={
                "due_date": "2026-06-15",
                "planned_birth_setting": "Hospital"
            }
        )
        
        # Complete doula onboarding
        doula_headers = {"Authorization": f"Bearer {doula_session['token']}"}
        requests.post(
            f"{BASE_URL}/api/doula/onboarding",
            headers=doula_headers,
            json={
                "practice_name": "Test Doula Practice",
                "services_offered": ["Birth Doula"]
            }
        )
        
        # Create share request
        response = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            headers=headers,
            json={"provider_id": doula_session['user_id']}
        )
        
        # Could be 200 (new) or 400 (already exists)
        if response.status_code == 400 and "already" in response.text.lower():
            print("✓ Share request already exists - will use existing for cancellation test")
            # Get existing requests
            existing_resp = requests.get(f"{BASE_URL}/api/birth-plan/share-requests", headers=headers)
            if existing_resp.status_code == 200:
                requests_data = existing_resp.json().get("requests", [])
                for req in requests_data:
                    if req.get("provider_id") == doula_session['user_id']:
                        return req.get("request_id")
            pytest.skip("Could not find existing share request")
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        request_data = data.get("request", {})
        request_id = request_data.get("request_id")
        assert request_id is not None, "Response should contain request_id"
        print(f"✓ Share request created: {request_id}")
        return request_id
    
    def test_06_get_share_requests(self, mom_session, doula_session):
        """Verify MOM can list share requests"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/birth-plan/share-requests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "requests" in data, "Response should contain requests array"
        
        requests_list = data["requests"]
        print(f"✓ MOM has {len(requests_list)} share request(s)")
        
        # Find our test share request
        test_request = None
        for req in requests_list:
            if req.get("provider_id") == doula_session['user_id']:
                test_request = req
                break
        
        if test_request:
            print(f"  Found test share request: {test_request.get('request_id')} - Status: {test_request.get('status')}")
        
        return requests_list
    
    def test_07_revoke_share_request(self, mom_session, doula_session):
        """Test Cancel/Revoke Invitation - DELETE /api/birth-plan/share/{request_id}"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        # First get the share requests to find one to cancel
        list_resp = requests.get(f"{BASE_URL}/api/birth-plan/share-requests", headers=headers)
        assert list_resp.status_code == 200, f"Expected 200, got {list_resp.status_code}"
        
        requests_list = list_resp.json().get("requests", [])
        
        # Find a request for our test doula
        test_request = None
        for req in requests_list:
            if req.get("provider_id") == doula_session['user_id']:
                test_request = req
                break
        
        if not test_request:
            # Create a new share request if none exists
            create_resp = requests.post(
                f"{BASE_URL}/api/birth-plan/share",
                headers=headers,
                json={"provider_id": doula_session['user_id']}
            )
            
            if create_resp.status_code in [200, 201]:
                test_request = create_resp.json().get("request", {})
            else:
                pytest.skip(f"No share request to revoke and could not create one: {create_resp.text}")
        
        request_id = test_request.get("request_id")
        assert request_id, "Must have a request_id to test revoke"
        
        # Now test the revoke endpoint
        revoke_resp = requests.delete(
            f"{BASE_URL}/api/birth-plan/share/{request_id}",
            headers=headers
        )
        
        assert revoke_resp.status_code == 200, f"Expected 200, got {revoke_resp.status_code}: {revoke_resp.text}"
        
        data = revoke_resp.json()
        assert "message" in data, "Response should contain success message"
        print(f"✓ Share request revoked successfully: {data.get('message')}")
        
        # Verify the request is gone
        verify_resp = requests.get(f"{BASE_URL}/api/birth-plan/share-requests", headers=headers)
        assert verify_resp.status_code == 200
        
        remaining_requests = verify_resp.json().get("requests", [])
        for req in remaining_requests:
            assert req.get("request_id") != request_id, f"Revoked request {request_id} should not exist anymore"
        
        print(f"✓ Verified share request {request_id} no longer exists")
    
    def test_08_revoke_nonexistent_request(self, mom_session):
        """Test revoking a non-existent request returns 404"""
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        response = requests.delete(
            f"{BASE_URL}/api/birth-plan/share/nonexistent_id_12345",
            headers=headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Revoking non-existent request correctly returns 404")
    
    def test_09_revoke_requires_auth(self):
        """Test revoke endpoint requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/birth-plan/share/any_id")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Revoke endpoint correctly requires authentication")
    
    def test_10_revoke_cannot_access_other_user_request(self, mom_session, doula_session):
        """Test MOM cannot revoke another user's share request"""
        # Create a new share request first
        headers = {"Authorization": f"Bearer {mom_session['token']}"}
        
        create_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            headers=headers,
            json={"provider_id": doula_session['user_id']}
        )
        
        if create_resp.status_code in [200, 201]:
            request_id = create_resp.json().get("request", {}).get("request_id")
            
            # Try to revoke with doula's token (should fail - doula can't revoke mom's request)
            doula_headers = {"Authorization": f"Bearer {doula_session['token']}"}
            revoke_resp = requests.delete(
                f"{BASE_URL}/api/birth-plan/share/{request_id}",
                headers=doula_headers
            )
            
            # Should return 403 (forbidden) or 404 (not found for this user)
            assert revoke_resp.status_code in [403, 404], f"Expected 403/404, got {revoke_resp.status_code}"
            print("✓ Doula cannot revoke mom's share request")
            
            # Clean up - revoke with mom's token
            requests.delete(f"{BASE_URL}/api/birth-plan/share/{request_id}", headers=headers)
        else:
            print("✓ Skipping cross-user test - could not create share request")


class TestExportPDFContent:
    """Additional tests for PDF export content validation"""
    
    @pytest.fixture(scope="class")
    def mom_with_plan_session(self):
        """Create MOM with populated birth plan"""
        # Login
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "testmom_export@example.com", "password": "password123"}
        )
        
        if login_resp.status_code != 200:
            pytest.skip("Could not login as test mom")
        
        data = login_resp.json()
        token = data.get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update a birth plan section with some data
        requests.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            headers=headers,
            json={
                "data": {
                    "birth_preferences": "Natural birth preferred",
                    "special_considerations": "Aromatherapy is welcome"
                },
                "notes_to_provider": "Please discuss pain management options"
            }
        )
        
        return {"token": token}
    
    def test_pdf_with_populated_data(self, mom_with_plan_session):
        """Test PDF export with populated birth plan data"""
        headers = {"Authorization": f"Bearer {mom_with_plan_session['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/birth-plan/export/pdf", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        pdf_bytes = response.content
        assert len(pdf_bytes) > 500, f"PDF with data should be larger, got {len(pdf_bytes)} bytes"
        
        print(f"✓ PDF with populated data generated - Size: {len(pdf_bytes)} bytes")


# Pytest entry point
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
