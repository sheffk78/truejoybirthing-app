import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, API_ENDPOINTS } from '../constants/api';

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: 'MOM' | 'DOULA' | 'MIDWIFE' | 'ADMIN';
  picture?: string;
  onboarding_completed: boolean;
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
  loginWithGoogle: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
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
      
      // Save token to AsyncStorage for persistence
      await AsyncStorage.setItem('session_token', data.session_token);
      
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: (data.role || '').toUpperCase() as User['role'],
          picture: data.picture,
          onboarding_completed: data.onboarding_completed,
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
      
      const data = await response.json();
      
      // Save token to AsyncStorage for persistence
      await AsyncStorage.setItem('session_token', data.session_token);
      
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: (data.role || '').toUpperCase() as User['role'],
          picture: null,
          onboarding_completed: false,
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
  
  loginWithGoogle: async (sessionId) => {
    try {
      set({ isLoading: true });
      const response = await fetch(`${API_BASE}${API_ENDPOINTS.AUTH_GOOGLE_SESSION}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Google login failed');
      }
      
      const data = await response.json();
      
      await AsyncStorage.setItem('session_token', data.session_token);
      
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: (data.role || '').toUpperCase() as User['role'],
          picture: data.picture,
          onboarding_completed: data.onboarding_completed,
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
  
  logout: async () => {
    try {
      const token = get().sessionToken || await AsyncStorage.getItem('session_token');
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
    
    await AsyncStorage.removeItem('session_token');
    set({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
  
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      // Try to get token from store first, then from AsyncStorage
      let token = get().sessionToken;
      if (!token) {
        token = await AsyncStorage.getItem('session_token');
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
        await AsyncStorage.removeItem('session_token');
        set({ isLoading: false, isAuthenticated: false, user: null, sessionToken: null });
        return;
      }
      
      const data = await response.json();
      set({
        user: {
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: (data.role || '').toUpperCase() as User['role'],
          picture: data.picture,
          onboarding_completed: data.onboarding_completed,
          profile: data.profile,
        },
        sessionToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.log('Auth check error:', error);
      await AsyncStorage.removeItem('session_token');
      set({ isLoading: false, isAuthenticated: false, user: null, sessionToken: null });
    }
  },
  
  setRole: async (role) => {
    try {
      const token = get().sessionToken || await AsyncStorage.getItem('session_token');
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
        set({ user: { ...currentUser, role: role.toUpperCase() as User['role'] } });
      }
    } catch (error) {
      throw error;
    }
  },
}));

export default useAuthStore;
