import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES, FONTS, BRAND } from '../../src/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mother holding newborn - intimate moment
const LOGIN_IMAGE = 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/vp8xh1cu_IMG_0160.jpg';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleLogin = async () => {
    if (!validate()) return;
    
    try {
      await login(email, password);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Please check your credentials and try again.');
      } else {
        Alert.alert('Login Failed', error.message || 'Please check your credentials and try again.');
      }
    }
  };
  
  // Wide screen: Split layout
  if (isWideScreen) {
    return (
      <View style={styles.splitContainer}>
        {/* Left side - Image */}
        <View style={styles.imageSection}>
          <ImageBackground
            source={{ uri: LOGIN_IMAGE }}
            style={styles.imageBg}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                'rgba(159, 131, 182, 0.4)',
                'rgba(212, 165, 165, 0.3)',
                'transparent'
              ]}
              style={styles.imageOverlay}
            >
              <SafeAreaView style={styles.imageContent}>
                <Image
                  source={{ uri: BRAND.logoJpg }}
                  style={styles.splitLogo}
                  resizeMode="contain"
                />
                <View style={styles.imageTextContainer}>
                  <Text style={styles.imageHeadline}>
                    Welcome back to your birth journey
                  </Text>
                  <Text style={styles.imageSubtext}>
                    Your team is waiting for you
                  </Text>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </ImageBackground>
        </View>
        
        {/* Right side - Form */}
        <View style={styles.formSection}>
          <SafeAreaView style={styles.formSafeArea}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.formKeyboard}
            >
              <ScrollView
                contentContainerStyle={styles.splitFormContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formInner}>
                  <Text style={styles.formTitle}>Log In</Text>
                  <Text style={styles.formSubtitle}>Enter your credentials to continue</Text>
                  
                  <View style={styles.inputsContainer}>
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
                      placeholder="Enter your password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      leftIcon="lock-closed-outline"
                      error={errors.password}
                    />
                    
                    <Pressable 
                      style={styles.forgotPassword}
                      // @ts-ignore
                      onClick={Platform.OS === 'web' ? () => {} : undefined}
                    >
                      <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                    </Pressable>
                    
                    <Button
                      title="Log In"
                      onPress={handleLogin}
                      loading={isLoading}
                      fullWidth
                      style={styles.loginButton}
                      testID="login-submit-btn"
                    />
                  </View>
                  
                  <View style={styles.signupSection}>
                    <Text style={styles.signupText}>Don't have an account? </Text>
                    <Pressable 
                      onPress={() => router.push('/(auth)/signup')}
                      // @ts-ignore
                      onClick={Platform.OS === 'web' ? () => router.push('/(auth)/signup') : undefined}
                    >
                      <Text style={styles.signupLink}>Sign Up</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </View>
    );
  }
  
  // Narrow screen: Stacked layout with background image
  return (
    <View style={styles.container}>
      {/* Background Image */}
      <ImageBackground
        source={{ uri: LOGIN_IMAGE }}
        style={styles.mobileBg}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(159, 131, 182, 0.35)',
            'rgba(254, 252, 255, 0.8)',
            '#FEFCFF',
            '#FEFCFF'
          ]}
          locations={[0, 0.35, 0.55, 1]}
          style={styles.mobileGradient}
        />
      </ImageBackground>
      
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
            {/* Header */}
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              // @ts-ignore
              onClick={Platform.OS === 'web' ? () => router.back() : undefined}
            >
              <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
            </Pressable>
            
            {/* Spacer for image */}
            <View style={styles.mobileImageSpacer} />
            
            {/* Form Card */}
            <View style={styles.mobileFormCard}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Log in to continue your journey</Text>
              
              <View style={styles.mobileInputs}>
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
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  leftIcon="lock-closed-outline"
                  error={errors.password}
                />
                
                <Pressable 
                  style={styles.forgotPassword}
                  // @ts-ignore
                  onClick={Platform.OS === 'web' ? () => {} : undefined}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </Pressable>
                
                <Button
                  title="Log In"
                  onPress={handleLogin}
                  loading={isLoading}
                  fullWidth
                  style={styles.loginButton}
                  testID="login-submit-btn"
                />
              </View>
              
              <View style={styles.signupSection}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <Pressable 
                  onPress={() => router.push('/(auth)/signup')}
                  // @ts-ignore
                  onClick={Platform.OS === 'web' ? () => router.push('/(auth)/signup') : undefined}
                >
                  <Text style={styles.signupLink}>Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Split screen styles (wide)
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  imageSection: {
    flex: 1,
    maxWidth: '50%',
  },
  imageBg: {
    flex: 1,
  },
  imageOverlay: {
    flex: 1,
  },
  imageContent: {
    flex: 1,
    padding: SIZES.xl,
    justifyContent: 'space-between',
  },
  splitLogo: {
    width: 160,
    height: 55,
  },
  imageTextContainer: {
    marginBottom: SIZES.xxl,
  },
  imageHeadline: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SIZES.sm,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  imageSubtext: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.body,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  formSection: {
    flex: 1,
    maxWidth: '50%',
    backgroundColor: COLORS.background,
  },
  formSafeArea: {
    flex: 1,
  },
  formKeyboard: {
    flex: 1,
  },
  splitFormContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.xxl,
  },
  formInner: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  formSubtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xl,
  },
  inputsContainer: {
    marginBottom: SIZES.lg,
  },
  
  // Mobile styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
  },
  mobileGradient: {
    flex: 1,
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
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  mobileImageSpacer: {
    height: SCREEN_HEIGHT * 0.18,
  },
  mobileFormCard: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: SIZES.lg,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
  mobileInputs: {
    marginBottom: SIZES.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SIZES.lg,
  },
  forgotPasswordText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontFamily: FONTS.bodyMedium,
  },
  loginButton: {
    marginTop: SIZES.sm,
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  signupLink: {
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
});
