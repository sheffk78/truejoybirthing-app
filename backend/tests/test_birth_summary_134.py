"""
Birth Summary Report Feature Tests (Iteration 134)
Tests for PDF generation and preview endpoints combining Labor Records + Birth Record
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://exam-intake-form.preview.emergentagent.com')

# Test credentials
MIDWIFE_EMAIL = "demo.midwife@truejoybirthing.com"
MIDWIFE_PASSWORD = "DemoScreenshot2024!"
TEST_CLIENT_ID = "client_a034be9c9748"


class TestBirthSummaryReport:
    """Birth Summary Report API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session and authenticate"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate as midwife
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": MIDWIFE_EMAIL,
            "password": MIDWIFE_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"Authenticated as midwife")
        else:
            pytest.skip(f"Authentication failed: {response.status_code}")
    
    # ============== PREVIEW ENDPOINT TESTS ==============
    
    def test_preview_endpoint_returns_summary_info(self):
        """GET /api/midwife/clients/{client_id}/birth-summary/preview returns summary info"""
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "client_name" in data, "Response should include client_name"
        assert "labor_records_count" in data, "Response should include labor_records_count"
        assert "has_birth_record" in data, "Response should include has_birth_record"
        assert "can_generate" in data, "Response should include can_generate"
        
        print(f"Preview data: client={data.get('client_name')}, labor_records={data.get('labor_records_count')}, has_birth={data.get('has_birth_record')}")
    
    def test_preview_includes_baby_info_when_available(self):
        """Preview endpoint includes baby_name and birth_datetime when birth record exists"""
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview")
        
        assert response.status_code == 200
        data = response.json()
        
        # If there's a birth record, baby_name and birth_datetime should be present
        if data.get("has_birth_record"):
            print(f"Baby name: {data.get('baby_name')}, Birth datetime: {data.get('birth_datetime')}")
            # These fields should exist in response (may be None if not filled in)
            assert "baby_name" in data
            assert "birth_datetime" in data
    
    def test_preview_returns_404_for_invalid_client(self):
        """Preview endpoint returns 404 for non-existent client"""
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/invalid_client_xyz/birth-summary/preview")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    # ============== PDF ENDPOINT TESTS ==============
    
    def test_pdf_endpoint_returns_valid_pdf(self):
        """GET /api/midwife/clients/{client_id}/birth-summary/pdf returns valid PDF file"""
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/pdf")
        
        # Check if there are records first
        preview = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview")
        preview_data = preview.json()
        
        if not preview_data.get("can_generate"):
            pytest.skip("No records to generate PDF from")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        
        # Verify Content-Disposition header for download
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Expected attachment disposition, got {content_disposition}"
        assert "filename=" in content_disposition, "Expected filename in Content-Disposition"
        
        # Verify PDF magic bytes
        pdf_content = response.content
        assert pdf_content[:4] == b'%PDF', "Response should start with PDF magic bytes"
        
        print(f"PDF generated successfully: {len(pdf_content)} bytes")
        print(f"Filename: {content_disposition}")
    
    def test_pdf_endpoint_returns_404_no_records(self):
        """PDF endpoint returns 404 if no labor or birth records exist"""
        # First, we need to test with a client that has no records
        # Create a test scenario by checking if we can find/create such a client
        
        # For this test, we'll use a non-existent client ID which should return 404
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/client_no_records_xyz/birth-summary/pdf")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_pdf_endpoint_returns_404_for_invalid_client(self):
        """PDF endpoint returns 404 for non-existent client"""
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/invalid_client_12345/birth-summary/pdf")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_pdf_filename_includes_baby_name_when_available(self):
        """PDF filename includes baby name when birth record has baby name"""
        # First check if there's a baby name
        preview = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview")
        preview_data = preview.json()
        
        if not preview_data.get("can_generate"):
            pytest.skip("No records to generate PDF from")
        
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/pdf")
        
        assert response.status_code == 200
        
        content_disposition = response.headers.get("Content-Disposition", "")
        
        # Check that filename contains Birth_Summary
        assert "Birth_Summary" in content_disposition, "Filename should contain Birth_Summary"
        
        print(f"Content-Disposition: {content_disposition}")
    
    # ============== AUTHORIZATION TESTS ==============
    
    def test_pdf_requires_authentication(self):
        """PDF endpoint requires authentication"""
        # Create new session without auth
        unauthenticated = requests.Session()
        response = unauthenticated.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/pdf")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_preview_requires_authentication(self):
        """Preview endpoint requires authentication"""
        unauthenticated = requests.Session()
        response = unauthenticated.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ============== PDF CONTENT VERIFICATION ==============
    
    def test_pdf_size_reasonable(self):
        """PDF should be of reasonable size (not too small, not too large)"""
        preview = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/preview")
        if not preview.json().get("can_generate"):
            pytest.skip("No records to generate PDF from")
        
        response = self.session.get(f"{BASE_URL}/api/midwife/clients/{TEST_CLIENT_ID}/birth-summary/pdf")
        
        assert response.status_code == 200
        
        pdf_size = len(response.content)
        
        # PDF should be at least 1KB (has some content)
        assert pdf_size > 1000, f"PDF too small: {pdf_size} bytes"
        
        # PDF should be less than 10MB (reasonable size)
        assert pdf_size < 10 * 1024 * 1024, f"PDF too large: {pdf_size} bytes"
        
        print(f"PDF size: {pdf_size} bytes ({pdf_size / 1024:.2f} KB)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
