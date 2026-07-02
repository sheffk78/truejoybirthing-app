import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import LoadingScreen from '../src/components/LoadingScreen';
import { useColors, createThemedStyles } from '../src/hooks/useThemedStyles';

/**
 * index.tsx is a passive redirect. All auth gating and routing decisions are
 * made by the root _layout.tsx guard. This component only redirects to the
 * user's default route once the auth state is settled, so the user doesn't
 * see a blank loading screen after _layout.tsx has determined they belong
 * on a dashboard. It does NOT duplicate the auth/onboarding guard logic.
 */
export default function Index() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useAuthStore();
  const colors = useColors();
  const styles = getStyles(colors);

  // Only redirect once auth has settled. _layout.tsx guard handles all
  // unauthenticated -> welcome and onboarding redirects. This effect only
  // fires for authenticated+onboarded users who landed on index and need
  // to be sent to their role dashboard.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (!user.onboarding_completed) return; // _layout handles onboarding redirect

    const dest = user.role === 'MOM' ? '/(mom)/home'
      : user.role === 'DOULA' ? '/(doula)/dashboard'
      : user.role === 'MIDWIFE' ? '/(midwife)/dashboard'
      : user.role === 'ADMIN' ? '/(admin)/content'
      : '/(auth)/welcome';
    router.replace(dest);
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