# TJB New Design — Implementation Plan (2026-09-14)

**Job:** JOB-20260914-TJB-DESIGN-3SURFACES · **Status:** plan ready · **Jeff directive (msg 1549151122097311937):** illustrations where they make sense + growth motif (stems/leaves/flowers only) + keep custom icons; test the new design structure on 3 more prominent surfaces.

**Supersedes nothing — extends** SESSION-SAVE-2026-09-12-WEEK-SPINE.md (v5 dashboard, approved direction) and DESIGN-DIRECTION-ILLUSTRATION-FIRST.md §3b (growth-motif ruling, now promoted from card-level to design-wide).

---

## 1. What Jeff locked in today (2026-09-14)

1. **Illustrations where they make sense** — must look really good; v5's week-20 hero is "not the best of the illustrations we've done." Stay inside what we've already made (the approved pregnancy-series set).
2. **Growth motif, design-wide** — small plant graphics (stems, leaves, flowers growing) woven through every surface, tied to the mom's growth. **Nothing beyond simple vegetation.** Suggestions welcome within that boundary.
3. **Custom hand-drawn icons** — continue the v5 direction (organic sepia-contour SVGs, varied stroke, no geometric perfection).
4. **Validate the structure on 3 more surfaces** — one more app page, a city location page, one core web page — before committing to production rollout.

## 2. The fixed design language (system rules, same on all 4 surfaces)

**Palette** (never violates — verified against both token sources):
- App work: `frontend/src/constants/themeTokens.ts` — Lavender 500 **#8E8CB5** / 600 #6E6C99 / 300 #D5D3E8 / light #EDEAF6, Rose 500 #B87AA0, cream #FAF8F5, charcoal #2A2A2A. Website's #7C3AED violet is web-only and never enters app work.
- Web work: `assets/branding/VISUAL-TOKENS.md` v2.0 — same core family (lavender-500 #8E8CB5, rose-500 #B87AA0, cream #FAF8F5, sage-100 #E8EDE5, divider #EBE7E1). One palette across app + web. Confirmed: zero violet hex in website `src/` today.

**Type:** Cormorant Garamond (display serif) + Quicksand (body) — the v5 stack, now tested on web surfaces for fit.

**Illustrations:** ONLY the approved set — `frontend/assets/illustrations/pregnancy-series/` weeks 04–40 (37 files, Jeff-approved May 2026). No new art inside this test; Coverr pipeline available later for spot-illustrations if Jeff wants.

**Icons:** hand-drawn organic SVG strokes (the v5 icon family), extended per surface as needed — never lucide stock.

**Anti-slop treatments:** paper-grain overlay, no left-edge accent bars, no glassmorphism, no blue, varied stroke widths, curved imperfect paths.

## 3. Growth-motif system — design-wide spec (new)

**Vocabulary — 4 growth stages, simple vegetation only:**
| Stage | Form | Semantic use |
|---|---|---|
| 1 Sprout | small stem, 2 tiny leaves | beginnings — weekly tip, early weeks (4–14), first steps |
| 2 Leafing | longer stem, several leaves | in progress — mid pregnancy, in-progress states |
| 3 Budding | stem + closed bud | almost there — late weeks, near-complete states |
| 4 Blossom | open flower | arrival — birth content, completed states, celebrations |

**Style:** same hand-drawn watercolor-contour family as the icons — organic curved strokes, muted sage #7C8F6F/#E8EDE5 + lavender fills, no perfect geometry. Inline SVG (RN: react-native-svg).

**Placement rules (every surface):**
- Section markers (replacing repeated same-sprig: each section gets its correct stage)
- Progress made visible: **sprig grows with the pregnancy** — the app's progress ring and the web pregnancy-week pages graduate sprout→blossom by trimester (suggestion to evaluate: week stepper where each completed week sprouts a leaf)
- Empty states (a lone sprout, never a sad blank)
- Dividers/section breaks: delicate stem-lines instead of plain rules
- **Never:** animals, objects, fruit-as-decor (fruit art only in its data-slot for weeks 4–12), dense bouquets, vines wrapping UI, anything but stems/leaves/buds/blossoms

## 4. The 4 test surfaces

**S1 — App dashboard v6** (refine approved v5)
- Hero illustration upgrade: Jeff says week-20 isn't our best. Vision-scored alternates: **week-28 rated strongest (8.5/10)** of sampled set; will score 4–6 more (incl. week-16, week-36) and pick the strongest hero. Week-20 stays in the set; hero slot upgrades.
- Fix v5 review carry-overs: sprig repetition (tip gets sprout, affirmation gets bud — now rule §3), density trim (action tiles off primary spine — Jeff layout call at packet review), asymmetric active stepper.
- Motif added: growth-rail on stepper (completed weeks sprout leaves).

**S2 — App week-detail screen** (the app's core content page; session-save's "next screens" list)
- Full week page: large illustration treatment, For baby/mom/birth content in the v5 card system, week-local growth stage, hand-drawn icon set extended (back/toc/share).
- Shows the language works beyond the dashboard, on a scrolling content page.

**S3 — Web city location page** (live template: `src/pages/birth-support/[city].astro`, 187 cities in codebase)
- Highest-volume surface — the design must survive an SEO page. Test on one real live city.
- Illustration + sprig dividers in hero and trust sections; serif/lavender/cream treatment; lead-capture card in the new language. Zero content/SEO-structure changes — visual layer only.

**S4 — Web core page: homepage** (`src/pages/index.astro`)
- The brand's face — strongest test that the app language scales up to web.
- Hero with approved illustration, growth-motif section markers, serif display system, cream/lavender/rose discipline. Static mock first, no deploy.

## 5. Illustration audit (feeds S1/S2/S4 hero picks)

Quick vision pass scoring 6–8 of the 37 approved weeks on polish (line quality, palette fit, composition) → ranked hero candidates for each surface. Stays strictly inside the approved set. Output: 1-page audit note + picks.

## 6. Build order & verification loop (the loop that earned v5's "excellent")

1. **v6 + motif spec** first (it defines the vocabulary all others reuse) → render → automated checks (palette purge, fonts, motif presence, a11y contrast ≥ WCAG, hand-drawn path counts) → vision review → **packet 1 to Jeff** (dashboard side-by-side + motif sheet).
2. **S2 week-detail** → same loop → **packet 2**.
3. **S3 city + S4 homepage** (parallel) → same loop, plus desktop + mobile render widths for web → **packet 3**.
4. Jeff verdicts gate each packet; verdicts fold in like v5→v6.
5. After all 4 approved: RN implementation plan (grain PNG tile, react-native-svg, WebP re-encodes — per saved RN agent findings) + web implementation estimate. **No production code, no deploys in this phase** — static HTML mockups in this folder.

## 7. Working locations

- Mockups: `projects/TrueJoyBirthing-Mobile/docs/design-refresh/` (local live copy; this plan's home)
- App illustrations: `/Users/socializerender/Projects/TrueJoyBirthing-Mobile/frontend/assets/illustrations/pregnancy-series/`
- Web repo: `/Users/socializerender/Projects/truejoybirthing-website/`
- Render/verify: headless Chromium (camofox/playwright per 09-12 session), temp verify scripts deleted after each run
- Packets: PNG renders posted to the Discord thread + archived in the mockup folder