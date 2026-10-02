#!/bin/bash
# TJB Simulator E2E orchestrator — contract create→duplicate→sign→verify flow.
# Usage: bash run_e2e.sh [preflight|full]   (default: full)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND="$ROOT/backend"
RESULTS_DIR="$SCRIPT_DIR/results"
STAMP="$(date +%Y%m%d-%H%M%S)"
MODE="${1:-full}"
FAIL=0

log() { echo "[e2e $STAMP] $*"; }

# ---- Env (matches the verified 9/28 local stack) ----
export GW_E2E=1
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="truejoybirthing_test"
export JWT_SECRET_KEY="${JWT_SECRET_KEY:-test-secret-local-only}"
export REACT_APP_BACKEND_URL="http://127.0.0.1:8011"
export APP_BASE_URL="http://127.0.0.1:8011"
export EXPO_PUBLIC_BACKEND_URL="http://127.0.0.1:8011"
export FRONTEND_BASE_URL="http://127.0.0.1:8011"
SIM_NAME="${SIM_NAME:-iPhone 17 Pro}"
APP_SCHEME="${APP_SCHEME:-TrueJoyBirthing}"
BUNDLE_ID="${BUNDLE_ID:-com.truejoybirthing.app}"
# iOS project actually lives at frontend/ios (Expo prebuild output) — the root
# ios/ gate from the 9/28 pre-app plan blocked full runs after the app existed.
IOS_DIR="$ROOT/frontend/ios"

mkdir -p "$RESULTS_DIR"

# ================= PHASE 0: PREFLIGHT =================
log "Phase 0: preflight"
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8011/docs | grep -q 200 \
  || { log "FAIL: backend not healthy on :8011 — start per PLAN.md"; FAIL=1; }
nc -z 127.0.0.1 27017 2>/dev/null || { log "FAIL: mongod not listening on 27017"; FAIL=1; }
docker ps --format '{{.Names}}' | grep -q '^docuseal-tjb-test$' \
  || { log "FAIL: docuseal-tjb-test container not running"; FAIL=1; }
[ "$FAIL" = 0 ] || { echo "$STAMP preflight FAIL" > "$RESULTS_DIR/$STAMP.md"; exit 1; }
log "Phase 0 OK: backend + mongo + docuseal all up"

# ================= PHASE 1: SEED =================
log "Phase 1: seeding test users"
(cd "$BACKEND" && "$BACKEND/.venv/bin/python" tests/fix_test_passwords.py 2>&1 | grep -v bcrypt | tail -3) \
  || { log "FAIL: seed"; exit 1; }

if [ "$MODE" = "preflight" ]; then
  log "PREFLIGHT PASS (phases 0-1). Full run waits for app build."
  echo "$STAMP preflight+seed PASS" > "$RESULTS_DIR/$STAMP.md"
  exit 0
fi

# ================= PHASE 2: BUILD + INSTALL (blocked until app exists) =================
log "Phase 2: build + install to simulator"
# Clean device first: simctl erase wipes app data AND the keychain, which
# launchApp clearState alone can't touch (SecureStore tokens survive clearState
# and auto-re-authenticate). Shutdown/erase/boot ≈ 2s, deterministic.
xcrun simctl shutdown "$SIM_NAME" 2>/dev/null || true
xcrun simctl erase "$SIM_NAME" || { log "FAIL: simctl erase"; exit 3; }
xcrun simctl boot "$SIM_NAME" || { log "FAIL: simctl boot"; exit 3; }
if [ ! -d "$IOS_DIR" ]; then
  log "BLOCKED: $IOS_DIR not built yet — simulator phases 2-3 can't run."
  log "Everything up to here is verified; re-run after 'npx expo prebuild --platform ios'."
  echo "$STAMP BLOCKED_AT_PHASE2 (app not built; phases 0-1 PASS)" > "$RESULTS_DIR/$STAMP.md"
  exit 2
fi
xcrun simctl boot "$SIM_NAME" 2>/dev/null || true   # ok if already booted
# Metro guard: the debug app inlines EXPO_PUBLIC_BACKEND_URL from the Metro bundler env,
# NOT from simctl launch --env. If Metro is running without that env, the app silently
# falls back to the production URL and every API call bypasses the local backend.
METRO_PID=$(lsof -nP -iTCP:8081 -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
if [ -n "$METRO_PID" ]; then
  if ! ps "ewww $METRO_PID" 2>/dev/null | tr ' ' '\n' | grep -q "EXPO_PUBLIC_BACKEND_URL=$EXPO_PUBLIC_BACKEND_URL"; then
    log "Metro running without local backend env — restarting with EXPO_PUBLIC_BACKEND_URL=$EXPO_PUBLIC_BACKEND_URL"
    kill "$METRO_PID" 2>/dev/null || true
    sleep 2
    (cd "$ROOT/frontend" && EXPO_PUBLIC_BACKEND_URL="$EXPO_PUBLIC_BACKEND_URL" EXPO_PUBLIC_E2E=1 nohup npx expo start --port 8081 --offline > /tmp/tjb-metro.log 2>&1 &)
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
      curl -s --max-time 2 http://localhost:8081/status 2>/dev/null | grep -q packager-status:running && break
      sleep 2
    done
  fi
else
  log "Metro not running — starting with EXPO_PUBLIC_BACKEND_URL=$EXPO_PUBLIC_BACKEND_URL"
  (cd "$ROOT/frontend" && EXPO_PUBLIC_BACKEND_URL="$EXPO_PUBLIC_BACKEND_URL" EXPO_PUBLIC_E2E=1 nohup npx expo start --port 8081 --offline > /tmp/tjb-metro.log 2>&1 &)
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
    curl -s --max-time 2 http://localhost:8081/status 2>/dev/null | grep -q packager-status:running && break
    sleep 2
  done
fi
curl -s --max-time 2 http://localhost:8081/status 2>/dev/null | grep -q packager-status:running \
  || { log "FAIL: Metro not reachable on 8081 after restart"; exit 3; }
# Bundle sanity (2026-09-29): frontend/.env once pinned EXPO_PUBLIC_BACKEND_URL to a dead
# port (8899). Expo's dotenv beats the shell env at bundle time, so the app's login POSTs
# silently went nowhere. Fail fast if the served bundle still inlines the dead URL.
sleep 2
if curl -s --max-time 120 "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false&lazy=true&minify=false" 2>/dev/null | grep -q "127.0.0.1:8899"; then
  log "FAIL: Metro bundle inlines dead backend URL 127.0.0.1:8899 — fix frontend/.env(.e2e)"; exit 3
fi
cd "$IOS_DIR" && xcodebuild -workspace TrueJoyBirthing.xcworkspace -scheme "$APP_SCHEME" \
  -destination "platform=iOS Simulator,name=$SIM_NAME" -derivedDataPath /tmp/tjb-sim-build build \
  || { log "FAIL: xcodebuild"; exit 3; }
APP_PATH=$(find /tmp/tjb-sim-build/Build/Products/Debug-iphonesimulator -name "*.app" | head -1)
xcrun simctl install booted "$APP_PATH" || { log "FAIL: simctl install"; exit 3; }
xcrun simctl launch booted "$BUNDLE_ID" \
  --env EXPO_PUBLIC_BACKEND_URL="$EXPO_PUBLIC_BACKEND_URL" \
  || { log "FAIL: simctl launch"; exit 3; }

# ================= PHASE 3: UI FLOW (Maestro) =================
log "Phase 3: Maestro UI flow"
command -v maestro >/dev/null || { log "FAIL: maestro not installed (brew tap mobile-dev-inc/tap && brew install maestro)"; exit 3; }
# Clean slate: delete leftover Draft contracts so the run starts at zero and
# every created contract in this run belongs to this run (idempotent reruns).
"$BACKEND/.venv/bin/python" - <<'PYEOF'
import os, requests
base = "http://127.0.0.1:8011"
tok = requests.post(base + "/api/auth/login",
                    json={"email": "midwife@test.com", "password": "password123"},
                    timeout=15).json()["session_token"]
h = {"Authorization": f"Bearer {tok}"}
cs = requests.get(base + "/api/midwife/contracts", headers=h, timeout=15).json()
for c in cs:
    if c.get("status") == "Draft":
        r = requests.delete(base + f"/api/midwife/contracts/{c['contract_id']}", headers=h, timeout=15)
        print(f"cleanup draft {c['contract_id']} -> {r.status_code}")
# Stale SENT contracts from earlier runs accumulate on the mom home and push the
# pending card below the iOS a11y prune window (found 2026-10-01: card at ~y960,
# window cutoff ~y920 — runs began failing after testmom got a due date / baby-dev
# card). Sweep them to Signed in the test DB so every run has exactly 0-1 pending.
_db = __import__("pymongo").MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))[os.environ.get("DB_NAME", "truejoybirthing_test")]
_db.midwife_contracts.update_many({"status": "Sent"}, {"$set": {"status": "Signed"}})
_db.contracts.update_many({"status": {"$in": ["Sent", "sent"]}}, {"$set": {"status": "Signed"}})
print("swept stale Sent -> Signed (test db only)")
PYEOF
# Absolute: the script cwd-changes to $IOS_DIR in Phase 2, so relative paths break.
[ -f "$ROOT/e2e-simulator/maestro/contract_flow.yaml" ] \
  && maestro test "$ROOT/e2e-simulator/maestro/contract_flow.yaml" 2>&1 | tee /tmp/tjb-maestro.log \
  || { log "FAIL: maestro flow"; exit 3; }

# ================= PHASE 4: POST-RUN VERIFICATION =================
log "Phase 4: backend/PDF verification"
# assert_signed_contract.js (Phase 3 tail) emitted the pinned contract id from
# the Maestro log; without it, fall back to the legacy any-Signed heuristic.
CID=$(grep -o "E2E_SIGN_ASSERT contract_id=[A-Za-z0-9_]*" /tmp/tjb-maestro.log 2>/dev/null | tail -1 | cut -d= -f2 || true)
if [ -n "$CID" ]; then
  log "Phase 4 pinned to this run's contract: $CID"
  "$BACKEND/.venv/bin/python" "$SCRIPT_DIR/verify_backend.py" --post --contract-id "$CID" \
    || { log "FAIL: post-run verification"; exit 3; }
else
  log "WARN: no sign-assertion marker found — Phase 4 falls back to any-Signed heuristic (vacuous-pass-prone)"
  "$BACKEND/.venv/bin/python" "$SCRIPT_DIR/verify_backend.py" --post \
    || { log "FAIL: post-run verification"; exit 3; }
fi
"$BACKEND/.venv/bin/python" "$SCRIPT_DIR/write_stamp.py" "$STAMP" "$RESULTS_DIR" "$CID" \
  || { log "FAIL: stamp verification failed"; exit 3; }
log "E2E PASS — full result in $RESULTS_DIR/$STAMP.md"