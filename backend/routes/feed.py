"""
Feed Routes Module

API endpoints for the provider research feed.
Includes user-facing endpoints (articles, tags, report-inaccuracy)
and agent-only endpoints (staging, process).
"""

import os
import logging
from fastapi import APIRouter, HTTPException, Depends, Query, Header
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from .dependencies import db, get_current_user, check_role, User, generate_id, get_now

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feed", tags=["Feed"])

# ============== AGENT AUTH ==============
AGENT_API_KEY = os.environ.get("FEED_AGENT_API_KEY", "")

def verify_agent_token(x_agent_token: str = Header(None)):
    """Verify the agent's API token for write endpoints.
    
    The agent (Kit) uses a shared secret token instead of user JWT auth.
    This token is set via FEED_AGENT_API_KEY env var on the backend.
    """
    if not AGENT_API_KEY:
        raise HTTPException(status_code=503, detail="Agent API key not configured")
    if not x_agent_token or x_agent_token != AGENT_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid agent token")
    return True

# ============== AGENT MODELS ==============

class ProcessedArticleItem(BaseModel):
    article_id: str
    excerpt: str = Field(default="", max_length=300)
    practice_takeaway: str = Field(default="", max_length=200)
    tags: List[str] = []
    quality_score: int = Field(default=0, ge=0, le=100)
    blog_title: Optional[str] = None
    blog_slug: Optional[str] = None
    blog_content: Optional[str] = None
    blog_status: str = "pending"
    rejection_reason: Optional[str] = None

class ProcessFeedRequest(BaseModel):
    articles: List[ProcessedArticleItem]
    batch_id: Optional[str] = None

class ProcessFeedResponse(BaseModel):
    processed: int
    rejected: int
    errors: List[dict] = []
    published_article_ids: List[str] = []


@router.get("/articles")
async def get_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    tag: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Get paginated research feed articles.
    Available to all authenticated users (doula, midwife, mom).
    """
    query = {}
    if tag:
        query["tags"] = tag

    skip = (page - 1) * limit
    cursor = db.articles.find(
        query,
        {"_id": 0}
    ).sort("approved_date", -1).skip(skip).limit(limit)

    articles = await cursor.to_list(length=limit)
    total = await db.articles.count_documents(query)

    return {
        "articles": articles,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": max(1, (total + limit - 1) // limit),
            "has_next": page * limit < total,
        }
    }


@router.get("/articles/{article_id}")
async def get_article(
    article_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a single article by ID."""
    article = await db.articles.find_one(
        {"article_id": article_id},
        {"_id": 0}
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Increment view count
    await db.articles.update_one(
        {"article_id": article_id},
        {"$inc": {"view_count": 1}}
    )

    return article


@router.get("/tags")
async def get_tags(
    current_user: User = Depends(get_current_user),
):
    """Get all available tags with article counts."""
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    tags = await db.articles.aggregate(pipeline).to_list(None)
    return {"tags": [{"name": t["_id"], "count": t["count"]} for t in tags]}


@router.post("/report-inaccuracy")
async def report_inaccuracy(
    article_id: str,
    reason: str,
    current_user: User = Depends(get_current_user),
):
    """
    Report an inaccuracy in an article summary.
    Satisfies Google Play AI-Generated Content policy requirements.
    """
    report = {
        "article_id": article_id,
        "user_id": current_user.get("user_id", ""),
        "reason": reason,
        "reported_at": datetime.now(timezone.utc),
        "status": "pending",
    }
    await db.reported_inaccuracies.insert_one(report)
    return {"status": "reported", "message": "Thank you for your report. We review all reports within 24 hours."}


# ============== AGENT-ONLY ENDPOINTS ==============

@router.get("/staging")
async def get_staging_articles(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    _auth: bool = Depends(verify_agent_token),
):
    """Agent-only: get raw unprocessed articles from staging.
    
    Returns articles with status=raw for the agent to process
    (summarization, tagging, quality scoring, blog generation).
    """
    query = {"status": "raw"}
    cursor = db.staging_articles.find(query, {"_id": 0}).sort("fetched_at", -1)
    total = await db.staging_articles.count_documents(query)
    articles = await cursor.skip((page - 1) * limit).limit(limit).to_list(length=limit)
    return {
        "articles": articles,
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "total_pages": max(1, (total + limit - 1) // limit),
            "has_next": page * limit < total,
        }
    }


@router.post("/process")
async def process_articles(
    request: ProcessFeedRequest,
    _auth: bool = Depends(verify_agent_token),
):
    """Agent-only endpoint: submit LLM-processed articles.
    
    Moves articles from staging_articles (status=raw) to articles (status=published).
    Stores excerpt, practice_takeaway, tags, quality_score, and blog post metadata.
    
    Auth: X-Agent-Token header (FEED_AGENT_API_KEY env var).
    NOT user JWT auth — this is a machine-to-machine endpoint.
    """
    results = {"processed": 0, "rejected": 0, "errors": [], "published_article_ids": []}
    now = get_now()

    for item in request.articles:
        try:
            # 1. Find the staging article
            staging = await db.staging_articles.find_one(
                {"article_id": item.article_id},
                {"_id": 0}
            )
            if not staging:
                results["errors"].append({
                    "article_id": item.article_id,
                    "error": "Not found in staging_articles"
                })
                continue

            # 2. Check quality threshold
            if item.quality_score < 70:
                await db.staging_articles.update_one(
                    {"article_id": item.article_id},
                    {"$set": {
                        "status": "rejected",
                        "quality_score": item.quality_score,
                        "rejection_reason": item.rejection_reason or "Quality score below threshold",
                        "processed_at": now,
                    }}
                )
                results["rejected"] += 1
                continue

            # 3. Build the published article document
            published_article = {
                "article_id": staging["article_id"],
                "source_id": staging.get("source_id"),
                "title": staging["title"],
                "source_name": staging.get("source_name", ""),
                "source_url": staging.get("source_url", staging.get("url", "")),
                "source_url_hash": staging.get("source_url_hash", staging.get("url_hash", "")),
                "published_date": staging.get("published_date", now),
                "fetched_at": staging.get("fetched_at", now),
                
                # Agent-generated fields
                "excerpt": item.excerpt,
                "practice_takeaway": item.practice_takeaway,
                "tags": item.tags,
                "quality_score": item.quality_score,
                "processed_at": now,
                "status": "published",
                
                # Blog post metadata
                "tjb_blog_slug": item.blog_slug,
                "tjb_blog_title": item.blog_title,
                "tjb_blog_status": item.blog_status,
                "tjb_blog_url": f"https://truejoybirthing.com/blog/{item.blog_slug}/" if item.blog_slug else None,
                
                # Metadata
                "view_count": 0,
                "batch_id": request.batch_id,
            }

            # 4. Insert into articles collection (upsert for idempotency)
            await db.articles.update_one(
                {"article_id": item.article_id},
                {"$set": published_article},
                upsert=True
            )

            # 5. Update staging status to "processed"
            await db.staging_articles.update_one(
                {"article_id": item.article_id},
                {"$set": {"status": "processed", "processed_at": now}}
            )

            # 6. If blog content provided, store for deployment
            if item.blog_content and item.blog_slug:
                blog_doc = {
                    "blog_id": generate_id("blog"),
                    "article_id": item.article_id,
                    "slug": item.blog_slug,
                    "title": item.blog_title,
                    "content": item.blog_content,
                    "status": "pending_deploy",
                    "created_at": now,
                }
                await db.feed_blog_posts.update_one(
                    {"article_id": item.article_id},
                    {"$set": blog_doc},
                    upsert=True
                )

            results["processed"] += 1
            results["published_article_ids"].append(item.article_id)

        except Exception as e:
            logger.error(f"Error processing article {item.article_id}: {e}")
            results["errors"].append({
                "article_id": item.article_id,
                "error": str(e)
            })

    return results
