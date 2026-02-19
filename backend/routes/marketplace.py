"""
Marketplace Routes Module

Handles provider search and discovery for Moms.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List

from .dependencies import db

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ============== ROUTES ==============

@router.get("/providers")
async def search_providers(
    role: Optional[str] = Query(None, description="Filter by role: DOULA or MIDWIFE"),
    zip_code: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search in name, city, state, or zip"),
    services: Optional[List[str]] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0)
):
    """
    Search for providers in the marketplace.
    Supports filtering by role, location, services, and text search.
    """
    query = {
        "role": {"$in": ["DOULA", "MIDWIFE"]},
        "is_onboarded": True,
        "accepting_clients": {"$ne": False}  # Include if not explicitly set to False
    }
    
    if role:
        query["role"] = role.upper()
    
    if zip_code:
        query["zip_code"] = zip_code
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if state:
        query["state"] = {"$regex": f"^{state}$", "$options": "i"}
    
    if services:
        query["services_offered"] = {"$in": services}
    
    # Text search across multiple fields
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"full_name": search_regex},
            {"city": search_regex},
            {"state": search_regex},
            {"zip_code": search_regex}
        ]
    
    providers = await db.users.find(
        query,
        {
            "_id": 0,
            "password_hash": 0,
            "google_id": 0
        }
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with additional profile data
    for provider in providers:
        # Get profile from role-specific collection
        role_lower = provider.get("role", "").lower()
        if role_lower == "doula":
            profile = await db.doula_profiles.find_one(
                {"user_id": provider["user_id"]},
                {"_id": 0}
            )
        elif role_lower == "midwife":
            profile = await db.midwife_profiles.find_one(
                {"user_id": provider["user_id"]},
                {"_id": 0}
            )
        else:
            profile = None
        
        if profile:
            # Merge profile data
            provider["bio"] = profile.get("bio") or provider.get("bio")
            provider["experience_years"] = profile.get("experience_years")
            provider["services_offered"] = profile.get("services_offered", [])
            provider["certifications"] = profile.get("certifications", [])
            provider["video_intro_url"] = profile.get("video_intro_url")
            provider["more_about_me"] = profile.get("more_about_me")
    
    return providers


@router.get("/provider/{user_id}")
async def get_provider_detail(user_id: str):
    """Get detailed provider profile for marketplace view"""
    provider = await db.users.find_one(
        {"user_id": user_id, "role": {"$in": ["DOULA", "MIDWIFE"]}},
        {"_id": 0, "password_hash": 0, "google_id": 0}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Get role-specific profile
    role_lower = provider.get("role", "").lower()
    if role_lower == "doula":
        profile = await db.doula_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
    elif role_lower == "midwife":
        profile = await db.midwife_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
    else:
        profile = None
    
    # Merge profile data
    if profile:
        provider["bio"] = profile.get("bio") or provider.get("bio")
        provider["experience_years"] = profile.get("experience_years")
        provider["services_offered"] = profile.get("services_offered", [])
        provider["certifications"] = profile.get("certifications", [])
        provider["insurance_accepted"] = profile.get("insurance_accepted", [])
        provider["video_intro_url"] = profile.get("video_intro_url")
        provider["more_about_me"] = profile.get("more_about_me")
        provider["accepting_clients"] = profile.get("accepting_clients", True)
    
    return provider
