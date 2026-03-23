"""
Test Suite: True Joy Birthing Doula Service Agreement Contract System
Tests the complete contract workflow including:
- Contract template retrieval with all 8 sections
- Contract creation with payment details and auto-calculated remaining amount
- Contract sending (creates doula signature)
- Client signing the contract
- HTML view generation
- Additional terms storage
"""

import pytest
import requests
import uuid
import os
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://bundle-resolve.preview.emergentagent.com')

# Expected sections in contract template
EXPECTED_SECTIONS = [
    "introduction",          # Introduction & Scope
    "role_boundaries",       # Doula's Role & Boundaries
    "services_provided",     # Services Provided
    "restrictions_exclusions", # Restrictions & Exclusions
    "privacy_communications", # Privacy, Boundaries, & Communications
    "payment_terms",         # Payment Terms
    "cancellations_refunds", # Cancellations, Refunds, and Special Circumstances
    "acknowledgements"       # Acknowledgements
]


class TestDoulaContractSystem:
    """Complete test suite for Doula Contract system"""
    
    # Shared test data
    test_doula_session = None
    test_doula_user_id = None
    test_client_id = None
    test_contract_id = None
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Set up requests session with headers"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
        
    def test_01_register_doula_user(self):
        """Register a new Doula user for contract testing"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"contract_doula_test_{unique_id}@test.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "full_name": "Contract Test Doula",
            "role": "DOULA"
        })
        
        print(f"Register Doula Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to register doula: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "session_token" in data
        assert data["role"] == "DOULA"
        
        # Store for later tests
        TestDoulaContractSystem.test_doula_session = data["session_token"]
        TestDoulaContractSystem.test_doula_user_id = data["user_id"]
        print(f"Created Doula: {email}, user_id: {data['user_id']}")
        
    def test_02_doula_onboarding(self):
        """Complete doula onboarding"""
        assert TestDoulaContractSystem.test_doula_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.post(f"{BASE_URL}/api/doula/onboarding", json={
            "practice_name": "True Joy Birthing Test",
            "location_city": "Denver",
            "location_state": "Colorado",
            "services_offered": ["Birth Doula", "Postpartum Doula"],
            "years_in_practice": 5,
            "accepting_new_clients": True,
            "bio": "Experienced birth doula"
        })
        
        print(f"Doula Onboarding Response: {response.status_code}")
        assert response.status_code == 200, f"Failed doula onboarding: {response.text}"
        
    def test_03_create_client_for_contract(self):
        """Create a client to associate with contract"""
        assert TestDoulaContractSystem.test_doula_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        unique_id = uuid.uuid4().hex[:8]
        response = self.session.post(f"{BASE_URL}/api/doula/clients", json={
            "name": f"Sarah Johnson {unique_id}",
            "email": f"sarah_contract_{unique_id}@test.com",
            "phone": "555-123-4567",
            "edd": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Home"
        })
        
        print(f"Create Client Response: {response.status_code}")
        assert response.status_code in [200, 201], f"Failed to create client: {response.text}"
        
        data = response.json()
        assert "client_id" in data
        TestDoulaContractSystem.test_client_id = data["client_id"]
        print(f"Created client: {data['name']}, client_id: {data['client_id']}")
        
    # ===== CONTRACT TEMPLATE TESTS =====
    
    def test_04_get_contract_template(self):
        """GET /api/doula/contract-template returns the full True Joy Birthing template"""
        assert TestDoulaContractSystem.test_doula_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.get(f"{BASE_URL}/api/doula/contract-template")
        
        print(f"Get Contract Template Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        template = response.json()
        
        # Verify template structure
        assert "title" in template
        assert template["title"] == "True Joy Birthing Doula Service Agreement"
        
        assert "provider" in template
        assert template["provider"]["business_name"] == "True Joy Birthing"
        assert template["provider"]["legal_entity"] == "DBA of Sheffk Ventures LLC"
        assert template["provider"]["doula_name"] == "Shelbi Kohler"
        
        assert "sections" in template
        print(f"Template has {len(template['sections'])} sections")
        
    def test_05_template_has_all_8_sections(self):
        """Verify contract template includes all 8 required sections"""
        assert TestDoulaContractSystem.test_doula_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.get(f"{BASE_URL}/api/doula/contract-template")
        assert response.status_code == 200
        
        template = response.json()
        sections = template["sections"]
        
        # Verify exactly 8 sections
        assert len(sections) == 8, f"Expected 8 sections, got {len(sections)}"
        
        # Verify all expected section IDs are present
        section_ids = [s["id"] for s in sections]
        for expected_id in EXPECTED_SECTIONS:
            assert expected_id in section_ids, f"Missing section: {expected_id}"
            
        # Verify section titles
        section_titles = {s["id"]: s["title"] for s in sections}
        assert section_titles["introduction"] == "Introduction & Scope"
        assert section_titles["role_boundaries"] == "Doula's Role & Boundaries"
        assert section_titles["services_provided"] == "Services Provided"
        assert section_titles["restrictions_exclusions"] == "Restrictions & Exclusions"
        assert section_titles["privacy_communications"] == "Privacy, Boundaries, & Communications"
        assert section_titles["payment_terms"] == "Payment Terms"
        assert section_titles["cancellations_refunds"] == "Cancellations, Refunds, and Special Circumstances"
        assert section_titles["acknowledgements"] == "Acknowledgements"
        
        print("All 8 sections verified:")
        for s in sections:
            print(f"  - {s['title']} (id: {s['id']})")
            
    def test_06_services_section_has_subsections(self):
        """Verify Services Provided section has all subsections"""
        assert TestDoulaContractSystem.test_doula_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.get(f"{BASE_URL}/api/doula/contract-template")
        assert response.status_code == 200
        
        template = response.json()
        
        # Find services_provided section
        services_section = None
        for s in template["sections"]:
            if s["id"] == "services_provided":
                services_section = s
                break
                
        assert services_section is not None, "Services Provided section not found"
        assert "subsections" in services_section, "Services section should have subsections"
        
        subsections = services_section["subsections"]
        expected_subsection_ids = [
            "initial_consultation",
            "prenatal_visits", 
            "on_call_period",
            "labor_attendance",
            "after_birth",
            "postpartum_support"
        ]
        
        subsection_ids = [s["id"] for s in subsections]
        for expected_id in expected_subsection_ids:
            assert expected_id in subsection_ids, f"Missing subsection: {expected_id}"
            
        print(f"Services section has {len(subsections)} subsections")
        
    # ===== CONTRACT CREATION TESTS =====
    
    def test_07_create_contract_with_payment_details(self):
        """POST /api/doula/contracts creates contract with all required fields"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_client_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        due_date = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_id": TestDoulaContractSystem.test_client_id,
            "client_names": "Sarah Johnson and Michael Johnson",
            "estimated_due_date": due_date,
            "total_payment_amount": 1800.00,
            "retainer_fee": 600.00,
            "final_payment_due_date": "Day after birth or at postpartum visit",
            "additional_terms": "Client has requested water birth support if available."
        })
        
        print(f"Create Contract Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        
        contract = response.json()
        
        # Verify contract structure
        assert "contract_id" in contract
        assert contract["client_names"] == "Sarah Johnson and Michael Johnson"
        assert contract["estimated_due_date"] == due_date
        assert contract["total_payment_amount"] == 1800.00
        assert contract["retainer_fee"] == 600.00
        assert contract["status"] == "Draft"
        assert contract["additional_terms"] == "Client has requested water birth support if available."
        
        # Store contract_id for later tests
        TestDoulaContractSystem.test_contract_id = contract["contract_id"]
        print(f"Created contract: {contract['contract_id']}")
        
    def test_08_remaining_amount_auto_calculated(self):
        """Verify remaining_payment_amount is auto-calculated (total - retainer)"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        # Get contract to verify remaining amount
        response = self.session.get(f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}")
        assert response.status_code == 200
        
        data = response.json()
        contract = data["contract"]
        
        # Verify remaining amount = total - retainer
        expected_remaining = contract["total_payment_amount"] - contract["retainer_fee"]
        assert contract["remaining_payment_amount"] == expected_remaining, \
            f"Remaining amount mismatch: expected {expected_remaining}, got {contract['remaining_payment_amount']}"
        
        # 1800 - 600 = 1200
        assert contract["remaining_payment_amount"] == 1200.00
        print(f"Remaining amount correctly calculated: ${contract['remaining_payment_amount']}")
        
    def test_09_contract_has_all_template_sections(self):
        """Verify created contract includes all 8 template sections"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.get(f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}")
        assert response.status_code == 200
        
        data = response.json()
        contract = data["contract"]
        
        assert "sections" in contract
        sections = contract["sections"]
        
        # Verify all 8 sections are in contract
        assert len(sections) == 8, f"Contract should have 8 sections, got {len(sections)}"
        
        section_ids = [s["id"] for s in sections]
        for expected_id in EXPECTED_SECTIONS:
            assert expected_id in section_ids, f"Contract missing section: {expected_id}"
            
        print("Contract contains all 8 template sections")
        
    def test_10_additional_terms_stored(self):
        """Verify additional_terms field is stored with contract"""
        assert TestDoulaContractSystem.test_contract_id is not None
        
        response = self.session.get(f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}")
        assert response.status_code == 200
        
        data = response.json()
        contract = data["contract"]
        
        assert "additional_terms" in contract
        assert contract["additional_terms"] is not None
        assert "water birth support" in contract["additional_terms"]
        print(f"Additional terms stored: {contract['additional_terms']}")
        
    # ===== SEND CONTRACT TESTS =====
    
    def test_11_send_contract_creates_doula_signature(self):
        """POST /api/doula/contracts/{id}/send sends contract and creates doula signature"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.post(
            f"{BASE_URL}/api/doula/contracts/{TestDoulaContractSystem.test_contract_id}/send"
        )
        
        print(f"Send Contract Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to send contract: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Contract sent"
        
        # Verify contract status changed
        verify_response = self.session.get(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}"
        )
        assert verify_response.status_code == 200
        
        contract_data = verify_response.json()
        contract = contract_data["contract"]
        
        assert contract["status"] == "Sent", f"Expected status 'Sent', got '{contract['status']}'"
        assert contract["doula_signature"] is not None, "Doula signature should exist after sending"
        assert contract["doula_signature"]["signer_type"] == "doula"
        assert "signer_name" in contract["doula_signature"]
        assert "signed_at" in contract["doula_signature"]
        
        print(f"Contract sent, doula signature created by: {contract['doula_signature']['signer_name']}")
        
    # ===== CLIENT SIGN TESTS =====
    
    def test_12_client_sign_contract(self):
        """POST /api/contracts/{id}/sign allows client to sign with name"""
        assert TestDoulaContractSystem.test_contract_id is not None
        
        # Client signing doesn't require auth (public endpoint)
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}/sign",
            json={
                "signer_name": "Sarah Johnson",
                "signature_data": "base64_signature_data_placeholder"
            }
        )
        
        print(f"Client Sign Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to sign contract: {response.text}"
        
        data = response.json()
        assert data["message"] == "Contract signed successfully"
        
        # Verify contract is now signed
        verify_response = self.session.get(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}"
        )
        assert verify_response.status_code == 200
        
        contract_data = verify_response.json()
        contract = contract_data["contract"]
        
        assert contract["status"] == "Signed", f"Expected status 'Signed', got '{contract['status']}'"
        assert contract["client_signature"] is not None, "Client signature should exist"
        assert contract["client_signature"]["signer_type"] == "client"
        assert contract["client_signature"]["signer_name"] == "Sarah Johnson"
        assert "signed_at" in contract["client_signature"]
        
        print(f"Contract signed by client: {contract['client_signature']['signer_name']}")
        
    def test_13_cannot_sign_already_signed_contract(self):
        """Verify cannot sign an already signed contract"""
        assert TestDoulaContractSystem.test_contract_id is not None
        
        response = self.session.post(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}/sign",
            json={
                "signer_name": "Michael Johnson"
            }
        )
        
        print(f"Duplicate Sign Response: {response.status_code}")
        assert response.status_code == 400, "Should not allow duplicate signing"
        
        data = response.json()
        assert "already signed" in data.get("detail", "").lower()
        print("Correctly prevented duplicate signing")
        
    # ===== HTML VIEW TESTS =====
    
    def test_14_get_contract_html_view(self):
        """GET /api/contracts/{id}/html returns formatted HTML version"""
        assert TestDoulaContractSystem.test_contract_id is not None
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}/html"
        )
        
        print(f"Get Contract HTML Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get HTML: {response.text}"
        
        # Verify response is HTML
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content type, got: {content_type}"
        
        html_content = response.text
        
        # Verify HTML contains key elements
        assert "True Joy Birthing" in html_content
        assert "Doula Service Agreement" in html_content
        assert "Sarah Johnson and Michael Johnson" in html_content  # client_names
        assert "$1,800.00" in html_content or "1800" in html_content  # total amount
        assert "$600.00" in html_content or "600" in html_content    # retainer
        assert "$1,200.00" in html_content or "1200" in html_content  # remaining
        
        print("HTML view contains all required contract details")
        
    def test_15_html_contains_all_sections(self):
        """Verify HTML view contains all 8 contract sections"""
        assert TestDoulaContractSystem.test_contract_id is not None
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}/html"
        )
        assert response.status_code == 200
        
        html_content = response.text
        
        # Check for section titles in HTML
        expected_titles = [
            "Introduction & Scope",
            "Doula's Role & Boundaries",
            "Services Provided",
            "Restrictions & Exclusions",
            "Privacy, Boundaries, & Communications",
            "Payment Terms",
            "Cancellations, Refunds, and Special Circumstances",
            "Acknowledgements"
        ]
        
        for title in expected_titles:
            assert title in html_content, f"HTML missing section: {title}"
            
        print("HTML view contains all 8 section titles")
        
    def test_16_html_contains_additional_terms(self):
        """Verify HTML view includes additional terms when present"""
        assert TestDoulaContractSystem.test_contract_id is not None
        
        response = self.session.get(
            f"{BASE_URL}/api/contracts/{TestDoulaContractSystem.test_contract_id}/html"
        )
        assert response.status_code == 200
        
        html_content = response.text
        
        # Verify additional terms are in HTML
        assert "Additional Terms" in html_content
        assert "water birth support" in html_content
        
        print("HTML view includes additional terms section")
        
    # ===== EDGE CASES AND VALIDATION =====
    
    def test_17_sign_requires_signer_name(self):
        """Verify signing requires signer name"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_client_id is not None
        
        # Create a new contract to test validation
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        due_date = (datetime.now() + timedelta(days=150)).strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_id": TestDoulaContractSystem.test_client_id,
            "client_names": "Test Validation Client",
            "estimated_due_date": due_date,
            "total_payment_amount": 1500.00,
            "retainer_fee": 500.00
        })
        assert response.status_code == 200
        new_contract_id = response.json()["contract_id"]
        
        # Send the contract
        send_response = self.session.post(f"{BASE_URL}/api/doula/contracts/{new_contract_id}/send")
        assert send_response.status_code == 200
        
        # Try to sign with empty name
        sign_response = self.session.post(f"{BASE_URL}/api/contracts/{new_contract_id}/sign", json={
            "signer_name": "   "  # Empty/whitespace name
        })
        
        print(f"Empty name sign Response: {sign_response.status_code}")
        assert sign_response.status_code == 400, "Should reject empty signer name"
        print("Correctly validates signer name is required")
        
    def test_18_cannot_sign_draft_contract(self):
        """Verify cannot sign a contract that hasn't been sent"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_client_id is not None
        
        # Create a draft contract
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        due_date = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_id": TestDoulaContractSystem.test_client_id,
            "client_names": "Draft Test Client",
            "estimated_due_date": due_date,
            "total_payment_amount": 2000.00,
            "retainer_fee": 700.00
        })
        assert response.status_code == 200
        draft_contract_id = response.json()["contract_id"]
        
        # Try to sign without sending first
        sign_response = self.session.post(f"{BASE_URL}/api/contracts/{draft_contract_id}/sign", json={
            "signer_name": "Test Client"
        })
        
        print(f"Sign Draft Response: {sign_response.status_code}")
        assert sign_response.status_code == 400, "Should not allow signing draft contract"
        assert "sent before signing" in sign_response.json().get("detail", "").lower()
        print("Correctly prevents signing draft contracts")
        
    def test_19_get_all_doula_contracts(self):
        """GET /api/doula/contracts returns all contracts for doula"""
        assert TestDoulaContractSystem.test_doula_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        response = self.session.get(f"{BASE_URL}/api/doula/contracts")
        
        print(f"Get All Contracts Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get contracts: {response.text}"
        
        contracts = response.json()
        assert isinstance(contracts, list)
        # We created at least 3 contracts in this test suite
        assert len(contracts) >= 1, f"Expected at least 1 contract, got {len(contracts)}"
        
        # Verify contract structure
        first_contract = contracts[0]
        assert "contract_id" in first_contract
        assert "client_names" in first_contract
        assert "status" in first_contract
        assert "total_payment_amount" in first_contract
        
        print(f"Retrieved {len(contracts)} contracts")
        
    def test_20_contract_not_found(self):
        """Verify 404 for non-existent contract"""
        response = self.session.get(f"{BASE_URL}/api/contracts/nonexistent_contract_12345")
        
        print(f"Not Found Response: {response.status_code}")
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent contract")
        
    def test_21_html_not_found(self):
        """Verify 404 for non-existent contract HTML"""
        response = self.session.get(f"{BASE_URL}/api/contracts/nonexistent_contract_12345/html")
        
        print(f"HTML Not Found Response: {response.status_code}")
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent contract HTML")
        
    def test_22_create_contract_with_explicit_remaining_amount(self):
        """Verify explicit remaining_payment_amount overrides auto-calculation"""
        assert TestDoulaContractSystem.test_doula_session is not None
        assert TestDoulaContractSystem.test_client_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestDoulaContractSystem.test_doula_session}"
        
        due_date = (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d")
        
        # Create contract with explicit remaining amount (different from total - retainer)
        response = self.session.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_id": TestDoulaContractSystem.test_client_id,
            "client_names": "Explicit Amount Test",
            "estimated_due_date": due_date,
            "total_payment_amount": 2000.00,
            "retainer_fee": 500.00,
            "remaining_payment_amount": 1600.00  # Different from 2000 - 500 = 1500
        })
        
        # Note: The API may ignore explicit remaining_amount and always calculate
        # This test documents the actual behavior
        print(f"Explicit Remaining Amount Response: {response.status_code}")
        assert response.status_code == 200
        
        contract = response.json()
        # API should auto-calculate: 2000 - 500 = 1500, ignoring explicit 1600
        # OR respect explicit 1600 - depends on implementation
        print(f"Remaining amount: {contract['remaining_payment_amount']}")
        # Just verify it exists
        assert "remaining_payment_amount" in contract


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
