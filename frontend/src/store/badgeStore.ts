import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../utils/api';
import { API_ENDPOINTS } from '../constants/api';
import { useAuthStore } from './authStore';
import { useSubscriptionStore } from './subscriptionStore';

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
  /** Mom: pending birth plan share requests (sent to providers, not yet accepted) */
  pendingBirthPlanShares: number;
  /** Mom: new team members since last visit to My Team tab */
  newTeamMembers: number;
  /** Provider: subscription expiring soon (≤7 days remaining) */
  subscriptionExpiring: number;
}

interface BadgeState extends BadgeCounts {
  lastFetched: number | null;
  fetchBadges: () => Promise<void>;
  clearBadge: (key: keyof BadgeCounts) => void;
}

const SEEN_TEAM_KEY = 'badge:seen_team_members';

export const useBadgeStore = create<BadgeState>((set) => ({
  unreadMessages: 0,
  unreadNotifications: 0,
  newLeads: 0,
  contractsToCountersign: 0,
  contractsToSign: 0,
  pendingShareRequests: 0,
  pendingBirthPlanShares: 0,
  newTeamMembers: 0,
  subscriptionExpiring: 0,
  lastFetched: null,

  fetchBadges: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const isProvider = user.role === 'DOULA' || user.role === 'MIDWIFE' || user.role === 'LACTATION';
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

      if (isMom) {
        // Birth plan share requests (mom sent to providers)
        promises.push(
          apiRequest<{ requests: any[] }>(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS)
        );
        // Team members — endpoint returns a flat array, not { team: [...] }
        promises.push(
          apiRequest<any[]>(API_ENDPOINTS.MOM_TEAM)
        );
      }

      const results = await Promise.allSettled(promises);
      // Indexes: 0=messages, 1=notifications, then conditional
      let idx = 2;
      const msgResult = results[0];
      const notifResult = results[1];
      const leadsResult = isProvider ? results[idx++] : null;
      const shareResult = isProvider ? results[idx++] : null;
      const birthPlanShareResult = isMom ? results[idx++] : null;
      const teamResult = isMom ? results[idx++] : null;

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

      const pendingBirthPlanShares = isMom && birthPlanShareResult?.status === 'fulfilled'
        ? (birthPlanShareResult.value.requests || []).filter(
            (r: any) => r.status === 'pending'
          ).length
        : 0;

      // Team: compare against seen member IDs in AsyncStorage
      let newTeamMembers = 0;
      if (isMom && teamResult?.status === 'fulfilled') {
        // /mom/team returns a flat array of team member objects
        const team = Array.isArray(teamResult.value) ? teamResult.value : [];
        const memberIds = team.map((m: any) => m.provider_id || m.user_id).filter(Boolean);
        try {
          const seenRaw = await AsyncStorage.getItem(SEEN_TEAM_KEY);
          const seenIds = seenRaw ? JSON.parse(seenRaw) as string[] : [];
          const newIds = memberIds.filter((id: string) => !seenIds.includes(id));
          newTeamMembers = newIds.length;
        } catch {
          newTeamMembers = 0;
        }
      }

      // Subscription expiring: read from subscriptionStore (already fetched on app load)
      let subscriptionExpiring = 0;
      if (isProvider) {
        const subState = useSubscriptionStore.getState();
        const status = subState.status;
        if (status && status.has_pro_access) {
          const days = status.days_remaining;
          if (days !== null && days <= 7 && days >= 0) {
            subscriptionExpiring = 1;
          }
        }
      }

      set({
        unreadMessages,
        unreadNotifications,
        newLeads,
        pendingShareRequests,
        pendingBirthPlanShares,
        newTeamMembers,
        subscriptionExpiring,
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

    // For newTeamMembers, persist the current team as "seen" so it doesn't re-trigger
    if (key === 'newTeamMembers') {
      (async () => {
        try {
          const { user } = useAuthStore.getState();
          if (!user || user.role !== 'MOM') return;
          // /mom/team returns a flat array
          const team = await apiRequest<any[]>(API_ENDPOINTS.MOM_TEAM);
          const memberIds = (Array.isArray(team) ? team : [])
            .map((m: any) => m.provider_id || m.user_id)
            .filter(Boolean);
          await AsyncStorage.setItem(SEEN_TEAM_KEY, JSON.stringify(memberIds));
        } catch {
          // Non-critical
        }
      })();
    }
  },
}));