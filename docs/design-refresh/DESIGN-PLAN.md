# TJB Mobile App â Design Refresh Plan (v1.0-draft)

_Companion to `VISUAL-TOKENS.md` (web v2.0) and `STYLE-SPEC.md` (illustration v4.0)._
_This document ADJUSTS and EXTENDS the web token system into a mobile design plan. It does not fork a competing palette. It does not create, modify, or propose any logo, icon mark, or wordmark â `assets/branding/` is a protected zone._

---

## 1. Objective & Principles

**Objective.** Replace the generic "AI-slop" card patterns on the TJB mom dashboard (and later screens) with a warm, editorial, illustration-forward treatment that reads like a page from a premium pregnancy journal. The app should feel designed *for women*, specifically â calm, pretty, inviting â while staying 100% on the existing TJB brand system.

**Design north star (approved concept mockups).** Kenneth approved concept mockups at `docs/design-refresh/` (`concept-dashboard.png`, `before-after.png`, `illustration-sheet.png`). Their look, in words:

- Cards as pages from a premium pregnancy journal â cream and blush-rose card backgrounds, thin hairline borders, **no accent bars**, **no shadows**.
- Large elegant serif *italic* affirmation quotes in charcoal.
- Tiny uppercase rose eyebrow labels above each card's title.
- Small hand-drawn botanical spot illustrations (lavender sprigs, teacup, hands cradling belly, chamomile, knit booties) in muted sage/lavender/rose.
- Generous whitespace; rhythm comes from hairline dividers and alternating warm fills, not from elevation.

**Guiding principles (carried from VISUAL-TOKENS.md).**

1. **Editorial, not SaaS.** Separation comes from hairline rules and warm-fill alternation, not rounded boxes with shadows. (Tokens Â§Decision Log: "No card-heavy layouts.")
2. **Warmth and clarity.** No gradients, no shadows, no glassmorphism, no decorative blobs, no emoji-as-icons, no dark mode, no goddess energy, no AI photos of people.
3. **Illustration-first, but illustration supports text.** Icons support text; they never replace it. Every illustration is **Style A only** (Soft Flat Anatomical Sketch). Never mix Style A and Style B in one asset.
4. **CTAs are pills.** `border-radius: 9999px`. No square CTAs anywhere.
5. **Real over placeholder.** No placeholder photos, no fabricated testimonials, no lorem. If a spot illustration isn't ready, ship text-only â never a grey rectangle or an emoji stand-in.

### Banned-Pattern List (named, enforced in QA)

| # | Banned pattern | Why | Replaces with |
|---|---|---|---|
| B1 | **Left-edge accent bars** (`borderLeftWidth: 3â4` + `borderLeftColor`) | Reads as SaaS/alert chrome, not a journal page | Hairline full-border (`borderWidth: 1`, `#EBE7E1`) + warm fill alternation |
| B2 | **Icon plates** (tinted circle `borderRadius: 22/24` + `backgroundColor: color + '20'` + centered generic icon) | Generic "AI slop" visual; adds no meaning | Eyebrow label + optional Style A spot illustration |
| B3 | **Generic stock icons** (`bulb`, `heart`, `baby`, `receipt`, `document-text` used as the card's identity) | Templated, non-specific, off-brand tone | Botanical/symbolic Style A spot illustration or text-only eyebrow |
| B4 | **Uniform white cards** (every card `#FFFFFF` / `surface` with identical treatment) | Flat, monotonous, no editorial rhythm | Alternating `#FAF8F5` / `#FCF5F9` / `#F5F3EF` fills + hairline borders |
| B5 | **Drop shadows / elevation** (`shadowColor` + `shadowOpacity` + `elevation`) | Violates brand no-shadow rule; reads tech | `box-shadow: none` â hairline borders only |
| B6 | **Quicksand / non-brand fonts** | Not in the TJB type system | Cormorant Garamond + Source Sans 3 only |

---

## 2. Current-State Audit

Scope: `frontend/app/` and `frontend/src/` (excludes `node_modules`, `ios`, `android`). Method: `grep` for `borderLeftWidth`, `shadowColor`/`elevation`, tinted-circle plate patterns, and `quicksand`/`Quicksand`. Cross-validated by Kit's independent sweep.

### 2.1 Accent bars (`borderLeftWidth`) â 9 total

| File | Line | px | Color |
|---|---|---|---|
| `app/(mom)/home.tsx` | 694 | 3 | `colors.roleDoula` (rose) â Affirmation card |
| `app/(mom)/birth-plan-preview.tsx` | 429 | 3 | `colors.primary` (lavender) |
| `app/(mom)/messages.tsx` | 957 | 3 | `colors.primary` |
| `app/(mom)/messages.tsx` | 1244 | 3 | `colors.warning` |
| `app/(mom)/weekly-tips.tsx` | 450 | 4 | `colors.roleDoula` â Affirmation card |
| `app/(mom)/invoices.tsx` | 439 | 3 | `colors.primary` |
| `src/components/midwife/BirthRecordSection.tsx` | 1431 | 4 | (preview card) |
| `src/components/provider/ProviderClients.tsx` | 558 | 3 | `requestCard` |
| `src/components/provider/ProviderLeads.tsx` | 714 | 3 | `colors.primary` |

Of these, **5 are on mom-facing screens** (home, weekly-tips, messages Ã2, invoices, birth-plan-preview) and are the primary removal targets. The provider/midwife bars are out of pilot scope but listed for the later-screens rollout.

### 2.2 Icon plates (tinted circle + generic icon) â 8 files

A "plate" = a `<View>` with `borderRadius: 22/24` (44â48px circle), `backgroundColor: <brandColor> + '20'`/`'30'` opacity tint, wrapping a single Lucide-style icon. Confirmed in:

| File | Style key / marker | Note |
|---|---|---|
| `app/(mom)/home.tsx` | `weeklyIconContainer` (660), `actionRequiredIcon` (712), `actionIcon` (636, Ã21 total refs incl. key-actions grid) | bulb/heart/baby/receipt/document-text plates |
| `app/(mom)/weekly-tips.tsx` | `iconContainer` (429) | bulb/heart/baby plates (44Ã44 circle) |
| `app/(mom)/birth-plan.tsx` | tinted `primaryLight + '30'`/`'20'` circles (613, 721) | step/section icon plates |
| `app/(mom)/contraction-timer.tsx` | status plate `getPatternStatusColor() + '15'` (887) | status-color tinted circle |
| `app/(mom)/getting-started.tsx` | `stepNumber` plate `item.color + '20'` (151), `borderColor primary + '20'` (374) | step-number plates |
| `app/(mom)/my-team.tsx` | `roleBadge` (388), `pendingAvatar` (525), `provider_role` plates (253) | role-tinted circles |
| `app/(auth)/notification-permission.tsx` | `iconContainer` (179) | permission icon plate |
| `src/components/AppearanceSettings.tsx` | `iconContainer` (109) | settings icon plate |

Additionally `app/(mom)/messages.tsx` (665, 742, 749), `app/(mom)/invoices.tsx` (436), `app/(mom)/profile.tsx` (963, 1216), and several others use the same tinted-circle idiom for badges â these are badges, not content-card identity plates, and are addressed in the later-screens rollout, not the pilot.

### 2.3 Shadows / elevation â 32 line hits (16 `shadowColor` + 16 matching `elevation`)

All violate the brand no-shadow rule. Mom-facing examples:

| File | Line | shadowColor | elevation |
|---|---|---|---|
| `app/(mom)/provider-detail.tsx` | 377 / 379 / 381 | `#000` | 2 |
| `app/(mom)/contraction-timer.tsx` | 1443 / 1445 / 1447 | `colors.primary` | 8 |
| `app/(mom)/birth-plan-preview.tsx` | 317 / 319 / 321 | `#000` | 3 |
| `app/(mom)/getting-started.tsx` | 309 / 311 / 313 | `#4A3B4E` | 2 |

Full list also includes `app/(auth)/{welcome,login,signup,forgot-password,verify-email,mom-onboarding}.tsx` (shadowColor `#4A3B4E`, elevations 2â8), `src/components/SectionVideoGuide.tsx`, `src/components/provider/ProviderContracts.tsx`, `ProviderContractTemplates.tsx`, `src/components/LegalWebView.tsx`. **Action: set every `shadowColor: 'transparent'`, `shadowOpacity: 0`, `elevation: 0`** (or delete the keys) and rely on hairline borders per `Card.tsx`'s existing `'elevated' â border` behavior.

### 2.4 Quicksand usage â 0 (clean)

`package.json` (line 16) declares `@expo-google-fonts/quicksand` as a dependency, but there are **zero** `Quicksand` font-family usages anywhere in `app/` or `src/`. No code remediation needed; recommend removing the unused dependency in the cleanup step to avoid confusion. The app already loads Cormorant Garamond (500/600/700) + Source Sans 3 (400/400-italic/500/600/700) in `app/_layout.tsx` via `useFonts`. â ï¸ **Gap found:** no Cormorant *Italic* face is loaded, yet the editorial affirmation quote requires Cormorant italic. The `FONTS.heading`/`subheading` are 700/600 upright; `FONTS.bodyItalic` is Source Sans 3 Italic only. **Must add `CormorantGaramond_600SemiBold_Italic` (and ideally 500/700 italic) to `useFonts` and to `FONTS` in `theme.ts`** before the affirmation card ships.

---

## 3. Mobile Design Tokens (adjusted/extended from VISUAL-TOKENS.md)

These extend â not replace â the web tokens. Hex values are verbatim from `VISUAL-TOKENS.md` and `theme.ts`.

### 3.1 Card backgrounds (new mobile-only scale)

| Token | Hex | Use |
|---|---|---|
| `cardBgCream` | `#FAF8F5` | Default card fill (page-cream) |
| `cardBgBlush` | `#FCF5F9` | Affirmation / soft-emphasis card fill (rose-50) |
| `cardBgWarm` | `#F5F3EF` | Alternate card fill (cream-100) for rhythm |
| `cardBgSage` | `#E8EDE5` | Trust/proof card fill (sage-100) â e.g. recently-paid |
| `hairline` | `#EBE7E1` | 1px full border on every card (cream-200) |
| `hairlineSoft` | `#E6E4F4` | Lavender-200 hairline for lavender-tinted cards |

### 3.2 Type roles â screens (mapping Cormorant / Source Sans 3 to actual mobile surfaces)

| Role | Font | Weight | Size (px) | Line-h | Tracking | Screen use |
|---|---|---|---|---|---|---|
| Greeting | Cormorant Garamond | 700 | 24 (`fontXxl`) | 1.15 | -0.01em | Home header "Hello, {name}" |
| Card title / H3 | Cormorant Garamond | 600 | 20 (`fontXl`) | 1.15 | 0 | Birth-plan, selected-week title |
| Affirmation quote | **Cormorant Garamond Italic** | 600 | 22 (`fontXxl`â22) | 1.45 | 0 | Weekly Affirmation (charcoal `#2A2A2A`) |
| Eyebrow | Source Sans 3 | 600 | 12 (`fontXs`) | 1.4 | +0.08em | Tiny uppercase rose label above title |
| Body | Source Sans 3 | 400 | 16 (`fontMd`) | 1.7 | 0 | Tip text, baby-dev description |
| Caption / meta | Source Sans 3 | 400 | 14 (`fontSm`) | 1.5 | +0.01em | Week label, subtitles |
| Read-more | Source Sans 3 | 500 | 14 (`fontSm`) | 1 | 0 | "Read more / Learn more" link |
| Button label | Source Sans 3 | 600 | 15 (`0.9375rem`) | 1 | +0.02em | Pill CTAs |

Note: web uses `clamp()`; mobile uses fixed px from `SIZES`. Eyebrow tracking `+0.08em` and rose-500 (`#B87AA0`) color are copied verbatim from the web eyebrow spec.

### 3.3 Spacing (from web 4px base â mobile `SIZES`)

| Token | px | Use |
|---|---|---|
| `space-1` | 4 | Icon padding |
| `space-2` | 8 | Inline gaps |
| `space-3` | 12 | List gaps |
| `space-4` (md) | 16 | Card internal padding (pilot default) |
| `space-5` | 20 | Component gaps |
| `space-6` (lg) | 24 | Card padding (weekly-tips style) / section padding |
| `space-8` (xl) | 32 | Between cards / section margins |
| `space-12` (xxl) | 48 | Between sections |

**Card internal padding standard: 20px (`SIZES.lg`)** for content cards; 16px (`SIZES.md`) acceptable on the dense home feed. Vertical gap between cards: 12px (`SIZES.md`) on home, 16px (`SIZES.lg`) on weekly-tips.

### 3.4 Radii

| Token | px | Use |
|---|---|---|
| `radiusMd` | 12 | Card corners (kept from `theme.ts`) |
| `radiusFull` | 9999 | All CTAs, pills, avatar circles |
| `radiusSm` | 8 | Inline tags, size badges, buttons-as-tags |

Cards use `radiusMd` (12px) â soft, journal-like, but **not** a heavy rounded-lg. No `radiusLg` (16) on cards.

---

## 4. Component Specs â Three Dashboard Content Cards

All three share a base "JournalCard" treatment:
- `backgroundColor`: per-card fill (Â§3.1)
- `borderWidth: 1`, `borderColor: #EBE7E1` (hairline) â **no accent bar, no shadow**
- `borderRadius: 12` (`SIZES.radiusMd`)
- `padding: 20` (`SIZES.lg`)
- Internal vertical rhythm: eyebrow (12px rose caps) â title (Cormorant 20) â body â read-more affordance
- Optional Style A spot illustration in a reserved slot (see Â§4 illustration slot specs)

### 4.1 Affirmation Card (replaces `home.tsx` Affirmation `borderLeftWidth:3` + heart plate)

- **Layout:** Full-width card, `backgroundColor: #FCF5F9` (blush). Top: tiny uppercase rose eyebrow `WEEKLY AFFIRMATION` (12px, `#B87AA0`, tracking +0.08em). Below: the affirmation rendered as a **large Cormorant Garamond italic quote, 22px, charcoal `#2A2A2A`, line-height 1.45**, wrapped in elegant quotation marks. No icon plate.
- **Typography:** Quote uses the *new* `FONTS.headingItalic` (Cormorant 600 Italic) â must be added to `useFonts` (see Â§2.4 gap).
- **Illustration slot:** Small Style A spot (e.g. "hands cradling belly" or "chamomile sprig") 48Ã48, `tint` = rose `#B87AA0`, placed top-right corner, `marginBottom: 12`.
- **Icon treatment:** The `heart` icon plate is **removed**. If a glyph is needed for semantics, a 1.5px stroke heart at 16px in rose may sit inline beside the eyebrow â never in a tinted circle.
- **Read-more:** none (affirmations are terminal content). Card is non-tappable or tappable to weekly-tips at implementer discretion.

### 4.2 Weekly Tip Card (replaces `home.tsx` Tip `weeklyIconContainer` bulb plate + `weekly-tips.tsx` `iconContainer` bulb plate)

- **Layout:** Full-width card, `backgroundColor: #FAF8F5` (cream) with hairline border. Eyebrow `WEEKLY TIP` (rose 12px caps) â title? (optional short title in Cormorant 20) â body tip text (Source Sans 3 16px, `#6A6B6C`, line-height 1.7, max 4 lines).
- **Illustration slot:** Small Style A spot (e.g. "teacup" or "lavender sprig") 48Ã48, tint lavender `#8E8CB5`, top-right.
- **Icon treatment:** `bulb` plate **removed**. The bulb carries no journal meaning; replace with the botanical spot or drop entirely.
- **Read-more affordance:** `TouchableOpacity` row, left-aligned, `marginTop: 12`: text `Read more` in Source Sans 3 500, 14px, color `#8E8CB5` (lavender), + `chevron-forward` 16px lavender. Tappable â `/(mom)/weekly-tips`.

### 4.3 Baby Development Card (replaces `baby` icon plate; keeps the existing Style A pregnancy illustration)

- **Layout:** Full-width card, `backgroundColor: #F5F3EF` (warm cream-100) for rhythm, hairline border. Eyebrow `BABY DEVELOPMENT` (rose 12px caps) â week line `Week {n}` (Source Sans 3 14px, lavender `#8E8CB5`) â **existing Style A pregnancy illustration** (keep `getPregnancyIllustration`) rendered `width: 100%`, `height: 220`, `resizeMode: contain`, `borderRadius: 12`. â title (Cormorant 20) â description (Source Sans 3 16px, `#6A6B6C`).
- **Illustration slot:** This card's hero is the **anatomical Style A illustration** (weeks 4â40). That is the primary illustration and stays. A small botanical spot (e.g. "knit booties") 48Ã48 may sit beside the eyebrow for warmth.
- **Icon treatment:** `baby` plate **removed** (the anatomical illustration now carries the visual).
- **Read-more affordance:** `Learn more` row identical to Â§4.2, lavender, â `/(mom)/weekly-tips`.
- **Fallback:** If `hasPregnancyIllustration(week)` is false, ship the text-only card (eyebrow + week + title + description) with **no** placeholder box and **no** `image-outline` icon (per placeholder-safety rule). Do not render `babyDevImagePlaceholder` with an icon.

### 4.4 Shared "read-more" affordance spec

- Component: `ReadMoreLink` (new small component or inline). Row: `flexDirection: row`, `alignItems: center`, `gap: 4`.
- Text: `fontFamily: FONTS.bodyMedium`, `fontSize: 14`, `color: colors.primary`.
- Icon: `chevron-forward`, `size: 16`, `color: colors.primary`.
- Hit target â¥ 44px (`SIZES.touchMin`): wrap in `TouchableOpacity` with `minHeight: 44`, `justifyContent: center`.
- No underline, no background. Sentence case, no arrows (â), matches brand CTA copy rules.

---

## 5. Illustration System

**Rule:** App illustrations = **Style A only** (Soft Flat Anatomical Sketch). Style B (watercolor) is reserved for the education series and must never appear in the app. Botanical spot illustrations are a *simple-line* extension of Style A (per STYLE-SPEC Â§6 "Simple Line Style Prompt Architecture") â 1.5px strokes, lavender/rose/charcoal line color, **no fills, no shading, no texture**, cream `#FAF8F5` background.

### 5.1 Spot-illustration set (botanical / symbolic, hand-drawn)

Generated as simple-line Style A assets (1:1, ~48â64px render). Proposed set for the dashboard + later screens:

| Name | Tint | Primary use |
|---|---|---|
| `lavender-sprig` | `#8E8CB5` | Weekly Tip |
| `teacup` | `#B87AA0` | Weekly Tip (alt) / wellness |
| `chamomile` | `#B87AA0` | Affirmation |
| `hands-cradling-belly` | `#B87AA0` | Affirmation (alt) |
| `knit-booties` | `#A8B5A0` (sage) | Baby Development |
| `envelope` (line) | `#8E8CB5` | Messages |
| `receipt-line` | `#8E8CB5` | Invoices |
| `document-line` | `#8E8CB5` | Birth-plan-preview / contracts |

These replace the generic `bulb`/`heart`/`baby`/`receipt`/`document-text` plates. They are decorative support only â every card still has its text eyebrow + title.

### 5.2 Style A spot-illustration prompt architecture (Coverr / Gemini, 3-layer)

Per STYLE-SPEC Â§6, every prompt has three layers. For **botanical spot illustrations** use the Simple Line variant:

**Layer 1 â Style Anchor (identical every time):**
```
Simple line illustration on cream (#FAF8F5) background.
1.5px strokes, rounded caps and joins.
Lavender (#8E8CB5) for structural lines, rose (#B87AA0) for soft accents,
charcoal (#2A2A2A) only for heavy emphasis.
No fills, no shading, no texture, zero gradient.
Hand-drawn editorial botanical sketch, calm and warm.
```

**Layer 2 â Subject (per illustration):**
```
[SUBJECT] â e.g., "A single lavender sprig with three budding tips and two leaves."
MUST NOT INCLUDE: text, labels, branding, people, hearts-as-symbol, gradients,
shadows, or any Style B watercolor texture.
No background fill other than solid cream (#FAF8F5).
```

**Layer 3 â Format:**
```
1:1 square crop, transparent or cream background, suitable for 48â64px mobile render.
```

**For the anatomical Baby Development hero** (weeks 4â40), keep the existing **Style A pregnancy-series** assets (already generated via Gemini, weeks 4â40). Do **not** regenerate through Coverr. If a new week asset is needed, use the Style A Gemini anchor from STYLE-SPEC Â§6 verbatim (local-color outlines `#A67D6D`/`#7A5A6A`/`#5A3E4E`, zero texture, `#F5F2EC` bg).

### 5.3 Rotation rules

- One spot illustration per card, assigned by **card type** (not randomized): Tipâlavender-sprig/teacup, Affirmationâchamomile/hands-cradling-belly, Baby Devâknit-booties. Keeps meaning stable (no "random icon" slop).
- For content that varies by week (Baby Dev), the **anatomical** illustration rotates by week (existing behavior); the small botanical spot stays fixed to the card type.
- Never place two illustrations in one card unless one is the anatomical hero (Baby Dev) and the other is the tiny eyebrow spot.
- All new spot assets pass STYLE-SPEC Gate 1 (style match, warm/cool logic, no text, calm tone). Anatomical assets additionally pass Gate 2 (anatomy accuracy).

---

## 6. Rollout Plan

### 6.1 Pilot scope (this plan's implementation target)

Three dashboard content cards on the mom home screen + their weekly-tips counterparts:
1. **Affirmation card** â `app/(mom)/home.tsx` (remove `affirmationCard` `borderLeftWidth:3` + heart plate) and `app/(mom)/weekly-tips.tsx` (remove `affirmationCard` `borderLeftWidth:4` + heart plate).
2. **Weekly Tip card** â `home.tsx` (remove `weeklyIconContainer` bulb plate) and `weekly-tips.tsx` (remove `iconContainer` bulb plate).
3. **Baby Development card** â `home.tsx` (remove `weeklyIconContainer` baby plate, keep anatomical illustration) and `weekly-tips.tsx` (remove `iconContainer` baby plate).

Pilot also requires: add Cormorant Italic to `useFonts` + `FONTS` (Â§2.4); introduce `JournalCard` base style + `ReadMoreLink`; strip shadows on the four mom-facing shadow files listed in Â§2.3.

### 6.2 Later screens (post-pilot, same system)

| Screen | Pattern to remove | New treatment |
|---|---|---|
| `app/(mom)/messages.tsx` | accent bars (957, 1244), tinted badges | hairline-bordered journal rows, sage/lavender hairline by state |
| `app/(mom)/invoices.tsx` | accent bar (439) | cream card, hairline, rose eyebrow `INVOICE` |
| `app/(mom)/birth-plan-preview.tsx` | accent bar (429) + shadow (317) | blush card, hairline, no shadow |
| `app/(mom)/my-team.tsx`, `birth-plan.tsx`, `getting-started.tsx`, `contraction-timer.tsx` | icon plates | eyebrow + spot illustration or text-only |
| `app/(auth)/*` (welcome, login, signup, etc.) | shadows (elevation 2â8) | `elevation: 0`, hairline borders |
| `src/components/provider/*`, `midwife/BirthRecordSection.tsx` | accent bars (558, 714, 1431) | hairline borders (provider rollout, lower priority) |

### 6.3 QA checklist (gate before Kenneth review)

- [ ] Zero `borderLeftWidth` on any mom card (grep returns 0 in pilot files).
- [ ] Zero `shadowColor`/`elevation` > 0 on mom-facing screens (Â§2.3 list = 0).
- [ ] No tinted-circle icon plate (`borderRadius: 22/24` + `color + '20'` + icon) on pilot cards.
- [ ] Every pilot card has: hairline `1px #EBE7E1` border, `radiusMd` 12, warm fill from Â§3.1, rose eyebrow, Cormorant title.
- [ ] Affirmation quote renders in Cormorant Italic (font actually loads â verify no `fontFamily` fallback to System).
- [ ] Baby Dev card: anatomical illustration retained; placeholder box + `image-outline` icon removed when no asset.
- [ ] Read-more links: lavender, 44px hit target, sentence case, no arrows.
- [ ] No Quicksand; only Cormorant Garamond + Source Sans 3 present.
- [ ] No logo/icon-mark/wordmark created or modified anywhere.
- [ ] Spot illustrations are Simple-Line Style A (1.5px, cream bg, no fill/shadow); anatomical are Style A only.

### 6.4 Kenneth approval items (must be signed off before build)

1. Botanical spot-illustration set (Â§5.1) â which 8 make the cut, which tints.
2. Card fill assignment (cream vs blush vs warm vs sage per card type).
3. Whether Affirmation card is tappable (â weekly-tips) or terminal.
4. Cormorant Italic addition to the app font bundle (binary-size / loading-time tradeoff).
5. Pilot-only vs. include messages/invoices/birth-plan-preview in first build.
6. Removal of unused `@expo-google-fonts/quicksand` dependency.

> Per workspace rules, Kenneth must approve any *new app feature*. This plan introduces no new features â it refactors existing cards. The spot illustrations are asset additions within the approved Style A system, not new functionality. The Cormorant Italic font load is a token/asset change requiring his sign-off (item 4).

---

## 7. Differences-from-Current-State Summary

| Old pattern (file:line) | New pattern | File touched |
|---|---|---|
| `home.tsx:694` `borderLeftWidth:3` + `roleDoula` (Affirmation) | Hairline `1px #EBE7E1` + blush `#FCF5F9` fill + rose eyebrow + Cormorant italic quote | `home.tsx` |
| `weekly-tips.tsx:450` `borderLeftWidth:4` + `roleDoula` (Affirmation) | Same as above (blush card, no bar) | `weekly-tips.tsx` |
| `home.tsx:328` `weeklyIconContainer` bulb plate (Tip) | Eyebrow `WEEKLY TIP` + lavender-sprig spot + Read-more link | `home.tsx` |
| `weekly-tips.tsx:196` `iconContainer` bulb plate (Tip) | Same (eyebrow + spot + read-more) | `weekly-tips.tsx` |
| `home.tsx:270` `weeklyIconContainer` baby plate (Baby Dev) | Eyebrow `BABY DEVELOPMENT` + retained anatomical illustration + knit-booties spot | `home.tsx` |
| `weekly-tips.tsx:233` `iconContainer` baby plate (Baby Dev) | Same (eyebrow + anatomical illustration + spot) | `weekly-tips.tsx` |
| `home.tsx:356` `weeklyIconContainer` heart plate (Affirmation) | Removed; chamomile/hands-cradling-belly spot replaces it | `home.tsx` |
| `weekly-tips.tsx:209` `iconContainer` heart plate (Affirmation) | Removed; botanical spot replaces it | `weekly-tips.tsx` |
| Uniform white (`surface`/`#FFFFFF`) cards | Alternating `#FAF8F5` / `#FCF5F9` / `#F5F3EF` / `#E8EDE5` fills | `home.tsx`, `weekly-tips.tsx`, `Card.tsx` |
| `shadowColor`/`elevation` on `provider-detail.tsx:377`, `contraction-timer.tsx:1443`, `birth-plan-preview.tsx:317`, `getting-started.tsx:309` (mom-facing) | `shadowColor: transparent`, `shadowOpacity: 0`, `elevation: 0` â hairline borders only | 4 files |
| Source Sans 3 upright affirmation (`home.tsx:697` `bodyItalic`) | **Cormorant Garamond Italic 600, 22px, charcoal** (new font load) | `app/_layout.tsx`, `theme.ts` `FONTS` |
| `babyDevImagePlaceholder` + `image-outline` icon when no asset (`home.tsx:296`, `weekly-tips.tsx:259`) | Text-only card, no placeholder box/icon (placeholder-safety rule) | `home.tsx`, `weekly-tips.tsx` |
| `@expo-google-fonts/quicksand` dependency (unused, 0 usages) | Removed from `package.json` (cleanup) | `package.json` |

---

## Appendix A â Token reference (verbatim sources)

- Colors: `VISUAL-TOKENS.md` Â§Colors (cream `#FAF8F5`, blush-rose `#FCF5F9`=rose-50, warm `#F5F3EF`=cream-100, hairline `#EBE7E1`=cream-200, lavender `#8E8CB5`, rose `#B87AA0`, sage `#A8B5A0`/`#E8EDE5`, charcoal `#2A2A2A`, gray `#6A6B6C`).
- App COLORS/FONTS/SIZES: `src/constants/theme.ts` (primary `#8E8CB5`, secondary `#B87AA0`, roleDoula `#8E8CB5`, accent `#A8B5A0`, background `#FAF8F5`, surface `#FDFCFA`, subtle `#F5F3EF`, border `#E6E4F4`, textPrimary `#2A2A2A`, textSecondary `#6A6B6C`; SIZES radiusMd 12, radiusFull 9999, touchMin 44; FONTS heading CormorantGaramond_700Bold, body SourceSans3_400Regular).
- Illustration: `STYLE-SPEC.md` v4 (Style A Soft Flat Anatomical Sketch; Simple Line prompt architecture Â§6; warm/cool split; zero texture; no text in image; Gate 1 + Gate 2 validation).

## Appendix B â Protected-zone statement

No logo, icon mark, or wordmark was created, modified, or proposed in this document. `assets/branding/` was not read, written, or referenced for asset generation. All illustration guidance reuses the approved Style A system only.

---

**Version:** v1.0-draft
**Date:** 2026-09-11
**Author:** Kit
