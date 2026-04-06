import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import { useColors, SIZES } from '../../src/hooks/useThemedStyles';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Midwife Navigation Layout
 * 
 * Simplified client-first navigation:
 * - Home: Dashboard with quick stats and client overview
 * - Clients: Primary entry point for all client work
 * - Messages: Quick access to conversations
 * - Profile: Settings and profile management
 * 
 * All client-specific tools (Notes, Contracts, Invoices, Appointments, Visits, Birth Summaries)
 * are accessed through Clients → Client Detail → Tool
 */
export default function MidwifeLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.midwifePrimary,
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
      {/* Primary Navigation - 5 tabs */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ color, size }) => (
            <Icon name="disc-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          tabBarIcon: ({ color, size }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden screens - accessed via navigation, not tab bar */}
      <Tabs.Screen
        name="client-detail"
        options={{ 
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="visits"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="birth-summaries"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="contracts"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="invoices"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="contract-templates"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="client-birth-plans"
        options={{ 
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{ 
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
