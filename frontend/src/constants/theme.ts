// theme.ts — LEGACY ALIAS SHIM (P1 token collapse, 2026-10-09, JOB-2026-10-09h)
//
// This file used to define its own palette; that palette drifted from the
// approved design law. As of P1 it defines NOTHING: every token value lives in
// src/constants/corpus.ts (the single home for colors, fonts, sizes, brand
// assets, and the semantic maps). Values below are byte-identical to the ones
// this file shipped before the collapse — no screen changes appearance.
//
// NEW CODE: import from './corpus' instead — colors via C/useCorpus, semantics
// via getTheme() (themeTokens.ts). This shim exists only so the remaining
// imports keep compiling until P3 sweeps them onto corpus.
//
// Law refs: docs/design-refresh/CONSISTENCY-SPEC.md · corpus.ts header.

import { FONTS, SIZES, BRAND, SEM_LIGHT } from './tokens';

// Legacy flat palette — every entry maps onto the corpus semantic map.
// (Mood/status/role accents: provenance notes in tokens.ts P1b eyeball list.)
export const COLORS = {
  // Backgrounds
  background: SEM_LIGHT.background.primary,   // cream canvas (law)
  surface: SEM_LIGHT.background.surface,
  subtle: SEM_LIGHT.background.subtle,
  white: SEM_LIGHT.white,

  // Text
  textPrimary: SEM_LIGHT.text.primary,
  textSecondary: SEM_LIGHT.text.secondary,
  textLight: SEM_LIGHT.text.muted,
  textOnPrimary: SEM_LIGHT.text.onAccent,

  // Borders
  border: SEM_LIGHT.border.subtle,

  // Brand accents (law values via corpus)
  primary: SEM_LIGHT.accent.primaryDark,      // law lavender #6E6C99
  primaryLight: SEM_LIGHT.accent.primaryLight,
  primaryDark: SEM_LIGHT.accent.pressed,      // LEGACY pressed state (P1b list)
  secondary: SEM_LIGHT.accent.secondary,      // rose border
  secondaryLight: SEM_LIGHT.accent.secondaryLight,
  secondaryDark: SEM_LIGHT.accent.secondaryDark,

  // Status / mood / roles (shipped values; provenance + eyeball list in corpus.ts)
  accent: SEM_LIGHT.accent.tertiary,
  accentLight: SEM_LIGHT.status.successBg,    // law sageBg
  accentDark: SEM_LIGHT.accent.tertiaryPressed, // LEGACY pressed sage (P1b list)
  success: SEM_LIGHT.status.success,
  warning: SEM_LIGHT.status.warning,
  error: SEM_LIGHT.status.error,
  info: SEM_LIGHT.status.info,
  moodVeryLow: SEM_LIGHT.mood.veryLow,
  moodLow: SEM_LIGHT.mood.low,
  moodNeutral: SEM_LIGHT.mood.neutral,
  moodGood: SEM_LIGHT.mood.good,
  moodGreat: SEM_LIGHT.mood.great,
  roleMom: SEM_LIGHT.role.mom,
  roleDoula: SEM_LIGHT.role.doula,
  roleMidwife: SEM_LIGHT.role.midwife,
  roleLactation: SEM_LIGHT.role.lactation,    // LEGACY teal (P1b list)
  roleAdmin: SEM_LIGHT.role.admin,
} as const;

export { FONTS, SIZES, BRAND };
export default { COLORS, FONTS, SIZES, BRAND };