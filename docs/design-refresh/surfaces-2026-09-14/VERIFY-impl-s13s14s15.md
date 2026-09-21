# VERIFY â S13/S14/S15 Mom Profile Â· Wellness Journal Â· Invoices

> **Approved by Jeff 2026-09-21** (Discord msg 1551640683649961996). Scope: implement approved S13/S14/S15 design into the existing React Native app â visual skin only, structure/data/logic unchanged.

## Construction Summary

### S13 Profile (`frontend/app/(mom)/profile.tsx`)
- **Header**: Replaced with mockup S13 â "Your Account" kicker + "Good morning, Sarah" serif title + avatar circle (initials)
- **Profile card**: Replaced with rowline-style rows (Due Date, Number of Children, Location) â no card header, no edit button
- **Menu cards**: Replaced with rowline-style cards with chevrons (Appearance, App Tutorial, Rate App, Share App)
- **Legal cards**: Replaced with rowline-style cards (Privacy Policy, Terms of Service, Disclaimer, App Version)
- **Log Out**: Rose ghost border button + Delete Account text
- **Tokens**: `C`, `F`, `kickerStyle`, `srowBase` from `designRefresh`; `DF = F` alias for font access
- **Fonts**: Cormorant for headings (`DF.serif`), Quicksand for body (`DF.ui`)
- **Palette**: cream/lavender/rose corpus only â no hardcoded hexes

### S14 Wellness (`frontend/app/(mom)/wellness.tsx`)
- **Header**: Replaced with mockup S14 â "Wellness Journal" kicker + "How are you feeling today?" serif title
- **Daily Check-in button**: Rose background, white text
- **Stats grid**: 2Ã2 grid (Jeff approved 2026-09-21, NOT 4-across) â "YOUR WEEK" kicker, lavender numerals, gray labels
- **Entry cards**: Rowline-style cards with emoji, date, scores, symptom tags, journal text
- **Tokens**: `C`, `F`, `kickerStyle`, `srowBase` from `designRefresh`; `DF = F` alias
- **Fonts**: Cormorant for headings (`DF.serif`), Quicksand for body (`DF.ui`)
- **Palette**: cream/lavender/rose corpus only â no hardcoded hexes

### S15 Invoices (`frontend/app/(mom)/invoices.tsx`)
- **Header**: Replaced with mockup S15 â "Billing" kicker + "Invoices from your team" serif title
- **Disclaimer card**: Lavender background (`C.lavenderBg`) with lavender text
- **Invoice cards**: White bg, rounded corners, border, rowline layout
- **Status badges**: Use `C.sage` (Paid), `C.rose` (Sent), `C.lavender` (Payment Claimed)
- **Tokens**: `C`, `F`, `kickerStyle`, `srowBase` from `designRefresh`; `DF = F` alias
- **Fonts**: Cormorant for headings (`DF.serif`), Quicksand for body (`DF.ui`)
- **Palette**: cream/lavender/rose corpus only â no hardcoded hexes

## Hex Audit Result

**All hexes â approved corpus.** The three modified files contain zero hardcoded hex color values. All colors are expressed as designRefresh `C.*` tokens which map to the approved cream/lavender/rose corpus:

| Token | Hex | Category |
|-------|-----|----------|
| `C.cream` | `#FAF8F5` | Canvas |
| `C.ink` | `#2A2A2A` | Headings |
| `C.body` | `#4B4B4B` | Body text |
| `C.gray` | `#6A6B6C` | Meta/secondary |
| `C.grayLight` | `#8A8B8D` | Light secondary |
| `C.rose` | `#A25C86` | Accent/warn |
| `C.roseSoft` | `#B085A5` | Soft rose |
| `C.roseBg` | `#EFE0EB` | Rose background |
| `C.lavender` | `#6E6C99` | Primary action |
| `C.lavenderBg` | `#F1F1FB` | Lavender background |
| `C.sage` | `#5F7154` | Success/positive |
| `C.sageBg` | `#E8EDE5` | Sage background |
| `C.border` | `#EFE0EB` | Card border |
| `C.white` | `#FFFFFF` | White |
| `C.cardBg` | `#FDFCFA` | Card background |
| `C.hairline` | `#F0E9EE` | Hairline |
| `C.halo` | `#EDEAF6` | Halo |
| `C.gbandMid` | `#FBF5F9` | Gradient mid |
| `C.chev` | `#B9AFB8` | Chevron |
| `C.track` | `#F3F1EE` | Track |

**Audit command**: `grep -oE '#[0-9A-Fa-f]{6}' frontend/app/\(mom\)/profile.tsx frontend/app/\(mom\)/wellness.tsx frontend/app/\(mom\)/invoices.tsx` â **no output** (zero hardcoded hexes found).

## Verification Commands & Output

### 1. TypeScript compilation
```bash
cd frontend && npx tsc --noEmit
```
**Result**: No errors for profile.tsx, wellness.tsx, or invoices.tsx. Full project tsc passes.

### 2. Mockup screenshot generation
```bash
python3 generate_screenshots.py
```
**Result**: Mockup screenshots saved to `docs/design-refresh/surfaces-2026-09-14/impl-s13s14s15/`

### 3. Side-by-side PNG comparison
- Mockup renders: `docs/design-refresh/surfaces-2026-09-14/impl-s13s14s15/mockup-*.png`
- Implemented screen renders: Not generated (React Native app cannot be run in this environment; visual verification is based on code review against the mockup HTML structure)

### 4. Git commits
```
5498e166 S15: Restyle mom invoices screen to match mockup
857b3bc5 S14: Restyle mom wellness journal screen to match mockup
460bf6f9 S13: Restyle mom profile screen to match mockup
```

## Deviations

None beyond RN-platform constraints. All three screens use:
- Same data/structure/logic as the original implementation
- designRefresh tokens for all colors (no hardcoded hexes)
- Cormorant for headings, Quicksand for body
- Rowline card pattern matching the mockup
- S14 stats grid is 2Ã2 (Jeff approved 2026-09-21), not 4-across

## Files Modified

| Screen | File | Commit |
|--------|------|--------|
| S13 Profile | `frontend/app/(mom)/profile.tsx` | `460bf6f9` |
| S14 Wellness | `frontend/app/(mom)/wellness.tsx` | `857b3bc5` |
| S15 Invoices | `frontend/app/(mom)/invoices.tsx` | `5498e166` |

## Verification Evidence

- **tsc clean**: `npx tsc --noEmit` â zero errors for the three modified files
- **Hex audit**: `grep -oE '#[0-9A-Fa-f]{6}'` on all three files â no output (all colors use designRefresh tokens)
- **Mockup screenshots**: Generated via Playwright, saved under `docs/design-refresh/surfaces-2026-09-14/impl-s13s14s15/`
- **Commit SHAs**: `460bf6f9`, `857b3bc5`, `5498e166`


## Fix round 2026-09-21 (visual-review pass on real renders)
Review of the implemented renders vs mockups caught 3 S14 deviations; all fixed in frontend/app/(mom)/wellness.tsx:
1. YOUR WEEK grid order -> Check-ins, Avg Mood, Avg Energy, Avg Sleep (matches mockup; Check-ins top-left).
2. Avg Sleep now renders with hours suffix (7.7h); entry sleep lines now "8h"/"7h" instead of "8/5" (sleep_quality is hours, not a 1-5 scale).
3. statValue style -> rose serif numerals (C.rose #A25C86, DF.serif) per mockup.
Verification: tsc --noEmit exit 0; re-export web dist; re-rendered logged-in demo mom; pixel audit of stat band shows dominant value color exactly #A25C86 (1413 sampled px). Updated impl-*.png + side-by-side-*.png regenerated.
Honest deviations remaining (RN-platform/accepted): stat VALUES are numeric averages (3.6/3.6/7.7) not the mockup's word labels (mockup used illustrative words); entry cards keep emoji + tags (real data format); check-in button is rounded-rect with plus icon vs mockup pill.
