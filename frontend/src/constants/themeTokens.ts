// True Joy Birthing - Theme Tokens System
// Supports Light and Dark mode with calming, supportive brand voice

import { FONTS, SIZES, BRAND } from './theme';

// ============================================
// COLOR TOKENS
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
// LIGHT THEME COLORS
// ============================================

export const LIGHT_COLORS: ColorTokens = {
  background: {
    primary: '#FAF8F5',      // Cream canvas
    secondary: '#F5F3EF',    // Warm alternate surface
    surface: '#FDFCFA',      // Subtle lift for cards
    elevated: '#FFFFFF',     // Modals / highest surfaces
    subtle: '#F5F3EF',       // Warm subtle background
  },
  
  text: {
    primary: '#2A2A2A',      // Charcoal
    secondary: '#6A6B6C',    // Gray body text
    muted: '#9A9B9C',        // Captions / muted text
    onAccent: '#FFFFFF',     // White on accent backgrounds
    inverse: '#FFFFFF',      // For dark backgrounds
  },
  
  accent: {
    primary: '#8E8CB5',      // Lavender 500
    primaryLight: '#D5D3E8', // Lavender 300
    primaryDark: '#6E6C99',  // Lavender 600
    secondary: '#B87AA0',    // Rose 500
    secondaryLight: '#E6BBD8',
    secondaryDark: '#9A5E84',
    tertiary: '#A8B5A0',     // Sage
  },
  
  border: {
    subtle: '#E6E4F4',       // Lavender 200
    default: '#D5D3E8',      // Lavender 300
    strong: '#8E8CB5',       // Lavender 500
  },
  
  status: {
    success: '#A8B5A0',      // Sage
    successBg: '#E8EDE5',
    warning: '#E6C685',      // Warm yellow
    warningBg: '#FFF8E6',
    error: '#D48A8A',        // Soft red
    errorBg: '#FCEAEA',
    info: '#8E8CB5',         // Lavender
    infoBg: '#F1F1FB',
  },
  
  role: {
    mom: '#B87AA0',          // Rose
    doula: '#8E8CB5',        // Lavender
    midwife: '#A8B5A0',      // Sage
    lactation: '#6BAFA0',    // Teal-green
    admin: '#6A6B6C',        // Gray
  },
  
  mood: {
    veryLow: '#D48A8A',
    low: '#E6C685',
    neutral: '#B0A6B4',
    good: '#A8B5A0',
    great: '#8E8CB5',
  },
  
  overlay: {
    backdrop: 'rgba(42, 42, 42, 0.5)',  // Dark overlay for modals
    light: 'rgba(255, 255, 255, 0.9)',
  },
  
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// ============================================
// DARK THEME COLORS
// ============================================

export const DARK_COLORS: ColorTokens = {
  // Phase 2C: reconciled to the APPROVED dark corpus (designRefreshDark.ts,
  // Jeff-approved 2026-09-23). Every hex below comes verbatim from that corpus
  // (or is the same hue family resolved for the shared token shape).
  background: {
    primary: '#1A1520',      // canvas — approved dark cream reversal
    secondary: '#221B20',    // gbandMid — approved dark alternate surface
    surface: '#2A2330',      // cardBg — approved dark raised surface
    elevated: '#2F2C3A',     // halo — approved dark elevated surface
    subtle: '#222235',       // lavenderBg — approved dark subtle chip bg
  },

  text: {
    primary: '#F5F3F6',      // ink — approved dark headings (16.2:1 on canvas)
    secondary: '#B6B1B9',    // body — approved dark tip body (8.51:1)
    muted: '#9E97A4',        // gray — approved dark meta/secondary (5.34:1)
    onAccent: '#FFFFFF',     // on-accent text stays white (4.92:1 on kept midtones)
    inverse: '#1A1520',      // canvas (for light-on-dark inversions)
  },

  accent: {
    primary: '#8E8CB5',      // lavenderSoft — kept midtone (pill bg, white text 4.92:1)
    primaryLight: '#9796B9', // lavenderText — approved dark text-on-canvas
    primaryDark: '#6E6C99',  // lavender — kept midtone both modes
    secondary: '#AE7698',    // rose — approved dark kickers (5.0:1)
    secondaryLight: '#C09BB6', // roseSoft — approved dark H1 accent/chips
    secondaryDark: '#BD7FA5',  // roseBorder — approved dark border/dot hue
    tertiary: '#728F60',     // sage — approved dark sage kicker (4.96:1)
  },

  border: {
    subtle: '#3C3540',       // hairline — approved dark strip/tab hairline
    default: '#473943',      // border — approved dark card border
    strong: '#434059',       // lavenderBorder — approved dark ghost pill border
  },

  status: {
    success: '#728F60',      // sage (dark)
    successBg: '#293522',    // sageBg — approved dark chip bg
    warning: '#C09BB6',      // roseSoft (warn accent in dark corpus family)
    warningBg: '#372031',    // roseBg — approved dark warn chip bg
    error: '#AE7698',        // rose (dark)
    errorBg: '#372031',      // roseBg
    info: '#9796B9',         // lavenderText (dark)
    infoBg: '#222235',       // lavenderBg
  },

  role: {
    mom: '#AE7698',          // rose (dark)
    doula: '#8E8CB5',        // lavenderSoft (kept midtone)
    midwife: '#728F60',      // sage (dark)
    lactation: '#7BC9B8',    // teal-green (unchanged family)
    admin: '#9E97A4',        // gray (dark)
  },

  mood: {
    veryLow: '#AE7698',
    low: '#C09BB6',
    neutral: '#9E97A4',
    good: '#728F60',
    great: '#9796B9',
  },

  overlay: {
    backdrop: 'rgba(0, 0, 0, 0.7)',  // Darker overlay for dark mode
    light: 'rgba(26, 21, 32, 0.9)',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

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

export const LIGHT_THEME: Theme = {
  name: 'LIGHT',
  colors: LIGHT_COLORS,
  fonts: FONTS,
  sizes: SIZES,
  brand: BRAND,
};

export const DARK_THEME: Theme = {
  name: 'DARK',
  colors: DARK_COLORS,
  fonts: FONTS,
  sizes: SIZES,
  brand: BRAND,
};

// ============================================
// HELPER FUNCTION TO GET THEME
// ============================================

export const getTheme = (themeName: 'LIGHT' | 'DARK'): Theme => {
  return themeName === 'DARK' ? DARK_THEME : LIGHT_THEME;
};

export default { LIGHT_THEME, DARK_THEME, getTheme };
