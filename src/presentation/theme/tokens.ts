import type { TextStyle } from 'react-native';

export const colors = {
  accent: '#146C5F',
  background: '#F7F7F2',
  border: '#D9DED6',
  danger: '#B43B3B',
  ink: '#161917',
  surface: '#FFFFFF',
  success: '#8BC6A3',
  successSoft: '#E7F5EC',
  successText: '#146C45',
  text: '#161917',
  textMuted: '#56615C',
  textSubtle: '#7A817D',
  warning: '#B46B2A',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
} as const;

export const radius = {
  full: 999,
  md: 8,
} as const;

export const typography = {
  body: {
    fontSize: 16,
    lineHeight: 23,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
} satisfies Record<string, TextStyle>;
