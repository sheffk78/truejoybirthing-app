# Space & Photo Audit — TJB Mobile Frontend
**Date:** 2026-10-01 · **Repo:** `TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/frontend` · **Mode:** READ-ONLY audit + plan (no files edited)
**Scope:** `app/**` (82 screens via expo-router groups `(mom)/(auth)/(doula)/(midwife)/(lactation)/(provider)/(admin)` + root), photo components (`src/components/mom/HBand.tsx`, `OnboardingWalkthrough.tsx`), photo constants (`src/constants/designRefresh.ts` → re-exported via `src/constants/corpus.ts:153-158`), website imagery pool (`truejoybirthing-website/public/images`, wired via `src/data/cities.ts`).

---

## Part 1 — Vertical space / padding audit

Spacing token scale (`src/constants/theme.ts:70-78`): `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48 · xxxl 64`.
**Flag thresholds (per task):** >24px padding between sections; >32px photo-band-to-content gap.
**Method:** regex sweep of every `(padding|margin)(Top|Bottom|Vertical)` in all `app/**/*.tsx`, cross-read of the style blocks around each hit. Line numbers are exact as of commit `d504a2b0` (2026-10-01).

### 1a. Jeff's flag — `app/(mom)/home.tsx`

**Root cause found.** Two things stacked when the photo band was live (pre-`d504a2b0` commit `d504a2b0^`):

| Construction (pre-removal) | Value | Problem |
|---|---|---|
| `SafeAreaView edges={['top']}` + `scrollContent: { padding: SIZES.md }` (line 513) | 16px cream gap **above** the full-bleed band | Band never sat flush under the status bar; the 16px container padding framed it on top/left/right — the band only "bled" horizontally via `bandWrap: { marginHorizontal: -SIZES.md }` (line 517). Contrasts with appointments/weekly-tips, which use `marginTop: -insets.top` for true full-bleed. |
| `header: { paddingBottom: 4, marginBottom: SIZES.md(16) }` (lines 520-525) | 20px under the veil rows | Fine on its own, but with `mainCard marginBottom 16` the greeting→card→card rhythm read as ~20/16/16 dead strips, amplified visually by the 190+insets band. |

**Current state (band removed in `d504a2b0`):** the above gap is gone; remaining space outliers on home:

| Location | Value | Flag |
|---|---|---|
| `actionsGrid: { marginBottom: SIZES.lg }` (line 668) + `MomFeedSection` container `marginTop: SIZES.lg` (`src/components/provider/MomFeedSection.tsx:142`) | **24 + 24 = 48px compounding gap** between the "Key Actions" grid and the Research Feed | ⚠️ Yes — margins stack in Yoga (no collapse). One of the two should go (`actionsGrid` is the last thing before the feed). |
| `scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl(48) }` (lines 509-512) | 48px scroll-end | OK (scroll-end clearance above tab bar; batch-1 convention). |
| `header: { paddingBottom: 4, marginBottom: 16 }` (lines 513-518) + stale comment "padding-top set inline from safe-area insets" — **no inline paddingTop is applied anymore** (line 514 comment is dead since band removal) | — | Cosmetic: stale comment invites a future double-inset regression. |
| Section title rhythm: `sectionTitle marginBottom: SIZES.md(16)` (line 662), cards `marginBottom: 8` | — | Consistent; not flagged. |

### 1b. Full-sweep outlier tables

**Band screens — photo-band-to-content gap (threshold >32px):**

| Screen | Band construction | Band→title gap | Band→content | Verdict |
|---|---|---|---|---|
| `(mom)/appointments.tsx` | 168+insets, `marginTop:-insets.top`, overlay header `paddingTop: insets.top+24` (lines 368-370) | 0 (title on veil — approved S7) | 16px (`sect marginTop`) | ✅ Reference implementation |
| `(mom)/weekly-tips.tsx` | same approved pattern (lines 102-104) | 0 | 14px (`tabContainer marginTop`) | ✅ |
| `(mom)/my-team.tsx` | 168+insets, **no `marginTop:-insets.top`**, header *after* band (`paddingTop:10`) (lines 215-217) | 10px | ~16px to first section | ⚠️ Band is ~59px taller than the approved pattern's visual height (insets added but never cancelled while `SafeAreaView edges=['top']` already consumed the inset) → whole screen pushed down ~1 notch value; header anatomy differs from appointments/tips. |
| `(mom)/messages.tsx` | same as my-team (lines 604-605), plus `scrollContent: { padding: SIZES.md }` wraps the **band** itself (line 1042, used by the list ScrollView at 597) | 10px | ~16px | ⚠️ Same inset duplication **+ a 16px cream frame above the band** (container padding applies above the first child HBand) → inconsistent with my-team's flush band and with the approved veil pattern. |
| `(mom)/getting-started.tsx` | 150px band **inside a hairline card**, mid-content (line 144) — header text sits *above* the card | n/a | 0px card→section (sectionTitle mb 8) | ✅ Different anatomy by design (batch-1 anchorCard). |

**Section-to-section paddings >24px:**

| Screen:line | Style | Value | Flag |
|---|---|---|---|
| `(mom)/getting-started.tsx:313` | `section: { marginBottom: SIZES.xl }` ×3 (Quick Start / Pro Tips / Need More Help) | **32px** between every section | ⚠️ >24 flag — 3 sections × 32px = 96px of trailing air; drop to `lg` (24) or `md` (16)+title marginTop 8 |
| `(mom)/home.tsx` actionsGrid→feed compounding (above) | 24+24 | **48px** | ⚠️ |
| `(auth)/login.tsx:266` | `headBlock marginBottom: SIZES.xl` | 32px | ⚠️ (mild — single gap under the logo/head block) |
| `(auth)/signup.tsx:372,388` | two `marginBottom: SIZES.xl` stacks | up to 32+32 | ⚠️ (auth form vertical rhythm) |
| `(auth)/mom-onboarding.tsx:414,583` · `(auth)/doula-onboarding.tsx:318` · `(auth)/midwife-onboarding.tsx:358` · `(auth)/lactation-onboarding.tsx:366` | `marginBottom: SIZES.xl` after hero/head blocks | 32px | ⚠️ (same family as login) |
| `(mom)/marketplace.tsx:1126` | `profileHeader marginBottom: SIZES.xl` (provider sheet) | 32px | ⚠️ (mild) |
| `(mom)/pro-feedback.tsx:392` | `marginBottom: 32` | 32px | ⚠️ (mild) |
| `(mom)/contraction-timer.tsx:1391` | `marginBottom: 32` (empty text) | 32px | ⚠️ (mild, tool screen) |

**Scroll-end / empty-state outliers (paddingBottom/paddingVertical ≥ 60):**

| Screen:line | What | Value | Flag |
|---|---|---|---|
| `(mom)/appointments.tsx:503` | Request-Appointment modal `contentContainerStyle={{ paddingBottom: 120 }}` | **120px** | ⚠️ Largest in app; modal has its own header + keyboard, 120 is dead-air → 48-64 suffices |
| `(mom)/birth-plan-preview.tsx:356` | `scrollContent paddingBottom: 100` | **100px** | ⚠️ shared-viewer padding, no tab bar → 48 |
| `(mom)/weekly-tips.tsx:492` | `emptyState: { paddingVertical: 80 }` | **160px** total empty box (postpartum tab) | ⚠️ → 48 matches appointments' emptyState |
| `(mom)/weekly-tips.tsx:353` | `scrollContent paddingBottom: 60` | 60px | mild (tab bar clearance) |
| `(auth)/notification-permission.tsx:176` | `content paddingTop: 60` | 60px | mild (single-purpose screen) |
| `(mom)/contraction-timer.tsx:1367,1713` | `emptyContainer padding: 40` · `emptyHistoryText paddingVertical: 40` | 40px | mild (tool screens) |

**Baseline convention (counted, not defects):** `paddingBottom: SIZES.xxl(48)` scroll-end padding appears on **20 screens** (all `(mom)` content screens + provider client-birth-plans ×2 + midwife visits/birth-summaries + admin ×3). This is the intentional batch-1 clearance above the floating tab bar — keep as-is for consistency; only the *nested* cases (modal 120 / viewer 100) above are real outliers.

**Screens that are already tight (no flags):** all doula/midwife/lactation/provider route screens route through `ProviderDashboard` etc. (`src/components/**`) — max vertical found was the standard xxl baseline; `(mom)/wellness`, `postpartum`, `timeline`, `invoices`, `profile`, `share-birth-plan`, `invite-provider` all within convention.

### 1c. Priority fixes (space)

1. **home.tsx:** drop `actionsGrid { marginBottom: SIZES.lg }` → feed sits 24px closer (kills the 48px stack). Remove the stale line-514 comment.
2. **my-team + messages:** adopt the appointments pattern (`marginTop:-insets.top` + band `168+insets`) or drop `insets.top` from height — recovers ~59px of band height and unifies header anatomy; in messages, exclude the HBand from the 16px scrollContent padding (negative horizontal/top margin or move band outside `scrollContent`) to kill the cream frame.
3. **getting-started:** `section marginBottom` 32 → 16-24.
4. **appointments modal** 120 → 56; **birth-plan-preview** 100 → 48; **weekly-tips emptyState** 80 → 48.

---## Part 2 — Photo overuse inventory

Photo sources: `BAND_*` constants (`src/constants/designRefresh.ts:47-51`, re-exported `corpus.ts:155`), `PHOTOS` map (`app/(mom)/getting-started.tsx:23-26`), `BIRTH_PHOTOS` map (`src/components/OnboardingWalkthrough.tsx:56-62`), `HERO_IMAGE` (`app/(auth)/welcome.tsx:42`), `BAND_HOME` re-used directly in timeline, and the week-illustration registry `src/constants/pregnancyIllustrations.ts` (37 files, weeks 4-40).
Avatar `uri:` photos (provider/mom avatars) are dynamic user data — not part of this inventory.

### 2a. Photo × screen matrix (live placements, 2026-10-01, home band removed)

| Photo constant → file | Placements | App-wide count | Per-flow repeat | Flag |
|---|---|---|---|---|
| **`hero-newborn-sleeping.jpg`** | `welcome.tsx:86` (hero) · `getting-started.tsx:144` (band) · OnboardingWalkthrough **MIDWIFE step 3** (`:149`) · **LACTATION step 1** (`:160`) | **4** | welcome → getting-started = **same photo 2× in the mom first-run flow** | 🔴 ≥3× app-wide + 2× in one flow |
| **`hero-family-moment.jpg`** | OnboardingWalkthrough MOM 1 · DOULA 2 · MIDWIFE 2 · LACTATION 2 (`:73,111,140,169`) | **4** (one per role's walkthrough) | every role's walkthrough step 1-2 | 🔴 ≥3× app-wide |
| **`hero-skin-to-skin.jpg`** | OnboardingWalkthrough MOM 3 · DOULA 3 · LACTATION 3 (`:91,120,178`) | **3** | 3rd slide in 3 of 4 role flows | 🔴 ≥3× app-wide |
| `BAND_HOME → band-home-couch-v2.webp` | **(removed)** home band 190px (pre-`d504a2b0`) · `timeline.tsx:179` anchorArt 150px | 1 live | — | ✅ now single-use |
| `BAND_TIPS → band-tips-teaching-v2.webp` | `weekly-tips.tsx:103` | 1 | — | ✅ |
| `BAND_APPOINTMENTS → band-appointments.webp` | `appointments.tsx:369` | 1 | — | ✅ |
| `BAND_MY_TEAM → band-myteam-support.webp` | `my-team.tsx:215` | 1 | — | ✅ |
| `BAND_MESSAGES → band-messages-lactation.webp` | `messages.tsx:604` | 1 | — | ✅ |
| `hero-water-birth.jpg` | OnboardingWalkthrough MOM 2 · DOULA 1 (`:82,102`) | 2 | different slides/flows | ✅ (2×, under flag threshold; same flow? no — different roles) |
| `hero-water-birth-2.jpg` | OnboardingWalkthrough MIDWIFE 1 (`:131`) | 1 | — | ✅ |

Notes:
- The "3 same-shoot photos" flagged by the task are exactly the three 🔴 rows — `hero-newborn-sleeping` (B&W close-up newborn on chest), `hero-family-moment` (B&W family in birth tub), `hero-skin-to-skin` (B&W skin-to-skin). All five `hero-*.jpg` are one B&W birth-photography series (visually identical style), so any two appearing in the same flow reads as "the app has one photo."
- **First-run mom flow** (welcome → signup → OnboardingWalkthrough MOM → … → getting-started): sees `newborn-sleeping` (welcome) → `family-moment` + `water-birth` + `skin-to-skin` (walkthrough) → `newborn-sleeping` (getting-started band). Both 🔴 conditions trigger on `newborn-sleeping`.
- `band-appointments-midwife.webp` is a **byte-identical duplicate** of `band-appointments.webp` (md5 `46f910fe…`); it and the replaced v1s — `band-home-couch.webp`, `band-tips-teaching.webp` — are unused assets (archive candidates; do not delete per workspace rule).
- `PHOTOS.team` / `PHOTOS.family` in `getting-started.tsx:25-26` are declared but never used (dead code).
- Pregnancy illustrations are used well already: `home.tsx` (current-week card), `weekly-tips.tsx:234` (week strip thumbs), `marketplace.tsx:386` — but marketplace hard-codes **week 20 for every user** (see plan §3c).

---

## Part 3 — Website photo inventory (variety source)

Source repo: `truejoybirthing-projects/truejoybirthing-website` (`public/images/`: 5,074 files; live build `dist/images/`: 5,072). Catalog doc: `IMAGE_ASSET_CATALOG.md`.

### 3a. The mid-page city photos = the vetted variety pool
Every city page ([city].astro) renders a **second, mid-page photo** in "What Doula & Midwife Support Looks Like in {city}" (line 1422, 4:3 `object-cover`, width 1024-1536): the per-city `supportSceneImage` from `src/data/cities.ts` — **179 distinct wired paths** (of 180 cities), and the file library holds ~608 `*support-scene*/*doula-support*` webp variants. Pixel-hash clustering shows **~535 visually distinct photos** among them — a deep, already-live pool of professional doula/provider-with-pregnant-woman scenes. Visual spot-checks (amarillo-v3: golden-hour field walk, hands intact; chula-vista: scrubs-clad professional with pregnant mom on sofa; chandler-v2: living-room consult) show **natural anatomy, no AI tells** — these cleared the `PRODUCT-VISUAL-STRATEGY.md` bar.

### 3b. Cross-referenced identities (md5/pixel-hash verified)
App assets are **already drawn from the website library**:

| App asset | = Website file | Website status |
|---|---|---|
| `band-appointments.webp` | `midwife-heartbeat.webp` | used cross-city |
| `band-messages-lactation.webp` | `lactation-consult-v3.webp` | used cross-city |
| `band-myteam-support.webp` | `acworth-ga-support-scene-v8.webp` | city-page photo |
| `hero-family-moment.jpg` | `shelbi-portrait-4.webp` | **unused** on site |
| `hero-newborn-sleeping.jpg` | `shelbi-portrait-6.webp` | **unused** |
| `hero-skin-to-skin.jpg` | `shelbi-portrait-1.webp` | **unused** |
| `hero-water-birth-2.jpg` | `shelbi-portrait-3.webp` | **unused** |
| `hero-water-birth.jpg` | *no website match* | app-only |
| `band-tips-teaching-v2.webp`, `band-home-couch-v2.webp` | *no clean match* (distinct crops/composites) | app-only |

**Avoid-list (AI artifacts, per `PRODUCT-VISUAL-STRATEGY.md`):** `doula-labor-support.webp`, `skin-to-skin.webp`, `doula-birth-plan-couch.webp`, `birth-plan-couch.webp`, `birth-plan-template.webp`, `online-education.webp`, `virtual-meeting.webp`, `doula-holding-hands.webp`, `doula-teaching.webp`. Anything not on this list must still pass a quick vision check (fused hands / waxy skin) before bundling — the catalog marks most of the 179 wired city photos as production-vetted.

### 3c. Variety plan (reuses website city-page imagery; NO code changes in this audit — plan only)

**Principles:** (1) keep the approved five band photos where they are — bands are screen identity; fix repetition in the recurring photo surfaces (walkthrough, welcome, getting-started, timeline, marketplace) and the flow double-ups instead; (2) pick ≤12 replacement photos at 4:3, downscale to ~750px webp (~60-120KB each — bundle cost only, no CDN dependency at runtime); (3) every candidate passes a vision check (real photo, no anatomical errors); (4) new constants go in a **new file** `src/constants/photos.ts` surfaced through `corpus.ts` pass-through — `designRefresh.ts` is frozen (palette law), so do not add `require()` lines there.

**Screen-by-screen (photo repeats first):**

| # | Screen / slot | Today | Proposed replacement (website file → app name) | Why |
|---|---|---|---|---|
| 1 | `getting-started.tsx` band (150px) | `hero-newborn-sleeping.jpg` (2nd time in first-run flow) | Pick one living-room consult scene from the 179-pool, e.g. `chula-vista-ca-support-scene.webp` (professional in scrubs + pregnant mom on sofa — on-message for "getting started with your team") → `band-start-here.webp` | Kills the only same-photo-twice-in-one-flow violation |
| 2 | Welcome hero | `hero-newborn-sleeping.jpg` | **Keep** (brand entry image, single use) | One use doesn't need fixing |
| 3 | Walkthrough **MIDWIFE** step 3 | `hero-newborn-sleeping.jpg` (3rd repeat) | `hospital-newborn.webp` (1400×933, unused, real — needs vision check) → `ph-midwife-newborn.webp` | De-dupes pool |
| 4 | Walkthrough **LACTATION** step 1 | `hero-newborn-sleeping.jpg` (4th repeat) | `doula-breastfeeding.webp` (1024×1536, unused — vision check) → `ph-lactation-feeding.webp` | Role-true imagery |
| 5 | Walkthrough **DOULA** step 2 | `hero-family-moment.jpg` | `doula-walking.webp` (1536×1024, unused — vision check) → `ph-doula-walking.webp` | Drops 1 of 4 uses of family-moment |
| 6 | Walkthrough **MIDWIFE** step 2 | `hero-family-moment.jpg` | a second pool scene (e.g. `amarillo-tx-support-scene-v3.webp` field-walk, distinct setting) → `ph-midwife-support.webp` | Drops the largest cluster |
| 7 | Walkthrough **LACTATION** step 2 | `hero-family-moment.jpg` | third pool scene (calm interior variant, e.g. `chandler-az-birth-doula-support-v2.webp`) → `ph-lactation-consult.webp` | Walkthrough then shows 12 distinct images role-wide |
| 8 | Walkthrough **DOULA** step 3 | `hero-skin-to-skin.jpg` | `doula-counter-pressure.webp` (1024×1536, unused — vision check) → `ph-doula-labor.webp` | Keeps MOM's step-3 skin-to-skin (single strongest slot), drops the 2 platform-wide repeats |
| 9 | `timeline.tsx:179` "Where you are" anchor art | `BAND_HOME` (couch photo inside an *informational* card) | **`getPregnancyIllustration(current_week)`** — the approved week watercolor, already bundled (37 files), matches the card's week caption exactly | Replaces a photo with a brand illustration where *repetitive information* was paired with the home photo; also clears the last non-band `BAND_HOME` consumer (constant stays used by designRefresh exports; if nothing else consumes it, flag for archive) |
| 10 | `marketplace.tsx:386` header art | **fixed** `getPregnancyIllustration(20)` for every user | `getPregnancyIllustration(user's current week)` — registry lookup already imported | Free personalization: every week gets a different illustration; zero new assets |

**Flow-level outcome:** first-run mom flow then runs welcome (newborn B&W) → walkthrough (family-tub / water-birth / skin-to-skin) → getting-started (living-room consult) — four distinct photos, three styles, one photo; per-session photo repeats drop from 2 to 0; walkthrough pool goes from 6 placements of 3 photos to 9 placements of 9 distinct photos.

**Illustrations-where-possible summary (brand-owned, zero photo budget):** timeline anchor (row 9), marketplace header (row 10); optional later: getting-started "Quick Start" checklist icons and empty-states already use glyphs — no further illustration substitution recommended beyond these two, since the five approved bands remain the photo identity of the app.

**Implementation notes (for the follow-up PR):**
- Add `src/constants/photos.ts` with the new `require()`s + re-export names (`band-start-here`, `ph-*`) through `corpus.ts`'s theme-invariant pass-through block (line ~153) — never touch frozen `designRefresh.ts`.
- `HBand` accepts any `ImageSourcePropType` and already handles web `uri` + native `expo-image` — new photos are drop-in `<HBand source={…}>`; for walkthrough's plain `<Image>`, portrait-orientation website files (1024×1536) work, but 4:3 landscape crops render nicer in the walkthrough's photo panel — prefer the landscape pool scenes where noted.
- Verify vision-safety of each pick before bundling (one `vision_analyze` pass per file: no fused hands, no waxy skin) — the wired city-page files passed spot checks; the *unused* section photos (`hospital-newborn`, `doula-breastfeeding`, `doula-counter-pressure`, `doula-walking`) still need the pass.
- Space changes from Part 1c are 4 small style-line edits (home, my-team/messages, getting-started, modal paddings) — no layout API changes.

---

## Appendix — Unused app-assets observed (archive candidates, do not delete)
| File | Why unused |
|---|---|
| `assets/images/band-appointments-midwife.webp` | byte-identical duplicate of `band-appointments.webp` |
| `assets/images/band-home-couch.webp` (v1) | replaced by `-v2` 2026-09 |
| `assets/images/band-tips-teaching.webp` (v1) | replaced by `-v2` |
| `getting-started.tsx:25-26` `PHOTOS.team/family` | dead constants |

*Audit produced read-only; no app/website files modified. Report file only.*