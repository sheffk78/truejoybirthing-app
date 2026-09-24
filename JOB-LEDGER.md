
## 2026-09-23 — Birth-plan printable PDF SHIPPED to production (Jeff-approved design)
- Commits: 6ffddf0a (generator + adapter + prod-shape fix), 3a82b20b (schema asset — was untracked, prod rendered raw keys), eb802f76 (native share-sheet download in preview screen)
- Railway: TrueJoyBirthing/truejoybirthing-app deploys 67ac4404 + 8a1878d2 both SUCCESS (auto-deploy on push)
- Live-verified: POST login (test mom) → GET /api/birth-plan/export/pdf → 200, human labels, checkbox rows, printer-safe (top strip pure white, light lavender wash)
- Generator: backend/routes/pdf_branding.py — schema-driven labels/options from backend/assets/birth_plan_form_schema.json (MUST be committed — generator degrades gracefully to raw keys without it)
- Design law: all-sans (Quicksand/SourceSans), no illustrations, full-width light-lavender wash bands w/ dark text, hairline top rule + letterspaced brand line, cover meta pulls from actual answers


## 2026-09-24 — State Resources API (CA-1, Chante feedback plan)
- Data: `backend/data/state_resources/ca.json` (8 procedures, all 16 URLs verified HTTP-200, incl. CDPH 4410 declination, SIS 2.0, billing portal; NBS-TRF/CDPH 4409 is order-only, refusal signed on TRF per 17 CCR §6501.2)
- API: `backend/routes/state_resources.py` — GET /api/state-resources (list), /{state}, /{state}/procedure/{key}; auth via check_role all roles; 404 friendly `not_configured` for missing states
- Wired: server.py import + include_router (first in chain)
- Tests: live uvicorn E2E pass — register→CA 200 (8 procedures, verified date), vitamin_k 3-way, hearing law field, ZZ 404 friendly, unauthed 401
- Status: API shipped in repo; not deployed (awaiting Railway gate next session)

## 2026-09-24 — State data 47/47 (Phase 2 complete)
- 5 parallel agents + parent verification: 47 state/district JSON files (all 50 states except none missing — CA+46; awaiting none; AK/HI/AR/MS/DC etc. all in), 247 URLs live-verified 200
- Parent re-verification: validator 47/47 schema+links; cross-check: all files have 8 procedures; fixed double-encoded UTF-8 in 45 files (71fc4f90)
- Remaining: Phase 3+ per plans/2026-09-24-state-newborn-procedures-EXECUTION.md (master form, cards, web hub, retention, cron, payment plans)

## 2026-09-24 — State data 51/51 COMPLETE (Phase 2 done)
- Catch-up agent delivered AK/AR/HI/MS (454ea505); parent fixed mojibake in all 4 (hi/ms had triple-encoded remnants) — 9849adf7
- Final verification: 51/51 files schema+live-links pass (exit 0); full-51 mojibake sweep CLEAN; coverage check: no missing states incl. DC
- Pushed to origin (9849adf7) after rebase over dark-mode seam fixes
- Next: Phase 3 — master informed-choice form + birth-plan decision cards (per EXECUTION.md)
