#!/usr/bin/env python3
"""Write the full-run E2E stamp file (run_e2e.sh Phase 4 tail).

Usage: write_stamp.py <stamp> <results_dir> [contract_id]
The contract_id (this run's contract, emitted by assert_signed_contract.js and
carried through run_e2e.sh) is pinned in this order: (1) explicit arg,
(2) E2E_CONTRACT_ID env var, (3) legacy newest-Signed heuristic. With a pin,
a missing/unpinned/unSigned contract FAILS the stamp instead of reporting PASS.
"""
import json, os, sys, urllib.request as u

args = sys.argv[1:]
stamp, results_dir = args[0], args[1]
contract_id = args[2] if len(args) > 2 else os.environ.get("E2E_CONTRACT_ID", "")
try:
    req = u.Request("http://127.0.0.1:8011/api/auth/login", method="POST",
                    data=json.dumps({"email": "midwife@test.com", "password": "password123"}).encode(),
                    headers={"Content-Type": "application/json"})
    tok = json.loads(u.urlopen(req, timeout=20).read().decode())["session_token"]
    cs = json.loads(u.urlopen(u.Request("http://127.0.0.1:8011/api/midwife/contracts",
                headers={"Authorization": "Bearer " + tok}), timeout=20).read().decode())
    if isinstance(cs, dict):
        cs = cs.get("contracts", [])
    if contract_id:
        latest = next((c for c in cs if c.get("contract_id") == contract_id), None)
        if latest is None:
            raise RuntimeError(f"this run's contract {contract_id} not found")
        if latest.get("status") != "Signed":
            raise RuntimeError(f"contract {contract_id} status={latest.get('status')} — API sign did not succeed")
    else:
        signed = [c for c in cs if c.get("status") == "Signed"]
        latest = max(signed, key=lambda c: c.get("updated_at") or "") if signed else None
        if latest is None:
            raise RuntimeError("no Signed midwife contract found after run")
    cid = latest["contract_id"]
    signer = (latest.get("client_signature") or {}).get("signer_name", "")
    line = f"{stamp} E2E PASS - contract={cid} signer={signer}"
except Exception as e:
    # Enrichment problems must FAIL the run — a stamp that says PASS without a
    # verified sign is exactly the vacuous-pass this harness was fixed for.
    line = f"{stamp} E2E FAIL (result-file verification failed: {e})"
open(f"{results_dir}/{stamp}.md", "w").write(line + chr(10))
print(line)
sys.exit(1 if "E2E FAIL" in line else 0)