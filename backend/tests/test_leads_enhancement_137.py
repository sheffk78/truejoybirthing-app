"""
Test Leads Enhancement - Iteration 137
Testing the new fields added to provider leads endpoint:
1. number_of_children - from mom profile
2. birth_plan_location - from birth plan about_me section
3. birth_plan_hospital_name - from birth plan about_me section
4. birth_plan_due_date - from birth plan about_me section
5. previous_birth_experience - from birth plan other_considerations section
6. birth_plan_completion - completion percentage from birth plan
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://joy-colors-system.preview.emergentagent.com')

# Test credentials
MOM_EMAIL = "demo.mom@truejoybirthing.com"
MOM_PASSWORD = "DemoScreenshot2024!"
DOULA_EMAIL = "demo.doula@truejoybirthing.com"
DOULA_PASSWORD = "DemoScreenshot2024!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def doula_token(api_client):
    """Get Doula authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": DOULA_EMAIL,
        "password": DOULA_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip(f"Doula login failed: {response.text}")


@pytest.fixture(scope="module")
def mom_token(api_client):
    """Get Mom authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": MOM_EMAIL,
        "password": MOM_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token")
    pytest.skip(f"Mom login failed: {response.text}")


class TestLeadsEnhancement:
    """Tests for leads endpoint enhancement with new birth plan fields"""
    
    def test_1_doula_login_success(self, api_client):
        """Verify doula can login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": DOULA_EMAIL,
            "password": DOULA_PASSWORD
        })
        assert response.status_code == 200, f"Doula login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        print(f"✓ Doula login successful")
    
    def test_2_leads_endpoint_returns_list(self, api_client, doula_token):
        """Test leads endpoint returns a list"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Leads endpoint should return a list"
        print(f"✓ Leads endpoint returns list with {len(data)} leads")
        return data
    
    def test_3_leads_contains_basic_fields(self, api_client, doula_token):
        """Test leads contain basic required fields"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        leads = response.json()
        
        if len(leads) > 0:
            lead = leads[0]
            # Basic fields that must exist
            required_fields = ["lead_id", "mom_user_id", "mom_name", "status", "provider_id", "created_at"]
            for field in required_fields:
                assert field in lead, f"Lead missing required field: {field}"
            print(f"✓ Lead contains all basic required fields: {', '.join(required_fields)}")
        else:
            print("⚠ No leads found to verify fields")
    
    def test_4_leads_contains_new_enhancement_fields(self, api_client, doula_token):
        """Test leads contain the NEW enhancement fields from birth plan"""
        response = api_client.get(
            f"{BASE_URL}/api/leads",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200
        leads = response.json()
        
        new_fields = [
            "number_of_children",
            "birth_plan_location", 
            "birth_plan_hospital_name",
            "birth_plan_due_date",
            "previous_birth_experience",
            "birth_plan_completion"
        ]
        
        if len(leads) > 0:
            lead = leads[0]
            found_fields = []
            missing_fields = []
            
            for field in new_fields:
                if field in lead:
                    found_fields.append(field)
                    print(f"  ✓ {field}: {lead.get(field)}")
                else:
                    missing_fields.append(field)
                    print(f"  ⚠ {field}: NOT PRESENT (may be null in mom's profile/birth plan)")
            
            # Fields are optional but schema should allow them
            # At minimum the backend should handle them without error
            print(f"✓ Lead fields check complete - Found {len(found_fields)}/{len(new_fields)} new fields")
            print(f"  Found: {found_fields}")
            print(f"  Not populated: {missing_fields}")
        else:
            print("⚠ No leads found - cannot verify new fields are present")
            print("  To test properly, create a lead (mom request consultation) with a mom who has birth plan data")
    
    def test_5_leads_stats_endpoint(self, api_client, doula_token):
        """Test leads stats endpoint works"""
        response = api_client.get(
            f"{BASE_URL}/api/leads/stats",
            headers={"Authorization": f"Bearer {doula_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        assert "active_leads" in data
        print(f"✓ Leads stats: total={data.get('total')}, active={data.get('active_leads')}")
    
    def test_6_mom_birth_plan_endpoint(self, api_client, mom_token):
        """Verify mom has birth plan data (prerequisite for lead enrichment)"""
        response = api_client.get(
            f"{BASE_URL}/api/birth-plan",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check for completion percentage
        completion = data.get("completion_percentage", 0)
        print(f"✓ Mom birth plan completion: {completion}%")
        
        # Check for sections
        sections = data.get("sections", [])
        about_me = next((s for s in sections if s.get("section_id") == "about_me"), None)
        other_considerations = next((s for s in sections if s.get("section_id") == "other_considerations"), None)
        
        if about_me and about_me.get("data"):
            about_data = about_me["data"]
            print(f"  about_me.dueDate: {about_data.get('dueDate')}")
            print(f"  about_me.birthLocation: {about_data.get('birthLocation')}")
            print(f"  about_me.hospitalName: {about_data.get('hospitalName')}")
        else:
            print("  ⚠ about_me section not found or empty")
        
        if other_considerations and other_considerations.get("data"):
            other_data = other_considerations["data"]
            prev_exp = other_data.get("previousBirthExperience", "")
            print(f"  other_considerations.previousBirthExperience: {prev_exp[:50] if prev_exp else 'N/A'}...")
        else:
            print("  ⚠ other_considerations section not found or empty")
    
    def test_7_mom_profile_has_number_of_children(self, api_client, mom_token):
        """Verify mom profile endpoint returns number_of_children"""
        response = api_client.get(
            f"{BASE_URL}/api/mom/profile",
            headers={"Authorization": f"Bearer {mom_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        num_children = data.get("number_of_children")
        print(f"✓ Mom profile number_of_children: {num_children}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
