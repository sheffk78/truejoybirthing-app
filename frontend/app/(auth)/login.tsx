import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Linking,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import { SIZES, FONTS, BRAND } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

/**
 * Log In — implements the approved mockup (design-refresh/auth-refresh,
 * SCREEN LOG IN, approved 2026-09-16):
 *   • Icon mark on cream canvas (natural square, ring detail — no wordmark)
 *   • Serif headline "Welcome back" + italic rose accent ("again.")
 *   • Floating-label fields (email, password w/ eye toggle)
 *   • Inline "Forgot password?" link, right-aligned under password
 *   • Primary lavender button + "New here? Create an account" swap link
 *   • "See how it works" preview link → public tutorial preview route
 *   • Entrance: staggered calm fades (doctrine 2026-09-16); press 0.97;
 *     inline error shake-free — soft inline banner, no spinners on screen
 */

const STAGGER_MS = 90;

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);

  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Staggered entrance ────────────────────────────────────────────────
  const oLogo = useRef(new Animated.Value(0)).current;
  const oHead = useRef(new Animated.Value(0)).current;
  const oForm = useRef(new Animated.Value(0)).current;
  const oFoot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = (v: Animated.Value, delay: number) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    const a1 = rise(oLogo, 60);
    const a2 = rise(oHead, 60 + STAGGER_MS);
    const a3 = rise(oForm, 60 + STAGGER_MS * 2);
    const a4 = rise(oFoot, 60 + STAGGER_MS * 3);
    a1.start(); a2.start(); a3.start(); a4.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); a4.stop(); };
  }, [oLogo, oHead, oForm, oFoot]);

  const handleLogin = async () => {
    if (!email.trim() || !password || isLoading) return;
    setAuthError(null);
    try {
      await login(email.trim(), password);
      // Root guard forwards by auth state (onboarding or dashboard).
      // No verify-email fallback — verification is no longer a gate (2026-09-16).
    } catch (e: any) {
      setAuthError(e?.message || 'Unable to log in. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={[styles.flex1, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.flex1} edges={['top', 'bottom']}>
          {/* Icon mark */}
          <Animated.View style={[styles.logoContainer, { opacity: oLogo as any }]}>
            <View style={[styles.logoRing, { borderColor: colors.borderLight }]}>
              <Image source={BRAND.logoIconPng} style={styles.logoIcon} resizeMode="contain" />
            </View>
          </Animated.View>

          {/* Headline */}
          <Animated.View style={[styles.headBlock, { opacity: oHead as any }]}>
            <Text style={[styles.headline, { color: colors.text }]}>
              Welcome back,{'\n'}
              <Text style={[styles.headlineAccent, { color: colors._theme.accent.secondaryDark }]}>
                friend.
              </Text>
            </Text>
            <Text style={[styles.subhead, { color: colors.textSecondary }]}>
              Log in to continue your journey.
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={[styles.formBlock, { opacity: oForm as any }]}>
            {authError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
                <Icon name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{authError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View
              style={[
                styles.field,
                { borderColor: focused === 'email' ? colors.primary : colors.borderLight, backgroundColor: colors.surface },
              ]}
            >
              <Icon name="mail" size={18} color={focused === 'email' ? colors.primary : colors.textLight} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            {/* Password */}
            <View
              style={[
                styles.field,
                { borderColor: focused === 'password' ? colors.primary : colors.borderLight, backgroundColor: colors.surface },
              ]}
            >
              <Icon name="lock-closed" size={18} color={focused === 'password' ? colors.primary : colors.textLight} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                secureTextEntry={!showPassword}
                textContentType="password"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textLight} />
              </Pressable>
            </View>

            {/* Forgot password — inline, right aligned */}
            <Pressable
              onPress={handleForgotPassword}
              style={({ pressed }) => [styles.forgotWrap, pressed && { opacity: 0.6 }]}
              accessibilityRole="link"
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </Pressable>

            {/* Submit */}
            <Pressable
              onPress={handleLogin}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.buttonPressed,
                isLoading && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log in"
            >
              <Text style={[styles.submitText, { color: colors.white }]}>
                {isLoading ? 'Signing you in…' : 'Log In'}
              </Text>
            </Pressable>

            {/* Swap link */}
            <Pressable
              onPress={() => router.push('/(auth)/signup')}
              style={({ pressed }) => [styles.swapLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="link"
            >
              <Text style={[styles.swapText, { color: colors.textSecondary }]}>
                New here?{' '}
                <Text style={[styles.swapLinkText, { color: colors.primary }]}>Create an account</Text>
              </Text>
            </Pressable>
          </Animated.View>

          {/* Footer preview link */}
          <Animated.View style={[styles.footBlock, { opacity: oFoot as any }]}>
            <Pressable
              onPress={() => router.push('/(auth)/tutorial-preview?role=MOM')}
              style={({ pressed }) => [styles.previewLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="link"
            >
              <Icon name="play-circle" size={18} color={colors.primary} />
              <Text style={[styles.previewText, { color: colors.primary }]}>See how it works</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const getStyles = createThemedStyles((colors) => ({
  flex1: { flex: 1 },
  logoContainer: {
    alignItems: 'center',
    paddingTop: SIZES.xl,
  },
  logoRing: {
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  headBlock: {
    alignItems: 'center',
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
    paddingHorizontal: SIZES.lg,
  },
  headline: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
  },
  headlineAccent: {
    fontStyle: 'italic',
  },
  subhead: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
  formBlock: {
    paddingHorizontal: SIZES.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
  },
  errorText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    height: 54,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1.5,
    marginBottom: SIZES.md,
  },
  input: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    paddingVertical: SIZES.xs,
    marginBottom: SIZES.sm,
  },
  forgotText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
  submitButton: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusFull,
    backgroundColor: colors.primary,
    marginBottom: SIZES.md,
  },
  submitText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  swapLink: {
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  swapText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
  },
  swapLinkText: {
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },
  footBlock: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SIZES.lg,
  },
  previewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
  },
  previewText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
}));