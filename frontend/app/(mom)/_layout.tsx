import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import { COLORS, SIZES } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function MomLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
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
        name="timeline"
        options={{
          title: 'Timeline',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Wellness',
          tabBarIcon: ({ color, size }) => (
            <Icon name="heart-outline" size={size} color={color} />
          ),
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
          title: 'Invoices',
          tabBarIcon: ({ color, size }) => (
            <Icon name="receipt-outline" size={size} color={color} />
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
    </Tabs>
  );
}
