import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
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
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  
  // Load all fonts including Ionicons and brand fonts
  const [fontsLoaded] = useFonts({
    Ionicons: require('../assets/fonts/Ionicons.ttf'),
    PlayfairDisplay_500Medium,
    PlayfairDisplay_700Bold,
    Lato_400Regular,
    Lato_700Bold,
  });
  
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
    
    // Allow public routes without auth
    const isPublicRoute = segments[0] === 'sign-contract' || segments[0] === 'auth-callback';
    
    if (!isAuthenticated && !inAuthGroup && !isPublicRoute) {
      // Not authenticated, redirect to welcome
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && user) {
      // Check if onboarding is needed
      if (!user.onboarding_completed) {
        // Redirect to onboarding based on role
        if (user.role === 'MOM' && currentScreen !== 'mom-onboarding') {
          router.replace('/(auth)/mom-onboarding');
        } else if (user.role === 'DOULA' && currentScreen !== 'doula-onboarding') {
          router.replace('/(auth)/doula-onboarding');
        } else if (user.role === 'MIDWIFE' && currentScreen !== 'midwife-onboarding') {
          router.replace('/(auth)/midwife-onboarding');
        }
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
      }
    }
  }, [isAuthenticated, isLoading, user, segments, isReady]);
  
  // Show loading screen while initializing or fonts are loading
  if (!isReady || isLoading || !fontsLoaded) {
    return (
      <SafeAreaProvider>
        <LoadingScreen message="Loading True Joy Birthing..." />
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: Platform.OS === 'android' ? 'fade' : 'default',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(mom)" />
        <Stack.Screen name="(doula)" />
        <Stack.Screen name="(midwife)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}
