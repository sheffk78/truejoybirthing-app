"""Tests for council Q1/Q2/Q3 implementations (JOB-20260911-TJB-INVOICE-UX-COUNCIL).

Run: python3 tests/test_invoice_ux_council_20260911.py
Mocked DB (same harness as test_invoice_notifications_20260911.py). Covers:
Q1: /mom/invoices passes through paid_at + provider_name (frontend computes 5-day window)
Q2: nudge_stale_payment_claims fires once for claims >48h, rate-limits, skips fresh ones
Q3: payment-methods GET/PUT normalize handles (strip @/$), persist to user doc
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from routes import dependencies as rd
rd.init_dependencies(
    database=None, password_context=None, secret_key="test-secret",
    algorithm="HS256", expire_days=7, notification_func=lambda *a, **k: None,
    email_func=None, websocket_manager=None, sender_email="x",
    get_current_user_func=lambda: None, check_role_func=lambda roles: (lambda: None),
)

from routes import invoices as inv

PASSED, FAILED = [], []


def check(name, cond, detail=""):
    (PASSED if cond else FAILED).append((name, detail))
    print(f"  {'PASS' if cond else 'FAIL'} {name}" + (f" — {detail}" if detail else ""))


class FakeCollection:
    def __init__(self, docs=None):
        self.docs = docs if docs is not None else []

    async def insert_one(self, doc):
        self.docs.append(doc)

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if all(d.get(k) == v for k, v in query.items()):
                return dict(d)
        return None

    def find(self, query, projection=None):
        self._q = query or {}
        return self

    def sort(self, *a):
        return self

    async def to_list(self, n):
        out = []
        for d in self.docs:
            ok = True
            for k, v in self._q.items():
                if k == "$or":
                    ok = any(all(d.get(kk) == vv for kk, vv in cond.items()) for cond in v)
                elif isinstance(v, dict) and "$in" in v:
                    ok = d.get(k) in v["$in"]
                elif isinstance(v, dict) and "$lt" in v:
                    val = d.get(k)
                    ok = val is not None and val < v["$lt"]
                else:
                    ok = d.get(k) == v
                if not ok:
                    break
            if ok:
                out.append(dict(d))
        return out[:n]

    async def update_one(self, query, update):
        for d in self.docs:
            if d.get("user_id") == query.get("user_id") or d.get("invoice_id") == query.get("invoice_id"):
                d.update((update or {}).get("$set") or {})
                class R: matched_count = 1; modified_count = 1
                return R()
        class R: matched_count = 0; modified_count = 0
        return R()


class FakeDB:
    def __init__(self):
        self.invoices = FakeCollection()
        self.notifications = FakeCollection()
        self.users = FakeCollection()
        self.clients = FakeCollection()


class FakeUser:
    user_id = "provider_1"
    full_name = "Seante Midwife"
    email = "seante@example.com"


async def test_nudge():
    print("\n[Q2] nudge_stale_payment_claims")
    fake = FakeDB()
    inv.db = fake
    calls = []
    async def fake_create(user_id, notif_type, title, message, data=None, send_push=True):
        calls.append((user_id, notif_type))
    inv.create_notification = fake_create

    now = datetime.now(timezone.utc)
    # stale claim (3 days old, never nudged), fresh claim (1h old), already-nudged recently
    fake.invoices.docs = [
        {"invoice_id": "inv_stale", "provider_id": "provider_1", "provider_type": "MIDWIFE",
         "status": "Payment Claimed", "payment_claimed_at": now - timedelta(hours=72),
         "invoice_number": "TJ-2026-010", "client_name": "Shelbi"},
        {"invoice_id": "inv_fresh", "provider_id": "provider_1", "provider_type": "MIDWIFE",
         "status": "Payment Claimed", "payment_claimed_at": now - timedelta(hours=1),
         "invoice_number": "TJ-2026-011", "client_name": "Other Mom"},
        {"invoice_id": "inv_nudged", "provider_id": "provider_1", "provider_type": "MIDWIFE",
         "status": "Payment Claimed", "payment_claimed_at": now - timedelta(hours=72),
         "payment_claimed_nudged_at": now - timedelta(hours=2),
         "invoice_number": "TJ-2026-012", "client_name": "Third Mom"},
    ]
    await inv.nudge_stale_payment_claims("provider_1", "MIDWIFE")
    nudged = [c for c in calls if c[1] == "invoice_payment_claimed_nudge"]
    check("only stale claim nudged", len(nudged) == 1, f"nudged={nudged}")
    check("nudge is in-app + push (via create_notification)", len(calls) == 1)
    check("nudge timestamp recorded", fake.invoices.docs[0].get("payment_claimed_nudged_at") is not None)
    check("fresh claim untouched", fake.invoices.docs[1].get("payment_claimed_nudged_at") is None)
    check("recently-nudged skipped", fake.invoices.docs[2].get("payment_claimed_nudged_at") is not None and len(nudged) == 1)


async def test_payment_methods_put():
    print("\n[Q3] update_payment_methods normalizes + persists")
    fake = FakeDB()
    fake.users.docs = [{"user_id": "provider_1", "full_name": "Seante Midwife", "payment_methods": {}}]
    inv.db = fake
    from routes.invoices import PaymentMethodUpdate

    data = PaymentMethodUpdate(
        venmo_handle="  @janemidwife ",
        cashapp_cashtag="$janemidwife",
        paypal_link="  paypal.me/janemidwife ",
        zelle_contact="(555) 123-4567",
    )
    result = await inv.update_payment_methods(data, FakeUser())
    pm = result["payment_methods"]
    check("venmo @ stripped", pm["venmo_handle"] == "janemidwife", pm["venmo_handle"])
    check("cashapp $ stripped", pm["cashapp_cashtag"] == "janemidwife", pm["cashapp_cashtag"])
    check("paypal preserved", pm["paypal_link"] == "paypal.me/janemidwife")
    check("zelle verbatim", pm["zelle_contact"] == "(555) 123-4567")
    check("persisted to user doc", fake.users.docs[0]["payment_methods"]["cashapp_cashtag"] == "janemidwife")
    check("updated_at recorded", fake.users.docs[0].get("payment_methods_updated_at") is not None)

    # clear a field with empty string
    data2 = PaymentMethodUpdate(venmo_handle="")
    await inv.update_payment_methods(data2, FakeUser())
    check("empty string clears field", fake.users.docs[0]["payment_methods"]["venmo_handle"] == "")


async def test_mom_invoice_passthrough():
    print("\n[Q1] mom invoices endpoint returns paid_at/provider fields for Recently Paid")
    fake = FakeDB()
    import routes.mom as mom_mod
    mom_mod.db = fake
    fake.invoices.docs = [{
        "invoice_id": "inv_paid1", "provider_id": "provider_1", "provider_type": "MIDWIFE",
        "client_id": "client_1", "status": "Paid", "amount": 400.0,
        "paid_at": datetime.now(timezone.utc) - timedelta(days=1),
        "created_at": datetime.now(timezone.utc),
    }]
    fake.users.docs = [{"user_id": "provider_1", "full_name": "Seante Midwife", "role": "MIDWIFE",
                        "payment_methods": {"venmo_handle": "seante"}}]
    fake.clients.docs = [{"client_id": "client_1", "provider_id": "provider_1", "linked_mom_id": "mom_user_1"}]
    class FakeUser:
        user_id = "mom_user_1"
        full_name = "Shelbi"
    orig = mom_mod.get_active_provider_ids_for_mom
    async def fake_active(mom_id): return {"provider_1"}
    mom_mod.get_active_provider_ids_for_mom = fake_active
    import routes.relationship_utils as ru
    ru.get_active_provider_ids_for_mom = fake_active

    result = await mom_mod.get_mom_invoices(FakeUser())
    inv_doc = result[0]
    check("paid_at present (frontend 5-day window)", inv_doc.get("paid_at") is not None)
    check("provider_name present", inv_doc.get("provider_name") == "Seante Midwife")
    check("provider_payment_methods echoed", inv_doc.get("provider_payment_methods", {}).get("venmo_handle") == "seante")
    check("status Passed through", inv_doc.get("status") == "Paid")
    mom_mod.get_active_provider_ids_for_mom = orig
    ru.get_active_provider_ids_for_mom = orig


async def main():
    await test_nudge()
    await test_payment_methods_put()
    await test_mom_invoice_passthrough()
    print(f"\n{'='*50}")
    print(f"PASSED: {len(PASSED)}  FAILED: {len(FAILED)}")
    for name, detail in FAILED:
        print(f"  FAILED: {name} {detail}")
    sys.exit(1 if FAILED else 0)


asyncio.run(main())