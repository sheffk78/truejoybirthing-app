import { create } from 'zustand';
import { apiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';
import { useAuthStore } from './authStore';

export interface BadgeCounts {
  /** Unread messages (all roles) */
  unreadMessages: number;
  /** Total unread notifications (all roles) */
  unreadNotifications: number;
  /** Provider: leads with consultation_requested status */
  newLeads: number;
  /** Provider: contracts signed by mom, awaiting provider counter-sign */
  contractsToCountersign: number;
  /** Mom: contracts sent by provider, awaiting mom signature */
  contractsToSign: number;
  /** Provider: pending birth plan share requests */
  pendingShareRequests: number;
}

interface BadgeState extends BadgeCounts {
  lastFetched: number | null;
  fetchBadges: () => Promise<void>;
  clearBadge: (key: keyof BadgeCounts) => void;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  unreadMessages: 0,
  unreadNotifications: 0,
  newLeads: 0,
  contractsToCountersign: 0,
  contractsToSign: 0,
  pendingShareRequests: 0,
  lastFetched: null,

  fetchBadges: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const isProvider = user.role === 'DOULA' || user.role === 'MIDWIFE';
    const isMom = user.role === 'MOM';

    try {
      // Always fetch unread messages + notifications
      const promises: Promise<any>[] = [
        apiRequest<{ unread_count: number }>(API_ENDPOINTS.MESSAGES_UNREAD_COUNT),
        apiRequest<{ unread_count: number; notifications: any[] }>(
          `${API_ENDPOINTS.NOTIFICATIONS}?unread_only=true`
        ),
      ];

      if (isProvider) {
        // Lead stats — consultation_requested count
        promises.push(
          apiRequest<{ consultation_requested: number }>('/leads/stats')
        );
        // Share requests — pending count
        promises.push(
          apiRequest<{ requests: any[] }>(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS)
        );
      }

      const results = await Promise.allSettled(promises);
      const [msgResult, notifResult, leadsResult, shareResult] = results;

      const unreadMessages = msgResult.status === 'fulfilled' ? msgResult.value.unread_count : 0;
      const unreadNotifications = notifResult.status === 'fulfilled'
        ? notifResult.value.unread_count
        : 0;

      const newLeads = isProvider && leadsResult?.status === 'fulfilled'
        ? leadsResult.value.consultation_requested || 0
        : 0;

      const pendingShareRequests = isProvider && shareResult?.status === 'fulfilled'
        ? (shareResult.value.requests || []).filter((r: any) => r.status === 'pending').length
        : 0;

      set({
        unreadMessages,
        unreadNotifications,
        newLeads,
        pendingShareRequests,
        // Contract badges are fetched per-screen via the contracts list;
        // these are zeroed here so stale values don't persist
        contractsToCountersign: 0,
        contractsToSign: 0,
        lastFetched: Date.now(),
      });
    } catch (error) {
      // Silently fail — badges are a nice-to-have, not critical
      console.error('Badge fetch error:', error);
    }
  },

  clearBadge: (key: keyof BadgeCounts) => {
    set({ [key]: 0 } as Partial<BadgeState>);
  },
}));