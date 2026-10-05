import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/* Keep in sync with the inline boot script in index.html. */
const STORAGE_KEY = 'forgeflow_theme';
const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#0d0f12',
  light: '#f3f4f6',
};

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? systemTheme() : preference;
}

export function applyTheme(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved]);
  return resolved;
}

const listeners = new Set<(preference: ThemePreference) => void>();

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Without storage the choice lasts for this session only.
  }
  applyTheme(preference);
  listeners.forEach((listener) => listener(preference));
}

/** Current preference, the theme actually shown, and a setter. */
export function useTheme() {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(readThemePreference()),
  );

  useEffect(() => {
    const onChange = (next: ThemePreference) => {
      setPreference(next);
      setResolved(resolveTheme(next));
    };
    listeners.add(onChange);
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onSystem = () => {
      const current = readThemePreference();
      if (current === 'system') setResolved(applyTheme('system'));
    };
    media.addEventListener('change', onSystem);
    return () => {
      listeners.delete(onChange);
      media.removeEventListener('change', onSystem);
    };
  }, []);

  return { preference, resolved, setPreference: setThemePreference };
}
