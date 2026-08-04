import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import { useColors, SIZES } from '../../src/hooks/useThemedStyles';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useBadgeStore } from '../../src/store/badgeStore';
import { useNotificationBadges } from '../../src/hooks/useNotificationBadges';

function TabIconWithBadge({
  name,
  color,
  size,
  showDot,
}: {
  name: any;
  color: string;
  size: number;
  showDot: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Icon name={name} size={size} color={color} />
      {showDot && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#EF4444',
            marginLeft: -4,
            marginTop: -6,
            borderWidth: 1.5,
            borderColor: '#fff',
          }}
        />
      )}
    </View>
  );
}

/**
 * Lactation Navigation Layout
 * 
 * Simplified client-first navigation:
 * - Home: Dashboard with quick stats and client overview
 * - Clients: Primary entry point for all client work
 * - Messages: Quick access to conversations
 * - Profile: Settings and profile management
 * 
 * All client-specific tools (Notes, Contracts, Invoices, Appointments)
 * are accessed through Clients → Client Detail → Tool
 */
export default function LactationLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8);
  const { user } = useAuthStore();

  // Poll for notification/message badges
  useNotificationBadges();
  const newLeads = useBadgeStore((s) => s.newLeads);
  const unreadMessages = useBadgeStore((s) => s.unreadMessages);
  const pendingShareRequests = useBadgeStore((s) => s.pendingShareRequests);
  const subscriptionExpiring = useBadgeStore((s) => s.subscriptionExpiring);
  const clearBadge = useBadgeStore((s) => s.clearBadge);

  // Render-time guard: redirect before any screen tree mounts to prevent
  // wrong-role screens from firing API calls before useEffect-based redirect
  if (!user || user.role !== 'LACTATION') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lactationPrimary,
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
            <TabIconWithBadge name="home-outline" color={color} size={size} showDot={pendingShareRequests > 0} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Leads',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="disc-outline" color={color} size={size} showDot={newLeads > 0} />
          ),
        }}
        listeners={{ tabPress: () => clearBadge('newLeads') }}
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
            <TabIconWithBadge name="chatbubbles-outline" color={color} size={size} showDot={unreadMessages > 0} />
          ),
        }}
        listeners={{ tabPress: () => clearBadge('unreadMessages') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="person-outline" color={color} size={size} showDot={subscriptionExpiring > 0} />
          ),
        }}
        listeners={{ tabPress: () => clearBadge('subscriptionExpiring') }}
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
