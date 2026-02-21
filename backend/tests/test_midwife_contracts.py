"""
Test Suite: True Joy Birthing Midwifery Services Agreement Contract System
Tests the complete midwife contract workflow including:
- Contract template retrieval with all 12 sections
- Contract creation with payment details and auto-calculated remaining balance
- Contract listing and retrieval
- Contract sending (creates midwife signature)
- Client signing the contract (public endpoint)
- Public contract view
- HTML view generation
- Additional terms storage
"""

import pytest
import requests
import uuid
import os
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-birth-records.preview.emergentagent.com')

# Expected sections in midwife contract template
EXPECTED_MIDWIFE_SECTIONS = [
    "services_scope",           # Scope of Midwifery Services
    "client_responsibilities",  # Client Responsibilities
    "birth_setting_transfer",   # Birth Setting & Transfer of Care
    "on_call_backup",           # On-Call Period & Backup Care
    "fees_payment",             # Fees & Payment Terms
    "termination_refunds",      # Termination of Care & Refunds
    "risks_informed_consent",   # Risks & Informed Consent
    "scope_limitations",        # Scope Limitations
    "confidentiality",          # Confidentiality & Records
    "communication_emergencies",# Communication & Emergencies
    "liability",                # Liability & Legal Acknowledgment
    "acknowledgement"           # Acknowledgement
]


class TestMidwifeContractSystem:
    """Complete test suite for Midwife Contract system"""
    
    # Shared test data
    test_midwife_session = None
    test_midwife_user_id = None
    test_client_id = None
    test_contract_id = None
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Set up requests session with headers"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
    
    # ===== SETUP: Create Midwife User and Client =====
    
    def test_01_register_midwife_user(self):
        """Register a new Midwife user for contract testing"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"mw_contract_test_{unique_id}@test.com"
        
        response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "full_name": "Midwife Contract Test User",
            "role": "MIDWIFE"
        })
        
        print(f"Register Midwife Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to register midwife: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "session_token" in data
        assert data["role"] == "MIDWIFE"
        
        # Store for later tests
        TestMidwifeContractSystem.test_midwife_session = data["session_token"]
        TestMidwifeContractSystem.test_midwife_user_id = data["user_id"]
        print(f"Created Midwife: {email}, user_id: {data['user_id']}")
        
    def test_02_midwife_onboarding(self):
        """Complete midwife onboarding"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.post(f"{BASE_URL}/api/midwife/onboarding", json={
            "practice_name": "True Joy Midwifery",
            "credentials": "CPM",
            "location_city": "Denver",
            "location_state": "Colorado",
            "years_in_practice": 8,
            "birth_settings_served": ["Home", "Birth Center"],
            "accepting_new_clients": True,
            "bio": "Certified Professional Midwife specializing in home births"
        })
        
        print(f"Midwife Onboarding Response: {response.status_code}")
        assert response.status_code == 200, f"Failed midwife onboarding: {response.text}"
        
    def test_03_create_client_for_midwife_contract(self):
        """Create a client to associate with midwife contract"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        unique_id = uuid.uuid4().hex[:8]
        response = self.session.post(f"{BASE_URL}/api/midwife/clients", json={
            "name": f"Emily Martinez {unique_id}",
            "email": f"emily_mw_contract_{unique_id}@test.com",
            "phone": "555-987-6543",
            "edd": (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Home"
        })
        
        print(f"Create Midwife Client Response: {response.status_code}")
        assert response.status_code in [200, 201], f"Failed to create client: {response.text}"
        
        data = response.json()
        assert "client_id" in data
        TestMidwifeContractSystem.test_client_id = data["client_id"]
        print(f"Created client: {data['name']}, client_id: {data['client_id']}")

    # ===== CONTRACT TEMPLATE TESTS =====
    
    def test_04_get_midwife_contract_template(self):
        """GET /api/midwife/contract-template returns the full Midwifery Services Agreement template"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contract-template")
        
        print(f"Get Midwife Contract Template Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get template: {response.text}"
        
        template = response.json()
        
        # Verify template structure
        assert "title" in template
        assert template["title"] == "Midwifery Services Agreement"
        
        assert "sections" in template
        print(f"Midwife Template has {len(template['sections'])} sections")
        
    def test_05_template_has_all_12_sections(self):
        """Verify midwife contract template includes all 12 required sections"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contract-template")
        assert response.status_code == 200
        
        template = response.json()
        sections = template["sections"]
        
        # Verify exactly 12 sections
        assert len(sections) == 12, f"Expected 12 sections, got {len(sections)}"
        
        # Verify all expected section IDs are present
        section_ids = [s["id"] for s in sections]
        for expected_id in EXPECTED_MIDWIFE_SECTIONS:
            assert expected_id in section_ids, f"Missing section: {expected_id}"
            
        print("All 12 sections verified:")
        for s in sections:
            print(f"  - {s['title']} (id: {s['id']})")
            
    def test_06_template_section_titles_correct(self):
        """Verify section titles match expected values"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contract-template")
        assert response.status_code == 200
        
        template = response.json()
        section_titles = {s["id"]: s["title"] for s in template["sections"]}
        
        assert section_titles["services_scope"] == "Scope of Midwifery Services"
        assert section_titles["client_responsibilities"] == "Client Responsibilities"
        assert section_titles["birth_setting_transfer"] == "Birth Setting & Transfer of Care"
        assert section_titles["on_call_backup"] == "On-Call Period & Backup Care"
        assert section_titles["fees_payment"] == "Fees & Payment Terms"
        assert section_titles["termination_refunds"] == "Termination of Care & Refunds"
        assert section_titles["risks_informed_consent"] == "Risks & Informed Consent"
        assert section_titles["scope_limitations"] == "Scope Limitations"
        assert section_titles["confidentiality"] == "Confidentiality & Records"
        assert section_titles["communication_emergencies"] == "Communication & Emergencies"
        assert section_titles["liability"] == "Liability & Legal Acknowledgment"
        assert section_titles["acknowledgement"] == "Acknowledgement"
        
        print("All section titles verified correctly")
        
    # ===== CONTRACT CREATION TESTS =====
    
    def test_07_create_midwife_contract(self):
        """POST /api/midwife/contracts creates contract with all required fields"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_client_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        due_date = (datetime.now() + timedelta(days=180)).strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/midwife/contracts", json={
            "client_id": TestMidwifeContractSystem.test_client_id,
            "client_name": "Emily Martinez",
            "partner_name": "David Martinez",
            "estimated_due_date": due_date,
            "planned_birth_place": "Home Birth",
            "on_call_start_week": "37",
            "on_call_end_week": "42",
            "total_fee": 6500.00,
            "deposit": 1500.00,
            "balance_due_week": "36",
            "practice_name": "True Joy Midwifery",
            "additional_terms": "Client requests water birth setup if labor progresses normally."
        })
        
        print(f"Create Midwife Contract Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to create midwife contract: {response.text}"
        
        contract = response.json()
        
        # Verify contract structure
        assert "contract_id" in contract
        assert contract["client_name"] == "Emily Martinez"
        assert contract["partner_name"] == "David Martinez"
        assert contract["estimated_due_date"] == due_date
        assert contract["planned_birth_place"] == "Home Birth"
        assert contract["on_call_start_week"] == "37"
        assert contract["on_call_end_week"] == "42"
        assert contract["total_fee"] == 6500.00
        assert contract["deposit"] == 1500.00
        assert contract["balance_due_week"] == "36"
        assert contract["status"] == "Draft"
        assert contract["additional_terms"] == "Client requests water birth setup if labor progresses normally."
        
        # Store contract_id for later tests
        TestMidwifeContractSystem.test_contract_id = contract["contract_id"]
        print(f"Created midwife contract: {contract['contract_id']}")
        
    def test_08_remaining_balance_auto_calculated(self):
        """Verify remaining_balance is auto-calculated (total - deposit)"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        # Get contract to verify remaining balance
        response = self.session.get(f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractSystem.test_contract_id}")
        assert response.status_code == 200
        
        contract = response.json()
        
        # Verify remaining balance = total - deposit
        expected_remaining = contract["total_fee"] - contract["deposit"]
        assert contract["remaining_balance"] == expected_remaining, \
            f"Remaining balance mismatch: expected {expected_remaining}, got {contract['remaining_balance']}"
        
        # 6500 - 1500 = 5000
        assert contract["remaining_balance"] == 5000.00
        print(f"Remaining balance correctly calculated: ${contract['remaining_balance']}")
        
    def test_09_contract_has_all_template_sections(self):
        """Verify created contract includes all 12 template sections"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractSystem.test_contract_id}")
        assert response.status_code == 200
        
        contract = response.json()
        
        assert "sections" in contract
        sections = contract["sections"]
        
        # Verify all 12 sections are in contract
        assert len(sections) == 12, f"Contract should have 12 sections, got {len(sections)}"
        
        section_ids = [s["id"] for s in sections]
        for expected_id in EXPECTED_MIDWIFE_SECTIONS:
            assert expected_id in section_ids, f"Contract missing section: {expected_id}"
            
        print("Contract contains all 12 template sections")
        
    def test_10_additional_terms_stored(self):
        """Verify additional_terms field is stored with contract"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractSystem.test_contract_id}")
        assert response.status_code == 200
        
        contract = response.json()
        
        assert "additional_terms" in contract
        assert contract["additional_terms"] is not None
        assert "water birth" in contract["additional_terms"]
        print(f"Additional terms stored: {contract['additional_terms']}")

    # ===== LIST CONTRACTS TEST =====
    
    def test_11_list_midwife_contracts(self):
        """GET /api/midwife/contracts returns all contracts for the midwife"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contracts")
        
        print(f"List Midwife Contracts Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to list contracts: {response.text}"
        
        contracts = response.json()
        assert isinstance(contracts, list)
        assert len(contracts) >= 1, f"Expected at least 1 contract, got {len(contracts)}"
        
        # Verify contract structure
        first_contract = contracts[0]
        assert "contract_id" in first_contract
        assert "client_name" in first_contract
        assert "status" in first_contract
        assert "total_fee" in first_contract
        
        print(f"Retrieved {len(contracts)} midwife contracts")
        
    # ===== SEND CONTRACT TESTS =====
    
    def test_12_send_midwife_contract_creates_signature(self):
        """POST /api/midwife/contracts/{id}/send sends contract and creates midwife signature"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        response = self.session.post(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractSystem.test_contract_id}/send"
        )
        
        print(f"Send Midwife Contract Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to send contract: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert data["message"] == "Contract sent"
        
        # Verify contract status changed
        verify_response = self.session.get(
            f"{BASE_URL}/api/midwife/contracts/{TestMidwifeContractSystem.test_contract_id}"
        )
        assert verify_response.status_code == 200
        
        contract = verify_response.json()
        
        assert contract["status"] == "Sent", f"Expected status 'Sent', got '{contract['status']}'"
        assert contract["midwife_signature"] is not None, "Midwife signature should exist after sending"
        assert contract["midwife_signature"]["signer_type"] == "midwife"
        assert "signer_name" in contract["midwife_signature"]
        assert "signed_at" in contract["midwife_signature"]
        
        print(f"Contract sent, midwife signature created by: {contract['midwife_signature']['signer_name']}")
        
    def test_13_client_status_updated_to_contract_sent(self):
        """Verify client status is updated to 'Contract Sent' when contract is sent"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_client_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        # Get client to verify status
        response = self.session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        
        clients = response.json()
        test_client = None
        for client in clients:
            if client["client_id"] == TestMidwifeContractSystem.test_client_id:
                test_client = client
                break
                
        assert test_client is not None, "Test client not found"
        assert test_client["status"] == "Contract Sent", f"Expected status 'Contract Sent', got '{test_client['status']}'"
        print(f"Client status correctly updated to: {test_client['status']}")
        
    # ===== PUBLIC CONTRACT VIEW TEST =====
    
    def test_14_public_contract_view(self):
        """GET /api/midwife-contracts/{id} returns contract (public endpoint)"""
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        # Public endpoint - no auth needed
        response = self.session.get(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}"
        )
        
        print(f"Public Contract View Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get public contract: {response.text}"
        
        data = response.json()
        
        assert "contract" in data
        assert "client" in data
        assert "midwife" in data
        
        contract = data["contract"]
        assert contract["contract_id"] == TestMidwifeContractSystem.test_contract_id
        assert contract["status"] == "Sent"
        assert "sections" in contract
        
        midwife = data["midwife"]
        assert "full_name" in midwife
        
        print(f"Public contract view retrieved successfully")
        
    # ===== CLIENT SIGN TESTS =====
    
    def test_15_client_sign_midwife_contract(self):
        """POST /api/midwife-contracts/{id}/sign allows client to sign"""
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        # Client signing is public endpoint
        response = self.session.post(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}/sign",
            json={
                "signer_name": "Emily Martinez",
                "signature_data": "base64_signature_data_placeholder"
            }
        )
        
        print(f"Client Sign Midwife Contract Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to sign contract: {response.text}"
        
        data = response.json()
        assert data["message"] == "Contract signed successfully"
        
        # Verify contract is now signed via public endpoint
        verify_response = self.session.get(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}"
        )
        assert verify_response.status_code == 200
        
        contract_data = verify_response.json()
        contract = contract_data["contract"]
        
        assert contract["status"] == "Signed", f"Expected status 'Signed', got '{contract['status']}'"
        assert contract["client_signature"] is not None, "Client signature should exist"
        assert contract["client_signature"]["signer_type"] == "client"
        assert contract["client_signature"]["signer_name"] == "Emily Martinez"
        assert "signed_at" in contract["client_signature"]
        
        print(f"Contract signed by client: {contract['client_signature']['signer_name']}")
        
    def test_16_client_status_updated_to_contract_signed(self):
        """Verify client status is updated to 'Contract Signed' after signing"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_client_id is not None
        
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        # Get client to verify status
        response = self.session.get(f"{BASE_URL}/api/midwife/clients")
        assert response.status_code == 200
        
        clients = response.json()
        test_client = None
        for client in clients:
            if client["client_id"] == TestMidwifeContractSystem.test_client_id:
                test_client = client
                break
                
        assert test_client is not None, "Test client not found"
        assert test_client["status"] == "Contract Signed", f"Expected status 'Contract Signed', got '{test_client['status']}'"
        print(f"Client status correctly updated to: {test_client['status']}")
        
    def test_17_cannot_sign_already_signed_contract(self):
        """Verify cannot sign an already signed contract"""
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        response = self.session.post(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}/sign",
            json={
                "signer_name": "David Martinez"
            }
        )
        
        print(f"Duplicate Sign Response: {response.status_code}")
        assert response.status_code == 400, "Should not allow duplicate signing"
        
        data = response.json()
        assert "already signed" in data.get("detail", "").lower()
        print("Correctly prevented duplicate signing")
        
    # ===== HTML VIEW TESTS =====
    
    def test_18_get_midwife_contract_html_view(self):
        """GET /api/midwife-contracts/{id}/html returns formatted HTML version"""
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        response = self.session.get(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}/html"
        )
        
        print(f"Get Midwife Contract HTML Response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get HTML: {response.text}"
        
        # Verify response is HTML
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML content type, got: {content_type}"
        
        html_content = response.text
        
        # Verify HTML contains key elements
        assert "Midwifery Services Agreement" in html_content
        assert "Emily Martinez" in html_content  # client_name
        assert "David Martinez" in html_content  # partner_name
        assert "$6,500.00" in html_content or "6500" in html_content  # total fee
        assert "$1,500.00" in html_content or "1500" in html_content  # deposit
        assert "$5,000.00" in html_content or "5000" in html_content  # remaining balance
        
        print("HTML view contains all required contract details")
        
    def test_19_html_contains_all_sections(self):
        """Verify HTML view contains all 12 contract sections"""
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        response = self.session.get(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}/html"
        )
        assert response.status_code == 200
        
        html_content = response.text
        
        # Check for section titles in HTML
        expected_titles = [
            "Scope of Midwifery Services",
            "Client Responsibilities",
            "Birth Setting & Transfer of Care",
            "On-Call Period & Backup Care",
            "Fees & Payment Terms",
            "Termination of Care & Refunds",
            "Risks & Informed Consent",
            "Scope Limitations",
            "Confidentiality & Records",
            "Communication & Emergencies",
            "Liability & Legal Acknowledgment",
            "Acknowledgement"
        ]
        
        for title in expected_titles:
            assert title in html_content, f"HTML missing section: {title}"
            
        print("HTML view contains all 12 section titles")
        
    def test_20_html_contains_additional_terms(self):
        """Verify HTML view includes additional terms when present"""
        assert TestMidwifeContractSystem.test_contract_id is not None
        
        response = self.session.get(
            f"{BASE_URL}/api/midwife-contracts/{TestMidwifeContractSystem.test_contract_id}/html"
        )
        assert response.status_code == 200
        
        html_content = response.text
        
        # Verify additional terms are in HTML
        assert "Additional Terms" in html_content or "water birth" in html_content
        print("HTML view includes additional terms")
        
    # ===== EDGE CASES AND VALIDATION =====
    
    def test_21_sign_requires_signer_name(self):
        """Verify signing requires signer name"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_client_id is not None
        
        # Create a new contract to test validation
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        due_date = (datetime.now() + timedelta(days=200)).strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/midwife/contracts", json={
            "client_id": TestMidwifeContractSystem.test_client_id,
            "client_name": "Validation Test Client",
            "estimated_due_date": due_date,
            "planned_birth_place": "Birth Center",
            "total_fee": 5500.00,
            "deposit": 1000.00
        })
        assert response.status_code == 200
        new_contract_id = response.json()["contract_id"]
        
        # Send the contract
        send_response = self.session.post(f"{BASE_URL}/api/midwife/contracts/{new_contract_id}/send")
        assert send_response.status_code == 200
        
        # Try to sign with empty name
        sign_response = self.session.post(f"{BASE_URL}/api/midwife-contracts/{new_contract_id}/sign", json={
            "signer_name": "   "  # Empty/whitespace name
        })
        
        print(f"Empty name sign Response: {sign_response.status_code}")
        assert sign_response.status_code == 400, "Should reject empty signer name"
        print("Correctly validates signer name is required")
        
    def test_22_cannot_sign_draft_contract(self):
        """Verify cannot sign a contract that hasn't been sent"""
        assert TestMidwifeContractSystem.test_midwife_session is not None
        assert TestMidwifeContractSystem.test_client_id is not None
        
        # Create a draft contract
        self.session.headers["Authorization"] = f"Bearer {TestMidwifeContractSystem.test_midwife_session}"
        
        due_date = (datetime.now() + timedelta(days=220)).strftime("%Y-%m-%d")
        response = self.session.post(f"{BASE_URL}/api/midwife/contracts", json={
            "client_id": TestMidwifeContractSystem.test_client_id,
            "client_name": "Draft Test Client",
            "estimated_due_date": due_date,
            "planned_birth_place": "Hospital",
            "total_fee": 5000.00,
            "deposit": 1000.00
        })
        assert response.status_code == 200
        draft_contract_id = response.json()["contract_id"]
        
        # Try to sign without sending first
        sign_response = self.session.post(f"{BASE_URL}/api/midwife-contracts/{draft_contract_id}/sign", json={
            "signer_name": "Test Client"
        })
        
        print(f"Sign Draft Response: {sign_response.status_code}")
        assert sign_response.status_code == 400, "Should not allow signing draft contract"
        assert "sent before signing" in sign_response.json().get("detail", "").lower()
        print("Correctly prevents signing draft contracts")
        
    def test_23_contract_not_found(self):
        """Verify 404 for non-existent contract"""
        response = self.session.get(f"{BASE_URL}/api/midwife-contracts/nonexistent_mw_contract_12345")
        
        print(f"Not Found Response: {response.status_code}")
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent contract")
        
    def test_24_html_not_found(self):
        """Verify 404 for non-existent contract HTML"""
        response = self.session.get(f"{BASE_URL}/api/midwife-contracts/nonexistent_mw_contract_12345/html")
        
        print(f"HTML Not Found Response: {response.status_code}")
        assert response.status_code == 404
        print("Correctly returns 404 for non-existent contract HTML")
        
    def test_25_unauthorized_template_access(self):
        """Verify non-midwife cannot access contract template"""
        # Clear auth header
        self.session.headers.pop("Authorization", None)
        
        response = self.session.get(f"{BASE_URL}/api/midwife/contract-template")
        
        print(f"Unauthorized Template Access Response: {response.status_code}")
        assert response.status_code == 401, "Should require authentication"
        print("Correctly requires authentication for template access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
