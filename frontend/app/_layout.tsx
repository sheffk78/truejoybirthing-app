import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (isLoading) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    const inMomGroup = segments[0] === '(mom)';
    const inDoulaGroup = segments[0] === '(doula)';
    const inMidwifeGroup = segments[0] === '(midwife)';
    const inAdminGroup = segments[0] === '(admin)';
    
    if (!isAuthenticated && !inAuthGroup) {
      // Not authenticated, redirect to welcome
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && user) {
      // Check if onboarding is needed
      if (!user.onboarding_completed) {
        // Redirect to onboarding based on role
        if (user.role === 'MOM' && segments[1] !== 'onboarding') {
          router.replace('/(auth)/mom-onboarding');
        } else if (user.role === 'DOULA' && segments[1] !== 'doula-onboarding') {
          router.replace('/(auth)/doula-onboarding');
        } else if (user.role === 'MIDWIFE' && segments[1] !== 'midwife-onboarding') {
          router.replace('/(auth)/midwife-onboarding');
        }
      } else if (inAuthGroup) {
        // Already authenticated, redirect to appropriate dashboard
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
  }, [isAuthenticated, isLoading, user, segments]);
  
  if (isLoading) {
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
