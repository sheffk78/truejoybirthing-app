import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import { SIZES, FONTS, BRAND } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

/**
 * Welcome — first screen after install. Implements the approved mockup
 * (design-refresh/auth-refresh, SCREEN WELCOME, approved 2026-09-16):
 *   • Hero photo top ~55% with a soft rose wash (approved tint, palette
 *     token — NOT the off-palette lavender wash this screen previously had)
 *   • Icon mark floating on the photo (natural square, never cropped)
 *   • Bottom card: "Welcome to" overline → serif headline with italic
 *     rose accent → subtitle → 3 feature pills (hand-drawn feel icons)
 *     → Get Started Free (lavender) → ghost "I already have an account"
 *     → Terms/Privacy footer
 *   • Entrance: staggered calm fades (doctrine 2026-09-16 — no slides,
 *     no bounces); press feedback 0.97 scale on both buttons
 *
 * Theme note: `colors` is the legacy-mapped palette. Sage lives at
 * `colors.accent` (tertiary) / `colors.success`; its light surface is
 * `colors.successLight` (#E8EDE5 sage-100) — the mockup's pill tone.
 */

const { height } = Dimensions.get('window');

// Beautiful birth photo - newborn sleeping on mother
const HERO_IMAGE = require('../../assets/images/hero-newborn-sleeping.jpg');

// Stagger rhythm — one calm beat (~90ms) between elements
const STAGGER_MS = 90;

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);

  // Sage tokens (theme-backed): success = sage 500, successLight = sage 100.
  // Kept as locals so the pills map 1:1 to the approved mockup tones.
  const sage = colors.accent;           // #A8B5A0 in light, theme-adjusted in dark
  const sageLight = colors.successLight; // #E8EDE5 pill background

  // ── Staggered entrance: overline → headline → sub → pills → buttons ──
  const o1 = useRef(new Animated.Value(0)).current;
  const o2 = useRef(new Animated.Value(0)).current;
  const o3 = useRef(new Animated.Value(0)).current;
  const o4 = useRef(new Animated.Value(0)).current;
  const o5 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rise = (v: Animated.Value, delay: number) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    const a1 = rise(o1, 60);
    const a2 = rise(o2, 60 + STAGGER_MS);
    const a3 = rise(o3, 60 + STAGGER_MS * 2);
    const a4 = rise(o4, 60 + STAGGER_MS * 3);
    const a5 = rise(o5, 60 + STAGGER_MS * 3);
    a1.start(); a2.start(); a3.start(); a4.start(); a5.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); a4.stop(); a5.stop(); };
  }, [o1, o2, o3, o4, o5]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Image Background */}
      <ImageBackground
        source={HERO_IMAGE}
        style={styles.heroImage}
        resizeMode="cover"
      >
        {/* Soft rose wash — approved secondary #B87AA0 at 15% */}
        <View style={[styles.gradientOverlay, { backgroundColor: `${colors.secondary}26` }]} />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Logo at top - natural square icon on photo (mockup: 64px + ring) */}
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoRing,
              { borderColor: 'rgba(255,255,255,0.4)', opacity: o1 as any },
            ]}
          >
            <Image source={BRAND.logoIconPng} style={styles.logoIcon} resizeMode="contain" />
          </Animated.View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Bottom Content Card */}
        <View style={[styles.bottomCard, { backgroundColor: colors.background }]}>
          {/* Overline + Headline */}
          <Animated.View style={{ opacity: o1 as any }}>
            <Text style={[styles.overline, { color: colors.primaryDark }]}>Welcome to</Text>
          </Animated.View>
          <Animated.View style={{ opacity: o1 as any }}>
            <Text style={[styles.headline, { color: colors.text }]}>
              Your Birth Journey,{'\n'}
              <Text style={[styles.headlineAccent, { color: colors._theme.accent.secondaryDark }]}>
                Supported Every Step
              </Text>
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: o2 as any }}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Create your birth plan, connect with doulas, midwives and other birthing professionals, and experience the birth you envision.
            </Text>
          </Animated.View>

          {/* Feature Pills */}
          <Animated.View style={[styles.featurePills, { opacity: o3 as any }]}>
            <View style={[styles.pill, { backgroundColor: sageLight }]}>
              <Icon name="document-text" size={14} color={sage} />
              <Text style={[styles.pillText, { color: sage }]}>Birth Plan</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.primaryLight + '55' }]}>
              <Icon name="people" size={14} color={colors.primaryDark} />
              <Text style={[styles.pillText, { color: colors.primaryDark }]}>Your Team</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.secondaryLight + '45' }]}>
              <Icon name="heart" size={14} color={colors._theme.accent.secondaryDark} />
              <Text style={[styles.pillText, { color: colors._theme.accent.secondaryDark }]}>Support</Text>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={{ opacity: o4 as any }}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/(auth)/signup')}
              // @ts-ignore - onClick for web compatibility
              onClick={Platform.OS === 'web' ? () => router.push('/(auth)/signup') : undefined}
              data-testid="get-started-btn"
            >
              <View style={[styles.buttonFill, { backgroundColor: colors.primary }]}>
                <Text style={styles.primaryButtonText}>Get Started Free</Text>
                <Icon name="arrow-forward" size={18} color={colors.white} />
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryPressed,
              ]}
              onPress={() => router.push('/(auth)/login')}
              // @ts-ignore - onClick for web compatibility
              onClick={Platform.OS === 'web' ? () => router.push('/(auth)/login') : undefined}
              data-testid="login-btn"
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </Pressable>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={{ opacity: o5 as any }}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL('https://truejoybirthing.com/terms')}
              >
                Terms
              </Text>{' '}
              and{' '}
              <Text
                style={styles.linkText}
                onPress={() => Linking.openURL('https://truejoybirthing.com/privacy')}
              >
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
  },
  gradientOverlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: SIZES.lg,
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
    shadowColor: '#2A2A2A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
  },
  spacer: {
    flex: 1,
  },
  bottomCard: {
    backgroundColor: colors.background,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.md,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  overline: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  headline: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  headlineAccent: {
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: SIZES.radiusFull,
    gap: 6,
  },
  pillText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: SIZES.radiusFull,
    overflow: 'hidden',
    marginBottom: SIZES.sm,
  },
  buttonFill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    gap: SIZES.sm,
  },
  primaryButtonText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
    color: colors.white,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
    marginBottom: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  secondaryButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.primary,
  },
  secondaryPressed: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  footerText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
}));