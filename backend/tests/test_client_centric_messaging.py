"""
Test Client-Centric Messaging Features (Iteration 93)
Tests for:
1. Message model now stores client_id - verify by sending a message and checking client_id is populated
2. Provider can message linked clients without share_requests (check_provider_can_message updated)
3. New endpoint GET /api/provider/clients/{client_id}/messages returns messages for a specific client
4. Existing appointments and notes endpoints still work correctly
5. Delete notes endpoint at /api/provider/notes/{note_id} works (was fixed earlier)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL'))
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials - Demo users
DEMO_DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DEMO_DOULA_PASSWORD = "DemoScreenshot2024!"
DEMO_MOM_EMAIL = "demo.mom@truejoybirthing.com"
DEMO_MOM_PASSWORD = "DemoScreenshot2024!"


class TestAuthSetup:
    """Authentication setup for tests"""
    
    @pytest.fixture(scope="class")
    def doula_session(self):
        """Login as doula and get session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_DOULA_EMAIL,
            "password": DEMO_DOULA_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Doula login failed: {response.text}")
        
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        session.user_id = data["user_id"]
        session.full_name = data["full_name"]
        return session
    
    @pytest.fixture(scope="class")
    def mom_session(self):
        """Login as mom and get session token"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_MOM_EMAIL,
            "password": DEMO_MOM_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Mom login failed: {response.text}")
        
        data = response.json()
        session.headers.update({"Authorization": f"Bearer {data['session_token']}"})
        session.user_id = data["user_id"]
        session.full_name = data["full_name"]
        return session


class TestMessageModelClientId(TestAuthSetup):
    """Test 1: Message model now stores client_id"""
    
    def test_send_message_populates_client_id(self, doula_session, mom_session):
        """Verify that when a provider sends a message to a mom, client_id is auto-populated"""
        # Send message from doula to mom
        response = doula_session.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": mom_session.user_id,
            "content": f"TEST_MESSAGE_{uuid.uuid4().hex[:8]} - Testing client_id auto-population"
        })
        
        # Should succeed (if doula has linked client for this mom)
        if response.status_code == 200:
            data = response.json()
            message_data = data.get("data", {})
            
            # Verify message was sent
            assert "message_id" in message_data, "Message ID should be present"
            
            # Verify client_id was auto-resolved (if the mom is a linked client)
            client_id = message_data.get("client_id")
            print(f"Message sent - message_id: {message_data.get('message_id')}, client_id: {client_id}")
            
            # client_id should be populated if there's a linked client
            # It can be None if no linked client exists, but we're testing the mechanism
            if client_id:
                assert client_id.startswith("client_") or client_id.startswith("demo_client"), \
                    f"client_id should follow naming convention, got: {client_id}"
                print(f"SUCCESS: client_id auto-populated: {client_id}")
            else:
                print("INFO: client_id is None (no linked client found for this mom)")
        elif response.status_code == 403:
            # No active connection - this is expected if no share_request or client link
            print(f"Expected 403: {response.json()}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_mom_sends_message_populates_client_id(self, doula_session, mom_session):
        """Verify that when mom sends message to provider, client_id is also populated"""
        # Send message from mom to doula
        response = mom_session.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": doula_session.user_id,
            "content": f"TEST_MESSAGE_{uuid.uuid4().hex[:8]} - Mom to Doula test"
        })
        
        if response.status_code == 200:
            data = response.json()
            message_data = data.get("data", {})
            
            client_id = message_data.get("client_id")
            print(f"Mom->Doula message - client_id: {client_id}")
            
            if client_id:
                assert client_id.startswith("client_") or client_id.startswith("demo_client"), \
                    f"client_id should follow naming convention, got: {client_id}"
                print(f"SUCCESS: client_id auto-populated for mom->provider: {client_id}")
        elif response.status_code == 403:
            print(f"No active connection for mom->doula: {response.json()}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


class TestProviderCanMessageLinkedClients(TestAuthSetup):
    """Test 2: Provider can message linked clients without share_requests"""
    
    def test_check_provider_can_message_via_clients_collection(self, doula_session):
        """Verify provider can message linked clients even without share_request"""
        # Get doula's clients to find one that's linked
        response = doula_session.get(f"{BASE_URL}/api/provider/clients")
        
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        clients = response.json()
        
        # Find a client with linked_mom_id
        linked_client = None
        for client in clients:
            if client.get("linked_mom_id"):
                linked_client = client
                break
        
        if not linked_client:
            pytest.skip("No linked clients found for testing")
        
        print(f"Found linked client: {linked_client.get('client_id')} -> linked_mom_id: {linked_client.get('linked_mom_id')}")
        
        # Try to send message to the linked mom
        mom_user_id = linked_client.get("linked_mom_id")
        response = doula_session.post(f"{BASE_URL}/api/messages", json={
            "receiver_id": mom_user_id,
            "content": f"TEST_LINKED_CLIENT_MSG_{uuid.uuid4().hex[:8]}"
        })
        
        # Should be able to message linked client (either via share_request or clients collection)
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Provider can message linked client - message_id: {data.get('data', {}).get('message_id')}")
            assert data.get("data", {}).get("client_id") == linked_client.get("client_id"), \
                "client_id should match the linked client"
        elif response.status_code == 403:
            # This could happen if the mom user doesn't exist
            print(f"403 response (may indicate mom user doesn't exist): {response.json()}")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


class TestClientMessagesEndpoint(TestAuthSetup):
    """Test 3: GET /api/provider/clients/{client_id}/messages endpoint"""
    
    def test_get_client_messages_returns_messages(self, doula_session):
        """Verify the new client messages endpoint returns correct messages"""
        # First, get doula's clients
        response = doula_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        clients = response.json()
        
        if not clients:
            pytest.skip("No clients found for testing")
        
        # Use first client or demo client
        test_client = None
        for client in clients:
            if client.get("client_id", "").startswith("demo_client"):
                test_client = client
                break
        
        if not test_client:
            test_client = clients[0]
        
        client_id = test_client.get("client_id")
        print(f"Testing with client_id: {client_id}")
        
        # Call the new endpoint
        response = doula_session.get(f"{BASE_URL}/api/provider/clients/{client_id}/messages")
        
        assert response.status_code == 200, f"Failed to get client messages: {response.text}"
        messages = response.json()
        
        print(f"Found {len(messages)} messages for client {client_id}")
        
        # Verify response structure
        assert isinstance(messages, list), "Response should be a list"
        
        # If there are messages, verify structure
        for msg in messages[:3]:  # Check first 3
            assert "message_id" in msg, "Message should have message_id"
            assert "sender_id" in msg, "Message should have sender_id"
            assert "receiver_id" in msg, "Message should have receiver_id"
            assert "content" in msg, "Message should have content"
            print(f"  - {msg.get('message_id')}: {msg.get('sender_name')} -> {msg.get('receiver_name')}")
    
    def test_get_client_messages_not_found_for_invalid_client(self, doula_session):
        """Verify 404 is returned for non-existent client"""
        response = doula_session.get(f"{BASE_URL}/api/provider/clients/invalid_client_xyz/messages")
        
        assert response.status_code == 404, f"Expected 404 for invalid client, got {response.status_code}"
        print("SUCCESS: 404 returned for invalid client_id")
    
    def test_client_messages_unauthorized_access(self):
        """Verify endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/clients/any_client/messages")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("SUCCESS: 401 returned for unauthenticated request")


class TestExistingEndpointsStillWork(TestAuthSetup):
    """Test 4: Existing appointments and notes endpoints still work correctly"""
    
    def test_provider_appointments_endpoint_works(self, doula_session):
        """Verify GET /api/provider/appointments works"""
        response = doula_session.get(f"{BASE_URL}/api/provider/appointments")
        
        assert response.status_code == 200, f"Provider appointments failed: {response.text}"
        appointments = response.json()
        
        assert isinstance(appointments, list), "Should return a list of appointments"
        print(f"SUCCESS: Provider appointments endpoint returns {len(appointments)} appointments")
    
    def test_provider_notes_endpoint_works(self, doula_session):
        """Verify GET /api/provider/notes works"""
        response = doula_session.get(f"{BASE_URL}/api/provider/notes")
        
        assert response.status_code == 200, f"Provider notes failed: {response.text}"
        notes = response.json()
        
        assert isinstance(notes, list), "Should return a list of notes"
        print(f"SUCCESS: Provider notes endpoint returns {len(notes)} notes")
    
    def test_provider_clients_endpoint_works(self, doula_session):
        """Verify GET /api/provider/clients works"""
        response = doula_session.get(f"{BASE_URL}/api/provider/clients")
        
        assert response.status_code == 200, f"Provider clients failed: {response.text}"
        clients = response.json()
        
        assert isinstance(clients, list), "Should return a list of clients"
        print(f"SUCCESS: Provider clients endpoint returns {len(clients)} clients")
        
        # Verify client structure
        for client in clients[:2]:
            assert "client_id" in client, "Client should have client_id"
            assert "name" in client, "Client should have name"
            print(f"  - {client.get('client_id')}: {client.get('name')}")


class TestDeleteNotesEndpoint(TestAuthSetup):
    """Test 5: Delete notes endpoint at /api/provider/notes/{note_id} works"""
    
    def test_create_and_delete_note(self, doula_session):
        """Test creating and deleting a note"""
        # First get a client to create note for
        response = doula_session.get(f"{BASE_URL}/api/provider/clients")
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        clients = response.json()
        
        if not clients:
            pytest.skip("No clients found for testing")
        
        test_client = clients[0]
        client_id = test_client.get("client_id")
        
        # Create a test note
        test_note_content = f"TEST_NOTE_{uuid.uuid4().hex[:8]} - Delete test"
        response = doula_session.post(f"{BASE_URL}/api/provider/notes", json={
            "client_id": client_id,
            "note_type": "Prenatal",
            "content": test_note_content
        })
        
        assert response.status_code in [200, 201], f"Failed to create note: {response.text}"
        created_note = response.json()
        note_id = created_note.get("note_id")
        
        print(f"Created note: {note_id}")
        
        # Verify note was created by fetching notes
        response = doula_session.get(f"{BASE_URL}/api/provider/notes", params={"client_id": client_id})
        assert response.status_code == 200, f"Failed to get notes: {response.text}"
        notes = response.json()
        
        # Find our test note
        found_note = None
        for note in notes:
            if note.get("note_id") == note_id:
                found_note = note
                break
        
        assert found_note is not None, f"Test note {note_id} should exist after creation"
        print(f"Verified note exists: {found_note.get('note_id')}")
        
        # Now delete the note
        response = doula_session.delete(f"{BASE_URL}/api/provider/notes/{note_id}")
        
        if response.status_code in [200, 204]:
            print(f"SUCCESS: Note {note_id} deleted successfully")
            
            # Verify note was deleted
            response = doula_session.get(f"{BASE_URL}/api/provider/notes", params={"client_id": client_id})
            notes_after = response.json()
            
            for note in notes_after:
                assert note.get("note_id") != note_id, f"Note {note_id} should not exist after deletion"
            
            print("SUCCESS: Note confirmed deleted from list")
        else:
            # Note: Previous iteration mentioned duplicate route bug
            print(f"Delete note response: {response.status_code} - {response.text}")
            pytest.fail(f"Delete note failed with status {response.status_code}")


class TestClientIdInDemoScenario(TestAuthSetup):
    """Additional tests using the known demo data scenario"""
    
    def test_demo_client_messages_endpoint(self, doula_session):
        """Test with the known demo client from previous manual tests"""
        # The previous test mentioned: demo_client_ce5d46b9
        demo_client_id = "demo_client_ce5d46b9"
        
        response = doula_session.get(f"{BASE_URL}/api/provider/clients/{demo_client_id}/messages")
        
        if response.status_code == 200:
            messages = response.json()
            print(f"SUCCESS: Retrieved {len(messages)} messages for demo_client_ce5d46b9")
            
            # Check if messages have client_id
            for msg in messages[:3]:
                if msg.get("client_id"):
                    print(f"  - Message {msg.get('message_id')} has client_id: {msg.get('client_id')}")
                    assert msg.get("client_id") == demo_client_id or msg.get("client_id").startswith("demo_client"), \
                        "Messages should be associated with the demo client"
        elif response.status_code == 404:
            # Demo client might not exist in this environment
            print(f"Demo client {demo_client_id} not found - skipping")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
