# My Pregnancy App — Design Analysis & TJB Incorporation Plan

> **⚠️ VERDICT (Jeff, 2026-09-12):** Visual direction REJECTED — "too cartoony, too far from our design." The MP blue palette and 3D-fetus style are OUT. Sections 1–3 (what the app is, design DNA, why it works) and the flow-lesson column of §4 remain valid as STRUCTURE input. The visual-incorporation guidance in §4–§6 is superseded by **`DESIGN-DIRECTION-ILLUSTRATION-FIRST.md`** (same folder): keep TJB palette, double down on our own gestation illustration series + Coverr system.
>
> **Correction (Jeff catch, 2026-09-12):** The week-spine mockup initially used #7C3AED (website-token violet) instead of the app's canonical lavender. The MOBILE APP palette lives in `frontend/src/constants/themeTokens.ts` (Lavender 500 = **#8E8CB5**, primaryDark = #6E6C99, light surfaces #D5D3E8/#EDEAF6 — NOT the website's #7C3AED set). App-facing design work must pull tokens from themeTokens.ts. Mockup corrected to #8E8CB5 family; see week-spine-mockup/week-spine-v3.png.

**Date:** 2026-09-12 · **Requested by:** Jeff (via Shelbi's recommendation) · **Channel:** #truejoybirthing-web

---

## 1. What the app is

**My Pregnancy | Tracker & App** (developer: Aleksei Neiman / pregnancy-parenting.com) — a completely free, no-ads, no-subscription week-by-week pregnancy tracker. 1M+ installs, 4.8★, 10,000+ five-star reviews. Recently redesigned for iOS 26 with a new welcome screen. Core loop: open the app → see *your week* → read what's happening with baby + mom → use a tool (kick counter, contraction timer, weight tracker, to-do lists).

Why Shelbi likely loves it (from actual reviews): "I love the simplicity of this app. Each week it gives you a little date about 'baby', 'mom', and 'useful advice' tips." Another: "the weekly and daily articles are some of the highest quality I've seen." It's calm, private, and never pressures you to buy anything.

## 2. The Design DNA — 8 signature elements

Based on analysis of the app's real UI (official site screenshots) and App Store presentation:

1. **A calm gradient world with soft bokeh.** Light sky-blue gradient background with translucent white circles floating in it. Every screen feels airy and dreamlike — nothing shouts.
2. **One idea per card.** White cards, moderately rounded corners, no borders, soft diffused shadows, generous padding. A card shows a single module: due date + progress ring, remaining days, this week's article, baby dimensions. Never a card stuffed with three things.
3. **The week is the spine.** The whole app organizes around "Week 10" as a hero label. A horizontal week stepper (circular buttons, 6–14) with the current week highlighted in a warm accent color lets you browse any week. Everything — imagery, articles, measurements — hangs off that week number.
4. **Baby ↔ Mother duality.** Bottom toggle switches between "Baby" and "Mother" views. Every week has content for both, plus a third "useful advice" layer. The mom is a first-class audience, not an afterthought.
5. **Data made tangible.** Baby dimensions as a clean 3-column data row (Length · Weight · Size of a prune). Fruit comparisons. A circular progress ring ("24%") instead of bars. Numbers feel personal, not clinical.
6. **Rounded friendly typography, strict hierarchy.** Bold rounded sans-serif titles, regular-weight body, clear size steps. No serif anywhere, no more than ~3 text levels per screen.
7. **One saturated accent per module.** Coral-red STOP button, mint-green kick circle, pink icon circle, orange active week, yellow stars. Everything else stays neutral — which makes each action feel obvious and inviting.
8. **Delightful micro-illustrations.** Soft 3D fetus in a translucent amniotic sac, flat-friendly clipboard-and-pencil, footprint icon in the kick button. Small, warm, consistent — never clip-art, never stock.

**Emotional tone:** a gentle companion. Calm, nurturing, reassuring, optimistic. It respects an anxious, tired, overwhelmed reader.

## 3. What makes it work (the transferable principles)

- **Rhythm over volume.** Content arrives in weekly portions — the app never dumps everything at once. This creates a daily-open habit.
- **Calm = trust.** Soft palette, whitespace, single-focus cards reduce cognitive load for a stressed audience.
- **Progress is always visible.** Progress ring, days remaining, week stepper — she can feel herself moving forward.
- **Both of them matter.** Baby content AND mom content, clearly separated.
- **Zero-pressure positioning.** "No subscriptions / No in-app purchases / No ads" is *part of the design* — trust badges rendered as beautiful cards.

## 4. How we incorporate this into the TJB app

We keep our identity (warm cream / dusty rose / lavender / sage, hand-drawn illustration style, our serif headline moments) and adopt My Pregnancy's *structure and discipline*:

| # | Move | What changes in TJB |
|---|------|---------------------|
| 1 | **Adopt the week spine** | Reorganize the mom dashboard around "Your week N" — a hero week label + horizontal week stepper. Our existing Weekly Tip, Weekly Affirmation, and weekly article cards bind to the current week and become browsable week-by-week. This directly matches how Shelbi described the experience: "each week it gives you a little date about baby, mom, and advice." |
| 2 | **Baby ↔ Mother toggle** | Per-week content view with "For baby" / "For mom" tabs, plus our third lane: "For your birth" (education + birth-plan prompts). Mirrors their most-loved duality while staying TJB. |
| 3 | **One-idea-per-card discipline** | Audit every dashboard card: if it holds two ideas, split it. Kill the remaining left-edge accent bars (already agreed in the design refresh) — use single-accent *elements* inside the card (a rose progress ring, a sage checkmark) instead of template edge bars. |
| 4 | **Progress made tangible** | Replace bar-style birth-plan progress with a soft circular progress ring in rose, plus "days until your due date" as its own calm card. |
| 5 | **Tangible data moments** | Where our weekly content covers fetal development, add a 3-column data row (length · weight · "size of a …") in our own illustration style — hand-drawn fruit/space-object comparisons fit our Coverr illustration system. |
| 6 | **One saturated accent per action** | Our CTAs currently blend into cards. Borrow their discipline: exactly one confident accent per module (e.g., lavender ring button for the primary weekly action), everything else neutral. |
| 7 | **Micro-illustrations, not stock** | Their soft 3D fetus is their identity move. Ours is the approved hand-drawn spot-illustration style (lavender sprigs, teacup, gentle hands). Every weekly article card gets one small illustration — consistent line weight, muted palette. |
| 8 | **Trust-as-design** | We don't have "no ads" — but we have our equivalent: "Built with doulas" / "Evidence-based, judgment-free" rendered as calm badge cards in the welcome flow (they just added a welcome screen too — ours should match this quality bar). |

## 5. What NOT to copy

- **The sky-blue palette.** It's their identity; ours is warm cream + rose + lavender. Adopting blue would dilute us and clash with every existing TJB asset. Structure yes, color no.
- **3D rendered fetus imagery.** Off-brand for our hand-drawn editorial aesthetic, and AI-render baby anatomy is a trust risk (see our AI-image policy). Hand-drawn interpretations instead.
- **Weight-centric tracking.** Their most common criticism (weight "shamey and insulting," per reviews). TJB differentiates: body-neutral, judgment-free content is a positioning win.
- **Week rounding.** Users complained "5w2d shows as 6 weeks." We display exact week + days.

## 6. Recommended next step

Build one **HTML mockup of the TJB mom dashboard restructured on the week spine** (week stepper + Baby/Mom/Birth toggle + progress ring + single-focus cards with micro-illustrations) in our existing palette, and place it side-by-side with the current dashboard for review — same test-subsection approach as the running design refresh. My Pregnancy proves the pattern works for this exact audience; the win is applying it inside our warm editorial identity.

---

## Appendix — Sources

- App Store: https://apps.apple.com/us/app/my-pregnancy-tracker-app/id1472316290 (screenshots analyzed at full resolution)
- Official site + in-app UI screenshots: https://my-pregnancy.app/
- Local analysis assets: `/Users/socializerender/Downloads/mp-analysis/` (3 App Store shots + 4 site UI shots)
- TJB design context: `tjb-design` skill; design-refresh mockups at `Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/`
- Delivery (Discord, 2026-09-12): PDF at https://x0.at/myxu.pdf (mirror: https://files.catbox.moe/glwdhq.pdf) · main-screen UI https://files.catbox.moe/vkq15w.png · week-detail UI https://x0.at/s0rd.png · marketing shot https://x0.at/AaMj.jpg · kick-counter shot https://x0.at/hqDy.jpg · fetal-dev shot https://x0.at/TobJ.jpg