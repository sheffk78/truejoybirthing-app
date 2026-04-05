import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  TextInput as RNTextInput,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { API_BASE, API_ENDPOINTS } from '../../src/constants/api';

type Step = 'email' | 'code' | 'newPassword' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showError = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Error', message);
    }
  };

  const handleRequestCode = async () => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_FORGOT_PASSWORD}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send reset code');
      }

      setStep('code');
    } catch (error: any) {
      showError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const newErrors: Record<string, string> = {};
    if (!code.trim()) {
      newErrors.code = 'Reset code is required';
    } else if (code.trim().length !== 6) {
      newErrors.code = 'Please enter the 6-digit code';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setStep('newPassword');
  };

  const handleResetPassword = async () => {
    const newErrors: Record<string, string> = {};
    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_RESET_PASSWORD}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reset password');
      }

      setStep('success');
    } catch (error: any) {
      showError(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  const renderStepIndicator = () => {
    const steps: Step[] = ['email', 'code', 'newPassword'];
    const currentIndex = steps.indexOf(step);
    if (step === 'success') return null;

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              { backgroundColor: i <= currentIndex ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.iconCircle}>
        <Icon name="mail-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>
        Enter the email address associated with your account and we'll send you a code to reset your password.
      </Text>
      <View style={styles.inputsSection}>
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
        <Button
          title="Send Reset Code"
          onPress={handleRequestCode}
          loading={isLoading}
          fullWidth
          style={styles.actionButton}
        />
      </View>
    </>
  );

  const renderCodeStep = () => (
    <>
      <View style={styles.iconCircle}>
        <Icon name="keypad-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Enter Reset Code</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit code to{' '}
        <Text style={{ fontFamily: FONTS.bodyBold, color: colors.text }}>{email}</Text>.
        Check your inbox and enter the code below.
      </Text>
      <View style={styles.inputsSection}>
        <Input
          label="Reset Code"
          placeholder="Enter 6-digit code"
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoCapitalize="none"
          leftIcon="keypad-outline"
          error={errors.code}
        />
        <Button
          title="Verify Code"
          onPress={handleVerifyCode}
          loading={isLoading}
          fullWidth
          style={styles.actionButton}
        />
      </View>
      <Pressable
        onPress={handleRequestCode}
        // @ts-ignore
        onClick={Platform.OS === 'web' ? handleRequestCode : undefined}
        style={styles.resendLink}
      >
        <Text style={styles.resendText}>Didn't receive the code? </Text>
        <Text style={styles.resendAction}>Resend</Text>
      </Pressable>
    </>
  );

  const renderNewPasswordStep = () => (
    <>
      <View style={styles.iconCircle}>
        <Icon name="lock-closed-outline" size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>
        Create a new password for your account. Make sure it's at least 6 characters long.
      </Text>
      <View style={styles.inputsSection}>
        <Input
          label="New Password"
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          leftIcon="lock-closed-outline"
          error={errors.newPassword}
        />
        <Input
          label="Confirm Password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          leftIcon="lock-closed-outline"
          error={errors.confirmPassword}
        />
        <Button
          title="Reset Password"
          onPress={handleResetPassword}
          loading={isLoading}
          fullWidth
          style={styles.actionButton}
        />
      </View>
    </>
  );

  const renderSuccessStep = () => (
    <>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.success}15` }]}>
        <Icon name="checkmark-circle-outline" size={32} color={colors.success} />
      </View>
      <Text style={styles.title}>Password Reset!</Text>
      <Text style={styles.subtitle}>
        Your password has been updated successfully. You can now log in with your new password.
      </Text>
      <Button
        title="Back to Login"
        onPress={handleBackToLogin}
        fullWidth
        style={styles.actionButton}
      />
    </>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'email':
        return renderEmailStep();
      case 'code':
        return renderCodeStep();
      case 'newPassword':
        return renderNewPasswordStep();
      case 'success':
        return renderSuccessStep();
    }
  };

  const canGoBack = step === 'email' || step === 'code' || step === 'newPassword';

  const handleBack = () => {
    if (step === 'email') {
      router.back();
    } else if (step === 'code') {
      setStep('email');
      setErrors({});
    } else if (step === 'newPassword') {
      setStep('code');
      setErrors({});
    }
  };

  const formContent = (
    <View style={isWideScreen ? styles.wideFormInner : styles.mobileFormCard}>
      {canGoBack && (
        <Pressable
          style={styles.backButtonInline}
          onPress={handleBack}
          // @ts-ignore
          onClick={Platform.OS === 'web' ? handleBack : undefined}
        >
          <Icon name="arrow-back" size={20} color={colors.text} />
          <Text style={styles.backButtonText}>
            {step === 'email' ? 'Back to Login' : 'Back'}
          </Text>
        </Pressable>
      )}

      {renderStepIndicator()}
      {renderStepContent()}
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
  // Shared styles
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

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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

  // Resend link
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
}));
