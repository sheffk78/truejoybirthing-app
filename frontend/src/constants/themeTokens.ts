// True Joy Birthing - Theme Tokens System
// P1 TOKEN COLLAPSE (2026-10-09, JOB-2026-10-09h): value definitions MOVED to
// tokens.ts (pure leaf) — the single token home.
// This file keeps: the ColorTokens/Theme contract the app types against, the
// getTheme() selector, and its role as the ONLY consumer bridging tokens into
// ThemeContext. Do not add values here; add them in tokens.ts (pure leaf).

import { SEM_LIGHT, SEM_DARK, FONTS, SIZES, BRAND } from './tokens';

// ============================================
// COLOR TOKEN SHAPE (types only — values live in corpus.ts)
// ============================================

export interface ColorTokens {
  // Backgrounds
  background: {
    primary: string;
    secondary: string;
    surface: string;
    elevated: string;
    subtle: string;
  };

  // Text
  text: {
    primary: string;
    secondary: string;
    muted: string;
    onAccent: string;
    inverse: string;
  };

  // Accent (Brand colors)
  accent: {
    primary: string;       // Lavender
    primaryLight: string;
    primaryDark: string;
    secondary: string;     // Dusty Rose
    secondaryLight: string;
    secondaryDark: string;
    tertiary: string;      // Sage Green
  };

  // Borders
  border: {
    subtle: string;
    default: string;
    strong: string;
  };

  // Status
  status: {
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    error: string;
    errorBg: string;
    info: string;
    infoBg: string;
  };

  // Role-specific
  role: {
    mom: string;
    doula: string;
    midwife: string;
    lactation: string;
    admin: string;
  };

  // Mood colors (for wellness tracking)
  mood: {
    veryLow: string;
    low: string;
    neutral: string;
    good: string;
    great: string;
  };

  // Overlay
  overlay: {
    backdrop: string;
    light: string;
  };

  // Special
  white: string;
  black: string;
  transparent: string;
}

// ============================================
// FULL THEME TYPE
// ============================================

export interface Theme {
  name: 'LIGHT' | 'DARK';
  colors: ColorTokens;
  fonts: typeof FONTS;
  sizes: typeof SIZES;
  brand: typeof BRAND;
}

// Compile-time guarantee: the corpus semantic maps keep the exact token shape
// (every drift here is a P1 regression, not a silent value change).
const _lightCheck: ColorTokens = SEM_LIGHT;
const _darkCheck: ColorTokens = SEM_DARK;
void _lightCheck;
void _darkCheck;

// ============================================
// THEME SELECTOR (values from corpus.ts)
// ============================================

export const LIGHT_THEME: Theme = {
  name: 'LIGHT',
  colors: SEM_LIGHT,
  fonts: FONTS,
  sizes: SIZES,
  brand: BRAND,
};

export const DARK_THEME: Theme = {
  name: 'DARK',
  colors: SEM_DARK,
  fonts: FONTS,
  sizes: SIZES,
  brand: BRAND,
};

export const getTheme = (themeName: 'LIGHT' | 'DARK'): Theme => {
  return themeName === 'DARK' ? DARK_THEME : LIGHT_THEME;
};

export default { LIGHT_THEME, DARK_THEME, getTheme };