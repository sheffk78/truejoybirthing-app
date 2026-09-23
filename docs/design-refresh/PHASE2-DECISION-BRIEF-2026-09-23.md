# Phase 2 Decision Brief — Dark Mode + Token Architecture
**2026-09-23 · Kit · for Jeff · ONE pick needed**

Plan: `docs/design-refresh/RESKIN-COMPLETION-PLAN-2026-09-22.md` § Phase 2
Code: commits `8db1a38c` + `8398b391` (local only — no push, per your no-deploy directive)

---

## TL;DR

The token architecture (the unconditional half of Phase 2) is **built and committed**. The app is now light-locked until you decide dark mode's fate. Your pick: **Option A (light-only)** or **Option B (full dark corpus)**.

## What shipped today (both options benefit)

1. **Corpus seam** (`src/constants/corpus.ts`): one selector (`corpusFor(themeName)` + `useCorpus()` hook) between the approved light corpus and any future dark corpus. `designRefresh.ts` stays FROZEN — palette-law audits keep grepping it directly. When Option B lands, each screen goes dark-aware with a **one-line import-path change** — mechanical, not a rewrite.
2. **Light-lock guard** (`corpusGate.ts` + `themeStore.resolveEffective()`): with `DARK_CORPUS_SHIPPED = false`, nothing resolves to DARK — not even SYSTEM on a dark-mode device (that bypass existed until today's second commit; SYSTEM-on-dark-device previously stayed dark → mixed-mode screens). Stored preferences are kept intact, so flipping the flag later restores every user's choice instantly. Node probe verified: flag off → all LIGHT; flag on → DARK prefs restore.
3. **Appearance UI tells the truth**: Dark option now reads "Coming in v2" and is disabled; SYSTEM reads "Light until dark ships in v2" (under lock).
4. **tsc --noEmit: 0 errors** (baseline preserved).

## Audit findings you should know (new, from today's machinery audit)

- **Mom profile's "Appearance" row is decorative** — a Card with no press handler. The real `AppearanceSettings` UI only mounts on **provider** Profile. So moms can't change appearance at all today; providers can. This was true before today's work.
- The plan's "AppearanceSettings reachable from mom Profile → Appearance" is therefore wrong in practice.

## THE PICK

**Option A — Light-only app (recommended)**
- The approved corpus is cream-based; half-dark ships broken-looking. Lock is already live via today's commits.
- Work remaining: **~1 hour**. Decide the dead mom-profile Appearance row (remove it, or keep as a static row), delete the Dark option from the Appearance UI, final tsc + commit. Done — revisit dark mode as v2 with its own mockup packet.
- Zero new design approval cycles.

**Option B — Full dark corpus**
- Work remaining: **a full extra phase**: Kit drafts a DARK corpus (base #1A1520 already drafted in themeTokens.DARK_COLORS), mockup packet for your approval, then all 18 refreshed + 6 Phase-1 screens get dark-aware (one-line each via today's seam), plus veil/halo/photo-band dark variants, plus a dark QA packet before release (Phase 4 requirement).
- Today's seam makes the consumer work mechanical; the DESIGN work (corpus values + your approval) is the cost.

## Phase 3 status (for the record)

Consistency sweep items that don't depend on this pick can start anytime: legacy `COLORS.*` imports, icon/type/inset laws, off-palette hex grep. Say the word.

---
*Reply in Discord: "A" or "B".*