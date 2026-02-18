"""
Test suite for Messaging System and Contract E-Signature features
Tests:
- Direct messaging: Mom can send message to provider from marketplace
- Provider can view conversations and reply
- Conversations list shows unread count
- Contract e-signature: View contract details, sign with name/timestamp, verify signed status
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = 'https://birth-joy-preview.preview.emergentagent.com'

# Test data prefixes
TEST_PREFIX = "TEST_MSG_"
timestamp = int(time.time())

class TestMessagingSystem:
    """Tests for the direct messaging system"""
    
    mom_email = f"{TEST_PREFIX}mom_{timestamp}@test.com"
    mom_password = "password123"
    mom_session = None
    mom_user_id = None
    
    doula_email = f"{TEST_PREFIX}doula_{timestamp}@test.com"
    doula_password = "password123"
    doula_session = None
    doula_user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, request):
        """Setup test fixtures"""
        self.api = requests.Session()
        self.api.headers.update({"Content-Type": "application/json"})
    
    def test_01_create_test_mom(self):
        """Create a test MOM user for messaging"""
        response = self.api.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.mom_email,
            "password": self.mom_password,
            "full_name": f"{TEST_PREFIX}Test Mom",
            "role": "MOM"
        })
        
        # Accept both 200 and 400 (already exists)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            TestMessagingSystem.mom_session = data.get("session_token")
            TestMessagingSystem.mom_user_id = data.get("user_id")
            print(f"Created MOM: {self.mom_email}")
        else:
            # If user exists, login
            login_resp = self.api.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.mom_email,
                "password": self.mom_password
            })
            if login_resp.status_code == 200:
                data = login_resp.json()
                TestMessagingSystem.mom_session = data.get("session_token")
                TestMessagingSystem.mom_user_id = data.get("user_id")
                print(f"Logged in existing MOM: {self.mom_email}")
    
    def test_02_create_test_doula(self):
        """Create a test DOULA user for messaging"""
        response = self.api.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.doula_email,
            "password": self.doula_password,
            "full_name": f"{TEST_PREFIX}Test Doula",
            "role": "DOULA"
        })
        
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}, {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            TestMessagingSystem.doula_session = data.get("session_token")
            TestMessagingSystem.doula_user_id = data.get("user_id")
            print(f"Created DOULA: {self.doula_email}")
        else:
            login_resp = self.api.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.doula_email,
                "password": self.doula_password
            })
            if login_resp.status_code == 200:
                data = login_resp.json()
                TestMessagingSystem.doula_session = data.get("session_token")
                TestMessagingSystem.doula_user_id = data.get("user_id")
                print(f"Logged in existing DOULA: {self.doula_email}")
    
    def test_03_mom_sends_message_to_doula(self):
        """Test MOM sending a message to DOULA"""
        if not TestMessagingSystem.mom_session or not TestMessagingSystem.doula_user_id:
            pytest.skip("Mom session or Doula ID not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestMessagingSystem.mom_session}",
            "Cookie": f"session_token={TestMessagingSystem.mom_session}"
        })
        
        message_content = f"{TEST_PREFIX}Hello from test mom at {datetime.now().isoformat()}"
        
        response = self.api.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": TestMessagingSystem.doula_user_id,
            "content": message_content
        })
        
        assert response.status_code == 200, f"Failed to send message: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "message" in data or "data" in data, "Response should contain message or data"
        
        if "data" in data:
            msg_data = data["data"]
            assert msg_data.get("message_id"), "Message should have message_id"
            assert msg_data.get("content") == message_content, "Content should match"
            assert msg_data.get("sender_id") == TestMessagingSystem.mom_user_id, "Sender should be MOM"
            assert msg_data.get("receiver_id") == TestMessagingSystem.doula_user_id, "Receiver should be DOULA"
        
        print(f"MOM sent message to DOULA: {message_content[:50]}...")
    
    def test_04_doula_views_conversations(self):
        """Test DOULA viewing conversations list with unread count"""
        if not TestMessagingSystem.doula_session:
            pytest.skip("Doula session not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestMessagingSystem.doula_session}",
            "Cookie": f"session_token={TestMessagingSystem.doula_session}"
        })
        
        response = self.api.get(f"{BASE_URL}/api/messages/conversations")
        
        assert response.status_code == 200, f"Failed to get conversations: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "conversations" in data, "Response should have conversations array"
        
        conversations = data["conversations"]
        # Find conversation with our test mom
        test_conv = None
        for conv in conversations:
            if conv.get("other_user_id") == TestMessagingSystem.mom_user_id:
                test_conv = conv
                break
        
        if test_conv:
            assert test_conv.get("other_user_name"), "Should have other_user_name"
            assert test_conv.get("other_user_role") == "MOM", "Should show MOM role"
            assert "unread_count" in test_conv, "Should have unread_count field"
            assert test_conv["unread_count"] >= 0, "Unread count should be >= 0"
            print(f"Found conversation with MOM, unread count: {test_conv['unread_count']}")
    
    def test_05_doula_views_messages(self):
        """Test DOULA viewing messages in conversation"""
        if not TestMessagingSystem.doula_session or not TestMessagingSystem.mom_user_id:
            pytest.skip("Doula session or Mom ID not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestMessagingSystem.doula_session}",
            "Cookie": f"session_token={TestMessagingSystem.doula_session}"
        })
        
        response = self.api.get(f"{BASE_URL}/api/messages/{TestMessagingSystem.mom_user_id}")
        
        assert response.status_code == 200, f"Failed to get messages: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "messages" in data, "Response should have messages array"
        
        messages = data["messages"]
        assert len(messages) > 0, "Should have at least one message"
        
        # Check message structure
        last_msg = messages[-1]
        assert "message_id" in last_msg, "Message should have message_id"
        assert "content" in last_msg, "Message should have content"
        assert "sender_id" in last_msg, "Message should have sender_id"
        assert "created_at" in last_msg, "Message should have created_at"
        
        print(f"DOULA can view {len(messages)} messages in conversation")
    
    def test_06_doula_replies_to_mom(self):
        """Test DOULA replying to MOM"""
        if not TestMessagingSystem.doula_session or not TestMessagingSystem.mom_user_id:
            pytest.skip("Doula session or Mom ID not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestMessagingSystem.doula_session}",
            "Cookie": f"session_token={TestMessagingSystem.doula_session}"
        })
        
        reply_content = f"{TEST_PREFIX}Reply from doula at {datetime.now().isoformat()}"
        
        response = self.api.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": TestMessagingSystem.mom_user_id,
            "content": reply_content
        })
        
        assert response.status_code == 200, f"Failed to send reply: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "data" in data, "Response should have data"
        assert data["data"].get("sender_id") == TestMessagingSystem.doula_user_id, "Sender should be DOULA"
        
        print(f"DOULA replied to MOM: {reply_content[:50]}...")
    
    def test_07_mom_sees_updated_conversations(self):
        """Test MOM seeing updated conversation with doula reply"""
        if not TestMessagingSystem.mom_session:
            pytest.skip("Mom session not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestMessagingSystem.mom_session}",
            "Cookie": f"session_token={TestMessagingSystem.mom_session}"
        })
        
        response = self.api.get(f"{BASE_URL}/api/messages/conversations")
        
        assert response.status_code == 200, f"Failed to get conversations: {response.status_code}, {response.text}"
        
        data = response.json()
        conversations = data.get("conversations", [])
        
        # Find conversation with doula
        test_conv = None
        for conv in conversations:
            if conv.get("other_user_id") == TestMessagingSystem.doula_user_id:
                test_conv = conv
                break
        
        if test_conv:
            # Mom should see unread message from doula
            assert test_conv.get("unread_count", 0) >= 0, "Should track unread count"
            print(f"MOM has {test_conv.get('unread_count')} unread messages from DOULA")
    
    def test_08_get_unread_count(self):
        """Test getting unread message count"""
        if not TestMessagingSystem.mom_session:
            pytest.skip("Mom session not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestMessagingSystem.mom_session}",
            "Cookie": f"session_token={TestMessagingSystem.mom_session}"
        })
        
        response = self.api.get(f"{BASE_URL}/api/messages/unread/count")
        
        assert response.status_code == 200, f"Failed to get unread count: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "unread_count" in data, "Response should have unread_count"
        assert isinstance(data["unread_count"], int), "unread_count should be integer"
        
        print(f"MOM total unread messages: {data['unread_count']}")


class TestContractESignature:
    """Tests for contract e-signature functionality"""
    
    doula_email = f"{TEST_PREFIX}contract_doula_{timestamp}@test.com"
    doula_password = "password123"
    doula_session = None
    doula_user_id = None
    
    client_id = None
    contract_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.api = requests.Session()
        self.api.headers.update({"Content-Type": "application/json"})
    
    def test_01_create_doula_for_contracts(self):
        """Create a DOULA user for contract testing"""
        response = self.api.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.doula_email,
            "password": self.doula_password,
            "full_name": f"{TEST_PREFIX}Contract Doula",
            "role": "DOULA"
        })
        
        if response.status_code == 200:
            data = response.json()
            TestContractESignature.doula_session = data.get("session_token")
            TestContractESignature.doula_user_id = data.get("user_id")
            print(f"Created Doula for contracts: {self.doula_email}")
        else:
            # Login if exists
            login_resp = self.api.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.doula_email,
                "password": self.doula_password
            })
            if login_resp.status_code == 200:
                data = login_resp.json()
                TestContractESignature.doula_session = data.get("session_token")
                TestContractESignature.doula_user_id = data.get("user_id")
    
    def test_02_doula_creates_client(self):
        """Doula creates a client for contract"""
        if not TestContractESignature.doula_session:
            pytest.skip("Doula session not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestContractESignature.doula_session}",
            "Cookie": f"session_token={TestContractESignature.doula_session}"
        })
        
        response = self.api.post(f"{BASE_URL}/api/doula/clients", json={
            "name": f"{TEST_PREFIX}Contract Client",
            "email": f"{TEST_PREFIX}client@test.com",
            "phone": "555-0101",
            "edd": "2026-06-15",
            "planned_birth_setting": "Home"
        })
        
        assert response.status_code == 200, f"Failed to create client: {response.status_code}, {response.text}"
        
        data = response.json()
        assert data.get("client_id"), "Client should have client_id"
        TestContractESignature.client_id = data.get("client_id")
        
        print(f"Created client: {TestContractESignature.client_id}")
    
    def test_03_doula_creates_contract(self):
        """Doula creates a contract for the client"""
        if not TestContractESignature.doula_session or not TestContractESignature.client_id:
            pytest.skip("Doula session or client not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestContractESignature.doula_session}",
            "Cookie": f"session_token={TestContractESignature.doula_session}"
        })
        
        response = self.api.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_id": TestContractESignature.client_id,
            "contract_title": f"{TEST_PREFIX}Birth Support Services Agreement",
            "services_description": "Full-spectrum doula support including prenatal visits, labor support, and postpartum care",
            "total_fee": 2500.00,
            "payment_schedule_description": "50% deposit due at signing, 50% due at 36 weeks",
            "cancellation_policy": "Full refund if cancelled before 30 weeks, 50% refund after"
        })
        
        assert response.status_code == 200, f"Failed to create contract: {response.status_code}, {response.text}"
        
        data = response.json()
        assert data.get("contract_id"), "Contract should have contract_id"
        assert data.get("status") == "Draft", "New contract should be Draft status"
        
        TestContractESignature.contract_id = data.get("contract_id")
        print(f"Created contract: {TestContractESignature.contract_id}")
    
    def test_04_view_contract_by_id_public(self):
        """Test viewing contract by ID (public endpoint for signing)"""
        if not TestContractESignature.contract_id:
            pytest.skip("Contract not available")
        
        # This endpoint doesn't require auth
        response = self.api.get(f"{BASE_URL}/api/contracts/{TestContractESignature.contract_id}")
        
        assert response.status_code == 200, f"Failed to view contract: {response.status_code}, {response.text}"
        
        data = response.json()
        
        # Check contract structure
        assert "contract" in data, "Response should have contract"
        contract = data["contract"]
        assert contract.get("contract_id") == TestContractESignature.contract_id, "Contract ID should match"
        assert contract.get("contract_title"), "Should have contract_title"
        assert contract.get("total_fee") == 2500.00, "Total fee should match"
        assert contract.get("status") == "Draft", "Status should be Draft"
        
        # Check client info
        assert "client" in data, "Response should have client"
        client = data["client"]
        assert client.get("name"), "Should have client name"
        
        # Check doula info
        assert "doula" in data, "Response should have doula"
        doula = data["doula"]
        assert doula.get("full_name"), "Should have doula name"
        
        print(f"Contract details verified: {contract.get('contract_title')}")
    
    def test_05_send_contract(self):
        """Doula sends contract for signature"""
        if not TestContractESignature.doula_session or not TestContractESignature.contract_id:
            pytest.skip("Doula session or contract not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestContractESignature.doula_session}",
            "Cookie": f"session_token={TestContractESignature.doula_session}"
        })
        
        response = self.api.post(f"{BASE_URL}/api/doula/contracts/{TestContractESignature.contract_id}/send")
        
        assert response.status_code == 200, f"Failed to send contract: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        
        print(f"Contract sent for signature")
    
    def test_06_verify_contract_status_sent(self):
        """Verify contract status changed to Sent"""
        if not TestContractESignature.contract_id:
            pytest.skip("Contract not available")
        
        response = self.api.get(f"{BASE_URL}/api/contracts/{TestContractESignature.contract_id}")
        
        assert response.status_code == 200, f"Failed to view contract: {response.status_code}"
        
        data = response.json()
        assert data["contract"]["status"] == "Sent", "Status should be Sent after sending"
        
        print(f"Contract status verified: Sent")
    
    def test_07_sign_contract(self):
        """Test signing contract with name and timestamp"""
        if not TestContractESignature.contract_id:
            pytest.skip("Contract not available")
        
        signer_name = f"{TEST_PREFIX}Jane Doe"
        signer_email = f"{TEST_PREFIX}signer@test.com"
        
        response = self.api.post(
            f"{BASE_URL}/api/doula/contracts/{TestContractESignature.contract_id}/sign",
            json={
                "signer_name": signer_name,
                "signer_email": signer_email
            }
        )
        
        assert response.status_code == 200, f"Failed to sign contract: {response.status_code}, {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert data.get("message") == "Contract signed successfully", "Should confirm signing"
        assert "signed_at" in data, "Response should have signed_at timestamp"
        assert "signer_name" in data, "Response should have signer_name"
        assert data["signer_name"] == signer_name, "Signer name should match"
        
        print(f"Contract signed by: {signer_name} at {data.get('signed_at')}")
    
    def test_08_verify_signed_status(self):
        """Verify contract status changed to Signed with signature data"""
        if not TestContractESignature.contract_id:
            pytest.skip("Contract not available")
        
        response = self.api.get(f"{BASE_URL}/api/contracts/{TestContractESignature.contract_id}")
        
        assert response.status_code == 200, f"Failed to view contract: {response.status_code}"
        
        data = response.json()
        contract = data["contract"]
        
        assert contract["status"] == "Signed", "Status should be Signed after signing"
        assert contract.get("signed_at"), "Should have signed_at timestamp"
        assert contract.get("signature_data"), "Should have signature_data"
        
        sig_data = contract["signature_data"]
        assert sig_data.get("signer_name"), "Signature should have signer_name"
        assert sig_data.get("signed_at"), "Signature should have signed_at"
        
        print(f"Contract verified as Signed: {contract.get('signed_at')}")
    
    def test_09_cannot_sign_already_signed(self):
        """Test that already signed contract cannot be signed again"""
        if not TestContractESignature.contract_id:
            pytest.skip("Contract not available")
        
        response = self.api.post(
            f"{BASE_URL}/api/doula/contracts/{TestContractESignature.contract_id}/sign",
            json={
                "signer_name": "Another Person",
                "signer_email": "another@test.com"
            }
        )
        
        assert response.status_code == 400, f"Should reject signing already signed contract: {response.status_code}"
        
        data = response.json()
        assert "already signed" in data.get("detail", "").lower(), "Should mention already signed"
        
        print("Correctly rejected re-signing attempt")
    
    def test_10_sign_without_name_fails(self):
        """Test that signing without name fails validation"""
        # First create a fresh contract for this test
        if not TestContractESignature.doula_session or not TestContractESignature.client_id:
            pytest.skip("Doula session or client not available")
        
        self.api.headers.update({
            "Authorization": f"Bearer {TestContractESignature.doula_session}",
            "Cookie": f"session_token={TestContractESignature.doula_session}"
        })
        
        # Create a new contract
        create_resp = self.api.post(f"{BASE_URL}/api/doula/contracts", json={
            "client_id": TestContractESignature.client_id,
            "contract_title": f"{TEST_PREFIX}Test Validation Contract",
            "total_fee": 100.00
        })
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create contract for validation test")
        
        new_contract_id = create_resp.json().get("contract_id")
        
        # Try to sign without name
        response = self.api.post(
            f"{BASE_URL}/api/doula/contracts/{new_contract_id}/sign",
            json={
                "signer_name": "",
                "signer_email": "test@test.com"
            }
        )
        
        assert response.status_code == 400, f"Should reject empty signer name: {response.status_code}"
        
        print("Correctly rejected empty signer name")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
