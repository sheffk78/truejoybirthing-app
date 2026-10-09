// tokens.ts — PURE TOKEN LEAF (P1 token collapse, 2026-10-09, JOB-2026-10-09h)
//
// The single home for every token VALUE: fonts, sizes, spacing semantics,
// brand assets, and the semantic color maps (light + dark). This file must
// stay a dependency-free leaf — no React, no ThemeContext, no hooks — because
// ThemeContext, corpus.ts, themeTokens.ts and theme.ts all consume it, and a
// cycle here re-creates the half-initialized-import failure (found live in
// jest 2026-10-09: corpus -> ThemeContext -> themeTokens -> corpus).
//
// Provenance policy: every hex is either (a) a verbatim approved corpus hex,
// or (b) a SHIPPED legacy value with no law owner, kept verbatim to guarantee
// zero visual change in P1 and tagged for the P1b Jeff eyeball pass (list at
// the bottom). Behavior (live light/dark switching) lives in corpus.ts; the
// typed contract lives in themeTokens.ts.

import type { ImageSourcePropType } from 'react-native';

// ---- Fonts, legacy-keyed (theme.ts shape; values = corpus law faces) ----
export const FONTS = {
  heading: 'CormorantGaramond_700Bold',
  subheading: 'CormorantGaramond_600SemiBold',
  headingItalic: 'CormorantGaramond_600SemiBold_Italic',
  body: 'Quicksand_500Medium',
  bodyMedium: 'Quicksand_500Medium',
  bodyItalic: 'Quicksand_400Regular',
  bodyBold: 'Quicksand_700Bold',
  regular: 'Quicksand_400Regular',
  medium: 'Quicksand_500Medium',
  semiBold: 'Quicksand_600SemiBold',
  bold: 'Quicksand_700Bold',
} as const;

// ---- Sizes (verbatim from theme.ts — 10/07-law ladder unchanged) ----
export const SIZES = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
  radiusXs: 4, radiusSm: 8, radiusMd: 12, radiusLg: 16, radiusXl: 24, radiusFull: 9999,
  fontXs: 11, fontSm: 13.5, fontMd: 13.5, fontLg: 17, fontXl: 21, fontXxl: 26,
  fontTitle: 26, fontHero: 34,
  touchMin: 44,
} as const;

// ---- Purpose spacing semantics (P1.2): name the chords the corpus uses so
// P3 sweeps stop re-inventing raw numbers. ----
export const SEM_SPACING = {
  sectionGap: 24,  // between major sections (SIZES.lg)
  cardGap: 12,     // between sibling cards
  rowPadY: 12,     // card row vertical padding (srowBase law)
  rowPadX: 14,     // card row horizontal padding (srowBase law)
  screenX: 20,     // approved screen-content horizontal padding (09-18)
  bandHeight: 168, // header photo band law height
} as const;

// ---- Brand assets (verbatim from theme.ts) ----
const logoPng = require('../../assets/images/logo.png') as ImageSourcePropType;
const logoIconPng = require('../../assets/images/logo-icon.png') as ImageSourcePropType;

export const BRAND = {
  logoPng,
  logoIconPng,
  logoJpg: logoPng,
  logoSvg: logoPng,
  logoIcon: logoIconPng,
  logoWordmarkWhite: logoPng,
  logoWordmarkMono: logoPng,
  name: 'True Joy Birthing',
  tagline: 'Your birth plan, your team, your support in one place.',
};

// ---- Semantic color map, LIGHT (verbatim from former themeTokens.LIGHT_COLORS) ----
export const SEM_LIGHT = {
  background: {
    primary: '#FAF8F5',   // law C.cream
    secondary: '#F5F3EF', // LEGACY-1
    surface: '#FDFCFA',   // law C.cardBg
    elevated: '#FFFFFF',  // law C.white
    subtle: '#F5F3EF',    // LEGACY-1
  },
  text: {
    primary: '#2A2A2A',   // law C.ink
    secondary: '#6A6B6C', // law C.gray
    muted: '#9A9B9C',     // LEGACY-2
    onAccent: '#FFFFFF',  // law C.white
    inverse: '#FFFFFF',   // law C.white
  },
  accent: {
    primary: '#8E8CB5',      // law C.lavenderSoft (ratified provider-tier 500)
    primaryLight: '#D5D3E8', // law C.lavenderBorder
    primaryDark: '#6E6C99',  // law C.lavender
    secondary: '#B87AA0',    // law C.roseBorder
    secondaryLight: '#E6BBD8', // LEGACY-3
    secondaryDark: '#9A5E84',  // LEGACY-4
    pressed: '#5B5982',        // LEGACY-13 pressed lavender
    tertiary: '#A8B5A0',       // LEGACY-5 light-sage tint
    tertiaryPressed: '#7F8E76', // LEGACY-14 pressed sage
  },
  border: {
    subtle: '#E6E4F4',  // LEGACY-6
    default: '#D5D3E8', // law C.lavenderBorder
    strong: '#8E8CB5',  // law C.lavenderSoft
  },
  status: {
    success: '#A8B5A0',   // LEGACY-5 (17 consumers — mapping is a Jeff call)
    successBg: '#E8EDE5', // law C.sageBg
    warning: '#E6C685',   // LEGACY-7
    warningBg: '#FFF8E6', // LEGACY-8
    error: '#D48A8A',     // LEGACY-9 (10/07: corpus moodLow rose)
    errorBg: '#FCEAEA',   // LEGACY-10
    info: '#8E8CB5',      // law C.lavenderSoft
    infoBg: '#F1F1FB',    // law C.lavenderBg
  },
  role: {
    mom: '#B87AA0',       // law C.roseBorder
    doula: '#8E8CB5',     // law C.lavenderSoft
    midwife: '#A8B5A0',   // LEGACY-5
    lactation: '#6BAFA0', // LEGACY-11 teal
    admin: '#6A6B6C',     // law C.gray
  },
  mood: {
    veryLow: '#D48A8A', // LEGACY-9
    low: '#E6C685',     // LEGACY-7
    neutral: '#B0A6B4', // LEGACY-12
    good: '#A8B5A0',    // LEGACY-5
    great: '#8E8CB5',   // law C.lavenderSoft
  },
  overlay: {
    backdrop: 'rgba(42, 42, 42, 0.5)',
    light: 'rgba(255, 255, 255, 0.9)',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ---- Semantic color map, DARK (verbatim from former themeTokens.DARK_COLORS,
// already reconciled to the approved dark corpus at Phase 2C) ----
export const SEM_DARK = {
  background: {
    primary: '#1A1520',   // law D.cream
    secondary: '#221B20', // law D.gbandMid
    surface: '#2A2330',   // law D.cardBg
    elevated: '#2F2C3A',  // law D.halo
    subtle: '#222235',    // law D.lavenderBg
  },
  text: {
    primary: '#F5F3F6',   // law D.ink
    secondary: '#B6B1B9', // law D.body
    muted: '#9E97A4',     // law D.gray
    onAccent: '#FFFFFF',  // law D.white
    inverse: '#1A1520',   // law D.canvas
  },
  accent: {
    primary: '#8E8CB5',      // law D.lavenderSoft
    primaryLight: '#9796B9', // law D.lavenderText
    primaryDark: '#6E6C99',  // law D.lavender
    secondary: '#AE7698',    // law D.rose
    secondaryLight: '#C09BB6', // law D.roseSoft
    secondaryDark: '#BD7FA5',  // law D.roseBorder
    tertiary: '#728F60',     // law D.sage
  },
  border: {
    subtle: '#3C3540',  // law D.hairline
    default: '#473943', // law D.border
    strong: '#434059',  // law D.lavenderBorder
  },
  status: {
    success: '#728F60',   // law D.sage
    successBg: '#293522', // law D.sageBg
    warning: '#C09BB6',   // law D.roseSoft
    warningBg: '#372031', // law D.roseBg
    error: '#AE7698',     // law D.rose
    errorBg: '#372031',   // law D.roseBg
    info: '#9796B9',      // law D.lavenderText
    infoBg: '#222235',    // law D.lavenderBg
  },
  role: {
    mom: '#AE7698',     // law D.rose
    doula: '#8E8CB5',   // law D.lavenderSoft
    midwife: '#728F60', // law D.sage
    lactation: '#7BC9B8', // LEGACY-11 teal family
    admin: '#9E97A4',   // law D.gray
  },
  mood: {
    veryLow: '#AE7698', // law D.rose
    low: '#C09BB6',     // law D.roseSoft
    neutral: '#9E97A4', // law D.gray
    good: '#728F60',    // law D.sage
    great: '#9796B9',   // law D.lavenderText
  },
  overlay: {
    backdrop: 'rgba(0, 0, 0, 0.7)',
    light: 'rgba(26, 21, 32, 0.9)',
  },
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ---- P1b Jeff eyeball list (do NOT act without him) ----
// Legacy values above with no approved-corpus owner, shipped as-is:
//   LEGACY-5  light sage tint -> success/midwife/tertiary/good (4 tokens)
//   LEGACY-11 teal (light) + dark teal family -> lactation role
//   LEGACY-9  moodLow/error rose (light; dark maps to law D.rose)
//   LEGACY-7  warning/low amber
//   LEGACY-12 mood neutral lavender-gray
//   LEGACY-13 pressed lavender (accent.pressed)
//   LEGACY-14 pressed sage (accent.tertiaryPressed)
//   LEGACY-1  warm alt surface · LEGACY-2 muted text
//   LEGACY-3/4 rose light/dark accents · LEGACY-6 border subtle
//   LEGACY-8/10 warn/error chip bgs