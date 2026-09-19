# TJB Mobile — LOCKED CONSISTENCY SPEC (canon v1, 2026-09-18)

> **What this is:** the single law for every remaining screen of the mobile redesign.
> Items here are **done** — implementers reuse them verbatim; nobody redesigns them.
> Sources of truth: `src/constants/designRefresh.ts` (code), `surfaces-2026-09-14/` approved mockups (visual), DESIGN-RULES.md (process law). If a summary contradicts this spec, this spec wins.

## 1. Palette — 22 corpus hexes, nothing else
`designRefresh.ts C` is the only color source: cream `#FAF8F5`, ink `#2A2A2A`, body `#4B4B4B`, gray `#6A6B6C`, grayLight `#8A8B8D`, rose `#A25C86`, roseSoft `#B085A5`, roseBorder `#B87AA0`, roseBg `#EFE0EB`, lavender `#6E6C99`, lavenderSoft `#8E8CB5`, lavenderBorder `#D5D3E8`, lavenderBg `#F1F1FB`, sage `#5F7154`, sageBg `#E8EDE5`, border `#EFE0EB`, hairline `#F0E9EE`, cardBg `#FDFCFA`, halo `#EDEAF6`, chev `#B9AFB8`, track `#F3F1EE`, white `#FFFFFF`.
Every new screen passes a hex audit against this list. Blue/playable palettes: never.

## 2. Type (app column, TYPE-SYSTEM.md)
- H1 Cormorant 700 **26/29 — once per screen**; accent word (first em) rose `#B085A5`
- H2 21 · H3 Cormorant 600 17 · kickers Quicksand 700 caps 10px / 2.2 tracking
- Body Quicksand 13.5 · caption 11 · numerals (clock, stats) Cormorant 700 tabular

## 3. Header bands
- Photo band: 168px from y=0 behind status bar, object-position `50% 18%`
- Veil (exact stops): `rgba(42,42,42,.05) 0% → rgba(250,248,245,0) 45% → rgba(250,248,245,.75) 92% → #FAF8F5 100%`
- Content (m-head) starts only after the photo is 100% dissolved; padding **20px horizontal** (approved 09-18)
- Distinct photo per screen (no reuse); no skyline heroes, no captions, no medallions
- **S11 exception (no photo):** gband gradient `#F1F1FB → #FBF5F9 → #FAF8F5` + halo rings r 98/132/168/204, stroke `#EDEAF6`, widths 1.4/1.2/1.1/1
- Overline on band screens: `Week 28 · Day 3` rose kicker pattern

## 4. Cards & pills
- Card row: white bg, 1px `#EFE0EB`, **radius 18**, padding 12/14 (`srowBase`)
- Ghost pill: `#FDFCFA` bg, 1px `#D5D3E8` border · Solid action: lavender/lavenderSoft
- Chevron color `#B9AFB8` · progress track `#F3F1EE`, fill lavenderSoft, 4px bar
- Avatar circles: **photo first, initials fallback only** (never initials as terminal state)

## 5. Tab bar
- White surface, hairline top `#F0E9EE`, active tint `#8E8CB5`, inactive `#9C9DA0`
- Labels Quicksand 700 10.5px · pin: absolute bottom, bottom-radius 45px in mockups
- **Tab set: live app = 6 visible (Home/Birth Plan/Timer/My Team/Messages/Profile).** Mockups drew 5 — mockup rendering is illustrative; the 6-tab structure stands (handoff: "keep existing RN tab structure"). The bespoke icon set already includes a Profile glyph (icons.mjs TAB BAR = 6).
- Badge dot: replace app's off-palette `#EF4444` with **rose `#B87AA0`** (approved unread-dot token) during the TIcon retrofit (§6).

## 6. Icon system — RESOLVED (Jeff correction 09-18: this was already decided)
- **Approved set (2026-09-15, msg 1549523133218820129):** the hand-drawn organic C-curve glyph set — `icons.mjs` (22 glyphs: 6 tab + 12 birth-plan sections + 3 status + autoshare) + `icon-sheet.html`. Jeff approved these; they are LAW, not a proposal. Style rules in `icons.css` header: stroke 1.7 @ 24 box, round caps, curves over straight lines, sage/rose/lavender/gray tints, no emoji/map-pins/geometric library shapes (reinforced 09-16, msg 1549955108568305735).
- **Actual gap = implementation, not design:** the app still renders Lucide library icons (`Icon.tsx` maps everything to Lucide) — the exact vocabulary the icon law banned. Mockup packets also drew bespoke inline SVGs (only 4/17 signatures shared across packets) instead of referencing the approved set.
- **Remediation (Kit's ownership lane, no Jeff decision needed on style):** build one `TIcon` RN component backed by the approved glyphs; retrofit S10/S11/S12 + birth-plan sections; ALL future screens use `TIcon` from birth. Lucide remains only on screens awaiting redesign. Tab icons render 30px (up from 24) per approved set.
- **Badge dot:** `#EF4444` → rose `#B87AA0` (approved unread-dot token), fixed during the TIcon retrofit.



**Retrofit executed 2026-09-18 (approved rev-2 glyphs):**
- `TIcon.tsx` built — 31 glyphs, RN-native (react-native-svg), stroke 1.7 @ 24, round caps, `currentColor`.
- 3 approved redraws (pushing_safe_word / post_delivery / after_birth) written into `icons.mjs` as REV 2.
- Tab bar (`_layout.tsx`): home/birthplan/timer/team/messages/profile → TIcon; unread-dot `#EF4444` → rose `#B87AA0`.
- Birth plan: 12 section rows + 3 status chips → approved glyphs.
- Mom home: key actions (timeline/bell), action-required rows (ar_contract/ar_invoice/ar_invoice_paid), chevrons → text `›` per mockup.
- Contraction timer: History/Add/Share/End per mockup (End = text-only), pills text-only, gear, close ×, toggles/radios → status_done/status_todo.
- 9 utility glyphs (ta_history/ta_add/ta_share/gear/k_timeline/bell/ar_contract/ar_invoice/ar_invoice_paid) added verbatim from approved mockups — bell is the mockup's single drawing reused for schedule + prenatal + birthplan-review rows.
- Zero Lucide refs remain on: home, contraction-timer, weekly-tips, birth-plan, mom tab bar. `websocket.ts` TS error is pre-existing, unrelated.
## 7. Week & day display — canonical format
- **Canonical: `Week 28 · Day 3`** (rose overline, middle dot separator) — home + any gestational-age overline.
- S12 weekly header: `Week 28` + sub `Third trimester · day 4`; tab pills `Pregnancy · 1–42` / `Postpartum · 1–6`
- Week strip: **±3 weeks around selected = 7 chips**, hairline circles, selected solid lavender
- Legacy live-app formats (`28w 3d` timeline badge, `28 weeks 3 days` home card) migrate to canonical **when those screens are redesigned** — not before.
- Trimester helper lives in `designRefresh.ts trimesterOf` (≤13 First, ≤27 Second, else Third)

## 8. Screen status ledger
- **Approved + implemented (locked, git):** welcome/login/signup, mom onboarding flow, S10 Home, S11 Timer, S12 Weekly Tips, tab-bar chrome
- **Approved mockup, not yet implemented:** S5 Birth Plan, S6 Timeline, S7 Appointments, S8 My Team, S9 Messages (locked mocks `397c372a`)
- **Not yet designed:** Profile, Marketplace, Provider Detail, Invoices, Postpartum, Wellness, Getting Started, Invite Provider, Share/Preview Birth Plan, pro onboarding (doula/midwife/lactation), notification-permission, verify-email (pro last step)
- **Implemented-and-approved screens are LOCKED** — never re-style from memory (DESIGN-RULES §5)

## 9. Drift register (found 2026-09-18)
| # | Drift | Status |
|---|---|---|
| 1 | Icon vocabulary: bespoke mockup SVGs vs Lucide in app; only 4/17 glyphs shared | Open — Jeff decision A |
| 2 | Tab badge dot `#EF4444` off-palette | Open — Jeff decision C (rec: `#B87AA0`) |
| 3 | Tab count: mockups 5 vs live 6 (Profile) | Resolved by spec §5 — 6 stands |
| 4 | Week format: 3 different renderings across live app | Resolved by spec §7 — canonical set, migrate at redesign |
| 5 | Tab label 10.5px (impl) vs 9px (mockup corpus) | Impl wins (approved 09-18 render) — canon = 10.5px |
| 6 | Veil recipe had two variants (auth lavender `.15` vs mom ink `.05`) | By design — auth screens use lavender-stop veil, logged-in mom screens use ink-stop veil. Both locked. |