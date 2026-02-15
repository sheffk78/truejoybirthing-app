import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, checkAuth, _hasHydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  
  // Load fonts - explicitly load Ionicons for web compatibility
  const [fontsLoaded] = useFonts({
    'Ionicons': require('../assets/fonts/Ionicons.ttf'),
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  // Check auth on mount, but only after hydration
  useEffect(() => {
    if (_hasHydrated) {
      checkAuth();
    }
  }, [_hasHydrated]);
  
  // Handle navigation based on auth state
  useEffect(() => {
    // Wait for hydration and loading to complete
    if (!_hasHydrated || isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const currentScreen = segments[1];
    
    if (!isAuthenticated && !inAuthGroup) {
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
  }, [isAuthenticated, isLoading, user, segments, _hasHydrated]);
  
  // Show loading screen while hydrating or loading
  if (!_hasHydrated || isLoading || !fontsLoaded) {
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
