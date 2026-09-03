import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Text } from 'react-native';
import { BRAND, COLORS, FONTS } from '../constants/theme';

// ─────────────────────────────────────────────────────────────────────
// BrandedLoader — shared branded loading experience
// ─────────────────────────────────────────────────────────────────────
// Used by both:
//   • Font-loading screen in _layout.tsx (BEFORE ThemeProvider exists —
//     pass `colors` prop with static COLORS values)
//   • LoadingScreen.tsx (AFTER ThemeProvider exists — omit `colors` prop
//     and the parent passes themed values)
//
// Features:
//   • Cream / branded background (configurable for dark mode)
//   • Full logo (icon + wordmark) centered with gentle pulse animation
//   • Tagline below logo in Cormorant Garamond serif
//   • Three-dot animated loading indicator below the tagline
//   • Optional loading message rendered below the dots
// ─────────────────────────────────────────────────────────────────────

export interface BrandedLoaderColors {
  background: string;
  text: string;
  textSecondary: string;
  primary: string;
}

export interface BrandedLoaderProps {
  /** Optional loading message shown below the animated dots */
  message?: string;
  /** Optional tagline override (defaults to BRAND.tagline) */
  tagline?: string;
  /** Colors — required when used outside ThemeProvider; optional otherwise */
  colors?: BrandedLoaderColors;
  /** Whether fonts are loaded (controls serif vs system font for tagline) */
  fontsLoaded?: boolean;
}

export default function BrandedLoader({
  message,
  tagline,
  colors,
  fontsLoaded = true,
}: BrandedLoaderProps) {
  // Default to light-mode static colors if not provided
  const c: BrandedLoaderColors = colors || {
    background: COLORS.background,
    text: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    primary: COLORS.primary,
  };

  // ── Pulse animation on the logo ──────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  // ── Three-dot loading animation ─────────────────────────────
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = createDotAnim(dot1, 0);
    const a2 = createDotAnim(dot2, 200);
    const a3 = createDotAnim(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const taglineText = tagline || BRAND.tagline;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.content}>
        {/* Logo with pulse animation */}
        <Animated.View
          style={[styles.logoWrapper, { opacity: pulseAnim, transform: [{ scale: pulseAnim }] }]}
        >
          <Image source={BRAND.logoPng} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        {/* Tagline in serif font (if loaded) */}
        <Text
          style={[
            styles.tagline,
            { color: c.textSecondary, fontFamily: fontsLoaded ? FONTS.subheading : 'System' },
          ]}
        >
          {taglineText}
        </Text>

        {/* Three-dot animated loading indicator */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: c.primary, opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { backgroundColor: c.primary, opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { backgroundColor: c.primary, opacity: dot3 }]} />
        </View>

        {/* Optional loading message */}
        {message ? (
          <Text
            style={[
              styles.message,
              { color: c.textSecondary, fontFamily: fontsLoaded ? FONTS.body : 'System' },
            ]}
          >
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrapper: {
    marginBottom: 20,
  },
  logo: {
    width: 220,
    height: 97,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});