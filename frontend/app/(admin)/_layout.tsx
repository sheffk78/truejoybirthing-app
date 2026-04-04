import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import { useColors, SIZES } from '../../src/hooks/useThemedStyles';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors._theme.role.admin,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: (Platform.OS === 'ios' ? 60 : 56) + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: SIZES.fontXs,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="content"
        options={{
          title: 'Content',
          tabBarIcon: ({ color, size }) => (
            <Icon name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
