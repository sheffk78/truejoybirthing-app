// True Joy Birthing Theme - Official Brand Colors
// Logo: Lavender pregnant silhouette + Pink script text

export const COLORS = {
  // Primary - Lavender from logo silhouette
  primary: '#9F83B6',         // Soft Lavender
  primaryLight: '#C4B1D3',    // Light Lavender
  primaryDark: '#7D628C',     // Deep Lavender
  
  // Secondary - Pink from logo text
  secondary: '#D4A5A5',       // Dusty Rose
  secondaryLight: '#E3C0C0',  // Light Rose
  secondaryDark: '#B88A8A',   // Deep Rose
  
  // Accent - Calming Sage Green
  accent: '#8CAF8C',
  accentLight: '#A8CFA8',
  accentDark: '#6E8F6E',
  
  // Backgrounds
  white: '#FFFFFF',
  background: '#FEFCFF',      // Warm White with hint of pink
  surface: '#FFFFFF',
  subtle: '#F9F5FA',          // Subtle lavender tint
  border: '#EFE6F2',
  
  // Text
  textPrimary: '#4A3B4E',     // Deep warm gray
  textSecondary: '#8A7E8E',   // Medium gray
  textLight: '#B0A6B4',       // Light gray
  textOnPrimary: '#FFFFFF',
  
  // Status
  success: '#8CAF8C',
  warning: '#E6C685',
  error: '#D48A8A',
  info: '#8CA8AF',
  
  // Mood colors
  moodVeryLow: '#D48A8A',
  moodLow: '#E6C685',
  moodNeutral: '#B0A6B4',
  moodGood: '#8CAF8C',
  moodGreat: '#8CA8AF',
  
  // Role-specific colors
  roleMom: '#D4A5A5',         // Dusty Rose for Mom
  roleDoula: '#9F83B6',       // Lavender for Doula
  roleMidwife: '#8CAF8C',     // Sage Green for Midwife
  roleAdmin: '#8A7E8E',       // Gray for Admin
};

export const FONTS = {
  // Playfair Display for headings
  heading: 'PlayfairDisplay_700Bold',
  subheading: 'PlayfairDisplay_500Medium',
  // Lato for body text
  body: 'Lato_400Regular',
  bodyMedium: 'Lato_400Regular',
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
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
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
