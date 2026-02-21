import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import { COLORS, SIZES, SHADOWS, BRAND, FONTS } from '../../src/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  
  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (Platform.OS === 'web') {
      const redirectUrl = window.location.origin + '/auth-callback';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      // For native, use expo-web-browser or deep linking
      const redirectUrl = 'https://joy-birthing-fix.preview.emergentagent.com/auth-callback';
      Linking.openURL(`https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Header */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: BRAND.logoJpg }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>
            {BRAND.tagline}
          </Text>
        </View>
        
        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Icon name="document-text-outline" size={24} color={COLORS.secondary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Joyful Birth Plan</Text>
              <Text style={styles.featureDescription}>
                Create and manage your personalized birth plan
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Icon name="people-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Connect Your Team</Text>
              <Text style={styles.featureDescription}>
                Find and collaborate with doulas and midwives
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Icon name="calendar-outline" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Track Your Journey</Text>
              <Text style={styles.featureDescription}>
                Pregnancy timeline, wellness check-ins, and more
              </Text>
            </View>
          </View>
        </View>
        
        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <Button
            title="Sign Up"
            onPress={() => router.push('/(auth)/signup')}
            fullWidth
            style={styles.signupButton}
          />
          
          <Button
            title="Log In"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            fullWidth
            style={styles.loginButton}
          />
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="outline"
            fullWidth
            icon={<Icon name="logo-google" size={20} color={COLORS.primary} />}
          />
        </View>
        
        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  logoContainer: {
    marginBottom: SIZES.md,
  },
  logo: {
    width: 280,
    height: 100,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SIZES.lg,
  },
  featuresSection: {
    marginBottom: SIZES.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusLg,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  authSection: {
    marginBottom: SIZES.lg,
  },
  signupButton: {
    marginBottom: SIZES.sm,
  },
  loginButton: {
    marginBottom: SIZES.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.md,
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
  footerText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
});
