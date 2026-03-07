// Theme-aware styles utility hook
// Provides backward-compatible access to theme colors while enabling dark mode

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SIZES, FONTS } from '../constants/theme';

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
    
    // Role colors
    momPrimary: colors.role.mom,
    doulaPrimary: colors.role.doula,
    midwifePrimary: colors.role.midwife,
    
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

// Hook to create theme-aware styles
export const useThemedStyles = <T extends StyleSheet.NamedStyles<T>>(
  styleFactory: (colors: ReturnType<typeof useColors>, sizes: typeof SIZES, fonts: typeof FONTS) => T
) => {
  const colors = useColors();
  
  return useMemo(() => {
    return StyleSheet.create(styleFactory(colors, SIZES, FONTS));
  }, [colors]);
};

// Export for convenience
export { SIZES, FONTS } from '../constants/theme';
