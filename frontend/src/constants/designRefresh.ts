// designRefresh.ts — S10/S11/S12 approved design tokens (rev 3, Jeff-approved 2026-09-17)
// Source of truth: docs/design-refresh/surfaces-2026-09-14/s10s11s12-mom-home-timer-tips.html + common.css
// Palette law: every hex below appears verbatim in the approved mockup corpus. No other colors allowed.
// Type law (TYPE-SYSTEM.md app column): H1 26 / H2 21 / H3 17 Cormorant; UI = Quicksand; body 13.5 / caption 11.

import type { ImageSourcePropType } from 'react-native';

// ---- Approved palette (verbatim from common.css + s10s11s12 corpus) ----
export const C = {
  cream: '#FAF8F5', // canvas
  ink: '#2A2A2A', // headings
  body: '#4B4B4B', // tip body
  gray: '#6A6B6C', // meta / secondary
  grayLight: '#8A8B8D', // stat labels, read-source
  rose: '#A25C86', // kickers / warn / overline
  roseSoft: '#B085A5', // H1 accent word, week chips
  roseBorder: '#B87AA0', // affirmation left border, unread dot
  roseBg: '#EFE0EB', // rose icon chip, warn chip bg
  lavender: '#6E6C99', // primary pill / active tab / stat numerals
  lavenderSoft: '#8E8CB5', // progress fill, yes-button
  lavenderBorder: '#D5D3E8', // ghost pill border
  lavenderBg: '#F1F1FB', // icon chip bg
  sage: '#5F7154', // sage kicker
  sageBg: '#E8EDE5', // sage icon chip, done chip bg
  border: '#EFE0EB', // card border
  hairline: '#F0E9EE', // strip / tab-bar hairline
  cardBg: '#FDFCFA', // ghost pill bg
  halo: '#EDEAF6', // S11 halo rings stroke (mockup svg.halo)
  chev: '#B9AFB8', // row chevron (mockup .chev)
  track: '#F3F1EE', // progress track
  white: '#FFFFFF',
} as const;

// ---- Approved fonts (expo-google-fonts, loaded in app/_layout.tsx) ----
export const F = {
  serif: 'CormorantGaramond_700Bold', // H1/H2/clock/stat numerals
  serifSemi: 'CormorantGaramond_600SemiBold', // H3 card titles
  serifItalic: 'CormorantGaramond_600SemiBold_Italic', // affirmation quote
  ui: 'Quicksand_500Medium', // body/meta (app face per TYPE-SYSTEM)
  uiReg: 'Quicksand_400Regular',
  uiSemi: 'Quicksand_600SemiBold',
  uiBold: 'Quicksand_700Bold', // kickers / pills / labels
} as const;

// ---- Approved header photo bands ----
export const BAND_HOME = require('../../assets/images/band-home-couch.webp') as ImageSourcePropType;
export const BAND_TIPS = require('../../assets/images/band-tips-teaching.webp') as ImageSourcePropType;

// ---- Veil: 3-stop fade over the photo band (common.css .hband .veil) ----
export const VEIL_STOPS = [
  { position: 0, color: 'rgba(42,42,42,0.05)' },
  { position: 0.45, color: 'rgba(250,248,245,0)' },
  { position: 0.92, color: 'rgba(250,248,245,0.75)' },
  { position: 1, color: '#FAF8F5' },
] as const;

// ---- S11 halo rings (verbatim from mockup svg.halo, scaled 420→r values) ----
export const HALO_RADII = [98, 132, 168, 204] as const;
export const HALO_STROKES = [1.4, 1.2, 1.1, 1] as const;

// ---- Helpers shared by the three screens ----
export const initialsOf = (name: string | undefined | null, fallback = 'there'): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
};

export const firstNameOf = (name: string | undefined | null, fallback = 'there'): string =>
  name?.trim().split(/\s+/)[0] || fallback;

export const trimesterOf = (week: number): string => {
  if (week <= 13) return 'First trimester';
  if (week <= 27) return 'Second trimester';
  return 'Third trimester';
};

// Kickers: 10px caps, 2.2px tracking (mockup .k-rose/.k-sage/.k-lav)
export const kickerStyle = (color: string) => ({
  fontSize: 10,
  letterSpacing: 2.2,
  textTransform: 'uppercase' as const,
  fontWeight: '700' as const,
  fontFamily: F.uiBold,
  color,
});

// Shared card row: white, 1px #EFE0EB, r18, padding 12/14, gap 12
export const srowBase = {
  backgroundColor: C.white,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 18,
  paddingVertical: 12,
  paddingHorizontal: 14,
} as const;