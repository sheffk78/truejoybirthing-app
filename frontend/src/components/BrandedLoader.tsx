import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Text, Dimensions } from 'react-native';
import { BRAND, COLORS, FONTS } from '../constants/theme';

// ─────────────────────────────────────────────────────────────────────
// BrandedLoader — SplashMark v2 (approved 2026-09-16, Jeff verdict
// msgs 1549839081200951357 → 1549841055648845927 → 1549843608402796688)
// ─────────────────────────────────────────────────────────────────────
// Approved design: icon mark ONLY at its natural square shape (never the
// horizontal lockup, never circle-cropped — see VERIFICATION-auth-20260916
// rev3), soft lavender halo that breathes with the mark, three staggered
// loading dots. No wordmark, no tagline, no status-bar chrome, no footer.
//
// Animation (approved "calm breath" spec):
//   • Mark:     scale 1.00 → 1.04 → 1.00 over 2.4 s, eased like breathing
//   • Halo:     opacity 0.60 → 1.00 on the same 2.4 s rhythm
//   • Dots:     staggered fade, 600 ms per dot, 260 ms offset
//   • No spin, no zoom-out, no extra graphics crossing the mark.
//
// Used by both:
//   • Font-loading screen in app/_layout.tsx (BEFORE ThemeProvider —
//     pass `colors` prop with static COLORS values)
//   • LoadingScreen.tsx (AFTER ThemeProvider — omit `colors` prop)
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
  /** Opt-in tagline — approved splash shows NO text by default */
  tagline?: string;
  /** Colors — required when used outside ThemeProvider; optional otherwise */
  colors?: BrandedLoaderColors;
  /** Whether fonts are loaded (controls serif vs system font for message) */
  fontsLoaded?: boolean;
}

// Brand tokens (mirrors theme.ts approved palette)
const HALO = 'rgba(142, 140, 181, 0.16)';   // Lavender 500 @16% — approved halo
const HALO_OUTER = 'rgba(142, 140, 181, 0.07)';
const DOT_ACTIVE = '#8E8CB5';               // Lavender 500
const DOT_INACTIVE = '#D5D3E8';             // Lavender 300

// Breath rhythm (ms) — one full inhale/exhale cycle
const BREATH_MS = 2400;

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

  // ── Approved breath animation on the mark ─────────────────────
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: BREATH_MS / 2,
          easing: Easing.inOut(Easing.quad), // inhale — smooth both ends
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: BREATH_MS / 2,
          easing: Easing.inOut(Easing.quad), // exhale
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [breath]);

  // Scale 1.00 → 1.04 (a 4% breath — perceptible, never bouncy)
  const markScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  // Halo breathes on the same rhythm, barely perceptible
  const haloOpacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  // ── Three-dot staggered loading animation ─────────────────────
  const dot1 = useRef(new Animated.Value(0.35)).current;
  const dot2 = useRef(new Animated.Value(0.35)).current;
  const dot3 = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const createDotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.35,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

    const a1 = createDotAnim(dot1, 0);
    const a2 = createDotAnim(dot2, 260);
    const a3 = createDotAnim(dot3, 520);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  // Icon at ~32% of screen width — natural square, NO crop, NO distortion
  const iconSize = Math.round(Math.min(Dimensions.get('window').width, 430) * 0.32);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.content}>
        {/* Breathing halo (outer + inner soft discs, animated in sync) */}
        <View style={styles.haloStack}>
          <Animated.View
            style={[
              styles.haloOuter,
              { opacity: haloOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.haloInner,
              { opacity: haloOpacity },
            ]}
          />
          {/* The mark: brand icon only, natural 1:1, breathing */}
          <Animated.View
            style={{ transform: [{ scale: markScale }] }}
          >
            <Image
              source={BRAND.logoIconPng}
              style={{ width: iconSize, height: iconSize }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Opt-in tagline — approved splash default shows no text */}
        {tagline ? (
          <Text
            style={[
              styles.tagline,
              { color: c.textSecondary, fontFamily: fontsLoaded ? FONTS.subheading : 'System' },
            ]}
          >
            {tagline}
          </Text>
        ) : null}

        {/* Three-dot loading indicator (lavender active on lavender-300 base) */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: DOT_INACTIVE }, { opacity: dot1 }]} />
          <Animated.View style={[styles.dot, { backgroundColor: DOT_INACTIVE }, { opacity: dot2 }]} />
          <Animated.View style={[styles.dot, { backgroundColor: DOT_INACTIVE }, { opacity: dot3 }]} />
        </View>

        {/* Optional loading message (in-app usage) */}
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
  // Soft halo illusion: two translucent lavender discs stacked behind the mark
  haloStack: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 248,
    height: 248,
    marginBottom: 28,
  },
  haloOuter: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 124,
    backgroundColor: HALO_OUTER,
  },
  haloInner: {
    position: 'absolute',
    width: 196,
    height: 196,
    borderRadius: 98,
    backgroundColor: HALO,
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
    marginTop: 20,
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