import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { useColors, createThemedStyles } from '../src/hooks/useThemedStyles';

// Helper to navigate to the correct dashboard based on user role
function navigateToDashboard(router: any, role: string) {
  if (role === 'MOM') {
    router.replace('/(mom)/home');
  } else if (role === 'DOULA') {
    router.replace('/(doula)/dashboard');
  } else if (role === 'MIDWIFE') {
    router.replace('/(midwife)/dashboard');
  } else if (role === 'ADMIN') {
    router.replace('/(admin)/content');
  }
}

export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuthStore();
  const colors = useColors();
  const styles = getStyles(colors);
  
  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    } else if (user) {
      // Always navigate to dashboard - onboarding is auto-completed in _layout.tsx
      navigateToDashboard(router, user.role);
    }
  }, [isLoading, isAuthenticated, user]);
  
  return (
    <View style={styles.container}>
      <LoadingScreen message="Welcome to True Joy Birthing..." />
    </View>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
