# QA-KICKOFF — Informed-Choice Feature Test Plan (addendum to 2026-09-23 QA)

**Date prepared:** 2026-09-25 (Jeff: "once it's done, I want a plan for testing")
**Code state:** commit `71a351c7` on `main` — Phase 4 UI in. Phases 1–3 verified (backend E2E 25/25).
**Mission:** prove the informed-choice feature looks right and operates correctly —
backend flows, app click-through, visual review packet — before the single deploy.

---

## Part A — Backend API regression (repeat the 25/25 harness)

Rerun the consolidated verification harness (ad-hoc script pattern from 0d987daa review)
against a fresh local uvicorn (port 8899, `DB_NAME=tjb_test`):

1. Register MIDWIFE → GET `/api/informed-choice/TX` (200, 8 items)
2. Language gate: create with banned phrase → **422**
3. Clean create → sign mom + midwife → retention 2036 → re-sign 400
4. Client list, raw `%PDF-` bytes, MOM 403, unauth 401
5. Birth-plan: `newborn_procedures` section present; PUT section → decisions persist
6. State resources: validator `--links` 51/51

**Pass = 25/25 + validator green.**

## Part B — App click-through (Expo Go on Simulator, per QA-KICKOFF env)

Boot iPhone 17 Pro sim (`C35AC525-2D91-4295-BD48-3D7B20AC2966`), `npx expo start`, press `i`.

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Section appears | Birth plan → list | "Newborn Procedures" card present (10 sections), progress counts it |
| 2 | Cards render | Open section | 8 decision cards, intro copy, no state banner error if profile has no state |
| 3 | Choose/decline | Mark two procedures | Buttons highlight (sage accept / rose decline), status turns In progress |
| 4 | Vitamin K 3-way | Opt in to vitamin K | "Oral doses" / "One shot" chips appear; pick one |
| 5 | Decline → state form | Decline metabolic screening (CA/TX mom) | State's official .gov form opens in browser (Linking) |
| 6 | Decline → doc (no state form) | Decline eye ointment (state w/o form) | "Prepare my informed-choice document →" → doc created message, doc_id saved |
| 7 | Persistence | Complete section → close → reopen | Choices still marked; GET reflects saved decisions |
| 8 | State auto-fill | Profile state = CA | Banner names California; CA form deep-links; never asks state again |
| 9 | Unknown state fallback | Profile state blank | Generic cards + friendly banner (no dead end, no crash) |
| 10 | Unconfigured state | Profile state = ZZ | Generic cards, no crash (backend returns nulls) |
| 11 | Midwife visibility | Hospital-only mom (no midwife relationship) | Section NOT rendered (after visibility gate lands) |
| 12 | Provider view | Midwife opens client's birth plan | "Newborn Procedures" title renders; decisions visible |
| 13 | Dark mode | Repeat 2/5/6 in dark | Card contrast correct, no light hex leak |

**Screenshots:** `qa-screenshots/2026-09-25-informed-choice/<NN>-<screen>-<theme>.png`
**Findings file:** `qa-screenshots/2026-09-25-informed-choice/FINDINGS.md` (pass/fail per scenario, bug list with shot refs)

## Part B — Backend data integration (pre-app smoke, headless)

Expo web or `requests`-based driving of the real flows (already scripted in Part A)
plus a **Mongo integrity check**: after the app E2E, confirm `informed_choices`
collection has: decisions snapshot, dual signatures, `retention_until` = created+10y.

## Part C — Visual review packet (Jeff/Chante, before ship)

Per visual-review preference: assemble **PDF packet** —
screens of: birth-plan list w/ new section (light+dark), decision card (light),
vitamin K chips, decline-with-state-form state, decline-with-doc state,
provider view title, dark-mode card. Deliver in Discord for visual sign-off
**before** the Phase 7 deploy.

## Part D — Testing plan for remaining phases (run when each lands)

- **Phase 5 (web hub):** generator renders 51/51 pages from data; link check (every page's .gov links 200); humanize scan ≤ MEDIUM; app deep-links resolve to live pages.
- **Phase 6 (midwife view/export):** midwife surface E2E — doc list w/ retention dates, bulk PDF opens.
- **Phase 7 (pre-deploy):** `deploy-preflight.sh` gate → `rwy` GraphQL deploy → `deployments(last:1) == SUCCESS` → live health check + prod informed-choice smoke (register → preview 200 → create → sign → PDF) → THEN the biannual link-check cron (Cron Alternative Gate applies).
- **Prod probe (post-deploy):** staging mom account in a configured state walks Part B table on prod URL; read-only on real data.

## Rules of engagement (inherited)

- Prod backend read/click freely; no destructive writes, no real payments.
- Visual mismatches → file with screenshot; no design-file edits without Jeff.
- Computer-use lock mutex; `simctl io` screenshots for crisp device shots.