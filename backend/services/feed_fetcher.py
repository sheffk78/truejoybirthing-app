"""
Feed Fetcher Service

Fetches content from multiple source types:
- RSS/Atom feeds (podcasts, blogs, newsletters)
- PubMed E-utilities API (research)
- Sitemap XML (fallback for sites without RSS)
- YouTube RSS (video channels)

Each source returns a list of raw article dicts with:
  title, url, url_hash, content_snippet, published_date, source_id
"""

import hashlib
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from urllib.parse import urlencode, quote_plus

import httpx

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────

PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PUBMED_FETCH_URL = f"{PUBMED_BASE}/efetch.fcgi"
PUBMED_SEARCH_URL = f"{PUBMED_BASE}/esearch.fcgi"

USER_AGENT = "TrueJoyBirthing/1.0 (research feed; contact@truejoybirthing.com)"

# ── Public API ─────────────────────────────────────────────────────────────

async def fetch_source(source: dict) -> List[dict]:
    """
    Fetch articles from a single source config.
    Returns a list of raw article dicts.
    """
    feed_type = source.get("feed_type", "rss")
    feed_url = source.get("feed_url", "")
    source_id = source.get("source_id", "unknown")

    try:
        if feed_type == "rss":
            return await _fetch_rss(source_id, feed_url)
        elif feed_type == "api" and source_id == "pubmed-birth":
            return await _fetch_pubmed(source)
        elif feed_type == "sitemap":
            return await _fetch_sitemap(source_id, feed_url)
        else:
            logger.warning(f"Unknown feed_type '{feed_type}' for source {source_id}")
            return []
    except Exception as e:
        logger.error(f"Failed to fetch source {source_id}: {e}")
        return []


async def fetch_all_sources(sources: List[dict]) -> List[dict]:
    """
    Fetch articles from all enabled sources concurrently.
    Returns a flat list of raw article dicts.
    """
    import asyncio
    results = await asyncio.gather(
        *(fetch_source(s) for s in sources if s.get("enabled", False)),
        return_exceptions=True
    )
    all_articles = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            source_id = sources[i].get("source_id", "unknown")
            logger.error(f"Source {source_id} raised: {result}")
        elif result:
            all_articles.extend(result)
    return all_articles


# ── RSS Fetcher ────────────────────────────────────────────────────────────

async def _fetch_rss(source_id: str, feed_url: str) -> List[dict]:
    """Parse an RSS/Atom feed and return articles."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(feed_url, headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()

    articles = []
    root = ET.fromstring(resp.text)

    # Handle RSS 2.0
    for item in root.iter("item"):
        article = _parse_rss_item(item, source_id)
        if article:
            articles.append(article)

    # Handle Atom
    for entry in root.iter("{http://www.w3.org/2005/Atom}entry"):
        article = _parse_atom_entry(entry, source_id)
        if article:
            articles.append(article)

    return articles


def _parse_rss_item(item: ET.Element, source_id: str) -> Optional[dict]:
    title = _get_text(item, "title")
    link = _get_text(item, "link")
    description = _get_text(item, "description")
    pub_date_str = _get_text(item, "pubDate")

    if not title or not link:
        return None

    return {
        "title": title.strip(),
        "url": link.strip(),
        "url_hash": _hash_url(link.strip()),
        "content_snippet": (description or "")[:2000].strip(),
        "published_date": _parse_rss_date(pub_date_str),
        "source_id": source_id,
    }


def _parse_atom_entry(entry: ET.Element, source_id: str) -> Optional[dict]:
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    title = _get_text(entry, "atom:title", ns)
    link_el = entry.find("atom:link", ns)
    link = link_el.get("href") if link_el is not None else None
    summary = _get_text(entry, "atom:summary", ns) or _get_text(entry, "atom:content", ns)
    published = _get_text(entry, "atom:published", ns) or _get_text(entry, "atom:updated", ns)

    if not title or not link:
        return None

    return {
        "title": title.strip(),
        "url": link.strip(),
        "url_hash": _hash_url(link.strip()),
        "content_snippet": (summary or "")[:2000].strip(),
        "published_date": _parse_atom_date(published),
        "source_id": source_id,
    }


# ── PubMed Fetcher ─────────────────────────────────────────────────────────

async def _fetch_pubmed(source: dict) -> List[dict]:
    """Fetch recent birth/midwifery research from PubMed E-utilities API."""
    api_config = source.get("api_config", {})
    query = api_config.get("query", "")
    max_results = api_config.get("max_results", 20)
    retmax = api_config.get("retmax", 20)

    if not query:
        return []

    async with httpx.AsyncClient() as client:
        # Step 1: Search for IDs
        search_params = {
            "db": "pubmed",
            "term": query,
            "retmax": retmax,
            "retmode": "json",
            "sort": "date",
        }
        search_url = f"{PUBMED_SEARCH_URL}?{urlencode(search_params)}"
        search_resp = await client.get(search_url, headers={"User-Agent": USER_AGENT}, timeout=30)
        search_resp.raise_for_status()
        search_data = search_resp.json()

        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return []

        # Step 2: Fetch details for found IDs
        fetch_params = {
            "db": "pubmed",
            "id": ",".join(id_list[:max_results]),
            "retmode": "xml",
            "rettype": "abstract",
        }
        fetch_url = f"{PUBMED_FETCH_URL}?{urlencode(fetch_params)}"
        fetch_resp = await client.get(fetch_url, headers={"User-Agent": USER_AGENT}, timeout=30)
        fetch_resp.raise_for_status()

    # Step 3: Parse XML response
    return _parse_pubmed_xml(fetch_resp.text, source["source_id"])


def _parse_pubmed_xml(xml_text: str, source_id: str) -> List[dict]:
    articles = []
    root = ET.fromstring(xml_text)

    for article_elem in root.iter("PubmedArticle"):
        try:
            medline = article_elem.find(".//MedlineCitation")
            article_data = medline.find("Article") if medline is not None else None
            if article_data is None:
                continue

            title_el = article_data.find("ArticleTitle")
            title = "".join(title_el.itertext()) if title_el is not None else ""

            abstract_el = article_data.find("Abstract")
            abstract = ""
            if abstract_el is not None:
                parts = [("".join(ab.itertext())) for ab in abstract_el.findall("AbstractText")]
                abstract = " ".join(parts)

            # Build PubMed URL
            pmid = article_elem.findtext(".//PMID", "")
            url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

            # Get publication date
            pub_date = _extract_pubmed_date(article_elem)

            if not title or not url:
                continue

            articles.append({
                "title": title.strip()[:300],
                "url": url,
                "url_hash": _hash_url(url),
                "content_snippet": abstract[:2000].strip(),
                "published_date": pub_date,
                "source_id": source_id,
            })
        except Exception as e:
            logger.warning(f"Error parsing PubMed article: {e}")
            continue

    return articles


def _extract_pubmed_date(article_elem: ET.Element) -> datetime:
    """Extract the best available publication date from a PubMed article."""
    try:
        pub_date = article_elem.find(".//PubMedPubDate[@PubStatus='pubmed']")
        if pub_date is None:
            pub_date = article_elem.find(".//PubMedPubDate")
        if pub_date is None:
            pub_date = article_elem.find(".//PubDate")

        if pub_date is not None:
            year = int(pub_date.findtext("Year", "2026"))
            month = int(pub_date.findtext("Month", "1"))
            day = int(pub_date.findtext("Day", "1"))
            return datetime(year, month, day, tzinfo=timezone.utc)
    except Exception:
        pass
    return datetime.now(timezone.utc)


# ── Sitemap Fetcher ────────────────────────────────────────────────────────

async def _fetch_sitemap(source_id: str, sitemap_url: str) -> List[dict]:
    """Parse a sitemap.xml for recent URLs."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(sitemap_url, headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()

    articles = []
    root = ET.fromstring(resp.text)
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.3"}

    for url_elem in root.iter("s:url", ns):
        loc = url_elem.findtext("s:loc", ns, "")
        lastmod = url_elem.findtext("s:lastmod", ns, "")

        if not loc:
            continue

        # Extract title from URL path
        path = loc.rstrip("/").split("/")[-1].replace("-", " ").title() if loc else ""

        articles.append({
            "title": path or "Untitled",
            "url": loc,
            "url_hash": _hash_url(loc),
            "content_snippet": "",
            "published_date": _parse_sitemap_date(lastmod),
            "source_id": source_id,
        })

    return articles


# ── Helpers ────────────────────────────────────────────────────────────────

def _hash_url(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _get_text(element: ET.Element, tag: str, ns: Optional[dict] = None) -> str:
    el = element.find(tag, ns) if ns else element.find(tag)
    return el.text if el is not None else ""


def _parse_rss_date(date_str: str) -> datetime:
    """Parse RSS pubDate format (e.g., 'Mon, 22 Jun 2026 14:00:00 GMT')."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        from email.utils import parsedate_to_datetime
        return parsedate_to_datetime(date_str).replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _parse_atom_date(date_str: str) -> datetime:
    """Parse Atom date format (e.g., '2026-06-22T14:00:00Z')."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def _parse_sitemap_date(date_str: str) -> datetime:
    """Parse sitemap date format (e.g., '2026-06-22')."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)
