import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppTutorial from '../../src/components/AppTutorial';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS } from '../../src/constants/theme';
import {
  MOM_TUTORIAL_STEPS,
  DOULA_TUTORIAL_STEPS,
  MIDWIFE_TUTORIAL_STEPS,
} from '../../src/constants/tutorialData';

const TUTORIAL_SEEN_KEY = 'tutorial_completed';

export default function TutorialScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { user } = useAuthStore();
  
  const userRole = role || user?.role || 'MOM';
  
  const getTutorialConfig = () => {
    switch (userRole) {
      case 'MOM':
        return {
          steps: MOM_TUTORIAL_STEPS,
          roleColor: COLORS.secondary,
          roleName: 'Mom',
          homeRoute: '/(mom)/home',
        };
      case 'DOULA':
        return {
          steps: DOULA_TUTORIAL_STEPS,
          roleColor: COLORS.roleDoula,
          roleName: 'Doula',
          homeRoute: '/(doula)/dashboard',
        };
      case 'MIDWIFE':
        return {
          steps: MIDWIFE_TUTORIAL_STEPS,
          roleColor: COLORS.roleMidwife,
          roleName: 'Midwife',
          homeRoute: '/(midwife)/dashboard',
        };
      default:
        return {
          steps: MOM_TUTORIAL_STEPS,
          roleColor: COLORS.primary,
          roleName: 'User',
          homeRoute: '/(mom)/home',
        };
    }
  };
  
  const config = getTutorialConfig();
  
  const markTutorialComplete = async () => {
    try {
      await AsyncStorage.setItem(`${TUTORIAL_SEEN_KEY}_${userRole}`, 'true');
    } catch (error) {
      console.log('Error saving tutorial state:', error);
    }
  };
  
  const handleComplete = async () => {
    await markTutorialComplete();
    router.replace(config.homeRoute as any);
  };
  
  const handleSkip = async () => {
    await markTutorialComplete();
    router.replace(config.homeRoute as any);
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
