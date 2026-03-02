"""
Test file for True Joy Birthing Bug Fixes - Iteration 140

Tests:
1. Accept Lead should make Mom an Active Client in unified clients collection
2. Birth plan completion percentage should be accurate when data is deleted  
3. Birth Location formatting on lead details (two lines) - UI test via Playwright
4. Marketplace button text should be 'Request Consult' - UI test via Playwright

This file focuses on backend API tests.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://tjb-preview-stable.preview.emergentagent.com')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


class TestHelpers:
    """Helper methods for authentication and API calls"""
    
    @staticmethod
    def login(session, email, password):
        """Login and get session token"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
            return data
        return None
    
    @staticmethod
    def logout(session):
        """Clear session headers"""
        session.headers.pop("Authorization", None)


class TestLeadToClientConversion:
    """
    Bug Fix #1: Accept Lead should make Mom an Active Client
    
    When a provider accepts a lead, the Mom should become an Active Client 
    in the unified clients collection (db.clients), not doula_clients/midwife_clients.
    """
    
    def test_create_lead_and_convert_to_client(self):
        """Test the full flow: Mom requests consultation -> Doula converts to client"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Step 1: Login as Mom
        mom_data = TestHelpers.login(session, MOM_EMAIL, MOM_PASSWORD)
        assert mom_data is not None, "Mom login failed"
        mom_user_id = mom_data["user_id"]
        print(f"✓ Mom logged in: {mom_user_id}")
        
        # Step 2: Login as Doula to get provider_id
        TestHelpers.logout(session)
        doula_data = TestHelpers.login(session, DOULA_EMAIL, DOULA_PASSWORD)
        assert doula_data is not None, "Doula login failed"
        doula_provider_id = doula_data["user_id"]
        print(f"✓ Doula logged in: {doula_provider_id}")
        
        # Step 3: Re-login as Mom and request consultation
        TestHelpers.logout(session)
        TestHelpers.login(session, MOM_EMAIL, MOM_PASSWORD)
        
        # Check if there's already an active consultation request
        existing_requests = session.get(f"{BASE_URL}/api/leads/my-consultation-requests")
        if existing_requests.status_code == 200:
            requests_list = existing_requests.json()
            for req in requests_list:
                if req.get("provider_id") == doula_provider_id and req.get("status") not in ["declined", "not_a_fit", "converted_to_client"]:
                    print(f"✓ Found existing consultation request: {req.get('lead_id')} with status {req.get('status')}")
                    lead_id = req.get("lead_id")
                    break
            else:
                # No existing request, create new one
                consultation_response = session.post(f"{BASE_URL}/api/leads/request-consultation", json={
                    "provider_id": doula_provider_id,
                    "message": "Test consultation request for bug fix testing"
                })
                
                if consultation_response.status_code == 200:
                    lead_data = consultation_response.json()
                    lead_id = lead_data["lead"]["lead_id"]
                    print(f"✓ Created new consultation request: {lead_id}")
                elif consultation_response.status_code == 400 and "already" in consultation_response.text.lower():
                    # Already a client or pending - need to find the lead_id
                    print("Already have a consultation request, checking leads...")
                    existing_requests = session.get(f"{BASE_URL}/api/leads/my-consultation-requests").json()
                    lead_id = None
                    for req in existing_requests:
                        if req.get("provider_id") == doula_provider_id:
                            lead_id = req.get("lead_id")
                            print(f"✓ Found existing lead: {lead_id} with status {req.get('status')}")
                            break
                else:
                    pytest.skip(f"Could not create consultation request: {consultation_response.text}")
        else:
            pytest.skip("Could not check existing consultation requests")
        
        # Step 4: Login as Doula and convert lead to client
        TestHelpers.logout(session)
        TestHelpers.login(session, DOULA_EMAIL, DOULA_PASSWORD)
        
        # First check if lead is already converted
        leads_response = session.get(f"{BASE_URL}/api/leads")
        if leads_response.status_code == 200:
            leads = leads_response.json()
            for lead in leads:
                if lead.get("lead_id") == lead_id:
                    if lead.get("status") == "converted_to_client":
                        print(f"✓ Lead {lead_id} is already converted to client")
                        # Verify the client exists in unified clients collection
                        clients_response = session.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
                        assert clients_response.status_code == 200, f"Failed to get clients: {clients_response.text}"
                        clients = clients_response.json()
                        
                        # Find the client linked to this mom
                        client_found = False
                        for client in clients:
                            if client.get("linked_mom_id") == mom_user_id:
                                client_found = True
                                print(f"✓ VERIFIED: Client exists in unified collection with client_id: {client.get('client_id')}")
                                print(f"  - Status: {client.get('status')}")
                                print(f"  - is_active: {client.get('is_active')}")
                                assert client.get("status") in ["Active", "Prenatal"], f"Expected Active/Prenatal status, got {client.get('status')}"
                                break
                        
                        assert client_found, f"Client for mom {mom_user_id} not found in unified clients collection!"
                        return  # Test passed
                    break
        
        # Convert the lead to client
        convert_response = session.post(f"{BASE_URL}/api/leads/{lead_id}/convert-to-client", json={
            "initial_status": "Active"
        })
        
        # If already converted, that's fine
        if convert_response.status_code == 400 and "already" in convert_response.text.lower():
            print("Lead already converted, verifying client exists...")
        elif convert_response.status_code == 200:
            convert_data = convert_response.json()
            print(f"✓ Lead converted to client: {convert_data.get('client_id')}")
        else:
            pytest.fail(f"Failed to convert lead: {convert_response.status_code} - {convert_response.text}")
        
        # Step 5: VERIFY - Check that client exists in unified clients collection
        clients_response = session.get(f"{BASE_URL}/api/provider/clients?include_inactive=true")
        assert clients_response.status_code == 200, f"Failed to get clients: {clients_response.text}"
        clients = clients_response.json()
        
        # Find the client linked to this mom
        client_found = False
        for client in clients:
            if client.get("linked_mom_id") == mom_user_id:
                client_found = True
                print(f"✓ VERIFIED: Client exists in unified collection with client_id: {client.get('client_id')}")
                print(f"  - Status: {client.get('status')}")
                print(f"  - is_active: {client.get('is_active')}")
                print(f"  - Name: {client.get('name')}")
                print(f"  - Provider ID: {client.get('provider_id')}")
                assert client.get("status") in ["Active", "Prenatal"], f"Expected Active/Prenatal status, got {client.get('status')}"
                break
        
        assert client_found, f"BUG NOT FIXED: Client for mom {mom_user_id} not found in unified clients collection!"


class TestBirthPlanCompletion:
    """
    Bug Fix #2: Birth plan completion percentage should be accurate when data is deleted
    
    When a birth plan section has empty data (data={}), the completion percentage
    should reflect that - not count it as complete.
    """
    
    def test_birth_plan_completion_accuracy(self):
        """Test that clearing birth plan data reduces completion percentage"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as Mom
        mom_data = TestHelpers.login(session, MOM_EMAIL, MOM_PASSWORD)
        assert mom_data is not None, "Mom login failed"
        print(f"✓ Mom logged in: {mom_data['user_id']}")
        
        # Get current birth plan
        bp_response = session.get(f"{BASE_URL}/api/birth-plan")
        assert bp_response.status_code == 200, f"Failed to get birth plan: {bp_response.text}"
        birth_plan = bp_response.json()
        
        initial_completion = birth_plan.get("completion_percentage", 0)
        print(f"✓ Current birth plan completion: {initial_completion}%")
        
        # Find a section with data to clear
        sections = birth_plan.get("sections", [])
        section_to_test = None
        section_original_data = None
        
        for section in sections:
            data = section.get("data", {})
            if data and any(v for v in data.values() if v is not None and v != "" and v != []):
                section_to_test = section.get("section_id")
                section_original_data = data.copy()
                print(f"✓ Found section with data to test: {section_to_test}")
                break
        
        if not section_to_test:
            # Add data to a section first
            section_to_test = "about_me"
            add_response = session.put(f"{BASE_URL}/api/birth-plan/section/{section_to_test}", json={
                "data": {
                    "testField": "Test Value for Bug Fix Testing",
                    "dueDate": "2025-06-01"
                }
            })
            assert add_response.status_code == 200, f"Failed to add test data: {add_response.text}"
            print(f"✓ Added test data to section: {section_to_test}")
            
            # Get updated completion
            bp_response = session.get(f"{BASE_URL}/api/birth-plan")
            birth_plan = bp_response.json()
            initial_completion = birth_plan.get("completion_percentage", 0)
            print(f"✓ Updated completion after adding data: {initial_completion}%")
            section_original_data = {"testField": "Test Value for Bug Fix Testing", "dueDate": "2025-06-01"}
        
        # Clear the section data
        clear_response = session.put(f"{BASE_URL}/api/birth-plan/section/{section_to_test}", json={
            "data": {}
        })
        assert clear_response.status_code == 200, f"Failed to clear section: {clear_response.text}"
        clear_data = clear_response.json()
        new_completion = clear_data.get("completion_percentage", 0)
        
        print(f"✓ Completion after clearing section: {new_completion}%")
        
        # Verify completion percentage dropped
        if initial_completion > 0:
            assert new_completion < initial_completion, \
                f"BUG NOT FIXED: Completion should decrease when data is cleared. Was {initial_completion}%, now {new_completion}%"
            print(f"✓ VERIFIED: Completion percentage dropped from {initial_completion}% to {new_completion}%")
        else:
            print(f"✓ Initial completion was already 0%, clearing section keeps it at 0%")
        
        # Restore original data if we had any
        if section_original_data:
            restore_response = session.put(f"{BASE_URL}/api/birth-plan/section/{section_to_test}", json={
                "data": section_original_data
            })
            if restore_response.status_code == 200:
                print(f"✓ Restored original data to section: {section_to_test}")
    
    def test_completion_counts_only_meaningful_data(self):
        """Test that only sections with meaningful data are counted as complete"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as Mom
        mom_data = TestHelpers.login(session, MOM_EMAIL, MOM_PASSWORD)
        assert mom_data is not None, "Mom login failed"
        
        # Get birth plan
        bp_response = session.get(f"{BASE_URL}/api/birth-plan")
        assert bp_response.status_code == 200
        birth_plan = bp_response.json()
        
        sections = birth_plan.get("sections", [])
        total_sections = len(sections)
        completed_count = 0
        
        for section in sections:
            data = section.get("data", {})
            # Check for meaningful data (not empty, not null, not empty string, not empty array)
            has_meaningful_data = data and any(
                v for v in data.values() if v is not None and v != "" and v != []
            )
            if has_meaningful_data:
                completed_count += 1
                print(f"  - {section.get('section_id')}: Has meaningful data")
            else:
                print(f"  - {section.get('section_id')}: Empty or no data")
        
        expected_percentage = (completed_count / total_sections) * 100 if total_sections > 0 else 0
        actual_percentage = birth_plan.get("completion_percentage", 0)
        
        print(f"\n✓ Expected completion: {expected_percentage:.1f}% ({completed_count}/{total_sections} sections)")
        print(f"✓ Actual completion: {actual_percentage:.1f}%")
        
        # Allow small floating point differences
        assert abs(expected_percentage - actual_percentage) < 0.1, \
            f"Completion percentage mismatch: expected {expected_percentage:.1f}%, got {actual_percentage:.1f}%"


class TestLeadsEndpointBirthLocation:
    """
    Bug Fix #3: Birth Location formatting on lead details
    
    This is a UI test, but we can verify the API returns the birth_plan_location field correctly.
    """
    
    def test_leads_return_birth_plan_location(self):
        """Test that leads endpoint returns birth_plan_location field"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as Doula
        doula_data = TestHelpers.login(session, DOULA_EMAIL, DOULA_PASSWORD)
        assert doula_data is not None, "Doula login failed"
        
        # Get leads
        leads_response = session.get(f"{BASE_URL}/api/leads")
        assert leads_response.status_code == 200, f"Failed to get leads: {leads_response.text}"
        leads = leads_response.json()
        
        print(f"✓ Found {len(leads)} leads")
        
        # Check if any leads have birth_plan_location
        for lead in leads:
            location = lead.get("birth_plan_location")
            if location:
                print(f"✓ Lead {lead.get('lead_id')} has birth_plan_location: {location}")
                # Verify it's returned as a string (UI will handle formatting)
                assert isinstance(location, str), f"birth_plan_location should be string, got {type(location)}"
            else:
                print(f"  Lead {lead.get('lead_id')} has no birth_plan_location")
        
        print("✓ Leads endpoint correctly returns birth_plan_location field (UI formatting is separate)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
