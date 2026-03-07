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
import { SIZES, FONTS } from '../constants/theme';
import { useColors, useShadows } from '../hooks/useThemedStyles';

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
  const colors = useColors();
  const shadows = useShadows();
  
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
        base.backgroundColor = colors.secondary;
        break;
      case 'outline':
        base.backgroundColor = colors._theme.background.subtle;
        base.borderWidth = 1.5;
        base.borderColor = colors.primaryLight;
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      default:
        base.backgroundColor = colors.primary;
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
        base.color = colors.primary;
        break;
      case 'secondary':
        base.color = colors.white;
        break;
      default:
        base.color = colors._theme.text.onAccent;
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
        shadows.sm,
        style,
        pressed && { opacity: 0.8 }
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white}
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
