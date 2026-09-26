# Informed-Choice QA Findings — 2026-09-25/26 (Chante-feedback deep-check)

## Backend regression (durable harness `scripts/verify_informed_choice.py`)
**11/11 PASS** (2026-09-26, local uvicorn :8899 DB tjb_test).
Found & fixed during this pass:
1. **Duplicate-signer hole** — sign endpoint allowed the same party to sign twice
   (silently overwrote). FIXED: second signature by same signer → 400
   (backend/routes/informed_choice.py). Audit-trail correctness.
2. Validator false-negatives: uv cpython 3.12 has no system CA bundle → CDPH/CA
   and DE failed SSL verification. FIXED: certifi context + curl (system store)
   fallback for macOS-only roots (Comodo "AAA Certificate Services").
3. Harness itself was ad-hoc → now durable + deterministic (seeded accounts,
   scripts/seed_informed_choice_users.py), re-runnable: `python3 scripts/verify_informed_choice.py`.

## App E2E (13 scenarios, Part B)
- B4 informed-choice cards: GREEN (choose/decline, save, persistence, pre-select).
- Negative (hospital-only mom): GREEN — section hidden, fail-closed.
- Empty-save guard: GREEN (guard committed 5e86a3e4).
- Provider view (scenario 12): FIXED — decisions render as readable
  "Metabolic screening: CHOSEN/DECLINED" rows, not raw dict (791c8afa).

## State resources link check (51 files, validator --links)
- **51/51 schema valid. Live links: 50/51 fully green.**
- ca.json: 18/18 OK after certifi fix (validator bug, not data).
- nm.json: program_url moved by NM (old path → 500); updated to new official
  path /about/phd/fhb/cms/nbgs. NOTE 2026-09-25: NM's CMS returns 500 on ALL
  dynamic routes right now (their outage — homepage still 200). Both NM links
  remain the correct official destinations; expect green once NM recovers.
- de.json: 12/12 OK after certifi fix.

## Remaining from Chante feedback (tracked, NOT forgotten)
- Phase 5 web hub (51 state pages + explainer post) — not started.
- Phase 6 midwife doc view/export surface — not started.
- Phase 7 biannual link-check cron (script-only, Jan 15 2027 first run) — not started.
- Phase 8 payment plans (invoice + payment plan, second Chante ask) — not started.
