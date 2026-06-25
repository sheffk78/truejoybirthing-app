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
  // Cormorant Garamond for headings
  heading: 'CormorantGaramond_700Bold',
  subheading: 'CormorantGaramond_600SemiBold',
  // Source Sans 3 for body text
  body: 'SourceSans3_400Regular',
  bodyMedium: 'SourceSans3_500Medium',
  bodyItalic: 'SourceSans3_400Regular_Italic',
  bodyBold: 'SourceSans3_700Bold',
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

// Logo assets - using PNG for reliable rendering across platforms.
// The original Illustrator SVGs use CSS <style> blocks with class-based fills
// which react-native-svg-transformer cannot process correctly, so we use the
// PNG version (452×200 RGBA) with <Image source={BRAND.logoPng} />.
// SVG variants are also bundled in assets/images/ for future use if needed.
const logoPng = require('../../assets/images/logo.png');
const logoIconPng = require('../../assets/images/logo-icon.png');

export const BRAND = {
  // PNG logo (452×200) - use with <Image source={BRAND.logoPng} />
  logoPng,
  // Icon-only PNG, rasterized from the approved brand SVG for reliable native rendering.
  logoIconPng,
  // Alias for backward compat - previously an SVG component, now a PNG ImageSource
  logoJpg: logoPng,
  logoSvg: logoPng,
  logoIcon: logoIconPng,
  logoWordmarkWhite: logoPng,
  logoWordmarkMono: logoPng,
  name: 'True Joy Birthing',
  tagline: 'Your birth plan, your team, your support in one place.',
};

export default { COLORS, FONTS, SIZES, BRAND };
