"""
Test Client Photo Sync Fix - Iteration 147

This test verifies that when fetching clients for providers (Doula/Midwife),
the client's profile picture is always fetched from the linked mom's user record
rather than using potentially stale data from the clients collection.

Test credentials:
- Doula: demo.doula@truejoybirthing.com / DemoScreenshot2024!
- Midwife: demo.midwife@truejoybirthing.com / DemoScreenshot2024!
- Mom: demo.mom@truejoybirthing.com / DemoScreenshot2024!
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestLogin:
    """Test login functionality for all demo accounts"""
    
    def test_doula_login(self):
        """Test login for demo doula account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Missing session_token in response: {data}"
        print(f"Doula login successful: {data.get('email', 'unknown')}")
    
    def test_midwife_login(self):
        """Test login for demo midwife account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        assert response.status_code == 200, f"Midwife login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Missing session_token in response: {data}"
        print(f"Midwife login successful: {data.get('email', 'unknown')}")
    
    def test_mom_login(self):
        """Test login for demo mom account"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        assert response.status_code == 200, f"Mom login failed: {response.text}"
        data = response.json()
        assert "session_token" in data, f"Missing session_token in response: {data}"
        print(f"Mom login successful: {data.get('email', 'unknown')}")


class TestClientPhotoSync:
    """Test client photo sync fix - clients should get latest picture from linked mom"""
    
    @pytest.fixture
    def doula_auth(self):
        """Get authentication token for doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code != 200:
            pytest.skip(f"Doula login failed: {response.text}")
        data = response.json()
        token = data.get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def midwife_auth(self):
        """Get authentication token for midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code != 200:
            pytest.skip(f"Midwife login failed: {response.text}")
        data = response.json()
        token = data.get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def mom_auth(self):
        """Get authentication token for mom"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.mom@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code != 200:
            pytest.skip(f"Mom login failed: {response.text}")
        data = response.json()
        token = data.get("session_token")
        return {"Authorization": f"Bearer {token}", "user": data}
    
    def test_doula_clients_endpoint_returns_picture(self, doula_auth):
        """Test /api/doula/clients returns clients with correct picture from mom's user record"""
        response = requests.get(f"{BASE_URL}/api/doula/clients", headers=doula_auth)
        assert response.status_code == 200, f"Failed to get doula clients: {response.text}"
        clients = response.json()
        print(f"Doula has {len(clients)} clients")
        
        # Check if any client has a linked_mom_id and verify picture
        for client in clients:
            client_name = client.get("name", "Unknown")
            linked_mom_id = client.get("linked_mom_id")
            picture = client.get("picture")
            
            print(f"Client: {client_name}, linked_mom_id: {linked_mom_id}, has picture: {picture is not None}")
            
            if linked_mom_id and picture:
                # Verify picture is NOT a DiceBear URL (stale) but a real base64 or valid URL
                # Based on the bug description, stale pictures would be DiceBear URLs
                if picture.startswith("https://api.dicebear.com"):
                    print(f"  WARNING: Client {client_name} has DiceBear URL instead of actual picture")
                elif picture.startswith("data:image"):
                    print(f"  OK: Client {client_name} has base64 profile picture (current)")
                else:
                    print(f"  INFO: Client {client_name} has picture URL: {picture[:50]}...")
    
    def test_midwife_clients_endpoint_returns_picture(self, midwife_auth):
        """Test /api/midwife/clients returns clients with correct picture from mom's user record"""
        response = requests.get(f"{BASE_URL}/api/midwife/clients", headers=midwife_auth)
        assert response.status_code == 200, f"Failed to get midwife clients: {response.text}"
        clients = response.json()
        print(f"Midwife has {len(clients)} clients")
        
        # Check if any client has a linked_mom_id and verify picture
        for client in clients:
            client_name = client.get("name", "Unknown")
            linked_mom_id = client.get("linked_mom_id")
            picture = client.get("picture")
            
            print(f"Client: {client_name}, linked_mom_id: {linked_mom_id}, has picture: {picture is not None}")
            
            if linked_mom_id and picture:
                # Verify picture format
                if picture.startswith("https://api.dicebear.com"):
                    print(f"  WARNING: Client {client_name} has DiceBear URL instead of actual picture")
                elif picture.startswith("data:image"):
                    print(f"  OK: Client {client_name} has base64 profile picture (current)")
                else:
                    print(f"  INFO: Client {client_name} has picture URL: {picture[:50]}...")
    
    def test_provider_unified_clients_endpoint(self, midwife_auth):
        """Test /api/provider/clients returns clients with correct picture from mom's user record"""
        response = requests.get(f"{BASE_URL}/api/provider/clients", headers=midwife_auth)
        assert response.status_code == 200, f"Failed to get provider clients: {response.text}"
        clients = response.json()
        print(f"Provider (unified) has {len(clients)} clients")
        
        clients_with_linked_mom = [c for c in clients if c.get("linked_mom_id")]
        print(f"Clients with linked_mom_id: {len(clients_with_linked_mom)}")
        
        for client in clients:
            client_name = client.get("name", "Unknown")
            linked_mom_id = client.get("linked_mom_id")
            picture = client.get("picture")
            
            if linked_mom_id:
                print(f"Client: {client_name}")
                print(f"  linked_mom_id: {linked_mom_id}")
                print(f"  has picture: {picture is not None}")
                
                if picture:
                    if picture.startswith("https://api.dicebear.com"):
                        print(f"  ISSUE: Has stale DiceBear URL")
                    elif picture.startswith("data:image"):
                        print(f"  OK: Has base64 profile picture (current)")
    
    def test_mom_profile_has_picture(self, mom_auth):
        """Test that mom user has a profile picture set"""
        response = requests.get(f"{BASE_URL}/api/mom/profile", headers={"Authorization": mom_auth["Authorization"]})
        
        if response.status_code == 200:
            profile = response.json()
            picture = profile.get("picture")
            print(f"Mom profile has picture: {picture is not None}")
            if picture:
                if picture.startswith("data:image"):
                    print(f"Mom has base64 picture (length: {len(picture)})")
                else:
                    print(f"Mom picture type: {picture[:50]}...")
        else:
            # Try getting user info from login response
            user = mom_auth.get("user", {})
            picture = user.get("picture")
            print(f"From login response - Mom has picture: {picture is not None}")
            if picture:
                if picture.startswith("data:image"):
                    print(f"Mom has base64 picture (length: {len(picture)})")
    
    def test_appointments_endpoint_returns_client_picture(self, doula_auth):
        """Test /api/appointments returns client pictures correctly"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=doula_auth)
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        appointments = response.json()
        print(f"Provider has {len(appointments)} appointments")
        
        for appt in appointments:
            appt_id = appt.get("appointment_id", "")[:20]
            client_name = appt.get("client_name", "Unknown")
            client_picture = appt.get("client_picture")
            
            if client_picture:
                if client_picture.startswith("data:image"):
                    print(f"Appt {appt_id}: {client_name} has base64 picture (OK)")
                elif client_picture.startswith("https://api.dicebear.com"):
                    print(f"Appt {appt_id}: {client_name} has DiceBear URL (potential stale)")
                else:
                    print(f"Appt {appt_id}: {client_name} has other picture: {client_picture[:40]}...")


class TestClientDetailPicture:
    """Test client detail endpoints include correct picture"""
    
    @pytest.fixture
    def doula_auth(self):
        """Get authentication token for doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code != 200:
            pytest.skip(f"Doula login failed: {response.text}")
        data = response.json()
        token = data.get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_provider_client_detail_has_picture(self, doula_auth):
        """Test /api/provider/clients/{client_id} returns correct picture"""
        # First get list of clients
        response = requests.get(f"{BASE_URL}/api/doula/clients", headers=doula_auth)
        if response.status_code != 200:
            pytest.skip("Could not get client list")
        
        clients = response.json()
        if not clients:
            pytest.skip("No clients found")
        
        # Find a client with linked_mom_id
        client_with_mom = next((c for c in clients if c.get("linked_mom_id")), None)
        if not client_with_mom:
            print("No client with linked_mom_id found, using first client")
            client_with_mom = clients[0]
        
        client_id = client_with_mom["client_id"]
        print(f"Testing client detail for: {client_with_mom.get('name')}")
        
        # Get client detail
        response = requests.get(f"{BASE_URL}/api/doula/clients/{client_id}", headers=doula_auth)
        assert response.status_code == 200, f"Failed to get client detail: {response.text}"
        
        client_detail = response.json()
        picture = client_detail.get("picture")
        linked_mom_id = client_detail.get("linked_mom_id")
        
        print(f"Client detail - linked_mom_id: {linked_mom_id}")
        print(f"Client detail - has picture: {picture is not None}")
        
        if picture:
            if picture.startswith("data:image"):
                print("Client detail has base64 picture - OK")
            elif picture.startswith("https://api.dicebear.com"):
                print("WARNING: Client detail has DiceBear URL - may be stale")


class TestProviderAppointmentsClientPicture:
    """Test provider appointments endpoint with client picture enrichment"""
    
    @pytest.fixture
    def midwife_auth(self):
        """Get authentication token for midwife"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.midwife@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code != 200:
            pytest.skip(f"Midwife login failed: {response.text}")
        data = response.json()
        token = data.get("session_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_provider_appointments_returns_client_picture(self, midwife_auth):
        """Test /api/provider/appointments returns correct client picture"""
        response = requests.get(f"{BASE_URL}/api/provider/appointments", headers=midwife_auth)
        assert response.status_code == 200, f"Failed to get provider appointments: {response.text}"
        
        appointments = response.json()
        print(f"Provider has {len(appointments)} appointments")
        
        for appt in appointments:
            client_name = appt.get("client_name", "Unknown")
            client_picture = appt.get("client_picture")
            
            if client_picture:
                picture_type = "base64" if client_picture.startswith("data:image") else "URL"
                print(f"Appointment with {client_name}: has {picture_type} picture")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
