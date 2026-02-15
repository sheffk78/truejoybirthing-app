#!/usr/bin/env python3
"""
True Joy Birthing API Backend Testing Suite
Tests all core backend API endpoints for the birthing app with 4 user roles.
"""

import requests
import json
import sys
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://joy-birth-v1.preview.emergentagent.com/api"
TEST_PASSWORD = "SecureTestPass123!"

# Use timestamp to make emails unique
timestamp = str(int(time.time()))

class APITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "True Joy Testing Suite"})
        self.test_users = {}
        self.test_clients = {}
        self.test_contracts = {}
        self.test_invoices = {}
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_success(self, test_name):
        """Log successful test"""
        print(f"✅ {test_name}")
        self.results["passed"] += 1

    def log_failure(self, test_name, error):
        """Log failed test"""
        print(f"❌ {test_name}: {error}")
        self.results["failed"] += 1
        self.results["errors"].append(f"{test_name}: {error}")

    def make_request(self, method, endpoint, data=None, headers=None, auth_token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        request_headers = {"Content-Type": "application/json"}
        
        if auth_token:
            request_headers["Authorization"] = f"Bearer {auth_token}"
        
        if headers:
            request_headers.update(headers)

        try:
            if method == "GET":
                response = self.session.get(url, headers=request_headers, timeout=30)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=request_headers, timeout=30)
            elif method == "PUT":
                response = self.session.put(url, json=data, headers=request_headers, timeout=30)
            elif method == "DELETE":
                response = self.session.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.Timeout as e:
            print(f"Timeout error for {url}: {e}")
            return None
        except requests.exceptions.ConnectionError as e:
            print(f"Connection error for {url}: {e}")
            return None
        except Exception as e:
            print(f"Request error for {url}: {e}")
            return None

    def test_auth_endpoints(self):
        """Test all authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")
        
        # Test user registration for each role
        test_users_data = [
            {"role": "MOM", "email": f"test.mom.{timestamp}@example.com", "name": "Sarah Johnson"},
            {"role": "DOULA", "email": f"test.doula.{timestamp}@example.com", "name": "Lisa Smith"},
            {"role": "MIDWIFE", "email": f"test.midwife.{timestamp}@example.com", "name": "Dr. Jane Wilson"}
        ]
        
        for user_data in test_users_data:
            # Test Registration
            register_data = {
                "email": user_data["email"],
                "full_name": user_data["name"],
                "role": user_data["role"],
                "password": TEST_PASSWORD
            }
            
            response = self.make_request("POST", "/auth/register", register_data)
            if response and response.status_code == 200:
                self.log_success(f"Register {user_data['role']} user")
                response_data = response.json()
                self.test_users[user_data["role"]] = {
                    "user_id": response_data["user_id"],
                    "email": user_data["email"],
                    "session_token": response_data["session_token"],
                    "role": user_data["role"]
                }
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_failure(f"Register {user_data['role']} user", error_msg)
                continue
            
            # Test Login
            login_data = {
                "email": user_data["email"],
                "password": TEST_PASSWORD
            }
            
            response = self.make_request("POST", "/auth/login", login_data)
            if response and response.status_code == 200:
                self.log_success(f"Login {user_data['role']} user")
                response_data = response.json()
                # Update session token from login
                self.test_users[user_data["role"]]["session_token"] = response_data["session_token"]
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_failure(f"Login {user_data['role']} user", error_msg)
            
            # Test Get Current User
            token = self.test_users[user_data["role"]]["session_token"]
            response = self.make_request("GET", "/auth/me", auth_token=token)
            if response and response.status_code == 200:
                self.log_success(f"Get current user info for {user_data['role']}")
                response_data = response.json()
                if response_data["role"] != user_data["role"]:
                    self.log_failure(f"User role verification for {user_data['role']}", 
                                   f"Expected role {user_data['role']}, got {response_data['role']}")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_failure(f"Get current user info for {user_data['role']}", error_msg)

    def test_mom_endpoints(self):
        """Test Mom-specific endpoints"""
        print("\n=== Testing Mom Endpoints ===")
        
        if "MOM" not in self.test_users:
            self.log_failure("Mom endpoints test", "Mom user not available")
            return
        
        token = self.test_users["MOM"]["session_token"]
        
        # Test Mom Onboarding
        onboarding_data = {
            "due_date": "2025-08-15",
            "planned_birth_setting": "Hospital",
            "location_city": "Austin",
            "location_state": "Texas"
        }
        
        response = self.make_request("POST", "/mom/onboarding", onboarding_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Mom onboarding")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Mom onboarding", error_msg)
        
        # Test Get Birth Plan
        response = self.make_request("GET", "/birth-plan", auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Get birth plan")
            birth_plan = response.json()
            
            # Test Update Birth Plan Section
            if birth_plan.get("sections") and len(birth_plan["sections"]) > 0:
                section_id = birth_plan["sections"][0]["section_id"]
                update_data = {
                    "data": {
                        "pain_management_preference": "Natural birth",
                        "epidural_preference": "Open to it if needed"
                    },
                    "notes_to_provider": "Would like to try natural methods first"
                }
                
                response = self.make_request("PUT", f"/birth-plan/section/{section_id}", 
                                           update_data, auth_token=token)
                if response and response.status_code == 200:
                    self.log_success("Update birth plan section")
                else:
                    error_msg = f"Status: {response.status_code if response else 'No response'}"
                    if response:
                        try:
                            error_msg += f", Error: {response.json()}"
                        except:
                            error_msg += f", Text: {response.text}"
                    self.log_failure("Update birth plan section", error_msg)
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Get birth plan", error_msg)
        
        # Test Wellness Check-in
        checkin_data = {
            "mood": "Good",
            "mood_note": "Feeling positive about the pregnancy today"
        }
        
        response = self.make_request("POST", "/wellness/checkin", checkin_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Create wellness check-in")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Create wellness check-in", error_msg)
        
        # Test Get Pregnancy Timeline
        response = self.make_request("GET", "/timeline", auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Get pregnancy timeline")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Get pregnancy timeline", error_msg)

    def test_doula_endpoints(self):
        """Test Doula-specific endpoints"""
        print("\n=== Testing Doula Endpoints ===")
        
        if "DOULA" not in self.test_users:
            self.log_failure("Doula endpoints test", "Doula user not available")
            return
        
        token = self.test_users["DOULA"]["session_token"]
        
        # Test Doula Onboarding
        onboarding_data = {
            "practice_name": "Peaceful Birth Doula Services",
            "location_city": "Austin",
            "location_state": "Texas",
            "services_offered": ["Birth Doula", "Postpartum Doula"],
            "years_in_practice": 5,
            "accepting_new_clients": True,
            "bio": "Experienced doula specializing in natural birth support"
        }
        
        response = self.make_request("POST", "/doula/onboarding", onboarding_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Doula onboarding")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Doula onboarding", error_msg)
        
        # Test Get Dashboard
        response = self.make_request("GET", "/doula/dashboard", auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Get doula dashboard")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Get doula dashboard", error_msg)
        
        # Test Create Client
        client_data = {
            "name": "Emma Thompson",
            "email": "emma.thompson@example.com",
            "phone": "555-0123",
            "edd": "2025-09-20",
            "planned_birth_setting": "Home"
        }
        
        response = self.make_request("POST", "/doula/clients", client_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Create doula client")
            client = response.json()
            self.test_clients["DOULA"] = client
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Create doula client", error_msg)
        
        # Test Get Clients
        response = self.make_request("GET", "/doula/clients", auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Get doula clients")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Get doula clients", error_msg)
        
        # Test Create Contract (if client exists)
        if "DOULA" in self.test_clients:
            contract_data = {
                "client_id": self.test_clients["DOULA"]["client_id"],
                "contract_title": "Birth Doula Support Services",
                "services_description": "Complete birth doula support including prenatal, birth, and immediate postpartum care",
                "total_fee": 1500.00,
                "payment_schedule_description": "$500 at signing, $500 at 36 weeks, $500 after birth",
                "cancellation_policy": "48 hours notice required",
                "scope_of_practice": "Emotional, physical, and informational support during labor and birth"
            }
            
            response = self.make_request("POST", "/doula/contracts", contract_data, auth_token=token)
            if response and response.status_code == 200:
                self.log_success("Create doula contract")
                contract = response.json()
                self.test_contracts["DOULA"] = contract
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_failure("Create doula contract", error_msg)
        
        # Test Create Invoice (if client exists)
        if "DOULA" in self.test_clients:
            invoice_data = {
                "client_id": self.test_clients["DOULA"]["client_id"],
                "invoice_title": "Birth Doula Services - First Payment",
                "amount": 500.00,
                "due_date": "2025-03-15",
                "notes": "First payment for birth doula services"
            }
            
            response = self.make_request("POST", "/doula/invoices", invoice_data, auth_token=token)
            if response and response.status_code == 200:
                self.log_success("Create doula invoice")
                invoice = response.json()
                self.test_invoices["DOULA"] = invoice
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_failure("Create doula invoice", error_msg)

    def test_midwife_endpoints(self):
        """Test Midwife-specific endpoints"""
        print("\n=== Testing Midwife Endpoints ===")
        
        if "MIDWIFE" not in self.test_users:
            self.log_failure("Midwife endpoints test", "Midwife user not available")
            return
        
        token = self.test_users["MIDWIFE"]["session_token"]
        
        # Test Midwife Onboarding
        onboarding_data = {
            "practice_name": "Austin Midwifery Care",
            "credentials": "CPM",
            "location_city": "Austin",
            "location_state": "Texas",
            "years_in_practice": 8,
            "birth_settings_served": ["Home", "Birth Center"],
            "accepting_new_clients": True,
            "bio": "Certified Professional Midwife with 8 years of experience in home and birth center births"
        }
        
        response = self.make_request("POST", "/midwife/onboarding", onboarding_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Midwife onboarding")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Midwife onboarding", error_msg)
        
        # Test Get Dashboard
        response = self.make_request("GET", "/midwife/dashboard", auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Get midwife dashboard")
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Get midwife dashboard", error_msg)
        
        # Test Create Client
        client_data = {
            "name": "Jessica Martinez",
            "email": "jessica.martinez@example.com",
            "phone": "555-0456",
            "edd": "2025-07-10",
            "planned_birth_setting": "Home"
        }
        
        response = self.make_request("POST", "/midwife/clients", client_data, auth_token=token)
        if response and response.status_code == 200:
            self.log_success("Create midwife client")
            client = response.json()
            self.test_clients["MIDWIFE"] = client
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_msg += f", Error: {response.json()}"
                except:
                    error_msg += f", Text: {response.text}"
            self.log_failure("Create midwife client", error_msg)
        
        # Test Create Visit (if client exists)
        if "MIDWIFE" in self.test_clients:
            visit_data = {
                "client_id": self.test_clients["MIDWIFE"]["client_id"],
                "visit_date": "2025-02-15",
                "visit_type": "Prenatal",
                "gestational_age": "20 weeks",
                "blood_pressure": "110/70",
                "weight": "145 lbs",
                "fetal_heart_rate": "150 bpm",
                "note": "Normal prenatal visit. Client is feeling well."
            }
            
            response = self.make_request("POST", "/midwife/visits", visit_data, auth_token=token)
            if response and response.status_code == 200:
                self.log_success("Create midwife visit")
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                if response:
                    try:
                        error_msg += f", Error: {response.json()}"
                    except:
                        error_msg += f", Text: {response.text}"
                self.log_failure("Create midwife visit", error_msg)

    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting True Joy Birthing API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"Test started at: {datetime.now()}")
        
        # Check if server is reachable
        try:
            response = requests.get(f"{self.base_url.replace('/api', '')}/health", timeout=10)
            if response.status_code != 200:
                # Try the API endpoint
                response = requests.get(f"{self.base_url}/auth/me", timeout=10)
        except Exception as e:
            print(f"❌ Server unreachable: {e}")
            return self.results
        
        # Run test suites
        self.test_auth_endpoints()
        self.test_mom_endpoints()
        self.test_doula_endpoints()
        self.test_midwife_endpoints()
        
        # Print results
        print(f"\n📊 Test Results:")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print(f"\n📋 Failed Tests:")
            for error in self.results['errors']:
                print(f"   - {error}")
        
        success_rate = (self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100) if (self.results['passed'] + self.results['failed']) > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = APITester(BASE_URL)
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results['failed'] == 0 else 1)