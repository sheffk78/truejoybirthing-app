import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AppTutorial from '../../src/components/AppTutorial';
import { useAuthStore } from '../../src/store/authStore';
import { useColors } from '../../src/hooks/useThemedStyles';
import {
  MOM_TUTORIAL_STEPS,
  DOULA_TUTORIAL_STEPS,
  MIDWIFE_TUTORIAL_STEPS,
} from '../../src/constants/tutorialData';

/**
 * tutorial-preview — PUBLIC "See how it works" preview (login screen link).
 *
 * Sits inside the (auth) group so the root guard (app/_layout.tsx) treats it
 * as an auth-group route for unauthenticated users instead of kicking them to
 * welcome — the old '/tutorial?role=MOM&preview=true' path was a dead end
 * (guard redirect at _layout.tsx:80–84; audit finding, HIGH, 2026-09-16).
 *
 * Strictly read-only: renders the real tutorial slides with completion/skip
 * returning to login. No auth/profile writes, no onboarding_completed mutation
 * — the real onboarding tutorial remains app/tutorial.tsx.
 */
export default function TutorialPreviewScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { user } = useAuthStore();
  const colors = useColors();

  const userRole = role || user?.role || 'MOM';

  const getPreviewConfig = () => {
    switch (userRole) {
      case 'DOULA':
        return { steps: DOULA_TUTORIAL_STEPS, roleColor: colors.roleDoula, roleName: 'Doula' };
      case 'MIDWIFE':
        return { steps: MIDWIFE_TUTORIAL_STEPS, roleColor: colors.roleMidwife, roleName: 'Midwife' };
      case 'LACTATION':
        return { steps: DOULA_TUTORIAL_STEPS, roleColor: colors.roleLactation, roleName: 'Lactation Consultant' };
      case 'MOM':
      default:
        return { steps: MOM_TUTORIAL_STEPS, roleColor: colors.secondary, roleName: 'Mom' };
    }
  };

  const config = getPreviewConfig();

  const backToLogin = () => router.replace('/(auth)/login');

  return (
    <AppTutorial
      steps={config.steps}
      onComplete={backToLogin}
      onSkip={backToLogin}
      roleColor={config.roleColor}
      roleName={config.roleName}
    />
  );
}