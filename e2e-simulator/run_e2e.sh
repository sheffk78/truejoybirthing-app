#!/bin/bash
# TJB Simulator E2E orchestrator — contract create→duplicate→sign→verify flow.
# Usage: bash run_e2e.sh [preflight|full]   (default: full)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
RESULTS_DIR="$(dirname "$0")/results"
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
SIM_NAME="${SIM_NAME:-iPhone 15}"
APP_SCHEME="${APP_SCHEME:-truejoybirthing}"   # TODO: confirm from app.json once app exists
BUNDLE_ID="${BUNDLE_ID:-}"                    # TODO: set once app exists

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
if [ ! -d "$ROOT/ios" ]; then
  log "BLOCKED: ios/ project not built yet — simulator phases 2-3 can't run."
  log "Everything up to here is verified; re-run after 'npx expo prebuild --platform ios'."
  echo "$STAMP BLOCKED_AT_PHASE2 (app not built; phases 0-1 PASS)" > "$RESULTS_DIR/$STAMP.md"
  exit 2
fi
xcrun simctl boot "$SIM_NAME" 2>/dev/null || true   # ok if already booted
cd "$ROOT/ios" && xcodebuild -workspace *.xcworkspace -scheme "$(basename *.xcworkspace .xcworkspace)" \
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
maestro test "$(dirname "$0")/maestro/contract_flow.yaml" || { log "FAIL: maestro flow"; exit 3; }

# ================= PHASE 4: POST-RUN VERIFICATION =================
log "Phase 4: backend/PDF verification"
"$BACKEND/.venv/bin/python" "$(dirname "$0")/verify_backend.py" --post \
  || { log "FAIL: post-run verification"; exit 3; }
log "E2E PASS — full result in $RESULTS_DIR/$STAMP.md"