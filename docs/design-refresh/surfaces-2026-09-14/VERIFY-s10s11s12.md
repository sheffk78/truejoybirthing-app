# VERIFY — S10/S11/S12 Mom Home · Contraction Timer · Weekly Tips

> **APPROVED by Jeff 2026-09-17 (rev 3, Discord msg 1550329273821429811).** Scope: implement approved design into the existing app (`frontend/app/(mom)/home.tsx`, `contraction-timer.tsx`, `weekly-tips.tsx`) — **no new app generated yet**, no deploy. See `IMPLEMENTATION-HANDOFF.md`.

**Surface file:** `s10s11s12-mom-home-timer-tips.html` (4 phones: S10 top / S10 scrolled / S11 timer / S12 weekly tips)
**Renders:** `renders-s10s11s12/` (4 PNGs, 390×844, dsf=2, per-phone crops)
**Construction:** approved s7s8s9 hbands pattern — statusbar → hband photo (168px, 3-stop veil fade to #FAF8F5) → m-head → sections → absolute-pinned white tab bar (62px, bottom-radius 45px).

## Photos (all distinct, none reused from S7–S9)
| Screen | Band photo |
|---|---|
| S10 Home | `assets/band-home-couch.webp` (couch consult) |
| S11 Timer | *(no photo — graphical ripple halo around the circle timer, rev 3)* |
| S12 Tips | `assets/band-tips-teaching.webp` (teaching class) |

No skyline heroes, no captions on bands. Baby-dev watercolor cards use real series art (`week34` on home growth card, `week28` on tips week card). Avatars are initials-fallback circles (Elena EV, Amara AH, Jordan JR) per DESIGN-RULES §6 — profile photos first when real ones exist.

## Revision 2 — S11 header: photo → graphical band (Jeff, 2026-09-17)
Jeff: timer screen doesn't need a photo during labor — keep it graphical. Replaced `assets/band-timer-checking.webp` hband with `.gband`: 132px soft lavender→cream gradient (`#F1F1FB → #FBF5F9 → #FAF8F5`, all corpus-approved) with a subtle centered concentric-ripple SVG motif. No new art asset, no photo, no brand-mark work.

## Revision 3 — S11 body: mirror live app structure (Jeff, 2026-09-17)
Jeff: "look at the current design of the contraction timer. Try to keep more of that structure." Re-read live screen (`frontend/app/(mom)/contraction-timer.tsx`) and rebuilt S11 to match its layout: title+gear header row → 3-column stats strip (Avg Duration / Avg Interval / Count, hairline dividers) → white circle timer (186px, serif 02:47, "Surging…" label) with concentric ripple halo → single dark "Stop Surge" pill → 4-action row (History / Add Manual / Share / End) → 3 outline pills (Water Broke / Notes / Charts) → 5-1-1 pattern chip → pinned 5-tab bar (Timer active). Live app's History list lives in a modal, so no inline session list in the mock. Ripple halo + gradient all corpus-approved hexes; one unapproved hex (`#EDE2EE`) caught by audit and replaced.

## Checks run (all pass)
- **Hex audit:** every hex in the file appears in the approved corpus (s7s8s9 + s6 + common/icons/type CSS + design analysis). Rev 1: 3 unapproved sage tints → replaced with approved `#E8EDE5` + `#FAF8F5`. Rev 3: `#EDE2EE` halo rings → `#EDEAF6`.
- **Tab bar pin probe (Playwright DOM measurement):** all 4 tab bars measure `top:773, bottom:835, h:62` inside the 844px screen — identical geometry on every phone, matching the s7s8s9 corpus construction (835 = 844 − 9px phone padding).
- **Band photos:** 2 distinct hbands remain (S10, S12) + graphical S11 — grep-verified; `week34`/`week28` art refs intact.
- **Vision review:** S11 rev 3 PASS on all 8 structural checks (header row, stats strip, circle timer + ripples, Stop Surge pill, action row, pills, pattern chip, tab bar).

## Defects found & fixed
1. **Tab bar clipped off-frame (all 4 phones, rev 1)** — flow tab bar after tall content measured bottoms 1026–1399px in an 844px frame. Root cause: missing the corpus's absolute pin (s7s8s9 line 78). Fixed with `.tabbar { position:absolute; left:0; right:0; bottom:0; z-index:4; border-radius:0 0 45px 45px; }` (common.css `.screen` is already `position:relative`).
2. **3 unapproved hexes in paid-row tints (rev 1)** — replaced with corpus-approved equivalents.
3. **S11 splice mis-nesting (rev 3)** — the tab bar was initially spliced inside the timer circle's label div and S11 briefly had no tab bar; both caught by DOM probe (phone 3 measured 500-562 vs 773-835) and div-balance count (42/42 restored), then fixed by re-splicing between verified anchors.