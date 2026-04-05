import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function NotificationPermissionScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const userRole = role || user?.role || 'MOM';

  const getDescription = () => {
    if (userRole === 'MOM') {
      return 'Enable notifications to get alerts when your care team sends you a message.';
    }
    return 'Enable notifications to get alerts when your clients send you a message.';
  };

  const getNextRoute = () => {
    switch (userRole) {
      case 'MOM':
        return '/(auth)/mom-onboarding';
      case 'DOULA':
        return '/(auth)/doula-onboarding';
      case 'MIDWIFE':
        return '/(auth)/midwife-onboarding';
      default:
        return '/(auth)/mom-onboarding';
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      if (!Device.isDevice) {
        // On simulator, just proceed
        router.replace(getNextRoute() as any);
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        // Set up Android notification channels
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#9B7BB8',
          });
          await Notifications.setNotificationChannelAsync('messages', {
            name: 'Messages',
            description: 'Notifications for new messages',
            importance: Notifications.AndroidImportance.HIGH,
            sound: 'default',
          });
        }

        // Get and register push token immediately
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId || undefined,
        });

        const token = tokenData.data;
        console.log('[Push] Token obtained during onboarding:', token.substring(0, 30) + '...');

        // Register token with backend
        try {
          await apiRequest('/push/register', {
            method: 'POST',
            body: {
              push_token: token,
              device_type: Platform.OS,
            },
          });
          console.log('[Push] Token registered during onboarding');
        } catch (err) {
          console.error('[Push] Failed to register token during onboarding:', err);
        }
      }
    } catch (err) {
      console.error('[Push] Error requesting notification permissions:', err);
    } finally {
      setIsLoading(false);
      router.replace(getNextRoute() as any);
    }
  };

  const handleSkip = () => {
    router.replace(getNextRoute() as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Bell icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="notifications" size={48} color={colors.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Never Miss a Message</Text>

        {/* Description */}
        <Text style={styles.description}>{getDescription()}</Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Icon name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
            <Text style={styles.featureText}>Get notified when you receive new messages</Text>
          </View>
          <View style={styles.featureRow}>
            <Icon name="calendar-outline" size={22} color={colors.primary} />
            <Text style={styles.featureText}>Appointment reminders and updates</Text>
          </View>
          <View style={styles.featureRow}>
            <Icon name="shield-checkmark-outline" size={22} color={colors.primary} />
            <Text style={styles.featureText}>Important care team notifications</Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Enable button */}
        <Button
          title="Enable Notifications"
          onPress={handleEnableNotifications}
          loading={isLoading}
          fullWidth
          style={styles.enableButton}
        />

        {/* Skip link */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.xl,
    paddingTop: 60,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SIZES.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.subtle || '#F9F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  description: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.xl,
    paddingHorizontal: SIZES.md,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: SIZES.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  featureText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    marginLeft: SIZES.md,
  },
  spacer: {
    flex: 1,
  },
  enableButton: {
    marginBottom: SIZES.md,
  },
  skipButton: {
    paddingVertical: SIZES.md,
    marginBottom: SIZES.lg,
  },
  skipText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}));
