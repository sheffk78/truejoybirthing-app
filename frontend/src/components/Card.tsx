import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SIZES } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  style,
  testID,
  variant = 'elevated',
  padding = 'md',
}: CardProps) {
  const colors = useColors();
  
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
        // 'elevated' — use border instead of shadow per brand guidelines
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
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
    <View testID={testID} style={[styles.card, getVariantStyle(), getPaddingStyle(), style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // 10/07 drift fix: corpus card law (common.css .card / designRefresh.srowBase)
    // — white card on cream, 1px #EFE0EB, r18, content padding 12/14.
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE0EB',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});