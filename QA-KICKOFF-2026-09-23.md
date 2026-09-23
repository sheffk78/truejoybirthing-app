# QA-KICKOFF — Visual + Interactive QA of the Reskinned App (Dark + Light)

**Date prepared:** 2026-09-23
**Code state:** commit `9f008342` (Phase 2C dark mode live) on `main`. Clean tree.
**Mission:** Open the redesigned app in Apple Simulator, click through every core flow
in both themes, verify buttons/flows/visuals against the approved design, screenshot
along the way, and file anything broken.

---

## Environment (verified ready)

- **Xcode 26.5** with iOS 26.5 simulators installed. Use **iPhone 17 Pro**
  (UDID `C35AC525-2D91-4295-BD48-3D7B20AC2966`) — boot with:
  `xcrun simctl boot C35AC525-2D91-4295-BD48-3D7B20AC2966`
- **Expo SDK 57** / Node v26.4.0. Managed workflow (no `ios/` dir, no dev-client) →
  the app runs in **Expo Go**.
  1. Install Expo Go on the booted sim: open Simulator, App Store isn't needed —
     use `npx expo start` then press `i` (it auto-installs Expo Go on the sim and
     launches the app). If Expo Go install fails, fallback: `npx expo run:ios`
     would require prebuild — do NOT prebuild; use Expo Go path.
- **Backend:** production Railway (`truejoybirthing-app-production.up.railway.app`),
  health checked **200 OK**. The app defaults to prod on native — no env setup needed.
  QA is read/click-through + login; do NOT run destructive writes against prod data
  (no real payments, no deleting real records). Creating a throwaway test entry is fine.
- **Computer use:** Simulator runs on the desktop — this session will use
  `computer_use` on the **Simulator app** (not Chrome; no Chrome permission needed).
  The computer-use-lock mutex applies: acquire before driving, release after.
  Screenshots: capture via `xcrun simctl io <udid> screenshot <path>` for crisp
  device-frame shots (better than screen grabs) + computer_use for reading the screen.

## Login credentials

- Ask Jeff in-session for the test account (or use his real account ONLY for
  read-only flows). Do not invent credentials. If Jeff provides them in chat,
  keep them out of screenshots and committed files.
- If login itself is blocked, screenshot the error and move on — report, don't stall.

## Test plan (run in LIGHT first, then repeat the visual sweep in DARK)

1. **Launch & onboarding:** cold start → welcome screen renders (serif Cormorant
   headings, cream canvas, sprig motif, NO left color bars on cards).
2. **Login flow:** enter credentials → dashboard loads → session persists on app
   relaunch.
3. **Mom tab bar:** all 5 tabs switch correctly, active/inactive tints correct.
4. **Home screen:** weekly affirmation card (plain card + sprig, verify the removed
   left border), photo header band (HBand veil fade), halo rings, quick actions.
5. **Click-through:** appointments, birth plan (open + close modal), messages,
   my-team, marketplace, invoices, profile, wellness, weekly tips — every button
   press should do what its label says; note dead buttons.
6. **Settings → Appearance:** switch Light → Dark in-app. Verify instant flip with
   no restart. Then set **System** and flip macOS appearance — verify it follows.
7. **Dark visual sweep:** same core screens in dark: canvas `#1A1520`, cards
   `#2A2330`, ink `#F5F3F6`, rose accents `#AE7698`; photo bands get plum-black
   veil; text contrast looks right; no light-mode hex leaking (white card bg on a
   dark screen = bug).
8. **Known exception:** onboarding walkthrough is intentionally still light-only
   (not in the approved dark packet) — do not file it as a bug; note if it looks
   broken rather than just light.
9. **Edge flows:** logout → login again; kill + relaunch mid-flow.

## Screenshot protocol

- Save to `/Users/socializerender/Projects/TrueJoyBirthing-Mobile/qa-screenshots/2026-09-23/`
  named `<NN>-<screen>-<theme>.png` (e.g. `04-home-light.png`).
- Look at each shot before moving on (vision_analyze): check alignment, contrast,
  typography (Cormorant headings / Quicksand body), accent colors, spacing.
- Collect findings in `qa-screenshots/2026-09-23/FINDINGS.md` as you go:
  pass/fail per screen + screenshots referenced by filename.

## Deliverables

- `FINDINGS.md` with per-screen results + visual issues
- Bug list with screenshot refs (file real bugs as `pending_review` tasks)
- Discord summary at the end: what passed, what failed, where the shots live
- Job record in `SYSTEM/JOB-LEDGER.md` before starting the click-through

## Rules of engagement

- Prod backend is live: read/click freely, no destructive actions, no real payments.
- Do not modify design files if a visual mismatch is found — file it with a
  screenshot; palette changes need Jeff's approval.
- If Expo Go fails on the sim, report before attempting a prebuild (that's an
  architecture change).