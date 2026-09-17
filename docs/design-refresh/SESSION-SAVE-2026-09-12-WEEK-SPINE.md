# SESSION SAVE — TJB Week-Spine Dashboard Design (2026-09-12)

**Job:** JOB-20260912-TJB-WEEKSPINE-DESIGN · **Status:** v4 approved direction, design-review agents dispatched
**Channel:** Discord #truejoybirthing-web · **Origin:** Shelbi recommended "My Pregnancy" app; Jeff asked for design analysis → incorporation

---

## 1. Where we are (one paragraph)

Analyzed the My Pregnancy tracker app (Shelbi's favorite). Jeff rejected its visuals (too cartoony, blue palette) but approved adopting its **flow**: week-spine navigation, one-idea-per-card, baby↔mom tabs, tangible data, weekly rhythm. Built 4 iterations of a side-by-side dashboard mockup in TJB identity — v4 is the current approved direction: cream canvas, muted lavender #8E8CB5 (app themeTokens — NOT website violet), rose/sage accents, the approved week-20 watercolor cross-section as portrait hero art, hand-drawn sepia-contour icons, paper-grain texture, brushstroke underline, double-stroke progress ring. Jeff's verdicts: v2 "really good step forward", v3 "really good", v4 "excellent… really good work."

## 2. Decisions log (chronological, all Jeff-driven)

| # | Decision | Source |
|---|---|---|
| D1 | Analyze My Pregnancy app design, report before any design changes | Jeff, msg 1548358553792684123 |
| D2 | MP visual direction REJECTED ("too cartoony, blue too far from our design") — keep pink/purple primaries, double down on OUR illustrations (gestation series + Coverr system). MP flow lessons still valid. | Jeff, msg 1548376807164747880 |
| D3 | Build week-spine dashboard mockup side-by-side vs production | Jeff, msg 1548376807164747880 ("yes please") |
| D4 | v2 refinements: portrait illustration filling card left side (measured 1011×1550 after trim — was being squeezed into a square), app can scroll (stopped cramming above fold), improve fonts + spacing | Jeff, msg 1548436832902058086 |
| D5 | **Palette correction:** mockup's #7C3AED was wrong. App palette source of truth = `frontend/src/constants/themeTokens.ts`: Lavender 500 **#8E8CB5**, 600 #6E6C99, 300 #D5D3E8, light #EDEAF6, Rose 500 #B87AA0, cream #FAF8F5, charcoal #2A2A2A. Website's #7C3AED is web-only — never carry into app work. | Jeff catch, msg 1548437617887150121 |
| D6 | v4 "less AI-generated" pass: hand-drawn wobble icons, paper grain, brushstroke underline, double-stroke ring, organic tab icons | Jeff, msg 1548438162156822590 |
| D7 | Save state + spawn review agents (design intelligence, details, double-check) | Jeff, msg 1548443143387611147 |

## 3. What exists on disk

**Canonical docs** (`projects/TrueJoyBirthing-Mobile/docs/design-refresh/`):
- `DESIGN-DIRECTION-ILLUSTRATION-FIRST.md` — ACTIVE direction: palette source-of-truth correction, MP flow-lessons table, what-not-to-copy, illustration system plan
- `MY-PREGNANCY-DESIGN-ANALYSIS.md` — full MP analysis + Jeff verdict banner + palette-correction note (§4–6 visual guidance superseded)
- `week-spine-mockup/index.html` — the living mockup (self-contained: fonts/ + assets/), current = v4
- `week-spine-mockup/week-spine-v1..v4.png` — iteration renders (v4 = current, also at https://x0.at/DXbd.png)
- `week-spine-mockup/assets/week20-trim.png` — trimmed portrait crop (1011×1550) of `assets/illustrations/pregnancy-series/week-20/pregnancy-week-20-anchor-approved.png`
- `week-spine-mockup/fonts/` — Cormorant Garamond (600/700, 500 italic), Quicksand (400/500/600/700), Source Sans 3 (400/600)

**Earlier refresh material** (same folder): DESIGN-PLAN.md, html-mockups/ (v1-journal/v2-typographic/v3-warm-editorial), before-after.png, concept-dashboard.png, illustration-sheet.png, coverr/

**Related brand assets:** `assets/illustrations/pregnancy-series/` (37 approved weeks, 4–40), `assets/illustrations/COVERR-OPERATIONS-GUIDE.md` + `STYLE-SPEC.md` + `../branding/tjb-coverr-prompt-templates-v2.md`, skill `tjb-design` (2 new pitfall entries logged 2026-09-12), `assets/branded-screenshots/tjb-app-dashboard.png` (current production dashboard)

**Production theme:** `frontend/src/constants/themeTokens.ts` (LIGHT_COLORS) + `frontend/src/constants/theme.ts`

## 4. Design specification (v4, current)

- **Structure (from MP, flow only):** greeting → serif "Week 20" + 20w+0d + hand-drawn rose brushstroke underline → due-date chip → week stepper (17–23, active = rose w/ inset ring) → hero card (portrait illustration left ~168px full-bleed in card, facts right: Length/Weight/Size-of in Cormorant serif numerals) → segmented tabs (For baby / For mom / For birth) → weekly tip card (sage sprig SVG) → affirmation card (italic serif, lavender sprig) → birth-plan card (rose double-stroke ring + Open pill btn) → action trio (Timeline/Wellness/Schedule, hand-drawn icons) → tab bar (5 organic icons, Home active)
- **Screen model:** scrolling (screen.tall) — tab bar pinned via border-radius 0 0 45px 45px; left comparison phone fixed at 844px
- **Anti-AI-slop treatments:** paper-grain overlay (feTurbulence SVG, multiply blend, z-40, pointer-events none), sepia-toned organic icon strokes (#5C3A2E family tones per module), varied stroke widths, curved imperfect paths, no left-edge accent bars, no perfect geometric rects
- **Type:** Cormorant Garamond 700 display (Week N 42px, fact values 23px, affirmation italic 21px) / Quicksand body (13.5px/1.55)
- **Palette discipline:** app themeTokens ONLY (see D5). Sage #7C8F6F/#E8EDE5 for tip accent, rose #C48CA8/#D8A0C4 ring + stepper, lavender #8E8CB5/#6E6C99 CTAs

## 5. Verification state (what was checked, honestly)

- Automated ad-hoc checks (headless Chromium via camofox-browser playwright): v3 9/9 PASS (palette purge, fonts, hero portrait-in-card, 844px, tabs) · v4 13/13 PASS (adds grain applied, hand-drawn path counts, underline, ring double-stroke) — timestamped 2026-09-12T21:03Z. Temp verify scripts deleted after each run.
- vision_analyze reviews ran on every iteration before delivery (v2/v3/v4) — all 9 v4 elements confirmed present, no clipping; v4 minor notes: stepper digit vertical centering, tip/affirmation sprig repetition (same motif twice), "YOUR BABY THIS WEEK" label sits close to top of its area.
- **Scope honesty:** folder is static HTML, no package.json — no canonical test suite exists. Checks are one-off behavioral probes, not suite greens. Aesthetic sign-off = Jeff (granted for direction at v4).

## 6. Open items / next steps

1. ~~Review agents~~ **DONE 2026-09-12 ~16:16 MDT (deleg_30545c72):** design critique = minor-fixes · brand audit = COMPLIANT (zero banned violet, hero art proven pixel-exact crop of approved week-20 anchor, no logo touched, no pattern violations) · RN = buildable-with-adjustments (grain → pre-baked PNG tile, NOT Skia/WebView; contrast remediations mapped to themeTokens; hitSlop for stepper). Full outputs: `/Users/socializerender/.hermes/cache/delegation/subagent-summary-{0,1,2}-20260912_161603_*.txt` (0 = design critique, 1 = brand audit, 2 = RN).
2. **v5 applied 2026-09-12 (all review findings folded in):** a11y contrast fixes (#6A6B6C labels, #5A5885 chip, #4B2E42 stepper numeral + halo ring, #6E6C99 button/links, #A25C86/#5F7154 kickers, tab labels 10.5px); avatar gradient → flat #EDEAF6; data numerals → Quicksand semibold with "Banana" kept serif (`.v.word`); dead `.wobble` rule removed; content/tab mismatch fixed (tip now mom-focused: side-sleeping); legend text updated. Automated check: 15/15 PASS; vision review confirms all fixes visible, no regressions. Render: week-spine-v5.png (https://x0.at/7FC2.png).
3. **Deferred by design (v5 not applied, listed for next session):** custom Coverr micro-illustration set to replace the remaining lucide-style icon glyphs (design critic's HIGH item — inline SVGs are already hand-drawn conversions, but full watercolor-icon spec is a Coverr job); density trim (move action tiles off primary spine — needs Jeff's layout call); stepper monotony treatment (asymmetric active shape); hero inner-radius micro-tune (done: 9px) + optional 150px art width variant for comparison.
4. Next screens after Jeff go: week-detail, baby/birth tab states, Find-Your-Team — same treatment, same token discipline.
5. Coverr spot-illustration spec for empty states/section headers (COVERR-OPERATIONS-GUIDE workflow; Nano Banana 2; validation gates; Jeff approval).
6. RN implementation plan when Jeff green-lights build: grain = static PNG asset (~2-6KB, alpha-baked, `resizeMode:'repeat'`, pointerEvents none); fonts already in deps (useFonts); icons = react-native-svg paths (transformer installed); hero art → WebP re-encode (~100-200KB @2x); contrast + hitSlop remediations per RN agent's table (themeTokens-level fixes so they don't recur per screen); maxFontSizeMultiplier ≈1.4 on display header.
7. SESSION-SAVE updated: addenda #1–#3 above supersede §5–§6 verification/next-steps blocks.

## 7. Session history pointers

- Prior design-refresh session: @session:default/20260911_135809_debaa220 (accent-bar removal, coverr direction, html-mockups v1–v3)
- This session's key messages: 1548358553792684123 (analyze MP) → 1548374474573746197 (links) → 1548375585821040712 (reject MP visuals) → 1548376807164747880 (build mockup) → 1548436832902058086 (v2 refinements) → 1548437617887150121 (purple catch) → 1548438162156822590 (v4 anti-AI) → 1548443143387611147 (save + review agents)