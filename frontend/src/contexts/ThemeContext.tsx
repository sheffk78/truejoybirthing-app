import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
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
  
  // Update web document background on theme change
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const bgColor = theme.colors.background.primary;
      const textColor = theme.colors.text.primary;
      
      // Set on multiple elements to ensure coverage
      document.body.style.backgroundColor = bgColor;
      document.documentElement.style.backgroundColor = bgColor;
      
      // Add a CSS class for potential CSS-based overrides
      document.body.setAttribute('data-theme', effectiveTheme.toLowerCase());
      document.documentElement.setAttribute('data-theme', effectiveTheme.toLowerCase());
      
      // Inject CSS to override react-native-web's default gray backgrounds
      const styleId = 'theme-override-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      // CSS to override all react-native-web wrapper backgrounds
      styleElement.textContent = `
        /* Override react-native-web default backgrounds */
        html, body, #root, #root > div, #__next {
          background-color: ${bgColor} !important;
        }
        
        /* Override SafeAreaProvider wrapper */
        [data-testid="safe-area-provider"],
        div[style*="background-color: rgb(242, 242, 242)"],
        div[style*="background-color:rgb(242, 242, 242)"],
        div[style*="background: rgb(242, 242, 242)"] {
          background-color: ${bgColor} !important;
          background: ${bgColor} !important;
        }
        
        /* Target react-native-web View wrappers with gray backgrounds */
        body > div > div,
        #root > div > div {
          background-color: transparent !important;
        }
        
        /* Ensure the main themed wrapper is visible */
        #root > div > div > div[style*="flex: 1"] {
          background-color: ${bgColor} !important;
        }
        
        /* Fix for any inline gray styles */
        .r-backgroundColor-14lw9ot {
          background-color: ${bgColor} !important;
        }
        
        /* Dark mode specific text color fixes */
        ${effectiveTheme === 'DARK' ? `
          body, #root {
            color: ${textColor};
          }
        ` : ''}
      `;
    }
  }, [effectiveTheme, theme.colors.background.primary, theme.colors.text.primary]);
  
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
