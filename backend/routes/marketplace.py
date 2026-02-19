"""
Marketplace Routes Module

Handles provider search and discovery for Moms.
Feature parity with original server.py marketplace routes.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from .dependencies import db

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ============== ROUTES ==============

@router.get("/providers")
async def search_providers(
    provider_type: Optional[str] = Query(None, description="Filter by DOULA or MIDWIFE"),
    location_city: Optional[str] = Query(None, description="Filter by city"),
    location_state: Optional[str] = Query(None, description="Filter by state"),
    birth_setting: Optional[str] = Query(None, description="Filter by birth setting (midwives only)"),
    virtual_available: Optional[bool] = Query(None, description="Filter by virtual availability"),
    search: Optional[str] = Query(None, description="Search name, city, state, or zip")
):
    """
    Search for providers in marketplace - supports multi-field search.
    Returns doulas and midwives who have in_marketplace=True and accepting_new_clients=True.
    """
    doulas = []
    midwives = []
    
    # Search doulas
    if not provider_type or provider_type == "DOULA":
        doula_query = {"in_marketplace": True, "accepting_new_clients": True}
        
        doula_profiles = await db.doula_profiles.find(doula_query, {"_id": 0}).to_list(100)
        for profile in doula_profiles:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                # Apply search filter
                if search:
                    search_lower = search.lower()
                    name_match = user.get("full_name", "").lower().find(search_lower) >= 0
                    city_match = profile.get("location_city", "").lower().find(search_lower) >= 0
                    state_match = profile.get("location_state", "").lower().find(search_lower) >= 0
                    zip_match = profile.get("zip_code", "").find(search) >= 0 if profile.get("zip_code") else False
                    
                    if not (name_match or city_match or state_match or zip_match):
                        continue
                
                # Apply individual filters
                if location_city and profile.get("location_city", "").lower().find(location_city.lower()) < 0:
                    continue
                if location_state and profile.get("location_state", "").lower().find(location_state.lower()) < 0:
                    continue
                
                doulas.append({
                    "provider_type": "DOULA",
                    "user": user,
                    "profile": profile
                })
    
    # Search midwives
    if not provider_type or provider_type == "MIDWIFE":
        midwife_query = {"in_marketplace": True, "accepting_new_clients": True}
        
        midwife_profiles = await db.midwife_profiles.find(midwife_query, {"_id": 0}).to_list(100)
        for profile in midwife_profiles:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0, "password_hash": 0})
            if user:
                # Apply search filter
                if search:
                    search_lower = search.lower()
                    name_match = user.get("full_name", "").lower().find(search_lower) >= 0
                    city_match = profile.get("location_city", "").lower().find(search_lower) >= 0
                    state_match = profile.get("location_state", "").lower().find(search_lower) >= 0
                    zip_match = profile.get("zip_code", "").find(search) >= 0 if profile.get("zip_code") else False
                    
                    if not (name_match or city_match or state_match or zip_match):
                        continue
                
                # Apply individual filters
                if location_city and profile.get("location_city", "").lower().find(location_city.lower()) < 0:
                    continue
                if location_state and profile.get("location_state", "").lower().find(location_state.lower()) < 0:
                    continue
                if birth_setting and birth_setting not in profile.get("birth_settings_served", []):
                    continue
                
                midwives.append({
                    "provider_type": "MIDWIFE",
                    "user": user,
                    "profile": profile
                })
    
    return {"doulas": doulas, "midwives": midwives}


@router.get("/provider/{user_id}")
async def get_provider_profile(user_id: str):
    """Get a provider's public profile with client count"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if user["role"] == "DOULA":
        profile = await db.doula_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    elif user["role"] == "MIDWIFE":
        profile = await db.midwife_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    else:
        raise HTTPException(status_code=400, detail="User is not a provider")
    
    return {
        "user": user,
        "profile": profile,
        "clients_served": clients_served
    }
