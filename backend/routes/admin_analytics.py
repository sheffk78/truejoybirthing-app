"""
Admin Analytics API routes for True Joy Birthing.

Exposes GA4 data through the admin dashboard API,
with MongoDB caching (6-hour TTL) to stay within quota limits.
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from .dependencies import db, check_role, User
from ..services.ga4_service import (
    get_top_pages,
    get_traffic_trend,
    get_location_pages,
    get_overview_stats,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/analytics", tags=["admin-analytics"])


def _serialize_doc(obj):
    """Recursively serialize MongoDB docs for JSON response."""
    if isinstance(obj, dict):
        return {k: _serialize_doc(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_doc(item) for item in obj]
    if hasattr(obj, "__str__"):
        return str(obj)
    return obj


@router.get("/overview")
async def analytics_overview(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(check_role(["ADMIN"])),
):
    """
    High-level traffic overview comparing current vs previous period.
    Returns sessions, users, pageviews, bounce rate with period comparison.
    """
    result = await get_overview_stats(db, days=days)

    # Compute change percentages if both periods have data
    current = result.get("current_period")
    previous = result.get("previous_period")
    if current and previous:
        def pct_change(curr_val, prev_val):
            if prev_val == 0:
                return None
            return round(((curr_val - prev_val) / prev_val) * 100, 1)

        result["changes"] = {
            "sessions": pct_change(current["sessions"], previous["sessions"]),
            "active_users": pct_change(current["active_users"], previous["active_users"]),
            "pageviews": pct_change(current["pageviews"], previous["pageviews"]),
            "new_users": pct_change(current["new_users"], previous["new_users"]),
        }

    return _serialize_doc(result)


@router.get("/top-pages")
async def analytics_top_pages(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(check_role(["ADMIN"])),
):
    """
    Top pages by pageviews for the given period.
    Returns page path, title, pageviews, sessions, avg session duration.
    """
    result = await get_top_pages(db, days=days, limit=limit)
    return _serialize_doc(result)


@router.get("/traffic-trend")
async def analytics_traffic_trend(
    days: int = Query(90, ge=7, le=365),
    current_user: User = Depends(check_role(["ADMIN"])),
):
    """
    Daily traffic trend (sessions, pageviews, active users, new users)
    for the given period. Used for line charts.
    """
    result = await get_traffic_trend(db, days=days)
    return _serialize_doc(result)


@router.get("/location-pages")
async def analytics_location_pages(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(check_role(["ADMIN"])),
):
    """
    Location-specific pages (city/state birth support pages)
    ranked by traffic. Filters to /birth-support/ paths.
    Also returns total count of location pages.
    """
    result = await get_location_pages(db, days=days)
    return _serialize_doc(result)


@router.get("/cache-status")
async def analytics_cache_status(
    current_user: User = Depends(check_role(["ADMIN"])),
):
    """
    Check GA4 cache status — when each cache entry was last refreshed.
    """
    cache_entries = []
    async for doc in db.dashboard_cache.find({"_id": {"$regex": "^ga4_"}}):
        cache_entries.append({
            "key": doc["_id"],
            "cached_at": doc.get("cached_at", "").isoformat() if isinstance(doc.get("cached_at"), datetime) else str(doc.get("cached_at", "")),
        })

    # Also do a quick connectivity test
    connectivity = "unknown"
    try:
        from ..services.ga4_service import _get_client
        client = _get_client()
        connectivity = "ok"
    except Exception as e:
        connectivity = f"error: {str(e)}"

    return {
        "ga4_connectivity": connectivity,
        "cache_entries": cache_entries,
        "cache_ttl_hours": 6,
    }


@router.post("/refresh-cache")
async def analytics_refresh_cache(
    current_user: User = Depends(check_role(["ADMIN"])),
):
    """
    Force-refresh all GA4 cache entries. Useful after adding new pages
    or when data seems stale.
    """
    # Delete all GA4 cache entries so next request fetches fresh data
    result = await db.dashboard_cache.delete_many({"_id": {"$regex": "^ga4_"}})
    return {
        "status": "cache_cleared",
        "entries_removed": result.deleted_count,
        "message": "Cache will rebuild on next request. This may take a few seconds.",
    }