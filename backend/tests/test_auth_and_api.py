"""
Backend API Tests for True Joy Birthing App
Tests: Authentication, MOM profile, Birth Plan, Wellness, Doula, Midwife features
"""
import pytest
import requests
import os
import time
import json

# Use the preview URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://theme-unify-preview.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Generate unique test data for each test run"""
        self.timestamp = str(int(time.time() * 1000))
        self.test_email = f"TEST_user_{self.timestamp}@example.com"
        self.test_password = "TestPassword123!"
        self.test_name = f"TEST User {self.timestamp}"
    
    def test_register_success(self):
        """Test user registration with email/password"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "full_name": self.test_name,
            "role": "MOM"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert "session_token" in data
        assert data["email"] == self.test_email
        assert data["role"] == "MOM"
        print(f"✓ Registration successful: {data['user_id']}")
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email fails"""
        # First registration
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_dup_{self.timestamp}@example.com",
            "password": self.test_password,
            "full_name": "Dup User",
            "role": "MOM"
        })
        
        # Second registration with same email
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_dup_{self.timestamp}@example.com",
            "password": self.test_password,
            "full_name": "Dup User 2",
            "role": "MOM"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data.get("detail", "").lower()
        print("✓ Duplicate email registration blocked")
    
    def test_login_success(self):
        """Test login with valid credentials"""
        # First register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_login_{self.timestamp}@example.com",
            "password": self.test_password,
            "full_name": "Login Test",
            "role": "MOM"
        })
        assert reg_response.status_code == 200
        
        # Then login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"TEST_login_{self.timestamp}@example.com",
            "password": self.test_password
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert "user_id" in data
        print(f"✓ Login successful: {data['user_id']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")
    
    def test_auth_me_unauthenticated(self):
        """Test /auth/me without authentication fails"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401
        print("✓ Unauthenticated request rejected")
    
    def test_auth_me_authenticated(self):
        """Test /auth/me with valid token returns user data"""
        # Register and get token
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_me_{self.timestamp}@example.com",
            "password": self.test_password,
            "full_name": "Me Test",
            "role": "MOM"
        })
        token = reg_response.json()["session_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == f"TEST_me_{self.timestamp}@example.com"
        assert "user_id" in data
        print(f"✓ Auth me successful: {data['email']}")


class TestGoogleSessionEndpoint:
    """Test Google OAuth session endpoint"""
    
    def test_google_session_missing_session_id(self):
        """Test google-session endpoint without session_id fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google-session",
            json={}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "session_id" in data.get("detail", "").lower()
        print("✓ Missing session_id rejected")
    
    def test_google_session_invalid_session_id(self):
        """Test google-session endpoint with invalid session_id fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/google-session",
            json={"session_id": "invalid_session_123"}
        )
        
        # Should return 401 for invalid session
        assert response.status_code == 401
        print("✓ Invalid session_id rejected")


class TestMomProfile:
    """MOM profile and onboarding tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test MOM user"""
        self.timestamp = str(int(time.time() * 1000))
        
        # Register MOM user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_mom_{self.timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"TEST MOM {self.timestamp}",
            "role": "MOM"
        })
        
        if reg_response.status_code == 200:
            self.token = reg_response.json()["session_token"]
            self.user_id = reg_response.json()["user_id"]
        else:
            pytest.skip(f"Failed to create test user: {reg_response.text}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_mom_onboarding(self):
        """Test MOM onboarding completion"""
        response = requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            headers=self.headers,
            json={
                "due_date": "2026-06-15",
                "planned_birth_setting": "Hospital",
                "location_city": "New York",
                "location_state": "NY"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
        print(f"✓ MOM onboarding completed")
    
    def test_get_mom_profile(self):
        """Test getting MOM profile"""
        response = requests.get(
            f"{BASE_URL}/api/mom/profile",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        print(f"✓ Got MOM profile")
    
    def test_update_mom_profile(self):
        """Test updating MOM profile"""
        response = requests.put(
            f"{BASE_URL}/api/mom/profile",
            headers=self.headers,
            json={
                "due_date": "2026-07-20",
                "planned_birth_setting": "Birth Center"
            }
        )
        
        assert response.status_code == 200
        print("✓ MOM profile updated")
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/mom/profile",
            headers=self.headers
        )
        assert get_response.status_code == 200


class TestBirthPlan:
    """Birth Plan feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test MOM user with onboarding completed"""
        self.timestamp = str(int(time.time() * 1000))
        
        # Register MOM user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_bp_{self.timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"TEST BP User {self.timestamp}",
            "role": "MOM"
        })
        
        if reg_response.status_code == 200:
            self.token = reg_response.json()["session_token"]
            self.user_id = reg_response.json()["user_id"]
        else:
            pytest.skip(f"Failed to create test user: {reg_response.text}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Complete onboarding
        requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            headers=self.headers,
            json={
                "due_date": "2026-06-15",
                "planned_birth_setting": "Hospital",
                "location_city": "Test City",
                "location_state": "TC"
            }
        )
    
    def test_get_birth_plan(self):
        """Test getting birth plan"""
        response = requests.get(
            f"{BASE_URL}/api/birth-plan",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "plan_id" in data
        assert "sections" in data
        assert isinstance(data["sections"], list)
        print(f"✓ Got birth plan with {len(data['sections'])} sections")
    
    def test_update_birth_plan_section(self):
        """Test updating a birth plan section"""
        response = requests.put(
            f"{BASE_URL}/api/birth-plan/section/about_me",
            headers=self.headers,
            json={
                "data": {
                    "name": "Test User",
                    "pronouns": "she/her",
                    "birth_companion": "Partner"
                },
                "notes_to_provider": "Please respect my preferences"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "completion_percentage" in data
        print(f"✓ Birth plan section updated, completion: {data['completion_percentage']}%")


class TestWellness:
    """Wellness check-in tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test MOM user"""
        self.timestamp = str(int(time.time() * 1000))
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_wellness_{self.timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"TEST Wellness User {self.timestamp}",
            "role": "MOM"
        })
        
        if reg_response.status_code == 200:
            self.token = reg_response.json()["session_token"]
        else:
            pytest.skip(f"Failed to create test user: {reg_response.text}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_wellness_checkin(self):
        """Test creating wellness check-in"""
        response = requests.post(
            f"{BASE_URL}/api/wellness/checkin",
            headers=self.headers,
            json={
                "mood": "Good",
                "mood_note": "Feeling positive today"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "checkin_id" in data
        assert data["mood"] == "Good"
        print(f"✓ Wellness check-in created: {data['checkin_id']}")
    
    def test_get_wellness_checkins(self):
        """Test getting wellness check-in history"""
        # Create a check-in first
        requests.post(
            f"{BASE_URL}/api/wellness/checkin",
            headers=self.headers,
            json={"mood": "Great", "mood_note": "Excellent day!"}
        )
        
        response = requests.get(
            f"{BASE_URL}/api/wellness/checkins",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} wellness check-ins")


class TestDoulaFeatures:
    """Doula-specific feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test DOULA user"""
        self.timestamp = str(int(time.time() * 1000))
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_doula_{self.timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"TEST Doula {self.timestamp}",
            "role": "DOULA"
        })
        
        if reg_response.status_code == 200:
            self.token = reg_response.json()["session_token"]
            self.user_id = reg_response.json()["user_id"]
        else:
            pytest.skip(f"Failed to create test user: {reg_response.text}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_doula_onboarding(self):
        """Test DOULA onboarding"""
        response = requests.post(
            f"{BASE_URL}/api/doula/onboarding",
            headers=self.headers,
            json={
                "practice_name": "Test Doula Practice",
                "location_city": "Los Angeles",
                "location_state": "CA",
                "services_offered": ["Birth Doula", "Postpartum Doula"],
                "years_in_practice": 5,
                "bio": "Experienced doula with passion for supporting families"
            }
        )
        
        assert response.status_code == 200
        print("✓ Doula onboarding completed")
    
    def test_doula_dashboard(self):
        """Test getting doula dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/doula/dashboard",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data
        assert "active_clients" in data
        print(f"✓ Got doula dashboard: {data}")
    
    def test_doula_client_crud(self):
        """Test CRUD operations for doula clients"""
        # CREATE
        create_response = requests.post(
            f"{BASE_URL}/api/doula/clients",
            headers=self.headers,
            json={
                "name": f"TEST Client {self.timestamp}",
                "email": f"testclient_{self.timestamp}@example.com",
                "edd": "2026-08-15",
                "planned_birth_setting": "Hospital"
            }
        )
        
        assert create_response.status_code == 200
        client = create_response.json()
        assert "client_id" in client
        client_id = client["client_id"]
        print(f"✓ Created client: {client_id}")
        
        # READ
        get_response = requests.get(
            f"{BASE_URL}/api/doula/clients/{client_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        print(f"✓ Retrieved client")
        
        # UPDATE
        update_response = requests.put(
            f"{BASE_URL}/api/doula/clients/{client_id}",
            headers=self.headers,
            json={"status": "Active", "internal_notes": "Great client!"}
        )
        assert update_response.status_code == 200
        print(f"✓ Updated client status")
        
        # LIST
        list_response = requests.get(
            f"{BASE_URL}/api/doula/clients",
            headers=self.headers
        )
        assert list_response.status_code == 200
        clients = list_response.json()
        assert isinstance(clients, list)
        print(f"✓ Listed {len(clients)} clients")


class TestMidwifeFeatures:
    """Midwife-specific feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test MIDWIFE user"""
        self.timestamp = str(int(time.time() * 1000))
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_midwife_{self.timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"TEST Midwife {self.timestamp}",
            "role": "MIDWIFE"
        })
        
        if reg_response.status_code == 200:
            self.token = reg_response.json()["session_token"]
            self.user_id = reg_response.json()["user_id"]
        else:
            pytest.skip(f"Failed to create test user: {reg_response.text}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_midwife_onboarding(self):
        """Test MIDWIFE onboarding"""
        response = requests.post(
            f"{BASE_URL}/api/midwife/onboarding",
            headers=self.headers,
            json={
                "practice_name": "Test Midwife Practice",
                "credentials": "CNM",
                "location_city": "Portland",
                "location_state": "OR",
                "birth_settings_served": ["Home", "Birth Center"],
                "years_in_practice": 10,
                "bio": "Certified nurse-midwife"
            }
        )
        
        assert response.status_code == 200
        print("✓ Midwife onboarding completed")
    
    def test_midwife_dashboard(self):
        """Test getting midwife dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/midwife/dashboard",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data
        assert "prenatal_clients" in data
        print(f"✓ Got midwife dashboard: {data}")
    
    def test_midwife_client_and_visit(self):
        """Test creating client and visit for midwife"""
        # CREATE client
        client_response = requests.post(
            f"{BASE_URL}/api/midwife/clients",
            headers=self.headers,
            json={
                "name": f"TEST MW Client {self.timestamp}",
                "email": f"mwclient_{self.timestamp}@example.com",
                "edd": "2026-09-01",
                "planned_birth_setting": "Home"
            }
        )
        
        assert client_response.status_code == 200
        client_id = client_response.json()["client_id"]
        print(f"✓ Created midwife client: {client_id}")
        
        # CREATE visit
        visit_response = requests.post(
            f"{BASE_URL}/api/midwife/visits",
            headers=self.headers,
            json={
                "client_id": client_id,
                "visit_date": "2026-02-15",
                "visit_type": "Prenatal",
                "gestational_age": "28 weeks",
                "blood_pressure": "120/80",
                "weight": "145 lbs",
                "fetal_heart_rate": "140 bpm",
                "note": "All vitals normal"
            }
        )
        
        assert visit_response.status_code == 200
        visit = visit_response.json()
        assert "visit_id" in visit
        print(f"✓ Created prenatal visit: {visit['visit_id']}")


class TestMarketplace:
    """Marketplace provider search tests"""
    
    def test_search_providers(self):
        """Test searching for providers"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        
        assert response.status_code == 200
        data = response.json()
        assert "doulas" in data
        assert "midwives" in data
        print(f"✓ Marketplace search returned {len(data['doulas'])} doulas, {len(data['midwives'])} midwives")


class TestTimeline:
    """Pregnancy timeline tests (requires MOM role)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test MOM user"""
        self.timestamp = str(int(time.time() * 1000))
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_timeline_{self.timestamp}@example.com",
            "password": "TestPassword123!",
            "full_name": f"TEST Timeline User {self.timestamp}",
            "role": "MOM"
        })
        
        if reg_response.status_code == 200:
            self.token = reg_response.json()["session_token"]
        else:
            pytest.skip(f"Failed to create test user: {reg_response.text}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Complete onboarding
        requests.post(
            f"{BASE_URL}/api/mom/onboarding",
            headers=self.headers,
            json={
                "due_date": "2026-06-15",
                "planned_birth_setting": "Hospital",
                "location_city": "Test City",
                "location_state": "TC"
            }
        )
    
    def test_get_timeline(self):
        """Test getting pregnancy timeline"""
        response = requests.get(
            f"{BASE_URL}/api/timeline",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "timeline" in data
        assert isinstance(data["timeline"], list)
        assert len(data["timeline"]) > 0
        assert "week" in data["timeline"][0]
        print(f"✓ Got timeline with {len(data['timeline'])} weeks of info")


# Cleanup fixture
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Cleanup test data after all tests"""
    def cleanup_test_data():
        try:
            import subprocess
            subprocess.run([
                "mongosh", "--eval",
                """
                use('test_database');
                db.users.deleteMany({email: /^TEST_/});
                db.user_sessions.deleteMany({session_token: /test_session/});
                db.clients.deleteMany({name: /^TEST/});
                db.wellness_checkins.deleteMany({});
                print('Cleaned up test data');
                """
            ], timeout=10)
        except Exception as e:
            print(f"Cleanup warning: {e}")
    
    request.addfinalizer(cleanup_test_data)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
