import { Stack } from 'expo-router';
import { COLORS } from '../../src/constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="mom-onboarding" />
      <Stack.Screen name="doula-onboarding" />
      <Stack.Screen name="midwife-onboarding" />
    </Stack>
  );
}
