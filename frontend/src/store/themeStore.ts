import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { DARK_CORPUS_SHIPPED } from '../constants/corpusGate';

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

// Phase 2 (RESKIN-COMPLETION-PLAN-2026-09-22): until the dark designRefresh
// corpus exists (DARK_CORPUS_SHIPPED, Jeff's Option B gate), NOTHING resolves
// to DARK — not even SYSTEM on a dark-mode device — because the 18 refreshed
// screens are light-only and a dark shell around them ships broken-looking
// screens. The STORED preference is kept intact, so flipping
// corpusGate.DARK_CORPUS_SHIPPED to true restores every user's chosen
// preference instantly.
const resolveEffective = (preference: ThemePreference): ThemeName => {
  if (!DARK_CORPUS_SHIPPED) return 'LIGHT';
  if (preference === 'SYSTEM') return getSystemTheme();
  return preference;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  themePreference: 'SYSTEM',
  effectiveTheme: resolveEffective('SYSTEM'),
  isHydrated: false,
  
  setThemePreference: async (preference) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);

      const effective = resolveEffective(preference);

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

      const effective = resolveEffective(preference);

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
      set({ effectiveTheme: resolveEffective('SYSTEM') });
    }
  },
}));

// Listen for system theme changes
Appearance.addChangeListener(() => {
  const store = useThemeStore.getState();
  store.updateEffectiveTheme();
});

export default useThemeStore;
