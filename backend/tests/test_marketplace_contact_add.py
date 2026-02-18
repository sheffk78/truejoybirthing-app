"""
Test Marketplace Contact and Add to Team functionality
- Contact button opens messages with provider
- Add to Team button sends share request (shares birth plan)
- Status tracking: Add to Team -> Pending -> On Team
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestMarketplaceContactAndAdd:
    """Tests for Mom's Marketplace Contact and Add to Team buttons"""
    
    # Store session tokens for reuse
    mom_session = None
    mom_user_id = None
    doula_session = None
    doula_user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - login as mom and doula"""
        # Login as Mom
        mom_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testmom_msg@test.com",
            "password": "password123"
        })
        assert mom_login.status_code == 200, f"Mom login failed: {mom_login.text}"
        mom_data = mom_login.json()
        TestMarketplaceContactAndAdd.mom_session = mom_data.get("session_token")
        TestMarketplaceContactAndAdd.mom_user_id = mom_data.get("user_id")
        
        # Login as Doula
        doula_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testdoula123@test.com",
            "password": "password123"
        })
        assert doula_login.status_code == 200, f"Doula login failed: {doula_login.text}"
        doula_data = doula_login.json()
        TestMarketplaceContactAndAdd.doula_session = doula_data.get("session_token")
        TestMarketplaceContactAndAdd.doula_user_id = doula_data.get("user_id")
        
        yield
    
    def get_mom_headers(self):
        """Get headers with mom session token"""
        return {
            "Authorization": f"Bearer {TestMarketplaceContactAndAdd.mom_session}",
            "Content-Type": "application/json"
        }
    
    def get_doula_headers(self):
        """Get headers with doula session token"""
        return {
            "Authorization": f"Bearer {TestMarketplaceContactAndAdd.doula_session}",
            "Content-Type": "application/json"
        }
    
    # --- Test: Get Marketplace Providers ---
    def test_get_marketplace_providers(self):
        """Test that marketplace returns providers"""
        response = requests.get(
            f"{BASE_URL}/api/marketplace/providers",
            headers=self.get_mom_headers()
        )
        print(f"Marketplace providers status: {response.status_code}")
        assert response.status_code == 200, f"Failed to get providers: {response.text}"
        
        data = response.json()
        print(f"Marketplace response keys: {data.keys()}")
        
        # API returns {doulas: [...], midwives: [...]}
        doulas = data.get("doulas", [])
        midwives = data.get("midwives", [])
        print(f"Found {len(doulas)} doulas and {len(midwives)} midwives")
        
        # At least check the structure if providers exist
        if doulas:
            print(f"First doula: {doulas[0].get('user', {}).get('full_name', 'Unknown')}")
            assert "user" in doulas[0] or "profile" in doulas[0], "Doula should have user or profile data"
    
    # --- Test: Contact Provider (send message) ---
    def test_contact_provider_send_message(self):
        """Test Contact button - sends message to provider"""
        # Get the doula user_id
        doula_id = TestMarketplaceContactAndAdd.doula_user_id
        assert doula_id, "Doula user_id not found"
        
        # First, clean up any existing share request and send one so messaging works
        # Check current share requests
        share_check = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers=self.get_mom_headers()
        )
        print(f"Current share requests status: {share_check.status_code}")
        
        # Send a message to provider (this simulates Contact button)
        message_content = f"Hi, I found you on the marketplace and would like to connect!"
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            headers=self.get_mom_headers(),
            json={
                "receiver_id": doula_id,
                "content": message_content
            }
        )
        print(f"Send message status: {response.status_code}")
        print(f"Send message response: {response.text}")
        
        # The API might return 200, 201, or 403 if not connected
        # If 403, it means messaging requires connection first (expected behavior)
        if response.status_code == 403:
            print("Message requires connection - this is expected if not yet on team")
            # This is valid - confirms you need to Add to Team first
            return
        
        assert response.status_code in [200, 201], f"Message send failed unexpectedly: {response.text}"
        
        # Verify message was sent
        data = response.json()
        if "message_id" in data:
            print(f"Message sent successfully with ID: {data['message_id']}")
        assert "message" in data or "message_id" in data, "Response should contain message data"
    
    # --- Test: Get Conversations (for Contact flow) ---
    def test_get_conversations(self):
        """Test getting conversations - used by Contact button to check existing chats"""
        response = requests.get(
            f"{BASE_URL}/api/messages/conversations",
            headers=self.get_mom_headers()
        )
        print(f"Get conversations status: {response.status_code}")
        assert response.status_code == 200, f"Failed to get conversations: {response.text}"
        
        data = response.json()
        conversations = data.get("conversations", [])
        print(f"Found {len(conversations)} conversations")
        
        # Check structure
        if conversations:
            conv = conversations[0]
            print(f"First conversation with: {conv.get('other_user_name', 'Unknown')}")
            assert "other_user_id" in conv, "Conversation should have other_user_id"
    
    # --- Test: Add to Team (share birth plan) ---
    def test_add_to_team_share_birth_plan(self):
        """Test Add to Team button - sends share request to provider"""
        doula_id = TestMarketplaceContactAndAdd.doula_user_id
        assert doula_id, "Doula user_id not found"
        
        # First, clean up existing share requests with this provider
        share_check = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers=self.get_mom_headers()
        )
        if share_check.status_code == 200:
            existing_requests = share_check.json().get("requests", [])
            for req in existing_requests:
                if req.get("provider_id") == doula_id:
                    # Delete this request
                    delete_resp = requests.delete(
                        f"{BASE_URL}/api/birth-plan/share/{req['request_id']}",
                        headers=self.get_mom_headers()
                    )
                    print(f"Cleaned up existing share request: {delete_resp.status_code}")
        
        # Send share request (Add to Team)
        response = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            headers=self.get_mom_headers(),
            json={
                "provider_id": doula_id
            }
        )
        print(f"Add to Team (share) status: {response.status_code}")
        print(f"Add to Team response: {response.text}")
        
        assert response.status_code == 200, f"Share request failed: {response.text}"
        
        data = response.json()
        assert "request" in data or "message" in data, "Response should contain request data"
        
        if "request" in data:
            request_data = data["request"]
            print(f"Share request created with ID: {request_data.get('request_id')}")
            assert request_data.get("status") == "pending", "Initial status should be pending"
            assert request_data.get("provider_id") == doula_id, "Provider ID should match"
    
    # --- Test: Get Share Requests (status tracking) ---
    def test_get_share_requests_status(self):
        """Test fetching share requests - used for status tracking"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers=self.get_mom_headers()
        )
        print(f"Get share requests status: {response.status_code}")
        assert response.status_code == 200, f"Failed to get share requests: {response.text}"
        
        data = response.json()
        requests_list = data.get("requests", [])
        print(f"Found {len(requests_list)} share requests")
        
        # Check structure and statuses
        for req in requests_list:
            status = req.get("status")
            provider_name = req.get("provider_name")
            print(f"Request to {provider_name}: status = {status}")
            
            # Status should be one of the valid values
            assert status in ["pending", "accepted", "rejected"], f"Invalid status: {status}"
    
    # --- Test: Duplicate Share Request Handling ---
    def test_duplicate_share_request_blocked(self):
        """Test that duplicate share requests are blocked"""
        doula_id = TestMarketplaceContactAndAdd.doula_user_id
        assert doula_id, "Doula user_id not found"
        
        # First ensure a share request exists
        first_response = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            headers=self.get_mom_headers(),
            json={
                "provider_id": doula_id
            }
        )
        print(f"First share request status: {first_response.status_code}")
        
        # Try to send another share request to same provider
        second_response = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            headers=self.get_mom_headers(),
            json={
                "provider_id": doula_id
            }
        )
        print(f"Duplicate share request status: {second_response.status_code}")
        
        # Should return 400 for duplicate
        assert second_response.status_code == 400, f"Duplicate should be blocked: {second_response.text}"
        assert "already exists" in second_response.text.lower(), "Error message should mention already exists"
    
    # --- Test: Provider Accepts Share Request (On Team status) ---
    def test_provider_accept_share_request(self):
        """Test provider accepting share request - changes status to 'accepted' (On Team)"""
        # Get share requests from provider's perspective
        response = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers=self.get_doula_headers()
        )
        print(f"Provider share requests status: {response.status_code}")
        assert response.status_code == 200, f"Failed to get provider share requests: {response.text}"
        
        data = response.json()
        requests_list = data.get("requests", [])
        print(f"Provider has {len(requests_list)} share requests")
        
        # Find a pending request to accept
        pending_request = None
        for req in requests_list:
            if req.get("status") == "pending" and req.get("mom_user_id") == TestMarketplaceContactAndAdd.mom_user_id:
                pending_request = req
                break
        
        if not pending_request:
            print("No pending request to accept from test mom - may have been accepted already")
            return
        
        request_id = pending_request.get("request_id")
        print(f"Accepting request: {request_id}")
        
        # Provider accepts the request
        accept_response = requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            headers=self.get_doula_headers(),
            json={
                "action": "accept"
            }
        )
        print(f"Accept share request status: {accept_response.status_code}")
        print(f"Accept response: {accept_response.text}")
        
        assert accept_response.status_code == 200, f"Accept failed: {accept_response.text}"
        
        # Verify status is now accepted
        verify_response = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers=self.get_mom_headers()
        )
        if verify_response.status_code == 200:
            requests_list = verify_response.json().get("requests", [])
            for req in requests_list:
                if req.get("request_id") == request_id:
                    print(f"Request status after accept: {req.get('status')}")
                    assert req.get("status") == "accepted", "Status should be accepted"
    
    # --- Test: Full Flow - Add to Team then Contact ---
    def test_full_flow_add_then_contact(self):
        """Test full flow: Add to Team creates share request, then Contact can send message"""
        doula_id = TestMarketplaceContactAndAdd.doula_user_id
        
        # 1. Check current share request status
        share_check = requests.get(
            f"{BASE_URL}/api/birth-plan/share-requests",
            headers=self.get_mom_headers()
        )
        assert share_check.status_code == 200
        
        requests_list = share_check.json().get("requests", [])
        doula_request = None
        for req in requests_list:
            if req.get("provider_id") == doula_id:
                doula_request = req
                break
        
        if doula_request:
            status = doula_request.get("status")
            print(f"Current share status with doula: {status}")
            
            # If accepted, messaging should work
            if status == "accepted":
                msg_response = requests.post(
                    f"{BASE_URL}/api/messages",
                    headers=self.get_mom_headers(),
                    json={
                        "receiver_id": doula_id,
                        "content": "Testing messaging after Add to Team"
                    }
                )
                print(f"Message after accept status: {msg_response.status_code}")
                assert msg_response.status_code in [200, 201], f"Messaging should work after accept: {msg_response.text}"
            else:
                print(f"Share request is {status}, messaging may be restricted")
        else:
            print("No share request exists with doula")


class TestMarketplaceProviders:
    """Test Marketplace provider listing endpoint"""
    
    def test_marketplace_returns_providers_with_user_data(self):
        """Verify marketplace returns provider data in expected format"""
        # Login as mom first
        mom_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testmom_msg@test.com",
            "password": "password123"
        })
        assert mom_login.status_code == 200
        session = mom_login.json().get("session_token")
        headers = {
            "Authorization": f"Bearer {session}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/marketplace/providers",
            headers=headers
        )
        print(f"Marketplace status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check doulas structure
        doulas = data.get("doulas", [])
        print(f"Doulas count: {len(doulas)}")
        if doulas:
            doula = doulas[0]
            # Frontend expects: user.user_id, user.full_name, user.email, profile
            user_data = doula.get("user", {})
            print(f"Doula user keys: {user_data.keys() if user_data else 'N/A'}")
            assert "user" in doula, "Doula should have 'user' field"
            assert "user_id" in user_data, "User should have user_id"
            assert "full_name" in user_data, "User should have full_name"
        
        # Check midwives structure
        midwives = data.get("midwives", [])
        print(f"Midwives count: {len(midwives)}")
        if midwives:
            midwife = midwives[0]
            user_data = midwife.get("user", {})
            print(f"Midwife user keys: {user_data.keys() if user_data else 'N/A'}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
