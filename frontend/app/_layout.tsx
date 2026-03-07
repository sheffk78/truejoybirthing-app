import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  Lato_400Regular,
  Lato_700Bold,
} from '@expo-google-fonts/lato';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';

// Inner layout component that uses theme
function ThemedLayout() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  
  // Initialize the app
  useEffect(() => {
    async function prepare() {
      // Check auth status
      await checkAuth();
      setIsReady(true);
    }
    
    prepare();
  }, []);
  
  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady || isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const currentScreen = segments[1];
    const currentPath = segments.join('/');
    const currentRoleGroup = segments[0]; // e.g., '(mom)', '(doula)', '(midwife)', '(admin)'
    
    // Allow public routes without auth
    const isPublicRoute = segments[0] === 'sign-contract' || segments[0] === 'auth-callback' || segments[0] === 'sign-midwife-contract' || segments[0] === 'plans-pricing' || segments[0] === 'pro-feedback';
    
    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      // Not authenticated, redirect to welcome
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && user) {
      // Check if onboarding is needed
      if (!user.onboarding_completed) {
        // First show intro walkthrough, then role-specific profile setup
        const isOnIntro = currentScreen === 'onboarding-intro';
        const isOnProfileSetup = ['mom-onboarding', 'doula-onboarding', 'midwife-onboarding'].includes(currentScreen);
        
        if (!isOnIntro && !isOnProfileSetup) {
          // Start with the intro walkthrough
          router.replace('/(auth)/onboarding-intro');
        }
        // If already on intro or profile setup, let them continue
      } else if (inAuthGroup) {
        // Already authenticated and onboarded, redirect to appropriate dashboard
        if (user.role === 'MOM') {
          router.replace('/(mom)/home');
        } else if (user.role === 'DOULA') {
          router.replace('/(doula)/dashboard');
        } else if (user.role === 'MIDWIFE') {
          router.replace('/(midwife)/dashboard');
        } else if (user.role === 'ADMIN') {
          router.replace('/(admin)/content');
        }
      } else {
        // Check if user is in wrong role group and redirect to correct one
        const userRoleGroup = `(${user.role.toLowerCase()})`;
        const roleGroups = ['(mom)', '(doula)', '(midwife)', '(admin)'];
        
        if (roleGroups.includes(currentRoleGroup) && currentRoleGroup !== userRoleGroup) {
          // User is in wrong role group, redirect to correct dashboard
          console.log(`Role mismatch: user is ${user.role} but on ${currentRoleGroup} route. Redirecting...`);
          if (user.role === 'MOM') {
            router.replace('/(mom)/home');
          } else if (user.role === 'DOULA') {
            router.replace('/(doula)/dashboard');
          } else if (user.role === 'MIDWIFE') {
            router.replace('/(midwife)/dashboard');
          } else if (user.role === 'ADMIN') {
            router.replace('/(admin)/content');
          }
        }
      }
    }
  }, [isAuthenticated, isLoading, user, segments, isReady]);
  
  // Show loading screen while initializing
  if (!isReady || isLoading) {
    return <LoadingScreen message="Loading True Joy Birthing..." />;
  }
  
  return (
    <>
      {/* Set status bar style based on theme */}
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background.primary}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background.primary },
          animation: Platform.OS === 'android' ? 'fade' : 'default',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(mom)" />
        <Stack.Screen name="(doula)" />
        <Stack.Screen name="(midwife)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="sign-midwife-contract" />
        <Stack.Screen name="plans-pricing" />
        <Stack.Screen name="pro-feedback" />
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // Load all fonts including Ionicons and brand fonts
  const [fontsLoaded] = useFonts({
    Ionicons: require('../assets/fonts/Ionicons.ttf'),
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    Lato_400Regular,
    Lato_700Bold,
  });
  
  // Show loading screen while fonts are loading
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <LoadingScreen message="Loading True Joy Birthing..." />
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
