# TJB Simulator E2E Test — Contract-to-Signature Flow

**Status: DESIGNED, AWAITING APP BUILD.** Phase 0–1 are executable today (preflight verified 9/28). Phases 2–4 auto-activate once the iOS app is built.

## What this proves when green

A midwife creates a contract in the app, duplicates it, the mom opens the signing link on the simulator, signs in DocuSeal, and the app + backend reflect the signed state — the full money path Jeff cares about, not unit-level mocks.

## Phases

| # | Phase | Runs today? | Proof |
|---|---|---|---|
| 0 | Preflight: backend on :8011 (GW_E2E=1), mongod on 27017, docuseal-tjb-test container, Xcode sim booted | ✅ YES — verified 9/28 | `run_e2e.sh preflight` exits 0 |
| 1 | Seed test users (midwife/doula/mom, password123) | ✅ YES — verified | `tests/seed_dup_contract_users.py` + `tests/fix_test_passwords.py` |
| 2 | Build + install app to sim (`xcrun simctl`) | ⛔ waits for app | skipped with BLOCKED notice until `ios/` exists |
| 3 | Drive UI via Maestro (`maestro/contract_flow.yaml`) | ⛔ waits for app | selectors marked TODO against built app |
| 4 | Post-run verification: submission completed in DocuSeal DB, PDF repainted with values, webhook event row exists | ✅ verifier code done | `verify_backend.py --post`, `verify_pdf_text.py` |

## Run

```bash
cd TrueJoyBirthing-Mobile/e2e-simulator
bash run_e2e.sh              # full run (blocks cleanly at Phase 2 until app exists)
bash run_e2e.sh preflight    # just Phase 0+1 — works today
```

Results land in `results/<timestamp>.md`. Exit codes: 0 = pass, 1 = preflight fail, 2 = app not built (expected until build), 3 = UI flow fail.

## Known constraints (carried from 9/28 session)

- DocuSeal test container webhook jobs fail on `secret.to_h` (encrypted-attr quirk). E2E asserts on submission status + PDF, not webhook delivery; webhook delivery is verified in production.
- Contract template PDF shows original `{{tag}}` text under painted values (cosmetic, hand-made template). Fix before real clients: regenerate template with blank field areas.
- Signing step (drawing signature in Safari) may be flaky in automation. If so, the flow pauses and the human completes the signature on the sim; the script auto-resumes verification — deterministic post-checks either way.

## Already proven at the backend layer (9/28)

- Contract render paints all 7 values (name, dates, fees, balance, description, sign date) — verified by decoding the PDF font map directly.
- Duplicate-contract regression 13/13 green; full suite 1,170 passed.
- Rate limiter has GW_E2E test-mode headroom; production behavior untouched.