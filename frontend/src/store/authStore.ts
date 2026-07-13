import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, API_ENDPOINTS } from '../constants/api';
import { wsClient } from '../utils/websocket';
import { useSubscriptionStore } from './subscriptionStore';

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: 'MOM' | 'DOULA' | 'MIDWIFE' | 'ADMIN';
  picture?: string;
  onboarding_completed: boolean;
  tutorial_completed?: boolean;
  email_verified: boolean;
  profile?: any;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setRole: (role: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  isLoading: false,
  isAuthenticated: false,
  _hasHydrated: true, // Set to true by default - no persistence needed for web
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setSessionToken: (token) => set({ sessionToken: token }),
  setLoading: (loading) => set({ isLoading: loading }),
  setHasHydrated: (state) => set({ _hasHydrated: state }),
  
  updateUser: (userData) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...userData } });
    }
  },
  
  login: async (email, password) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_LOGIN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }
      
      const data = await response.json();
      
      // Save token to SecureStore for persistence (encrypted on device)
      await SecureStore.setItemAsync('session_token', data.session_token);
      
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          picture: data.picture,
          onboarding_completed: data.onboarding_completed,
          tutorial_completed: data.tutorial_completed ?? false,
          email_verified: data.email_verified ?? true,
        },
        sessionToken: data.session_token,
        isAuthenticated: true,
        isLoading: false,
      });

      // Fetch full profile (including mom profile data) from /auth/me
      await get().checkAuth();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  register: async (email, password, fullName, role) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_REGISTER}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
      
      // Registration now returns without a session — user must verify email first.
      // No session token to save, no user state to set.
      // The signup screen will navigate to the verification screen.
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  verifyEmail: async (email, code) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_VERIFY_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Verification failed');
      }
      
      const data = await response.json();
      
      await SecureStore.setItemAsync('session_token', data.session_token);
      
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          picture: undefined,
          onboarding_completed: data.onboarding_completed,
          tutorial_completed: data.tutorial_completed ?? false,
          email_verified: true,
        },
        sessionToken: data.session_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  resendVerification: async (email) => {
    try {
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_RESEND_VERIFICATION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to resend code');
      }
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    // 1. Disconnect WebSocket (prevents stale socket leaking data to next session)
    try {
      wsClient.disconnect();
    } catch (e) {
      // best effort
    }

    // 2. Unregister push notifications token from backend
    try {
      const pushToken = await AsyncStorage.getItem('expo_push_token');
      if (pushToken) {
        try {
          await fetch(`${API_BASE}/api/push/unregister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: pushToken }),
          });
        } catch (e) { /* best effort */ }
        await AsyncStorage.removeItem('expo_push_token');
      }
    } catch (e) {
      // best effort
    }

    // 3. Reset all user-specific Zustand stores (prevents cross-role data leak)
    try {
      useSubscriptionStore.getState().reset();
    } catch (e) {
      // best effort
    }

    // 4. Call backend logout API and clear stored session token
    try {
      const token = get().sessionToken || await SecureStore.getItemAsync('session_token');
      if (token) {
        await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_LOGOUT}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (e) {
      // Ignore logout errors
    }
    
    try {
      await SecureStore.deleteItemAsync('session_token');
    } catch (e) {
      // best effort
    }
    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
  
  deleteAccount: async () => {
    try {
      set({ isLoading: true });
      const token = get().sessionToken || await SecureStore.getItemAsync('session_token');
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_DELETE_ACCOUNT}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete account');
      }
      
      // Clear local storage and reset state
      try {
        await SecureStore.deleteItemAsync('session_token');
      } catch (e) { /* best effort */ }
      set({
        user: null,
        sessionToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      // Try to get token from store first, then from SecureStore
      let token = get().sessionToken;
      if (!token) {
        token = await SecureStore.getItemAsync('session_token');
      }
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_ME}`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        // Only delete token on auth errors (401/403), not server errors (500/503)
        // Deleting on 500 would force logout when the server has a temporary hiccup
        if (response.status === 401 || response.status === 403) {
          try {
            await SecureStore.deleteItemAsync('session_token');
          } catch (e) { /* best effort */ }
          set({ isLoading: false, isAuthenticated: false, user: null, sessionToken: null });
        } else {
          // Server error - preserve token, user may just be experiencing a transient issue
          set({ isLoading: false });
        }
        return;
      }
      
      const data = await response.json();
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          picture: data.picture,
          onboarding_completed: data.onboarding_completed,
          tutorial_completed: data.tutorial_completed ?? false,
          email_verified: data.email_verified ?? true,
          profile: data.profile,
        },
        sessionToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      // Network error - preserve token, user may be offline
      // Deleting token on network error would force logout every time the app
      // can't reach the server (airplane mode, poor signal, etc.)
      console.log('Auth check error:', error);
      set({ isLoading: false });
    }
  },
  
  setRole: async (role) => {
    try {
      const token = get().sessionToken || await SecureStore.getItemAsync('session_token');
      if (!token) throw new Error('Not authenticated');
      
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_SET_ROLE}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to set role');
      }
      
      const currentUser = get().user;
      if (currentUser) {
        set({ user: { ...currentUser, role: role as User['role'] } });
      }
    } catch (error) {
      throw error;
    }
  },
}));

export default useAuthStore;
