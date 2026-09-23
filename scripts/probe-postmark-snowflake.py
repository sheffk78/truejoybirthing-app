"""Decode Discord snowflake timestamps + check Postmark sends to Shelbi's MOM email today."""
from datetime import datetime, timezone

for label, sf in [("kenneth_msg", 1548042554577256509)]:
    ts_ms = (sf >> 22) + 1420070400000
    print(f"{label}: {datetime.fromtimestamp(ts_ms/1000, tz=timezone.utc)} UTC")

import os, json, urllib.request
tok = open(os.path.expanduser("~/.hermes/secrets/postmark-account-token.txt")).read().strip()
# TJB server: find it
req = urllib.request.Request("https://api.postmarkapp.com/messages/outbound?count=20&offset=0&todate=today",
                             headers={"X-Postmark-Server-Token": tok, "Accept": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    print("account-level token worked; total:", data.get("TotalCount"))
    for m in data.get("Messages", [])[:15]:
        to = (m.get("To") or "")
        if "sheffk78" in to or "shelbil" in to or "shelbilkohler" in to:
            print("  TO:", to, "| subj:", m.get("Subject"), "| at:", m.get("SentAt"))
except Exception as e:
    print("account token failed:", e)
    # try TJB server token if separate
    import glob
    for p in glob.glob(os.path.expanduser("~/.hermes/secrets/*tjb*")) + glob.glob(os.path.expanduser("~/.hermes/secrets/*postmark*")):
        print("  candidate secret file:", p)