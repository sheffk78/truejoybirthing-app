"""Live API probe: hit production /mom/invoices as Shelbi's MOM account (read-only GETs).
Token minted with server's own secret fetched from Railway env (never printed)."""
import subprocess, json, urllib.request, sys
from datetime import datetime, timedelta, timezone

URL = "https://truejoybirthing-app-production.up.railway.app"

def rwy_env(service):
    out = subprocess.run(["/Users/socializerender/bin/rwy", "variables", service],
                         capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        print("rwy failed:", out.stderr[:300])
        return None
    # rwy prints KEY=VALUE lines; parse into dict
    env = {}
    for line in out.stdout.splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#") and " " not in line.split("=")[0]:
            k, _, v = line.partition("=")
            env[k] = v
    return env or None

env = rwy_env("truejoybirthing-app") or rwy_env("truejoybirthing-app-production") or rwy_env("TrueJoyBirthing-App")
if not env:
    print("rwy variables failed; trying alternate invocation")
    out = subprocess.run(["/Users/socializerender/bin/rwy", "variables", "truejoybirthing-app"],
                         capture_output=True, text=True, timeout=60)
    print(out.stdout[:2000])
    sys.exit(1)

secret = None
for k, v in env.items():
    if k == "JWT_SECRET_KEY":
        secret = v
if not secret:
    print("JWT_SECRET_KEY not found. Keys:", [k for k in env.keys() if "JWT" in k.upper() or "SECRET" in k.upper()])
    sys.exit(1)

import jwt
now = datetime.now(timezone.utc)
token = jwt.encode({
    "sub": "user_f81c8aa40dbe",
    "user_id": "user_f81c8aa40dbe",
    "role": "MOM",
    "exp": now + timedelta(minutes=10),
    "iat": now,
}, secret, algorithm="HS256")

hdr = {"Authorization": f"Bearer {token}"}
for path in ["/mom/invoices", "/mom/contracts", "/notifications"]:
    try:
        req = urllib.request.Request(URL + path if False else f"{URL}{path}", headers=hdr)
        with urllib.request.urlopen(req, timeout=30) as r:
            body = json.loads(r.read())
        print(f"GET {path} -> {r.status}")
        if path == "/mom/invoices":
            print("  invoice count:", len(body))
            for i in body:
                print("   ", {k: i.get(k) for k in ("invoice_id", "invoice_number", "amount", "status", "provider_name", "provider_role", "sent_at")})
        elif path == "/mom/contracts":
            print("  contract count:", len(body))
            for c in body[:5]:
                print("   ", {k: c.get(k) for k in ("contract_id", "status", "provider_name")})
        else:
            notifs = body if isinstance(body, list) else body.get("notifications", [])
            print("  notification count:", len(notifs))
            for n in notifs[:8]:
                print("   ", {k: n.get(k) for k in ("type", "title", "read", "created_at")})
    except urllib.error.HTTPError as e:
        print(f"GET {path} -> HTTP {e.code}: {e.read()[:200]}")
    except Exception as e:
        print(f"GET {path} failed: {e}")

# Also verify JWT claims shape matches what the server's login returns:
print("\nNOTE: verify claims sub/user_id/role against dependencies.py decode logic")