"""
Test Suite: Collaboration & Permission Rules for True Joy Birthing
Testing the new backend functionality for:
- Appointment creation by Doula/Midwife for a connected Mom client
- Appointment listing (Mom sees appointments without provider private notes)
- Appointment response by Mom (accept/decline)
- Birth plan completion triggers notification to connected providers
- Provider shared birth plan view includes read_only flag
- Messaging permission enforcement between Mom and Provider
- Provider-to-Provider messaging only if sharing common client
- Mom midwife visits endpoint returns only summary_for_mom (no clinical data)
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://care-plan-test.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test data
TIMESTAMP = int(time.time())

class TestSetupUsers:
    """Create test users for all collaboration tests"""
    
    @pytest.fixture(scope="class")
    def test_mom_user(self):
        """Create a Mom user and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_mom_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Test Mom {TIMESTAMP}",
            "role": "MOM"
        })
        assert response.status_code == 200, f"Failed to register mom: {response.text}"
        data = response.json()
        return {
            "user_id": data["user_id"],
            "session_token": data["session_token"],
            "email": data["email"],
            "full_name": data["full_name"]
        }
    
    @pytest.fixture(scope="class")
    def test_doula_user(self):
        """Create a Doula user and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_doula_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Test Doula {TIMESTAMP}",
            "role": "DOULA"
        })
        assert response.status_code == 200, f"Failed to register doula: {response.text}"
        data = response.json()
        return {
            "user_id": data["user_id"],
            "session_token": data["session_token"],
            "email": data["email"],
            "full_name": data["full_name"]
        }
    
    @pytest.fixture(scope="class")
    def test_midwife_user(self):
        """Create a Midwife user and return session token"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_midwife_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Test Midwife {TIMESTAMP}",
            "role": "MIDWIFE"
        })
        assert response.status_code == 200, f"Failed to register midwife: {response.text}"
        data = response.json()
        return {
            "user_id": data["user_id"],
            "session_token": data["session_token"],
            "email": data["email"],
            "full_name": data["full_name"]
        }
    
    @pytest.fixture(scope="class")
    def second_doula_user(self):
        """Create a second Doula user without shared clients"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_doula2_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Test Doula 2 {TIMESTAMP}",
            "role": "DOULA"
        })
        assert response.status_code == 200, f"Failed to register second doula: {response.text}"
        data = response.json()
        return {
            "user_id": data["user_id"],
            "session_token": data["session_token"],
            "email": data["email"],
            "full_name": data["full_name"]
        }

    def test_users_created(self, test_mom_user, test_doula_user, test_midwife_user, second_doula_user):
        """Verify all test users were created successfully"""
        assert test_mom_user["user_id"] is not None
        assert test_doula_user["user_id"] is not None
        assert test_midwife_user["user_id"] is not None
        assert second_doula_user["user_id"] is not None
        print(f"Created Mom: {test_mom_user['email']}")
        print(f"Created Doula: {test_doula_user['email']}")
        print(f"Created Midwife: {test_midwife_user['email']}")
        print(f"Created Second Doula: {second_doula_user['email']}")


class TestConnectionSetup:
    """Test creating connections between Mom and Providers via share request flow"""
    
    @pytest.fixture(scope="class")
    def connected_users(self):
        """Setup users and establish connections"""
        # Create Mom
        mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"collab_mom_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Collab Mom {TIMESTAMP}",
            "role": "MOM"
        })
        assert mom_resp.status_code == 200
        mom = mom_resp.json()
        
        # Create Doula
        doula_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"collab_doula_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Collab Doula {TIMESTAMP}",
            "role": "DOULA"
        })
        assert doula_resp.status_code == 200
        doula = doula_resp.json()
        
        # Create Midwife
        midwife_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"collab_midwife_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Collab Midwife {TIMESTAMP}",
            "role": "MIDWIFE"
        })
        assert midwife_resp.status_code == 200
        midwife = midwife_resp.json()
        
        # Create second Doula (no shared client)
        doula2_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"collab_doula2_{TIMESTAMP}@example.com",
            "password": "password123",
            "full_name": f"Collab Doula2 {TIMESTAMP}",
            "role": "DOULA"
        })
        assert doula2_resp.status_code == 200
        doula2 = doula2_resp.json()
        
        # Mom sends share request to Doula
        share_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": doula["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp.status_code == 200, f"Failed to create share request to Doula: {share_resp.text}"
        doula_share = share_resp.json()
        
        # Mom sends share request to Midwife
        share_resp2 = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": midwife["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp2.status_code == 200, f"Failed to create share request to Midwife: {share_resp2.text}"
        midwife_share = share_resp2.json()
        
        # Doula accepts share request
        pending_resp = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert pending_resp.status_code == 200
        pending = pending_resp.json()
        doula_request = next((r for r in pending["requests"] if r["mom_user_id"] == mom["user_id"]), None)
        assert doula_request is not None, "Doula should see pending share request"
        
        accept_resp = requests.put(
            f"{BASE_URL}/api/provider/share-requests/{doula_request['request_id']}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert accept_resp.status_code == 200
        
        # Midwife accepts share request
        pending_resp2 = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        assert pending_resp2.status_code == 200
        pending2 = pending_resp2.json()
        midwife_request = next((r for r in pending2["requests"] if r["mom_user_id"] == mom["user_id"]), None)
        assert midwife_request is not None, "Midwife should see pending share request"
        
        accept_resp2 = requests.put(
            f"{BASE_URL}/api/provider/share-requests/{midwife_request['request_id']}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        assert accept_resp2.status_code == 200
        
        return {
            "mom": mom,
            "doula": doula,
            "midwife": midwife,
            "doula2": doula2,
            "doula_share_request_id": doula_request["request_id"],
            "midwife_share_request_id": midwife_request["request_id"]
        }
    
    def test_connection_established(self, connected_users):
        """Verify connections are established"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        # IMPORTANT: First ensure Mom's birth plan exists by fetching it
        # The birth plan is created lazily when first accessed
        bp_resp = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert bp_resp.status_code == 200, "Mom should be able to get/create birth plan"
        
        # Verify doula can see shared birth plan
        shared_resp = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert shared_resp.status_code == 200
        shared_data = shared_resp.json()
        
        # Find mom's birth plan in shared list
        mom_plan = next((p for p in shared_data.get("birth_plans", []) if p["mom_user_id"] == mom["user_id"]), None)
        assert mom_plan is not None, "Doula should see Mom's shared birth plan"
        print(f"Connection established: Doula can see Mom's birth plan")


class TestAppointmentSystem:
    """Test appointment creation, listing, and response functionality"""
    
    @pytest.fixture(scope="class")
    def connected_users(self):
        """Setup users and establish connections"""
        ts = int(time.time()) + 100  # Unique timestamp
        
        # Create Mom
        mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"appt_mom_{ts}@example.com",
            "password": "password123",
            "full_name": f"Appt Mom {ts}",
            "role": "MOM"
        })
        assert mom_resp.status_code == 200
        mom = mom_resp.json()
        
        # Create Doula
        doula_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"appt_doula_{ts}@example.com",
            "password": "password123",
            "full_name": f"Appt Doula {ts}",
            "role": "DOULA"
        })
        assert doula_resp.status_code == 200
        doula = doula_resp.json()
        
        # Establish connection: Mom shares with Doula
        share_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": doula["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp.status_code == 200
        
        # Doula accepts
        pending_resp = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert pending_resp.status_code == 200
        pending = pending_resp.json()
        request_id = pending["requests"][0]["request_id"]
        
        accept_resp = requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert accept_resp.status_code == 200
        
        return {"mom": mom, "doula": doula}
    
    def test_appointment_creation_by_doula(self, connected_users):
        """Test that Doula can create appointment with connected Mom"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        appointment_data = {
            "mom_user_id": mom["user_id"],
            "appointment_date": "2026-02-15",
            "appointment_time": "10:00",
            "appointment_type": "prenatal_visit",
            "location": "Doula's Office",
            "is_virtual": False,
            "notes": "Private note: Mom is nervous about first appointment"  # Private note
        }
        
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data,
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 200, f"Failed to create appointment: {response.text}"
        data = response.json()
        
        assert "appointment" in data
        appt = data["appointment"]
        assert appt["appointment_id"] is not None
        assert appt["provider_id"] == doula["user_id"]
        assert appt["mom_user_id"] == mom["user_id"]
        assert appt["status"] == "pending"
        assert appt["notes"] == appointment_data["notes"]  # Provider should see their notes
        print(f"Appointment created: {appt['appointment_id']}")
        
        # Store for later tests
        connected_users["appointment_id"] = appt["appointment_id"]
    
    def test_appointment_creation_without_connection_fails(self, connected_users):
        """Test that provider cannot create appointment without active connection"""
        # Create a new Mom without connection
        ts = int(time.time()) + 200
        new_mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"unconnected_mom_{ts}@example.com",
            "password": "password123",
            "full_name": f"Unconnected Mom {ts}",
            "role": "MOM"
        })
        assert new_mom_resp.status_code == 200
        new_mom = new_mom_resp.json()
        
        doula = connected_users["doula"]
        
        appointment_data = {
            "mom_user_id": new_mom["user_id"],
            "appointment_date": "2026-02-16",
            "appointment_time": "14:00",
            "appointment_type": "consultation",
            "location": "Online",
            "is_virtual": True,
            "notes": "Should fail"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data,
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 403, f"Should fail without connection, got: {response.status_code}"
        data = response.json()
        assert "No active connection" in data.get("detail", "")
        print("Correctly blocked appointment creation without connection")
    
    def test_mom_sees_appointments_without_private_notes(self, connected_users):
        """Test that Mom sees appointments but NOT provider's private notes"""
        mom = connected_users["mom"]
        
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert response.status_code == 200
        appointments = response.json()
        
        assert len(appointments) > 0, "Mom should see at least one appointment"
        
        # Check that private notes are NOT included
        for appt in appointments:
            assert "notes" not in appt, "Mom should NOT see provider's private notes"
            assert appt["appointment_date"] is not None
            assert appt["appointment_type"] is not None
        
        print(f"Mom sees {len(appointments)} appointments without private notes")
    
    def test_provider_sees_appointments_with_private_notes(self, connected_users):
        """Test that provider sees appointments WITH their private notes"""
        doula = connected_users["doula"]
        
        response = requests.get(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 200
        appointments = response.json()
        
        assert len(appointments) > 0, "Doula should see at least one appointment"
        
        # Check that private notes ARE included for provider
        appt_with_notes = next((a for a in appointments if a.get("notes")), None)
        assert appt_with_notes is not None, "Provider should see their private notes"
        print(f"Provider sees {len(appointments)} appointments with private notes")
    
    def test_mom_accept_appointment(self, connected_users):
        """Test that Mom can accept an appointment"""
        mom = connected_users["mom"]
        appointment_id = connected_users.get("appointment_id")
        
        if not appointment_id:
            pytest.skip("No appointment ID from previous test")
        
        response = requests.put(
            f"{BASE_URL}/api/appointments/{appointment_id}/respond?response=accepted",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert response.status_code == 200, f"Failed to accept appointment: {response.text}"
        data = response.json()
        assert "accepted" in data.get("message", "").lower()
        print(f"Mom accepted appointment: {appointment_id}")
    
    def test_mom_decline_appointment(self, connected_users):
        """Test that Mom can decline an appointment"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        # Create a new appointment to decline
        appointment_data = {
            "mom_user_id": mom["user_id"],
            "appointment_date": "2026-02-20",
            "appointment_time": "15:00",
            "appointment_type": "postpartum_visit",
            "location": "Mom's Home",
            "is_virtual": False,
            "notes": "Follow-up visit"
        }
        
        create_resp = requests.post(
            f"{BASE_URL}/api/appointments",
            json=appointment_data,
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert create_resp.status_code == 200
        appt_id = create_resp.json()["appointment"]["appointment_id"]
        
        # Mom declines
        decline_resp = requests.put(
            f"{BASE_URL}/api/appointments/{appt_id}/respond?response=declined",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert decline_resp.status_code == 200, f"Failed to decline appointment: {decline_resp.text}"
        data = decline_resp.json()
        assert "declined" in data.get("message", "").lower()
        print(f"Mom declined appointment: {appt_id}")


class TestBirthPlanReadOnly:
    """Test that providers see birth plan as read-only"""
    
    @pytest.fixture(scope="class")
    def connected_users(self):
        """Setup users and establish connections"""
        ts = int(time.time()) + 300
        
        # Create Mom
        mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"readonly_mom_{ts}@example.com",
            "password": "password123",
            "full_name": f"ReadOnly Mom {ts}",
            "role": "MOM"
        })
        assert mom_resp.status_code == 200
        mom = mom_resp.json()
        
        # Create Doula
        doula_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"readonly_doula_{ts}@example.com",
            "password": "password123",
            "full_name": f"ReadOnly Doula {ts}",
            "role": "DOULA"
        })
        assert doula_resp.status_code == 200
        doula = doula_resp.json()
        
        # Establish connection
        share_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": doula["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp.status_code == 200
        
        pending_resp = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert pending_resp.status_code == 200
        request_id = pending_resp.json()["requests"][0]["request_id"]
        
        accept_resp = requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert accept_resp.status_code == 200
        
        return {"mom": mom, "doula": doula}
    
    def test_shared_birth_plan_has_read_only_flag(self, connected_users):
        """Test that provider's view of shared birth plan includes read_only flag"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        # IMPORTANT: First ensure Mom's birth plan exists by fetching it
        # The birth plan is created lazily when first accessed
        bp_resp = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert bp_resp.status_code == 200, "Mom should be able to get/create birth plan"
        
        # Get shared birth plans
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plans",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find Mom's birth plan
        mom_plan = next((p for p in data.get("birth_plans", []) if p["mom_user_id"] == mom["user_id"]), None)
        assert mom_plan is not None, "Doula should see Mom's shared birth plan"
        
        # Verify read_only flag
        assert mom_plan.get("read_only") == True, "Shared birth plan should have read_only=True"
        print("Birth plan correctly marked as read_only=True")
    
    def test_shared_birth_plan_detail_has_read_only_flag(self, connected_users):
        """Test that provider's detailed view includes read_only flag"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        response = requests.get(
            f"{BASE_URL}/api/provider/shared-birth-plan/{mom['user_id']}",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("read_only") == True, "Detailed birth plan view should have read_only=True"
        assert data.get("can_add_notes") == True, "Provider should be able to add notes"
        print("Detailed birth plan view correctly shows read_only=True and can_add_notes=True")


class TestMessagingPermissions:
    """Test messaging permission enforcement"""
    
    @pytest.fixture(scope="class")
    def connected_users(self):
        """Setup users with and without connections"""
        ts = int(time.time()) + 400
        
        # Create Mom
        mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"msg_mom_{ts}@example.com",
            "password": "password123",
            "full_name": f"Msg Mom {ts}",
            "role": "MOM"
        })
        assert mom_resp.status_code == 200
        mom = mom_resp.json()
        
        # Create connected Doula
        doula_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"msg_doula_{ts}@example.com",
            "password": "password123",
            "full_name": f"Msg Doula {ts}",
            "role": "DOULA"
        })
        assert doula_resp.status_code == 200
        doula = doula_resp.json()
        
        # Create connected Midwife
        midwife_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"msg_midwife_{ts}@example.com",
            "password": "password123",
            "full_name": f"Msg Midwife {ts}",
            "role": "MIDWIFE"
        })
        assert midwife_resp.status_code == 200
        midwife = midwife_resp.json()
        
        # Create unconnected Doula
        doula2_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"msg_doula2_{ts}@example.com",
            "password": "password123",
            "full_name": f"Msg Doula2 {ts}",
            "role": "DOULA"
        })
        assert doula2_resp.status_code == 200
        doula2 = doula2_resp.json()
        
        # Establish connection Mom -> Doula
        share_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": doula["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp.status_code == 200
        
        pending_resp = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        request_id = pending_resp.json()["requests"][0]["request_id"]
        
        requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        
        # Establish connection Mom -> Midwife
        share_resp2 = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": midwife["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp2.status_code == 200
        
        pending_resp2 = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        request_id2 = pending_resp2.json()["requests"][0]["request_id"]
        
        requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id2}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        
        return {"mom": mom, "doula": doula, "midwife": midwife, "doula2": doula2}
    
    def test_mom_can_message_connected_doula(self, connected_users):
        """Test that Mom can message a connected provider"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            json={"receiver_id": doula["user_id"], "content": "Hello Doula!"},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert response.status_code == 200, f"Mom should be able to message connected Doula: {response.text}"
        print("Mom successfully messaged connected Doula")
    
    def test_doula_can_message_connected_mom(self, connected_users):
        """Test that connected Doula can message Mom"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            json={"receiver_id": mom["user_id"], "content": "Hello Mom!"},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 200, f"Doula should be able to message connected Mom: {response.text}"
        print("Doula successfully messaged connected Mom")
    
    def test_mom_cannot_message_unconnected_doula(self, connected_users):
        """Test that Mom cannot message a provider without connection"""
        mom = connected_users["mom"]
        doula2 = connected_users["doula2"]
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            json={"receiver_id": doula2["user_id"], "content": "Hello Doula2!"},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert response.status_code == 403, f"Should fail without connection, got: {response.status_code}"
        data = response.json()
        assert "active connection" in data.get("detail", "").lower()
        print("Correctly blocked Mom from messaging unconnected provider")
    
    def test_unconnected_doula_cannot_message_mom(self, connected_users):
        """Test that unconnected provider cannot message Mom"""
        mom = connected_users["mom"]
        doula2 = connected_users["doula2"]
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            json={"receiver_id": mom["user_id"], "content": "Hello from Doula2!"},
            headers={"Authorization": f"Bearer {doula2['session_token']}"}
        )
        assert response.status_code == 403, f"Should fail without connection, got: {response.status_code}"
        print("Correctly blocked unconnected provider from messaging Mom")
    
    def test_providers_with_common_client_can_message(self, connected_users):
        """Test that Doula and Midwife sharing common Mom can message each other"""
        doula = connected_users["doula"]
        midwife = connected_users["midwife"]
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            json={"receiver_id": midwife["user_id"], "content": "Hello Midwife, regarding our shared client..."},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert response.status_code == 200, f"Doula should message Midwife sharing common client: {response.text}"
        print("Doula successfully messaged Midwife (shared common client)")
    
    def test_providers_without_common_client_cannot_message(self, connected_users):
        """Test that providers without common client cannot message each other"""
        doula2 = connected_users["doula2"]  # Not connected to Mom
        midwife = connected_users["midwife"]  # Connected to Mom
        
        response = requests.post(
            f"{BASE_URL}/api/messages",
            json={"receiver_id": midwife["user_id"], "content": "Hello Midwife!"},
            headers={"Authorization": f"Bearer {doula2['session_token']}"}
        )
        assert response.status_code == 403, f"Should fail without common client, got: {response.status_code}"
        data = response.json()
        assert "common client" in data.get("detail", "").lower()
        print("Correctly blocked providers without common client from messaging")


class TestMidwifeVisitsForMom:
    """Test Mom's view of midwife visits (only summary_for_mom, no clinical data)"""
    
    @pytest.fixture(scope="class")
    def setup_midwife_visits(self):
        """Setup users, connections, client and visits"""
        ts = int(time.time()) + 500
        
        # Create Mom
        mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"visits_mom_{ts}@example.com",
            "password": "password123",
            "full_name": f"Visits Mom {ts}",
            "role": "MOM"
        })
        assert mom_resp.status_code == 200
        mom = mom_resp.json()
        
        # Complete mom onboarding
        onboard_resp = requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            json={
                "due_date": "2026-06-15",
                "planned_birth_setting": "Home",
                "zip_code": "90210",
                "location_city": "Beverly Hills",
                "location_state": "CA"
            },
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert onboard_resp.status_code == 200
        
        # Create Midwife
        midwife_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"visits_midwife_{ts}@example.com",
            "password": "password123",
            "full_name": f"Visits Midwife {ts}",
            "role": "MIDWIFE"
        })
        assert midwife_resp.status_code == 200
        midwife = midwife_resp.json()
        
        # Complete midwife onboarding
        mw_onboard = requests.post(
            f"{BASE_URL}/api/midwife/onboarding",
            json={
                "practice_name": "Test Midwifery",
                "credentials": "CNM",
                "zip_code": "90210",
                "location_city": "Beverly Hills",
                "location_state": "CA",
                "years_in_practice": 5,
                "birth_settings_served": ["Home", "Birth Center"]
            },
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        assert mw_onboard.status_code == 200
        
        # Establish connection Mom -> Midwife
        share_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": midwife["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp.status_code == 200
        
        pending_resp = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        request_id = pending_resp.json()["requests"][0]["request_id"]
        
        requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        
        # Create a client record for Mom under Midwife
        client_resp = requests.post(
            f"{BASE_URL}/api/midwife/clients",
            json={
                "name": mom["full_name"],
                "email": mom["email"],
                "edd": "2026-06-15",
                "planned_birth_setting": "Home"
            },
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        assert client_resp.status_code in [200, 201], f"Failed to create client: {client_resp.text}"
        client = client_resp.json()
        client_id = client.get("client_id") or client.get("client", {}).get("client_id")
        
        # Update client to link with Mom user account
        update_resp = requests.put(
            f"{BASE_URL}/api/midwife/clients/{client_id}",
            json={"linked_mom_id": mom["user_id"]},
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        assert update_resp.status_code == 200, f"Failed to link client to mom: {update_resp.text}"
        
        # Create a visit with clinical data
        visit_resp = requests.post(
            f"{BASE_URL}/api/midwife/visits",
            json={
                "client_id": client_id,
                "visit_date": "2026-01-15",
                "visit_type": "Prenatal",
                "gestational_age": "28 weeks",
                "blood_pressure": "120/80",  # Clinical - should not be visible to Mom
                "weight": "145 lbs",  # Clinical - should not be visible to Mom
                "fetal_heart_rate": "150 bpm",  # Clinical - should not be visible to Mom
                "summary_for_mom": "Everything looks great! Baby is growing well.",  # Visible to Mom
                "private_note": "Watch for elevated BP at next visit."  # NOT visible to Mom
            },
            headers={"Authorization": f"Bearer {midwife['session_token']}"}
        )
        assert visit_resp.status_code in [200, 201], f"Failed to create visit: {visit_resp.text}"
        
        return {"mom": mom, "midwife": midwife, "client_id": client_id}
    
    def test_mom_sees_only_summary_for_mom(self, setup_midwife_visits):
        """Test that Mom sees only summary_for_mom, not clinical data"""
        mom = setup_midwife_visits["mom"]
        
        response = requests.get(
            f"{BASE_URL}/api/mom/midwife-visits",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert response.status_code == 200, f"Failed to get visits: {response.text}"
        data = response.json()
        
        visits = data.get("visits", [])
        assert len(visits) > 0, "Mom should see at least one visit"
        
        for visit in visits:
            # Mom should see these fields
            assert "visit_id" in visit or visit.get("visit_date") is not None
            assert "summary_for_mom" in visit, "Mom should see summary_for_mom"
            
            # Mom should NOT see these clinical fields
            assert "blood_pressure" not in visit, "Mom should NOT see blood_pressure"
            assert "weight" not in visit, "Mom should NOT see weight"
            assert "fetal_heart_rate" not in visit, "Mom should NOT see fetal_heart_rate"
            assert "private_note" not in visit, "Mom should NOT see private_note"
        
        print(f"Mom correctly sees {len(visits)} visits with only summary_for_mom")
        print(f"Visit summary: {visits[0].get('summary_for_mom', 'N/A')}")


class TestBirthPlanCompletionNotification:
    """Test that birth plan completion triggers notification to providers"""
    
    @pytest.fixture(scope="class")
    def connected_users(self):
        """Setup users and connections"""
        ts = int(time.time()) + 600
        
        # Create Mom
        mom_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"notif_mom_{ts}@example.com",
            "password": "password123",
            "full_name": f"Notif Mom {ts}",
            "role": "MOM"
        })
        assert mom_resp.status_code == 200
        mom = mom_resp.json()
        
        # Create Doula
        doula_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"notif_doula_{ts}@example.com",
            "password": "password123",
            "full_name": f"Notif Doula {ts}",
            "role": "DOULA"
        })
        assert doula_resp.status_code == 200
        doula = doula_resp.json()
        
        # Establish connection
        share_resp = requests.post(
            f"{BASE_URL}/api/birth-plan/share",
            json={"provider_id": doula["user_id"]},
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert share_resp.status_code == 200
        
        pending_resp = requests.get(
            f"{BASE_URL}/api/provider/share-requests",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        request_id = pending_resp.json()["requests"][0]["request_id"]
        
        requests.put(
            f"{BASE_URL}/api/provider/share-requests/{request_id}/respond",
            json={"action": "accept"},
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        
        return {"mom": mom, "doula": doula}
    
    def test_complete_all_birth_plan_sections(self, connected_users):
        """Complete all birth plan sections and verify notification sent"""
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        # Get birth plan sections
        bp_resp = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert bp_resp.status_code == 200
        birth_plan = bp_resp.json()
        
        sections = birth_plan.get("sections", [])
        
        # Complete each section
        for section in sections:
            section_id = section["section_id"]
            update_resp = requests.put(
                f"{BASE_URL}/api/birth-plan/section/{section_id}",
                json={
                    "data": {"completed": True, "answers": ["Test answer"]},
                    "notes_to_provider": "Test note"
                },
                headers={"Authorization": f"Bearer {mom['session_token']}"}
            )
            assert update_resp.status_code == 200, f"Failed to update section {section_id}: {update_resp.text}"
        
        # Verify birth plan is now complete
        bp_resp2 = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom['session_token']}"}
        )
        assert bp_resp2.status_code == 200
        final_plan = bp_resp2.json()
        assert final_plan.get("completion_percentage") == 100.0, "Birth plan should be 100% complete"
        assert final_plan.get("birth_plan_status") == "complete", "Birth plan status should be 'complete'"
        
        print(f"Birth plan completed: {final_plan.get('completion_percentage')}%")
    
    def test_provider_receives_birth_plan_complete_notification(self, connected_users):
        """Verify provider received notification about birth plan completion"""
        doula = connected_users["doula"]
        mom = connected_users["mom"]
        
        # Check doula's notifications
        notif_resp = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {doula['session_token']}"}
        )
        assert notif_resp.status_code == 200
        notifications = notif_resp.json().get("notifications", [])
        
        # Find birth_plan_complete notification
        bp_complete_notif = next(
            (n for n in notifications if n.get("type") == "birth_plan_complete" and 
             n.get("data", {}).get("mom_user_id") == mom["user_id"]),
            None
        )
        
        assert bp_complete_notif is not None, "Doula should receive birth_plan_complete notification"
        assert "completed" in bp_complete_notif.get("message", "").lower() or "complete" in bp_complete_notif.get("title", "").lower()
        
        print(f"Provider received notification: {bp_complete_notif.get('title')}")
        print(f"Message: {bp_complete_notif.get('message')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
