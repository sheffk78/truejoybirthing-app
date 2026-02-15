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
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  
  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (Platform.OS === 'web') {
      const redirectUrl = window.location.origin + '/auth-callback';
      window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      // For native, use expo-web-browser or deep linking
      const redirectUrl = 'https://joy-birth-v1.preview.emergentagent.com/auth-callback';
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
            <View style={styles.logoCircle}>
              <Ionicons name="heart" size={40} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.title}>True Joy Birthing</Text>
          <Text style={styles.subtitle}>
            Your birth plan, your team, your support in one place.
          </Text>
        </View>
        
        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Joyful Birth Plan</Text>
              <Text style={styles.featureDescription}>
                Create and manage your personalized birth plan
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Connect Your Team</Text>
              <Text style={styles.featureDescription}>
                Find and collaborate with doulas and midwives
              </Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
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
            icon={<Ionicons name="logo-google" size={20} color={COLORS.primary} />}
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.fontHero,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.fontMd,
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
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: SIZES.fontSm,
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
    color: COLORS.textLight,
  },
  footerText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
});
