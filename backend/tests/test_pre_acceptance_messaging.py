"""
Integration test for Pre-Acceptance Messaging flow (TJB backend v1.1).

Verifies:
1. Mom can message an unconnected marketplace provider -> 200 + auto-creates pre_acceptance thread
2. Provider can reply to mom in the thread -> 200
3. GET /messages/conversations returns thread_status=pre_acceptance for both sides
4. GET /messages/{id} returns thread metadata with can_accept for provider
5. Provider accepts -> thread accepted, client + share_request created
6. Mom notified / thread status changes
7. Provider cannot cold-message an unconnected mom
8. Provider can decline a thread
"""
import requests
import uuid
import time
import sys

BASE = "http://127.0.0.1:8002"
EMAIL_AT = f"@test.com"
suffix = int(time.time())

def register(email, role, full_name):
    r = requests.post(f"{BASE}/api/auth/register", json={
        "email": email, "password": "password123", "full_name": full_name, "role": role
    })
    data = r.json()
    # Register returns user_id but email_verified=False blocks login. Verify in DB directly.
    import subprocess
    subprocess.run(["mongosh","--quiet","truejoybirthing_test","--eval",
        f"db.users.updateOne({{email:'{email}'}},{{$set:{{email_verified:true}}}})"],
        capture_output=True, text=True)
    time.sleep(0.4)
    lr = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": "password123"})
    if lr.status_code == 200:
        ldata = lr.json()
        data["session_token"] = ldata.get("session_token")
        data["user_id"] = ldata.get("user_id") or data.get("user_id")
    return data

def clear_limits():
    # clear rate limits via direct DB is not exposed; we just pace requests
    time.sleep(0.3)

results = []
def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((name, status, detail))
    print(f"{status}: {name}" + (f" — {detail}" if detail else ""))

print("="*60)
print("PRE-ACCEPTANCE MESSAGING FLOW TEST")
print("="*60)

# 1. Create mom + doula (unconnected)
mom = register(f"pa_mom_{suffix}{EMAIL_AT}", "MOM", "PA Test Mom")
clear_limits()
doula = register(f"pa_doula_{suffix}{EMAIL_AT}", "DOULA", "PA Test Doula")
clear_limits()

mom_session = mom.get("session_token")
doula_session = doula.get("session_token")
mom_id = mom.get("user_id")
doula_id = doula.get("user_id")

print(f"\nMom: {mom_id}")
print(f"Doula: {doula_id}")
print(f"Mom session: {'YES' if mom_session else 'NO'}, Doula session: {'YES' if doula_session else 'NO'}")

h = {"Content-Type": "application/json"}

# 2. MOM MESSAGES UNCONNECTED DOULA (should be 200 now, auto-creates thread)
rh = dict(h); rh["Authorization"] = f"Bearer {mom_session}"
msg = f"Hi, I found you on TJB and would love to learn more — {suffix}"
r = requests.post(f"{BASE}/api/messages", headers=rh, json={"receiver_id": doula_id, "content": msg})
check("Mom->unconnected doula returns 200", r.status_code == 200, f"got {r.status_code}: {r.text[:120]}")
data = r.json() if r.status_code == 200 else {}
thread_id = data.get("data", {}).get("thread_id")
print(f"  auto-created thread_id: {thread_id}")

# 3. DOULA REPLIES (should be 200)
rhd = dict(h); rhd["Authorization"] = f"Bearer {doula_session}"
r = requests.post(f"{BASE}/api/messages", headers=rhd, json={"receiver_id": mom_id, "content": f"Hi {suffix}, happy to chat!"})
check("Doula->mom reply returns 200", r.status_code == 200, f"got {r.status_code}: {r.text[:120]}")

# 4. DOULA CONVERSATIONS shows pre_acceptance + can_accept
r = requests.get(f"{BASE}/api/messages/conversations", headers=rhd)
convos = r.json().get("conversations", []) if r.status_code == 200 else []
mom_conv = next((c for c in convos if c.get("other_user_id") == mom_id), None)
check("Doula sees conversation with mom", mom_conv is not None)
if mom_conv:
    check("Doula conversation thread_status=pre_acceptance", mom_conv.get("thread_status") == "pre_acceptance", f"got {mom_conv.get('thread_status')}")
    check("Doula conversation can_accept=true", mom_conv.get("can_accept") is True, f"got {mom_conv.get('can_accept')}")
    check("Doula conversation can_decline=true", mom_conv.get("can_decline") is True)

# 5. GET /messages/{mom_id} returns thread metadata with can_accept for doula
r = requests.get(f"{BASE}/api/messages/{mom_id}", headers=rhd)
td = r.json() if r.status_code == 200 else {}
thread_info = td.get("thread")
check("Doula GET messages returns thread object", thread_info is not None)
if thread_info:
    check("Doula thread status=pre_acceptance", thread_info.get("status") == "pre_acceptance")
    check("Doula thread can_accept=true", thread_info.get("can_accept") is True)
    check("Doula thread can_decline=true", thread_info.get("can_decline") is True)

# 6. PROVIDER CANNOT COLD-MESSAGE UNCONNECTED MOM (new mom, no thread)
mom2 = register(f"pa_mom2_{suffix}{EMAIL_AT}", "MOM", "PA Test Mom2")
clear_limits()
rhd2 = dict(h); rhd2["Authorization"] = f"Bearer {doula_session}"
r = requests.post(f"{BASE}/api/messages", headers=rhd2, json={"receiver_id": mom2.get("user_id"), "content": "cold outreach"})
check("Doula cold-message unconnected mom -> 403", r.status_code == 403, f"got {r.status_code}: {r.text[:120]}")

# 7. PROVIDER ACCEPTS the thread
r = requests.post(f"{BASE}/api/messages/threads/{thread_id}/accept", headers=rhd)
check("Provider accept thread -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:150]}")
accept_data = r.json() if r.status_code == 200 else {}
print(f"  accept result: {accept_data}")
check("Accept returns client_id", bool(accept_data.get("client_id")))
check("Accept returns share_request_id", bool(accept_data.get("share_request_id")))

# 8. After accept, conversation shows accepted + can_accept false
r = requests.get(f"{BASE}/api/messages/conversations", headers=rhd)
convos = r.json().get("conversations", []) if r.status_code == 200 else []
mom_conv = next((c for c in convos if c.get("other_user_id") == mom_id), None)
if mom_conv:
    check("After accept thread_status=accepted", mom_conv.get("thread_status") == "accepted", f"got {mom_conv.get('thread_status')}")
    check("After accept can_accept=false", mom_conv.get("can_accept") is False)

# 9. MOM CONVERSATION shows pre_acceptance -> now accepted
r = requests.get(f"{BASE}/api/messages/conversations", headers=rh)
convos = r.json().get("conversations", []) if r.status_code == 200 else []
doula_conv = next((c for c in convos if c.get("other_user_id") == doula_id), None)
check("Mom sees conversation with doula", doula_conv is not None)
if doula_conv:
    check("Mom conversation thread_status present", doula_conv.get("thread_status") in ("accepted", "pre_acceptance"), f"got {doula_conv.get('thread_status')}")
    check("Mom can_accept=false", doula_conv.get("can_accept") is False)

# 10. VERIFY client + share_request created in DB
import subprocess
out = subprocess.run(["mongosh","--quiet","truejoybirthing_test","--eval",
    f"printjson({{clients: db.clients.countDocuments({{provider_id:'{doula_id}', linked_mom_id:'{mom_id}'}}), shares: db.share_requests.countDocuments({{provider_id:'{doula_id}', mom_user_id:'{mom_id}'}})}})"],
    capture_output=True, text=True).stdout
print(f"  DB check: {out.strip()}")
check("Client record created", "clients: 1" in out)
check("Share request created", "shares: 1" in out)

# 11. DECLINE FLOW: mom3 messages doula2, doula2 declines
mom3 = register(f"pa_mom3_{suffix}{EMAIL_AT}", "MOM", "PA Test Mom3")
clear_limits()
rh3 = dict(h); rh3["Authorization"] = f"Bearer {mom3.get('session_token')}"
r = requests.post(f"{BASE}/api/messages", headers=rh3, json={"receiver_id": doula_id, "content": "hello for decline test"})
check("Mom3->doula returns 200", r.status_code == 200, f"got {r.status_code}")
t3 = r.json().get("data", {}).get("thread_id") if r.status_code == 200 else None
check("Mom3 thread auto-created", bool(t3))

# doula declines mom3's thread
r = requests.post(f"{BASE}/api/messages/threads/{t3}/decline", headers=rhd, json={"reason": "Not taking new clients"})
check("Provider decline thread -> 200", r.status_code == 200, f"got {r.status_code}: {r.text[:120]}")

# after decline, mom3 cannot message doula again in that thread
r = requests.post(f"{BASE}/api/messages", headers=rh3, json={"receiver_id": doula_id, "content": "can I still message?"})
check("After decline, mom3 message blocked -> 403", r.status_code == 403, f"got {r.status_code}")

# 12. Provider CANNOT accept a non-pre_acceptance thread (already accepted one)
r = requests.post(f"{BASE}/api/messages/threads/{thread_id}/accept", headers=rhd)
check("Re-accept already-accepted thread -> 400", r.status_code == 400, f"got {r.status_code}")

print("\n" + "="*60)
print("SUMMARY")
fails = [r for r in results if r[1] == "FAIL"]
passes = [r for r in results if r[1] == "PASS"]
print(f"PASS: {len(passes)}  FAIL: {len(fails)}")
for name, status, detail in fails:
    print(f"  FAIL: {name} — {detail}")
print("="*60)
sys.exit(0 if not fails else 1)
