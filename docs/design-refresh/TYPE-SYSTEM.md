# TJB Type System v1 — 2026-09-15

**Ask (Jeff, 09-15):** set H1/H2/H3 type tags so they propagate across the board.

**One scale, two canvases.** Mockups share `design-refresh/type-system.css`; production maps 1:1.

## The scale

| Tag | Face | Mockup (web 1280) | Mockup (app 390) | Production (web, fluid) | Production (app RN) |
|---|---|---|---|---|---|
| **H1** | Cormorant Garamond 700 | 52px / 1.08 | 26px / 1.15 | clamp(2.25rem, 5vw, 3.75rem) | 26 |
| **H2** | Cormorant Garamond 700 | 34px / 1.15 | 21px / 1.2 | clamp(1.75rem, 4vw, 2.75rem) | 21 |
| **H3** | Cormorant Garamond 600 | 22px / 1.2 | 17px / 1.25 | clamp(1.25rem, 3vw, 1.625rem) | 17 |
| Overline | Quicksand 700 caps | 11 / 2.8px ls | 10 / 2.2px ls | text-xs tracking-[.2em] | 10 |
| Body | Source Sans 3 (web) · Quicksand 500 (app) | 15.5 / 1.6 | 13.5 / 1.55 | text-base | 13.5 |
| Caption | same as body | 12.5 | 11 | text-sm | 11 |

**Accent word:** first `<em>` inside H1/H2 renders rose #B085A5 (established v5 pattern).

## Rules

1. **H1 once per page.** App screen title or web hero. No exceptions.
2. **H2 = section headers.** Every `<section>` gets exactly one.
3. **H3 = card titles, sub-blocks.** Never skip levels (no H2 → H3 jump inside an H3 block).
4. Web production values come from VISUAL-TOKENS §Type Scale — the mockup px sizes above are the 1280px artboard rendering of those clamps.
5. App screens use the same tags via themeTokens.typography — scale lands in app code when mockups are approved.

## Rollout

- `surfaces-2026-09-14/common.css` stays for legacy v2 mockups.
- New mockups link `../type-system.css` after `common.css`.
- v3 surfaces (S3 city, S4 homepage, S5 app screens) are built on this file.

## Changelog

- 2026-09-15 · v1 · Created per Jeff's propagate-the-type-tags directive.