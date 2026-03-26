import { Stack } from 'expo-router';
import { useColors } from '../../src/hooks/useThemedStyles';

export default function AuthLayout() {
  const colors = useColors();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="onboarding-intro" />
      <Stack.Screen name="mom-onboarding" />
      <Stack.Screen name="doula-onboarding" />
      <Stack.Screen name="midwife-onboarding" />
      <Stack.Screen name="tutorial" />
    </Stack>
  );
}
