"""
Runner for ALL test classes from test_collaboration_permissions.py.
Handles register → verify-email → session_token auth flow.
"""
import asyncio, os, time, requests
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://127.0.0.1:8002').rstrip('/')
TIMESTAMP = int(time.time())
MONGO = 'mongodb://localhost:27017'
DB_NAME = 'truejoybirthing_test'

results = {}

def clear_state():
    async def _inner():
        client = AsyncIOMotorClient(MONGO)
        db = client[DB_NAME]
        await db.rate_limits.delete_many({})
        await db.email_verifications.delete_many({})
        # Clean up test users for clean run
        await db.users.delete_many({"email": {"$regex": f"_{TIMESTAMP}@"}})
        client.close()
    asyncio.run(_inner())

def get_code(email):
    async def _inner():
        c = AsyncIOMotorClient(MONGO)
        db = c[DB_NAME]
        doc = await db.email_verifications.find_one({"email": email}, sort=[("created_at", -1)])
        c.close()
        if not doc: raise RuntimeError(f"No code for {email}")
        return str(doc["code"])
    return asyncio.run(_inner())

def register(role, prefix):
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": f"{prefix}_{TIMESTAMP}@example.com",
        "password": "password123",
        "full_name": f"Test {prefix} {TIMESTAMP}",
        "role": role
    }, timeout=10)
    assert r.status_code == 200, f"Register {prefix} ({role}) failed: {r.status_code} {r.text}"
    return r.json()

def verify(email):
    code = get_code(email)
    r = requests.post(f"{BASE_URL}/api/auth/verify-email", json={"email": email, "code": code}, timeout=10)
    assert r.status_code == 200, f"Verify {email} failed: {r.status_code} {r.text}"
    d = r.json()
    assert "session_token" in d, f"verify-email missing session_token: {d}"
    return d

def t(name, fn):
    try:
        fn()
        results[name] = "PASS"
        print(f"  PASS  {name}")
    except AssertionError as e:
        results[name] = f"FAIL  {e}"
        print(f"  FAIL  {name} — {e}")
    except Exception as e:
        results[name] = f"ERROR  {e}"
        print(f"  ERROR {name} — {e}")


# =====================================================================
# TestMessagingPermissions
# =====================================================================
def run_messaging():
    print("\n--- TestMessagingPermissions ---")
    uidx = TIMESTAMP  # unique per run

    mom = register("MOM", f"mmsg_{uidx}")
    doula = register("DOULA", f"mdoula_{uidx}")
    mw = register("MIDWIFE", f"mmw_{uidx}")
    doula2 = register("DOULA", f"md2_{uidx}")

    ms = verify(mom["email"])
    ds = verify(doula["email"])
    mws = verify(mw["email"])
    d2s = verify(doula2["email"])

    # Connections: Mom↔Doula, Mom↔Midwife
    requests.post(f"{BASE_URL}/api/birth-plan/share", json={"provider_id": doula["user_id"]},
                  headers={"Authorization": f"Bearer {ms['session_token']}"})
    p = requests.get(f"{BASE_URL}/api/provider/share-requests",
                     headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
    req1 = next(r for r in p.get("requests", []) if r.get("mom_user_id") == mom["user_id"])
    requests.put(f"{BASE_URL}/api/provider/share-requests/{req1['request_id']}/respond",
                 json={"action": "accept"}, headers={"Authorization": f"Bearer {ds['session_token']}"})

    requests.post(f"{BASE_URL}/api/birth-plan/share", json={"provider_id": mw["user_id"]},
                  headers={"Authorization": f"Bearer {ms['session_token']}"})
    p2 = requests.get(f"{BASE_URL}/api/provider/share-requests",
                      headers={"Authorization": f"Bearer {mws['session_token']}"}).json()
    req2 = next(r for r in p2.get("requests", []) if r.get("mom_user_id") == mom["user_id"])
    requests.put(f"{BASE_URL}/api/provider/share-requests/{req2['request_id']}/respond",
                 json={"action": "accept"}, headers={"Authorization": f"Bearer {mws['session_token']}"})

    t("TestMessagingPermissions.test_mom_can_message_connected_doula",
      lambda: assert_eq(requests.post(f"{BASE_URL}/api/messages",
          json={"receiver_id": doula["user_id"], "content": "hi"},
          headers=auth(ms)).status_code, 200))

    t("TestMessagingPermissions.test_doula_can_message_connected_mom",
      lambda: assert_eq(requests.post(f"{BASE_URL}/api/messages",
          json={"receiver_id": mom["user_id"], "content": "hi"},
          headers=auth(ds)).status_code, 200))

    t("TestMessagingPermissions.test_mom_cannot_message_unconnected_doula",
      lambda: assert_eq(requests.post(f"{BASE_URL}/api/messages",
          json={"receiver_id": doula2["user_id"], "content": "hi"},
          headers=auth(ms)).status_code, 403))

    t("TestMessagingPermissions.test_unconnected_doula_cannot_message_mom",
      lambda: assert_eq(requests.post(f"{BASE_URL}/api/messages",
          json={"receiver_id": mom["user_id"], "content": "hi"},
          headers=auth(d2s)).status_code, 403))

    providers_connected = requests.post(f"{BASE_URL}/api/messages",
        json={"receiver_id": mw["user_id"], "content": "shared client"},
        headers=auth(ds))
    t("TestMessagingPermissions.test_providers_with_common_client_can_message",
      lambda: assert_eq(providers_connected.status_code, 200))

    providers_not_connected = requests.post(f"{BASE_URL}/api/messages",
        json={"receiver_id": mw["user_id"], "content": "no shared client"},
        headers=auth(d2s))
    t("TestMessagingPermissions.test_providers_without_common_client_cannot_message",
      lambda: assert_eq(providers_not_connected.status_code, 403))


# =====================================================================
# TestAppointmentSystem
# =====================================================================
def run_appointments():
    print("\n--- TestAppointmentSystem ---")
    uidx = TIMESTAMP + 1
    mom = register("MOM", f"a_mom_{uidx}")
    doula = register("DOULA", f"a_dl_{uidx}")
    ms = verify(mom["email"])
    ds = verify(doula["email"])

    requests.post(f"{BASE_URL}/api/birth-plan/share", json={"provider_id": doula["user_id"]},
                  headers={"Authorization": f"Bearer {ms['session_token']}"})
    p = requests.get(f"{BASE_URL}/api/provider/share-requests",
                     headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
    req = next(r for r in p.get("requests", []) if r.get("mom_user_id") == mom["user_id"])
    requests.put(f"{BASE_URL}/api/provider/share-requests/{req['request_id']}/respond",
                 json={"action": "accept"}, headers={"Authorization": f"Bearer {ds['session_token']}"})

    appt = {
        "mom_user_id": mom["user_id"],
        "appointment_date": "2026-02-15",
        "appointment_time": "10:00",
        "appointment_type": "prenatal_visit",
        "location": "Test Office",
        "is_virtual": False,
        "notes": "Private note"
    }
    create = requests.post(f"{BASE_URL}/api/appointments", json=appt,
                           headers={"Authorization": f"Bearer {ds['session_token']}"})

    t("TestAppointmentSystem.test_appointment_creation_by_doula",
      lambda: assert_eq(create.status_code, 200))

    unconn_mom = register("MOM", f"uc_mom_{uidx}")
    ucms = verify(unconn_mom["email"])
    no_conn = requests.post(f"{BASE_URL}/api/appointments", json={
        **appt, "mom_user_id": unconn_mom["user_id"]
    }, headers={"Authorization": f"Bearer {ds['session_token']}"})

    t("TestAppointmentSystem.test_appointment_creation_without_connection_fails",
      lambda: assert_eq(no_conn.status_code, 403))

    def mom_appts():
        r = requests.get(f"{BASE_URL}/api/appointments",
                         headers={"Authorization": f"Bearer {ms['session_token']}"})
        assert_eq(r.status_code, 200)
        a = r.json()
        assert len(a) > 0, "Mom should see appointments"
        for app in a:
            assert "notes" not in app, "Mom should NOT see private notes"
    t("TestAppointmentSystem.test_mom_sees_appointments_without_private_notes", mom_appts)

    def prov_appts():
        r = requests.get(f"{BASE_URL}/api/appointments",
                         headers={"Authorization": f"Bearer {ds['session_token']}"})
        assert_eq(r.status_code, 200)
        a = r.json()
        assert len(a) > 0
        assert any(aa.get("notes") for aa in a), "Provider should see private notes"
    t("TestAppointmentSystem.test_provider_sees_appointments_with_private_notes", prov_appts)

    if create.status_code == 200:
        aid = create.json().get("appointment_id") or create.json().get("appointment", {}).get("appointment_id")
        if aid:
            def accept():
                r = requests.put(f"{BASE_URL}/api/appointments/{aid}/respond?response=accepted",
                                 headers={"Authorization": f"Bearer {ms['session_token']}"})
                assert_eq(r.status_code, 200)
            t("TestAppointmentSystem.test_mom_accept_appointment", accept)

            def decline_new():
                # Create another to decline
                c2 = requests.post(f"{BASE_URL}/api/appointments", json={
                    **appt, "appointment_date": "2026-02-20", "appointment_time": "15:00",
                    "appointment_type": "postpartum_visit"
                }, headers={"Authorization": f"Bearer {ds['session_token']}"})
                if c2.status_code == 200:
                    aid2 = c2.json().get("appointment_id") or c2.json().get("appointment", {}).get("appointment_id")
                    r = requests.put(f"{BASE_URL}/api/appointments/{aid2}/respond?response=declined",
                                     headers={"Authorization": f"Bearer {ms['session_token']}"})
                    assert_eq(r.status_code, 200)
                else:
                    raise RuntimeError(f"Could not create appointment to decline: {c2.status_code}")
            t("TestAppointmentSystem.test_mom_decline_appointment", decline_new)


# =====================================================================
# TestBirthPlanReadOnly
# =====================================================================
def run_readonly():
    print("\n--- TestBirthPlanReadOnly ---")
    uidx = TIMESTAMP + 2
    mom = register("MOM", f"ro_mom_{uidx}")
    dl = register("DOULA", f"ro_dl_{uidx}")
    ms = verify(mom["email"])
    ds = verify(dl["email"])

    requests.post(f"{BASE_URL}/api/birth-plan/share", json={"provider_id": dl["user_id"]},
                  headers={"Authorization": f"Bearer {ms['session_token']}"})
    p = requests.get(f"{BASE_URL}/api/provider/share-requests",
                     headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
    req = next(r for r in p.get("requests", []) if r.get("mom_user_id") == mom["user_id"])
    requests.put(f"{BASE_URL}/api/provider/share-requests/{req['request_id']}/respond",
                 json={"action": "accept"}, headers={"Authorization": f"Bearer {ds['session_token']}"})

    bp = requests.get(f"{BASE_URL}/api/birth-plan",
                      headers={"Authorization": f"Bearer {ms['session_token']}"})
    assert bp.status_code == 200  # ensure plan exists

    shared = requests.get(f"{BASE_URL}/api/provider/shared-birth-plans",
                          headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
    plan = next((p for p in shared.get("birth_plans", []) if p.get("user_id") == mom["user_id"]), None)

    t("TestBirthPlanReadOnly.test_shared_birth_plan_has_read_only_flag",
      lambda: (_ for _ in ()).throw(AssertionError("plan missing")) if not plan else assert_eq(plan.get("read_only"), True))

    def detail_readonly():
        d = requests.get(f"{BASE_URL}/api/provider/shared-birth-plan/{mom['user_id']}",
                         headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
        assert_eq(d.get("read_only"), True)
        assert_eq(d.get("can_add_notes"), True)
    t("TestBirthPlanReadOnly.test_shared_birth_plan_detail_has_read_only_flag", detail_readonly)


# =====================================================================
# TestMidwifeVisitsForMom
# =====================================================================
def run_midwife_visits():
    print("\n--- TestMidwifeVisitsForMom ---")
    uidx = TIMESTAMP + 3
    mom = register("MOM", f"v_mom_{uidx}")
    mw = register("MIDWIFE", f"v_mw_{uidx}")
    ms = verify(mom["email"])
    mws = verify(mw["email"])

    # Onboarding
    for ep, role in [("mom/onboarding", "MOM"), ("midwife/onboarding", "MIDWIFE")]:
        body = {"due_date": "2026-06-15", "planned_birth_setting": "Home",
                "zip_code": "90210", "location_city": "Beverly Hills", "location_state": "CA"} if role == "MOM" else {
            "practice_name": "Test Midwifery", "credentials": "CNM", "zip_code": "90210",
            "location_city": "Beverly Hills", "location_state": "CA", "years_in_practice": 5,
            "birth_settings_served": ["Home", "Birth Center"]}
        tok = ms['session_token'] if role == "MOM" else mws['session_token']
        requests.post(f"{BASE_URL}/api/{ep}", json=body,
                      headers={"Authorization": f"Bearer {tok}"})

    requests.post(f"{BASE_URL}/api/birth-plan/share", json={"provider_id": mw["user_id"]},
                  headers={"Authorization": f"Bearer {ms['session_token']}"})
    p = requests.get(f"{BASE_URL}/api/provider/share-requests",
                     headers={"Authorization": f"Bearer {mws['session_token']}"}).json()
    req = next(r for r in p.get("requests", []) if r.get("mom_user_id") == mom["user_id"])
    requests.put(f"{BASE_URL}/api/provider/share-requests/{req['request_id']}/respond",
                 json={"action": "accept"}, headers={"Authorization": f"Bearer {mws['session_token']}"})

    # Create client
    cr = requests.post(f"{BASE_URL}/api/midwife/clients", json={
        "name": mom["full_name"], "email": mom["email"], "edd": "2026-06-15", "planned_birth_setting": "Home"
    }, headers={"Authorization": f"Bearer {mws['session_token']}"})
    assert cr.status_code in (200, 201), f"Client create: {cr.status_code} {cr.text}"
    cid = cr.json().get("client_id") or cr.json().get("client", {}).get("client_id")
    requests.put(f"{BASE_URL}/api/midwife/clients/{cid}", json={"linked_mom_id": mom["user_id"]},
                 headers={"Authorization": f"Bearer {mws['session_token']}"})

    # Create visit with clinical data
    vr = requests.post(f"{BASE_URL}/api/midwife/visits", json={
        "client_id": cid, "visit_date": "2026-01-15", "visit_type": "Prenatal",
        "gestational_age": "28 weeks", "blood_pressure": "120/80",
        "weight": "145 lbs", "fetal_heart_rate": "150 bpm",
        "summary_for_mom": "Everything looks great!", "private_note": "Watch for elevated BP"
    }, headers={"Authorization": f"Bearer {mws['session_token']}"})
    assert vr.status_code in (200, 201), f"Visit create: {vr.status_code} {vr.text}"

    def mom_visits():
        r = requests.get(f"{BASE_URL}/api/mom/midwife-visits",
                         headers={"Authorization": f"Bearer {ms['session_token']}"})
        assert_eq(r.status_code, 200)
        v = r.json().get("visits", [])
        assert len(v) > 0, "Mom should see visits"
        for visit in v:
            assert "blood_pressure" not in visit, "Mom should NOT see blood_pressure"
            assert "weight" not in visit, "Mom should NOT see weight"
            assert "fetal_heart_rate" not in visit, "Mom should NOT see fetal_heart_rate"
            assert "private_note" not in visit, "Mom should NOT see private_note"
            assert "summary_for_mom" in visit, "Mom should see summary_for_mom"
    t("TestMidwifeVisitsForMom.test_mom_sees_only_summary_for_mom", mom_visits)


# =====================================================================
# TestBirthPlanCompletionNotification
# =====================================================================
def run_birth_plan_complete():
    print("\n--- TestBirthPlanCompletionNotification ---")
    uidx = TIMESTAMP + 4
    mom = register("MOM", f"n_mom_{uidx}")
    dl = register("DOULA", f"n_dl_{uidx}")
    ms = verify(mom["email"])
    ds = verify(dl["email"])

    requests.post(f"{BASE_URL}/api/birth-plan/share", json={"provider_id": dl["user_id"]},
                  headers={"Authorization": f"Bearer {ms['session_token']}"})
    p = requests.get(f"{BASE_URL}/api/provider/share-requests",
                     headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
    req = next(r for r in p.get("requests", []) if r.get("mom_user_id") == mom["user_id"])
    requests.put(f"{BASE_URL}/api/provider/share-requests/{req['request_id']}/respond",
                 json={"action": "accept"}, headers={"Authorization": f"Bearer {ds['session_token']}"})

    # Get sections and complete them
    bp = requests.get(f"{BASE_URL}/api/birth-plan",
                      headers={"Authorization": f"Bearer {ms['session_token']}"}).json()
    sections = bp.get("sections", [])
    for s in sections:
        sid = s.get("section_id") or s.get("id")
        requests.put(f"{BASE_URL}/api/birth-plan/section/{sid}", json={
            "data": {"completed": True, "answers": ["Test"]},
            "notes_to_provider": "Test note"
        }, headers={"Authorization": f"Bearer {ms['session_token']}"})

    def check_complete():
        bp2 = requests.get(f"{BASE_URL}/api/birth-plan",
                           headers={"Authorization": f"Bearer {ms['session_token']}"}).json()
        pct = bp2.get("completion_percentage", 0)
        status = bp2.get("birth_plan_status", "")
        assert_eq(pct, 100.0)
        assert_eq(status, "complete")
    t("TestBirthPlanCompletionNotification.test_complete_all_birth_plan_sections", check_complete)

    def check_notif():
        notifs = requests.get(f"{BASE_URL}/api/notifications",
                              headers={"Authorization": f"Bearer {ds['session_token']}"}).json()
        nn = notifs.get("notifications", [])
        bpc = next((n for n in nn if n.get("type") == "birth_plan_complete"
                     and n.get("data", {}).get("mom_user_id") == mom["user_id"]), None)
        assert bpc is not None, f"Doula should receive birth_plan_complete notification. Got: {[n.get('type') for n in nn]}"
    t("TestBirthPlanCompletionNotification.test_provider_receives_birth_plan_complete_notification", check_notif)


# =====================================================================
# Helpers
# =====================================================================
def auth(sess):
    return {"Authorization": f"Bearer {sess['session_token']}"}

def assert_eq(actual, expected):
    assert actual == expected, f"Expected {expected!r}, got {actual!r}"


# =====================================================================
# MAIN
# =====================================================================
if __name__ == "__main__":
    print("=" * 70)
    print(f"test_collaboration_permissions.py — full runner")
    print(f"Backend: {BASE_URL}")
    print("=" * 70)

    clear_state()

    run_messaging()
    clear_state()
    run_appointments()
    clear_state()
    run_readonly()
    clear_state()
    run_midwife_visits()
    clear_state()
    run_birth_plan_complete()

    print("\n" + "=" * 70)
    print("SUMMARY — ALL TEST CLASSES")
    print("=" * 70)
    for name, result in results.items():
        tag = "PASS" if result == "PASS" else "FAIL/ERROR"
        print(f"  [{tag}] {name}")
        if result != "PASS":
            print(f"        {result}")

    ok = sum(1 for v in results.values() if v == "PASS")
    print(f"\n  {ok}/{len(results)} tests passed")
    print("=" * 70)

    print("\n[Per-test-class breakdown]")
    from collections import Counter
    by_prefix = Counter()
    pass_by_prefix = Counter()
    for name, result in results.items():
        prefix = name.split(".")[0]
        by_prefix[prefix] += 1
        if result == "PASS":
            pass_by_prefix[prefix] += 1
    for prefix in sorted(by_prefix):
        print(f"  {prefix}: {pass_by_prefix.get(prefix, 0)}/{by_prefix[prefix]} passed")