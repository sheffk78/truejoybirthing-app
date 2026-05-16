// True Joy Birthing Theme - Official Brand Colors
// Aligned with the current website VISUAL-TOKENS palette.

export const COLORS = {
  // Primary - Lavender from the website action system
  primary: '#8E8CB5',         // Lavender 500
  primaryLight: '#D5D3E8',    // Lavender 300
  primaryDark: '#6E6C99',     // Lavender 600
  
  // Secondary - Rose from the website link/accent system
  secondary: '#B87AA0',       // Rose 500
  secondaryLight: '#E6BBD8',  // Rose 300
  secondaryDark: '#9A5E84',   // Rose 600
  
  // Accent - Calming Sage Green
  accent: '#A8B5A0',
  accentLight: '#E8EDE5',
  accentDark: '#7F8E76',
  
  // Backgrounds
  white: '#FFFFFF',
  background: '#FAF8F5',      // Cream canvas
  surface: '#FDFCFA',
  subtle: '#F5F3EF',          // Warm alternate section surface
  border: '#E6E4F4',
  
  // Text
  textPrimary: '#2A2A2A',     // Charcoal
  textSecondary: '#6A6B6C',   // Gray body text
  textLight: '#9A9B9C',       // Muted captions
  textOnPrimary: '#FFFFFF',
  
  // Status
  success: '#A8B5A0',
  warning: '#E6C685',
  error: '#D48A8A',
  info: '#8E8CB5',
  
  // Mood colors
  moodVeryLow: '#D48A8A',
  moodLow: '#E6C685',
  moodNeutral: '#B0A6B4',
  moodGood: '#A8B5A0',
  moodGreat: '#8E8CB5',
  
  // Role-specific colors
  roleMom: '#B87AA0',         // Rose for Mom
  roleDoula: '#8E8CB5',       // Lavender for Doula
  roleMidwife: '#A8B5A0',     // Sage for Midwife
  roleAdmin: '#6A6B6C',       // Gray for Admin
};

export const FONTS = {
  // Playfair Display for headings
  heading: 'PlayfairDisplay_700Bold',
  subheading: 'PlayfairDisplay_500Medium',
  // Lato for body text
  body: 'Lato_400Regular',
  bodyMedium: 'Lato_400Regular',
  bodyItalic: 'Lato_400Regular',
  bodyBold: 'Lato_700Bold',
  // Fallbacks
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
  xxxl: 64,
  
  // Border radius
  radiusXs: 4,
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
  fontTitle: 30,
  fontHero: 36,
  
  // Touch targets
  touchMin: 44,
};

export const SHADOWS = {
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

// Logo URLs
export const BRAND = {
  logoSvg: 'https://customer-assets.emergentagent.com/job_377ad6ce-3198-4a5b-87cd-5e06eae39f9e/artifacts/ccxz8is7_Logo%20TJB.svg',
  logoJpg: 'https://customer-assets.emergentagent.com/job_377ad6ce-3198-4a5b-87cd-5e06eae39f9e/artifacts/oqwstugf_true-joy-birthing-full-color-200%20%281%29.jpg',
  // Transparent icon (no white background) - use on photo backgrounds
  logoIcon: 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/n90h7kfh_Logo%20TJB%20%281%29.svg',
  name: 'True Joy Birthing',
  tagline: 'Your birth plan, your team, your support in one place.',
};

export default { COLORS, FONTS, SIZES, SHADOWS, BRAND };
