import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppTutorial from '../src/components/AppTutorial';
import { useAuthStore } from '../src/store/authStore';
import { useColors } from '../src/hooks/useThemedStyles';
import { apiRequest } from '../src/utils/api';
import { API_ENDPOINTS } from '../src/constants/api';
import {
  MOM_TUTORIAL_STEPS,
  DOULA_TUTORIAL_STEPS,
  MIDWIFE_TUTORIAL_STEPS,
} from '../src/constants/tutorialData';

export default function TutorialScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { user, updateUser } = useAuthStore();
  const colors = useColors();
  
  const userRole = role || user?.role || 'MOM';
  
  const getTutorialConfig = () => {
    switch (userRole) {
      case 'MOM':
        return {
          steps: MOM_TUTORIAL_STEPS,
          roleColor: colors.secondary,
          roleName: 'Mom',
          homeRoute: '/(mom)/home',
        };
      case 'DOULA':
        return {
          steps: DOULA_TUTORIAL_STEPS,
          roleColor: colors.roleDoula,
          roleName: 'Doula',
          homeRoute: '/(doula)/dashboard',
        };
      case 'MIDWIFE':
        return {
          steps: MIDWIFE_TUTORIAL_STEPS,
          roleColor: colors.roleMidwife,
          roleName: 'Midwife',
          homeRoute: '/(midwife)/dashboard',
        };
      default:
        return {
          steps: MOM_TUTORIAL_STEPS,
          roleColor: colors.primary,
          roleName: 'User',
          homeRoute: '/(mom)/home',
        };
    }
  };
  
  const config = getTutorialConfig();
  
  const completeOnboarding = async () => {
    // Update local state immediately for instant UI transition
    updateUser({ onboarding_completed: true, tutorial_completed: true });
    // Persist to backend so onboarding_completed survives re-auth/refresh
    try {
      await apiRequest(API_ENDPOINTS.AUTH_UPDATE_PROFILE, {
        method: 'PUT',
        body: JSON.stringify({
          onboarding_completed: true,
          tutorial_completed: true,
        }),
      });
    } catch (e) {
      // Local state is already set — backend sync is best-effort
      console.warn('Failed to persist onboarding completion to backend:', e);
    }
    router.replace(config.homeRoute as any);
  };
  
  const handleComplete = async () => {
    await completeOnboarding();
  };
  
  const handleSkip = async () => {
    await completeOnboarding();
  };
  
  return (
    <AppTutorial
      steps={config.steps}
      onComplete={handleComplete}
      onSkip={handleSkip}
      roleColor={config.roleColor}
      roleName={config.roleName}
    />
  );
}
