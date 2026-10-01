#!/usr/bin/env python3
"""Write the full-run E2E stamp file (run_e2e.sh Phase 4 tail)."""
import json, urllib.request as u

stamp, results_dir = __import__("sys").argv[1], __import__("sys").argv[2]
try:
    req = u.Request("http://127.0.0.1:8011/api/auth/login", method="POST",
                    data=json.dumps({"email": "midwife@test.com", "password": "password123"}).encode(),
                    headers={"Content-Type": "application/json"})
    tok = json.loads(u.urlopen(req, timeout=20).read().decode())["session_token"]
    cs = json.loads(u.urlopen(u.Request("http://127.0.0.1:8011/api/midwife/contracts",
                headers={"Authorization": "Bearer " + tok}), timeout=20).read().decode())
    if isinstance(cs, dict):
        cs = cs.get("contracts", [])
    signed = [c for c in cs if c.get("status") == "Signed"]
    latest = max(signed, key=lambda c: c.get("updated_at") or "") if signed else None
    cid = latest["contract_id"] if latest else "n/a"
    signer = (latest.get("client_signature") or {}).get("signer_name", "") if latest else ""
    line = f"{stamp} E2E PASS - contract={cid} signer={signer}"
except Exception as e:
    line = f"{stamp} E2E PASS (result-file enrichment failed: {e})"
open(f"{results_dir}/{stamp}.md", "w").write(line + chr(10))
print(line)
