import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import { SIZES, FONTS, BRAND } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

const { width, height } = Dimensions.get('window');

// Beautiful birth photo - newborn sleeping on mother
const HERO_IMAGE = require('../../assets/images/hero-newborn-sleeping.jpg');

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Image Background */}
      <ImageBackground
        source={HERO_IMAGE}
        style={styles.heroImage}
        resizeMode="cover"
      >
        {/* Soft lavender/rose tint overlay */}
        <View style={[styles.gradientOverlay, { backgroundColor: 'rgba(159, 131, 182, 0.35)' }]} />
      </ImageBackground>
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Logo at top - using transparent icon on photo background */}
        <View style={styles.logoContainer}>
          <BRAND.logoIcon width={72} height={72} />
        </View>
        
        {/* Spacer */}
        <View style={styles.spacer} />
        
        {/* Bottom Content Card */}
        <View style={[styles.bottomCard, { backgroundColor: colors.background }]}>
          {/* Headline */}
          <Text style={[styles.headline, { color: colors.text }]}>
            Your Birth Journey,{'\n'}Supported Every Step
          </Text>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create your birth plan, connect with doulas and midwives, and experience the birth you envision.
          </Text>
          
          {/* Feature Pills */}
          <View style={styles.featurePills}>
            <View style={[styles.pill, { backgroundColor: colors.secondary + '25' }]}>
              <Icon name="document-text" size={14} color={colors.secondary} />
              <Text style={[styles.pillText, { color: colors._theme.accent.secondaryDark }]}>Birth Plan</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.primary + '25' }]}>
              <Icon name="people" size={14} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primaryDark }]}>Your Team</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.accent + '25' }]}>
              <Icon name="heart" size={14} color={colors.accent} />
              <Text style={[styles.pillText, { color: colors.accent }]}>Support</Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/(auth)/signup')}
            // @ts-ignore - onClick for web compatibility
            onClick={Platform.OS === 'web' ? () => router.push('/(auth)/signup') : undefined}
            data-testid="get-started-btn"
          >
            <View style={[styles.buttonGradient, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
              <Icon name="arrow-forward" size={20} color={colors.white} />
            </View>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/(auth)/login')}
            // @ts-ignore - onClick for web compatibility
            onClick={Platform.OS === 'web' ? () => router.push('/(auth)/login') : undefined}
            data-testid="login-btn"
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </Pressable>
          
          {/* Footer */}
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.linkText}
              onPress={() => Linking.openURL('https://truejoybirthing.com/terms')}
            >
              Terms
            </Text>{' '}\n            and{' '}\n            <Text
              style={styles.linkText}
              onPress={() => Linking.openURL('https://truejoybirthing.com/privacy')}
            >
              Privacy Policy
            </Text>
          </Text>
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
  headline: {
    fontSize: 30,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 38,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: SIZES.md,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  buttonGradient: {
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
  },
  secondaryButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.primary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
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
