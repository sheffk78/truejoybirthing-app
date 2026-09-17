# JOB-20260916-TJB-SCREENS-REMAINING

**Brand:** TrueJoyBirthing (mobile) · **Channel:** #truejoybirthing-web
**Directive (msg 1549931375497318462):** Continue the redesign — auth/onboarding flow DONE (implemented 2026-09-16). Design remaining app screens step by step, visuals at every step; build only after all screens approved.

## Progress log

- 2026-09-16 ~18:30 — Chunk 4 mockups built + verified (walkthrough slides ×3, mom profile form) — ALL PASS, posted to Discord, awaiting Jeff verdict.
- 2026-09-16 ~19:00 — Chunk 5 mockups built. First build violated DESIGN-RULES §1 twice (content sheet absolutely positioned inside 300px photo band → dark-photo texture behind headings; step chips on photo). Caught by pixel + DOM verification (margin std 13.7 vs approved 2.1), rebuilt to approved flow layout, chips moved onto cream. ALL PASS after fixes. Posted, awaiting verdict.
- Pipeline documented in PIPELINE-NOTES.md (render via agent-Chrome CDP dsf=1, verification windows, vision-review rules).

- 2026-09-16 ~19:30 — Ad-hoc re-verification against current on-disk state (temp script, cleaned up after): fresh CDP re-render of both packets → structure counts + photo/fade height pairing + per-screen pixel windows + crop-drift check vs posted PNGs. ALL PASS (exit 0). Two initial flags were checker bugs (blanket fade=230 vs approved paired heights; mom-form 966px tall frame cut at 760), proven by page-height math (3386 = 2392+966+28) and fixed in the checker, not the design. Verifier script hardened (CSS-rule fallback for height pairing) before removal.
- 2026-09-16 ~19:45 — Second full ad-hoc pass (fresh re-render → structure + pixels + drift → temp script removed): ALL PASS exit 0. 7/7 screens: seam 1.7–12.5 (<60), detail 47.0–65.7 (>25), cream 1.04–2.82 (<6), first-text 260–323 (≥246), all FIT. Posted PNG crops re-saved from the current flex-layout render (p5 posted PNGs had stale non-flex geometry from the first capture pass; diff now 0.000). Verifier fixes this pass: DOM-rect crop offsets (flex row center-aligns the 966px plans phone → plans y=28, not 131), drift-section coords synced, gradient-law check corrected (approved gradient defined once per file in shared .fade rule; ≥1 + per-screen cream deviation proves rendered fades). Three flags across the run were all checker calibration, zero design changes needed.

## Remaining screens (design queue)
- Tutorial steps 2–3 (mom + pro variants)
- Post-onboarding: (mom)/home refresh port, week-detail port (s2 exists from 09-14), marketplace, provider dashboard, weekly-tips
- Pro verify-email screen already approved (chunk 3) — no rework needed

## Scope
- Design law: `auth-refresh/DESIGN-RULES.md` (approved Jeff 2026-09-16). Source-of-truth constructions: auth-screens-1.html + auth-screens-3.html.
- Remaining screens (mockups first, no RN build until approved):
  1. onboarding-intro walkthrough (3 slides/role — shared component OnboardingWalkthrough.tsx)
  2. mom-onboarding profile form (due date, birth setting, zip)
  3. doula/midwife/lactation profile forms (practice, zip, years; midwife + credential)
  4. plans-pricing (pro paywall) · 5. tutorial (mom + pro variants) · 6. post-auth core screens as Jeff directs
- Shipped already (do not redo): welcome, login, signup, verify-email (pro last-step), notifications, first-win.

## Verification contract (DESIGN-RULES §4)
- Render via agent-Chrome CDP (browser_exec); crop by dark-gap scan; objective seam check (<60 jump); asset refs on disk; actual PNG posted to Discord every step; evidence → VERIFY-*.log in auth-refresh/.

- 2026-09-17 ~16:15 — Overnight drift root-caused (Jeff: "these look terrible" ×3). Cause: session re-derived approved screens from stale handoff note, posted as "fresh shots"; mis-scoped revert restored pre-approval plans screen. NO approved work was lost — repo verified byte-clean against approved state. Actions: leftover approved work committed as 91bf8a3a (tree clean = locked baseline); SESSION-HANDOFF.md rewritten (fonts corrected to Cormorant Garamond/Source Sans 3); DESIGN-RULES.md §5 approved-state discipline added.

## Status
- [completed] Auth/onboarding flow implemented + locked (91bf8a3a).
- [completed] Packet 2 (2026-09-17): s7s8s9-app-mom-core.html — mom logged-in core (appointments S7, my-team S8, messages S9) → Jeff-approved + header treatment 2 (photo band) approved same day; ALL locked in commit 397c372a). Function-preserving inventory from (mom)/appointments.tsx, my-team.tsx, messages.tsx; zero-function-loss check PASS. Hex audit 0 unapproved. Render PASS ×3 (tab bars pinned, active-tab tint centroids verified vs markup). Evidence: surfaces-2026-09-14/VERIFY-s7s8s9.md.
- 2026-09-16 ~20:10 — Jeff review (msg 1549955108568305735): 3 catches, all fixed + verified. (1) Audience narrowing: slide-2 + team-card copy now "doulas, midwives, other birthing professionals"; pro copy uses "other birthing professionals". (2) AI-slop icons: map-pin SVGs removed from mom-form zip (sprig), all 4 birth-setting library icons redrawn as organic C-curve line icons per approved vocabulary (birth-center redrawn twice — bell read → bassinet+rocker, zoom-verified). (3) Tutorial emoji (🌱📋🤍) → line-drawing icons (sprout/plan/team). All 7 screens re-rendered (viewport-exact method, captureBeyondViewport IPC stalls documented), ALL PASS (seam ≤12.6, detail ≥47, cream ≤2.82), vision-verified at 2-3x zoom.
- 2026-09-16 ~20:10 — Pipeline addendum: Page.captureScreenshot captureBeyondViewport times out at IPC daemon (5s); use Emulation.setDeviceMetricsOverride(width=pageW, height=pageH) + plain viewport capture. c4 render w=1385 quirk: capture at 446 exact, crop x28:418.
- 2026-09-17 (PM) — S7/S8/S9 header visuals: Jeff approved treatment 2 (color photo band, cream fade) w/ city-page secondary images (midwife-heartbeat, acworth-ga-support-scene-v8, lactation-consult-v3). Built s7s8s9-mom-core-hbands.html + 3 verified PNGs. 2 audit agents spawned (appt-mgmt completeness, invoice/contract lifecycle). Avatar circles confirmed profile-photo-ready.
