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

const HERO_IMAGE = 'https://images.unsplash.com/photo-1752240879764-97bb683bf0d5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwyfHxwcmVnbmFudCUyMHdvbWFuJTIwaGFwcHklMjBkb3VsYSUyMGJpcnRoJTIwbWlkd2lmZXxlbnwwfHx8fDE3NzI1MTgwMTl8MA&ixlib=rb-4.1.0&q=85';

export default function WelcomeScreen() {
  const router = useRouter();
  
  const handleGoogleLogin = () => {
    if (Platform.OS === 'web') {
      const redirectUrl = window.location.origin + '/auth-callback';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      const redirectUrl = 'https://client-photo-sync.preview.emergentagent.com/auth-callback';
      Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Hero Background */}
      <ImageBackground
        source={{ uri: HERO_IMAGE }}
        style={styles.heroBackground}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(254,252,255,0.4)', 'rgba(254,252,255,0.95)', '#FEFCFF']}
          locations={[0, 0.3, 0.6, 0.85]}
          style={styles.gradientOverlay}
        />
      </ImageBackground>
      
      {/* Content */}
      <SafeAreaView style={styles.content} edges={['top', 'bottom']}>
        {/* Logo at top */}
        <View style={styles.logoSection}>
          <Image
            source={{ uri: BRAND.logoJpg }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* Spacer to push content down */}
        <View style={styles.spacer} />
        
        {/* Bottom Content Card */}
        <View style={styles.bottomCard}>
          {/* Headline */}
          <Text style={styles.headline}>
            Your Birth,{'\n'}Your Team,{'\n'}Your Way.
          </Text>
          
          <Text style={styles.subtitle}>
            Connect with doulas and midwives.{'\n'}Create your perfect birth plan.
          </Text>
          
          {/* Feature Pills */}
          <View style={styles.featurePills}>
            <View style={[styles.pill, { backgroundColor: COLORS.secondary + '30' }]}>
              <Icon name="document-text" size={14} color={COLORS.secondary} />
              <Text style={[styles.pillText, { color: COLORS.secondaryDark }]}>Birth Plan</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: COLORS.primary + '30' }]}>
              <Icon name="people" size={14} color={COLORS.primary} />
              <Text style={[styles.pillText, { color: COLORS.primaryDark }]}>Your Team</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: COLORS.accent + '30' }]}>
              <Icon name="heart" size={14} color={COLORS.accent} />
              <Text style={[styles.pillText, { color: COLORS.accentDark }]}>Wellness</Text>
            </View>
          </View>
          
          {/* Action Buttons */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/(auth)/signup')}
            data-testid="get-started-btn"
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Icon name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/(auth)/login')}
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
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.55,
  },
  gradientOverlay: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: SIZES.lg,
  },
  logo: {
    width: 200,
    height: 70,
  },
  spacer: {
    flex: 1,
  },
  bottomCard: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.lg,
  },
  headline: {
    fontSize: 34,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 42,
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
    marginBottom: SIZES.xl,
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
    marginBottom: SIZES.sm,
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
