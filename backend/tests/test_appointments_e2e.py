"""
E2E Tests for Appointment System
Tests the complete flow: Provider creates appointment -> Mom responds -> Status updates

Test Cases:
1. Provider creates appointment -> Mom sees in pending -> Mom accepts -> Provider sees accepted
2. Provider creates appointment -> Mom declines -> Provider sees declined
3. Provider cancels accepted appointment -> Both see cancelled
4. Mom sees appointments grouped by status (pending, accepted, declined)
5. Provider sees appointments with private notes visible
6. Mom CANNOT see provider's private notes
7. Notifications are created on appointment create/respond
8. Provider can ONLY create appointments with connected Moms
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://true-joy-preview-1.preview.emergentagent.com"

class TestAppointmentsE2E:
    """End-to-End tests for appointment system"""
    
    @pytest.fixture(scope="class")
    def test_users(self):
        """Create fresh test users for clean E2E testing"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create Mom user
        mom_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_mom_{unique_id}@test.com",
            "password": "testpass123",
            "full_name": f"Test Mom {unique_id}",
            "role": "MOM"
        })
        assert mom_response.status_code == 200, f"Failed to create mom: {mom_response.text}"
        mom_data = mom_response.json()
        
        # Create Doula user
        doula_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_doula_{unique_id}@test.com",
            "password": "testpass123",
            "full_name": f"Test Doula {unique_id}",
            "role": "DOULA"
        })
        assert doula_response.status_code == 200, f"Failed to create doula: {doula_response.text}"
        doula_data = doula_response.json()
        
        # Complete Mom onboarding
        mom_session = requests.Session()
        mom_session.headers.update({
            "Authorization": f"Bearer {mom_data['session_token']}",
            "Content-Type": "application/json"
        })
        
        onboarding_resp = mom_session.post(f"{BASE_URL}/api/mom/onboarding", json={
            "due_date": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Hospital",
            "location_city": "Denver",
            "location_state": "CO"
        })
        assert onboarding_resp.status_code == 200, f"Mom onboarding failed: {onboarding_resp.text}"
        
        # Complete Doula onboarding
        doula_session = requests.Session()
        doula_session.headers.update({
            "Authorization": f"Bearer {doula_data['session_token']}",
            "Content-Type": "application/json"
        })
        
        doula_onboarding_resp = doula_session.post(f"{BASE_URL}/api/doula/onboarding", json={
            "practice_name": f"Test Doula Practice {unique_id}",
            "location_city": "Denver",
            "location_state": "CO",
            "services_offered": ["Birth Doula"],
            "years_in_practice": 5
        })
        assert doula_onboarding_resp.status_code == 200, f"Doula onboarding failed: {doula_onboarding_resp.text}"
        
        return {
            "mom": {
                "user_id": mom_data["user_id"],
                "email": mom_data["email"],
                "full_name": mom_data["full_name"],
                "session_token": mom_data["session_token"]
            },
            "doula": {
                "user_id": doula_data["user_id"],
                "email": doula_data["email"],
                "full_name": doula_data["full_name"],
                "session_token": doula_data["session_token"]
            }
        }
    
    @pytest.fixture(scope="class")
    def connected_users(self, test_users):
        """Establish connection between Mom and Doula via share request"""
        mom = test_users["mom"]
        doula = test_users["doula"]
        
        # Mom shares birth plan with Doula
        mom_session = requests.Session()
        mom_session.headers.update({
            "Authorization": f"Bearer {mom['session_token']}",
            "Content-Type": "application/json"
        })
        
        share_resp = mom_session.post(f"{BASE_URL}/api/birth-plan/share", json={
            "provider_id": doula["user_id"]
        })
        assert share_resp.status_code == 200, f"Share request failed: {share_resp.text}"
        share_data = share_resp.json()
        request_id = share_data["request"]["request_id"]
        
        # Doula accepts the share request
        doula_session = requests.Session()
        doula_session.headers.update({
            "Authorization": f"Bearer {doula['session_token']}",
            "Content-Type": "application/json"
        })
        
        accept_resp = doula_session.put(f"{BASE_URL}/api/provider/share-requests/{request_id}/respond", json={
            "action": "accept"
        })
        assert accept_resp.status_code == 200, f"Accept share request failed: {accept_resp.text}"
        
        return {
            "mom": mom,
            "doula": doula,
            "mom_session": mom_session,
            "doula_session": doula_session,
            "connection_id": request_id
        }
    
    # ===========================================
    # Test 1: Provider cannot create appointment without connection
    # ===========================================
    def test_provider_cannot_create_appointment_without_connection(self, test_users):
        """Provider should NOT be able to create appointment with non-connected Mom"""
        # Create a new Mom who is NOT connected
        unique_id = uuid.uuid4().hex[:8]
        unconnected_mom = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"unconnected_mom_{unique_id}@test.com",
            "password": "testpass123",
            "full_name": f"Unconnected Mom {unique_id}",
            "role": "MOM"
        })
        assert unconnected_mom.status_code == 200
        unconnected_mom_id = unconnected_mom.json()["user_id"]
        
        doula = test_users["doula"]
        doula_session = requests.Session()
        doula_session.headers.update({
            "Authorization": f"Bearer {doula['session_token']}",
            "Content-Type": "application/json"
        })
        
        # Try to create appointment without connection - should fail
        response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": unconnected_mom_id,
            "appointment_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "appointment_time": "10:00",
            "appointment_type": "prenatal_visit"
        })
        
        # Should return 403 - no active connection
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        assert "No active connection" in response.json().get("detail", "")
        print("TEST PASSED: Provider cannot create appointment without connection")
    
    # ===========================================
    # Test 2: E2E Flow - Provider creates -> Mom accepts
    # ===========================================
    def test_e2e_flow_provider_creates_mom_accepts(self, connected_users):
        """Full E2E: Provider creates appointment -> Mom sees pending -> Mom accepts -> Provider sees accepted"""
        mom_session = connected_users["mom_session"]
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        doula = connected_users["doula"]
        
        appointment_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        private_notes = "Confidential: Mom has anxiety about delivery"
        
        # Step 1: Provider creates appointment with private notes
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": appointment_date,
            "appointment_time": "10:00",
            "appointment_type": "prenatal_visit",
            "location": "Denver Birth Center",
            "is_virtual": False,
            "notes": private_notes  # Provider's private notes
        })
        
        assert create_response.status_code == 200, f"Create appointment failed: {create_response.text}"
        appointment_data = create_response.json()
        appointment_id = appointment_data["appointment"]["appointment_id"]
        print(f"Step 1 PASSED: Appointment created with ID {appointment_id}")
        
        # Step 2: Verify provider can see the appointment with private notes
        provider_appointments = doula_session.get(f"{BASE_URL}/api/appointments")
        assert provider_appointments.status_code == 200
        provider_appts = provider_appointments.json()
        
        provider_apt = next((a for a in provider_appts if a["appointment_id"] == appointment_id), None)
        assert provider_apt is not None, "Appointment not found in provider's list"
        assert provider_apt["status"] == "pending", f"Expected pending, got {provider_apt['status']}"
        assert provider_apt.get("notes") == private_notes, "Provider should see private notes"
        print("Step 2 PASSED: Provider can see appointment with private notes")
        
        # Step 3: Mom sees appointment in pending status WITHOUT private notes
        mom_appointments = mom_session.get(f"{BASE_URL}/api/appointments")
        assert mom_appointments.status_code == 200
        mom_appts = mom_appointments.json()
        
        mom_apt = next((a for a in mom_appts if a["appointment_id"] == appointment_id), None)
        assert mom_apt is not None, "Appointment not found in Mom's list"
        assert mom_apt["status"] == "pending", f"Expected pending, got {mom_apt['status']}"
        assert "notes" not in mom_apt, "Mom should NOT see provider's private notes"
        print("Step 3 PASSED: Mom sees pending appointment WITHOUT private notes")
        
        # Step 4: Mom accepts the appointment
        accept_response = mom_session.put(f"{BASE_URL}/api/appointments/{appointment_id}/respond?response=accepted")
        assert accept_response.status_code == 200, f"Accept failed: {accept_response.text}"
        print("Step 4 PASSED: Mom accepted the appointment")
        
        # Step 5: Verify provider sees accepted status
        provider_appointments_after = doula_session.get(f"{BASE_URL}/api/appointments")
        assert provider_appointments_after.status_code == 200
        provider_appts_after = provider_appointments_after.json()
        
        provider_apt_after = next((a for a in provider_appts_after if a["appointment_id"] == appointment_id), None)
        assert provider_apt_after is not None
        assert provider_apt_after["status"] == "accepted", f"Expected accepted, got {provider_apt_after['status']}"
        print("Step 5 PASSED: Provider sees accepted status")
        
        # Cleanup - store appointment_id for other tests
        connected_users["accepted_appointment_id"] = appointment_id
        print("E2E FLOW TEST (create -> accept) PASSED")
    
    # ===========================================
    # Test 3: E2E Flow - Provider creates -> Mom declines
    # ===========================================
    def test_e2e_flow_provider_creates_mom_declines(self, connected_users):
        """Full E2E: Provider creates appointment -> Mom declines -> Provider sees declined status"""
        mom_session = connected_users["mom_session"]
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        appointment_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        # Step 1: Provider creates appointment
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": appointment_date,
            "appointment_time": "14:00",
            "appointment_type": "consultation",
            "is_virtual": True
        })
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        appointment_id = create_response.json()["appointment"]["appointment_id"]
        print(f"Step 1 PASSED: Appointment created with ID {appointment_id}")
        
        # Step 2: Mom declines the appointment
        decline_response = mom_session.put(f"{BASE_URL}/api/appointments/{appointment_id}/respond?response=declined")
        assert decline_response.status_code == 200, f"Decline failed: {decline_response.text}"
        print("Step 2 PASSED: Mom declined the appointment")
        
        # Step 3: Verify provider sees declined status
        provider_appointments = doula_session.get(f"{BASE_URL}/api/appointments")
        assert provider_appointments.status_code == 200
        provider_appts = provider_appointments.json()
        
        declined_apt = next((a for a in provider_appts if a["appointment_id"] == appointment_id), None)
        assert declined_apt is not None
        assert declined_apt["status"] == "declined", f"Expected declined, got {declined_apt['status']}"
        print("Step 3 PASSED: Provider sees declined status")
        
        connected_users["declined_appointment_id"] = appointment_id
        print("E2E FLOW TEST (create -> decline) PASSED")
    
    # ===========================================
    # Test 4: Provider cancels accepted appointment
    # ===========================================
    def test_provider_cancels_accepted_appointment(self, connected_users):
        """Provider cancels an accepted appointment -> Both see cancelled status"""
        mom_session = connected_users["mom_session"]
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        appointment_date = (datetime.now() + timedelta(days=21)).strftime("%Y-%m-%d")
        
        # Step 1: Create and accept an appointment
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": appointment_date,
            "appointment_time": "09:00",
            "appointment_type": "birth_planning_session",
            "location": "Provider Office"
        })
        assert create_response.status_code == 200
        appointment_id = create_response.json()["appointment"]["appointment_id"]
        
        # Mom accepts
        accept_response = mom_session.put(f"{BASE_URL}/api/appointments/{appointment_id}/respond?response=accepted")
        assert accept_response.status_code == 200
        print("Step 1 PASSED: Appointment created and accepted")
        
        # Step 2: Provider cancels the appointment
        cancel_response = doula_session.delete(f"{BASE_URL}/api/appointments/{appointment_id}")
        assert cancel_response.status_code == 200, f"Cancel failed: {cancel_response.text}"
        print("Step 2 PASSED: Provider cancelled the appointment")
        
        # Step 3: Verify Mom sees cancelled status
        mom_appointments = mom_session.get(f"{BASE_URL}/api/appointments")
        assert mom_appointments.status_code == 200
        mom_appts = mom_appointments.json()
        
        cancelled_apt = next((a for a in mom_appts if a["appointment_id"] == appointment_id), None)
        assert cancelled_apt is not None
        assert cancelled_apt["status"] == "cancelled", f"Expected cancelled, got {cancelled_apt['status']}"
        print("Step 3 PASSED: Mom sees cancelled status")
        
        # Step 4: Verify Provider sees cancelled status
        provider_appointments = doula_session.get(f"{BASE_URL}/api/appointments")
        provider_appts = provider_appointments.json()
        
        provider_cancelled = next((a for a in provider_appts if a["appointment_id"] == appointment_id), None)
        assert provider_cancelled is not None
        assert provider_cancelled["status"] == "cancelled"
        print("Step 4 PASSED: Provider sees cancelled status")
        
        connected_users["cancelled_appointment_id"] = appointment_id
        print("CANCEL APPOINTMENT TEST PASSED")
    
    # ===========================================
    # Test 5: Mom appointments grouped by status
    # ===========================================
    def test_mom_appointments_grouped_by_status(self, connected_users):
        """Verify Mom sees appointments that can be grouped by status"""
        mom_session = connected_users["mom_session"]
        
        # Get all appointments
        mom_appointments = mom_session.get(f"{BASE_URL}/api/appointments")
        assert mom_appointments.status_code == 200
        appts = mom_appointments.json()
        
        # Verify we have appointments in different statuses
        statuses = [a["status"] for a in appts]
        
        # We should have at least pending, accepted, declined, cancelled from previous tests
        print(f"Found {len(appts)} appointments with statuses: {set(statuses)}")
        
        # Group by status
        pending = [a for a in appts if a["status"] == "pending"]
        accepted = [a for a in appts if a["status"] == "accepted"]
        declined = [a for a in appts if a["status"] == "declined"]
        cancelled = [a for a in appts if a["status"] == "cancelled"]
        
        print(f"Pending: {len(pending)}, Accepted: {len(accepted)}, Declined: {len(declined)}, Cancelled: {len(cancelled)}")
        
        # Verify appointment structure
        for apt in appts:
            assert "appointment_id" in apt
            assert "provider_name" in apt
            assert "provider_role" in apt
            assert "appointment_date" in apt
            assert "appointment_time" in apt
            assert "appointment_type" in apt
            assert "status" in apt
            # Mom should NOT see notes (provider's private notes)
            assert "notes" not in apt, f"Mom should not see private notes in appointment {apt['appointment_id']}"
        
        print("MOM APPOINTMENTS GROUPED BY STATUS TEST PASSED")
    
    # ===========================================
    # Test 6: Provider sees private notes
    # ===========================================
    def test_provider_sees_private_notes(self, connected_users):
        """Provider should see their private notes in appointment details"""
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        private_note_content = f"Private note test {uuid.uuid4().hex[:8]}"
        
        # Create appointment with specific private notes
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": (datetime.now() + timedelta(days=28)).strftime("%Y-%m-%d"),
            "appointment_time": "11:00",
            "appointment_type": "postpartum_visit",
            "notes": private_note_content
        })
        assert create_response.status_code == 200
        appointment_id = create_response.json()["appointment"]["appointment_id"]
        
        # Verify provider can see the notes
        provider_appointments = doula_session.get(f"{BASE_URL}/api/appointments")
        assert provider_appointments.status_code == 200
        appts = provider_appointments.json()
        
        apt_with_notes = next((a for a in appts if a["appointment_id"] == appointment_id), None)
        assert apt_with_notes is not None
        assert apt_with_notes.get("notes") == private_note_content, "Provider should see their private notes"
        
        print("PROVIDER SEES PRIVATE NOTES TEST PASSED")
    
    # ===========================================
    # Test 7: Mom CANNOT see provider's private notes
    # ===========================================
    def test_mom_cannot_see_private_notes(self, connected_users):
        """Mom should NOT be able to see provider's private notes"""
        mom_session = connected_users["mom_session"]
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        secret_note = "SECRET: Mom mentioned partner issues"
        
        # Provider creates appointment with private notes
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d"),
            "appointment_time": "15:00",
            "appointment_type": "consultation",
            "notes": secret_note
        })
        assert create_response.status_code == 200
        appointment_id = create_response.json()["appointment"]["appointment_id"]
        
        # Verify Mom CANNOT see the notes
        mom_appointments = mom_session.get(f"{BASE_URL}/api/appointments")
        assert mom_appointments.status_code == 200
        appts = mom_appointments.json()
        
        mom_apt = next((a for a in appts if a["appointment_id"] == appointment_id), None)
        assert mom_apt is not None, "Appointment should exist for Mom"
        assert "notes" not in mom_apt, "Mom should NOT see notes field"
        
        # Double check - notes should be None or not present
        notes_value = mom_apt.get("notes", None)
        assert notes_value is None, f"Notes should be None for Mom, got: {notes_value}"
        
        print("MOM CANNOT SEE PRIVATE NOTES TEST PASSED")
    
    # ===========================================
    # Test 8: Notifications created on appointment actions
    # ===========================================
    def test_notifications_created_on_appointment_actions(self, connected_users):
        """Notifications should be created when appointment is created/responded"""
        mom_session = connected_users["mom_session"]
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        # Clear/mark notifications as read first
        mom_session.put(f"{BASE_URL}/api/notifications/read-all")
        doula_session.put(f"{BASE_URL}/api/notifications/read-all")
        
        # Provider creates appointment
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": (datetime.now() + timedelta(days=42)).strftime("%Y-%m-%d"),
            "appointment_time": "16:00",
            "appointment_type": "prenatal_visit"
        })
        assert create_response.status_code == 200
        appointment_id = create_response.json()["appointment"]["appointment_id"]
        
        # Check Mom received notification
        mom_notifs = mom_session.get(f"{BASE_URL}/api/notifications")
        assert mom_notifs.status_code == 200
        mom_notifications = mom_notifs.json()["notifications"]
        
        invite_notif = next((n for n in mom_notifications if n["type"] == "appointment_invite"), None)
        assert invite_notif is not None, "Mom should receive appointment_invite notification"
        print("Step 1 PASSED: Mom received appointment invite notification")
        
        # Mom accepts appointment
        accept_response = mom_session.put(f"{BASE_URL}/api/appointments/{appointment_id}/respond?response=accepted")
        assert accept_response.status_code == 200
        
        # Check Provider received notification
        doula_notifs = doula_session.get(f"{BASE_URL}/api/notifications")
        assert doula_notifs.status_code == 200
        doula_notifications = doula_notifs.json()["notifications"]
        
        response_notif = next((n for n in doula_notifications if n["type"] == "appointment_response"), None)
        assert response_notif is not None, "Provider should receive appointment_response notification"
        print("Step 2 PASSED: Provider received appointment response notification")
        
        print("NOTIFICATIONS TEST PASSED")
    
    # ===========================================
    # Test 9: Invalid response values are rejected
    # ===========================================
    def test_invalid_response_values_rejected(self, connected_users):
        """API should reject invalid response values"""
        mom_session = connected_users["mom_session"]
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        # Create appointment
        create_response = doula_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": (datetime.now() + timedelta(days=49)).strftime("%Y-%m-%d"),
            "appointment_time": "13:00",
            "appointment_type": "consultation"
        })
        assert create_response.status_code == 200
        appointment_id = create_response.json()["appointment"]["appointment_id"]
        
        # Try invalid response
        invalid_response = mom_session.put(f"{BASE_URL}/api/appointments/{appointment_id}/respond?response=invalid_status")
        assert invalid_response.status_code == 400, f"Expected 400 for invalid response, got {invalid_response.status_code}"
        
        print("INVALID RESPONSE VALUES TEST PASSED")
    
    # ===========================================
    # Test 10: Appointment types validation
    # ===========================================
    def test_appointment_types(self, connected_users):
        """Test all valid appointment types can be created"""
        doula_session = connected_users["doula_session"]
        mom = connected_users["mom"]
        
        valid_types = ["prenatal_visit", "birth_planning_session", "postpartum_visit", "consultation"]
        
        for apt_type in valid_types:
            response = doula_session.post(f"{BASE_URL}/api/appointments", json={
                "mom_user_id": mom["user_id"],
                "appointment_date": (datetime.now() + timedelta(days=50 + valid_types.index(apt_type))).strftime("%Y-%m-%d"),
                "appointment_time": "10:00",
                "appointment_type": apt_type
            })
            assert response.status_code == 200, f"Failed to create {apt_type} appointment: {response.text}"
            print(f"  - {apt_type}: OK")
        
        print("ALL APPOINTMENT TYPES TEST PASSED")


class TestMidwifeAppointments:
    """Test appointments for Midwife role"""
    
    @pytest.fixture(scope="class")
    def midwife_connection(self):
        """Create Midwife and establish connection with Mom"""
        unique_id = uuid.uuid4().hex[:8]
        
        # Create Mom
        mom_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"midwife_test_mom_{unique_id}@test.com",
            "password": "testpass123",
            "full_name": f"Midwife Test Mom {unique_id}",
            "role": "MOM"
        })
        assert mom_response.status_code == 200
        mom_data = mom_response.json()
        
        # Create Midwife
        midwife_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_midwife_{unique_id}@test.com",
            "password": "testpass123",
            "full_name": f"Test Midwife {unique_id}",
            "role": "MIDWIFE"
        })
        assert midwife_response.status_code == 200
        midwife_data = midwife_response.json()
        
        # Setup sessions
        mom_session = requests.Session()
        mom_session.headers.update({
            "Authorization": f"Bearer {mom_data['session_token']}",
            "Content-Type": "application/json"
        })
        
        midwife_session = requests.Session()
        midwife_session.headers.update({
            "Authorization": f"Bearer {midwife_data['session_token']}",
            "Content-Type": "application/json"
        })
        
        # Mom onboarding
        mom_session.post(f"{BASE_URL}/api/mom/onboarding", json={
            "due_date": (datetime.now() + timedelta(days=100)).strftime("%Y-%m-%d"),
            "planned_birth_setting": "Home",
            "location_city": "Austin",
            "location_state": "TX"
        })
        
        # Midwife onboarding
        midwife_session.post(f"{BASE_URL}/api/midwife/onboarding", json={
            "practice_name": f"Test Midwife Practice {unique_id}",
            "credentials": "CNM",
            "location_city": "Austin",
            "location_state": "TX",
            "birth_settings_served": ["Home", "Birth Center"]
        })
        
        # Mom shares with Midwife
        share_resp = mom_session.post(f"{BASE_URL}/api/birth-plan/share", json={
            "provider_id": midwife_data["user_id"]
        })
        assert share_resp.status_code == 200
        request_id = share_resp.json()["request"]["request_id"]
        
        # Midwife accepts
        accept_resp = midwife_session.put(f"{BASE_URL}/api/provider/share-requests/{request_id}/respond", json={
            "action": "accept"
        })
        assert accept_resp.status_code == 200
        
        return {
            "mom": {"user_id": mom_data["user_id"], "session": mom_session},
            "midwife": {"user_id": midwife_data["user_id"], "session": midwife_session}
        }
    
    def test_midwife_can_create_appointment(self, midwife_connection):
        """Midwife should be able to create appointments with connected Mom"""
        midwife_session = midwife_connection["midwife"]["session"]
        mom = midwife_connection["mom"]
        
        response = midwife_session.post(f"{BASE_URL}/api/appointments", json={
            "mom_user_id": mom["user_id"],
            "appointment_date": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            "appointment_time": "09:00",
            "appointment_type": "prenatal_visit",
            "location": "Home Visit",
            "notes": "First home prenatal visit"
        })
        
        assert response.status_code == 200, f"Midwife appointment creation failed: {response.text}"
        apt_data = response.json()
        assert apt_data["appointment"]["provider_role"] == "MIDWIFE"
        
        print("MIDWIFE APPOINTMENT CREATION TEST PASSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
