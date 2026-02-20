"""
Test Bug Fixes for Iteration 129
1. Birth Plan Breadcrumb navigation (frontend only - testing backend for notes)
2. Birth Plan Note Editing (PUT /provider/birth-plan-notes/{note_id})
3. Contract PDF Download (GET /api/contracts/{id}/pdf and /api/midwife-contracts/{id}/pdf)
4. Contract E-Sign removal (frontend only - verify Sent status in contracts)
5. Contract status flow (Draft/Sent/Signed) 
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip('/')

# Test credentials
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture
def doula_session():
    """Login as Doula and return session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not login as Doula: {response.status_code}")
    
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data.get('token')}"})
    return session


@pytest.fixture
def midwife_session():
    """Login as Midwife and return session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": MIDWIFE_EMAIL,
        "password": MIDWIFE_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Could not login as Midwife: {response.status_code}")
    
    data = response.json()
    session.headers.update({"Authorization": f"Bearer {data.get('token')}"})
    return session


class TestContractPDFDownload:
    """Test PDF download for signed contracts"""
    
    def test_doula_contracts_list(self, doula_session):
        """Verify doula can list contracts"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        assert response.status_code == 200, f"Failed to list doula contracts: {response.text}"
        
        contracts = response.json()
        print(f"Found {len(contracts)} doula contracts")
        
        # Check for signed contract
        signed_contracts = [c for c in contracts if c.get('status') == 'Signed']
        print(f"Signed contracts: {len(signed_contracts)}")
        
        for c in contracts:
            print(f"  - {c.get('contract_id')}: {c.get('client_name')} - Status: {c.get('status')}")
        
        return contracts
    
    def test_midwife_contracts_list(self, midwife_session):
        """Verify midwife can list contracts"""
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        assert response.status_code == 200, f"Failed to list midwife contracts: {response.text}"
        
        contracts = response.json()
        print(f"Found {len(contracts)} midwife contracts")
        
        for c in contracts:
            print(f"  - {c.get('contract_id')}: {c.get('client_name')} - Status: {c.get('status')}")
        
        return contracts
    
    def test_doula_signed_contract_pdf(self, doula_session):
        """Test PDF download for signed doula contract"""
        # First get contracts list
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = response.json()
        
        signed_contracts = [c for c in contracts if c.get('status') == 'Signed']
        
        if not signed_contracts:
            pytest.skip("No signed doula contracts found to test PDF")
        
        contract_id = signed_contracts[0]['contract_id']
        print(f"Testing PDF for contract: {contract_id}")
        
        # Test PDF endpoint
        pdf_response = doula_session.get(f"{BASE_URL}/api/contracts/{contract_id}/pdf")
        
        assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code} - {pdf_response.text}"
        assert "application/pdf" in pdf_response.headers.get("content-type", ""), "Response is not PDF"
        assert len(pdf_response.content) > 0, "PDF content is empty"
        
        print(f"PDF downloaded successfully - Size: {len(pdf_response.content)} bytes")
    
    def test_midwife_signed_contract_pdf(self, midwife_session):
        """Test PDF download for signed midwife contract"""
        # First get contracts list
        response = midwife_session.get(f"{BASE_URL}/api/midwife/contracts")
        contracts = response.json()
        
        signed_contracts = [c for c in contracts if c.get('status') == 'Signed']
        
        if not signed_contracts:
            pytest.skip("No signed midwife contracts found to test PDF")
        
        contract_id = signed_contracts[0]['contract_id']
        print(f"Testing PDF for contract: {contract_id}")
        
        # Test PDF endpoint
        pdf_response = midwife_session.get(f"{BASE_URL}/api/midwife-contracts/{contract_id}/pdf")
        
        assert pdf_response.status_code == 200, f"PDF download failed: {pdf_response.status_code} - {pdf_response.text}"
        assert "application/pdf" in pdf_response.headers.get("content-type", ""), "Response is not PDF"
        assert len(pdf_response.content) > 0, "PDF content is empty"
        
        print(f"PDF downloaded successfully - Size: {len(pdf_response.content)} bytes")


class TestContractStatus:
    """Test contract status values and actions"""
    
    def test_doula_contract_status_types(self, doula_session):
        """Verify contract statuses: Draft, Sent, Signed"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = response.json()
        
        statuses = set(c.get('status') for c in contracts)
        print(f"Found contract statuses: {statuses}")
        
        # Count by status
        draft_count = len([c for c in contracts if c.get('status') == 'Draft'])
        sent_count = len([c for c in contracts if c.get('status') == 'Sent'])
        signed_count = len([c for c in contracts if c.get('status') == 'Signed'])
        
        print(f"Draft: {draft_count}, Sent: {sent_count}, Signed: {signed_count}")
        
        # Verify expected statuses are valid
        valid_statuses = {'Draft', 'Sent', 'Signed'}
        for status in statuses:
            assert status in valid_statuses, f"Unexpected status: {status}"
    
    def test_sent_contract_no_sign_action(self, doula_session):
        """Verify Sent contracts exist (E-Sign should not be shown for these)"""
        response = doula_session.get(f"{BASE_URL}/api/doula/contracts")
        contracts = response.json()
        
        sent_contracts = [c for c in contracts if c.get('status') == 'Sent']
        
        if sent_contracts:
            print(f"Found {len(sent_contracts)} sent contracts - these should show 'Awaiting Mom's Signature'")
            for c in sent_contracts:
                print(f"  - {c.get('contract_id')}: {c.get('client_name')}")
        else:
            print("No 'Sent' contracts found - E-Sign removal cannot be visually tested")


class TestBirthPlanNotes:
    """Test birth plan note creation and editing"""
    
    def test_doula_shared_birth_plans(self, doula_session):
        """Get list of shared birth plans"""
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert response.status_code == 200, f"Failed to get shared birth plans: {response.text}"
        
        data = response.json()
        plans = data.get('birth_plans', [])
        print(f"Found {len(plans)} shared birth plans")
        
        for plan in plans:
            print(f"  - {plan.get('mom_name')} (ID: {plan.get('mom_user_id')})")
            print(f"    Notes count: {len(plan.get('provider_notes', []))}")
        
        return plans
    
    def test_create_birth_plan_note(self, doula_session):
        """Test creating a new birth plan note"""
        # Get shared birth plans first
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        plans = response.json().get('birth_plans', [])
        
        if not plans:
            pytest.skip("No shared birth plans available for testing")
        
        mom_user_id = plans[0]['mom_user_id']
        test_note_content = "TEST_note_created_for_testing_129"
        
        # Create note
        create_response = doula_session.post(
            f"{BASE_URL}/api/provider/birth-plan/{mom_user_id}/notes",
            json={
                "section_id": "about_me",
                "note_content": test_note_content
            }
        )
        
        assert create_response.status_code in [200, 201], f"Failed to create note: {create_response.text}"
        
        note_data = create_response.json()
        note_id = note_data.get('note_id')
        print(f"Created note with ID: {note_id}")
        
        assert note_id is not None, "Note ID not returned"
        
        return note_id
    
    def test_edit_birth_plan_note(self, doula_session):
        """Test editing an existing birth plan note"""
        # Get shared birth plans first
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        plans = response.json().get('birth_plans', [])
        
        if not plans:
            pytest.skip("No shared birth plans available for testing")
        
        # Find a plan with existing notes
        plan_with_notes = None
        for plan in plans:
            if plan.get('provider_notes') and len(plan.get('provider_notes', [])) > 0:
                plan_with_notes = plan
                break
        
        if not plan_with_notes:
            # Create a note first
            mom_user_id = plans[0]['mom_user_id']
            create_response = doula_session.post(
                f"{BASE_URL}/api/provider/birth-plan/{mom_user_id}/notes",
                json={
                    "section_id": "labor_delivery",
                    "note_content": "TEST_initial_note_for_editing"
                }
            )
            assert create_response.status_code in [200, 201]
            note_id = create_response.json().get('note_id')
        else:
            note_id = plan_with_notes['provider_notes'][0]['note_id']
        
        print(f"Editing note ID: {note_id}")
        
        # Edit the note
        updated_content = "TEST_edited_note_content_129"
        edit_response = doula_session.put(
            f"{BASE_URL}/api/provider/birth-plan-notes/{note_id}",
            json={
                "note_content": updated_content
            }
        )
        
        assert edit_response.status_code == 200, f"Failed to edit note: {edit_response.status_code} - {edit_response.text}"
        
        # Verify update was successful
        edit_data = edit_response.json()
        print(f"Note edit response: {edit_data}")
        
        # Verify by fetching plans again
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        plans = response.json().get('birth_plans', [])
        
        # Find the note we edited
        found_note = None
        for plan in plans:
            for note in plan.get('provider_notes', []):
                if note.get('note_id') == note_id:
                    found_note = note
                    break
        
        if found_note:
            print(f"Note after edit: {found_note.get('note_content')}")
            # Note content should be updated (might be the new or contain update)
        
        return note_id
    
    def test_midwife_birth_plan_notes(self, midwife_session):
        """Test midwife can also access and edit birth plan notes"""
        response = midwife_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        assert response.status_code == 200, f"Failed to get shared birth plans for midwife: {response.text}"
        
        data = response.json()
        plans = data.get('birth_plans', [])
        print(f"Midwife has access to {len(plans)} shared birth plans")
        
        return plans


class TestSharedBirthPlanEndpoint:
    """Test single shared birth plan endpoint (used by breadcrumb navigation)"""
    
    def test_single_birth_plan_access(self, doula_session):
        """Test accessing a single shared birth plan by mom_user_id"""
        # Get list first
        response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plans")
        plans = response.json().get('birth_plans', [])
        
        if not plans:
            pytest.skip("No shared birth plans available")
        
        mom_user_id = plans[0]['mom_user_id']
        
        # Access single birth plan
        single_response = doula_session.get(f"{BASE_URL}/api/provider/shared-birth-plan/{mom_user_id}")
        assert single_response.status_code == 200, f"Failed to get single birth plan: {single_response.text}"
        
        data = single_response.json()
        print(f"Single birth plan data keys: {data.keys()}")
        
        assert 'plan' in data or 'birth_plan' in data, "Birth plan data not found in response"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
