import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SIZES } from '../constants/theme';
import { useColors, useShadows } from '../hooks/useThemedStyles';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}: CardProps) {
  const colors = useColors();
  const shadows = useShadows();
  
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'filled':
        return {
          backgroundColor: colors._theme.background.subtle,
        };
      default:
        return {
          backgroundColor: colors.surface,
          ...shadows.md,
        };
    }
  };
  
  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: SIZES.sm };
      case 'lg':
        return { padding: SIZES.lg };
      default:
        return { padding: SIZES.md };
    }
  };
  
  return (
    <View style={[styles.card, getVariantStyle(), getPaddingStyle(), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SIZES.radiusLg,
  },
});
