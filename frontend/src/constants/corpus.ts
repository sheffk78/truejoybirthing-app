// corpus.ts — Phase 2C: the seam between the approved light corpus
// (designRefresh.ts) and the approved dark corpus (designRefreshDark.ts,
// Jeff-approved 2026-09-23, packet DARK-REVIEW-2026-09-23.pdf).
//
// Law: designRefresh.ts stays FROZEN (verbatim approved light hexes; palette-law
// audits grep it directly). designRefreshDark.ts stays FROZEN too (approved dark
// reversal map). THIS file is the only mutable piece: it selects which corpus
// the shared `C` binding resolves to, and screens keep reading the same `C.rose`
// they always have.
//
// Mechanism: `C` is a Proxy that forwards every property read to the live
// corpus. ThemeContext.setCorpus() flips the live target in an effect that runs
// before paint after a theme flip, so every C.* read in the new render pass
// resolves dark. Consumers that snapshot colors into StyleSheet.create re-run
// because their createThemedStyles cache keys on colors.background, which
// changes with the theme. Module-scope C.* uses resolve to whichever corpus is
// live at import time; the refreshed screens read C inside render, so they are
// theme-reactive.
//
// Module-scope C.* consumers (nav _layouts, helper objects) were converted to
// useCorpus()/corpusFor() in Phase 2C.

import { C as LIGHT_C, F, VEIL_STOPS as LIGHT_VEIL_STOPS, srowBase as srowLight } from './designRefresh';

// ---- srowBase: theme-reactive settings-row base (fixes white cards in dark) ----
// Plain style object consumed as `style={srowBase}`; reads resolve per render,
// so a Proxy dispatching to the live corpus works like C does. In DARK the
// approved card surface is cardBg (#2A2330), not white.
export const srowBase = new Proxy(
  { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0EAE4', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' } as { backgroundColor: string; borderWidth: number; borderColor: string; borderRadius: number; paddingVertical: number; paddingHorizontal: number; flexDirection: 'row'; alignItems: 'center' },
  {
    get(t, prop) {
      const dark = _live === (DARK_CORPUS as unknown as LiveCorpus);
      if (prop === 'backgroundColor') return dark ? DARK_C.cardBg : LIGHT_C.white;
      if (prop === 'borderColor') return dark ? DARK_C.border : LIGHT_C.border;
      return Reflect.get(t, prop);
    },
  },
) as typeof srowLight;
import { C as DARK_C, srowBaseDark, VEIL_STOPS as DARK_VEIL_STOPS } from './designRefreshDark';
import type { ThemeName } from '../store/themeStore';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

// ---- Corpus shape: same token NAMES as the light corpus, values are strings.
// The dark corpus adds split tokens (lavenderText, surface) — the extra keys are
// fine; the token contract is enforced by designRefreshDark.ts's _contract guard.
export type Corpus = typeof LIGHT_C | typeof DARK_C;
export type CorpusFonts = typeof F;

// The approved corpus IS the light corpus.
export const LIGHT_CORPUS: Corpus = LIGHT_C;

// The approved dark corpus (same token contract + split tokens, verified by
// designRefreshDark.ts's _contract type guard at compile time).
export const DARK_CORPUS = {
  ...DARK_C,
  // The approved dark corpus stores the card surface as `cardBg` (#2A2330);
  // `surface` in its ROLES block names the same approved value. Flatten it onto
  // the corpus so screens' C.surface reads resolve in dark without a second lookup.
  surface: (DARK_C as { readonly cardBg: string }).cardBg,
} as const;

export const hasDarkCorpus = true;

// ---- Live corpus binding (Phase 2C) ----
// Mutation target behind the exported `C`. ThemeContext calls setCorpus()
// before painting after a theme flip, so every C.* read in the new render pass
// resolves to the matching corpus.
let _live: LiveCorpus = LIGHT_CORPUS as unknown as LiveCorpus;

export const setCorpus = (themeName: ThemeName): void => {
  _live = themeName === 'DARK' ? (DARK_CORPUS as unknown as LiveCorpus) : (LIGHT_CORPUS as unknown as LiveCorpus);
};

// ---- The shared binding every screen reads ----
// `C.rose` etc. resolve through the Proxy to the live corpus, so a single
// theme flip re-points every color read in the app with zero per-file rewrites
// beyond the import-path switch. C carries the split tokens in BOTH modes
// (light values via the Proxy alias below).
// C carries the split tokens in both modes (light values via Proxy alias).
export type LiveCorpus = { [K in keyof Corpus]: string } & { surface: string; lavenderText: string };

export const C = (new Proxy(_live, {
  get(_t, prop, recv) {
    // Split-token aliases: the approved dark corpus introduced 'surface' (card bg,
    // light #FFFFFF / dark #2A2330) and 'lavenderText' (stat numerals, identical
    // to lavender in light). The frozen light corpus predates the split, so in
    // LIGHT mode these resolve to their light equivalents; designRefresh.ts stays
    // untouched (palette law).
    const splitAliases: Record<string, string> = {
      surface: 'white',
      lavenderText: 'lavender',
    };
    const key = prop as string;
    const resolved =
      _live === LIGHT_CORPUS && splitAliases[key as string] ? (splitAliases[key as string] as string) : (key as string);
    return Reflect.get(_live as object, resolved, recv);
  },
}) as unknown) as LiveCorpus;

// ---- Fonts are theme-invariant (Cormorant/Quicksand in both modes) ----
export const fontsFor = (_t: ThemeName): CorpusFonts => F;

// ---- srowBase: light uses white bg; dark uses the raised dark surface ----
export const srowBaseFor = (t: ThemeName): typeof srowLight =>
  t === 'DARK' ? (srowBaseDark as unknown as typeof srowLight) : srowLight;

// ---- Veil stops: cream fade in light, plum-black fade in dark ----
export const veilStopsFor = (t: ThemeName): typeof LIGHT_VEIL_STOPS =>
  t === 'DARK' ? (DARK_VEIL_STOPS as unknown as typeof LIGHT_VEIL_STOPS) : LIGHT_VEIL_STOPS;

// Shape of one veil stop: color (hex or rgba) + position 0..1
export type VeilStop = { color: string; position: number };
export type VeilStops = readonly VeilStop[];

// CSS `linear-gradient(to bottom, ...)` argument list from stops.
export const veilStopsAsCss = (stops: VeilStops): string =>
  stops
    .map((s) => {
      const pct = Math.round(s.position * 100);
      if (s.color.includes('rgba(')) return `${s.color} ${pct}%`;
      return `${s.color} ${pct}%`;
    })
    .join(', ');

// 'rgba(26, 21, 32, 0.15)' -> '#1A1520'
export const rgbaToHex = (rgba: string): string => {
  const m = /rgba?\(([^)]+)\)/.exec(rgba);
  if (!m) return rgba;
  const [r, g, b] = m[1].split(',').map((x) => parseInt(x.trim(), 10));
  return `#${[r, g, b].map((v) => (v || 0).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

// 'rgba(26, 21, 32, 0.15)' -> 0.15 ; opaque colors -> 1
export const parseRgbaAlpha = (color: string): number => {
  const m = /rgba\([^)]+,\s*([\d.]+)\s*\)/.exec(color);
  return m ? parseFloat(m[1]) : 1;
};

// ---- Selector: one source of truth for which corpus is live ----
export const corpusFor = (themeName: ThemeName): LiveCorpus =>
  (themeName === 'DARK' ? DARK_CORPUS : LIGHT_CORPUS) as unknown as LiveCorpus;

export default corpusFor;

// ---- Theme-invariant pass-throughs ----
// Fonts, photo bands, halo constants, and pure helpers never change between
// modes, so screens importing them through corpus get the frozen approved
// values verbatim. (F and the helpers are re-exported from the light corpus;
// srowBase stays exported as the LIGHT variant for explicit consumers —
// dark-aware consumers use srowBaseFor(themeName).)
export {
  F,
  BAND_HOME, BAND_TIPS, BAND_APPOINTMENTS, BAND_MY_TEAM, BAND_MESSAGES,
  HALO_RADII, HALO_STROKES,
  initialsOf, firstNameOf, trimesterOf, kickerStyle,
} from './designRefresh';

// ---- Hooks: render-time corpus access for dark-aware consumers ----
// useCorpus() re-renders the consumer whenever the effective theme flips and
// hands back the matching corpus. Consumers that snapshot values into
// StyleSheet.create must call this inside the component — never at module scope.
export const useCorpus = (): LiveCorpus => {
  const { themeName } = useTheme();
  return useMemo(() => corpusFor(themeName), [themeName]);
};

export const useCorpusFonts = (): CorpusFonts => {
  const { themeName } = useTheme();
  return useMemo(() => fontsFor(themeName), [themeName]);
};
