# Doula / Midwife Simulator Test Gaps — audit 2026-10-13

**Question:** from the last simulator test session (10/12 wave-A + contract E2E), what's still untested on the doula / midwife side?

**Short answer:** the midwife money path (contract → send → mom signs) is well covered and re-passed 10/12. The **doula side is a smoke test only** — and 8 design-law / feed-card commits since 10/06 touched all 17 shared provider components without any doula-screen verification.

## What's already covered (don't redo)
- MIDWIFE: full contract lifecycle E2E (login → Dashboard → See Clients → client → create 7-section contract → send → deep-link sign → backend verify) — PASS 10/12 (`results/20261012-092056.md`).
- Doula dashboard presence: login → "Hello, Sarah" → Lead Insights card (`mini-doula.yaml`), 10/05.
- Doula Notes search-first client picker (`verify-10-05-picker-insights.yaml`, 10/05).
- Midwife profile credential chip editor (`verify-10-05-credentials.yaml`).
- Mom-side suites (48/48 momside, wave-2 tabs+kick, timeline add-event, feed card) — 10/05→10/13.

## Gap list, priority order

**P1 — Doula money path never run.** The identical contract→signature flow has never been driven for a DOULA account (demo.doula@truejoybirthing.com is seeded; needs a seeded doula client→mom pair like the midwife's). Same shared components (ProviderContracts + DOULA_CONFIG), different config/colors/routes — the 10/12 midwife PASS does not cover the doula config leg, and DOULA_CONFIG routes (`/(doula)/contracts`) were never exercised.

**P2 — Invoices + payment-plan UI (both roles).** The 9/28 payment-plan review fixes (concurrent mark-paid atomicity, plan-overwrite 409, installment rounding) were verified at API level only. No UI e2e ever: create plan → installment rows → mark paid → Paid state. ProviderInvoices has just 2 testIDs — add before automating.

**P3 — Leads pipeline UI (doula-first; it's the doula's acquisition loop).**
- Zero yaml refs to `/(doula)/leads`; Lead Insights was only asserted in its empty state.
- Lead → client conversion via Messages accept/decline (`accept-client-btn` / `decline-client-btn` testIDs exist, never tapped).
- New-leads tab badge + clear-on-press never asserted.
- ProviderLeads has ZERO testIDs — needs them added before it's automatable.

**P4 — Screens with zero UI coverage for either role:** Appointments (doula quick action; 4 testIDs exist), midwife-only Visits and Birth Summaries, Contract-Templates editor, Messages compose (`new-message-btn`), Profile (doula), Subscription page (the provider paywall — new doula revenue gate).

**P5 — Client birth-plan viewing (doula + midwife).** Mom shares a plan → provider opens view-birth-plan; only a backend probe exists (`probe_share_500.py`). Thin re-export wrapper `/(doula)/client-birth-plans` never driven.

**P6 — Doula onboarding + tutorial.** DOULA_TUTORIAL_STEPS + doula-onboarding.tsx (touched 10/09 design-law P4) never driven; new-user first-run path unverified.

**P7 — Design-law visual re-sweep on doula screens.** Last doula screenshots 10/05; since then r1–r3 typography/color/Card/Button laws + 4pt spacing snapped ProviderDashboard/Leads/Invoices/FeedCard etc. Re-run mini-doula with screenshots, light + dark — esp. the "Latest in Birth Work" feed card in doula lavender after the 10/08–10/10 card changes (those were verified on midwife + mom, doula not mentioned).

**P8 — Carry-over contract gaps from PLAN.md:** duplicate-contract guard leg, PDF download leg (`download-pdf-btn`), and the sign screen still showing "On-Call Period: - weeks" / empty Birth Location (create-contract form doesn't collect them).

## Harness notes (from audit)
- Seed script (`backend/tests/fix_test_passwords.py`) already covers demo.doula/testdoula123/marketplace_doula — P1 needs a doula client + mom pair added (mirror `fetch_e2e_client.js`).
- Maestro lessons that apply: scrollUntilVisible not bare swipes, tab labels are composite AX nodes (point-tap), testID+data-testid both required (10/12 wave-A lesson), clearKeychain between account switches.
- run_e2e.sh Phase 0.5 design-drift gate will catch pure style drift; the functional gaps above need flow files, not gates.