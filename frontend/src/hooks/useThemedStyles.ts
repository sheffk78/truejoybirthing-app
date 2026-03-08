// Theme-aware styles utility hook
// Provides backward-compatible access to theme colors while enabling dark mode

import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SIZES, FONTS } from '../constants/theme';

// Type for colors returned by useColors
export type ThemeColors = ReturnType<typeof useColors>;

// Type for style values
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

// Hook to get theme colors with backward-compatible naming
export const useColors = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  
  // Map new theme tokens to old COLORS naming for easier migration
  return useMemo(() => ({
    // Backgrounds
    background: colors.background.primary,
    backgroundSecondary: colors.background.secondary,
    surface: colors.background.surface,
    surfaceElevated: colors.background.elevated,
    
    // Text
    text: colors.text.primary,
    textPrimary: colors.text.primary, // Alias for migration
    textSecondary: colors.text.secondary,
    textLight: colors.text.muted,
    textInverse: colors.text.inverse,
    
    // Brand/Accent
    primary: colors.accent.primary,
    primaryLight: colors.accent.primaryLight,
    primaryDark: colors.accent.primaryDark,
    secondary: colors.accent.secondary,
    secondaryLight: colors.accent.secondaryLight,
    accent: colors.accent.tertiary,
    
    // Status
    success: colors.status.success,
    successLight: colors.status.successBg,
    warning: colors.status.warning,
    warningLight: colors.status.warningBg,
    error: colors.status.error,
    errorLight: colors.status.errorBg,
    info: colors.status.info,
    infoLight: colors.status.infoBg,
    
    // Borders
    border: colors.border.default,
    borderLight: colors.border.subtle,
    borderStrong: colors.border.strong,
    
    // Role colors (consistent brand colors across themes)
    momPrimary: colors.role.mom,
    roleMom: colors.role.mom,
    doulaPrimary: colors.role.doula,
    roleDoula: colors.role.doula,
    midwifePrimary: colors.role.midwife,
    roleMidwife: colors.role.midwife,
    
    // Mood colors
    moodVeryLow: colors.mood.veryLow,
    moodLow: colors.mood.low,
    moodNeutral: colors.mood.neutral,
    moodGood: colors.mood.good,
    moodGreat: colors.mood.great,
    
    // Special
    white: colors.white,
    black: colors.black,
    transparent: colors.transparent,
    overlay: colors.overlay.backdrop,
    overlayLight: colors.overlay.light,
    
    // Legacy aliases for backward compatibility
    cardBackground: colors.background.surface,
    inputBackground: colors.background.surface,
    divider: colors.border.subtle,
    placeholder: colors.text.muted,
    icon: colors.text.secondary,
    iconActive: colors.accent.primary,
    
    // Direct access to full theme colors
    _theme: colors,
  }), [colors]);
};

// Hook to get theme shadows
export const useShadows = () => {
  const { theme } = useTheme();
  return theme.shadows;
};

// =============================================================================
// createThemedStyles - Factory function for creating theme-aware styles
// =============================================================================
// 
// This utility simplifies the migration from static COLORS to dynamic theming.
// Instead of defining styles with static colors, you define a style factory
// that receives colors as a parameter and returns the styles.
//
// USAGE:
// 
// 1. Define your styles factory outside the component:
//    const getStyles = createThemedStyles((colors) => ({
//      container: { backgroundColor: colors.background },
//      title: { color: colors.text },
//      card: { backgroundColor: colors.surface, borderColor: colors.border },
//    }));
//
// 2. Use inside your component:
//    const MyComponent = () => {
//      const colors = useColors();
//      const styles = getStyles(colors);
//      return <View style={styles.container}>...</View>;
//    };
//
// BENEFITS:
// - Styles are computed only when colors change (memoization in component)
// - Type-safe with full autocomplete for colors
// - StyleSheet.create is called for performance optimization
// - Easy migration: just wrap existing styles with createThemedStyles
// =============================================================================

export function createThemedStyles<T extends NamedStyles<T>>(
  styleFactory: (colors: ThemeColors, sizes?: typeof SIZES, fonts?: typeof FONTS) => T
): (colors: ThemeColors) => T {
  // Cache for memoization based on theme mode
  let cachedStyles: T | null = null;
  let cachedColorsBg: string | null = null;
  
  return (colors: ThemeColors): T => {
    // Simple cache check using background color as theme indicator
    if (cachedStyles && cachedColorsBg === colors.background) {
      return cachedStyles;
    }
    
    // Create new styles with StyleSheet.create for performance
    const rawStyles = styleFactory(colors, SIZES, FONTS);
    cachedStyles = StyleSheet.create(rawStyles) as T;
    cachedColorsBg = colors.background;
    
    return cachedStyles;
  };
}

// =============================================================================
// useThemedStyles - Hook version for creating styles within components
// =============================================================================
// 
// Use this when you need to define styles inside a component and want
// automatic memoization when the theme changes.
//
// USAGE:
//    const MyComponent = () => {
//      const styles = useThemedStyles((colors, sizes, fonts) => ({
//        container: { backgroundColor: colors.background, padding: sizes.md },
//        title: { color: colors.text, fontFamily: fonts.heading },
//      }));
//      return <View style={styles.container}>...</View>;
//    };
// =============================================================================

export const useThemedStyles = <T extends NamedStyles<T>>(
  styleFactory: (colors: ThemeColors, sizes: typeof SIZES, fonts: typeof FONTS) => T
): T => {
  const colors = useColors();
  
  return useMemo(() => {
    return StyleSheet.create(styleFactory(colors, SIZES, FONTS)) as T;
  }, [colors]);
};

// =============================================================================
// Helper: Common themed style patterns
// =============================================================================

export const themedStyleHelpers = {
  // Container with themed background
  container: (colors: ThemeColors) => ({
    flex: 1,
    backgroundColor: colors.background,
  }),
  
  // Card with surface background and border
  card: (colors: ThemeColors) => ({
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SIZES.md,
  }),
  
  // Primary text
  textPrimary: (colors: ThemeColors) => ({
    color: colors.text,
    fontFamily: FONTS.body,
    fontSize: SIZES.fontMd,
  }),
  
  // Secondary text
  textSecondary: (colors: ThemeColors) => ({
    color: colors.textSecondary,
    fontFamily: FONTS.body,
    fontSize: SIZES.fontSm,
  }),
  
  // Heading text
  heading: (colors: ThemeColors) => ({
    color: colors.text,
    fontFamily: FONTS.heading,
    fontSize: SIZES.fontXl,
  }),
  
  // Input field
  input: (colors: ThemeColors) => ({
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    color: colors.text,
    fontFamily: FONTS.body,
    fontSize: SIZES.fontMd,
  }),
  
  // Divider line
  divider: (colors: ThemeColors) => ({
    height: 1,
    backgroundColor: colors.border,
  }),
  
  // Badge/chip base
  badge: (colors: ThemeColors, variant: 'primary' | 'success' | 'warning' | 'error' = 'primary') => {
    const bgColors = {
      primary: colors.primaryLight,
      success: colors.successLight,
      warning: colors.warningLight,
      error: colors.errorLight,
    };
    const textColors = {
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
    };
    return {
      backgroundColor: bgColors[variant],
      paddingHorizontal: SIZES.sm,
      paddingVertical: SIZES.xs,
      borderRadius: SIZES.radiusFull,
    };
  },
};

// Export for convenience
export { SIZES, FONTS } from '../constants/theme';
