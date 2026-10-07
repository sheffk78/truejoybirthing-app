"""
Sign-token regression tests — in-app contract signing (10/02).

Bug: mom home pushed /sign-contract?contractId=ID without signingToken, the sign
POST submitted an empty signing_token, and the backend 403'd "Invalid signing
token" (mismatch against the stored token). Fix: authenticated, MOM-only
GET /contracts/{id}/signing-token + GET /midwife-contracts/{id}/signing-token
return the stored token to the contract's own client; sign screens fetch it when
the deep-link param is absent.

Covers BOTH variants:
  - db.contracts        (doula agreement,  POST /contracts/{id}/sign)
  - db.midwife_contracts(midwife agreement, POST /midwife-contracts/{id}/sign)

Harness: live backend (REACT_APP_BACKEND_URL / EXPO_PUBLIC_BACKEND_URL), real
Mongo via DB_NAME for idempotent seeding. Run like run_e2e.sh does:

  export MONGO_URL=mongodb://localhost:27017 DB_NAME=truejoybirthing_test \
         JWT_SECRET_KEY=test-secret-local-only REACT_APP_BACKEND_URL=http://127.0.0.1:8011
  backend/.venv/bin/python -m pytest backend/tests/test_signing_token_in_app.py -v
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "").rstrip("/")
if not BASE_URL:
    pytest.skip("REACT_APP_BACKEND_URL not set (start the test backend per e2e-simulator/serve-backend.sh)",
                allow_module_level=True)

DAY = time.strftime("%Y%m%d%H%M%S")
PW = "password123"

MOM_EMAIL = f"st_mom_{DAY}@test.com"
OTHER_MOM_EMAIL = f"st_other_mom_{DAY}@test.com"
DOULA_EMAIL = f"st_doula_{DAY}@test.com"
MIDWIFE_EMAIL = f"st_midwife_{DAY}@test.com"


# ============== direct-Mongo seeding (mirrors scripts/verify_payment_plans.py) ==============

def _db():
    name = os.environ.get("DB_NAME")
    if not name:
        raise RuntimeError(
            "Set DB_NAME to the server's database (run_e2e.sh exports it) — "
            "harness direct-Mongo seeds MUST run with the same DB the server uses."
        )
    import pymongo
    return pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))[name]


def seed_users_and_clients():
    """Idempotent: create the mom/doula/midwife users + linked client records.

    Client records carry linked_mom_id + email (the same ownership signals
    GET /mom/contracts relies on). Returns the seeded ids for the session-scoped
    fixtures below.
    """
    db = _db()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
    from passlib.context import CryptContext
    ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')

    users = {
        MOM_EMAIL: (f"user_st_mom_{DAY}", "MOM", "ST Test Mom"),
        OTHER_MOM_EMAIL: (f"user_st_mom2_{DAY}", "MOM", "ST Other Mom"),
        DOULA_EMAIL: (f"user_st_dl_{DAY}", "DOULA", "ST Test Doula"),
        MIDWIFE_EMAIL: (f"user_st_mw_{DAY}", "MIDWIFE", "ST Test Midwife"),
    }
    mom_user_id = users[MOM_EMAIL][0]
    other_mom_user_id = users[OTHER_MOM_EMAIL][0]
    doula_user_id = users[DOULA_EMAIL][0]
    midwife_user_id = users[MIDWIFE_EMAIL][0]

    for email, (user_id, role, full_name) in users.items():
        db.users.update_one(
            {"email": email},
            {"$set": {
                "user_id": user_id,
                "email": email,
                "full_name": full_name,
                "role": role,
                "password_hash": ctx.hash(PW),
                "onboarding_completed": True,
                "email_verified": True,
                "created_at": now_iso,
            }},
            upsert=True,
        )

    # Doula-side client linked to the mom-under-test (db.contracts variant)
    doula_client_id = f"st_client_d_{DAY}"
    db.clients.update_one(
        {"client_id": doula_client_id},
        {"$set": {
            "client_id": doula_client_id,
            "provider_id": doula_user_id,
            "provider_type": "DOULA",
            "name": "ST Test Mom",
            "email": MOM_EMAIL,
            "linked_mom_id": mom_user_id,
            "status": "Active",
            "created_at": now_iso,
            "updated_at": now_iso,
        }},
        upsert=True,
    )

    # Midwife-side client linked to the mom-under-test (db.midwife_contracts variant)
    mw_client_id = f"st_client_m_{DAY}"
    db.clients.update_one(
        {"client_id": mw_client_id},
        {"$set": {
            "client_id": mw_client_id,
            "provider_id": midwife_user_id,
            "provider_type": "MIDWIFE",
            "name": "ST Test Mom",
            "email": MOM_EMAIL,
            "linked_mom_id": mom_user_id,
            "status": "Active",
            "created_at": now_iso,
            "updated_at": now_iso,
        }},
        upsert=True,
    )

    # A share_request so the mom-side relationship gating sees an active provider
    db.share_requests.update_one(
        {"provider_id": doula_user_id, "mom_user_id": mom_user_id},
        {"$set": {"provider_id": doula_user_id, "mom_user_id": mom_user_id,
                  "status": "accepted", "relationship_status": "active"}},
        upsert=True,
    )
    db.share_requests.update_one(
        {"provider_id": midwife_user_id, "mom_user_id": mom_user_id},
        {"$set": {"provider_id": midwife_user_id, "mom_user_id": mom_user_id,
                  "status": "accepted", "relationship_status": "active"}},
        upsert=True,
    )

    return {
        "mom_user_id": mom_user_id,
        "other_mom_user_id": other_mom_user_id,
        "doula_user_id": doula_user_id,
        "midwife_user_id": midwife_user_id,
        "doula_client_id": doula_client_id,
        "mw_client_id": mw_client_id,
    }


# ============== fixtures ==============

_LOGIN_CACHE: dict = {}


def login(email: str, password: str = PW) -> str:
    """Session token for a seeded account (login rate-limit: 10/60s per IP, raised
    100x under GW_E2E=1 — each seeded account logs in once per module)."""
    if email in _LOGIN_CACHE:
        return _LOGIN_CACHE[email]
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text[:200]}"
    token = r.json()["session_token"]
    _LOGIN_CACHE[email] = token
    return token


@pytest.fixture(scope="module")
def seeded():
    """Seed once per module; yield the ids."""
    return seed_users_and_clients()


@pytest.fixture(scope="module")
def mom_headers(seeded):
    return {"Authorization": f"Bearer {login(MOM_EMAIL)}"}


@pytest.fixture(scope="module")
def other_mom_headers(seeded):
    return {"Authorization": f"Bearer {login(OTHER_MOM_EMAIL)}"}


@pytest.fixture(scope="module")
def doula_headers(seeded):
    return {"Authorization": f"Bearer {login(DOULA_EMAIL)}"}


@pytest.fixture(scope="module")
def midwife_headers(seeded):
    return {"Authorization": f"Bearer {login(MIDWIFE_EMAIL)}"}


def create_doula_contract(seeded, doula_headers) -> str:
    payload = {
        "client_id": seeded["doula_client_id"],
        "client_name": "ST Test Mom",
        "estimated_due_date": "2027-01-15",
        "total_fee": 1800.0,
        "retainer_amount": 600.0,
        "special_arrangements": "TEST_ sign-token regression",
    }
    r = requests.post(f"{BASE_URL}/api/doula/contracts", json=payload,
                      headers=doula_headers, timeout=30)
    assert r.status_code == 200, f"Doula contract create failed: {r.status_code} {r.text[:300]}"
    cid = r.json()["contract_id"]
    assert cid.startswith("contract_"), cid
    return cid


def send_doula_contract(doula_headers, contract_id: str):
    r = requests.post(f"{BASE_URL}/api/doula/contracts/{contract_id}/send",
                      headers=doula_headers, timeout=30)
    assert r.status_code == 200, f"Doula contract send failed: {r.status_code} {r.text[:300]}"


def create_midwife_contract(seeded, midwife_headers) -> str:
    payload = {
        "client_id": seeded["mw_client_id"],
        "client_name": "ST Test Mom",
        "estimated_due_date": "2027-01-15",
        "planned_birth_location": "Test Birth Center",
        "total_fee": 3500.0,
        "retainer_amount": 1500.0,
        "special_arrangements": "TEST_ sign-token regression",
    }
    r = requests.post(f"{BASE_URL}/api/midwife/contracts", json=payload,
                      headers=midwife_headers, timeout=30)
    assert r.status_code == 200, f"Midwife contract create failed: {r.status_code} {r.text[:300]}"
    cid = r.json()["contract_id"]
    assert cid.startswith("mw_contract_"), cid
    return cid


def send_midwife_contract(midwife_headers, contract_id: str):
    r = requests.post(f"{BASE_URL}/api/midwife/contracts/{contract_id}/send",
                      headers=midwife_headers, timeout=30)
    assert r.status_code == 200, f"Midwife contract send failed: {r.status_code} {r.text[:300]}"


# ============== doula variant: db.contracts ==============

class TestDoulaContractSigningToken:
    """MOM fetches the token for a doula contract it owns, then signs."""

    contract_id: str = None

    @classmethod
    def setup_class(cls):
        db = _db()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        cls.contract_id = f"contract_st_{DAY}"
        db.contracts.update_one(
            {"contract_id": cls.contract_id},
            {"$set": {
                "contract_id": cls.contract_id,
                "doula_id": f"user_st_dl_{DAY}",
                "doula_name": "ST Test Doula",
                "client_id": f"st_client_d_{DAY}",
                "client_name": "ST Test Mom",
                "estimated_due_date": "2027-01-15",
                "total_fee": 1800.0,
                "retainer_amount": 600.0,
                "remaining_balance": 1200.0,
                "status": "Sent",
                "signing_token": f"st_{uuid.uuid4().hex[:16]}_doula",
                "created_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )
        # Deliberately WITHOUT signing_token to prove the mint-on-fetch path?
        # No — create it with no token and let the endpoint mint one (covered in
        # the legacy test below). This contract HAS a token: fetch must return the
        # stored one unchanged.

    def test_01_token_endpoint_returns_stored_token(self, mom_headers):
        r = requests.get(
            f"{BASE_URL}/api/contracts/{self.contract_id}/signing-token",
            headers=mom_headers, timeout=30)
        assert r.status_code == 200, f"signing-token GET failed: {r.status_code} {r.text[:200]}"
        token = r.json().get("signing_token")
        assert token and token.startswith("st_"), token
        stored = _db().contracts.find_one({"contract_id": self.contract_id},
                                          {"_id": 0, "signing_token": 1})["signing_token"]
        assert token == stored, "endpoint must return the STORED token, not a new mint"
        # Idempotent GET
        r2 = requests.get(f"{BASE_URL}/api/contracts/{self.contract_id}/signing-token",
                          headers=mom_headers, timeout=30)
        assert r2.json()["signing_token"] == token, "repeat GET must not rotate the token"

    def test_02_wrong_owner_mom_gets_403(self, other_mom_headers):
        r = requests.get(
            f"{BASE_URL}/api/contracts/{self.contract_id}/signing-token",
            headers=other_mom_headers, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"

    def test_03_doula_role_blocked(self, doula_headers):
        r = requests.get(
            f"{BASE_URL}/api/contracts/{self.contract_id}/signing-token",
            headers=doula_headers, timeout=30)
        assert r.status_code == 403, f"MOM-only route returned {r.status_code}: {r.text[:200]}"

    def test_04_unauthenticated_blocked(self):
        r = requests.get(f"{BASE_URL}/api/contracts/{self.contract_id}/signing-token", timeout=30)
        assert r.status_code in (401, 403), f"unauthenticated returned {r.status_code}"

    def test_05_wrong_owner_sign_post_403(self, other_mom_headers):
        # Token-mismatch path: an empty/wrong token must 403 with the reopen copy
        empty = requests.post(
            f"{BASE_URL}/api/contracts/{self.contract_id}/sign",
            json={"signer_name": "ST Wrong Owner", "signing_token": ""},
            headers=other_mom_headers, timeout=30)
        assert empty.status_code == 403, f"expected 403, got {empty.status_code}: {empty.text[:200]}"
        assert "Signing link expired or invalid" in empty.json().get("detail", ""), empty.text[:300]

    def test_06_owner_sign_post_succeeds_with_fetched_token(self, mom_headers):
        tok = requests.get(
            f"{BASE_URL}/api/contracts/{self.contract_id}/signing-token",
            headers=mom_headers, timeout=30).json()["signing_token"]
        r = requests.post(
            f"{BASE_URL}/api/contracts/{self.contract_id}/sign",
            json={
                "signer_name": "ST Test Mom",
                "signature_data": "Electronically signed by ST Test Mom (test harness)",
                "signing_token": tok,
            },
            headers=mom_headers, timeout=30)
        assert r.status_code == 200, f"sign failed: {r.status_code} {r.text[:300]}"
        assert r.json().get("message") == "Contract signed successfully"
        doc = _db().contracts.find_one({"contract_id": self.contract_id}, {"_id": 0, "status": 1})
        assert doc["status"] == "Signed", doc

    def test_07_already_signed_rejected(self, mom_headers):
        r = requests.post(
            f"{BASE_URL}/api/contracts/{self.contract_id}/sign",
            json={"signer_name": "ST Test Mom", "signing_token": "anything"},
            headers=mom_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 already-signed, got {r.status_code}: {r.text[:200]}"

    def test_08_non_signable_status_rejected(self, mom_headers, doula_headers):
        """A Draft (never sent) contract: token endpoint works for the OWNER, but
        the sign POST must reject a non-Sent status."""
        db = _db()
        draft_id = f"contract_st_draft_{DAY}"
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        db.contracts.update_one(
            {"contract_id": draft_id},
            {"$set": {
                "contract_id": draft_id,
                "doula_id": f"user_st_dl_{DAY}",
                "doula_name": "ST Test Doula",
                "client_id": f"st_client_d_{DAY}",
                "client_name": "ST Test Mom",
                "estimated_due_date": "2027-01-15",
                "total_fee": 1000.0,
                "retainer_amount": 500.0,
                "remaining_balance": 500.0,
                "status": "Draft",
                "signing_token": f"st_{uuid.uuid4().hex[:16]}_draft",
                "created_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )
        r = requests.post(
            f"{BASE_URL}/api/contracts/{draft_id}/sign",
            json={"signer_name": "ST Test Mom",
                  "signing_token": db.contracts.find_one({"contract_id": draft_id},
                                                         {"_id": 0, "signing_token": 1})["signing_token"]},
            headers=mom_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 for Draft sign, got {r.status_code}: {r.text[:200]}"
        assert "sent before signing" in r.json().get("detail", "").lower(), r.text[:200]

    def test_09_token_not_in_mom_contracts_list(self, mom_headers):
        """signing_token must not ride along in mom-facing list responses (the
        dedicated token endpoint is the ONLY mom-facing source)."""
        r = requests.get(f"{BASE_URL}/api/mom/contracts", headers=mom_headers, timeout=30)
        assert r.status_code == 200
        leaked = [c["contract_id"] for c in r.json() if c.get("signing_token")]
        assert not leaked, f"signing_token leaked via /mom/contracts: {leaked[:3]}"

    def test_10_legacy_contract_without_token_gets_one_minted(self, mom_headers):
        """Pre-fix contracts carry no signing_token: the endpoint must mint,
        persist, and return one so the sign-guard stays meaningful."""
        db = _db()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        legacy_id = f"contract_st_legacy_{DAY}"
        db.contracts.update_one(
            {"contract_id": legacy_id},
            {"$set": {
                "contract_id": legacy_id,
                "doula_id": f"user_st_dl_{DAY}",
                "doula_name": "ST Test Doula",
                "client_id": f"st_client_d_{DAY}",
                "client_name": "ST Test Mom",
                "estimated_due_date": "2027-01-15",
                "total_fee": 900.0,
                "retainer_amount": 400.0,
                "remaining_balance": 500.0,
                "status": "Sent",
                "created_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )
        r = requests.get(f"{BASE_URL}/api/contracts/{legacy_id}/signing-token",
                         headers=mom_headers, timeout=30)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
        token = r.json()["signing_token"]
        assert token and token.startswith("st_"), token
        persisted = db.contracts.find_one({"contract_id": legacy_id}, {"_id": 0, "signing_token": 1})
        assert persisted.get("signing_token") == token, "minted token must be persisted"


# ============== midwife variant: db.midwife_contracts ==============

class TestMidwifeContractSigningToken:
    """MOM fetches the token for a midwife contract it owns, then signs."""

    contract_id: str = None

    @classmethod
    def setup_class(cls):
        db = _db()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        cls.contract_id = f"mw_contract_st_{DAY}"
        db.midwife_contracts.update_one(
            {"contract_id": cls.contract_id},
            {"$set": {
                "contract_id": cls.contract_id,
                "midwife_id": f"user_st_mw_{DAY}",
                "midwife_practice_name": "ST Midwifery",
                "client_id": f"st_client_m_{DAY}",
                "client_name": "ST Test Mom",
                "partner_name": "ST Partner",
                "agreement_date": now_iso[:10],
                "estimated_due_date": "2027-01-15",
                "planned_birth_location": "Test Birth Center",
                "total_fee": 3500.0,
                "retainer_amount": 1500.0,
                "remaining_balance": 2000.0,
                "status": "Sent",
                "signing_token": f"st_{uuid.uuid4().hex[:16]}_midwife",
                "created_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )

    def cleanup(self):
        """Sweep this run's seeded contracts out of the test DB (db is disposable;
        keeps the mom-home pending list uncluttered for the UI E2E)."""
        db = _db()
        db.contracts.delete_many({"contract_id": {"$regex": f"contract_st_.*_{DAY}"}})
        db.midwife_contracts.delete_many({"contract_id": {"$regex": f"mw_contract_st_.*_{DAY}"}})
        db.clients.delete_many({"client_id": {"$regex": f"st_client_[dm]_{DAY}"}})
        db.users.delete_many({"email": {"$regex": f"st_(mom|other_mom|doula|midwife)_{DAY}@"}})
        db.share_requests.delete_many({"$or": [
            {"provider_id": f"user_st_dl_{DAY}"},
            {"provider_id": f"user_st_mw_{DAY}"},
        ]})

    def test_01_token_endpoint_returns_stored_token(self, mom_headers):
        r = requests.get(
            f"{BASE_URL}/api/midwife-contracts/{self.contract_id}/signing-token",
            headers=mom_headers, timeout=30)
        assert r.status_code == 200, f"signing-token GET failed: {r.status_code} {r.text[:200]}"
        token = r.json().get("signing_token")
        assert token and token.startswith("st_"), token
        stored = _db().midwife_contracts.find_one({"contract_id": self.contract_id},
                                                  {"_id": 0, "signing_token": 1})["signing_token"]
        assert token == stored, "endpoint must return the STORED token, not a new mint"

    def test_02_wrong_owner_mom_gets_403(self, other_mom_headers):
        r = requests.get(
            f"{BASE_URL}/api/midwife-contracts/{self.contract_id}/signing-token",
            headers=other_mom_headers, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text[:200]}"

    def test_03_midwife_role_blocked(self, midwife_headers):
        r = requests.get(
            f"{BASE_URL}/api/midwife-contracts/{self.contract_id}/signing-token",
            headers=midwife_headers, timeout=30)
        assert r.status_code == 403, f"MOM-only route returned {r.status_code}: {r.text[:200]}"

    def test_04_sign_post_succeeds_with_fetched_token(self, mom_headers):
        tok = requests.get(
            f"{BASE_URL}/api/midwife-contracts/{self.contract_id}/signing-token",
            headers=mom_headers, timeout=30).json()["signing_token"]
        r = requests.post(
            f"{BASE_URL}/api/midwife-contracts/{self.contract_id}/sign",
            json={
                "signer_name": "ST Test Mom",
                "signature_data": "ST Test Mom (test harness)",
                "signing_token": tok,
            },
            headers=mom_headers, timeout=30)
        assert r.status_code == 200, f"sign failed: {r.status_code} {r.text[:300]}"
        assert r.json().get("message") == "Contract signed successfully"
        doc = _db().midwife_contracts.find_one({"contract_id": self.contract_id},
                                               {"_id": 0, "status": 1})
        assert doc["status"] == "Signed", doc

    def test_05_already_signed_rejected(self, mom_headers):
        r = requests.post(
            f"{BASE_URL}/api/midwife-contracts/{self.contract_id}/sign",
            json={"signer_name": "ST Test Mom", "signing_token": "anything"},
            headers=mom_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 already-signed, got {r.status_code}: {r.text[:200]}"

    def test_06_non_signable_status_rejected(self, mom_headers, midwife_headers):
        db = _db()
        draft_id = f"mw_contract_st_draft_{DAY}"
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        db.midwife_contracts.update_one(
            {"contract_id": draft_id},
            {"$set": {
                "contract_id": draft_id,
                "midwife_id": f"user_st_mw_{DAY}",
                "midwife_practice_name": "ST Midwifery",
                "client_id": f"st_client_m_{DAY}",
                "client_name": "ST Test Mom",
                "agreement_date": now_iso[:10],
                "estimated_due_date": "2027-01-15",
                "planned_birth_location": "Test Birth Center",
                "total_fee": 2000.0,
                "retainer_amount": 800.0,
                "remaining_balance": 1200.0,
                "status": "Draft",
                "signing_token": f"st_{uuid.uuid4().hex[:16]}_draft",
                "created_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )
        r = requests.post(
            f"{BASE_URL}/api/midwife-contracts/{draft_id}/sign",
            json={"signer_name": "ST Test Mom",
                  "signing_token": db.midwife_contracts.find_one(
                      {"contract_id": draft_id}, {"_id": 0, "signing_token": 1})["signing_token"]},
            headers=mom_headers, timeout=30)
        assert r.status_code == 400, f"expected 400 for Draft sign, got {r.status_code}: {r.text[:200]}"
        assert "sent before signing" in r.json().get("detail", "").lower(), r.text[:200]

    def test_07_legacy_midwife_contract_without_token_gets_one_minted(self, mom_headers):
        db = _db()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        legacy_id = f"mw_contract_st_legacy_{DAY}"
        db.midwife_contracts.update_one(
            {"contract_id": legacy_id},
            {"$set": {
                "contract_id": legacy_id,
                "midwife_id": f"user_st_mw_{DAY}",
                "client_id": f"st_client_m_{DAY}",
                "client_name": "ST Test Mom",
                "estimated_due_date": "2027-01-15",
                "planned_birth_location": "Test Birth Center",
                "total_fee": 1200.0,
                "retainer_amount": 500.0,
                "remaining_balance": 700.0,
                "status": "Sent",
                "created_at": now_iso,
                "updated_at": now_iso,
            }},
            upsert=True,
        )
        r = requests.get(f"{BASE_URL}/api/midwife-contracts/{legacy_id}/signing-token",
                         headers=mom_headers, timeout=30)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
        token = r.json()["signing_token"]
        assert token and token.startswith("st_"), token
        persisted = db.midwife_contracts.find_one({"contract_id": legacy_id},
                                                  {"_id": 0, "signing_token": 1})
        assert persisted.get("signing_token") == token, "minted token must be persisted"



    def test_11_send_response_and_notification_carry_token(self, mom_headers, midwife_headers):
        """The provider's send response (signing_url) and the in-app notification
        action_url must embed signingToken so email/notification deep links keep
        working after the list/detail leak strips."""
        import pymongo
        db = _db()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"
        cid = f"mw_contract_st_deeplink_{DAY}"
        client_id = f"st_client_dl_{DAY}"
        db.clients.update_one({"client_id": client_id},
            {"$set": {"client_id": client_id, "provider_id": f"user_st_mw_{DAY}",
                      "provider_type": "MIDWIFE", "name": "ST Test Mom",
                      "email": MOM_EMAIL, "linked_mom_id": f"user_st_mom_{DAY}",
                      "edd": "2027-01-15", "status": "Active"}}, upsert=True)
        db.midwife_contracts.update_one({"contract_id": cid},
            {"$set": {"contract_id": cid, "midwife_id": f"user_st_mw_{DAY}",
                      "midwife_practice_name": "ST Midwifery", "client_id": client_id,
                      "client_name": "ST Test Mom", "estimated_due_date": "2027-01-15",
                      "planned_birth_location": "Test Birth Center", "total_fee": 1200.0,
                      "retainer_amount": 500.0, "remaining_balance": 700.0,
                      "status": "Draft", "signing_token": f"st_{uuid.uuid4().hex[:16]}_dl",
                      "created_at": now_iso, "updated_at": now_iso}}, upsert=True)
        r = requests.post(f"{BASE_URL}/api/midwife/contracts/{cid}/send",
                          headers=midwife_headers, timeout=30)
        assert r.status_code == 200, f"send failed: {r.status_code} {r.text[:200]}"
        url = r.json().get("signing_url", "")
        assert cid in url and "signingToken=st_" in url, f"send signing_url missing token: {url}"
        notif = db.notifications.find_one({"user_id": f"user_st_mom_{DAY}",
                                           "data.contract_id": cid}, {"_id": 0})
        assert notif, "send did not create an in-app notification for the mom"
        aurl = (notif.get("data") or {}).get("action_url", "")
        assert "signingToken=st_" in aurl, f"notification action_url missing token: {aurl}"

    def test_12_no_token_leak_via_provider_lists_or_public_detail(self, mom_headers, doula_headers, midwife_headers):
        """signing_token must not appear in doula/midwife provider list rows or the
        public detail/html routes (the ONLY sanctioned sources are the send/create
        response signing_url, the MOM signing-token endpoint, and email links)."""
        # provider lists
        r = requests.get(f"{BASE_URL}/api/doula/contracts", headers=doula_headers, timeout=30)
        assert r.status_code == 200
        assert not any("signing_token" in c for c in r.json()), "doula list leaks signing_token"
        r = requests.get(f"{BASE_URL}/api/midwife/contracts", headers=midwife_headers, timeout=30)
        assert r.status_code == 200
        assert not any("signing_token" in c for c in r.json()), "midwife list leaks signing_token"
        # public detail + html (unauthenticated, token guard territory)
        d = requests.get(f"{BASE_URL}/api/contracts/{self.contract_id}", timeout=30)
        if d.status_code == 200:
            assert "signing_token" not in d.json().get("contract", {}), "public detail leaks signing_token"
        h = requests.get(f"{BASE_URL}/api/contracts/{self.contract_id}/html", timeout=30)
        if h.status_code == 200:
            assert "signing_token" not in h.text, "public html leaks signing_token"


def test_cleanup_after_all():
    """Idempotent test-DB cleanup (runs even when earlier tests fail)."""
    db = _db()
    db.contracts.delete_many({"contract_id": {"$regex": f"contract_st_.*_{DAY}"}})
    db.midwife_contracts.delete_many({"contract_id": {"$regex": f"mw_contract_st_.*_{DAY}"}})
    db.clients.delete_many({"client_id": {"$regex": f"st_client_[dm]_{DAY}"}})
    db.users.delete_many({"email": {"$regex": f"st_(mom|other_mom|doula|midwife)_{DAY}@"}})
    db.share_requests.delete_many({"$or": [
        {"provider_id": f"user_st_dl_{DAY}"},
        {"provider_id": f"user_st_mw_{DAY}"},
    ]})


if __name__ == "__main__":
    import sys
    raise SystemExit(pytest.main([__file__, "-v", "--tb=short"] + sys.argv[1:]))