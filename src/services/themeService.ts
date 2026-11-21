import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_THEME_KEY = 'sge_theme_mode';
const THEME_EVENT = 'sge_theme_changed';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getSavedThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const raw = localStorage.getItem(STORAGE_THEME_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'system') {
      return raw;
    }
  } catch {}
  return 'light';
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return getSystemTheme();
  return mode;
}

export function applyThemeToDocument(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = resolved;
    root.dataset.theme = resolved;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'dark' ? '#020617' : '#0F2942');
    }
  }
  return resolved;
}

export function setAppThemeMode(mode: ThemeMode): ResolvedTheme {
  try {
    localStorage.setItem(STORAGE_THEME_KEY, mode);
  } catch {}
  const resolved = applyThemeToDocument(mode);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { mode, resolved } }));
  }
  return resolved;
}

export function toggleAppTheme(): ResolvedTheme {
  const currentResolved = resolveTheme(getSavedThemeMode());
  const next: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
  return setAppThemeMode(next);
}

// Aplicar tema imediatamente ao carregar o módulo
if (typeof document !== 'undefined') {
  applyThemeToDocument(getSavedThemeMode());
}

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getSavedThemeMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(getSavedThemeMode()));

  useEffect(() => {
    const syncFromStore = () => {
      const saved = getSavedThemeMode();
      setThemeModeState(saved);
      setResolvedTheme(applyThemeToDocument(saved));
    };

    const handleSystemChange = () => {
      if (getSavedThemeMode() === 'system') {
        setResolvedTheme(applyThemeToDocument('system'));
      }
    };

    window.addEventListener(THEME_EVENT, syncFromStore);
    window.addEventListener('storage', syncFromStore);

    const mediaQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    }

    return () => {
      window.removeEventListener(THEME_EVENT, syncFromStore);
      window.removeEventListener('storage', syncFromStore);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      }
    };
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setResolvedTheme(setAppThemeMode(mode));
  }, []);

  const toggleDarkMode = useCallback(() => {
    const next = toggleAppTheme();
    setThemeModeState(getSavedThemeMode());
    setResolvedTheme(next);
    return next;
  }, []);

  return {
    themeMode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setThemeMode,
    toggleDarkMode
  };
}
