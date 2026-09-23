# VERIFY — Phase 1 Batch 1: Timeline · Share Birth Plan · Birth Plan Preview

**2026-09-22 · Kit · for Jeff review** — packet: `phase1-batch1-review-packet-2026-09-22.pdf` (3 pages, side-by-side renders, 4.9 MB)
Screens: `frontend/app/(mom)/timeline.tsx` · `share-birth-plan.tsx` · `birth-plan-preview.tsx` · Mockups: s6-app-timeline.html / s5-app-birth-plan.html (approved 9/17, commit 397c372a)

**Uncommitted by design — Jeff approves from the packet, then this batch commits.**

## What changed (visuals only, per RESKIN-COMPLETION-PLAN Phase 1 rules)

### 1.1 Timeline (full reskin — was the only screen on fully legacy theming)
- Header: `YOUR JOURNEY` rose kicker → "Pregnancy **Timeline**" Cormorant H1 26 (accent word roseSoft, per mockup `em` = color-only, not italic) → Quicksand sub 12.5
- Where-you-are anchor: white card r20 + `week-28` watercolor art 150px + "Where you are" H2 21 + WEEK chip (lavender 700) + desc 12 + 40×40 next-up thumb
- Events: white r18 rows, 44px date box (rose month kicker 9.5 + Cormorant day 22), Cormorant H3 17 titles, APPT chip lavenderBg / CLASS chip gbandMid, ghost `+ Schedule with Provider` (1.4px lavenderSoft border, r999)
- Milestones: 4-across strip (~86px cards), white r16, current = roseSoft border + gbandMid bg, past 0.72 opacity, lavenderSoft/rose week kickers, Cormorant 15 titles
- Date/schedule modals, inputs, cancel/save pills reskinned to corpus; all event handlers, testids (`event-date-picker-btn`, `event-title-input`, `save-event-btn`, `schedule-btn`), and the `/(mom)/appointments` route unchanged (verified identical to HEAD)

### 1.2 Share Birth Plan (s5 design language — s5 contains the plan hub only; share/preview flows follow its patterns)
- Header kicker + Cormorant H1, back row; search input as s5-style white pill (r999, hairline border, search icon)
- Provider results + Active shares + Pending requests as srowBase white r18 cards with 44px lavenderBg initials-fallback avatars (photo if present)
- Status chips: `ACCEPTED` sage / `PENDING` rose on roseBg; `REVOKE`/`CANCEL` rose ghost pills
- Empty state: organic leaf chip + Quicksand caption on cream — no blue, no emoji
- Testids preserved (`search-provider-input`), search/share/revoke/cancel logic byte-identical to HEAD
- One interface addition: `picture?: string` on `ShareRequest` (fields exist in API responses; no logic change)

### 1.3 Birth Plan Preview (renders the branded PDF via WebView — PDF flow is the protected path)
- Screen chrome reskinned: kicker + Cormorant H1 header row, cream canvas, loader copy + spinner colors
- WebView content (brand band, lavender section bands, checkbox rows) — untouched: the branded PDF already implements the design law
- **`eb802f76` native download flow byte-identical** — `handleDownloadPDF` + `handlePrint` verified char-for-char against HEAD
- WebView header/progress colors, loader copy — token colors, no hexes

## Compliance
- **Tokens:** all colors via designRefresh `C`/`F` (incl. `C.gbandMid` reused for mockup's #FBEEF5 class-chip / #FBF5F9 current-ms bg; `C.lavenderBg` for the s5-family #F1F1FB) — hex audit: **zero** hardcoded hexes in all three files
- **Type law:** Cormorant headings (26/21/17/22 numerals), Quicksand body 13.5 / meta 11.5–12.5 / kickers 10 · 2.2px tracking
- **16px inset law:** scroll containers 20px, inner cards 14–16px per mockup
- **Avatar law:** photo with initials fallback (`initialsOf`) on share screen; timeline/preview have no avatars in mockups
- **Brand marks/icons:** untouched (Phase 3 icon audit is a later phase)

## Verification
- `npx tsc --noEmit`: **0 errors** (baseline was 0; zero new)
- Renders: `capture-phase1.py` (Playwright 390×844 dsf=2, web export served at :8082, fonts loaded via `document.fonts.ready`) → `renders-phase1/*.png` + composites
- Auth/API stubbed at the **browser layer** (fetch intercept + `session_token` in localStorage) — zero app-code changes for capture; real implemented components render with mock data matching each screen's own fetch contract
- Pixel audit: impl canvas = `(250,248,245)` = #FAF8F5 = C.cream on all three screens; s5 phone screen ≈ #F8F6F2 (its `#F5F3EF`+noise wash — same corpus family)
- `handleDownloadPDF`/`handlePrint`: identical (diff) · testids + router pushes: identical (regex-diff)
- s6 milestone cards corrected to mockup's 4-across (~86px) after first render review

## Deviations
- s5 has one phone (plan hub). Share + preview follow its header/pill/chip/abtn/ghost/notice vocabulary — flagged here and in the packet per plan rules.
- share-birth-plan adds `picture?: string` to the ShareRequest interface (type-only).
- Renders are the **web export** of the RN app (RN native rendering not runnable in this environment) — same tokens/JS bundle, fonts loaded; minor sub-pixel text differences possible.