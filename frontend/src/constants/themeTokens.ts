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
  background: {
    primary: '#1A1520',      // Deep purple-black (not pure black)
    secondary: '#241E2A',    // Slightly lighter
    surface: '#2A2330',      // Card backgrounds
    elevated: '#332B3A',     // Elevated surfaces (modals, dropdowns)
    subtle: '#1F1925',       // Very subtle background
  },
  
  text: {
    primary: '#F5F0F7',      // Off-white with lavender tint
    secondary: '#B8B0BC',    // Muted text
    muted: '#8A7E8E',        // Very muted
    onAccent: '#FFFFFF',     // White on accent backgrounds
    inverse: '#1A1520',      // For light backgrounds in dark mode
  },
  
  accent: {
    primary: '#B899CC',      // Lighter lavender for dark mode
    primaryLight: '#D4C1E3', // Even lighter
    primaryDark: '#8B6BA3',  // Slightly darker
    secondary: '#E0B8B8',    // Lighter dusty rose
    secondaryLight: '#ECD0D0',
    secondaryDark: '#C49A9A',
    tertiary: '#A3C9A3',     // Lighter sage green
  },
  
  border: {
    subtle: '#3A3240',       // Very subtle
    default: '#4A4252',      // Default border
    strong: '#5A5062',       // Strong border
  },
  
  status: {
    success: '#A3C9A3',      // Lighter sage
    successBg: '#1F2A1F',    // Dark green background
    warning: '#EDD99E',      // Lighter warm yellow
    warningBg: '#2A2618',    // Dark yellow background
    error: '#E5A3A3',        // Lighter soft red
    errorBg: '#2A1F1F',      // Dark red background
    info: '#A3BFC6',         // Lighter teal
    infoBg: '#1F2527',       // Dark teal background
  },
  
  role: {
    mom: '#E0B8B8',          // Lighter rose
    doula: '#B899CC',        // Lighter lavender
    midwife: '#A3C9A3',      // Lighter sage
    admin: '#A89EA8',        // Lighter gray
  },
  
  mood: {
    veryLow: '#E5A3A3',
    low: '#EDD99E',
    neutral: '#A89EA8',
    good: '#A3C9A3',
    great: '#A3BFC6',
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
// SHADOW TOKENS
// ============================================

export interface ShadowTokens {
  sm: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  md: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  lg: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export const LIGHT_SHADOWS: ShadowTokens = {
  sm: {
    shadowColor: '#2A2A2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#2A2A2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#2A2A2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
};

export const DARK_SHADOWS: ShadowTokens = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 3,
  },
};

// ============================================
// FULL THEME TYPE
// ============================================

export interface Theme {
  name: 'LIGHT' | 'DARK';
  colors: ColorTokens;
  shadows: ShadowTokens;
  fonts: typeof FONTS;
  sizes: typeof SIZES;
  brand: typeof BRAND;
}

export const LIGHT_THEME: Theme = {
  name: 'LIGHT',
  colors: LIGHT_COLORS,
  shadows: LIGHT_SHADOWS,
  fonts: FONTS,
  sizes: SIZES,
  brand: BRAND,
};

export const DARK_THEME: Theme = {
  name: 'DARK',
  colors: DARK_COLORS,
  shadows: DARK_SHADOWS,
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
