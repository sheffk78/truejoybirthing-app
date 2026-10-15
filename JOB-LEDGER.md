
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

## 2026-09-24 — Phases 3+4 backend SHIPPED (informed-choice master + birth-plan section)
- informed_choice_template.py: 8-item master doc, ONE signature block, vitamin K 3-way, state-note from state data; hard language gate (banned 'against medical advice').
- routes/informed_choice.py: preview (GET /{state}), create, mom+midwife dual sign, retention_until = final sign +10y (2036 verified live), re-sign guard 400, per-client list, PDF 200 raw bytes.
- E2E live-server: lang gate 422, create 200, retention 2036-09-21, re-sign 400, list 4 docs, PDF %PDF 15KB; MOM create 403; unauth 401.
- newborn_procedures section added to ALL FOUR BIRTH_PLAN_SECTIONS lists (mom.py, admin.py, server.py, care_plans.py — the last one serves GET /birth-plan; E2E-verified section present + decisions persist via PUT).
- State data: final mojibake sweep — 51/51 validator green (schema + live links).
- Commits: 0d987daa (+ 454ea505, 9849adf7). Pushed.
- Remaining: Phase 4 app UI cards, Phase 5 web hub, Phase 6 midwife doc view/export, Phase 7 cron, Phase 8 payment plans, deploy at end.

## JOB-2026-10-07-r3 · design-refresh r3 (#9 typography sweep) · completed
- What: TJB mobile corpus typography r3 — legacy FONTS.* → corpus F.* across app/+components (0 legacy refs), off-law sizes → law steps, mom invoices s15 law amounts (serif rose), doula tier ratifies own mockup law (d1 stats 22 lavender serif, d2 rows 11.5/600, d7/d9 rows serif 15/14). Council rows 5+8 CLOSED.
- Scorecard (build-standard layers): L1 correctness = tsc 0 + tabs 50/50 + bench 38/38 ✅; L2 mockup-construction = every value cited to approved mock CSS (d1/d2/d7/d9/s13/s15) ✅; L3 continuous audit = APP-DRIFT §9 ledger + full-sweep gate script ✅; L4 model council = doula-tier ratification resolved per-mockup, icon gap escalated not invented ✅; L5 failure-library: new env-failure lesson — mom_profiles.due_date vs users.due_date (weekly-content reads PROFILE) — appended below.
- Failure-library add: TJB e2e stage = BOTH db.users.due_date AND db.mom_profiles.due_date (weekly-content + timeline both read mom_profiles); r1 "events baseline 7" note was stale (real baseline 4 TEST_* rows).
- Commit 2f8d01ab pushed origin/main. Icon-drawing gap (doula tab .ticon) = Jeff-only, left as-is.

## JOB-2026-10-13 sim-review · mobile on-device latest-build verification · completed
- Rebuilt native Debug from main@b6929eea (stale sim build 140 replaced), iPhone 17/iOS 26.5, drift PASS (0 new/154), tsc 0, jest 21/21.
- 17-screen mom+pro walkthrough (Maestro 2.10, cap-*.png). Design system verified executing: week spine, S11 timer law, serif/cream/lavender/rose, pro dashboard.
- Found+fixed: timeline raw-ISO due date → formatDate() (43c2cc74). APP-DRIFT 10/13 record (ee27207d).
- Local-backend review stack: mongo 27017 + uvicorn 8011 + Metro dotenv swap (9/29 lesson re-confirmed live — .env beats shell env; harness convention applied and restored).
- Artifacts: reports/mobile-sim-review-2026-10-13.md; Deliverables/TJB-mobile-sim-review-2026-10-13.pdf (17pp); sim handed off welcome-screen/production-backend.
- Open for Jeff: P5 glyph eyeball (37 shim sites), P6 sprig go/no-go, roadmap Labor Mode + Partner View, prebuild shell regen (140→156).

## JOB-2026-10-15-publish · App publish run — Apple resubmission track · running
- Jeff `go` 10/15 on the 1–5 chain. Rulings on the gate items: (6) prebuild shell regen GO · (7) Fourth Trimester link GO · (8) deck leftovers GO · (9) scope gate = Labor Mode/Partner View/glyph-eyeball/motif-weave all stay OUT · (10) same small tester crew (answer pending — defaulting to internal crew).
- Delegated: six UI changes (5 deck leftovers + 4T link) → deleg_e96acd37 / sa-0-50b990e8 running; gates tsc/jest/drift; pushes origin/main.
- FINDING: EAS prod iOS build 156 (finished 10/12, ipa on expo.dev) is from source commit 7c128137 (9/23) — PRE-design-refresh. Superseded; fresh production build required after the code batch lands. Old 1.0.13/118 reviewer pipeline materials also stale.
- ASC access: no API key exists anywhere (no .p8, no vault item, none in browser vault); eas.json submit profile = appleId jeff@socialize.video, ascAppId 6760793180, team A3DU82XQTJ; EAS CLI session live (@sheffkventures). EAS submit path is headless-capable; ASC portal state-read needs Jeff's 2FA login — requested in Discord.
- Hygiene restored: frontend/.env was left on local 8011 by 10/14 QA → restored to production pin (backup /tmp/tjb-env-backup.txt was correct).
- Release tooling present: scripts/release-gate.py (version-sync/git-clean/listing-manifest/reviewer-creds/failure-replay, fail-closed), scripts/release-creds.json (demo set, live-POST gate), store/play-listing.txt, SCREENSHOT_GUIDE.md (6.9" 1320×2868 base).
- Next: iTunes public lookup (live store version) + creds live-probe → screenshots after code lands → shell regen + fresh EAS build → gate → TestFlight → Jeff clicks Submit.
- 10/15 progress: code batch DELIVERED (9 commits d3cc5c69..10aa753f on origin/main) + parent-independently verified (tsc 0, jest 21/21, drift 0-new/154). Shell regen run (prebuild exit 0; diff = 3 splash-logo images only, Podfile.lock sha unchanged; Info.plist now 1.5.1/CURRENT 156). Debug verification build running (iPhone 17 Pro Max sim, /tmp/tjb-shell-dd). Reviewer notes committed. Next: fresh store screenshots from final source (driver foreground-rule per 10/14 lesson 5), commit shell diff, EAS production build, release gate, TestFlight, Jeff submits.
