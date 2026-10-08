"""
Regression test: GET /api/feed/articles must serve ONLY published articles.

10/08 mom-content pass root cause: routes/feed.py built its query without a
status filter, so the 49 `archived` rows (20-article pruning in the weekly
pipeline) leaked into every feed response — moms were being served months-old
raw PubMed abstracts.

In-process test: stubs the `dependencies` module (motor colls + auth) and
exercises get_articles() directly, per the established TJB backend-test rules
(never import routes/services at test top level; stub deps inside the test).
Run with MONGO_URL/DB_NAME/JWT_SECRET env for the in-process server suites;
this file itself only touches the route function with fakes.
"""
import os
import sys
import types
import asyncio
from datetime import datetime, timezone

# Stub heavy deps BEFORE importing the route module (TJB test rule: never
# import routes/services at test top — here the route module itself is the SUT).
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017/tjb_feed_test")
os.environ.setdefault("DB_NAME", "tjb_feed_test")
os.environ.setdefault("JWT_SECRET", "test-secret")


class _FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *_a, **_k):
        return self

    def skip(self, _n):
        return self

    def limit(self, _n):
        return self

    async def to_list(self, _length=None, **_kw):
        return self._docs


class _FakeCollection:
    def __init__(self, docs):
        self._docs = docs
        self.last_query = None

    def find(self, query, _projection=None):
        self.last_query = dict(query)
        # Mirror the real filter semantics for the fake corpus
        out = []
        for d in self._docs:
            ok = True
            for k, v in query.items():
                if isinstance(v, dict) and "$in" in v:
                    if d.get(k) not in v["$in"]:
                        ok = False
                        break
                elif d.get(k) != v:
                    ok = False
                    break
            if ok:
                out.append(d)
        return _FakeCursor(out)

    async def count_documents(self, query):
        cur = self.find(query)
        return len(cur._docs)


def _make_deps_module(articles_docs):
    """Build a fake `routes.dependencies` module the router imports."""
    mod = types.ModuleType("routes.dependencies")
    mod.__dict__["db"] = types.SimpleNamespace(articles=_FakeCollection(articles_docs))
    mod.__dict__["db"].reported_inaccuracies = _FakeCollection([])

    def get_current_user(*_a, **_k):
        return {"user_id": "u_test", "role": "MOM"}

    def check_role(*_a, **_k):
        return True

    def generate_id(*_a, **_k):
        return "id_x"

    def get_now():
        return datetime.now(timezone.utc)

    class User(dict):
        pass

    for name in ("get_current_user", "check_role", "generate_id", "get_now", "User"):
        mod.__dict__[name] = locals()[name] if name != "db" else mod.__dict__["db"]
    return mod


NOW = datetime.now(timezone.utc)


def _article(article_id, status, audience, title):
    return {
        "article_id": article_id,
        "title": title,
        "status": status,
        "audience": audience,
        "excerpt": "x",
        "practice_takeaway": "y",
        "tags": ["postpartum"],
        "quality_score": 80,
        "source_name": "Test Source",
        "approved_date": NOW,
        "published_date": NOW,
        "fetched_at": NOW,
        "processed_at": NOW,
        "view_count": 0,
    }


CORPUS = [
    _article("pub-1", "published", "mom", "Mom-voice: what contractions actually feel like"),
    _article("pub-2", "published", "all", "All-audience: skin to skin"),
    _article("pub-3", "published", "provider", "Provider-only evidence synthesis"),
    _article("arch-1", "archived", "all", "Archived leak: old July abstract"),
    _article("arch-2", "archived", "mom", "Archived leak: old mom article"),
]


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro) if False else asyncio.run(coro)


class TestFeedServesPublishedOnly:
    """The archived dump must never reach any feed consumer."""

    def test_audience_mom_returns_no_archived(self, monkeypatch):
        dep = _make_deps_module(CORPUS)
        import importlib

        import routes.feed as feed_routes  # noqa: E402

        importlib.reload(feed_routes)
        # Patch the module-level db reference
        monkeypatch.setattr(feed_routes, "db", dep.db, raising=False)

        articles = _run(feed_routes.get_articles(page=1, limit=20, tag=None, audience="mom"))
        ids = [a["article_id"] for a in articles["articles"]]
        assert "arch-2" not in ids, "archived article served to mom feed"
        assert "arch-1" not in ids, "archived article served to mom feed (audience=all too)"
        assert ids == ["pub-1", "pub-2"], f"unexpected mom feed set: {ids}"

    def test_audience_provider_returns_no_archived(self, monkeypatch):
        dep = _make_deps_module(CORPUS)
        import routes.feed as feed_routes  # noqa: E402

        monkeypatch.setattr(feed_routes, "db", dep.db, raising=False)
        articles = _run(feed_routes.get_articles(page=1, limit=20, tag=None, audience="provider"))
        ids = [a["article_id"] for a in articles["articles"]]
        assert "arch-1" not in ids and "arch-2" not in ids
        assert ids == ["pub-2", "pub-3"], f"unexpected provider feed set: {ids}"  # sort stub preserves corpus order

    def test_no_audience_filter_still_published_only(self, monkeypatch):
        dep = _make_deps_module(CORPUS)
        import routes.feed as feed_routes  # noqa: E402

        monkeypatch.setattr(feed_routes, "db", dep.db, raising=False)
        articles = _run(feed_routes.get_articles(page=1, limit=20, tag=None, audience=None))
        ids = [a["article_id"] for a in articles["articles"]]
        assert not any(i.startswith("arch-") for i in ids)
        assert len(ids) == 3, f"expected 3 published, got {len(ids)}: {ids}"

    def test_status_in_query_for_mom(self, monkeypatch):
        """The query itself must carry status=published — belt and braces."""
        dep = _make_deps_module(CORPUS)
        import routes.feed as feed_routes  # noqa: E402

        monkeypatch.setattr(feed_routes, "db", dep.db, raising=False)
        _run(feed_routes.get_articles(page=1, limit=5, tag=None, audience="mom"))
        q = dep.db.articles.last_query
        assert q.get("status") == "published", f"status missing from query: {q}"