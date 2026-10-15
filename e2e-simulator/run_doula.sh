#!/bin/bash
# TJB Doula Contract E2E runner — Phase-1 seed + Phase-3 Maestro drive + Phase-4 assert.
# Stack: local backend :8011 (GW_E2E=1), mongo 27017, booted iPhone 17, Metro serving main.
# Usage: bash run_doula.sh [seed|flow|all]
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE="all"; [ $# -gt 0 ] && STAGE="$1"

if [ "$STAGE" = "seed" ] || [ "$STAGE" = "all" ]; then
  echo "── Phase 1: seed doula client + resolvers ──"
  MONGO_URL="mongodb://localhost:27017" /opt/homebrew/bin/python3 "$HERE/seed_doula_client.py" || { echo "SEED FAILED"; exit 1; }
fi

if [ "$STAGE" = "flow" ] || [ "$STAGE" = "all" ]; then
  echo "── Phase 3:Maestro doula contract flow ──"
  cd "$HERE"
  BUNDLE_ID=com.truejoybirthing.app MAESTRO_DRIVER_STARTUP_TIMEOUT=300 \
    "$HOME/.local/bin/maestro" test -p ios --udid E4BB5011-1B00-438F-AAF9-D7A9C032CA74 maestro/doula_contract_flow.yaml
  rc=$?
  echo "MAESTRO_EXIT:$rc"
  # Phase 4 backend verify (deterministic, mirrors assert script)
  MONGO_URL="mongodb://localhost:27017" /opt/homebrew/bin/python3 - <<'PYEOF'
import os, pymongo, sys
c = pymongo.MongoClient("mongodb://localhost:27017")["truejoybirthing_test"]
drafts_before = None
r = c.contracts.find({"doula_id": {"$exists": True}, "status": "Signed"}).sort("updated_at", -1).limit(3)
for d in r:
    sig = (d.get("client_signature") or {}).get("signer_name", "")
    print(" Signed doula contract:", d["contract_id"][-8:], "| signer:", sig)
PYEOF
  exit $rc
fi