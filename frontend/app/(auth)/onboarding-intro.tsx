import React, { useState } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingWalkthrough from '../../src/components/OnboardingWalkthrough';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants/theme';

export default function OnboardingIntroScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const handleComplete = () => {
    // After walkthrough, redirect to role-specific profile setup
    if (user?.role === 'MOM') {
      router.replace('/(auth)/mom-onboarding');
    } else if (user?.role === 'DOULA') {
      router.replace('/(auth)/doula-onboarding');
    } else if (user?.role === 'MIDWIFE') {
      router.replace('/(auth)/midwife-onboarding');
    } else {
      // Fallback
      router.replace('/(auth)/mom-onboarding');
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OnboardingWalkthrough 
        role={user?.role as 'MOM' | 'DOULA' | 'MIDWIFE' || 'MOM'} 
        onComplete={handleComplete} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
