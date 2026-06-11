'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeApi {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);
const STORAGE_KEY = 'vela-theme';

/**
 * Class-driven theming (doc 17 §2): toggles `.dark` on <html>. Dark mode ships day one and is the
 * default for ops boards. Persists the choice; respects OS preference on first visit.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}): ReactNode {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' &&
      localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const initial =
      stored ??
      (typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : defaultTheme);
    setThemeState(initial);
  }, [defaultTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
