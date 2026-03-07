import { Stack } from 'expo-router';
import { useColors } from '../../src/hooks/useThemedStyles';

export default function ProviderLayout() {
  const colors = useColors();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="client-birth-plans" />
    </Stack>
  );
}
