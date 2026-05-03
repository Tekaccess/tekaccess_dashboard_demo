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
    let isDark = false;
    if (themeId === 'custom' && customTheme) {
      applyThemeColors(customTheme);
      isDark = isDarkBackground(customTheme.appBg);
    } else {
      const def = THEMES.find(t => t.id === themeId) ?? THEMES[0];
      applyThemeColors(def.colors);
      isDark = def.mode === 'dark';
    }
    document.documentElement.classList.toggle('dark', isDark);
  }, [themeId, customTheme]);

  const setTheme = async (id: string, customColors?: ThemeColors | null) => {
    let isDark = false;
    if (id === 'custom' && customColors) {
      applyThemeColors(customColors);
      isDark = isDarkBackground(customColors.appBg);
    } else {
      const def = THEMES.find(t => t.id === id) ?? THEMES[0];
      applyThemeColors(def.colors);
      isDark = def.mode === 'dark';
    }
    document.documentElement.classList.toggle('dark', isDark);
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

// Used for custom themes (no `mode` field) — treats sub-50% luminance as dark.
function isDarkBackground(color: string): boolean {
  const m = color.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r + g + b) / 3 < 128;
}
