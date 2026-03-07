import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';
export type ThemeName = 'LIGHT' | 'DARK';

interface ThemeState {
  themePreference: ThemePreference;
  effectiveTheme: ThemeName;
  isHydrated: boolean;
  
  // Actions
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  initializeTheme: () => Promise<void>;
  updateEffectiveTheme: () => void;
}

const THEME_STORAGE_KEY = 'theme_preference';

// Get system color scheme
const getSystemTheme = (): ThemeName => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'DARK' : 'LIGHT';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: 'SYSTEM',
  effectiveTheme: getSystemTheme(),
  isHydrated: false,
  
  setThemePreference: async (preference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      
      let effective: ThemeName;
      if (preference === 'SYSTEM') {
        effective = getSystemTheme();
      } else {
        effective = preference;
      }
      
      set({ 
        themePreference: preference, 
        effectiveTheme: effective 
      });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  },
  
  initializeTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const preference = (stored as ThemePreference) || 'SYSTEM';
      
      let effective: ThemeName;
      if (preference === 'SYSTEM') {
        effective = getSystemTheme();
      } else {
        effective = preference;
      }
      
      set({ 
        themePreference: preference, 
        effectiveTheme: effective,
        isHydrated: true 
      });
    } catch (error) {
      console.error('Error loading theme preference:', error);
      set({ isHydrated: true });
    }
  },
  
  updateEffectiveTheme: () => {
    const { themePreference } = get();
    if (themePreference === 'SYSTEM') {
      set({ effectiveTheme: getSystemTheme() });
    }
  },
}));

// Listen for system theme changes
Appearance.addChangeListener(() => {
  const store = useThemeStore.getState();
  store.updateEffectiveTheme();
});

export default useThemeStore;
