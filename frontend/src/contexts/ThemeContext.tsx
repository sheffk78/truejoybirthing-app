import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useThemeStore, ThemePreference, ThemeName } from '../store/themeStore';
import { Theme, getTheme } from '../constants/themeTokens';

// ============================================
// THEME CONTEXT TYPE
// ============================================

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  isDark: boolean;
}

// ============================================
// CONTEXT
// ============================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Use individual selectors to ensure re-renders on state changes
  const themePreference = useThemeStore((state) => state.themePreference);
  const effectiveTheme = useThemeStore((state) => state.effectiveTheme);
  const isHydrated = useThemeStore((state) => state.isHydrated);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const setThemePreference = useThemeStore((state) => state.setThemePreference);

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Get the full theme object based on effective theme
  const theme = getTheme(effectiveTheme);
  
  const value: ThemeContextType = {
    theme,
    themeName: effectiveTheme,
    themePreference,
    setThemePreference,
    isDark: effectiveTheme === 'DARK',
  };

  // Render children even while hydrating to avoid flash
  // Theme will just use default (SYSTEM -> detected) initially
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// ============================================
// CONVENIENCE HOOKS
// ============================================

// Hook to get just the colors
export const useThemeColors = () => {
  const { theme } = useTheme();
  return theme.colors;
};

// Hook to get just the shadows
export const useThemeShadows = () => {
  const { theme } = useTheme();
  return theme.shadows;
};

// Hook to check if dark mode
export const useIsDarkMode = () => {
  const { isDark } = useTheme();
  return isDark;
};

export default ThemeContext;
