/**
 * Push Notifications Hook for True Joy Birthing
 *
 * Handles push notification registration, permission requests,
 * and notification event handling using Expo Push Notifications.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { apiRequest } from '../utils/api';
import { useAuthStore } from '../store/authStore';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  permissionStatus: Notifications.PermissionStatus | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Register push token with backend
  const registerTokenWithBackend = useCallback(async (token: string): Promise<boolean> => {
    if (!isAuthenticated) {
      console.log('[Push] User not authenticated, skipping token registration');
      return false;
    }

    try {
      const deviceType = Platform.OS;
      await apiRequest('/push/register', {
        method: 'POST',
        body: {
          push_token: token,
          device_type: deviceType,
        },
      });
      console.log('[Push] Token registered with backend successfully');
      return true;
    } catch (err) {
      console.error('[Push] Failed to register token with backend:', err);
      return false;
    }
  }, [isAuthenticated]);

  // Request notification permissions and get push token
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if this is a physical device
      if (!Device.isDevice) {
        console.log('[Push] Must use physical device for push notifications');
        setError('Push notifications require a physical device');
        setIsLoading(false);
        return null;
      }

      // Get current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      setPermissionStatus(existingStatus);

      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        setPermissionStatus(status);
      }

      if (finalStatus !== 'granted') {
        console.log('[Push] Failed to get push notification permissions');
        setError('Notification permissions not granted');
        setIsLoading(false);
        return null;
      }

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#9B7BB8', // Primary purple color
        });

        // Create channel for messages
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          description: 'Notifications for new messages',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });

        // Create channel for appointments
        await Notifications.setNotificationChannelAsync('appointments', {
          name: 'Appointments',
          description: 'Reminders and updates about appointments',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        });
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.log('[Push] No EAS project ID found, using fallback');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      const token = tokenData.data;
      console.log('[Push] Expo push token:', token.substring(0, 30) + '...');

      setExpoPushToken(token);

      // Register with backend
      const registered = await registerTokenWithBackend(token);
      setIsRegistered(registered);

      setIsLoading(false);
      return token;

    } catch (err) {
      console.error('[Push] Error registering for push notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to register for push notifications');
      setIsLoading(false);
      return null;
    }
  }, [registerTokenWithBackend]);

  // Refresh push token (re-register on app launch if permissions granted)
  const refreshPushToken = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      if (!Device.isDevice) return;

      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      const token = tokenData.data;
      setExpoPushToken(token);

      // Re-register with backend (tokens can rotate)
      const registered = await registerTokenWithBackend(token);
      setIsRegistered(registered);
      console.log('[Push] Token refreshed on app launch');
    } catch (err) {
      console.error('[Push] Error refreshing push token:', err);
    }
  }, [isAuthenticated, registerTokenWithBackend]);

  // Unregister push token
  const unregisterPushNotifications = useCallback(async () => {
    if (!expoPushToken) return;

    try {
      await apiRequest('/push/unregister', {
        method: 'POST',
        body: {
          push_token: expoPushToken,
        },
      });
      setIsRegistered(false);
      console.log('[Push] Token unregistered');
    } catch (err) {
      console.error('[Push] Failed to unregister token:', err);
    }
  }, [expoPushToken]);

  // Check push notification status
  const checkPushStatus = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const status = await apiRequest<{ has_push_enabled: boolean; active_devices: number }>('/push/status');
      setIsRegistered(status.has_push_enabled);
    } catch (err) {
      console.error('[Push] Failed to check push status:', err);
    }
  }, [isAuthenticated]);

  // Initialize on mount and user change
  useEffect(() => {
    if (isAuthenticated && user?.user_id) {
      // Refresh push token on app launch (handles token rotation)
      refreshPushToken();

      // Set up notification listeners
      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        console.log('[Push] Notification received:', notification.request.content.title);
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('[Push] User responded to notification:', response.notification.request.content.data);
        // Handle notification tap - navigate to relevant screen
        const data = response.notification.request.content.data as Record<string, any>;
        handleNotificationResponse(data, user.role);
      });
    }

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated, user?.user_id, refreshPushToken]);

  return {
    expoPushToken,
    notification,
    permissionStatus,
    isRegistered,
    isLoading,
    error,
    registerForPushNotifications,
    unregisterPushNotifications,
    checkPushStatus,
    refreshPushToken,
  };
}

// Handle notification tap - navigate to relevant screen
function handleNotificationResponse(data: Record<string, any>, userRole?: string) {
  const notificationType = data.notification_type || data.type;
  const conversationId = data.conversationId;

  // Determine the correct route prefix based on user role
  const getRolePrefix = () => {
    switch (userRole) {
      case 'DOULA': return '(doula)';
      case 'MIDWIFE': return '(midwife)';
      case 'MOM':
      default: return '(mom)';
    }
  };

  const rolePrefix = getRolePrefix();

  switch (notificationType) {
    case 'message':
      if (conversationId) {
        // Navigate to the specific conversation
        router.push(`/${rolePrefix}/messages?userId=${conversationId}` as any);
      } else {
        router.push(`/${rolePrefix}/messages` as any);
      }
      break;
    case 'appointment':
    case 'appointment_request':
    case 'appointment_accepted':
    case 'appointment_declined':
      router.push(`/${rolePrefix}/appointments` as any);
      break;
    case 'contract':
    case 'contract_signed':
      router.push(`/${rolePrefix}/contracts` as any);
      break;
    case 'invoice':
    case 'payment':
      router.push(`/${rolePrefix}/invoices` as any);
      break;
    case 'team_invite':
    case 'team_accepted':
      if (userRole === 'MOM') {
        router.push(`/${rolePrefix}/my-team` as any);
      } else {
        router.push(`/${rolePrefix}/clients` as any);
      }
      break;
    default:
      router.push(`/${rolePrefix}/messages` as any);
  }
}

export default usePushNotifications;
