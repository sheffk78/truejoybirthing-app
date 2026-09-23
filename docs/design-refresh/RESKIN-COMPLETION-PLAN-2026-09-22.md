# TJB Mobile App — Design Reskin Completion Plan
**Created 2026-09-22 · Kit · for Jeff review**
Status vocabulary: `done` (approved + implemented), `approved-pending` (mockup approved, skin not implemented), `needs-mockup` (no approved design yet).

---

## 0. Where we are (audited 9/22, every screen file checked)

| Area | Screens | State |
|---|---|---|
| Mom core (home, birth-plan, marketplace, provider-detail, timer, weekly-tips, appointments, messages, my-team, profile, wellness, invoices, contracts view) | 13 | **done** (S5–S15, M16/M17 approved + implemented) |
| Auth + onboarding (welcome, login, signup, all 4 role onboardings, tutorial, plans-pricing, verify-email, forgot-password, notification-permission, onboarding-intro, tutorial-preview) | 13 | **done** (Jeff-approved 9/16, commit b3c15c9e) — useColors + approved layout |
| Doula (D1–D11 skin via shared provider components) | 14 | **done** (aaf19e60, 7311e749, 538fbd05, 9/21–9/22) |
| Midwife (tab bar, visits, birth-summaries, 4 clinical sections) | 16 | **done** (05edd627 + shared comps) — leads/contracts/subscription ride shared comps |
| Lactation (tab bar, messages, 5 clinical sections, icon swaps per Jeff 9/22) | 14 | **done** (32d99e3e, f499ac1e) |
| Provider shared components | 11 | **done** — designRefresh tokens throughout |
| Admin (web SPA — separate codebase, out of mobile scope) | 4 | out of scope this plan |
| **Mom sub-screens, old layout (palette-safe only)** | 6 | **Phase 1** |
| **Remaining polish + dark mode** | — | **Phases 2–4** |

Correction to earlier message: doula/midwife/lactation ARE skinned (9/21–9/22 passes) — the real remaining work is smaller than I reported.

---

## Phase 1 — Mom sub-screens reskin (6 screens, mockups approved, implementation pending)
Approved sources of truth (already approved 9/17, commit 397c372a):
- s5-app-birth-plan.html (birth plan screens)
- s6-app-timeline.html (timeline)

| # | Screen | File | Approved mockup | Est. size |
|---|---|---|---|---|
| 1.1 | Timeline | app/(mom)/timeline.tsx | s6-app-timeline.html | done 2ba75f86 |
| 1.2 | Share Birth Plan | app/(mom)/share-birth-plan.tsx | s5-app-birth-plan.html | done 2ba75f86 |
| 1.3 | Birth Plan Preview | app/(mom)/birth-plan-preview.tsx | s5-app-birth-plan.html | done 2ba75f86 |
| 1.4 | Getting Started | app/(mom)/getting-started.tsx | s7s8s9 core pattern | done (rev2) |
| 1.5 | Postpartum | app/(mom)/postpartum.tsx | s13/s14 pattern (journal-style) | done (rev2) |
| 1.6 | Invite Provider | app/(mom)/invite-provider.tsx | m16/m17 family (search + card) | done (rev2) |

Rules (standing, from DESIGN-RULES + approved passes):
- Skin-only: structure/data/logic untouched; tokens from src/constants/designRefresh.ts (C, F); no hardcoded hexes; Cormorant headings / Quicksand body; 16px min horizontal inset; avatar = photo with initials fallback; no brand-mark changes (hard block).
- Verify per screen: tsc --noEmit zero NEW errors → side-by-side render vs mockup → visual check → commit.
- Package as one review packet (PDF, like S13/S14/S15) for Jeff approval before marking phase done.

## Phase 2 — Dark mode decision + token architecture (design work, needs Jeff pick)
Current reality (audited):
- Machinery EXISTS and works: themeStore (SYSTEM/LIGHT/DARK, persisted), ThemeContext (isDark), AppearanceSettings reachable from mom Profile → Appearance. DARK_COLORS palette defined in themeTokens.ts.
- The 50 useColors screens (auth, doula/midwife/lactation shells, mom sub-screens) RESPOND to dark mode today — colors swap automatically.
- The 18 designRefresh screens (approved mockup skins) are LIGHT-ONLY: designRefresh.C is a hardcoded light corpus. In dark mode these stay light — inconsistent but readable.

Jeff decision needed (one pick):
- **Option A (recommended): Light-only app.** Lock appearance to LIGHT (hide AppearanceSettings until later). The approved corpus is cream-based; a half-working dark mode ships broken-looking screens. Revisit dark mode as a v2 feature with its own mockup packet. Zero new work now; removes a live inconsistency.
- **Option B: Full dark corpus.** Kit produces a DARK designRefresh corpus (dark canvas #1A1520 base already drafted in themeTokens DARK_COLORS), mockup packet for approval, then all 18 refreshed screens + 6 Phase-1 screens get dark-aware tokens. Bigger job (~1 extra phase, needs design approval cycle).
- Either way: implement token indirection now (designRefresh re-exports via a selector) so Option B later is mechanical, not a rewrite.

## Phase 3 — Cross-app consistency sweep (mechanical, no design decisions)
- Replace remaining old COLORS.* direct imports in non-critical screens with useColors (timeline is the only full offender after Phase 1).
- Icon audit: all screens on the organic: namespace law (Icon.tsx §4.0); fix stragglers.
- Type-law audit: every H1/H2/H3 on Cormorant sizes 26/21/17, UI Quicksand, body 13.5/caption 11 (TYPE-SYSTEM.md).
- 16px inset law + 2×2 stat grid law re-audit on all provider sections.
- Full off-palette hex grep (7C3AED, old blues) across app/ AND src/ → zero tolerance.
- tsc + expo export web + full-screen render sweep for the verification record.

## Phase 4 — Release
- Jeff directive on record: NO app build/deploy until he says go (567fc335 note).
- Pre-release: full render QA packet (all screens, light mode), TestFlight build, phased rollout.
- If Option B chosen in Phase 2: dark-mode QA packet additionally before release.

---

## Cadence (same as doula/midwife passes that worked)
Per batch (2–3 screens): implement skin-only → tsc → side-by-side renders → Jeff review packet (PDF in Discord) → approval → commit → next batch.

## Risks / notes
- timeline.tsx is the only screen on fully legacy theming (SIZES/FONTS/constants) — highest effort in Phase 1.
- share-birth-plan + birth-plan-preview touch the live PDF flow — test export after reskin (do not regress eb802f76 native download).
- Postpartum/getting-started have no dedicated mockup — reuse s13/s14 + s7s8s9 patterns, flag deviations in the packet.
- Jeff picks Option A vs B before Phase 2 starts (only real decision in this plan).