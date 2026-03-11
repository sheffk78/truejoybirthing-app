import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

type RoleOption = 'MOM' | 'DOULA' | 'MIDWIFE';

interface RoleData {
  value: RoleOption;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  colorLight: string;
  pricing: string;
  bgImage: string;
}

const getRoleOptions = (colors: ReturnType<typeof useColors>): RoleData[] => [
  {
    value: 'MOM',
    label: "I'm Expecting",
    subtitle: 'Create your birth plan & build your team',
    icon: 'heart',
    color: colors.secondary,
    colorLight: colors.secondaryLight,
    pricing: 'Free Forever',
    bgImage: 'https://images.unsplash.com/photo-1771814535949-53fd6188f5f2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMHBhc3RlbCUyMGZsdWlkJTIwZ3JhZGllbnR8ZW58MHx8fHwxNzcyNTE4MDI0fDA&ixlib=rb-4.1.0&q=85',
  },
  {
    value: 'DOULA',
    label: "I'm a Doula",
    subtitle: 'Manage clients & grow your practice',
    icon: 'people',
    color: colors.primary,
    colorLight: colors.primaryLight,
    pricing: 'Pro Features',
    bgImage: 'https://images.unsplash.com/photo-1771814536150-fa5677cfca01?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMHBhc3RlbCUyMGZsdWlkJTIwZ3JhZGllbnR8ZW58MHx8fHwxNzcyNTE4MDI0fDA&ixlib=rb-4.1.0&q=85',
  },
  {
    value: 'MIDWIFE',
    label: "I'm a Midwife",
    subtitle: 'Track visits & support birthing families',
    icon: 'medkit',
    color: colors.accent,
    colorLight: colors.accent + '40',
    pricing: 'Pro Features',
    bgImage: 'https://images.unsplash.com/photo-1771814567353-4be8ac21cfb4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMHBhc3RlbCUyMGZsdWlkJTIwZ3JhZGllbnR8ZW58MHx8fHwxNzcyNTE4MDI0fDA&ixlib=rb-4.1.0&q=85',
  },
];

export default function SignupScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  
  // Get role options with colors
  const roleOptions = getRoleOptions(colors);
  
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleRoleSelect = (role: RoleOption) => {
    setSelectedRole(role);
    setStep('details');
  };
  
  const handleSignup = async () => {
    if (!validate()) return;
    
    try {
      await register(email, password, fullName, selectedRole!);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Registration failed. Please try again.');
      } else {
        Alert.alert('Registration Failed', error.message || 'Please try again.');
      }
    }
  };
  
  const selectedRoleData = roleOptions.find(r => r.value === selectedRole);
  
  // Step 1: Role Selection
  if (step === 'role') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.roleScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            data-testid="signup-back-btn"
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
          <View style={styles.roleHeaderSection}>
            <Text style={styles.roleTitle}>Welcome!</Text>
            <Text style={styles.roleSubtitle}>Tell us who you are to get started</Text>
          </View>
          
          {/* Role Cards */}
          <View style={styles.roleCardsContainer}>
            {roleOptions.map((option, index) => (
              <Pressable
                key={option.value}
                style={({ pressed }) => [
                  styles.roleCard,
                  pressed && styles.roleCardPressed,
                ]}
                onPress={() => handleRoleSelect(option.value)}
                // @ts-ignore - onClick for web compatibility
                onClick={Platform.OS === 'web' ? () => handleRoleSelect(option.value) : undefined}
                data-testid={`role-card-${option.value.toLowerCase()}`}
              >
                <ImageBackground
                  source={{ uri: option.bgImage }}
                  style={styles.roleCardBg}
                  imageStyle={styles.roleCardBgImage}
                >
                  <LinearGradient
                    colors={[option.color + '90', option.color + 'E0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.roleCardGradient}
                  >
                    {/* Icon */}
                    <View style={styles.roleIconCircle}>
                      <Icon name={option.icon as any} size={32} color={option.color} />
                    </View>
                    
                    {/* Text */}
                    <Text style={styles.roleCardLabel}>{option.label}</Text>
                    <Text style={styles.roleCardSubtitle}>{option.subtitle}</Text>
                    
                    {/* Pricing Badge */}
                    <View style={styles.pricingBadge}>
                      <Text style={styles.pricingText}>{option.pricing}</Text>
                    </View>
                    
                    {/* Arrow */}
                    <View style={styles.roleCardArrow}>
                      <Icon name="arrow-forward" size={20} color="#FFFFFF" />
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </Pressable>
            ))}
          </View>
          
          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')} data-testid="signup-login-link">
              <Text style={styles.loginLink}>Log In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  
  // Step 2: Account Details
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Pressable
            style={styles.backButton}
            onPress={() => setStep('role')}
            data-testid="details-back-btn"
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          
          {/* Selected Role Badge */}
          {selectedRoleData && (
            <View style={[styles.selectedRoleBadge, { backgroundColor: selectedRoleData.color + '20' }]}>
              <Icon name={selectedRoleData.icon as any} size={16} color={selectedRoleData.color} />
              <Text style={[styles.selectedRoleText, { color: selectedRoleData.color }]}>
                {selectedRoleData.label}
              </Text>
              <Pressable onPress={() => setStep('role')} data-testid="change-role-btn">
                <Text style={[styles.changeRoleText, { color: selectedRoleData.color }]}>Change</Text>
              </Pressable>
            </View>
          )}
          
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Fill in your details to get started</Text>
          </View>
          
          {/* Form */}
          <View style={styles.formSection}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              leftIcon="person-outline"
              error={errors.fullName}
              testID="input-fullname"
            />
            
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
              testID="input-email"
            />
            
            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
              error={errors.password}
              testID="input-password"
            />
            
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              leftIcon="lock-closed-outline"
              error={errors.confirmPassword}
              testID="input-confirm-password"
            />
          </View>
          
          {/* Submit Button */}
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: selectedRoleData?.color || colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSignup}
            disabled={isLoading}
            data-testid="create-account-btn"
          >
            {isLoading ? (
              <Text style={styles.submitButtonText}>Creating Account...</Text>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Create Account</Text>
                <Icon name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </Pressable>
          
          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.loginLink, { color: selectedRoleData?.color || colors.primary }]}>
                Log In
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  roleScrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  roleHeaderSection: {
    marginBottom: SIZES.xl,
  },
  roleTitle: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  roleSubtitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  roleCardsContainer: {
    gap: SIZES.md,
    marginBottom: SIZES.xl,
  },
  roleCard: {
    borderRadius: SIZES.radiusXl,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  roleCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  roleCardBg: {
    width: '100%',
  },
  roleCardBgImage: {
    borderRadius: SIZES.radiusXl,
  },
  roleCardGradient: {
    padding: SIZES.lg,
    minHeight: 140,
  },
  roleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  roleCardLabel: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  roleCardSubtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: SIZES.sm,
  },
  pricingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  pricingText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roleCardArrow: {
    position: 'absolute',
    right: SIZES.lg,
    top: '50%',
    marginTop: -10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    gap: SIZES.xs,
    marginBottom: SIZES.md,
  },
  selectedRoleText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
  changeRoleText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    textDecorationLine: 'underline',
    marginLeft: SIZES.xs,
  },
  headerSection: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontTitle,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md + 2,
    borderRadius: SIZES.radiusFull,
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  submitButtonText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
}));
