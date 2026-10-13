# APP-DRIFT.md — React Native implementation vs approved mockup law

**Question (Jeff):** are we implementing the approved design, or drifting?
**Verdict: the 20 (mom) surfaces are ~80% on-law (colors, chips, cards, hbands, icons all read from the approved corpus), but the app is drifting on typography breadth and on everything outside the (mom) area — 55 of 92 screens still render a legacy type stack (Source Sans 3 body / system font / SIZES presets), 31 distinct font sizes exist where the law uses ~12, the serif numerals/amounts rule is largely unused outside (mom), and the plant/growth motif exists as a component that is wired to zero screens.** Drift severity below: HIGH = user-visible inconsistency across core surfaces, MEDIUM = visible on secondary/role screens, LOW = polish.

Scope note: this audit mirrors DESIGN-LAW.md's method (values quoted from the mockup CSS) but was derived independently from the s*.html corpus — s5/s6 (common.css), s7s8s9, s10s11s12, s13s14s15, kick-counter mockup, week-spine mockup, auth-refresh + DESIGN-RULES.md. RN evidence: `frontend/app/**` (92 .tsx) + `frontend/src/components` + `frontend/src/constants`.

Law sources verified by extraction (not trusted from memory):
- `common.css`: `.btn` (#6E6C99 pill), `.tabbar` (white, #F0E9EE hairline), `.hband` + 4-stop veil, `.screen` grain, `.srow`, `.schip`, `.avat` 38px.
- `type-system.css` §app canvas: H1 26 / H2 21 / H3 17 Cormorant 700/600 · overline 10/ls2.2 Quicksand 700 · body 13.5 Quicksand 500 · caption 11. App body face = **Quicksand**; SourceSans3 is the **web** face (explicit "production mapping" comment L52-58).
- s7s8s9 L24-45: `.m-head` pad 10/20/6 · `.a-overline` 10/ls2.4 rose · `.a-h1` 26 with `em→#B085A5` · m-sub 12.5 · `.sect` 16/20/0 · `.a-h3` 17 · `.srow` 12/14 r18 · `.sico` 34 r12 · `.schip` 9.5/ls0.6 · `.abtn` 13px #6E6C99 · `.rbtn` 11.5 · `.stemline` "growth motif, design-wide rule".
- s10s11s12: clock 52 Cormorant ls1 · tipcards r18 pad 13/15 · week strip · stemline on S12 (L298).
- s13s14s15: `.mhead` → `.ov` 8.5/ls1.4 rose · `.tt` 21 · `.card` r14 · `.stat .n` Cormorant 700 18 rose · `.avatar` 56 · invoice amounts Cormorant 15.
- kick-counter mockup: pad numerals 74/34/23 + standard text scale.
- auth-refresh DESIGN-RULES.md (Jeff-approved 09-16/17): single dissolve-fade hero law, pill CTAs, organic icon law, avatar photo-first law.

---

## 1. Drift table (law rule → mockup value → RN actual → severity)

| # | Rule | Mockup law (source) | RN actual (file:line evidence) | Severity |
|---|---|---|---|---|
| **1.1** | App **body** face = Quicksand 500 | type-system.css L52-54 (app overrides body/caption to Quicksand; SourceSans = web face L38) | Two parallel stacks: 22 files use corpus `F.ui*` (Quicksand ✓, e.g. `app/(mom)/home.tsx:25`); **19 files still use `FONTS.body` = `SourceSans3_400Regular`** (theme.ts:59) — messages.tsx alone has 31 SourceSans body styles (`app/(mom)/messages.tsx:1062,1095,1119…`, birth-plan.tsx 12, contraction-timer.tsx 23). 55 more files set no fontFamily at all (system font, e.g. `app/(admin)/users.tsx` — zero `fontFamily` decls). User sees **three different body faces** across role surfaces. | **HIGH** |
| **1.2** | Serif display = Cormorant 700/600, H1 26 lh1.12, em-accent `#B085A5` | s7s8s9 L26-27 | Family loaded (`app/_layout.tsx:209-223` — 4 Cormorant + 4 Quicksand + 5 SourceSans weights) and H1 26/serif correct in the core (mom) screens (`home.greeting` 26/lh29 s10 ✓, appointments:831, profile:963-965, weekly-tips:292-296…). But 4 (mom) screens drift the H1: birth-plan title = `SIZES.fontXxl` 24 (birth-plan.tsx:583), contraction-timer empty-states 22 (1408), marketplace/provider-detail 30 (984/388); legacy screens use `FONTS.heading` at 28 (welcome.tsx:267, login.tsx:270); and 57/92 screens have **no serif anywhere** (doula/lactation/admin thin wrappers: `app/(doula)/dashboard.tsx` — 0 fontFamily; admin renders system sans). | **HIGH** (cross-role faces), LOW inside (mom) |
| **1.3** | Type scale tighter: law ~12 steps (8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14/15, 16, 17, 19, 21, 26 + tool exceptions 52/74) | verified size sweep across s5/s6/s7s8s9/s10s11s12/s13s14s15/kick/auth | **31 distinct `fontSize` values in app/ screens** (388 occurrences): raw `grep` includes 9, 9.5, 10.5, 12.5, 13.5, 14, 14.5, 15, 15.5, 16.5, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28, 30, 32, 34, 52, 74. Root cause: legacy `SIZES.fontXs..fontHero` ladder (theme.ts:89-96 = 12/14/16/18/20/24/30/36) + free-hand sizes (28 welcome:267, 30 marketplace:984/provider-detail:388, 32 signup:375, 34 profile avatar initials:1010). In (mom) core the scale is close (9.5/10/11/11.5/12/12.5/13/13.5/15/16/17/21/26 ✓). | **HIGH** app-wide / (mom) LOW |
| **1.4** | Overline (eyebrow) = 10px Quicksand 700 caps, ls 2.2-2.4, **rose/lavender/sage — never ink** | s7s8s9 L25; designRefresh.ts:94-102 `kickerStyle`; s13 `.ov` | Size/weight ✓ mostly, but 6 screens set overline **`color: C.ink`** (getting-started, home, invite-provider, postpartum, share-birth-plan, timeline — grep `overline: {` + `color: C.ink`), and tracking splits 2.0/2.2/2.4 per screen (appointments:824=2.4 vs home:848=2.2). welcome.tsx uses 11px/1.4 (257-262). | MEDIUM |
| **1.5** | H2 21 / H3 17 for section/card titles | s7s8s9 L32/L44; s13 `.tt` 21 | (mom) corpus screens ✓ (`my-team.tsx:392-431`, appointments sh2:839). Legacy screens: doula `doula-h2` 18px family drift (mirrors the doula-mockup 18px drift DESIGN-LAW flags); provider components use 14-15px row titles (`ProviderAppointments.tsx:963-993` F.ui at various) — matches doula mockups' ⚠ rows, not mom law. | MEDIUM (role-tier), LOW in (mom) |
| **1.6** | Stat numerals & invoice amounts = **serif**; mom = rose | s13 `.stat .n` Cormorant 700 18 `--rose`; `.inv-amount` Cormorant 15 | (mom) corpus screens ✓ home/stats use F.serif (home.tsx F.serif×8). invoices.tsx amounts: row uses `.headerTitle` serif ✓ but `detailValue` = 14/500/ink sans (invoices.tsx:660-ish), plan status badge = sans. Wellness S14 `.tt` 21 left-aligned vs RN wellness headerTitle **26px centered** (wellness.tsx:353-355) — both size and alignment deviate. | MEDIUM |
| **2.1** | Lateral inset **20px** | `.sect{margin:16px 20px 0}` / `.m-head 20px` / `.cwrap 0 20px` | (mom): 20 ✓ (appointments sect:838, messages:957/985, home header 837, weekly-tips:280/324). But home/profile scroll containers use `padding: SIZES.md` (16) (home.tsx:831-834, profile.tsx:930-933) → mixed 16/20 insets on adjacent screens. Provider dashboards: 16 (`ProviderDashboard.tsx:338`). Auth: 24-32 (welcome.tsx:246/316). | MEDIUM |
| **2.2** | Card radius 18 rows (srow r18 12/14 pad) · S13 cards r14 · pills 999 | s7s8s9 L36; s13; DESIGN-LAW §5.1 | Shared `srowBase` used by 8 (mom) screens = r18/12-14 ✓ verbatim (designRefresh.ts:105-114). But `Card.tsx` base = r12 + pad 16 (`Card.tsx:57-59`, SIZES.radiusMd/md) used by 9 (mom) screens; extras: 19/22/28 radii (home:~1079 area, messages 22, invite-provider 28, birth-plan 28); profile cards r16-24 (`profile.tsx:1051,1076`); `SIZES.radiusXl` 24 leftovers. 999 pills ✓ heavy (44×). | MEDIUM |
| **2.3** | Section rhythm mt16 / 8px card gaps | `.sect` 16/20/0; `margin-bottom:8px` | (mom) mostly 16/14/12 ✓-ish; stray 10/11/13 values (grep marginTop 1x each). Legacy screens use SIZES.lg=24 rhythm. | LOW |
| **3.1** | Palette = closed corpus set; **no blue/purple/material hues** | designRefresh.ts C = verbatim mockup hexes; DESIGN-LAW §0 | (mom) corpus screens ✓ all 23 tokens read through corpus.ts Proxy. Violations: **material red `#f44336`** for overdue in invoices.tsx:36,47 (law: rose warn chips `#A25C86`/`#EFE0EB` — mockup has NO red); badge `#EF4444` in doula `_layout.tsx:31` + RedDot.tsx:24,43; `colors.error #D48A8A`, `warning #E6C685`, `roleLactation #6BAFA0` (theme.ts:35-51) exist in legacy theme and appear via `colors.*` in non-corpus screens. The stray violet/`#7C3AED` grep hit is only a negative-rule **comment** (kick-counter.tsx:9 — "no violet #7C3AED, no blue"), not a usage; no actual off-law purple/blue hex found in shipped styles. Dark corpus is approved and legal (designRefreshDark.ts). | **HIGH** (red badges/overdue = off-brand hue) |
| **3.2** | Button law: primary fill **#6E6C99**, pills 999px everywhere, ghost = 1.3px #D5D3E8 | common.css `.btn`; s7s8s9 `.abtn/.rbtn`; DESIGN-LAW §5.4 | Shared `Button.tsx` paints primary = `colors.primary` = **#8E8CB5** (themeTokens LIGHT accent.primary:111) and text 14/16px FONTS.bodyBold — off-law fill role + size. Corpus screens hand-roll correct pills (rbtnYes #8E8CB5 ✓, abtn-equivalents #6E6C99 ✓ inside (mom)). (rbtn.yes #8E8CB5 IS the mockup's row-button fill — the mismatch is only the shared-component primary.) | MEDIUM |
| **3.3** | Chip semantics closed set | s7s8s9 L41-45 | ✓ in corpus screens (schip 9.5/0.6/700/999, sage/lavender/rose/gray bgs — appointments.tsx:861-862, invoices chips). Legacy screens use `colors.success/warning` (#A8B5A0/#E6C685 — the yellow and sage-500 are not the chip corpus). | LOW (mom) / MEDIUM (legacy) |
| **4.1** | **Plant/growth motif** — stemline divider "design-wide rule", sprig micro-motifs | s7s8s9 stemline comment; s10s11s12 L298 (46×14 #D8A0C4 stem on weekly-tips); DESIGN-LAW §7 | **`GrowthSprig.tsx` exists but has zero importers** — only a comment mentions it (home.tsx:34, "GrowthSprig" listed among already-svg components). The S12 stemline divider is **not rendered in weekly-tips.tsx** (grep Q14 10/stem = 0). Sprig motifs only survive in auth/onboarding via OrganicIcons (mom-onboarding.tsx:211, OnboardingWalkthrough.tsx:286-296). Result: the growth journey — Jeff's signature watercolor-canvas motif — appears **nowhere on a logged-in mom surface**. | **HIGH** (signature motif missing where law requires it) |
| **4.2** | Watercolor narrative illustrations + photo hbands on logged-in mom screens | s10s11s12 hband+veil §7 approved; assets present (band-*.webp) | HBand component implemented verbatim (HBand.tsx: veil stops match common.css) ✓ used by appointments/my-team/messages/weekly-tips/getting-started. **home.tsx drops the band — "Jeff 2026-10-01: photo band removed; straight to week/day + greeting" (home.tsx:273)** = *approved deviation*, document as exception not drift. Watercolor art = pregnancyIllustrations used on home/timeline/marketplace/weekly-tips ✓ but absent on postpartum/wellness/detail surfaces (mockups show them as optional per-surface — low). | LOW (approved deviation) |
| **4.3** | Veil = exact 4-stop fade into cream | common.css `.hband .veil` | designRefresh.ts:67-72 VEIL_STOPS verbatim ✓; dark corpus veils approved. | OK |
| **5.1** | Card anatomy: white bg, 1px #EFE0EB, r18, 12/14 pad, 34px r12 sico chips, chev #B9AFB8 | s7s8s9 L36-37,49-50 | Corpus screens ✓ (appointments sico 34/12:855-856, chev:863). `Card.tsx` shared = #FDFCFA (`colors.surface`) r12 pad-16 on 9 (mom) screens — bg/`radius/padding` don't match `.srow`/`.card`. #FDFCFA is corpus-legal (cardBg) but mockups paint content cards #fff on cream. | MEDIUM |
| **5.2** | Screen header anatomy: overline → serif H1 26 + rose accent word → sub 12.5 | s7s8s9 L24-28 | Appointments ✓ (overline 2.4/rose:822-827, headerTitle 26 serif, m-sub). Profile ✓ (kicker/serif/greeting:955-965). Weekly-tips ✓ (292-304). Wellness: kicker ✓ rose but headerTitle 26 **centered** vs mockup `.tt` 21 left — header anatomy mismatch. H1 accent-word rose pattern: implemented in welcome/home but not consistently (`headerName` = C.rose in wellness:356 — law color is roseSoft #B085A5 for the em word). | LOW-MEDIUM |
| **5.3** | Tab bar: white bg, r45 bottom, hairline #F0E9EE, labels 10.5 w600, idle #9C9DA0 / active #8E8CB5, 26px hand-drawn icons | common.css L55-56; s7s8s9 L16-17 | RN (mom)/_layout.tsx:70-82: cream bg (not white), hairline ✓, no r45 (native tab bars are flat — mockup shows phone chrome; acceptable platform difference), labels 10.5/**w700** ✓size, colors: active C.lavenderSoft ✓, inactive C.gray #6A6B6C (law label idle #9C9DA0 — close but off), icons = TIcon hand-drawn set ✓ (TIcon.tsx: approved icons.mjs source) but at nav default **24px** vs 26px law, dark hairline/badge = corpus ✓. Doula/midwife/lactation _layouts follow corpus ✓ except **#EF4444 badge** (doula _layout:31). | LOW |
| **5.4** | Avatars: 38 lavender circle Quicksand 14 / S13 hero 56 rose Cormorant 20; **photo-first** (DESIGN-RULES §6) | s7s8s9 L59; s13 | Corpus rows ✓ 38px (my-team/messages avat). profile.tsx hero avatar = **100px circle, bg roseSoft, 3px rose ring, serif 34px initials** (profile.tsx:974-1013) — mockup S13 = 56px/Cormorant 20. Photo-first ✓ implemented. | LOW |
| **5.5** | Grain texture `.screen::after` opacity .55 multiply | common.css L33-35 | **Not reproducible in RN** (no overlay implemented in any screen; no equivalent noise component exists). The app paints flat cream. Silent law gap visible in side-by-side. | MEDIUM (needs council decision) |
| **5.6** | Tool screens: clocks serif — contraction 52 ls1 (#2A2A2A), kick 74 | s10 L108 clock; kick-counter mockup `.pad .num` 74/1.05 | ✓ family+size (`contraction-timer.tsx:1523-1526` F.serif 52 ls1; kick-counter.tsx:646-649 74). Kick/counter also carry stray 9/9.5/10.5/19/23 micro-sizes — timer-only idiosyncrasies, mockup-kernel ✓. | OK |
| **5.7** | Auth law: single dissolve-fade hero (3-stop: rgba(142,140,181,.15)→transparent→#FAF8F5 100%), never text/inputs on photo | auth-refresh DESIGN-RULES §1 (Jeff-enforced twice) | welcome.tsx hero = flat 15% rose wash (`welcome.tsx:91`, no dissolve gradient — no expo-linear-gradient in auth flow), bottomCard = solid cream card radius 28 + shadow (welcome.tsx:244-257) = the exact "solid card over fade → hard line" pattern Jeff rejected 09-16. Onboarding screens carry organic icons ✓ + sprigs ✓ + serif/Quicksand via OrganicIcons components. | **HIGH** (rejected pattern shipped on the welcome screen) |
| **5.8** | Fonts loaded at all | @font-face in every mockup | ✓ `useFonts` loads 13 brand faces at root (`app/_layout.tsx:209-223`); assets/fonts dir only ships Ionicons+SpaceMono (expo-google-fonts brings the brand faces via packages — no drift, but note SpaceMono/Ionicons remain for loading screens). **No hardcoded `fontFamily: 'Quicksand'` string anywhere except web-only DateTimePicker styles** (appointments.tsx:634,716 — web fallback, acceptable). | OK |
| **3.4** | Every color flows from the frozen corpus tokens (screens read C.* — no raw hexes) | corpus.ts law comment: "designRefresh.ts stays FROZEN… palette-law audits grep it" | Mostly ✓ — raw hexes in (mom) screens are corpus values anyway or comments only (home.tsx:533-1312 comments; birth-plan.tsx:455,512,530 uses raw `#5F7154` instead of C.sage — token bypass, LOW). Off-corpus raws: `#EFE9E2` hairline (invoices.tsx:734 vs law #F0E9EE/#EFE0EB), 8× `shadowColor #4A3B4E` (auth shadows). | LOW |

## 3. Legacy-stack inventory (drives rows 1.1-1.3)

**19 files on FONTS.body/SourceSans3**, **55 files with zero explicit fontFamily** (thin wrappers rendering Provider* components + admin screens rendered in system sans + (auth) screens on the legacy stack). The (mom) refresh area (20 screens) is clean.

---

## 2. TOP-10 fix list (ranked)

| # | Fix | Effort shape |
|---|---|---|
| **1** | **Kill the FONTS.body (SourceSans3) legacy stack** → alias `FONTS.body/bodyBold/bodyMedium/subheading` in `theme.ts` to corpus Quicksand faces, or migrate the 19 consumer files' imports to corpus `F.ui*`. One-file token fix first (theme.ts:54-68 aliasing FONTS→F), then the 19-file sweep. Restores one body face app-wide. | 1-file alias + 19-file sweep |
| **2** | **Remove off-law hues**: `#f44336` overdue → `C.rose` (invoices.tsx:36,47); `#EF4444` badge → `C.roseBorder` (doula _layout:31, RedDot.tsx default); audit `colors.error/warning` consumers onto corpus roles. Token fix + grep-driven sweep of ~30 call sites. | token fix + 30-site sweep |
| **3** | **Render the growth motif**: import `GrowthSprig` / stemline SVG (46×14 #D8A0C4) into weekly-tips (S12 law line exists), home, timeline section breaks — the component is built and unused; the law comment already claims it. 1-3 files, no new code. | 3-file add |
| **4** | **Welcome/auth dissolve-fade law**: replace welcome.tsx flat wash + solid bottomCard (radius 28 + shadow = Jeff's 09-16 rejection) with the 3-stop dissolve gradient (no expo-linear-gradient dependency needed: reuse HBand's SVG-gradient approach). Welcome + hero screens; the law requires "ONE construction, everywhere". | welcome.tsx rebuild (~1 file + login/signup check) |
| **5** | **Collapse the size ladder**: retire `SIZES.fontXs..fontHero` (12/14/16/18/20/24/30/36) in theme.ts:89-96 by remapping to law steps (11/13.5/13.5/17/21/26 + keep 52/74 tool clocks) — this kills the birth-plan 24 title, contraction 22, marketplace/provider-detail 30 outliers in one edit. Removes most of the 31-distinct-size problem with a single token change; residual literals (28 welcome/login, 32 signup, 34 profile initials) then normalized in ~8 screens. | 1-file token fix + 8-file sweep |
| **6** | **Shared Card.tsx anatomy** → corpus law: white bg, 1px #EFE0EB, r18, 12/14 pad (or optional r14 S13 variant) instead of #FDFCFA/r12/pad16. One-file component fix benefits 9 (mom) screens. | 1-file fix |
| **7** | **Button primary role**: Button.tsx primary bg `colors.primary` #8E8CB5 → law #6E6C99 (and bodyBold → uiBold, size 13). One file. | 1-file fix |
| **8** | **Wellness header anatomy**: 26px centered → `.tt` 21px left + overline rose (wellness.tsx:353-356); fix `headerName` to roseSoft #B085A5. ~6 screens need header spot-checks (getting-started, postpartum, share-birth-plan, invite-provider, timeline ink-overlines → C.rose). | 6-file sweep |
| **9** | **Provider/legacy screens**: doula/lactation/midwife wrappers + admin get explicit corpus typography (they currently render system sans / SourceSans via Provider* components); align row titles to H3-17-family hierarchy or ratify doula-tier variant (council decision, mirrors DESIGN-LAW §8.2). | 55-file triage (mostly thin wrappers; ~20 real) |
| **10** | **Tab-bar + avatar polish**: tab labels w600, idle #9C9DA0, icons 26px (nav-size tweak in (mom)/_layout.tsx:78-82); profile hero avatar 100px/34px-serif → 56px/20px-serif (profile.tsx:1008-1013); grain texture: either build a RN noise overlay or get Jeff's sign-off that flat cream ships (council decision, mirrors DESIGN-LAW §5.7). | 2-file polish + 1 decision |

Snapshot: fixes 1, 5 are token-file edits with tiny sweeps; 2, 6, 7 are component/token one-offs; 3, 4, 8 are surgical screen work; 9 is the big sweep and can ride phase 3 of the reskin plan.

**Net:** the design-refresh system itself is built correctly (frozen corpus + dark corpus + corpus proxy + verbatim components are all present and correct); the drift is that **only the 20 (mom) screens switched over to it**. The core-mom experience a customer sees daily is on-law; auth, provider-role, and admin surfaces are not, and the growth motif + one body face are the two signature gaps everywhere.
---
## 4. SHIPPED r1 (2026-10-07, commit f0d91707) — Jeff said "go"

| Fix (from TOP-10) | What shipped | Status |
|---|---|---|
| #1 one body face | FONTS.body/medium/bold/regular → Quicksand faces (theme.ts alias); SourceSans3 no longer referenced app code | ✅ shipped, tsc 0 |
| #5 size ladder | SIZES.fontXs..fontHero → law steps 11/13.5/17/21/26/34 (one file, 62 consumers inherit) | ✅ shipped |
| #2 red→rose | invoices.tsx 2×→C.rose, doula _layout badge→#B87AA0, RedDot fallback→#B87AA0, ProviderInvoices 4×→#B87AA0 | ✅ shipped |
| #6 Card.tsx | white bg #fff, 1px #EFE0EB, r18, pad 12/14 (corpus .card + srowBase law) | ✅ shipped |
| #7 Button primary | colors.primary → #6E6C99 (law action lavender; 213 call sites inherit), Dark→#5B5982, label 700/13/11/17 | ✅ shipped |
| #4 welcome | NOT the dissolve rewrite the audit guessed: approved mock IS hero+tint+card. Shipped = approved .welcome-tint (2-stop 18%/22%), card shadow REMOVED (09-16 rejection), r28/40, all type+colors to mockup exact values | ✅ shipped, tsc 0 |
| #3 growth motif | weekly-tips: stem divider + trimester sprig (stage by current week); timeline: sprig on Milestones header | ✅ 3 sites live, component has importers now |
| #8.9.10 | NOT in r1 (sweeps / phase-3) | ⏳ pending |
Verification: tsc -p = 0; regression suites running (tabs wave-2 + 10-07 bench) — results append here.
Verification (complete): tsc 0; wave-2 tabs 50/50 COMPLETED exit 0 (/tmp/tjb-drift-reg1b.log); 10-07 bench 38/38 COMPLETED exit 0 (/tmp/tjb-drift-reg2d.log — 2 env failures first: due_date restore had de-staged week-36, then due 11-09 gave week 35d2; staged 11-04 → exactly "Timeline, 36 weeks 0 days"). Pushed f0d91707 → origin/main. Demo data restored (due 12-19, probe row deleted, events baseline 7).

---
## 5. SHIPPED r2 (2026-10-07, commit e04bf92b) — Jeff said "go r2"

| Fix | What shipped | Notes |
|---|---|---|
| #8 wellness header | 26px centered → s14 .mhead/.tt 21px lh1.05 LEFT serif; em "today?" = italic rose (s14 .tt em) | audit guessed roseSoft; mockup itself wins at .tt level (var(--rose)) |
| #8 appointments | H1 accent explicit non-italic roseSoft (s7 .a-h1 em pattern) | was inherited default |
| #8 overline sweeps | invoices + birth-plan-preview kickers C.lavender → C.rose (#A25C86 law) | (mom) kicker scan now 100% rose |
| #8 spot-checks | getting-started / postpartum / share-birth-plan / invite-provider / timeline | all verified already on-law (26 left serif + rose kicker + roseSoft em); no edits needed |
| #10 tab bar | labels 10.5 w600 uiSemi (was 700), idle #9C9DA0 (was C.gray), icons 24→26 ×7 | native bar stays flat/cream — approved deviation |
| #10 profile avatar | 100px/3px rose ring/34 white initials → S13 56px ringless/roseSoft bg/rose-20 serif; badge 32→24, cam 14→12 | photo-first untouched |
| grain decision | flat cream ships; law §5.5 = pending Jeff ruling | only open item |
Verification: 19/19 ALL GREEN (fresh ad-hoc script, tempfile'd + deleted); tabs 50/50 (/tmp/tjb-r2-tabs.log), bench 38/38 after env re-stage (/tmp/tjb-r2-bench2.log); tsc 0; pushed e04bf92b; demo due restored 12-19.
Grain ruling (Jeff, 10/07): "grain OK" — flat cream RATIFIED for RN. Law §5.5 grain overlay = web-mockup only; RN deviation approved, no noise component to build. Audit row 5.5 closed MEDIUM→OK.

**TOP-10 remaining: only #9 (55 legacy screens → corpus typography, phase-3 ride-along). r1+r2 shipped.**

---

## 9. SHIPPED r3 (2026-10-07, commit 2f8d01ab) — Jeff said "pick back up on and continue r3"

**#9 closed.** Legacy 28 screens + provider comps onto corpus typography law.

| Fix | What shipped |
|---|---|
| Legacy font refs | FONTS.* → corpus F.* across app/ + src/components; **0 legacy refs remain**; FONTS pruned from 12 import lists |
| Size ladder | Off-law literals normalized to law steps: auth titles (32→26, 24→26, 28→26, 22→21), plans-pricing (18→17/20→21/28→26), marketplace (30→26, 14.5→13.5), provider-detail (30→26), pro-feedback (18→17/20→21 serif/24→26), contraction-timer (22→21, 20→21 ×2, 28→26), ErrorBoundary 18→17 serif, Walkthrough 30→26 |
| Mom invoices | s15 law: row amounts = Cormorant 700 15 **rose**, detail 'Amount Due' serif 16 rose (was sans-sage 20/28); empty/modal titles 21 serif |
| Doula tier (mockup = law) | dashboard stats Cormorant 700 22 lavender (d1); clients rows 11.5 w600 + meta 11 (d2); appointments rows Cormorant 600 15 + meta 10.5 (d9); invoice rows serif 600 14 / amount serif 700 15 lavender (d7); message names serif 600 14 (d9) — **council rows 5 + 8 CLOSED** (doula = lavender-22 variant, ratified by d1/d2 mocks themselves) |
| invite-provider | success avatar → s13 law: roseBg 56px circle + Cormorant 700 20 rose |
| admin (internal) | serif titles on users/content/settings |

Ratified keepers (every remaining off-ladder literal is in a named class): login 28 (09-16 approved art), home affirmation 16.5 (law quote size .tipcard p.q), timer header 22 (s11 .tr-head .a-h1 tool scale), kick-counter 23 (tool numeral), timeline eventDay 22 (tool), wellness emojis 24/32 (emoji, not type), date inputs 18 (platform controls), modal-close ×/chev glyphs 20/24 (glyphs).

**NOT SHIPPED (blocked on Jeff):** hand-drawn .ticon glyphs for doula tab bar (d9 audit row 22) — icon drawing is Jeff-only under brand-identity block; lucide geometric 26px stays until ruled.

Verification: tsc --noEmit = 0. Tabs wave-2 suite 50/50 COMPLETED exit 0 (/tmp/tjb-r3-tabs.log). 10-07 bench: 1st + 2nd runs FAILED at Part-1 (timer strip week-34+ gate) — weekly-content reads **mom_profiles.due_date, not users.due_date** (r1 only ever staged users, its "baseline 7" events note also stale); staged BOTH to 2026-11-04 → run 3 = **38/38 COMPLETED exit 0** (/tmp/tjb-r3-bench3.log). Demo env restored: users.due_date 12-19 (ISODate), mom_profiles.due_date 12-19, PROD-VERIFY-10-07 probe rows deleted (2), pre-existing TEST_* rows (4, from 9/28+10/01) untouched. Pushed 2f8d01ab → origin/main.

## 2026-10-13 on-device sim review (JOB-2026-10-13 sim-review)
- Native rebuild main@b6929eea → iPhone 17, metro current. Drift gate PASS (0 new / 154 baseline remainder, from 296 pre-ratchet).
- 17-screen mom+pro walkthrough captured (reports/mobile-sim-review-2026-10-13.md + Deliverables PDF). Design law executing across all captured surfaces.
- Found+fixed on-device: timeline raw-ISO due date (header subtitle + anchor desc) → formatDate(); commit 43c2cc74 (tsc 0, jest 21/21, drift PASS).
- Icon debt (P5): 37 call sites still on legacy lucide shim + 9 TIcon importers — Jeff glyph eyeball pending, documented in review report.
