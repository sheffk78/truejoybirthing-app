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

export default function MomLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8);
  const { user } = useAuthStore();

  // Poll for notification/message badges
  useNotificationBadges();
  const unreadMessages = useBadgeStore((s) => s.unreadMessages);
  const unreadNotifications = useBadgeStore((s) => s.unreadNotifications);
  const clearBadge = useBadgeStore((s) => s.clearBadge);

  // Render-time guard: redirect before any screen tree mounts to prevent
  // wrong-role screens from firing API calls before useEffect-based redirect
  if (!user || user.role !== 'MOM') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
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
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="home-outline" color={color} size={size} showDot={unreadNotifications > 0} />
          ),
        }}
        listeners={{ tabPress: () => clearBadge('unreadNotifications') }}
      />
      <Tabs.Screen
        name="birth-plan"
        options={{
          title: 'Birth Plan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contraction-timer"
        options={{
          title: 'Timer',
          tabBarIcon: ({ color, size }) => (
            <Icon name="stopwatch-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          href: null,  // Hidden - accessible from home
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          href: null,  // Hidden - accessible from home
        }}
      />
      <Tabs.Screen
        name="my-team"
        options={{
          title: 'My Team',
          tabBarIcon: ({ color, size }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: null,  // Hidden - invoices accessed via messages
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <TabIconWithBadge name="mail-outline" color={color} size={size} showDot={unreadMessages > 0} />
          ),
        }}
        listeners={{ tabPress: () => clearBadge('unreadMessages') }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens accessible via navigation */}
      <Tabs.Screen
        name="share-birth-plan"
        options={{
          href: null,  // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="postpartum"
        options={{
          href: null,  // Hide from tab bar, accessible from home
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null,  // Hide from tab bar, accessible from home/my-team
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          href: null,  // Hide from tab bar, accessible from home/my-team
        }}
      />
      <Tabs.Screen
        name="weekly-tips"
        options={{
          href: null,  // Hide from tab bar, accessible from home
        }}
      />
      <Tabs.Screen
        name="birth-plan-preview"
        options={{
          href: null,  // Hide from tab bar, accessible from birth-plan
        }}
      />
      <Tabs.Screen
        name="provider-detail"
        options={{
          href: null,  // Hide from tab bar, accessible from my-team
        }}
      />
      <Tabs.Screen
        name="getting-started"
        options={{
          href: null,  // Hide from tab bar, accessible from profile
        }}
      />
      <Tabs.Screen
        name="invite-provider"
        options={{
          href: null,  // Hide from tab bar, accessible from my-team
        }}
      />
    </Tabs>
  );
}
