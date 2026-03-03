import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
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
    <LinearGradient
      colors={['#FEFCFF', '#F9F5FA', '#F3EBF6', '#EDE3F0']}
      locations={[0, 0.3, 0.6, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Section - Logo & Illustration */}
        <View style={styles.topSection}>
          {/* Logo */}
          <Image
            source={{ uri: BRAND.logoJpg }}
            style={styles.logo}
            resizeMode="contain"
          />
          
          {/* Decorative Icons */}
          <View style={styles.iconGrid}>
            <View style={[styles.floatingIcon, styles.iconTopLeft]}>
              <LinearGradient
                colors={[COLORS.secondary, COLORS.secondaryLight]}
                style={styles.iconCircle}
              >
                <Icon name="heart" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={[styles.floatingIcon, styles.iconTopRight]}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.iconCircle}
              >
                <Icon name="people" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={[styles.floatingIcon, styles.iconBottomCenter]}>
              <LinearGradient
                colors={[COLORS.accent, COLORS.accentLight]}
                style={styles.iconCircle}
              >
                <Icon name="document-text" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </View>
        </View>
        
        {/* Bottom Section - Content */}
        <View style={styles.bottomSection}>
          {/* Headline */}
          <Text style={styles.headline}>
            Your Birth Journey,{'\n'}Supported Every Step
          </Text>
          
          <Text style={styles.subtitle}>
            Create your birth plan, connect with doulas and midwives, and track your pregnancy wellness.
          </Text>
          
          {/* Feature List */}
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: COLORS.secondary }]} />
              <Text style={styles.featureText}>Personalized birth plan builder</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.featureText}>Find & message care providers</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, { backgroundColor: COLORS.accent }]} />
              <Text style={styles.featureText}>Weekly tips & wellness tracking</Text>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SIZES.xl,
  },
  logo: {
    width: 240,
    height: 85,
    marginBottom: SIZES.lg,
  },
  iconGrid: {
    width: 200,
    height: 140,
    position: 'relative',
  },
  floatingIcon: {
    position: 'absolute',
  },
  iconTopLeft: {
    left: 0,
    top: 20,
  },
  iconTopRight: {
    right: 0,
    top: 20,
  },
  iconBottomCenter: {
    left: '50%',
    marginLeft: -30,
    bottom: 0,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.lg,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  headline: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 36,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SIZES.md,
  },
  featureList: {
    marginBottom: SIZES.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs + 2,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SIZES.sm,
  },
  featureText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
