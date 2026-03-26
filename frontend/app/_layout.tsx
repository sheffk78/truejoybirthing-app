import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform, StatusBar, View, ActivityIndicator } from 'react-native';
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
import { apiRequest } from '../src/utils/api';
import { API_ENDPOINTS } from '../src/constants/api';

// Inner layout component that uses theme
function ThemedLayout() {
  const { theme, isDark } = useTheme();
  const { user, isAuthenticated, isLoading, checkAuth, updateUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const isCompletingOnboarding = useRef(false);
  
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
      // Check if onboarding is needed - auto-complete it and go to dashboard
      if (!user.onboarding_completed) {
        if (!isCompletingOnboarding.current) {
          isCompletingOnboarding.current = true;
          // Auto-complete onboarding with minimal data so user can get to the app
          // They can fill in detailed profile info later from their profile screen
          (async () => {
            try {
              let endpoint = API_ENDPOINTS.MOM_ONBOARDING;
              let body: any = {};
              
              if (user.role === 'MOM') {
                endpoint = API_ENDPOINTS.MOM_ONBOARDING;
                body = {
                  due_date: '',
                  planned_birth_setting: 'Not sure',
                  zip_code: '',
                  location_city: '',
                  location_state: '',
                };
              } else if (user.role === 'DOULA') {
                endpoint = API_ENDPOINTS.DOULA_ONBOARDING;
                body = {
                  practice_name: user.full_name || 'My Practice',
                  zip_code: '',
                  location_city: '',
                  location_state: '',
                  services_offered: ['Birth Doula'],
                  years_in_practice: null,
                  accepting_new_clients: true,
                };
              } else if (user.role === 'MIDWIFE') {
                endpoint = API_ENDPOINTS.MIDWIFE_ONBOARDING;
                body = {
                  practice_name: user.full_name || 'My Practice',
                  credentials: 'CPM',
                  zip_code: '',
                  location_city: '',
                  location_state: '',
                  years_in_practice: null,
                  birth_settings_served: [],
                  accepting_new_clients: true,
                };
              }
              
              await apiRequest(endpoint, { method: 'POST', body });
            } catch (error) {
              // Even if the API call fails, mark onboarding complete locally
              // so the user isn't stuck. They can update their profile later.
              console.log('Auto-complete onboarding error (non-blocking):', error);
            }
            
            updateUser({ onboarding_completed: true });
            isCompletingOnboarding.current = false;
          })();
        }
        return; // Wait for onboarding to complete before routing
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary }}>
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
    </View>
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
  
  // Show simple loading screen while fonts are loading (before ThemeProvider is available)
  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF7FC' }}>
          <ActivityIndicator size="large" color="#8B76A0" />
        </View>
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
