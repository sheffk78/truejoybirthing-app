"""TJB invoice bug part 2: full docs + notification check for MOM account + share_request stats. Read-only."""
from pymongo import MongoClient

url = open("/Users/socializerender/.hermes/secrets/tjb-mongo-atlas-url.txt").read().strip()
db = MongoClient(url, serverSelectionTimeoutMS=15000)["truejoybirthing"]

MOM = "user_f81c8aa40dbe"
SEANTE = "user_61c15fde6a69"

print("=== full invoice doc ===")
inv = db.invoices.find_one({"invoice_id": "inv_bef18f573a3e"}, {"_id": 0})
for k, v in inv.items():
    print(f"  {k}: {v}")

print("\n=== full client doc ===")
cl = db.clients.find_one({"client_id": "client_fabe69e95f43"}, {"_id": 0})
for k, v in cl.items():
    print(f"  {k}: {v}")

print("\n=== ALL notifications to MOM account (any type) ===")
for n in db.notifications.find({"user_id": MOM}, {"_id": 0}).sort("created_at", -1).limit(20):
    print("  ", {k: n.get(k) for k in ("type", "title", "message", "created_at", "read")})

print("\n=== share_requests for MOM account (any status) ===")
srs = list(db.share_requests.find({"$or": [{"mom_user_id": MOM}, {"mom_id": MOM}, {"mom_email": "sheffk78@gmail.com"}]}, {"_id": 0}))
print(f"count: {len(srs)}")
for s in srs:
    print("  ", {k: s.get(k) for k in ("request_id", "provider_id", "status", "relationship_status", "mom_user_id", "mom_email", "created_at")})

print("\n=== share_requests for Seante (any) ===")
for s in db.share_requests.find({"provider_id": SEANTE}, {"_id": 0}):
    print("  ", {k: s.get(k) for k in ("request_id", "status", "relationship_status", "mom_user_id", "mom_email", "client_id", "created_at")})

print("\n=== DB-wide stats ===")
print("share_requests total:", db.share_requests.count_documents({}))
print("share_requests accepted:", db.share_requests.count_documents({"status": "accepted"}))
print("clients with linked_mom_id:", db.clients.count_documents({"linked_mom_id": {"$ne": None}}))
print("clients total:", db.clients.count_documents({}))
print("invoices total:", db.invoices.count_documents({}))
print("invoices Sent/Paid:", db.invoices.count_documents({"status": {"$in": ["Sent", "Paid"]}}))

print("\n=== how many Sent/Paid invoices are invisible to their mom? (audit) ===")
invs = list(db.invoices.find({"status": {"$in": ["Sent", "Paid"]}}, {"_id": 0}))
invisible = 0
for i in invs:
    cl = db.clients.find_one({"client_id": i.get("client_id")}, {"_id": 0, "linked_mom_id": 1})
    mom_id = cl.get("linked_mom_id") if cl else None
    if not mom_id:
        continue
    has_active = db.share_requests.find_one({
        "provider_id": i.get("provider_id"), "mom_user_id": mom_id,
        "status": "accepted", "relationship_status": {"$ne": "terminated"}
    }) is not None
    if not has_active:
        invisible += 1
        print(f"  INVISIBLE: {i.get('invoice_number')} {i.get('client_name')} ${i.get('amount')} status={i.get('status')} mom={mom_id}")
print(f"invisible Sent/Paid invoices: {invisible}")