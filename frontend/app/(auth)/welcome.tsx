import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Platform,
  Linking,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../src/components/Icon';
import { COLORS, SIZES, FONTS, BRAND } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

// Beautiful birth photo - newborn sleeping on mother
const HERO_IMAGE = 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/nubpbqis_IMG_9108.jpg';

export default function WelcomeScreen() {
  const router = useRouter();
  
  const handleGoogleLogin = () => {
    if (Platform.OS === 'web') {
      const redirectUrl = window.location.origin + '/auth-callback';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      const redirectUrl = 'https://birthing-app-qa.preview.emergentagent.com/auth-callback';
      Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Hero Image Background */}
      <ImageBackground
        source={{ uri: HERO_IMAGE }}
        style={styles.heroImage}
        resizeMode="cover"
      >
        {/* Soft lavender/rose tint overlay */}
        <LinearGradient
          colors={[
            'rgba(159, 131, 182, 0.3)',  // Soft lavender tint
            'rgba(212, 165, 165, 0.4)',  // Dusty rose tint
            'rgba(254, 252, 255, 0.85)', // Fade to background
            '#FEFCFF'
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
        <View style={styles.bottomCard}>
          {/* Headline */}
          <Text style={styles.headline}>
            Your Birth Journey,{'\n'}Supported Every Step
          </Text>
          
          <Text style={styles.subtitle}>
            Create your birth plan, connect with doulas and midwives, and experience the birth you envision.
          </Text>
          
          {/* Feature Pills */}
          <View style={styles.featurePills}>
            <View style={[styles.pill, { backgroundColor: COLORS.secondary + '25' }]}>
              <Icon name="document-text" size={14} color={COLORS.secondary} />
              <Text style={[styles.pillText, { color: COLORS.secondaryDark }]}>Birth Plan</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: COLORS.primary + '25' }]}>
              <Icon name="people" size={14} color={COLORS.primary} />
              <Text style={[styles.pillText, { color: COLORS.primaryDark }]}>Your Team</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: COLORS.accent + '25' }]}>
              <Icon name="heart" size={14} color={COLORS.accent} />
              <Text style={[styles.pillText, { color: COLORS.accentDark }]}>Support</Text>
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
              colors={[COLORS.primary, COLORS.primaryDark]}
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
          
          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          
          {/* Google Login */}
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handleGoogleLogin}
            // @ts-ignore - onClick for web compatibility
            onClick={Platform.OS === 'web' ? handleGoogleLogin : undefined}
            data-testid="google-login-btn"
          >
            <Icon name="logo-google" size={18} color={COLORS.textPrimary} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.background,
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
    color: COLORS.textPrimary,
    lineHeight: 38,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
    color: COLORS.primary,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SIZES.md,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusFull,
    paddingVertical: SIZES.md,
    gap: SIZES.sm,
  },
  googleButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  footerText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
});
