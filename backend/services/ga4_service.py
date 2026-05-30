"""
GA4 Data API service for True Joy Birthing admin dashboard.

Pulls analytics data server-side using the Google Analytics Data API
with service account authentication. Results are cached in MongoDB
with a 6-hour TTL to stay within API quotas.
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta import (
    RunReportRequest,
    DateRange,
    Dimension,
    Metric,
    OrderBy,
)
from google.oauth2 import service_account
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

# GA4 Property ID for True Joy Birthing
TJB_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "469670390")

# Cache TTL: 6 hours
CACHE_TTL_HOURS = 6


def _get_credentials():
    """Load service account credentials from env var (JSON) or file."""
    scopes = ["https://www.googleapis.com/auth/analytics.readonly"]

    # Production: GA4_SERVICE_ACCOUNT_JSON env var (full JSON string)
    ga4_key_json = os.environ.get("GA4_SERVICE_ACCOUNT_JSON")
    if ga4_key_json:
        key_data = json.loads(ga4_key_json)
        return service_account.Credentials.from_service_account_info(
            key_data, scopes=scopes
        )

    # Production fallback: base64-encoded key
    ga4_key_b64 = os.environ.get("GA4_SERVICE_ACCOUNT_KEY_B64")
    if ga4_key_b64:
        import base64
        key_data = json.loads(base64.b64decode(ga4_key_b64))
        return service_account.Credentials.from_service_account_info(
            key_data, scopes=scopes
        )

    # Local dev: file path
    sa_key_path = os.environ.get(
        "GA4_KEY_PATH",
        str(Path(__file__).parent.parent / "secrets" / "ga4-service-account.json"),
    )
    return service_account.Credentials.from_service_account_file(
        sa_key_path, scopes=scopes
    )


def _get_client() -> BetaAnalyticsDataClient:
    """Create a new GA4 Data API client."""
    return BetaAnalyticsDataClient(credentials=_get_credentials())


def _cache_key(prefix: str, **kwargs) -> str:
    """Build a cache key from prefix and params."""
    parts = [f"ga4_{prefix}"]
    for k, v in sorted(kwargs.items()):
        parts.append(f"{k}={v}")
    return "_".join(parts)


async def _get_cached(db, key: str) -> Optional[dict]:
    """Get cached result from MongoDB if not expired."""
    doc = await db.dashboard_cache.find_one({"_id": key})
    if doc is None:
        return None
    cached_at = doc.get("cached_at")
    if cached_at is None:
        return None
    # Handle both datetime and string
    if isinstance(cached_at, str):
        cached_at = datetime.fromisoformat(cached_at)
    if datetime.now(timezone.utc) - cached_at > timedelta(hours=CACHE_TTL_HOURS):
        return None
    return doc.get("data")


async def _set_cached(db, key: str, data: dict):
    """Store result in MongoDB cache with timestamp."""
    await db.dashboard_cache.update_one(
        {"_id": key},
        {
            "$set": {
                "data": data,
                "cached_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


async def get_top_pages(db, days: int = 30, limit: int = 20) -> dict:
    """
    Get top pages by pageviews for the last N days.
    Returns cached data if available.
    """
    cache_k = _cache_key("top_pages", days=days, limit=limit)
    cached = await _get_cached(db, cache_k)
    if cached:
        return cached

    try:
        client = _get_client()
        request = RunReportRequest(
            property=f"properties/{TJB_PROPERTY_ID}",
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="sessions"),
                Metric(name="averageSessionDuration"),
            ],
            order_bys=[
                OrderBy(metric={"metric_name": "screenPageViews"}, desc=True)
            ],
            limit=limit,
        )
        response = client.run_report(request)

        pages = []
        for row in response.rows:
            pages.append({
                "path": row.dimension_values[0].value,
                "title": row.dimension_values[1].value,
                "pageviews": int(row.metric_values[0].value),
                "sessions": int(row.metric_values[1].value),
                "avg_session_duration": float(row.metric_values[2].value),
            })

        result = {"pages": pages, "period": f"last_{days}_days", "fetched_at": datetime.now(timezone.utc).isoformat()}
        await _set_cached(db, cache_k, result)
        return result
    except Exception as e:
        logger.error(f"GA4 top_pages error: {e}")
        return {"pages": [], "period": f"last_{days}_days", "error": str(e)}


async def get_traffic_trend(db, days: int = 90) -> dict:
    """
    Get daily traffic trend (sessions + pageviews) for the last N days.
    Returns cached data if available.
    """
    cache_k = _cache_key("traffic_trend", days=days)
    cached = await _get_cached(db, cache_k)
    if cached:
        return cached

    try:
        client = _get_client()
        request = RunReportRequest(
            property=f"properties/{TJB_PROPERTY_ID}",
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            dimensions=[Dimension(name="date")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="activeUsers"),
                Metric(name="newUsers"),
            ],
            order_bys=[OrderBy(dimension={"dimension_name": "date"})],
        )
        response = client.run_report(request)

        days_data = []
        for row in response.rows:
            raw_date = row.dimension_values[0].value
            # GA4 dates come as YYYYMMDD
            formatted_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
            days_data.append({
                "date": formatted_date,
                "sessions": int(row.metric_values[0].value),
                "pageviews": int(row.metric_values[1].value),
                "active_users": int(row.metric_values[2].value),
                "new_users": int(row.metric_values[3].value),
            })

        result = {"days": days_data, "period": f"last_{days}_days", "fetched_at": datetime.now(timezone.utc).isoformat()}
        await _set_cached(db, cache_k, result)
        return result
    except Exception as e:
        logger.error(f"GA4 traffic_trend error: {e}")
        return {"days": [], "period": f"last_{days}_days", "error": str(e)}


async def get_location_pages(db, days: int = 30) -> dict:
    """
    Get location-specific pages (city/state birth support pages)
    filtered to /birth-support/ paths, ranked by traffic.
    Returns cached data if available.
    """
    cache_k = _cache_key("location_pages", days=days)
    cached = await _get_cached(db, cache_k)
    if cached:
        return cached

    try:
        client = _get_client()
        # Get all pages, then filter for location pages client-side
        request = RunReportRequest(
            property=f"properties/{TJB_PROPERTY_ID}",
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="sessions"),
                Metric(name="activeUsers"),
            ],
            order_bys=[
                OrderBy(metric={"metric_name": "screenPageViews"}, desc=True)
            ],
            limit=100,
        )
        response = client.run_report(request)

        location_pages = []
        total_location_pageviews = 0

        for row in response.rows:
            path = row.dimension_values[0].value
            title = row.dimension_values[1].value
            pageviews = int(row.metric_values[0].value)
            sessions = int(row.metric_values[1].value)
            active_users = int(row.metric_values[2].value)

            # Filter for location pages: /birth-support/ paths
            if "/birth-support/" in path:
                total_location_pageviews += pageviews
                location_pages.append({
                    "path": path,
                    "title": title,
                    "pageviews": pageviews,
                    "sessions": sessions,
                    "active_users": active_users,
                })

        result = {
            "location_pages": location_pages,
            "total_location_pageviews": total_location_pageviews,
            "count": len(location_pages),
            "period": f"last_{days}_days",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        await _set_cached(db, cache_k, result)
        return result
    except Exception as e:
        logger.error(f"GA4 location_pages error: {e}")
        return {"location_pages": [], "total_location_pageviews": 0, "count": 0, "period": f"last_{days}_days", "error": str(e)}


async def get_overview_stats(db, days: int = 30) -> dict:
    """
    Get high-level traffic overview stats for the dashboard.
    Total sessions, users, pageviews, bounce rate for the period.
    """
    cache_k = _cache_key("overview_stats", days=days)
    cached = await _get_cached(db, cache_k)
    if cached:
        return cached

    try:
        client = _get_client()
        request = RunReportRequest(
            property=f"properties/{TJB_PROPERTY_ID}",
            date_ranges=[
                DateRange(start_date=f"{days}daysAgo", end_date="today"),
                DateRange(start_date=f"{days*2}daysAgo", end_date=f"{days+1}daysAgo"),
            ],
            dimensions=[],  # No dimensions = totals
            metrics=[
                Metric(name="sessions"),
                Metric(name="activeUsers"),
                Metric(name="screenPageViews"),
                Metric(name="newUsers"),
                Metric(name="averageSessionDuration"),
                Metric(name="bounceRate"),
            ],
        )
        response = client.run_report(request)

        # Row 0 = current period, Row 1 = previous period
        current = response.rows[0] if len(response.rows) > 0 else None
        previous = response.rows[1] if len(response.rows) > 1 else None

        def extract(row):
            if row is None:
                return None
            return {
                "sessions": int(row.metric_values[0].value),
                "active_users": int(row.metric_values[1].value),
                "pageviews": int(row.metric_values[2].value),
                "new_users": int(row.metric_values[3].value),
                "avg_session_duration": float(row.metric_values[4].value),
                "bounce_rate": float(row.metric_values[5].value),
            }

        result = {
            "current_period": extract(current),
            "previous_period": extract(previous),
            "period": f"last_{days}_days",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        await _set_cached(db, cache_k, result)
        return result
    except Exception as e:
        logger.error(f"GA4 overview_stats error: {e}")
        return {"current_period": None, "previous_period": None, "period": f"last_{days}_days", "error": str(e)}