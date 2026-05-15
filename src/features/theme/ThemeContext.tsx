import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'app_theme_mode';

export type Palette = {
  bg: string;
  card: string;
  border: string;
  text: string;
  sub: string;
  muted: string;
  accent: string;
  income: string;
  expense: string;
  inputBg: string;
  blue: string;
  purple: string;
  amber: string;
  cyan: string;
  transfer: string;
};

export const darkPalette: Palette = {
  bg: '#0a0a0c',
  card: '#141416',
  border: '#1e1e24',
  text: '#f0f0f5',
  sub: '#b0b0be',
  muted: '#5c5c70',
  accent: '#dc2626',
  income: '#34d399',
  expense: '#f87171',
  inputBg: '#0e0e10',
  blue: '#60a5fa',
  purple: '#a78bfa',
  amber: '#f59e0b',
  cyan: '#22d3ee',
  transfer: '#60a5fa',
};

export const lightPalette: Palette = {
  bg: '#f5f5f7',
  card: '#ffffff',
  border: '#e2e2e8',
  text: '#0f0f12',
  sub: '#4a4a5a',
  muted: '#8888a0',
  accent: '#dc2626',
  income: '#16a34a',
  expense: '#dc2626',
  inputBg: '#eeeef2',
  blue: '#2563eb',
  purple: '#7c3aed',
  amber: '#d97706',
  cyan: '#0891b2',
  transfer: '#2563eb',
};

type ThemeContextValue = {
  colors: Palette;
  isDark: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkPalette,
  isDark: true,
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((val) => {
      if (val === 'light') setIsDark(false);
    });
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      SecureStore.setItemAsync(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ colors: isDark ? darkPalette : lightPalette, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Palette {
  return useContext(ThemeContext).colors;
}

export function useThemeMode() {
  const { isDark, toggle } = useContext(ThemeContext);
  return { isDark, toggle };
}
