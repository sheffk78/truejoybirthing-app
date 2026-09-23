"""TJB invoice bug investigation: trace Seante -> Shelbi invoice chain in prod DB.
Read-only. Prints chain stages. No writes."""
import sys
from pymongo import MongoClient

url = open("/Users/socializerender/.hermes/secrets/tjb-mongo-atlas-url.txt").read().strip()
client = MongoClient(url, serverSelectionTimeoutMS=15000)
db = client["truejoybirthing"]

def find_user(term):
    """Find user by fuzzy name match."""
    for u in db.users.find({}, {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "role": 1}):
        n = (u.get("full_name") or "").lower()
        e = (u.get("email") or "").lower()
        if term in n or term in e:
            return u
    return None

print("=== STEP 1: find users ===")
shelbi = find_user("shelbi")
seante = find_user("seante")
print("Shelbi:", shelbi)
print("Seante:", seante)

if not shelbi or not seante:
    print("!! could not find one of the users; dumping close matches")
    for u in db.users.find({}, {"_id": 0, "user_id": 1, "full_name": 1, "role": 1}):
        n = (u.get("full_name") or "").lower()
        if "shel" in n or "sean" in n or "shant" in n:
            print("  candidate:", u)
    sys.exit(0)

sid, mid = seante["user_id"], shelbi["user_id"]
print(f"\nSeante id={sid}  Shelbi id={mid}")

print("\n=== STEP 2: client record Seante->Shelbi ===")
clients = list(db.clients.find({"provider_id": sid}, {"_id": 0}))
print(f"clients for provider {sid}: {len(clients)}")
for c in clients:
    print("  ", {k: c.get(k) for k in ("client_id", "name", "email", "linked_mom_id", "provider_type", "status", "created_at")})

print("\n=== STEP 3: share_requests between them ===")
srs = list(db.share_requests.find({"$or": [{"provider_id": sid, "mom_user_id": mid}, {"provider_id": sid, "mom_id": mid}]}, {"_id": 0}))
print(f"share_requests: {len(srs)}")
for s in srs:
    print("  ", {k: s.get(k) for k in ("request_id", "status", "relationship_status", "provider_id", "mom_user_id", "created_at")})
# also any share request by mom email
print("  share_requests to Shelbi (any provider):", db.share_requests.count_documents({"$or": [{"mom_user_id": mid}, {"mom_email": shelbi.get("email")}]}))

print("\n=== STEP 4: invoices from Seante ===")
invs = list(db.invoices.find({"provider_id": sid}, {"_id": 0}))
print(f"invoices from Seante: {len(invs)}")
for i in invs:
    print("  ", {k: i.get(k) for k in ("invoice_id", "invoice_number", "client_id", "client_name", "amount", "status", "sent_at", "created_at")})

print("\n=== STEP 5: notifications to Shelbi (invoice types) ===")
notifs = list(db.notifications.find({"user_id": mid, "type": {"$in": ["invoice_received", "invoice_reminder", "invoice_paid"]}}, {"_id": 0}))
print(f"invoice notifications to Shelbi: {len(notifs)}")
for n in notifs:
    print("  ", {k: n.get(k) for k in ("type", "title", "message", "created_at", "data")})

print("\n=== STEP 6: any other Shelbi-like MOM accounts (dedupe check) ===")
for u in db.users.find({"role": "MOM"}, {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "created_at": 1}):
    e = (u.get("email") or "").lower()
    n = (u.get("full_name") or "").lower()
    if "shelbi" in e or "shelbi" in n:
        print("  MOM acct:", u)