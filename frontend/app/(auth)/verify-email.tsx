import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const params = useLocalSearchParams<{ email?: string }>();
  const { verifyEmail, resendVerification, isLoading } = useAuthStore();

  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const showError = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Error', message);
    }
  };

  const handleVerify = async () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!code.trim()) {
      newErrors.code = 'Verification code is required';
    } else if (code.trim().length !== 6) {
      newErrors.code = 'Please enter the 6-digit code';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await verifyEmail(email.trim().toLowerCase(), code.trim());
      // Success — the auth store sets isAuthenticated, the root layout will
      // route to onboarding or dashboard automatically.
    } catch (error: any) {
      showError(error.message || 'Verification failed. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Enter your email first' });
      return;
    }

    setIsResending(true);
    setResendMessage('');
    try {
      await resendVerification(email.trim().toLowerCase());
      setResendMessage('A new verification code has been sent to your email.');
    } catch (error: any) {
      showError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    router.replace('/(auth)/login');
  };

  const formContent = (
    <View style={isWideScreen ? styles.wideFormInner : styles.mobileFormCard}>
      <Pressable
        style={styles.backButtonInline}
        onPress={handleBack}
        // @ts-ignore
        onClick={Platform.OS === 'web' ? handleBack : undefined}
      >
        <Icon name="arrow-back" size={20} color={colors.text} />
        <Text style={styles.backButtonText}>Back to Login</Text>
      </Pressable>

      <View style={styles.iconCircle}>
        <Icon name="mail-outline" size={32} color={colors.primary} />
      </View>

      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit verification code to{' '}
        <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text }}>
          {email || 'your email'}
        </Text>
        . Enter it below to activate your account.
      </Text>

      <View style={styles.inputsSection}>
        {!params.email && (
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            error={errors.email}
          />
        )}
        <Input
          label="Verification Code"
          placeholder="Enter 6-digit code"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoCapitalize="none"
          leftIcon="keypad-outline"
          error={errors.code}
        />
        <Button
          title="Verify Email"
          onPress={handleVerify}
          loading={isLoading}
          fullWidth
          style={styles.actionButton}
        />
      </View>

      {resendMessage ? (
        <Text style={styles.resendMessage}>{resendMessage}</Text>
      ) : null}

      <Pressable
        onPress={handleResend}
        // @ts-ignore
        onClick={Platform.OS === 'web' ? handleResend : undefined}
        style={styles.resendLink}
        disabled={isResending}
      >
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <Text style={styles.resendAction}>{isResending ? 'Sending...' : 'Resend'}</Text>
      </Pressable>
    </View>
  );

  // Wide screen layout
  if (isWideScreen) {
    return (
      <View style={[styles.wideContainer, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.wideSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.wideKeyboard}
          >
            <ScrollView
              contentContainerStyle={styles.wideScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {formContent}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Mobile layout
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.mobileSafeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {formContent}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mobileSafeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xl,
    justifyContent: 'center',
  },
  mobileFormCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: SIZES.lg,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  // Wide screen styles
  wideContainer: {
    flex: 1,
  },
  wideSafeArea: {
    flex: 1,
  },
  wideKeyboard: {
    flex: 1,
  },
  wideScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.xxl,
  },
  wideFormInner: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: SIZES.xl,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  // Back button
  backButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginLeft: SIZES.xs,
  },

  // Icon circle
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SIZES.md,
  },

  // Typography
  title: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZES.lg,
  },

  // Inputs
  inputsSection: {
    marginBottom: SIZES.sm,
  },

  // Action button
  actionButton: {
    marginTop: SIZES.sm,
  },

  // Resend
  resendLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  resendText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  resendAction: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: colors.primary,
    fontWeight: '600',
  },
  resendMessage: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.success,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
}));