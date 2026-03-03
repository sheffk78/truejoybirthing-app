import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { COLORS, SIZES, SHADOWS, FONTS } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  testID?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  testID,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: SIZES.radiusFull, // Pill-shaped buttons
      minHeight: SIZES.touchMin,
    };
    
    // Size styles
    switch (size) {
      case 'sm':
        base.paddingHorizontal = SIZES.md;
        base.paddingVertical = SIZES.sm;
        break;
      case 'lg':
        base.paddingHorizontal = SIZES.xl;
        base.paddingVertical = SIZES.md;
        break;
      default:
        base.paddingHorizontal = SIZES.lg;
        base.paddingVertical = SIZES.md;
    }
    
    // Variant styles
    switch (variant) {
      case 'secondary':
        base.backgroundColor = COLORS.secondary;
        break;
      case 'outline':
        base.backgroundColor = COLORS.subtle;
        base.borderWidth = 1.5;
        base.borderColor = COLORS.primaryLight;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      default:
        base.backgroundColor = COLORS.primary;
    }
    
    if (disabled || loading) {
      base.opacity = 0.6;
    }
    
    if (fullWidth) {
      base.width = '100%';
    }
    
    return base;
  };
  
  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      fontFamily: FONTS.bodyBold,
    };
    
    // Size styles
    switch (size) {
      case 'sm':
        base.fontSize = SIZES.fontSm;
        break;
      case 'lg':
        base.fontSize = SIZES.fontLg;
        break;
      default:
        base.fontSize = SIZES.fontMd;
    }
    
    // Variant styles
    switch (variant) {
      case 'outline':
      case 'ghost':
        base.color = COLORS.primary;
        break;
      case 'secondary':
        base.color = COLORS.white;
        break;
      default:
        base.color = COLORS.textOnPrimary;
    }
    
    return base;
  };
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      data-testid={testID}
      // @ts-ignore - onClick for web compatibility
      onClick={Platform.OS === 'web' ? onPress : undefined}
      style={({ pressed }) => [
        getButtonStyle(),
        SHADOWS.sm,
        style,
        pressed && { opacity: 0.8 }
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.white}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon ? { marginLeft: SIZES.sm } : {}, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
