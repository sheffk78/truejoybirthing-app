# TJB Mobile — Mom Section Implementation Handoff (rev 3, Jeff-approved 2026-09-17)

> **Scope guard (Jeff, msg 1550334582501679155):** implement the approved design into the EXISTING app only. **No new app generated yet.** No deploy — deploy gate is separate.

Jeff approved the mom-section mockups (msg 1550329273821429811, #truejoybirthing-web): S10 Home, S11 Contraction Timer, S12 Weekly Tips, built on the approved S7–S9 hband pattern.

## What was approved (source of truth)
- **Mockup file:** `Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/surfaces-2026-09-14/s10s11s12-mom-home-timer-tips.html`
- **Renders (visual reference):** `docs/design-refresh/surfaces-2026-09-14/renders-s10s11s12/*.png` (s10-home-top, s10-home-scrolled, s11-timer, s12-tips)
- **Packet:** `docs/design-refresh/surfaces-2026-09-14/PACKET-s10s11s12-mom-home-timer-tips.pdf`
- **Design + verification record:** `docs/design-refresh/surfaces-2026-09-14/VERIFY-s10s11s12.md` (read FIRST — carries the approved construction, palette law, and rev history)
- **Approved prior art:** `s7s8s9-app-mom-core.html` + `s7s8s9-mom-core-hbands.html` (hband/veil/tab-bar construction, line ~78 for the tab-bar pin)

## Targets to modify (frontend RN screens)
1. `frontend/app/(mom)/home.tsx` → S10 Home
2. `frontend/app/(mom)/contraction-timer.tsx` → S11 (structure stays: title+gear row → 3-stat strip Avg Duration/Avg Interval/Count → circle timer → Start/Stop → History/Add Manual/Share/End → Water Broke/Notes/Charts → 5-1-1 chip. ONLY the visual skin changes: serif clock in circle w/ soft ripple halo behind it, photo header REMOVED — graphical gradient band instead, per Jeff "timer doesn't need a photo during labor")
3. `frontend/app/(mom)/weekly-tips.tsx` → S12

## Non-negotiables (from DESIGN-RULES + VERIFY record)
- Palette: cream/lavender/rose only — corpus hexes from s7s8s9 CSS. NO blue/playable palettes. Every hex must appear in the approved corpus (verify with the hex-audit method in VERIFY-s10s11s12.md).
- Fonts: Cormorant (serif display, bold, for h1/clock/stat numerals) + Quicksand (UI). See `docs/design-refresh/TYPE-SYSTEM.md`.
- Photo bands (S10/S12): hband pattern — 168px band, 3-stop veil fade (`rgba(42,42,42,.05) → transparent → #FAF8F5`), distinct photos per screen (`band-home-couch.webp`, `band-tips-teaching.webp` in `docs/design-refresh/surfaces-2026-09-14/assets/`).
- S11 header: NO photo — gradient `#F1F1FB → #FBF5F9 → #FAF8F5` with faint `#EDEAF6` ripple rings behind the circle timer.
- Tab bar: 5 tabs (Home/Birth Plan/Timer/My Team/Messages), Timer active on S11 — keep existing RN tab structure, restyle to white 62px-equivalent with bottom radius.
- NO brand marks/logos/icon redesign (hard block). Avatars = initials-fallback circles (Elena EV, Amara AH, Jordan JR) unless real photos exist in app assets.
- Watercolor baby-dev cards: real series art refs (week34 home growth card, week28 tips week card) — check `frontend/assets/illustrations/`.

## Session law (from AGENTS.md)
- Jeff decides architecture; execute bounded prompts only — this file IS the bounded prompt.
- Do NOT deploy to Railway. Implementation only; deploy gate is separate.
- Never claim "done" without live verification; report what real execution returned.
- Ship at 80% for internal screens; verify each screen renders before reporting (build/probe, don't describe).
- Log the job: JOB-LEDGER entry + ACTIVE-TASK.md update when complete.

## Suggested execution order
1. Read VERIFY-s10s11s12.md + the mockup HTML (S11 section) for exact colors/spacing.
2. Skin S11 first (self-contained, structure already matches live app).
3. Then S10 (hband photo + cards) and S12 (hband photo + week strip + tip cards).
4. Per screen: implement → render/screenshot → compare against the approved PNG → report side-by-side.

## Session prompt (copy-paste into the new session)
Continue the TJB mobile redesign: implement the Jeff-approved mom-section design (S10 Home, S11 Contraction Timer, S12 Weekly Tips) into the React Native app. Read the handoff at `Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/surfaces-2026-09-14/IMPLEMENTATION-HANDOFF.md` and follow it exactly — it lists the three target screens, the approved mockup + renders to match, the palette/font law, and the verification steps. Visuals at every step; no deploy; report per-screen with render comparisons.