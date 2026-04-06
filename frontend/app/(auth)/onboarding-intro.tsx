import React from 'react';
import {
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingWalkthrough from '../../src/components/OnboardingWalkthrough';
import { useAuthStore } from '../../src/store/authStore';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function OnboardingIntroScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user } = useAuthStore();
  
  const handleComplete = () => {
    // After walkthrough, go to notification permission screen before role-specific profile setup
    const role = user?.role || 'MOM';
    router.replace(`/(auth)/notification-permission?role=${role}`);
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

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
