"""Tests for invoice notification + payment acknowledgment changes (JOB-20260911-TJB-INVOICE-VISIBILITY).

Run: python3 tests/test_invoice_notifications_20260911.py
No real DB required — mocks motor collections. Exercises:
1. notify_user routes through create_notification (push pipeline) when initialized
2. notify_user falls back to direct insert when route deps missing
3. acknowledge endpoint: Sent -> Payment Claimed + provider notified
4. acknowledge endpoint: Paid is idempotent, never downgraded
5. acknowledge endpoint: 404 when invoice outside active relationships
"""
import asyncio
import sys
import os
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# Initialize route deps BEFORE importing route modules (module-level
# Depends(check_role(...)) decorators require it at import time).
from routes import dependencies as route_deps
route_deps.init_dependencies(
    database=None,
    password_context=None,
    secret_key="test-secret",
    algorithm="HS256",
    expire_days=7,
    notification_func=lambda *a, **k: None,
    email_func=None,
    websocket_manager=None,
    sender_email="test@example.com",
    get_current_user_func=lambda: None,
    check_role_func=lambda roles: (lambda: None),
)

from routes import invoices as inv
from routes import mom as mom_routes

PASSED = []
FAILED = []


def check(name, cond, detail=""):
    if cond:
        PASSED.append(name)
        print(f"  PASS {name}")
    else:
        FAILED.append((name, detail))
        print(f"  FAIL {name} {detail}")


class FakeCollection:
    def __init__(self):
        self.docs = []

    async def insert_one(self, doc):
        self.docs.append(doc)

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items() if not isinstance(v, dict)):
                # handle {"$in": [...]} on client_id
                if "client_id" in query and isinstance(query["client_id"], dict):
                    if d.get("client_id") not in query["client_id"].get("$in", []):
                        continue
                return dict(d)
        return None

    async def update_one(self, query, update):
        for d in self.docs:
            if d.get("invoice_id") == query.get("invoice_id"):
                d.update((update or {}).get("$set") or {})
                class R: matched_count = 1; modified_count = 1
                return R()
        class R: matched_count = 0; modified_count = 0
        return R()

    def find(self, query, projection=None):
        self._query = query or {}
        return self

    def sort(self, *a):
        return self

    async def to_list(self, n):
        out = []
        for d in self.docs:
            ok = True
            for k, v in self._query.items():
                if isinstance(v, dict) and "$in" in v:
                    if d.get(k) not in v["$in"]:
                        ok = False
                        break
                elif d.get(k) != v:
                    ok = False
                    break
            if ok:
                out.append(dict(d))
        return out[:n]


class FakeDB:
    def __init__(self):
        self.invoices = FakeCollection()
        self.notifications = FakeCollection()
        self.clients = FakeCollection()


def setup(direct=False):
    """Wire fake db + optional create_notification, reset module state."""
    fake_db = FakeDB()
    inv.db = fake_db
    mom_routes.db = fake_db
    calls = []
    if direct:
        inv.create_notification = None
        mom_routes.create_notification = None
    else:
        async def create_notification(user_id, notif_type, title, message, data=None, send_push=True):
            calls.append((user_id, notif_type, title, message, data))
            await fake_db.notifications.insert_one({
                "notification_id": "notif_x", "user_id": user_id, "type": notif_type,
                "title": title, "message": message, "data": data or {},
                "read": False, "created_at": datetime.now(timezone.utc),
            })
        inv.create_notification = create_notification
        mom_routes.create_notification = create_notification
    return fake_db, calls


class FakeUser:
    user_id = "mom_user_1"
    full_name = "Shelbi Kohler"
    email = "sheffk78@gmail.com"


async def seed_invoice(fake_db, status="Sent"):
    fake_db.invoices.docs.append({
        "invoice_id": "inv_test123",
        "provider_id": "provider_1",
        "provider_type": "MIDWIFE",
        "client_id": "client_1",
        "client_name": "Shelbi Kohler ",
        "invoice_number": "TJ-2026-009",
        "description": "Retainer",
        "amount": 400.0,
        "issue_date": "2026-09-11",
        "due_date": None,
        "status": status,
        "sent_at": datetime.now(timezone.utc),
        "paid_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    })
    fake_db.clients.docs.append({
        "client_id": "client_1",
        "provider_id": "provider_1",
        "provider_type": "MIDWIFE",
        "linked_mom_id": "mom_user_1",
    })


async def test_push_pipeline():
    print("\n[1] notify_user uses create_notification (push) when initialized")
    fake_db, calls = setup(direct=False)
    await inv.notify_user("mom_user_1", "invoice_received", "New Invoice", "msg", data={"invoice_id": "x"})
    check("routes through create_notification", len(calls) == 1, f"calls={len(calls)}")
    check("push requested", calls and calls[0][1] == "invoice_received")
    check("no direct insert", len(fake_db.notifications.docs) == 1)  # created by the fake create_notification


async def test_fallback_insert():
    print("\n[2] notify_user falls back to direct insert when deps missing")
    fake_db, _ = setup(direct=True)
    await inv.notify_user("mom_user_1", "invoice_paid", "Payment Received", "msg", data={"invoice_id": "x"})
    check("direct insert happened", len(fake_db.notifications.docs) == 1)
    check("doc shape intact", fake_db.notifications.docs[0].get("type") == "invoice_paid")


async def test_ack_sent_to_claimed():
    print("\n[3] acknowledge: Sent -> Payment Claimed + provider notified")
    fake_db, calls = setup(direct=False)
    await seed_invoice(fake_db, status="Sent")
    # relationship: mom has active share_request with provider_1
    route_deps.db = fake_db
    import routes.mom as mom_mod
    mom_mod.db = fake_db
    from routes.relationship_utils import get_active_provider_ids_for_mom
    async def fake_active(mom_id):
        return ["provider_1"]
    orig = mom_mod.get_active_provider_ids_for_mom
    mom_mod.get_active_provider_ids_for_mom = fake_active
    # also patch relationship_utils so mom.py's imported reference is replaced
    import routes.relationship_utils as ru
    ru.get_active_provider_ids_for_mom = fake_active

    result = await mom_mod.acknowledge_mom_invoice_payment("inv_test123", None, FakeUser())
    check("returns success message", "acknowledgment" in result.get("message", ""), str(result))
    inv_doc = fake_db.invoices.docs[0]
    check("status = Payment Claimed", inv_doc["status"] == "Payment Claimed", inv_doc["status"])
    check("claimed_at set", inv_doc.get("payment_claimed_at") is not None)
    check("provider notified", len(calls) == 1 and calls[0][0] == "provider_1", f"calls={calls}")
    check("provider notif type", calls and calls[0][1] == "invoice_payment_claimed")
    mom_mod.get_active_provider_ids_for_mom = orig
    ru.get_active_provider_ids_for_mom = orig


async def test_ack_paid_idempotent():
    print("\n[4] acknowledge: Paid invoice is never downgraded")
    fake_db, calls = setup(direct=False)
    await seed_invoice(fake_db, status="Paid")
    route_deps.db = fake_db
    import routes.mom as mom_mod
    mom_mod.db = fake_db
    async def fake_active(mom_id):
        return ["provider_1"]
    orig = mom_mod.get_active_provider_ids_for_mom
    mom_mod.get_active_provider_ids_for_mom = fake_active
    import routes.relationship_utils as ru
    ru.get_active_provider_ids_for_mom = fake_active

    result = await mom_mod.acknowledge_mom_invoice_payment("inv_test123", None, FakeUser())
    check("says already paid", result.get("status") == "Paid", str(result))
    check("status stays Paid", fake_db.invoices.docs[0]["status"] == "Paid")
    check("no provider notification", len(calls) == 0)
    mom_mod.get_active_provider_ids_for_mom = orig
    ru.get_active_provider_ids_for_mom = orig


async def test_ack_404_outside_active():
    print("\n[5] acknowledge: 404 when invoice not in active relationships")
    fake_db, _ = setup(direct=False)
    await seed_invoice(fake_db, status="Sent")
    route_deps.db = fake_db
    import routes.mom as mom_mod
    from fastapi import HTTPException
    mom_mod.db = fake_db
    async def fake_active(mom_id):
        return []  # no active relationships
    orig = mom_mod.get_active_provider_ids_for_mom
    mom_mod.get_active_provider_ids_for_mom = fake_active
    import routes.relationship_utils as ru
    ru.get_active_provider_ids_for_mom = fake_active

    raised = False
    try:
        await mom_mod.acknowledge_mom_invoice_payment("inv_test123", None, FakeUser())
    except HTTPException as e:
        raised = e.status_code == 404
    check("raises 404", raised)
    mom_mod.get_active_provider_ids_for_mom = orig
    ru.get_active_provider_ids_for_mom = orig


async def main():
    await test_push_pipeline()
    await test_fallback_insert()
    await test_ack_sent_to_claimed()
    await test_ack_paid_idempotent()
    await test_ack_404_outside_active()
    print(f"\n{'='*50}")
    print(f"PASSED: {len(PASSED)}  FAILED: {len(FAILED)}")
    for name, detail in FAILED:
        print(f"  FAILED: {name} {detail}")
    sys.exit(1 if FAILED else 0)


asyncio.run(main())