import { F, BRAND, SEM_LIGHT } from '../constants/corpus';
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing, Text, Dimensions } from 'react-native';

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

// Brand tokens (corpus law — SEM_LIGHT above; halos keep rgba() law form)
const HALO = 'rgba(142, 140, 181, 0.16)';   // Lavender 500 @16% — approved halo
const HALO_OUTER = 'rgba(142, 140, 181, 0.07)';
const DOT_ACTIVE = SEM_LIGHT.accent.primary;      // law lavenderSoft
const DOT_INACTIVE = SEM_LIGHT.accent.primaryLight; // law lavenderBorder

// Breath rhythm (ms) — one full inhale/exhale cycle
const BREATH_MS = 2400;

export default function BrandedLoader({
  message,
  tagline,
  colors,
  fontsLoaded = true,
}: BrandedLoaderProps) {
  // Default to the light law tokens (static SEM_LIGHT, not the live corpus —
  // the approved splash is theme-invariant: cream canvas in both modes, per
  // SplashMark v2. Theme-aware callers pass the `colors` prop explicitly).
  const c: BrandedLoaderColors = colors || {
    background: SEM_LIGHT.background.primary,
    text: SEM_LIGHT.text.primary,
    textSecondary: SEM_LIGHT.text.secondary,
    primary: SEM_LIGHT.accent.primaryDark,
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

  // ── Entrance: fade + rise (one-time, 480ms) ────────────────────
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enter]);
  const contentOpacity = enter;
  const contentRise = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

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

  // ── Three-dot wave: phase-shifted continuum (no reset jump) ───
  const dotWave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const w = Animated.loop(
      Animated.timing(dotWave, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    w.start();
    return () => w.stop();
  }, [dotWave]);
  const dot = (phase: number) =>
    dotWave.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1],
      outputRange: [
        0.35 + 0.65 * Math.max(0, Math.cos(0 * 2 * Math.PI)),
        0.35 + 0.65 * Math.max(0, Math.cos((phase + 0.25) * 2 * Math.PI)),
        0.35 + 0.65 * Math.max(0, Math.cos((phase + 0.5) * 2 * Math.PI)),
        0.35 + 0.65 * Math.max(0, Math.cos((phase + 0.75) * 2 * Math.PI)),
        0.35 + 0.65 * Math.max(0, Math.cos((phase + 1) * 2 * Math.PI)),
      ],
    });

    // Icon at ~32% of screen width — natural square, NO crop, NO distortion
  const iconSize = Math.round(Math.min(Dimensions.get('window').width, 430) * 0.32);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentRise }] },
        ]}
      >
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
              { color: c.textSecondary, fontFamily: fontsLoaded ? F.serifSemi : 'System' },
            ]}
          >
            {tagline}
          </Text>
        ) : null}

        {/* Three-dot loading indicator (lavender active on lavender-300 base) */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: DOT_ACTIVE }, { opacity: dot(0) }]} />
          <Animated.View style={[styles.dot, { backgroundColor: DOT_ACTIVE }, { opacity: dot(1 / 3) }]} />
          <Animated.View style={[styles.dot, { backgroundColor: DOT_ACTIVE }, { opacity: dot(2 / 3) }]} />
        </View>

        {/* Optional loading message (in-app usage) */}
        {message ? (
          <Text
            style={[
              styles.message,
              { color: c.textSecondary, fontFamily: fontsLoaded ? F.ui : 'System' },
            ]}
          >
            {message}
          </Text>
        ) : null}
      </Animated.View>
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
    fontSize: 17,
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