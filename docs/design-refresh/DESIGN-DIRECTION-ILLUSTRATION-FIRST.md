# TJB App Design Direction — Illustration-First (supersedes MP visual direction)

**Date:** 2026-09-12 · **Decision by:** Jeff · **Status:** ACTIVE DIRECTION

---

## Jeff's verdict (2026-09-12, Discord)

On the My Pregnancy visual direction: **rejected.** "Too cartoony. The blue and the design is so much further from what we've designed." Keep the TJB palette (pink + purple primary), double down on OUR illustrated style — the gestation series and the PDF illustrations we already generated.

What we DO take from My Pregnancy: the **flow and structure lessons** — what the app provides and what people love about it. That remains valid input for UI/flow changes.

---

## The design foundation we're doubling down on

### 1. The gestation illustration series — our hero asset
`assets/illustrations/pregnancy-series/` — **all 37 weeks complete and Jeff-approved** (May 2026):

- **Weeks 4–12 (size-reference phase):** single food item, watercolor + bold hand-drawn contour line, warm cream background (#FAF0DC), muted naturalistic palette. Strawberry (wk10), blueberry (wk7), lime (wk12)…
- **Weeks 13–40 (cross-section phase):** baby in uterus, side view — lavender/lilac uterus, peachy-pink fetus, sepia torso contour, cream background. Anchor: week-20.
- Format: 1:1 square, 1600×1600 PNG (WebP 90 for delivery).

**These are app-ready today.** Every week screen in the app gets its real illustration as the hero visual — the same job My Pregnancy does with its 3D fetus, done in OUR style. No new generation needed for the core loop.

### 2. The Coverr generation system — for everything else
Skills + docs intact and current:
- **Platform manual:** `assets/illustrations/COVERR-OPERATIONS-GUIDE.md` (v1.0, Aug 18) — UI layout, model selection (Nano Banana 2, 400 cr/img), aspect ratios, workflow quick-reference
- **Style spec:** `assets/illustrations/STYLE-SPEC.md` (v4) — Style B watercolor DNA, 3-layer prompt architecture
- **Ready prompts:** `assets/branding/tjb-coverr-prompt-templates-v2.md` — hardened prompts (cardinal movements etc.)
- **Validation:** `tjb-illustration-validation` skill — two-gate QC (style + anatomy)
- Plan: Coverr Pro, ~312 Nano Banana 2 images/month

New micro-illustrations for UI (icons, spot art, empty states) get generated through this exact pipeline — same style anchor, same validation gates, Jeff approval before ship.

### 3b. Growth-motif system (Jeff ruling, 2026-09-12)

The botanical sprig next to Weekly Tip / Weekly Affirmation is not decoration — it's a **growth metaphor tied to the baby growing**. Rules:
- Sprigs must be **simple vegetation only** — stems, leaves, buds, blossoms. No other object categories wander in.
- They progress through **growth stages** (young sprout → leafing → budding → blossom), not one repeated motif. Dashboard uses sprout (tip) + budding blossom (affirmation); deeper screens continue the progression.
- Style = same hand-drawn watercolor contour family as the icons: organic curved strokes, muted sage/lavender fills, no perfect geometry.

### 3c. Food-comparison data — all 3 trimesters (structure confirmed)

Jeff asked whether the "size of a banana" data row works beyond the first trimester (fruit art only exists for weeks 4–12). Answer from `assets/illustrations/pregnancy-series/week-by-week-baby-descriptions.md`: **every week 4–40 has a food/size comparison** — peach, lemon, apple, avocado, pear (13–19), banana, carrot, pomegranate, grapefruit, corn, zucchini, cauliflower, coconut, butternut squash, cabbage, jicama, pineapple, honeydew (20–40), with cm lengths and the week-20 CRL→crown-heel measurement note. The dashboard structure (cross-section art + food name in the data row) holds for all three trimesters as-is. Weeks 4–12 additionally show the fruit AS the artwork (size-reference phase). Optional later: small hand-drawn fruit spot-illustrations for 13–40 via Coverr — not needed for the dashboard pattern.

### 3. The palette — SOURCE OF TRUTH CORRECTION (2026-09-12)
Jeff caught the mockup using bright violet #7C3AED. **For MOBILE APP work, tokens come from `frontend/src/constants/themeTokens.ts`**, not the website token set:
- Lavender 500 (app primary): **#8E8CB5** — the soft muted purple Jeff expects
- Lavender 600: #6E6C99 · Lavender 300: #D5D3E8 · light surfaces: #EDEAF6
- Rose 500: #B87AA0 · cream canvas: #FAF8F5 · charcoal: #2A2A2A
- The website's #7C3AED violet is web-only. Never carry it into app-facing design.

Cream backgrounds, dusty rose + muted lavender primaries, sage accents. Per `tjb-design` skill tokens for web; themeTokens.ts for the app. The MP sky-blue world is explicitly out.

---

## Flow lessons we ARE taking from My Pregnancy (structure, not skin)

| Lesson | TJB implementation |
|---|---|
| Week-spine navigation | Dashboard organized around "Your week N"; weekly tip/affirmation/article bind to current week; browsable week stepper |
| Week hero illustration | Each week's screen led by ITS approved gestation illustration (the fruit for wks 4–12, the cross-section for 13–40) |
| One idea per card | Single-focus cards; no multi-topic blobs; kill leftover accent-bar patterns |
| Baby ↔ Mom duality | "For baby" / "For mom" tabs (+ our third lane: "For your birth") |
| Progress made tangible | Rose circular progress ring; days-to-due-date card |
| Weekly rhythm | Content in weekly portions — never a dump; creates the daily-open habit |
| Zero-pressure trust | "Built with doulas · judgment-free" rendered as calm cards, not fine print |

**Explicitly NOT adopted:** blue palette, cartoony 3D fetus renders, rounded-toy typography feel, weight-centric tracking.

---

## Next step

Rebuild the dashboard mockup: **cream canvas, rose/lavender cards, the real week-20 cross-section as hero art, week stepper, baby/mom/birth tabs, rose progress ring** — then side-by-side against the current dashboard for Jeff review. Illustration-first, our palette, zero blue.