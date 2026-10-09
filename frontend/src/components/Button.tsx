import { F } from '../constants/corpus';
import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, TextStyle, Platform } from 'react-native';
import { SIZES } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'neutral';
  /** Accent fill tier (P4 button fold, JOB-2026-10-09i):
   *  'soft' (default) = .btn-primary law fill (colors.primary);
   *  'deep'  = .abtn law fill (colors.primaryDark) — mom-tier CTAs. */
  tone?: 'soft' | 'deep';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  testID?: string;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  tone = 'soft',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  leftIcon,
  testID,
}: ButtonProps) {
  const colors = useColors();
  
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
      case 'neutral':
        // P4: track-filled utility pill (screen-law C.track) — themable
        base.backgroundColor = colors.backgroundSecondary;
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
        // P4 tone tiers: soft = .btn-primary law (colors.primary),
        // deep = .abtn law (colors.primaryDark)
        base.backgroundColor = tone === 'deep' ? colors.primaryDark : colors.primary;
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
      // 10/07 drift fix: law button type = Quicksand 700 13px (common.css .abtn)
      fontWeight: '700',
      fontFamily: F.uiBold,
      fontSize: 13.5,
    };

    // Size styles
    switch (size) {
      case 'sm':
        base.fontSize = 11;
        break;
      case 'lg':
        base.fontSize = 17;
        break;
      default:
        base.fontSize = 13;
    }
    
    // Variant styles
    switch (variant) {
      case 'outline':
      case 'ghost':
        base.color = colors.primary;
        break;
      case 'neutral':
        // track fill is light — default to ink text; screens can override
        base.color = colors.text;
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
          {(icon || leftIcon) && <>{icon || leftIcon}</>}
          <Text style={[getTextStyle(), (icon || leftIcon) ? { marginLeft: SIZES.sm } : {}, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
