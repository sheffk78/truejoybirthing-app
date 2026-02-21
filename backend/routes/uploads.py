"""
File Upload Routes Module

Handles image uploads for profile pictures and other assets.
Images are stored as base64 data URLs in the database.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import base64
import re
from datetime import datetime, timezone
import uuid

from .dependencies import db, get_current_user, User

router = APIRouter(prefix="/uploads", tags=["Uploads"])


class ImageUploadRequest(BaseModel):
    image_data: str  # Base64 encoded image data (data URL format)
    image_type: str = "profile"  # profile, document, etc.


class ImageUploadResponse(BaseModel):
    image_url: str
    image_id: str


def validate_base64_image(data_url: str) -> tuple[str, str]:
    """Validate and parse a base64 data URL.
    Returns (mime_type, base64_data)
    """
    # Expected format: data:image/png;base64,iVBORw0KGgo...
    pattern = r'^data:image/(png|jpeg|jpg|gif|webp);base64,(.+)$'
    match = re.match(pattern, data_url)
    
    if not match:
        raise ValueError("Invalid image format. Expected base64 data URL.")
    
    mime_type = f"image/{match.group(1)}"
    base64_data = match.group(2)
    
    # Validate base64 data
    try:
        decoded = base64.b64decode(base64_data)
        # Check file size (max 5MB)
        if len(decoded) > 5 * 1024 * 1024:
            raise ValueError("Image too large. Maximum size is 5MB.")
    except Exception as e:
        raise ValueError(f"Invalid base64 data: {str(e)}")
    
    return mime_type, base64_data


@router.post("/image", response_model=ImageUploadResponse)
async def upload_image(request: ImageUploadRequest, user: User = Depends(get_current_user)):
    """Upload an image as base64 data URL.
    
    The image is stored in the database and a reference URL is returned.
    For profile pictures, the data URL can be used directly.
    """
    try:
        mime_type, base64_data = validate_base64_image(request.image_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    now = datetime.now(timezone.utc)
    image_id = f"img_{uuid.uuid4().hex[:12]}"
    
    # Store the image reference
    image_doc = {
        "image_id": image_id,
        "user_id": user.user_id,
        "image_type": request.image_type,
        "mime_type": mime_type,
        "data_url": request.image_data,  # Store the full data URL
        "created_at": now
    }
    
    await db.images.insert_one(image_doc)
    
    # For profile pictures, return the data URL directly
    # This avoids needing a separate endpoint to serve the image
    return ImageUploadResponse(
        image_url=request.image_data,
        image_id=image_id
    )


@router.get("/image/{image_id}")
async def get_image(image_id: str):
    """Get an image by ID.
    
    Returns the image data URL.
    """
    image = await db.images.find_one(
        {"image_id": image_id},
        {"_id": 0, "data_url": 1}
    )
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    return {"image_url": image["data_url"]}
