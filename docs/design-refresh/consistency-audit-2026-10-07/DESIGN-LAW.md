# TJB Mobile — DESIGN-LAW.md
**Canonical design law extracted from the approved mom mockup corpus** (surfaces-2026-09-14)
Generated: 2026-10-07 · Agent A (law extraction), design-consistency council
Corpus of record (read-only):
```
surfaces-2026-09-14/
  s5-app-birth-plan.html · s6-app-timeline.html · s7s8s9-app-mom-core.html · s10s11s12-mom-home-timer-tips.html · s13s14s15-app-profile-wellness-invoices.html
  s7s8s9-mom-core-hbands.html (photo-header variant sheet)
  common.css · ../type-system.css · icons.css (ticon set)
  doula-*.html (4 files) + common.css + icons.css + render-doula.py + renders-doula/
```
Dark-mode variants (`*-dark.html`) exist for mom; ignored here (light law only; doula is light).
All values below are quoted verbatim from CSS with `file:line`. Doula column key: **✅ = comply · ⚠️ = deviate · — = silent (law does not appear; not a violation unless the missing motif is user-visible)**.

---

## 0. Brand law (authoritative, from user memory)
Approved **watercolor illustrations · serif typography · cream/lavender/rose accent palette**.
**NO blue / purple / playable palettes.** Everything below implements that law; the hex list in §3 *is* the approved corpus.

---

## 1. Type stack

| Family | Files | Weights loaded | Role |
|---|---|---|---|
| **Cormorant** (Cormorant Garamond) | all s* + doula files via common.css L5–7 | 700 (bold), 600 (semibold), 500 *italic* | Display/headings, stat numerals, quotes, amounts |
| **Quicksand** | common.css L8–11 | 400/500/600/700 | App **body** (RN app body face), labels, chips, timestamps, tab labels, buttons |
| **SourceSans** (Source Sans 3) | common.css L12–13; type-system.css L38/43 | 400/600 | **Web-body face** (1280px artboard); NOT part of the app phone-canvas law (type-system L53–54 override app body/caption to Quicksand) |

Serif = Cormorant / sans = Quicksand is the app pairing — doula-d10 L177 says it outright: *"Same construction as approved s7s8s9 + s13s14s15 · Cormorant + Quicksand · cream/lavender/rose palette"*.

### 1.1 App type scale (phone canvas, 390px)
Authoritative baseline is `../type-system.css` (documented production mapping: H1 26 / H2 21 / H3 17 / overline 10 / body 13.5 / caption 11, families CormorantGaramond 700/600 + Quicksand 400–700); the s*-files use it idiomatically:

| Token | Value | Source | Doula |
|---|---|---|---|
| H1 / `.a-h1` | `'Cormorant',serif font-weight:700; font-size:26px; line-height:1.12; color:#2A2A2A` | s7s8s9 L26 ≡ s10 L23 ≡ type-system L49 | ✅ identical in all 4 files (d1 L153, d4 L193+, d7 L206, d10 L159) |
| H1 accent word `em` | `font-style:normal; color:#B085A5` | s7s8s9 L27 | ✅ verbatim (d1 L154, d10 L160) |
| H2 (in `.sect`) `.sect .a-h2` | `font-family:'Cormorant',serif; font-weight:700; font-size:21px; color:#2A2A2A; margin-bottom:2px` | s7s8s9 L32 ≡ s10 L29 | ✅ `.doula-h2` = `21px` (d1 L48). **⚠️ micro-drift:** d4/d5/d6 `.doula-section .a-h2` drops to `font-size:18px` (d4 L101) |
| H2 sub `.sect .sub` | `font-size:11.5px; color:#6A6B6C; font-weight:500; margin-bottom:10px` | s7s8s9 L33 | ✅ `.doula-sub` = `11.5px` (d1 L49, d10 n/a — D10 uses 11.5 in sections) |
| H3 (row titles) `.a-h3` | `'Cormorant',serif; font-weight:600; font-size:17px; color:#2A2A2A` | s7s8s9 L37 | ⚠️ `.doula-srow .a-h3` = `15px` (d7 L124); other doula row titles sit at 14–15px (`.inv-name 14px` d7 L173, `.cc-name 15px` d4 L182) vs mom 17px |
| Overline `.a-overline` | `font-size:10px; letter-spacing:2.4px; text-transform:uppercase; font-weight:700; color:#A25C86; margin-bottom:5px` | s7s8s9 L25 ≡ s10 L22 | ✅ verbatim in `.doula-overline` (d1 L50) and inline `.a-overline` (d1 L152) |
| Header sub `.m-sub` | `font-size:12.5px; color:#6A6B6C; margin-top:4px; font-weight:500` | s7s8s9 L28 | ✅ `.doula-msub` 12.5px (d1 L53); `.doula-sub` 11.5px serves section subs |
| Body / row text `.mmeta` | `font-size:11px; color:#6A6B6C; font-weight:500` | s7s8s9 L40 | ✅ `.doula-row .meta` 11px identical (d7 L66); `.doula-srow .meta` 10.5px ≈ (d7 list rows) |
| Caption / `.t-caption` | `font-size:11px; color:#6A6B6C` (Quicksand) | type-system L54 | — (silent; doula uses 9.5–11px foots: `.doula-foot 9.5px` d10 L47) |
| Stat numeral `.stat .n` | `'Cormorant' 700 18px color:var(--rose)` = `#A25C86` | s13 L55 | ⚠️ `.doula-stat-card .n` = `Cormorant 700 22px color:#8E8CB5 (lavender)` (d1 L63, d4 L17); D10 `.profile-stat .n` = `20px #8E8CB5` (d10 L131) |
| Stat label `.stat .l` | `8.5px wt700 ls .8px uppercase #8A8B8D` | s13 L56 | ✅ `.doula-stat-card .l` identical (d1 L64) |
| Quote `.tipcard p.q` | `Cormorant italic 600 16.5px #2A2A2A lh 1.4` | s10 L93 | — silent (doula has not shipped a quote surface; carry into D-packet when it does) |
| Timer numeral `.tcirc .clock` | `Cormorant 700 52px #2A2A2A lh1 ls1px` | s10 L108 | — silent (no timer in doula pack) |

Mom-only extra scale (s13): `.mhead .ov` 8.5px/1.4ls (L38) · `.mhead .tt` 21px (L39). Doula mirrors it: `.doula-mhead .ov` 8.5px (d7 L113), `.doula-mhead .tt` 20px with italic rose em (d7 L114–115).

### 1.2 Canonical H1 pattern ("Good morning, Elena" anatomy)
A section header = **overline (Quicksand 10px rose, ls 2.4) + serif headline (Cormorant 700 26px) whose 1 emphasized word is `em` → rose `#B085A5`** (s7s8s9 L25–27; example markup s10 L144–148: `Week 28 · Day 3` / `Hello, <em>Elena</em>` / sub `Third trimester begins…`). Doula replicates verbatim: D1 `Good <em>morning</em>, Sarah` (d1 L181–184), D4/D5/D7, D10 all use the same three-spart header.

---

## 2. Spacing law

The 10/07 Jeff fix wrote the law into the doula pack header: *"**design law is 20px (s7s8s9 .sect)** so text never touches the screen edge"* — d4 L10 comment. The pre-fix 18px (`.content{padding:0 18px}` common.css L44) is **retired; 20px is canonical for app content**.

| Token | Value | Source | Doula |
|---|---|---|---|
| Lateral inset (the Inset Law) | `padding: 0 20px` (via `.cwrap`); equivalent mom rule `padding:10px 20px 6px` (`.m-head`), `.sect{margin:16px 20px 0}` | s7s8s9 L24/L31; doula d1–d10 L11 `.cwrap { padding: 0 20px; … }` | ✅ `.cwrap { padding: 0 20px; … }` verbatim in all 4 doula files (d1 L11, d4 L11, d7 L11, d10 L11) |
| Section top gap `.sect` | `margin:16px 20px 0` — **first/second sections sometimes overridden inline to 10–12px** (s10 markup `style="margin-top:10px"` L150, `12px` L172) | s7s8s9 L31, s10 L28, s5 L40 | ✅ `.doula-section { margin: 12px 0 0 }` (d1 L97; d10 inline) + `.doula-dl { margin:12px 0 0 }` (d1 L108) |
| Card vertical rhythm | `margin-top:12px` (`.card`) / `margin-bottom:8px` (`.srow`) | common.css L47 / s7s8s9 L34 | ⚠️ tighter: `.doula-srow` mb 6px (d1 L100), `.doula-card` mt 10px (d1 L20); D10 `.setting-row` mb 6px (d10 L135) |
| Card padding | `15px 17px` for content cards (`.card`, common.css L47); `12px 14px` for list-row cards (`.srow`, s7s8s9 L34) | common.css L47 / s7s8s9 L34 | ✅ rows exactly `10px 12px`/`12px 14px`; ⚠️ `.doula-card` = `12px 14px` uses the **row** padding on a content card (d1 L20) |
| Header block `.m-head` / `.mhead` | mom: `padding:10px 20px 6px` (s7s8s9 L24, s10 L21) | s7s8s9 L24 | ✅ `.mhead { padding:4px 14px 0 }` d1 L151 — narrower top gap, sits inside .cwrap's 20px |
| Button paddings | `.abtn` `13px 18px` / `.rbtn` `8px 10px` | s7s8s9 L50 / L52 | ✅ `.doula-btn` 11px 18px (~same); `.doula-rbtn` 7px 10px (d1 L56, d4) |
| Progress height | `.prog` 7px (s10 L47) · `.pbar` 8px (s5 L28) | s10 L47 / s5 L28 | ⚠️ `.doula-progress` = **4px** tracks, radius 999 (d1 L127, d4 L130) — thinner than mom 7/8px; flag to normalize up |
| Status bar | `height:40px; padding:0 26px` | common.css L40 | ✅ inherited from common.css (every doula screen) |
| Screen radius phone | `.phone` w 390 · `.screen` radius **45px** (0 0 45px on tabbar too) | common.css L30/L32; s10 L15 | ✅ `.doula-hband` radius 45 45 0 0 (d1 L65), `.doula-tabbar` `border-radius: 0 0 45px 45px` (d1 L68) |

**Inset law is settled — do not re-litigate.** 20px lateral, verified in every doula file's `.cwrap` (d1/d4/d7/d10 :11).

---

## 3. Color tokens (the approved corpus)

| Token | Hex | Role (verbatim usage) | Source | Doula |
|---|---|---|---|---|
| **Cream (app canvas)** | `#FAF8F5` | `.screen` background, `.cwrap` screen bg | common.css L32, s13 L11 `--cream` | ✅ `.screen tall` inline `background:#FAF8F5` every doula screen (d1 L177, d4 L177, d7 L177, d10 L183) |
| **Ink** | `#2A2A2A` | headings/body ink | common.css L18; s13 L11 | ✅ everywhere |
| **Body text** | `#4B4B4B` | card paragraph text | common.css L50 | ✅ `.doula-card p` `13px` (d1 L22), d4 notes `.ne-text 12px` |
| Gray | `#6A6B6C` | secondary text | common.css L56 (.tb), s13 L11 `--gray` | ✅ |
| Faint/chevron | `#8A8B8D`, `#B9AFB8` | captions, chevrons | s7s8s9 L34/L46 (.muted/.chev) | ✅ |
| **Lavender** | `#8E8CB5` | Primary **interactive** lavender: buttons, avatars, active tab, progress fill, toggles | s7s8s9 L17 .tb.on `color:#6E6C99`(active text) + `.btn` bg #6E6C99; toggles d10 L152 `.toggle.on{background:#8E8CB5}` | ✅ |
| **Deep lavender** | `#6E6C99` | Primary action **fill** (abtn/doula-btn), active-tab text | s7s8s9 L50; doula d1 L55 | ✅ |
| Lavender soft | `#EDEAF6` | icon chip bg, avatar bg, progress track | s7s8s9 L35 .sico `#F1F1FB` + L35-37 `.avat` #EDEAF6; d1 L127 progress track | ✅ |
| Lavender light | `#F1F1FB` | icon chip default bg, chip `wip/active` bg | s7s8s9 L35, L43 | ✅ `.doula-chip.active{#F1F1FB}` (d1 L24) |
| Lavender mid | `#D5D3E8` | outline borders on secondary buttons, toggles | s7s8s9 L54 `.rbtn.no`, d10 L151 | ✅ |
| **Rose accent (soft)** | `#B085A5` | **accent-word `em` in serif headings**; rose border | s7s8s9 L27 (.a-h1 em), s13 L12 `--roseBorder` | ✅ d1 L154 `.a-h1 em{color:#B085A5}` |
| **Rose** | `#A25C86` | overline color; warn/pending chips; stat numerals (s13); sub-tier | s7s8s9 L25 (.a-overline) | ✅ .doula-overline (d1 L50) |
| Rose soft | `#EFE0EB` | card **border**; warn chip bg | common.css L47, s7s8s9 L44 | ✅ card borders doula (d1 L20) |
| Rose bg | `#F0E9EE` | copy-action bg, badge bg, msg receive bubble | s13 L12 `--roseBg`, d7 L199 msg-bubble | ✅ `.inv-actions .btn.copy` (d7 L179) |
| Rose chip | `#FBF5F9` | selected pill bg | s13 L12 (`--roseChip`), s10 L84 `.wk.cur` / `.wk.cur bg` | — `#FBF5F9` **silent** in doula pack |
| **Sage** | `#5F7154` | success/complete semantics (done/paid/signed chips); sage icon strokes | s7s8s9 L42 (.schip.done) | ✅ `.doula-chip.signed/paid/completed/confirmed = sage` (d1 L26) |
| Sage bg | `#E8EDE5` | success-chip + sage icon-chip bg | s7s8s9 L42 | ✅ (d1 L26) |
| Sage ink (light) | `#A8B5A0` | **stem divider stroke** (web/city/homepage pages, opacity .75—.8) | s3 L74, s4 L79/142, s2 L148 | — silent in doula (no stem) |
| Rose stroke (app stem) | `#D8A0C4` | **stem divider stroke (app)** | s10 L298 | — silent |
| Track | `#F3F1EE` | progress track (s10), neutral chips (`todo/upcoming/draft`) | s10 L47, s7s8s9 L45 | ✅ `.doula-chip.todo` (d1 L28) |
| Tab idle | `#9C9DA0` | `.tb` idle icon+label | s7s8s9 L16, common.css L56 | ✅ (d1 L69) |
| Input bg | `#FDFCFA` | ghost button bg, composer field | s7s8s9 L19/L54 | ✅ `.doula-btn` ghost / rbtn.no (d1 L56) |
| Border (list) | `#EBE7E1` | composer field border (web-neutral, used app-side on s7 composer) | s7s8s9 L19 | — |

**Banned:** bright-violet website accent hex, any blue/purple beyond the corpus above (common.css L3 says "Bright-violet website accent hex is banned here — never use."). Grep of the doula pack for the usual blue/purple suspects returned zero hits, and `colors.doulaPrimary` = `#6E6C99` (SURFACES-doula.md L40 **"IS within the approved lavender corpus"**). **No palette violations in the doula pack.**

---

## 4. Motif inventory (watercolor + growth)

### 4.1 Watercolor illustration usage (s-corpus)
| Surface | Element | Source | Meaning |
|---|---|---|---|
| S5 Birth Plan | `.wash` watercolor banner `assets/breathing-surge-v2.png` — 118px banner `margin:14px 20px 0; border-radius:20px`, caption `.cap` `padding:22px 16px 12px` + dark scrim gradient `rgba(42,42,42,0)→rgba(42,42,42,.55)` | s5 L33–36, markup L92 | Narrative art over *labor-preferences* — "breathing-rhythms art… one image, doing narrative work, not decoration" (s5 legend L161) |
| S6 Timeline | `.anchor` card with `.art` = week watercolor `assets/week28.webp` (150px); `.nextart` `breathing-slow-v2.png` | s6 L18–24, markup L78/83 | Current-week milestone anchor; next-week art slot |
| S10/S12 | `.hband` photo band `assets/band-home-couch.webp` / `band-tips-teaching.webp` (168px) | s10 L127/145, L353 | Scene-context photo band per screen |
| S10/S12 | `.devart` watercolor week art `week34.webp` 104×104 r12 in "Baby Development" card | s10 L174 | Weekly development illustration |
| S2 | full-bleed `.cur` + `week28.webp` in anchor zone | s2 L63/95 | Week art as hero/anchor |

Law: **watercolor art carries meaning attached to the specific clinical state (week number, breathing rhythm, care scene) — one image per surface, narrative, not decorative stock.** Approved art lives in `assets/` (week04–38, breathing-slow-v2, breathing-surge-v2, band-*.webp).

### 4.2 The plant/growth motif — stems & sprigs
The **stem line (`.stemline`)** is the brand's signature organic divider: a thin curved sprig, 1.4px round-cap stroke, drawn as inline SVG, with `design-wide rule: divider stem (growth motif, design-wide rule)` (s7s8s9 L70 comment). Its **meaning: growth/progress of the pregnancy journey** — it separates sections the way a stem separates leaves; used at "section-change" moments.

| Context | Exact instance | Stroke | Where in law |
|---|---|---|---|
| App (S10 home/tips) | `s10s11s12…-tips.html:298` `<div class="stemline"><svg width="46" height="14" viewBox="0 0 46 14"><path d="M2 12 Q14 10 22 7 Q32 3.5 44 2" fill="none" stroke="#D8A0C4" stroke-width="1.4" stroke-linecap="round"/>` | `#D8A0C4` (rose watercolor) | s10 L71 `.stemline { margin:16px 20px 2px }` — **pre-section divider on Wellness check-in (S12)** |
| Web (s3/s4 city/homepage) | `s4-homepage.html:79,142` `<svg class="stemline" width="320" height="16"… stroke="#A8B5A0" … opacity=".8"/>` | `#A8B5A0` (sage stem) | s3 L74, s4 L79/142 — divider between major page sections |
| Week-detail (S2) | `s2-week-detail.html:148` width 200, `stroke:#A8B5A0 opacity:.75` | sage | under-anchor section divider |
| Icon system | `icons.css` L12: *"a tiny leaf/sprig curl is allowed on ONE glyph per family"* — the growth motif micro-dosed into custom icons (1.7px strokes, round caps, sage-ink style per header comment) | — | icons.css L1–26 |
| Timer screen (S11) | NO photo band and NO stem — the timer's organic motif is the `.halo` arc behind `.tcirc` (s10 L106-110: `box-shadow:0 14px 34px rgba(110,108,153,.14)`) | — | s10 L106 |

**Doula compliance:** *silent*. The doula pack **declares `.doula-hband`** with veil (d1 L65–67, d4 L68–70, d7 L84–86) **but renders no actual `<img>`/hband markup on any D1–D10 screen**, **uses no stemline** (0 uses), and has **zero `<img>` tags** across all 4 files. This is the doula pack's main vocabulary gap: it reads as data-table UI, not mom-corpus imagery. The `.doula-note` at d4 L~396 (`Amara prefers home birth setting…`) plays the narrative-art role textually. **Action for council:** either add watercolor spot + stem to D-surfaces (D1 dashboard tip card is the natural slot) or accept a data-first doula look, deliberately.

### 4.3 Photo header bands (hband + veil)
| Param | Mom canon | Doula |
|---|---|---|
| Height | 168px (s10 L127) | 140px (`.doula-hband` d1 L65) — **⚠ deviate** (declared but unused → effectively silent) |
| Photo | `object-fit:cover; object-position:50% 18%` | `object-fit:cover` (d1 L66; explicit position law missing) |
| Veil | mom: `linear-gradient(180deg, rgba(42,42,42,.05) 0%, rgba(250,248,245,0) 45%, rgba(250,248,245,.75) 92%, #FAF8F5 100%)` (s10 L129) | `linear-gradient(180deg, rgba(42,42,42,.04) 0%, rgba(250,248,245,0) 40%, rgba(250,248,245,.7) 90%, #FAF8F5 100%)` (d1 L67) — ⚠ near-match (.04/.40/.70/90 vs .05/.45/.75/92) |
| Radius | none (square edge into screen) | `border-radius:45px 45px 0 0` (d1 L65) |
| Placement | directly under status bar | SURFACES-doula L44: used Dashboard(D1)/ClientDetail(D3)/BirthPlan(D4); omitted on table screens |

The veil's function: **burn the photo into the cream canvas** (ends in exact `#FAF8F5`), so text sits on cream, never on photo.

---

## 5. Component anatomy

### 5.1 Card
| Sub-part | Mom canon | Source | Doula |
|---|---|---|---|
| bg/border/radius/padding | `background:#fff; border:1px solid #EFE0EB; border-radius:20px; padding:15px 17px; margin-top:12px` | common.css L47 | ⚠ radius **14–18px** not 20: `.doula-card` r18 (d1 L20) vs `.doula-srow` r14 (d1 L100) — tiered radii, a real micro-drift |
| key/label `.card .k` | `font-size:10px; letter-spacing:2.2px; text-transform:uppercase; font-weight:700; …gap:7px` | common.css L48 | ✅ 10px/2.2ls (d1 L21, 5px mb) |
| label colors `.k-rose/.k-sage/.k-lav` | `#A25C86 / #5F7154 / #6E6C99` | common.css L49 | ✅ same trio |
| paragraph `.card p` | `font-size:13.5px; line-height:1.55; color:#4B4B4B; font-weight:500` | common.css L50 | ⚠ `.doula-card p` **13px** (d1 L22); notes `.ne-text` 12px (d4 L176) |
| link-more `.card p.more` | `color:#6E6C99; font-size:12.5px; font-weight:600; margin-top:7px` | common.css L51 | ✅ "Learn more" pattern (s10 L179 11px bold #6E6C99 ≈) |
| Stat card | `.stat{flex:1;background:var(--white);border:1px solid var(--border);border-radius:12px;padding:8px 6px;text-align:center}` numerals `.stat .n{Cormorant 700 18px var(--rose)}` | s13 L54–55 | ⚠ `.doula-stat-card` r14 p10/8, numerals 20–22px **lavender #8E8CB5** (d1 L62-63, d10 L131) — larger, lavender, not mom's 18px rose |
| Note-card (D5, 10/07) | — (new 10/07 pattern) | — | ✅ `.note-entry{background:#fff;border:1px solid #EFE0EB;border-left:3px solid #EDEAF6;border-radius:14px;padding:10px 12px;margin-bottom:12px}` (d4 L168) with white cards + 12px gaps per Jeff's 10/07 fix |

### 5.2 Section headers (anatomy + doula)
Pattern (three parts): **overline → serif H1/H2 with rose `em` → sub**.
- Screen header: `.m-head{padding:10px 20px 6px}` (s7s8s9 L24) → `.a-overline` rose 10px (L25) → `.a-h1` Cormorant 26px (L26) + `em→#B085A5` (L27) → `.m-sub` 12.5px (L28).
- Section header: `.sect{margin:16px 20px 0}` (L31) → `.a-h2` 21px (L32) → `.sub` 11.5px (L33).
- Doula: `.mhead{padding:4px 14px 0}` (d1 L151) with identical `.a-overline/.a-h1/.m-sub` (L152–155), ✅; D10/D5 use the same anatomy; D5's 10/07 de-duped header = `Client name (overline) / Notes (em H1) / Birth and postpartum care log (sub)` (d4 L287–291) ✅.
- **⚠ micro-drift:** doula section H2 at 18px (d4 L101) / rows 14–15px vs mom 21px/17px.

### 5.3 Tab bar
| Part | Mom canon | Source | Doula |
|---|---|---|---|
| Bar | height 62px, white bg, `border-top:1px solid #F0E9EE`, `padding:0 10px 8px`, radius `0 0 45px 45px` | common.css L55; s10 L15 | ✅ `.doula-tabbar{padding:8px 18px 12px; …border-radius:0 0 45px 45px}` (d1 L68) |
| Item `.tb` | column flex, `gap:3px; font-size:9px(10.5)` wt700/600, idle `#9C9DA0` | s7s8s9 L16; common.css L56 | ✅ 9px wt600 idle `#9C9DA0` (d1 L69) |
| Active | `.tb.on{color:#6E6C99}` text (s7s8s9 L17) / `#8E8CB5` (common/s13 family) | s7s8s9 L17 | ✅ `.doula-tabbar .tb.on` `#8E8CB5` (d1 L15 of d4, d7 L14, d10 tabbar L269-273) |
| Icons | custom `.ticon` set, 1.7px round-cap strokes in `#2A2A2A` or currentColor, `tico-lg` 26–30px in tab bar (icons.css L1–26 + s10 inline svgs: idle `#9C9DA0`, active `#6E6C99`) | icons.css L1–26 | ⚠ **Doula tab icons are raw Lucide-style rects/circles (`<rect x="3" y="3" width="7"…>`) at 22px** — not the brand's hand-drawn `.ticon` sage-ink set; mom S10 uses hand-drawn home/birthplan glyphs at 26px. Drift: icon style + size. |

### 5.4 Buttons
Primary fill `#6E6C99` pill `.abtn/doula-btn`. Secondary ghost: `transparent, #6E6C99 text, 1.3–1.4px #8E8CB5 border` (.btn.ghost common.css L53; .doula-btn.ghost d1 L56) or track-gray ghost on s13 (`.btn-ghost`, L52). Accent rose: `.rbtn.no`-family / `.inv-actions .btn.copy{background:#F0E9EE;color:#A25C86}` (d7 L179). Pill radius **999px everywhere; no other radius on buttons** (VISUAL-TOKENS L193 "No rounded-lg on CTAs. Ever. Pills only.").

### 5.5 Chips
Semantic palette is a **closed set** (mom `.schip.*` s7s8s9 L41–45; doula `.doula-chip.*` d1 L23–38 — 1:1 semantics):
done/paid/signed/completed/confirmed → sage `#5F7154`/`#E8EDE5`; wip/active/prenatal/today/birth/msg → lavender `#6E6C99(8E8CB5)`/`#F1F1FB(ED`EAF6)`; warn/pending/due/overdue/sent/postpartum → rose `#A25C86`/`#EFE0EB`; todo/draft/upcoming/general → gray `#8A8B8D`/`#F3F1EE`. New/unread dot `#B87AA0` (s7s8s9 L67; d7 msg-unread L198). Form: `9.5–10px wt700 uppercase radius-999 padding 2px 8px`.

### 5.6 Avatars & initials
- Mom: `.avat` 38px circle, lavender bg `#EDEAF6`, Quicksand 700 14px, `#6E6C99` (s7s8s9 L59); sage/rose variants L60–61. s13 variant: 56px, rose bg + Cormorant 700 20px rose letter (L68–69).
- D10 hero avatar: `.profile-avatar` 64px + **3px `#8E8CB5` ring** (d10 L124) — fine as a hub-screen hero variant; not in the mom law.

### 5.7 Grain/texture (corpus-wide constant)
`.screen::after` lays a fractal-noise SVG texture at `opacity:.55; mix-blend-mode:multiply` over every screen (common.css L33–35) — the watercolor-paper feel. Doula ✅ (inherits common.css L32–35: same `.screen` + grain). **RN (10/07, Jeff ruled via Discord 'grain OK'): flat cream is the ratified RN deviation — law §5.5 grain applies to web mockups only; no RN noise component is built or planned.**

---

## 6. First drift table — doula pack vs law (one line per rule)

| # | Rule | Doula verdict | Evidence |
|---|---|---|---|
| 1 | 20px lateral inset | ✅ comply | `.cwrap { padding: 0 20px; … }` all 4 files L11 |
| 2 | Type pair Cormorant/Quicksand | ✅ comply | @font-face decls + d10 L177 claim |
| 3 | H1 26 / H1-em rose | ✅ comply | d1 L153–154 |
| 4 | Overline 10px rose ls2.4 | ✅ comply | d1 L50/L152 |
| 5 | H2 21px serif | ⚠ deviate | `.doula-section .a-h2 = 18px` (d4 L101); `.doula-h2` 21px only in d1 L48 |
| 6 | H3 row 17px | ⚠ deviate | rows at 14–15px (d7 L173 `.inv-name 14px`, d4 L182 `.cc-name 15px`) |
| 7 | Body 13.5px | ⚠ deviate | `.doula-card p` 13px (d1 L22); `.ne-text` 12px (d4 L176) |
| 8 | Stat numerals: serif rose 18px | ⚠ deviate | `Cormorant 700 22px #8E8CB5 lavender` (d1 L63; d10 L131 = 20px) |
| 9 | Stat label 8.5px | ✅ comply | d1 L64 identical |
| 10 | 2×2 stat grid (never 4-across) | ✅ comply | `.doula-stat-grid{grid-template-columns:1fr 1fr;gap:8px}` (d1 L61, d10 L39) + SURFACES-doula L45 |
| 11 | Cream canvas `#FAF8F5` | ✅ comply | screen inline bg every file (d1 L177…) |
| 12 | Palette inside corpus; no blue/purple/playful | ✅ comply | zero blue/purple grep hits; doulaPrimary `#6E6C99` ∈ corpus (SURFACES-doula L40–60 audit) |
| 13 | Card radius 20 / padding 15 17 | ⚠ deviate | r18 + 12/14px on content cards (d1 L20); rows correctly 14px/10 12 |
| 14 | Card paragraph 13.5/1.55 | ⚠ deviate | 13px/1.55 (d1 L22), 12px notes |
| 15 | Section top gap 16px | ⚠ deviate | `.doula-section{margin:12px 0 0}` (d1 L97) |
| 16 | Card gap/rhythm 8–12px | ✅ comply | mb 6–12px throughout (d1 L100, d4 L168) |
| 17 | hband+veil header band | — silent | CSS declared (d1 L65–67, d4/d7) **but 0 `<img>`/hband markup anywhere**; per SURFACES-doula L44 omitted on table screens — *intentional*, keep flagged |
| 18 | Watercolor narrative art | — silent | zero `<img>` in doula pack (grep); note-card text substitutes (d4 L396) |
| 19 | Stem/sprig divider (growth motif) | — silent | 0 `class="stemline"` in any doula file (grep across `.html`); icons.css sprig-curl law not carried |
| 20 | Tab bar anatomy (white r45 border-top) | ✅ comply | d1 L68 |
| 21 | Tab idle/active colors | ✅ comply | d1 L69 + d4 L15 `#8E8CB5` |
| 22 | Hand-drawn ticon set in tab bar | ⚠ deviate | 22px geometric Lucide-style rects (d1 L400–403, d10 L270–273) vs mom 26px hand-drawn (s10 L239) |
| 23 | Chip semantics closed set | ✅ comply | `.doula-chip.*` 1:1 with `.schip.*` (d1 L23–38 vs s7s8s9 L41–45) |
| 24 | Unread dot `#B87AA0` | ✅ comply | `.msg-thread .msg-unread{background:#B87AA0}` (d7 L198) |
| 25 | Pills 999px radius on all buttons | ✅ comply | `.doula-btn/rbtn`, `.inv-actions .btn`, `.cc-actions .btn` (d1 L55–56, d7 L179, d4 L187) |
| 26 | Serif for numerals/amounts/names | ✅ comply | `.inv-amount` 15px, `.cc-amount` 16px, `.profile-name` 20px (d7 L175, d4 L183, d10 L125) |
| 27 | Quote serif-italic 16.5px | — silent | no quote surface in doula pack |
| 28 | Avatar initials circles | ✅ comply | `.doula-avatar` 40px lavender w/sage/rose variants (d1 L40–42); D10 hero 64px ringed (d10 L124) as hub hero variant |
| 29 | Grain texture on screen | ✅ comply | inherits `.screen::after` (common.css L33) |
| 30 | hband veil gradient exact stops | ⚠ deviate | veil declared .04/.40/.70/90 vs mom .05/.45/.75/92 (d1 L67 vs s10 L129) — only matters if/when doula hbands get photos |

---

## 7. Significations summary (what the motifs *mean*)
- **Stem/sprig = growth** — the pregnancy/growth journey visualized as a living stem; used as an organic section divider, and micro-dosed as one leaf/sprig curl per icon family (icons.css L12).
- **Watercolor art = narrative, not decoration** — each image is tied to the specific clinical state it illustrates (breathing rhythms over labor preferences s5 L161; the current week as anchor s6 L18; band scenes per screen s10 L127+).
- **Veil = cream dissolve** — photo bands end in `#FAF8F5` so text never sits directly on photography; text-on-cream is a hard rule.
- **Rose = the accent voice** (overlines, emphasized serif words, warnings/dues), **lavender = interactive/primary**, **sage = success**, gray/track = neutral — the semantic closed set of §5.5 that all four doula files obey.

---

## 8. Open items for the council
1. **Doula imagery gap** (rows 17–19): doula pack ships zero imagery and zero stems. Either (a) intentionally accept data-first doula look, or (b) plan watercolor spot + stem divider for D1 dashboard/lead-insights + D4 birth-plan banner in next revision. Needs Jeff's call.
2. **Type micro-drift** (rows 5–8, 13–15, 30): a normalization pass (H2 18→21, row titles 14–15→17, card p 13→13.5, stat numerals to rose 18px or ratify lavender 22px as a doula variant) — the numbers are small; council should pick "fix" vs "ratify as doula-tier variant" per row.
3. **Doula tab icons** (row 22): replace raw Lucide with hand-drawn brand `.ticon` set at 26px (or get Jeff's OK on 22px geometric). This is the most user-visible compliance gap.
4. **Stat numeral color** (row 8): mom = rose `#A25C86`, doula = lavender `#8E8CB5`. Both are corpus-legal; is lavender-for-doula the intended role split? Needs a decision to close row 8.