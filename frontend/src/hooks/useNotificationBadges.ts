import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, Platform } from 'react-native';
import { useBadgeStore } from '../store/badgeStore';
import { useAuthStore } from '../store/authStore';

const POLL_INTERVAL = 30_000; // 30 seconds

/**
 * Polls notification + message badge counts on mount, on app focus,
 * and on a 30s interval while the app is in the foreground.
 *
 * Call this once in the root layout — it populates useBadgeStore
 * for all tab layouts and screens to read.
 */
export function useNotificationBadges() {
  const fetchBadges = useBadgeStore((s) => s.fetchBadges);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Initial fetch + interval while foregrounded
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchBadges();
    const interval = setInterval(fetchBadges, POLL_INTERVAL);

    // Re-fetch when app returns to foreground
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchBadges();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isAuthenticated, fetchBadges]);
}