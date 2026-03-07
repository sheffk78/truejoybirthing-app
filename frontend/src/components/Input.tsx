import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Icon } from './Icon';
import { SIZES } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const colors = useColors();
  
  const isPassword = secureTextEntry !== undefined;
  const showPassword = isPassword && isPasswordVisible;
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isFocused && { borderColor: colors.primary, borderWidth: 2 },
          error && { borderColor: colors.error },
        ]}
      >
        {leftIcon && (
          <>
            <View style={styles.leftIcon}>
              <Icon
                name={leftIcon}
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
          </>
        )}
        <TextInput
          style={[styles.input, { color: colors.text }, leftIcon && styles.inputWithLeftIcon]}
          placeholderTextColor={colors.textLight}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.rightIcon}
          >
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            <Icon name={rightIcon} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    marginBottom: SIZES.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: SIZES.radiusMd,
    minHeight: SIZES.touchMin + 4,
    paddingLeft: SIZES.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    fontSize: SIZES.fontMd,
  },
  leftIcon: {
    marginRight: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  rightIcon: {
    padding: SIZES.sm,
    marginRight: SIZES.xs,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    marginTop: SIZES.xs,
  },
});
