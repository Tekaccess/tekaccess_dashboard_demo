import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { THEMES, applyThemeColors, type ThemeColors } from '../lib/themes';

interface ThemeContextValue {
  currentThemeId: string;
  setTheme: (id: string, customColors?: ThemeColors | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentThemeId: 'default',
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateTheme } = useAuth();

  const themeId = user?.preferences?.theme ?? 'default';
  const customTheme = user?.preferences?.customTheme ?? null;

  useEffect(() => {
    document.documentElement.classList.remove('dark');

    if (themeId === 'custom' && customTheme) {
      applyThemeColors(customTheme);
    } else {
      const def = THEMES.find(t => t.id === themeId) ?? THEMES[0];
      applyThemeColors(def.colors);
    }
  }, [themeId, customTheme]);

  const setTheme = async (id: string, customColors?: ThemeColors | null) => {
    // Apply immediately for instant visual feedback.
    if (id === 'custom' && customColors) {
      applyThemeColors(customColors);
    } else {
      const def = THEMES.find(t => t.id === id) ?? THEMES[0];
      applyThemeColors(def.colors);
    }
    await updateTheme(id, customColors ?? null);
  };

  return (
    <ThemeContext.Provider value={{ currentThemeId: themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
