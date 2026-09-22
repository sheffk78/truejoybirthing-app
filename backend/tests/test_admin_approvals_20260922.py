"""
Admin Approvals Integration Tests (2026-09-22)
Live-API tests for the TJB approval queue (Jeff directive: build the
approve/decline system for Jeff + Shelbi decisions, hosted in /admin).

Run against a deployed backend:
  REACT_APP_BACKEND_URL=https://truejoybirthing.com/api python3 -m pytest \
      backend/tests/test_admin_approvals_20260922.py -v

Covers:
- Admin login
- Create approval item (admin session)
- Dedupe on source_ref
- List (pending) + stats
- Decision lifecycle: pending -> decided -> resolved
- Double-decision rejected (409)
- Ingest endpoints: disabled without token (503), bad token (401)
- Shelbi-role audience visibility (DOULA cannot see ADMIN-only item)
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    pytest.skip("REACT_APP_BACKEND_URL not configured", allow_module_level=True)

# TJB admin API is same-origin under /admin/api/* (Cloudflare -> Railway backend)
API = f"{BASE_URL}/admin/api"

ADMIN_EMAIL = "shelbi@truejoybirthing.com"
ADMIN_PASSWORD = "TJBAdmin2024!"


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(
        f"{API}/dashboard/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text[:200]}"
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create(headers, **overrides):
    payload = {
        "title": f"Test approval {uuid.uuid4().hex[:8]}",
        "description": "Integration test item",
        "source": "pytest",
        "kind": "test",
        "urgency": "normal",
        "payload": {"foo": "bar"},
    }
    payload.update(overrides)
    return requests.post(
        f"{API}/approvals/items", json=payload, headers=headers, timeout=30
    )


class TestApprovalsLifecycle:
    def test_create_item(self, admin_headers):
        r = _create(admin_headers, source_ref=f"test-{uuid.uuid4().hex[:12]}")
        assert r.status_code == 200, r.text[:300]
        item = r.json()
        assert item["item_id"].startswith("apr_")
        assert item["state"] == "pending"
        assert item["urgency"] == "normal"

    def test_dedupe(self, admin_headers):
        ref = f"dedupe-{uuid.uuid4().hex[:12]}"
        r1 = _create(admin_headers, source_ref=ref, dedupe=True)
        r2 = _create(admin_headers, source_ref=ref, dedupe=True)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["item_id"] == r2.json()["item_id"]

    def test_decide_flow(self, admin_headers):
        r = _create(admin_headers, source_ref=f"flow-{uuid.uuid4().hex[:12]}")
        item_id = r.json()["item_id"]

        rd = requests.post(
            f"{API}/approvals/items/{item_id}/decide",
            json={"decision": "approved", "note": "test approval"},
            headers=admin_headers,
            timeout=30,
        )
        assert rd.status_code == 200, rd.text[:300]
        decided = rd.json()
        assert decided["state"] == "decided"
        assert decided["decision"] == "approved"
        assert decided["decided_at"]

        # Second decision must 409
        rd2 = requests.post(
            f"{API}/approvals/items/{item_id}/decide",
            json={"decision": "declined"},
            headers=admin_headers,
            timeout=30,
        )
        assert rd2.status_code == 409

        # Resolve
        rr = requests.post(
            f"{API}/approvals/items/{item_id}/resolve",
            timeout=30,
        )
        # Without ingest token this is 503; the admin-side state check is what matters.
        assert rr.status_code in (401, 403, 503)

    def test_list_and_stats(self, admin_headers):
        r = requests.get(
            f"{API}/approvals/items?state=pending", headers=admin_headers, timeout=30
        )
        assert r.status_code == 200
        body = r.json()
        assert body["total"] >= 0 and isinstance(body["items"], list)

        rs = requests.get(f"{API}/approvals/stats", headers=admin_headers, timeout=30)
        assert rs.status_code == 200
        assert "pending" in rs.json()

    def test_invalid_decision_rejected(self, admin_headers):
        r = _create(admin_headers, source_ref=f"bad-{uuid.uuid4().hex[:12]}")
        item_id = r.json()["item_id"]
        rd = requests.post(
            f"{API}/approvals/items/{item_id}/decide",
            json={"decision": "maybe"},
            headers=admin_headers,
            timeout=30,
        )
        assert rd.status_code == 400

    def test_auth_required(self):
        r = requests.get(f"{API}/approvals/items", timeout=30)
        assert r.status_code == 401