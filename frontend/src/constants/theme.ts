// True Joy Birthing Theme - Based on truejoybirthing.com
export const COLORS = {
  // Primary colors from the website
  primary: '#9B6B9E',      // Soft purple
  primaryLight: '#C4A8C7',  // Light purple
  primaryDark: '#7A4D7D',   // Dark purple
  
  // Accent colors
  accent: '#E8A4B8',        // Soft pink
  accentLight: '#F5D1DC',   // Light pink
  accentDark: '#D68A9E',    // Dark pink
  
  // Neutral colors
  white: '#FFFFFF',
  background: '#FBF9FC',    // Soft off-white with purple tint
  surface: '#FFFFFF',
  border: '#E8E0EA',
  
  // Text colors
  textPrimary: '#2D2D2D',
  textSecondary: '#6B6B6B',
  textLight: '#9B9B9B',
  textOnPrimary: '#FFFFFF',
  
  // Status colors
  success: '#6B9B6B',
  warning: '#D4A574',
  error: '#C46B6B',
  info: '#6B8B9B',
  
  // Mood colors
  moodVeryLow: '#C46B6B',
  moodLow: '#D4A574',
  moodNeutral: '#9B9B9B',
  moodGood: '#6B9B6B',
  moodGreat: '#6B8B9B',
  
  // Role colors
  roleMom: '#E8A4B8',
  roleDoula: '#9B6B9E',
  roleMidwife: '#6B8B9B',
  roleAdmin: '#6B6B6B',
};

export const FONTS = {
  // Font families (using system fonts that look similar to the website)
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Border radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 9999,
  
  // Font sizes
  fontXs: 12,
  fontSm: 14,
  fontMd: 16,
  fontLg: 18,
  fontXl: 20,
  fontXxl: 24,
  fontTitle: 28,
  fontHero: 36,
  
  // Touch targets
  touchMin: 44,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};

export default { COLORS, FONTS, SIZES, SHADOWS };
