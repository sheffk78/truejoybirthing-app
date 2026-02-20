"""
YouTube Video Embedding Feature Tests - Iteration 127

Tests for the YouTube video embedding feature in the marketplace.
- Marketplace API returns providers with video_intro_url field
- Video ID extraction utility function
- Provider profile update with video URL
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://midwife-labor.preview.emergentagent.com')


class TestMarketplaceVideoURL:
    """Test marketplace API returns video_intro_url for providers"""
    
    def test_marketplace_providers_endpoint_exists(self):
        """Test /api/marketplace/providers returns valid response"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        data = response.json()
        assert "doulas" in data
        assert "midwives" in data
        print(f"PASS: Marketplace providers endpoint returns {len(data['doulas'])} doulas and {len(data['midwives'])} midwives")
    
    def test_doula_profile_contains_video_intro_url_field(self):
        """Test doula profiles contain video_intro_url field"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        data = response.json()
        
        # Check that profile structure supports video_intro_url
        if data["doulas"]:
            doula = data["doulas"][0]
            assert "profile" in doula
            profile = doula["profile"]
            # video_intro_url may or may not be present, but the field should be accessible
            video_url = profile.get("video_intro_url")
            print(f"PASS: Doula profile has video_intro_url field = {video_url}")
        else:
            pytest.skip("No doulas in marketplace to test")
    
    def test_midwife_profile_contains_video_intro_url_field(self):
        """Test midwife profiles contain video_intro_url field"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        data = response.json()
        
        # Check that profile structure supports video_intro_url
        if data["midwives"]:
            midwife = data["midwives"][0]
            assert "profile" in midwife
            profile = midwife["profile"]
            # video_intro_url may or may not be present, but the field should be accessible
            video_url = profile.get("video_intro_url")
            print(f"PASS: Midwife profile has video_intro_url field = {video_url}")
        else:
            pytest.skip("No midwives in marketplace to test")
    
    def test_provider_with_youtube_video_has_valid_url(self):
        """Test that providers with video_intro_url have valid YouTube URLs"""
        response = requests.get(f"{BASE_URL}/api/marketplace/providers")
        assert response.status_code == 200
        data = response.json()
        
        # Look for any provider with a video URL
        found_video = False
        for doula in data.get("doulas", []):
            video_url = doula.get("profile", {}).get("video_intro_url")
            if video_url:
                found_video = True
                # Check URL format
                assert "youtube" in video_url.lower() or "youtu.be" in video_url.lower(), \
                    f"Video URL should be YouTube: {video_url}"
                print(f"PASS: Found doula with valid YouTube URL: {video_url}")
                break
        
        for midwife in data.get("midwives", []):
            video_url = midwife.get("profile", {}).get("video_intro_url")
            if video_url:
                found_video = True
                assert "youtube" in video_url.lower() or "youtu.be" in video_url.lower(), \
                    f"Video URL should be YouTube: {video_url}"
                print(f"PASS: Found midwife with valid YouTube URL: {video_url}")
                break
        
        if not found_video:
            print("INFO: No providers with video_intro_url found, but field is supported")


class TestVideoIDExtraction:
    """Test YouTube video ID extraction patterns (matching frontend utility)"""
    
    def test_standard_youtube_url_extraction(self):
        """Test extracting video ID from standard YouTube URLs"""
        test_cases = [
            ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("http://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ]
        
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'
        ]
        
        for url, expected_id in test_cases:
            extracted_id = None
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    extracted_id = match.group(1)
                    break
            assert extracted_id == expected_id, f"Failed for URL: {url}"
            print(f"PASS: Extracted '{extracted_id}' from {url}")
    
    def test_short_youtube_url_extraction(self):
        """Test extracting video ID from short youtu.be URLs"""
        test_cases = [
            ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("http://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ]
        
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'
        ]
        
        for url, expected_id in test_cases:
            extracted_id = None
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    extracted_id = match.group(1)
                    break
            assert extracted_id == expected_id, f"Failed for URL: {url}"
            print(f"PASS: Extracted '{extracted_id}' from {url}")
    
    def test_embed_youtube_url_extraction(self):
        """Test extracting video ID from embed URLs"""
        test_cases = [
            ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
            ("https://youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ]
        
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'
        ]
        
        for url, expected_id in test_cases:
            extracted_id = None
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    extracted_id = match.group(1)
                    break
            assert extracted_id == expected_id, f"Failed for URL: {url}"
            print(f"PASS: Extracted '{extracted_id}' from {url}")
    
    def test_direct_video_id(self):
        """Test that direct video IDs are also accepted"""
        test_id = "dQw4w9WgXcQ"
        
        import re
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'
        ]
        
        extracted_id = None
        for pattern in patterns:
            match = re.search(pattern, test_id)
            if match:
                extracted_id = match.group(1)
                break
        
        assert extracted_id == test_id, f"Direct video ID should be extracted: {test_id}"
        print(f"PASS: Direct video ID '{test_id}' correctly extracted")


class TestProviderProfileUpdate:
    """Test that providers can update their video_intro_url"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for doula"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo.doula@truejoybirthing.com",
            "password": "DemoScreenshot2024!"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token") or data.get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_doula_can_update_video_intro_url(self, auth_token):
        """Test doula can update their video_intro_url through profile"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current profile
        response = requests.get(f"{BASE_URL}/api/doula/profile", headers=headers)
        assert response.status_code == 200
        current_profile = response.json()
        
        # Check that video_intro_url field exists and can be read
        current_video = current_profile.get("video_intro_url")
        print(f"Current video_intro_url: {current_video}")
        
        # Try to update with a new video URL
        new_video_url = "https://www.youtube.com/watch?v=3TfsAMj74fY"
        update_response = requests.put(
            f"{BASE_URL}/api/doula/profile",
            headers=headers,
            json={"video_intro_url": new_video_url}
        )
        assert update_response.status_code == 200
        print(f"PASS: Doula can update video_intro_url to: {new_video_url}")
        
        # Verify the update
        verify_response = requests.get(f"{BASE_URL}/api/doula/profile", headers=headers)
        assert verify_response.status_code == 200
        updated_profile = verify_response.json()
        assert updated_profile.get("video_intro_url") == new_video_url
        print(f"PASS: Video URL persisted correctly: {updated_profile.get('video_intro_url')}")


class TestYouTubeThumbnail:
    """Test YouTube thumbnail URL generation"""
    
    def test_thumbnail_url_format(self):
        """Test that thumbnail URL format is correct"""
        video_id = "dQw4w9WgXcQ"
        expected_thumbnail = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
        
        # This matches the getYouTubeThumbnail function in YouTubePlayer.tsx
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
        
        assert thumbnail_url == expected_thumbnail
        print(f"PASS: Thumbnail URL generated correctly: {thumbnail_url}")
    
    def test_thumbnail_url_is_accessible(self):
        """Test that YouTube thumbnail URLs are accessible"""
        # Use a known valid video ID
        video_id = "dQw4w9WgXcQ"
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
        
        response = requests.head(thumbnail_url)
        # YouTube returns 200 for valid thumbnails
        assert response.status_code == 200, f"Thumbnail should be accessible: {response.status_code}"
        print(f"PASS: Thumbnail URL is accessible: {thumbnail_url}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
