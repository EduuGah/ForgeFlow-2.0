import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type Accent =
  'brasa' | 'oceano' | 'floresta' | 'ametista' | 'rubi' | 'solar' | 'gelo';

/** Accent colors; the tokens live in index.css (`data-accent`). */
export const ACCENTS: { value: Accent; label: string; color: string }[] = [
  { value: 'brasa', label: 'Brasa', color: '#ff7a1a' },
  { value: 'oceano', label: 'Oceano', color: '#4c9aff' },
  { value: 'floresta', label: 'Floresta', color: '#3fcf7f' },
  { value: 'ametista', label: 'Ametista', color: '#a78bfa' },
  { value: 'rubi', label: 'Rubi', color: '#fb5677' },
  { value: 'solar', label: 'Solar', color: '#facc15' },
  { value: 'gelo', label: 'Gelo', color: '#22d3ee' },
];

/* Keep in sync with the inline boot script in index.html. */
const STORAGE_KEY = 'forgeflow_theme';
const ACCENT_KEY = 'forgeflow_accent';
const BLACK_KEY = 'forgeflow_black';
const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#0d0f12',
  light: '#f3f4f6',
};

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Without storage the choice lasts for this session only.
  }
}

export function readAccent(): Accent {
  const value = read(ACCENT_KEY);
  return ACCENTS.some((accent) => accent.value === value)
    ? (value as Accent)
    : 'brasa';
}

/** Pure black backgrounds in dark mode (OLED screens). */
export function readBlack(): boolean {
  return read(BLACK_KEY) === '1';
}

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
  const root = document.documentElement;
  root.dataset.theme = resolved;
  const accent = readAccent();
  if (accent === 'brasa') delete root.dataset.accent;
  else root.dataset.accent = accent;
  const black = readBlack();
  if (black) root.dataset.black = '';
  else delete root.dataset.black;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      resolved === 'dark' && black ? '#000000' : THEME_COLORS[resolved],
    );
  return resolved;
}

const listeners = new Set<(preference: ThemePreference) => void>();

export function setThemePreference(preference: ThemePreference) {
  write(STORAGE_KEY, preference === 'system' ? null : preference);
  applyTheme(preference);
  listeners.forEach((listener) => listener(preference));
}

export function setAccent(accent: Accent) {
  write(ACCENT_KEY, accent === 'brasa' ? null : accent);
  setThemePreference(readThemePreference());
}

export function setBlack(black: boolean) {
  write(BLACK_KEY, black ? '1' : null);
  setThemePreference(readThemePreference());
}

/** Current preference, the theme actually shown, and a setter. */
export function useTheme() {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(readThemePreference()),
  );
  const [accent, setAccentState] = useState<Accent>(readAccent);
  const [black, setBlackState] = useState(readBlack);

  useEffect(() => {
    const onChange = (next: ThemePreference) => {
      setPreference(next);
      setResolved(resolveTheme(next));
      setAccentState(readAccent());
      setBlackState(readBlack());
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

  return {
    preference,
    resolved,
    accent,
    black,
    setPreference: setThemePreference,
    setAccent,
    setBlack,
  };
}
