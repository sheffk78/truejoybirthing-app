#!/usr/bin/env python3
"""
Backend Test Suite for True Joy Birthing API
Testing the full authentication flow for MOM users
"""

import requests
import json
import uuid
import sys
from datetime import datetime, timezone

# Backend URL from frontend .env (EXPO_PUBLIC_BACKEND_URL + /api)
BACKEND_URL = "https://true-joy-preview-1.preview.emergentagent.com/api"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_success(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def add_failure(self, test_name, error_msg):
        self.failed += 1
        self.errors.append(f"{test_name}: {error_msg}")
        print(f"❌ {test_name}: {error_msg}")
    
    def print_summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"Test Results: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFailed Tests:")
            for error in self.errors:
                print(f"  - {error}")

def test_mom_authentication_flow():
    """Test the complete MOM user authentication and onboarding flow"""
    
    results = TestResults()
    
    # Generate unique test data
    test_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_email = f"test_mom_{uuid.uuid4().hex[:8]}@example.com"
    test_name = f"Sarah Johnson {test_timestamp}"
    
    print(f"Testing with email: {test_email}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"{'='*60}")
    
    session_token = None
    
    try:
        # ============== TEST 1: POST /api/auth/register ==============
        print("\n1. Testing user registration...")
        
        register_data = {
            "email": test_email,
            "full_name": test_name,
            "role": "MOM",
            "password": "SecurePassword123!"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
        
        if response.status_code != 200:
            results.add_failure("User Registration", f"Status {response.status_code}: {response.text}")
            return results
        
        register_response = response.json()
        
        # Verify response structure
        required_fields = ["user_id", "email", "full_name", "role", "session_token"]
        missing_fields = [field for field in required_fields if field not in register_response]
        
        if missing_fields:
            results.add_failure("Registration Response Structure", f"Missing fields: {missing_fields}")
            return results
        
        # Verify response values
        if register_response["email"] != test_email:
            results.add_failure("Registration Email", f"Expected {test_email}, got {register_response['email']}")
            return results
        
        if register_response["role"] != "MOM":
            results.add_failure("Registration Role", f"Expected MOM, got {register_response['role']}")
            return results
        
        if register_response["full_name"] != test_name:
            results.add_failure("Registration Name", f"Expected {test_name}, got {register_response['full_name']}")
            return results
        
        session_token = register_response["session_token"]
        user_id = register_response["user_id"]
        
        if not session_token or not session_token.startswith("session_"):
            results.add_failure("Session Token Format", f"Invalid token: {session_token}")
            return results
        
        results.add_success("User Registration")
        results.add_success("Registration Response Structure")
        results.add_success("Session Token Generated")
        
        # ============== TEST 2: GET /api/auth/me ==============
        print("\n2. Testing authentication with session token...")
        
        headers = {"Authorization": f"Bearer {session_token}"}
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
        
        if response.status_code != 200:
            results.add_failure("Authentication Check", f"Status {response.status_code}: {response.text}")
            return results
        
        me_response = response.json()
        
        # Verify authenticated user data
        if me_response["user_id"] != user_id:
            results.add_failure("Auth User ID", f"Expected {user_id}, got {me_response['user_id']}")
            return results
        
        if me_response["email"] != test_email:
            results.add_failure("Auth User Email", f"Expected {test_email}, got {me_response['email']}")
            return results
        
        if me_response["role"] != "MOM":
            results.add_failure("Auth User Role", f"Expected MOM, got {me_response['role']}")
            return results
        
        results.add_success("Authentication with Bearer Token")
        results.add_success("User Data Retrieval")
        
        # ============== TEST 3: POST /api/mom/onboarding ==============
        print("\n3. Testing mom onboarding...")
        
        onboarding_data = {
            "due_date": "2025-08-15",
            "planned_birth_setting": "Hospital",
            "location_city": "Austin",
            "location_state": "Texas"
        }
        
        response = requests.post(f"{BACKEND_URL}/mom/onboarding", 
                               json=onboarding_data, 
                               headers=headers)
        
        if response.status_code != 200:
            results.add_failure("Mom Onboarding", f"Status {response.status_code}: {response.text}")
            return results
        
        onboarding_response = response.json()
        
        # Verify onboarding response
        if "message" not in onboarding_response:
            results.add_failure("Onboarding Response", "Missing message field")
            return results
        
        if "profile" not in onboarding_response:
            results.add_failure("Onboarding Response", "Missing profile field")
            return results
        
        profile = onboarding_response["profile"]
        
        # Verify profile data was saved correctly
        if profile["due_date"] != "2025-08-15":
            results.add_failure("Onboarding Due Date", f"Expected 2025-08-15, got {profile['due_date']}")
            return results
        
        if profile["planned_birth_setting"] != "Hospital":
            results.add_failure("Onboarding Birth Setting", f"Expected Hospital, got {profile['planned_birth_setting']}")
            return results
        
        if profile["location_city"] != "Austin":
            results.add_failure("Onboarding City", f"Expected Austin, got {profile['location_city']}")
            return results
        
        if profile["location_state"] != "Texas":
            results.add_failure("Onboarding State", f"Expected Texas, got {profile['location_state']}")
            return results
        
        results.add_success("Mom Onboarding")
        results.add_success("Onboarding Data Persistence")
        
        # ============== TEST 4: Verify onboarding completion ==============
        print("\n4. Verifying onboarding completion...")
        
        response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
        
        if response.status_code != 200:
            results.add_failure("Onboarding Completion Check", f"Status {response.status_code}: {response.text}")
            return results
        
        me_response = response.json()
        
        if not me_response.get("onboarding_completed"):
            results.add_failure("Onboarding Completion Flag", "onboarding_completed should be true after onboarding")
            return results
        
        results.add_success("Onboarding Completion Flag Updated")
        
        # ============== TEST 5: Additional endpoint tests ==============
        print("\n5. Testing additional MOM endpoints...")
        
        # Test birth plan creation (should be automatic after onboarding)
        response = requests.get(f"{BACKEND_URL}/birth-plan", headers=headers)
        
        if response.status_code != 200:
            results.add_failure("Birth Plan Access", f"Status {response.status_code}: {response.text}")
        else:
            birth_plan = response.json()
            if "plan_id" in birth_plan and "sections" in birth_plan:
                results.add_success("Birth Plan Auto-Creation")
            else:
                results.add_failure("Birth Plan Structure", "Missing plan_id or sections")
        
        # Test mom profile retrieval
        response = requests.get(f"{BACKEND_URL}/mom/profile", headers=headers)
        
        if response.status_code != 200:
            results.add_failure("Mom Profile Access", f"Status {response.status_code}: {response.text}")
        else:
            mom_profile = response.json()
            if mom_profile.get("user_id") == user_id:
                results.add_success("Mom Profile Retrieval")
            else:
                results.add_failure("Mom Profile Data", f"User ID mismatch")
    
    except requests.exceptions.RequestException as e:
        results.add_failure("Network Connection", f"Connection error: {str(e)}")
    except Exception as e:
        results.add_failure("Unexpected Error", f"Error: {str(e)}")
    
    return results

def main():
    """Run all authentication tests"""
    print("True Joy Birthing API - MOM Authentication Flow Test")
    print(f"Starting test at {datetime.now(timezone.utc).isoformat()}")
    
    results = test_mom_authentication_flow()
    
    results.print_summary()
    
    # Return appropriate exit code
    if results.failed > 0:
        sys.exit(1)
    else:
        print(f"\n🎉 All tests passed! The MOM authentication flow is working correctly.")
        sys.exit(0)

if __name__ == "__main__":
    main()