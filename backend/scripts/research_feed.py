"""
Research Feed — Simplified Pipeline

Fetches articles from all enabled sources, deduplicates, and stores
raw articles in the staging collection. No LLM processing on the server.

The agent (Kit) handles summarization, tagging, and blog post generation
via cron job, writing results back to the database.
"""

import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import List

from motor.motor_asyncio import AsyncIOMotorDatabase

from services.feed_fetcher import fetch_all_sources

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────

SOURCES_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "sources.json")
MAX_ARTICLES_PER_RUN = 50
RETENTION_DAYS = 90

# ── Main Entry Point ──────────────────────────────────────────────────────

async def run_daily_feed(db: AsyncIOMotorDatabase) -> dict:
    """
    Fetch articles from all enabled sources, deduplicate, and store raw.
    Returns a summary dict with counts.
    """
    result = {
        "sources_fetched": 0,
        "raw_articles": 0,
        "new_articles": 0,
        "stored": 0,
        "errors": [],
    }

    # Step 1: Load source config
    sources = _load_sources()
    if not sources:
        result["errors"].append("No sources configured")
        return result

    enabled_sources = [s for s in sources if s.get("enabled", False)]
    result["sources_fetched"] = len(enabled_sources)

    # Step 2: Fetch articles from all sources
    logger.info(f"Fetching from {len(enabled_sources)} sources...")
    raw_articles = await fetch_all_sources(enabled_sources)
    result["raw_articles"] = len(raw_articles)
    logger.info(f"Fetched {len(raw_articles)} raw articles")

    if not raw_articles:
        logger.info("No articles fetched — skipping")
        return result

    # Step 3: Deduplicate against existing articles
    new_articles = await _deduplicate(db, raw_articles)
    result["new_articles"] = len(new_articles)
    logger.info(f"{len(new_articles)} new articles after dedup")

    if not new_articles:
        logger.info("No new articles — skipping")
        return result

    # Step 4: Store raw articles in staging collection
    # Each article gets a unique article_id and is marked as "raw" (unprocessed)
    import uuid
    for article in new_articles[:MAX_ARTICLES_PER_RUN]:
        article["article_id"] = str(uuid.uuid4())
        article["status"] = "raw"  # raw = fetched but not yet processed by agent
        article["fetched_at"] = datetime.now(timezone.utc)

    stored = await db.staging_articles.insert_many(new_articles[:MAX_ARTICLES_PER_RUN])
    result["stored"] = len(stored.inserted_ids)
    logger.info(f"Stored {result['stored']} raw articles in staging")

    # Step 5: Prune old articles
    await _prune_old_articles(db)

    return result


# ── Helpers ─────────────────────────────────────────────────────────────────

def _load_sources() -> list:
    """Load source configuration from JSON file."""
    try:
        with open(SOURCES_CONFIG_PATH, "r") as f:
            data = json.load(f)
        return data.get("sources", [])
    except Exception as e:
        logger.error(f"Failed to load sources config: {e}")
        return []


async def _deduplicate(db: AsyncIOMotorDatabase, articles: List[dict]) -> List[dict]:
    """Remove articles that already exist in the database (by URL hash)."""
    incoming_hashes = [a["url_hash"] for a in articles if a.get("url_hash")]

    existing = set()
    cursor = db.articles.find(
        {"source_url_hash": {"$in": incoming_hashes}},
        {"source_url_hash": 1}
    )
    async for doc in cursor:
        existing.add(doc["source_url_hash"])

    cursor = db.staging_articles.find(
        {"url_hash": {"$in": incoming_hashes}},
        {"url_hash": 1}
    )
    async for doc in cursor:
        existing.add(doc["url_hash"])

    return [a for a in articles if a.get("url_hash") not in existing]


async def _prune_old_articles(db: AsyncIOMotorDatabase):
    """Remove articles older than retention period."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    result = await db.articles.delete_many({"approved_date": {"$lt": cutoff}})
    if result.deleted_count > 0:
        logger.info(f"Pruned {result.deleted_count} old articles")
