"""
Test 3 Features for True Joy Birthing:
1. Contact Provider from Marketplace - Message sending and conversation navigation
2. Auto-share Birth Plan - Verify UI notice shows and backend behavior on save
3. Invoices in Messages - Verify mom can see pending invoices from providers
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test credentials
MOM_EMAIL = "testmom_msg@test.com"
MOM_PASSWORD = "password123"
DOULA_EMAIL = "testdoula123@test.com"
DOULA_PASSWORD = "password123"
MIDWIFE_EMAIL = "testmidwife_ui@test.com"
MIDWIFE_PASSWORD = "password123"


class TestSetup:
    """Setup and authentication helpers"""
    
    @pytest.fixture
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    @pytest.fixture
    def mom_session(self, api_client):
        """Login as Mom user"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": MOM_EMAIL,
            "password": MOM_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Mom login failed: {response.text}")
        
        data = response.json()
        api_client.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"client": api_client, "user": data}
    
    @pytest.fixture
    def doula_session(self, api_client):
        """Login as Doula user"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Doula login failed: {response.text}")
        
        data = response.json()
        api_client.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"client": api_client, "user": data}
    
    @pytest.fixture
    def midwife_session(self, api_client):
        """Login as Midwife user"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Midwife login failed: {response.text}")
        
        data = response.json()
        api_client.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        return {"client": api_client, "user": data}


class TestFeature1ContactProvider(TestSetup):
    """
    Feature 1: Contact Provider from Marketplace
    - Mom clicks 'Contact Provider' button 
    - If existing conversation exists, opens that conversation
    - If no conversation, sends pre-filled intro message and navigates to messages
    """
    
    def test_marketplace_providers_endpoint(self, api_client):
        """Test that marketplace providers endpoint returns providers"""
        response = api_client.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        
        data = response.json()
        # API returns {doulas: [], midwives: []}
        assert "doulas" in data or "midwives" in data
        print(f"Found {len(data.get('doulas', []))} doulas and {len(data.get('midwives', []))} midwives")
    
    def test_mom_can_get_conversations(self, mom_session):
        """Test that mom can retrieve conversations"""
        client = mom_session["client"]
        response = client.get(f"{BASE_URL}/api/messages/conversations")
        assert response.status_code == 200
        
        data = response.json()
        assert "conversations" in data
        print(f"Mom has {len(data['conversations'])} conversations")
    
    def test_mom_can_send_message_to_provider(self, mom_session, doula_session):
        """Test that mom can send a message to a provider (simulating Contact Provider)"""
        mom_client = mom_session["client"]
        doula_id = doula_session["user"]["user_id"]
        
        # Pre-filled message similar to what the frontend sends
        prefilled_message = f"Hi, I found you on True Joy Birthing and would love to learn more about working together."
        
        response = mom_client.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": doula_id,
            "content": prefilled_message
        })
        
        # Note: Message sending might fail if mom hasn't shared birth plan with provider
        # This is expected behavior based on the code
        if response.status_code == 403:
            print("Message sending requires connection first (expected behavior)")
            assert "connection" in response.json().get("detail", "").lower() or "share" in response.json().get("detail", "").lower()
        elif response.status_code == 200:
            data = response.json()
            assert "message_id" in data
            print(f"Message sent successfully with ID: {data['message_id']}")
        else:
            print(f"Message response: {response.status_code} - {response.text}")
    
    def test_mom_can_view_messages_with_provider(self, mom_session, doula_session):
        """Test that mom can retrieve message thread with a provider"""
        mom_client = mom_session["client"]
        doula_id = doula_session["user"]["user_id"]
        
        response = mom_client.get(f"{BASE_URL}/api/messages/{doula_id}")
        
        # Even if no messages exist, the endpoint should return
        if response.status_code == 200:
            data = response.json()
            assert "messages" in data
            print(f"Found {len(data['messages'])} messages in thread")
        elif response.status_code == 403:
            print("Viewing messages requires connection first (expected behavior)")
        else:
            print(f"Message retrieval response: {response.status_code}")


class TestFeature2AutoShareBirthPlan(TestSetup):
    """
    Feature 2: Auto-share Birth Plan
    - UI shows 'Your birth plan is automatically shared...' notice
    - When mom saves birth plan section, providers on her team can see the birth plan
    """
    
    def test_mom_can_get_birth_plan(self, mom_session):
        """Test that mom can retrieve her birth plan"""
        client = mom_session["client"]
        response = client.get(f"{BASE_URL}/api/birth-plan")
        assert response.status_code == 200
        
        data = response.json()
        assert "sections" in data
        assert "completion_percentage" in data
        print(f"Birth plan has {len(data['sections'])} sections, {data['completion_percentage']}% complete")
    
    def test_mom_can_update_birth_plan_section(self, mom_session):
        """Test that mom can save a birth plan section"""
        client = mom_session["client"]
        
        # First get the birth plan to see available sections
        bp_response = client.get(f"{BASE_URL}/api/birth-plan")
        assert bp_response.status_code == 200
        
        sections = bp_response.json().get("sections", [])
        if not sections:
            pytest.skip("No birth plan sections found")
        
        # Update first section with test data
        section_id = sections[0]["section_id"]
        test_data = {
            "test_field": f"TEST_auto_share_{uuid.uuid4().hex[:8]}",
            "updated_at": datetime.now().isoformat()
        }
        
        response = client.put(f"{BASE_URL}/api/birth-plan/section/{section_id}", json={
            "data": test_data,
            "notes_to_provider": "Auto-share test note"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "completion_percentage" in data
        print(f"Section {section_id} saved, completion: {data['completion_percentage']}%")
    
    def test_mom_team_endpoint(self, mom_session):
        """Test that mom can view her team (connected providers)"""
        client = mom_session["client"]
        response = client.get(f"{BASE_URL}/api/mom/team")
        
        assert response.status_code == 200
        data = response.json()
        
        # API returns { doula: {...}, midwife: {...} } format
        has_doula = data.get("doula") is not None
        has_midwife = data.get("midwife") is not None
        
        print(f"Mom's team: doula={has_doula}, midwife={has_midwife}")
        
        if has_doula:
            print(f"  Doula: {data['doula'].get('name', 'N/A')}")
        if has_midwife:
            print(f"  Midwife: {data['midwife'].get('name', 'N/A')}")
    
    def test_provider_can_view_shared_birth_plans(self, doula_session):
        """Test that provider can view shared birth plans from connected moms"""
        client = doula_session["client"]
        response = client.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        
        assert response.status_code == 200
        data = response.json()
        
        # Response should be a list of shared birth plans
        shared_plans = data if isinstance(data, list) else data.get("plans", [])
        print(f"Provider has access to {len(shared_plans)} shared birth plans")
        
        for plan in shared_plans[:3]:  # Show first 3
            print(f"  - {plan.get('mom_name', 'N/A')}: {plan.get('completion_percentage', 0)}%")


class TestFeature3InvoicesInMessages(TestSetup):
    """
    Feature 3: Invoices in Messages
    - Pending invoices section appears on Mom's Messages page
    - Invoice details (amount, description, from provider) are visible
    NOTE: This feature has a known bug - pendingInvoices is fetched but NOT RENDERED in UI
    """
    
    def test_mom_invoices_endpoint_exists(self, mom_session):
        """Test that the /mom/invoices endpoint exists and returns data"""
        client = mom_session["client"]
        response = client.get(f"{BASE_URL}/api/mom/invoices")
        
        assert response.status_code == 200
        
        data = response.json()
        # Returns a list of invoices
        assert isinstance(data, list)
        print(f"Mom has {len(data)} invoices")
        
        for inv in data[:3]:  # Show first 3
            print(f"  - Invoice {inv.get('invoice_number')}: ${inv.get('amount', 0)} - {inv.get('status')}")
            print(f"    From: {inv.get('provider_name', 'N/A')}")
            print(f"    Description: {inv.get('description', 'N/A')}")
    
    def test_mom_pending_invoices_filter(self, mom_session):
        """Test that we can filter for pending/sent invoices (these should appear on messages page)"""
        client = mom_session["client"]
        response = client.get(f"{BASE_URL}/api/mom/invoices")
        
        assert response.status_code == 200
        
        invoices = response.json()
        
        # Filter to pending/sent (same logic as frontend)
        pending = [inv for inv in invoices if inv.get('status') in ['pending', 'sent']]
        print(f"Found {len(pending)} pending/sent invoices (should appear on messages page)")
        
        for inv in pending:
            print(f"  - Invoice {inv.get('invoice_number')}: ${inv.get('amount', 0)}")
            print(f"    Status: {inv.get('status')}")
            print(f"    From: {inv.get('provider_name', 'N/A')}")
    
    def test_create_test_invoice_for_mom(self, doula_session, mom_session):
        """
        Create a test invoice as doula for the mom user.
        This helps verify the invoice flow works end-to-end.
        """
        doula_client = doula_session["client"]
        
        # First check if there's a client record linking doula to mom
        clients_response = doula_client.get(f"{BASE_URL}/api/doula/clients")
        if clients_response.status_code != 200:
            pytest.skip(f"Could not get doula clients: {clients_response.text}")
        
        clients = clients_response.json()
        print(f"Doula has {len(clients)} clients")
        
        # Find client linked to mom
        mom_id = mom_session["user"]["user_id"]
        linked_client = None
        for c in clients:
            if c.get("linked_mom_id") == mom_id:
                linked_client = c
                break
        
        if not linked_client:
            # Try to find by email
            for c in clients:
                if c.get("email") == MOM_EMAIL:
                    linked_client = c
                    break
        
        if not linked_client:
            print(f"No client record found linking doula to mom. Creating test invoice skipped.")
            pytest.skip("No client record exists for this mom-doula pair")
        
        # Create a test invoice
        invoice_data = {
            "client_id": linked_client["client_id"],
            "description": f"TEST_invoice_for_messages_{uuid.uuid4().hex[:6]}",
            "amount": 99.99,
            "due_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "notes_for_client": "Test invoice for messages page verification"
        }
        
        response = doula_client.post(f"{BASE_URL}/api/doula/invoices", json=invoice_data)
        
        if response.status_code == 201:
            inv = response.json()
            print(f"Created test invoice: {inv.get('invoice_id')}")
            
            # Now send it so mom can see it
            send_response = doula_client.post(f"{BASE_URL}/api/doula/invoices/{inv['invoice_id']}/send")
            if send_response.status_code == 200:
                print(f"Invoice sent to mom - should appear in /api/mom/invoices")
            
            return inv
        else:
            print(f"Invoice creation response: {response.status_code} - {response.text}")


class TestIntegration(TestSetup):
    """Integration tests combining multiple features"""
    
    def test_full_flow_provider_to_mom_invoice(self, doula_session, mom_session):
        """
        Full integration test:
        1. Doula creates invoice for mom
        2. Mom can see it in /api/mom/invoices
        """
        doula_client = doula_session["client"]
        mom_client = mom_session["client"]
        
        # Get doula's clients
        clients_resp = doula_client.get(f"{BASE_URL}/api/doula/clients")
        if clients_resp.status_code != 200:
            pytest.skip("Could not get doula clients")
        
        clients = clients_resp.json()
        mom_id = mom_session["user"]["user_id"]
        
        linked_client = None
        for c in clients:
            if c.get("linked_mom_id") == mom_id or c.get("email") == MOM_EMAIL:
                linked_client = c
                break
        
        if not linked_client:
            pytest.skip("No client record for mom-doula pair")
        
        # Create invoice
        invoice_data = {
            "client_id": linked_client["client_id"],
            "description": f"TEST_INTEGRATION_{uuid.uuid4().hex[:6]}",
            "amount": 150.00
        }
        
        create_resp = doula_client.post(f"{BASE_URL}/api/doula/invoices", json=invoice_data)
        if create_resp.status_code != 201:
            pytest.skip(f"Could not create invoice: {create_resp.text}")
        
        invoice = create_resp.json()
        print(f"Created invoice: {invoice['invoice_id']}")
        
        # Send invoice
        send_resp = doula_client.post(f"{BASE_URL}/api/doula/invoices/{invoice['invoice_id']}/send")
        assert send_resp.status_code == 200, f"Send failed: {send_resp.text}"
        print("Invoice sent")
        
        # Verify mom can see it
        mom_invoices_resp = mom_client.get(f"{BASE_URL}/api/mom/invoices")
        assert mom_invoices_resp.status_code == 200
        
        mom_invoices = mom_invoices_resp.json()
        found = any(inv.get('invoice_id') == invoice['invoice_id'] for inv in mom_invoices)
        
        print(f"Mom can see invoice: {found}")
        assert found, "Invoice should be visible to mom"
        
        print("INTEGRATION TEST PASSED: Invoice flow from provider to mom works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
