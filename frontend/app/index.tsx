import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { COLORS } from '../src/constants/theme';

export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuthStore();
  
  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome');
    } else if (user) {
      if (!user.onboarding_completed) {
        if (user.role === 'MOM') {
          router.replace('/(auth)/mom-onboarding');
        } else if (user.role === 'DOULA') {
          router.replace('/(auth)/doula-onboarding');
        } else if (user.role === 'MIDWIFE') {
          router.replace('/(auth)/midwife-onboarding');
        }
      } else {
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
  }, [isLoading, isAuthenticated, user]);
  
  return (
    <View style={styles.container}>
      <LoadingScreen message="Welcome to True Joy Birthing..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
