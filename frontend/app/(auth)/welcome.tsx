import React from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
        <LinearGradient
          colors={[
            'rgba(159, 131, 182, 0.3)',  // Soft lavender tint
            'rgba(212, 165, 165, 0.4)',  // Dusty rose tint
            colors.background + 'D9',     // Fade to background (85% opacity)
            colors.background
          ]}
          locations={[0, 0.3, 0.65, 0.9]}
          style={styles.gradientOverlay}
        />
      </ImageBackground>
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Logo at top - using transparent icon on photo background */}
        <View style={styles.logoContainer}>
          {Platform.OS === 'web' ? (
            <img 
              src={BRAND.logoIcon} 
              alt="True Joy Birthing"
              style={{ width: 120, height: 120, objectFit: 'contain' }}
            />
          ) : (
            <Image
              source={{ uri: BRAND.logoIcon }}
              style={styles.logo}
              resizeMode="contain"
            />
          )}
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
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Get Started Free</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
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
            <Text style={styles.linkText}>Terms</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
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
  logo: {
    width: 180,
    height: 65,
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
    color: '#FFFFFF',
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
