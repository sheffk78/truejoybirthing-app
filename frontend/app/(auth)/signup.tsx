import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Card from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../src/constants/theme';

type RoleOption = 'MOM' | 'DOULA' | 'MIDWIFE';

const ROLE_OPTIONS: { value: RoleOption; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; pricing: string; pricingColor: string }[] = [
  {
    value: 'MOM',
    label: "I'm pregnant / planning a baby",
    description: 'Create your birth plan and connect with your care team',
    icon: 'heart-outline',
    pricing: 'Free',
    pricingColor: COLORS.success,
  },
  {
    value: 'DOULA',
    label: "I'm a doula",
    description: 'Manage clients, contracts, and collaborate on birth plans',
    icon: 'people-outline',
    pricing: 'Paid subscription',
    pricingColor: COLORS.primary,
  },
  {
    value: 'MIDWIFE',
    label: "I'm a midwife",
    description: 'Track clients, visits, and birth summaries',
    icon: 'medkit-outline',
    pricing: 'Paid subscription',
    pricingColor: COLORS.primary,
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  
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
    
    if (!selectedRole) {
      newErrors.role = 'Please select who you are';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSignup = async () => {
    if (!validate()) return;
    
    try {
      await register(email, password, fullName, selectedRole!);
      // Navigation will be handled by the root layout
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again.');
    }
  };
  
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          
          <View style={styles.headerSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join True Joy Birthing today</Text>
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
            />
          </View>
          
          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.roleLabel}>Who are you?</Text>
            {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
            
            {ROLE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSelectedRole(option.value)}
                activeOpacity={0.8}
              >
                <Card
                  style={[
                    styles.roleCard,
                    selectedRole === option.value && styles.roleCardSelected,
                  ]}
                >
                  <View style={styles.roleCardContent}>
                    <View
                      style={[
                        styles.roleIcon,
                        selectedRole === option.value && styles.roleIconSelected,
                      ]}
                    >
                      <Icon
                        name={option.icon}
                        size={24}
                        color={selectedRole === option.value ? COLORS.white : COLORS.primary}
                      />
                    </View>
                    <View style={styles.roleText}>
                      <Text
                        style={[
                          styles.roleTitle,
                          selectedRole === option.value && styles.roleTitleSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.roleDescription}>{option.description}</Text>
                    </View>
                    {selectedRole === option.value && (
                      <Icon name="checkmark-circle" size={24} color={COLORS.primary} />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Submit Button */}
          <Button
            title="Create Account"
            onPress={handleSignup}
            loading={isLoading}
            fullWidth
            style={styles.submitButton}
          />
          
          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
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
  headerSection: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontTitle,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  roleSection: {
    marginBottom: SIZES.lg,
  },
  roleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    color: COLORS.error,
    marginBottom: SIZES.sm,
  },
  roleCard: {
    marginBottom: SIZES.sm,
  },
  roleCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  roleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  roleIconSelected: {
    backgroundColor: COLORS.primary,
  },
  roleText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  roleTitleSelected: {
    color: COLORS.primary,
  },
  roleDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  submitButton: {
    marginBottom: SIZES.lg,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
