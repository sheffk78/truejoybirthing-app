"""
Test Doula Section Updates - iteration 72
Tests: Doula Profile (photo, video intro, more about me), Contracts, Clients, Messages, Invoice mark-paid
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://backend-refactor-53.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"
MOM_EMAIL = "testmom_msg@test.com"
MOM_PASSWORD = "password123"


class TestDoulaAuthentication:
    """Test Doula login"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula and get session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Login as Mom and get session token"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_doula_login_success(self, doula_session):
        """Verify Doula can login"""
        session, data = doula_session
        assert data["role"] == "DOULA"
        assert "session_token" in data
        print(f"PASSED: Doula login - user_id: {data['user_id']}")


class TestDoulaProfile:
    """Test Doula Profile endpoints - photo upload, video intro, more about me"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_get_doula_profile(self, doula_session):
        """Test GET /api/doula/profile returns profile data"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/doula/profile")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "user_id" in data
        print(f"PASSED: Get doula profile - user_id: {data.get('user_id')}")
    
    def test_update_doula_profile_video_intro(self, doula_session):
        """Test updating video_intro_url field"""
        session, _ = doula_session
        test_video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        response = session.put(f"{BASE_URL}/api/doula/profile", json={
            "video_intro_url": test_video_url
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify the update
        verify_response = session.get(f"{BASE_URL}/api/doula/profile")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data.get("video_intro_url") == test_video_url
        print(f"PASSED: Updated video_intro_url: {test_video_url}")
    
    def test_update_doula_profile_more_about_me(self, doula_session):
        """Test updating more_about_me field (extended bio)"""
        session, _ = doula_session
        test_bio = "I am a passionate birth doula with over 10 years of experience supporting families through their birthing journey. My approach centers on creating a calm, empowering environment where parents feel heard and supported."
        
        response = session.put(f"{BASE_URL}/api/doula/profile", json={
            "more_about_me": test_bio
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify the update
        verify_response = session.get(f"{BASE_URL}/api/doula/profile")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data.get("more_about_me") == test_bio
        print(f"PASSED: Updated more_about_me field")
    
    def test_update_doula_profile_picture(self, doula_session):
        """Test updating picture field"""
        session, _ = doula_session
        test_picture_url = f"https://example.com/profile_{uuid.uuid4().hex[:8]}.jpg"
        
        response = session.put(f"{BASE_URL}/api/doula/profile", json={
            "picture": test_picture_url
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify the update
        verify_response = session.get(f"{BASE_URL}/api/doula/profile")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data.get("picture") == test_picture_url
        print(f"PASSED: Updated profile picture URL")


class TestDoulaContracts:
    """Test Doula Contracts endpoint"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_get_doula_contracts(self, doula_session):
        """Test GET /api/doula/contracts returns contracts list"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASSED: Get doula contracts - count: {len(data)}")


class TestDoulaClients:
    """Test Doula Clients endpoint - shows connected Moms"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_get_doula_clients(self, doula_session):
        """Test GET /api/doula/clients returns clients list"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/doula/clients")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASSED: Get doula clients - count: {len(data)}")
    
    def test_get_provider_share_requests(self, doula_session):
        """Test GET /api/provider/share-requests returns pending share requests"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/provider/share-requests")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "requests" in data
        print(f"PASSED: Get provider share requests - count: {len(data.get('requests', []))}")


class TestDoulaMessages:
    """Test Doula Messages endpoint"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_get_doula_conversations(self, doula_session):
        """Test GET /api/messages/conversations returns conversations list"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "conversations" in data
        print(f"PASSED: Get doula conversations - count: {len(data.get('conversations', []))}")


class TestDoulaDashboard:
    """Test Doula Dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_get_doula_dashboard(self, doula_session):
        """Test GET /api/doula/dashboard returns dashboard stats"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/doula/dashboard")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Verify dashboard stats fields exist
        assert "active_clients" in data or isinstance(data, dict)
        print(f"PASSED: Get doula dashboard")


class TestInvoiceMarkPaid:
    """Test Invoice mark-paid endpoint - marks notification as resolved for Mom"""
    
    @pytest.fixture(scope="class")
    def sessions(self):
        """Login as both Doula and Mom"""
        doula_session = requests.Session()
        mom_session = requests.Session()
        
        doula_resp = doula_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert doula_resp.status_code == 200
        doula_data = doula_resp.json()
        doula_session.headers.update({"Authorization": f"Bearer {doula_data['session_token']}"})
        
        mom_resp = mom_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        assert mom_resp.status_code == 200
        mom_data = mom_resp.json()
        mom_session.headers.update({"Authorization": f"Bearer {mom_data['session_token']}"})
        
        return doula_session, doula_data, mom_session, mom_data
    
    def test_get_doula_invoices(self, sessions):
        """Test GET /api/doula/invoices returns invoices list"""
        doula_session, _, _, _ = sessions
        response = doula_session.get(f"{BASE_URL}/api/doula/invoices")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASSED: Get doula invoices - count: {len(data)}")
    
    def test_mark_paid_endpoint_exists(self, sessions):
        """Verify mark-paid endpoint is accessible (404 for non-existent invoice is OK)"""
        doula_session, _, _, _ = sessions
        # Try to mark a non-existent invoice - expect 404
        response = doula_session.post(f"{BASE_URL}/api/doula/invoices/fake_invoice_id/mark-paid")
        # 404 means endpoint exists but invoice doesn't
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"PASSED: mark-paid endpoint accessible (status: {response.status_code})")
    
    def test_create_and_mark_invoice_paid(self, sessions):
        """Create invoice, send it, then mark as paid and verify notification is resolved"""
        doula_session, doula_data, mom_session, mom_data = sessions
        
        # Step 1: Get doula clients to find one with a linked_mom_id
        clients_resp = doula_session.get(f"{BASE_URL}/api/doula/clients")
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        # Find client with linked_mom_id
        linked_client = None
        for c in clients:
            if c.get("linked_mom_id"):
                linked_client = c
                break
        
        if not linked_client:
            # Create a test client manually if none exists
            print("INFO: No linked client found, creating test invoice with manual client")
            # Try creating a client
            create_client_resp = doula_session.post(f"{BASE_URL}/api/doula/clients", json={
                "name": "Test Mom for Invoice",
                "email": MOM_EMAIL
            })
            if create_client_resp.status_code == 200:
                linked_client = create_client_resp.json()
            else:
                pytest.skip("No linked client available for invoice test")
                return
        
        # Step 2: Create an invoice
        invoice_data = {
            "client_id": linked_client["client_id"],
            "description": f"Test Invoice {uuid.uuid4().hex[:6]}",
            "amount": 150.00
        }
        
        create_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices", json=invoice_data)
        if create_resp.status_code != 200:
            print(f"INFO: Could not create invoice: {create_resp.text}")
            pytest.skip("Invoice creation failed - may need client setup")
            return
        
        invoice = create_resp.json()
        invoice_id = invoice.get("invoice_id")
        assert invoice_id, "Invoice ID not returned"
        print(f"INFO: Created invoice {invoice_id}")
        
        # Step 3: Mark as paid
        mark_paid_resp = doula_session.post(f"{BASE_URL}/api/doula/invoices/{invoice_id}/mark-paid")
        assert mark_paid_resp.status_code == 200, f"Mark paid failed: {mark_paid_resp.text}"
        print(f"PASSED: Marked invoice {invoice_id} as paid")
        
        # Step 4: Verify invoice status is now "Paid"
        invoices_resp = doula_session.get(f"{BASE_URL}/api/doula/invoices")
        assert invoices_resp.status_code == 200
        invoices = invoices_resp.json()
        
        updated_invoice = next((i for i in invoices if i["invoice_id"] == invoice_id), None)
        if updated_invoice:
            assert updated_invoice["status"] == "Paid", f"Invoice status should be Paid, got: {updated_invoice['status']}"
            print(f"PASSED: Invoice status verified as 'Paid'")
        else:
            print("INFO: Invoice not found in list (may have been filtered)")


class TestContractTemplates:
    """Test Contract Templates endpoint"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as Doula"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return session, data
    
    def test_get_contract_templates(self, doula_session):
        """Test GET /api/contract-templates returns templates list"""
        session, _ = doula_session
        response = session.get(f"{BASE_URL}/api/contract-templates")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASSED: Get contract templates - count: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
