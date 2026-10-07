"""
Marketplace Routes Module

Handles provider search and discovery for Moms.
Feature parity with original server.py marketplace routes.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from .dependencies import db

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

# Fields to expose from user documents on the marketplace (no PII leakage)
USER_PUBLIC_FIELDS = {
    "_id": 0,
    "password_hash": 0,
    "email": 0,
    "phone_number": 0,
    "address": 0,
    "stripe_customer_id": 0,
    "stripe_account_id": 0,
    "reset_token": 0,
    "reset_token_expires": 0,
    "verification_token": 0,
    "created_at": 0,
    "updated_at": 0,
    "last_login": 0,
    "device_tokens": 0,
    "push_token": 0,
    "personal_notes": 0,
    "internal_flags": 0,
}

# ============== ROUTES ==============

def _search_corpus(user: dict, profile: dict) -> str:
    """Lowercased searchable text for one provider (10/05).

    Name, city, state, zip — PLUS the credential corpus (recognized codes,
    their full names and aliases, and any custom chips) so a mom can type
    "IBCLC", "lactation", or a pro's custom chip ("DONA") and find them.
    """
    from utils.credentials import CREDENTIALS, parse_credential_text
    parts = [
        user.get("full_name") or "",
        profile.get("location_city") or "",
        profile.get("location_state") or "",
        profile.get("zip_code") or "",
    ]
    known, custom = parse_credential_text(profile.get("credentials"))
    known2, custom2 = parse_credential_text(profile.get("certifications"))
    all_known = set(known) | set(known2)
    all_custom = custom + custom2
    # codes + display names + aliases of every RECOGNIZED credential the pro holds
    cred_text = []
    for c in CREDENTIALS:
        if c["code"] in all_known:
            cred_text.extend([c["code"], c["name"]] + c["aliases"])
    cred_text.extend(all_custom)
    parts.extend(cred_text)
    return " ".join(p for p in parts if p).lower()


def _search_match(user: dict, profile: dict, search_lower: str) -> bool:
    return search_lower in _search_corpus(user, profile)


def _credential_chips(profile: dict) -> dict:
    """Normalized credential chips for a provider card (10/05).

    Returns {"codes": [...], "custom": [...], "labels": [...]} — canonical
    codes with full display names, custom verbatim chips, and a flat list of
    everything for card rendering. Computed fresh (no DB migration needed).
    """
    from utils.credentials import parse_credential_text, credential_display
    known, custom = parse_credential_text(profile.get("credentials"))
    known2, custom2 = parse_credential_text(profile.get("certifications"))
    all_known = list(dict.fromkeys(known + known2))
    all_custom = list(dict.fromkeys(custom + custom2))
    return {
        "codes": all_known,
        "custom": all_custom,
        "labels": [
            {"code": c, "name": credential_display(c) or c} for c in all_known
        ] + [{"code": c, "name": c} for c in all_custom],
    }


@router.get("/credentials")
async def get_credential_vocabulary():
    """Recognized credential vocabulary for filter chips + onboarding (10/05).

    Common credentials are canonical (mom's filter taps codes; pro's entry
    normalizes). Unique credentials remain allowed — pros keep free-text
    chips, searchable by exact code.
    """
    from utils.credentials import CREDENTIALS, MARKETPLACE_FILTER_CODES
    return {
        "filters": [
            c for c in CREDENTIALS if c["code"] in MARKETPLACE_FILTER_CODES
        ],
        "all": CREDENTIALS,
    }


def _credential_match(profile: dict, credential: Optional[str]) -> bool:
    """Alias-aware credential match (10/05).

    Delegates to utils.credentials: the provider's stored credentials (any
    format — string, list, free text) are normalized to canonical codes plus
    custom chips, and the requested code must equal one of them. No substring
    accidents ("CN" no longer matches "CNM" unless CN is what the provider
    actually holds as a custom chip).
    """
    if not credential:
        return True
    from utils.credentials import provider_matches_credential
    return provider_matches_credential(profile, credential)


@router.get("/providers")
async def search_providers(
    provider_type: Optional[str] = Query(None, description="Filter by DOULA, MIDWIFE, or LACTATION"),
    location_city: Optional[str] = Query(None, description="Filter by city"),
    location_state: Optional[str] = Query(None, description="Filter by state"),
    birth_setting: Optional[str] = Query(None, description="Filter by birth setting (midwives only)"),
    search: Optional[str] = Query(None, description="Search name, city, state, or zip"),
    credential: Optional[str] = Query(None, description="Filter by credential code (CD, CLC, CPM, CNM, IBCLC)")
):
    """
    Search for providers in marketplace - supports multi-field search.
    Returns doulas and midwives who have in_marketplace=True and accepting_new_clients=True.
    """
    doulas = []
    midwives = []
    lactation = []
    
    # Search doulas
    if not provider_type or provider_type == "DOULA":
        doula_query = {"in_marketplace": True, "accepting_new_clients": True}
        
        doula_profiles = await db.doula_profiles.find(doula_query, {"_id": 0}).to_list(100)
        
        # Batch fetch all users for doula profiles (only public fields)
        doula_user_ids = [p["user_id"] for p in doula_profiles]
        doula_users = await db.users.find(
            {"user_id": {"$in": doula_user_ids}},
            USER_PUBLIC_FIELDS
        ).to_list(100)
        doula_users_by_id = {u["user_id"]: u for u in doula_users}
        
        for profile in doula_profiles:
            user = doula_users_by_id.get(profile["user_id"])
            # Unverified pros never appear in the marketplace (Jeff 2026-09-16)
            if user and not user.get("email_verified", False):
                continue
            if user:
                # Apply search filter
                if search:
                    if not _search_match(user, profile, search.lower()):
                        continue
                
                # Apply individual filters
                if location_city and (profile.get("location_city") or "").lower().find(location_city.lower()) < 0:
                    continue
                if location_state and (profile.get("location_state") or "").lower().find(location_state.lower()) < 0:
                    continue
                
                if not _credential_match(profile, credential):
                    continue
                doulas.append({
                    "provider_type": "DOULA",
                    "user": user,
                    "profile": profile,
                    "credential_chips": _credential_chips(profile),
                })
    
    # Search midwives
    if not provider_type or provider_type == "MIDWIFE":
        midwife_query = {"in_marketplace": True, "accepting_new_clients": True}
        
        midwife_profiles = await db.midwife_profiles.find(midwife_query, {"_id": 0}).to_list(100)
        
        # Batch fetch all users for midwife profiles (only public fields)
        midwife_user_ids = [p["user_id"] for p in midwife_profiles]
        midwife_users = await db.users.find(
            {"user_id": {"$in": midwife_user_ids}}, 
            USER_PUBLIC_FIELDS
        ).to_list(100)
        midwife_users_by_id = {u["user_id"]: u for u in midwife_users}
        
        for profile in midwife_profiles:
            user = midwife_users_by_id.get(profile["user_id"])
            # Unverified pros never appear in the marketplace (Jeff 2026-09-16)
            if user and not user.get("email_verified", False):
                continue
            if user:
                # Apply search filter
                if search:
                    if not _search_match(user, profile, search.lower()):
                        continue
                
                # Apply individual filters
                if location_city and (profile.get("location_city") or "").lower().find(location_city.lower()) < 0:
                    continue
                if location_state and (profile.get("location_state") or "").lower().find(location_state.lower()) < 0:
                    continue
                if birth_setting and birth_setting not in profile.get("birth_settings_served", []):
                    continue
                
                if not _credential_match(profile, credential):
                    continue
                midwives.append({
                    "provider_type": "MIDWIFE",
                    "user": user,
                    "profile": profile,
                    "credential_chips": _credential_chips(profile),
                })
    
    # Search lactation consultants
    if not provider_type or provider_type == "LACTATION":
        lactation_query = {"in_marketplace": True, "accepting_new_clients": True}
        
        lactation_profiles = await db.lactation_profiles.find(lactation_query, {"_id": 0}).to_list(100)
        
        lactation_user_ids = [p["user_id"] for p in lactation_profiles]
        lactation_users = await db.users.find(
            {"user_id": {"$in": lactation_user_ids}},
            USER_PUBLIC_FIELDS
        ).to_list(100)
        lactation_users_by_id = {u["user_id"]: u for u in lactation_users}
        
        for profile in lactation_profiles:
            user = lactation_users_by_id.get(profile["user_id"])
            # Unverified pros never appear in the marketplace (Jeff 2026-09-16)
            if user and not user.get("email_verified", False):
                continue
            if user:
                if search:
                    if not _search_match(user, profile, search.lower()):
                        continue
                
                if location_city and (profile.get("location_city") or "").lower().find(location_city.lower()) < 0:
                    continue
                if location_state and (profile.get("location_state") or "").lower().find(location_state.lower()) < 0:
                    continue
                
                if not _credential_match(profile, credential):
                    continue
                lactation.append({
                    "provider_type": "LACTATION",
                    "user": user,
                    "profile": profile,
                    "credential_chips": _credential_chips(profile),
                })
    
    return {"doulas": doulas, "midwives": midwives, "lactation": lactation}


@router.get("/provider/{user_id}")
async def get_provider_profile(user_id: str):
    """Get a provider's public profile with client count"""
    user = await db.users.find_one({"user_id": user_id}, USER_PUBLIC_FIELDS)
    if not user:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Unverified pros are invisible in the marketplace (Jeff 2026-09-16)
    if not user.get("email_verified", False):
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if user["role"] == "DOULA":
        profile = await db.doula_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    elif user["role"] == "MIDWIFE":
        profile = await db.midwife_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    elif user["role"] == "LACTATION":
        profile = await db.lactation_profiles.find_one({"user_id": user_id}, {"_id": 0})
        clients_served = await db.clients.count_documents({"provider_id": user_id, "status": "Completed"})
    else:
        raise HTTPException(status_code=400, detail="User is not a provider")
    
    return {
        "user": user,
        "profile": profile,
        "clients_served": clients_served
    }
