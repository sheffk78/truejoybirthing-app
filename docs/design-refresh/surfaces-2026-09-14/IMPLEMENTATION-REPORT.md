# S10/S11/S12 Mom-Section Redesign — Implementation Report

**Date:** 2026-09-18 (session) · **Spec:** `IMPLEMENTATION-HANDOFF.md` (rev 3, Jeff-approved 2026-09-17)
**No new app, no deploy.** All work in the existing React Native app at
`Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/frontend`.

---

## Per-screen summary

### S10 — Home (`app/(mom)/home.tsx`)
- Full-bleed photo band (`band-home-couch.webp`) from y=0 behind the status bar, veil fade to cream
  (3-stop: 0.05 → 0.35 → 1.0) exactly per `.hband` CSS.
- Greeting block on the veil: overline `WEEK 28 · DAY 3` (rose, Quicksand 600, tracking 1.5),
  `Hello, Elena` (Cormorant 26/29, "Elena" in roseSoft), avatar circle (lavenderSoft, initials EV).
- Birth Plan card: kicker `BIRTH PLAN` (lavender), serif title, sub, 4px progress bar (lavender fill),
  chevron #B9AFB8; 64% progress read from plan data.
- Key Actions grid (3 pills, per-section hairline borders + icon tints), Mom feed rows, Weekly Tip card,
  Weekly Affirmation card (lavender left bar, italic serif quote).
- Band under status bar = mockup law: photo extends to the very top (marginTop −insets.top on the band).

### S11 — Contraction Timer (`app/(mom)/contraction-timer.tsx`)
- **Rev-3 form: NO photo band** (verified against approved render — halo starts right under the stats strip).
- Stats strip: 3 pill stats (Contractions / Avg Duration / Avg Interval) in ghost pills on cream.
- Halo: 4 concentric SVG circles, r = 98/132/168/204, stroke #EDEAF6, widths 1.4/1.2/1.1/1 —
  exact values extracted from the mockup's `svg.halo`.
- Big serif timer (Cormorant, tabular), ghost-pill action row (Log Contraction solid lavender when active,
  End Session ghost), contraction history rows with chevron.
- Also fixed a pre-existing type bug: `timerRef` was `NodeJS.Timeout`, now `ReturnType<typeof setInterval>`.

### S12 — Weekly Tips (`app/(mom)/weekly-tips.tsx`)
- Photo band (`band-tips-teaching.webp`) behind status bar + veil.
- Header on cream: kicker `YOUR WEEK` (rose), title `Weekly Tips & Affirmations`
  (serif; "Affirmations" italic rose), sub line.
- Tab pills: `Pregnancy · 1–42` (solid lavender) / `Postpartum · 1–6` (ghost) — switching works as before.
- Week strip: ±3 weeks around selected, hairline circle chips, selected = solid lavender.
- Selected-week header: serif `Week 28`, sub `Third trimester · day 4` style; defensive fallback
  `selectedWeek ?? 1` added so the header never reads "Week null".
- Tip cards (kicker + serif title + body), baby-development row with thumbnail + "Open this week's full guide".

### Shared
- `src/constants/designRefresh.ts` — token module (palette, hairlines, fonts) extracted verbatim from
  the approved mockup CSS; single source of truth for the three screens.
- `src/components/mom/HBand.tsx` — reusable band component (photo + veil), used by S10/S12.
- `app/_layout.tsx` — added Quicksand weights + Cormorant 600 italic to font loading.
- `app/(mom)/_layout.tsx` — tab bar: white surface, hairline top, active tint #8E8CB5, inactive #9C9DA0,
  labels 10.5px.
- Band assets copied to `frontend/assets/images/`.

---

## Verification

- `npx tsc --noEmit` → **0 new errors** (only pre-existing `src/utils/websocket.ts(80,5)` remains, untouched).
- All logic preserved: data hooks, endpoints, refresh flows, modals, navigation — only the presentation
  layer changed.
- Visual QA method: Expo web dev server + Chrome CDP screenshots (390×844 @2x). A temporary
  `?mockmom=1` mock seed was added to the auth store **for screenshots only and has been fully removed** —
  verified `"mockmom" in src → False`, and the real auth guard in `(mom)/_layout.tsx` was restored
  (auth-bypass line is back to `return <Redirect href="/(auth)/welcome" />`).
- Comparison packets (approved render LEFT, implementation RIGHT):
  - `docs/design-refresh/surfaces-2026-09-14/renders-comparison/s10-compare.png`
  - `.../s11-compare.png`
  - `.../s12-compare.png`
  - Raw impl shots: `s10-home.png`, `s11-timer.png`, `s11-timer-running.png`, `s12-tips.png` in the same folder.

### Known visual caveats (web-render environment, not app bugs)
1. Screens were captured **without backend data** (mock user, no API session) → S10 shows the
   "Unable to load" error card, S12 shows "No content available", S11 could not reach the running
   state (session create needs the real API). Layout, typography, palette, bands, halo, pills and
   tab bar all render from the real code paths.
2. Web font fallback: web render may show fallback serif/sans if Google-font files don't load in
   the dev bundle; on device, `@expo-google-fonts` loads them natively.
3. S11 running-state (halo + timer + action pills) is code-verified against the mockup CSS but not
   screenshot-verified — it needs a real backend session (or a dev-only session seed) to capture.

### Follow-ups
- Capture S11 running state + S10/S12 with real data once a dev backend session is available.
- On-device (iOS/Android) pass to confirm font weights + band `object-position` behavior.