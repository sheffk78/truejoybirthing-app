import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, API_ENDPOINTS } from '../constants/api';

export interface SubscriptionStatus {
  has_pro_access: boolean;
  subscription_status: 'none' | 'trial' | 'active' | 'expired' | 'cancelled' | 'free';
  plan_type: string | null;
  trial_end_date: string | null;
  days_remaining: number | null;
  is_trial: boolean;
  is_mom: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  trial_days: number;
  savings?: number;
  features: string[];
}

export interface PricingInfo {
  plans: PricingPlan[];
  mom_features: string[];
}

interface SubscriptionState {
  status: SubscriptionStatus | null;
  pricing: PricingInfo | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStatus: () => Promise<void>;
  fetchPricing: () => Promise<void>;
  startTrial: (planType: string) => Promise<void>;
  activateSubscription: (planType: string) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  hasProAccess: () => boolean;
  isMom: () => boolean;
}

const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('session_token');
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  status: null,
  pricing: null,
  isLoading: false,
  error: null,
  
  fetchStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = await getAuthToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_STATUS}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const data = await response.json();
      set({ status: data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },
  
  fetchPricing: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_PRICING}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }
      
      const data = await response.json();
      set({ pricing: data, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
    }
  },
  
  startTrial: async (planType: string) => {
    try {
      set({ isLoading: true, error: null });
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_START_TRIAL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ plan_type: planType }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start trial');
      }
      
      // Refresh status after starting trial
      await get().fetchStatus();
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  activateSubscription: async (planType: string) => {
    try {
      set({ isLoading: true, error: null });
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_ACTIVATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ plan_type: planType }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to activate subscription');
      }
      
      // Refresh status after activation
      await get().fetchStatus();
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  cancelSubscription: async () => {
    try {
      set({ isLoading: true, error: null });
      const token = await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.SUBSCRIPTION_CANCEL}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to cancel subscription');
      }
      
      // Refresh status after cancellation
      await get().fetchStatus();
    } catch (error: any) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
  
  hasProAccess: () => {
    const status = get().status;
    if (!status) return false;
    return status.has_pro_access;
  },
  
  isMom: () => {
    const status = get().status;
    if (!status) return false;
    return status.is_mom;
  },
}));

export default useSubscriptionStore;
