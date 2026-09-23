// corpus.ts — Phase 2 token architecture: the seam between the approved light
// corpus (designRefresh.ts) and the dark corpus (to be drafted when Jeff picks
// Option B). LIGHT is the only corpus in production today.
//
// Law: designRefresh.ts stays FROZEN (verbatim approved hexes; palette-law
// audits grep it directly). The live selection flows through corpusFor() /
// useCorpus(). Consumers keep working with raw designRefresh C/F imports —
// they are the frozen LIGHT values — and switch their import path to corpus
// when they go dark-aware. When Option B lands, useCorpus()/readCorpus()
// flip to the dark corpus and each consumer's one-line import-path change
// completes it — mechanical, not a rewrite. That flip is the Phase 2 exit
// gate for any dark corpus work, gated on Jeff's Option A/B decision.
//
// This file must stay dependency-light: only designRefresh, so screens can
// switch imports without new graph weight.

import { C, F, VEIL_STOPS as LIGHT_VEIL_STOPS } from './designRefresh';
import type { ThemeName } from '../store/themeStore';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

// ---- Corpus shape: exactly the approved-corpus contract, typed once ----
export type Corpus = typeof C;
export type CorpusFonts = typeof F;

// The approved corpus IS the light corpus; both stay the same object.
export const LIGHT_CORPUS: Corpus = C;

// Dark corpus placeholder: wired in Phase 2B after Jeff approves a dark
// designRefresh corpus (plan: Option B). Until then the selector falls back
// to light so any premature DARK preference can't ship broken-looking screens.
export const DARK_CORPUS: Corpus = null as unknown as Corpus; // Phase 2B seam

export const hasDarkCorpus = false; // Phase 2B: set true when DARK_CORPUS lands

// ---- Fonts are theme-invariant (Cormorant/Quicksand in both modes) ----
export const fontsFor = (_t: ThemeName): CorpusFonts => F;

// ---- Veil stops (HBand photo-band fade). Approved stops are cream-fade; ----
// ---- dark corpus will override with a #1A1520 fade (Phase 2B).       ----
export const veilStopsFor = (_t: ThemeName) => LIGHT_VEIL_STOPS;

// ---- Pass-through: raw names are the frozen approved LIGHT corpus. ----
// Consumers can switch `from './designRefresh'` -> `from './corpus'` one line
// at a time; values are identical until the Phase 2B dark corpus lands.
export { C, F } from './designRefresh';

// ---- Selector: one source of truth for which corpus is live ----
export const corpusFor = (themeName: ThemeName): Corpus => {
  void themeName; // Phase 2B: return DARK_CORPUS when hasDarkCorpus && themeName === 'DARK'
  return LIGHT_CORPUS;
};

export default corpusFor;

// ---- Hooks: render-time corpus access for dark-aware consumers ----
// useCorpus() re-renders the consumer whenever the effective theme flips and
// hands back the matching corpus (light today; dark once Phase 2B lands).
// Consumers that snapshot values into StyleSheet.create must call this inside
// the component (or a createThemedStyles factory) — never at module scope.

export const useCorpus = (): Corpus => {
  const { themeName } = useTheme();
  return useMemo(() => corpusFor(themeName), [themeName]);
};

export const useCorpusFonts = (): CorpusFonts => {
  const { themeName } = useTheme();
  return useMemo(() => fontsFor(themeName), [themeName]);
};