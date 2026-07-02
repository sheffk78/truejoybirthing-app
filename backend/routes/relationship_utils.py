"""
Relationship status utilities for share_requests.

Provides verify_active_relationship() to check if a provider-mom relationship
is both accepted AND active (not terminated/expired). This replaces bare
`status: "accepted"` checks across the codebase.

Backward compatibility: if relationship_status field is missing (pre-migration
documents), the relationship is treated as "active".
"""

from typing import Optional
from .dependencies import db


async def verify_active_relationship(provider_id: str, mom_user_id: str) -> bool:
    """
    Check if a provider has an ACTIVE relationship with a mom.

    A relationship is active when:
    1. share_request.status == "accepted"
    2. share_request.relationship_status is "active" OR missing (backward compat)

    Returns True if the relationship is active, False otherwise.
    """
    share_request = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_user_id,
        "status": "accepted"
    })

    if not share_request:
        return False

    # Backward compat: missing relationship_status = active (pre-migration docs)
    rel_status = share_request.get("relationship_status", "active")
    return rel_status == "active"


async def get_active_relationship(provider_id: str, mom_user_id: str) -> Optional[dict]:
    """
    Get the share_request document if the relationship is active.
    Returns the document or None.
    """
    share_request = await db.share_requests.find_one({
        "provider_id": provider_id,
        "mom_user_id": mom_user_id,
        "status": "accepted"
    })

    if not share_request:
        return None

    rel_status = share_request.get("relationship_status", "active")
    if rel_status != "active":
        return None

    return share_request


async def get_active_provider_ids_for_mom(mom_user_id: str) -> list[str]:
    """
    Get list of provider_ids who have an ACTIVE relationship with this mom.
    Used to filter invoices, contracts, and other data to active relationships only.
    """
    share_requests = await db.share_requests.find({
        "mom_user_id": mom_user_id,
        "status": "accepted"
    }).to_list(100)

    active_provider_ids = []
    for req in share_requests:
        rel_status = req.get("relationship_status", "active")
        if rel_status == "active":
            active_provider_ids.append(req["provider_id"])

    return active_provider_ids


async def get_active_mom_ids_for_provider(provider_id: str) -> list[str]:
    """
    Get list of mom_user_ids who have an ACTIVE relationship with this provider.
    Used to filter shared birth plans, messaging, and other data.
    """
    share_requests = await db.share_requests.find({
        "provider_id": provider_id,
        "status": "accepted"
    }).to_list(100)

    active_mom_ids = []
    for req in share_requests:
        rel_status = req.get("relationship_status", "active")
        if rel_status == "active":
            active_mom_ids.append(req["mom_user_id"])

    return active_mom_ids


async def terminate_relationship(provider_id: str, mom_user_id: str, terminated_by: str = None) -> bool:
    """
    Mark a share_request relationship as terminated.

    Sets relationship_status to "terminated" and records terminated_at timestamp.
    Does NOT delete the document (preserves history).

    Returns True if a document was updated, False if no matching relationship found.
    """
    from .dependencies import get_now

    now = get_now()

    result = await db.share_requests.update_one(
        {
            "provider_id": provider_id,
            "mom_user_id": mom_user_id,
            "status": "accepted"
        },
        {
            "$set": {
                "relationship_status": "terminated",
                "terminated_at": now,
                "terminated_by": terminated_by
            }
        }
    )

    return result.modified_count > 0