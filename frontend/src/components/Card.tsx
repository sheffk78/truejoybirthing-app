import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

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
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.border,
        };
      case 'filled':
        return {
          backgroundColor: COLORS.subtle,
        };
      default:
        return {
          backgroundColor: COLORS.surface,
          ...SHADOWS.md,
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
