import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'theme';

export const systemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

/** Light by default: "system" only applies when the user explicitly picks it in Settings. */
export const getStoredMode = (): ThemeMode => {
  let v: string | null = null;
  try { v = localStorage.getItem(KEY); } catch { /* storage unavailable */ }
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
};

export const resolveTheme = (mode: ThemeMode): ResolvedTheme =>
  mode === 'system' ? systemTheme() : mode;

export const applyTheme = (resolved: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  root.style.background = resolved === 'dark' ? '#151210' : '#FAF4EA';
};

export const setThemeMode = (mode: ThemeMode) => {
  try { localStorage.setItem(KEY, mode); } catch { /* storage unavailable */ }
  applyTheme(resolveTheme(mode));
  window.dispatchEvent(new CustomEvent('barsafe:themechange'));
};

/** React hook — keeps components in sync with the current mode and the resolved theme. */
export const useTheme = () => {
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredMode()));

  useEffect(() => {
    const sync = () => {
      const m = getStoredMode();
      setMode(m);
      setResolved(resolveTheme(m));
    };
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onSystem = () => {
      if (getStoredMode() === 'system') {
        applyTheme(systemTheme());
        setResolved(systemTheme());
      }
    };
    window.addEventListener('barsafe:themechange', sync);
    mq.addEventListener('change', onSystem);
    return () => {
      window.removeEventListener('barsafe:themechange', sync);
      mq.removeEventListener('change', onSystem);
    };
  }, []);

  return {
    mode,
    resolved,
    setMode: (m: ThemeMode) => setThemeMode(m),
    toggle: () => setThemeMode(resolved === 'dark' ? 'light' : 'dark'),
  };
};
