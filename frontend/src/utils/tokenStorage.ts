// Platform-safe session token storage: localStorage on web, SecureStore on native.
// expo-secure-store throws on web ("setValueWithKeyAsync is not a function"),
// which crashed post-login state updates and bounced web users to /welcome.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'session_token';

export const tokenStorage = {
  async getItem(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
    }
    try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
  },
  async setItem(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      try { localStorage.setItem(TOKEN_KEY, token); } catch { /* private mode */ }
      return;
    }
    try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch { /* best effort */ }
  },
  async removeItem(): Promise<void> {
    if (Platform.OS === 'web') {
      try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ }
      return;
    }
    try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* best effort */ }
  },
};