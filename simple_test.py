#!/usr/bin/env python3
"""
Simple backend connectivity test
"""

import requests
import json

BASE_URL = "https://joy-birth-dev.preview.emergentagent.com/api"

def test_basic_connectivity():
    """Test basic server connectivity"""
    print("Testing basic connectivity...")
    
    try:
        # Test simple GET request
        response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        print(f"✅ Server accessible - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Test registration
        register_data = {
            "email": "simple.test@example.com",
            "full_name": "Simple Test",
            "role": "MOM",
            "password": "TestPassword123!"
        }
        
        response = requests.post(f"{BASE_URL}/auth/register", 
                                json=register_data, 
                                timeout=10)
        print(f"✅ Registration test - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            token = data["session_token"]
            
            # Test authenticated request
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/auth/me", 
                                  headers=headers, 
                                  timeout=10)
            print(f"✅ Authenticated request - Status: {response.status_code}")
            print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_basic_connectivity()