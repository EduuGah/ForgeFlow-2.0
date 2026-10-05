import type { CompletedSet } from './types';
import { daysBetween, parseLocalDateInput } from './dates';

const LOCALE = 'pt-BR';

const integerFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});
const decimalFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
});
const preciseFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 2,
});

export function formatNumber(
  value: number,
  fractionDigits: 0 | 1 | 2 = 1,
): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (fractionDigits === 0) return integerFormat.format(safe);
  if (fractionDigits === 2) return preciseFormat.format(safe);
  return decimalFormat.format(safe);
}

/** 7975 → "7.975"; 62.5 → "62,5" */
export function formatWeight(kg: number): string {
  return formatNumber(kg, kg >= 1000 ? 0 : 1);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${formatNumber(value / 1_000_000)} mi`;
  if (value >= 10_000) return `${formatNumber(value / 1000)} mil`;
  return formatNumber(value, 0);
}

/** 98 → "1h 38min" */
export function formatDurationMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

/** 3725 → "1:02:05"; 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

/** 90 → "1min 30s" */
export function formatRestLabel(seconds: number): string {
  if (seconds <= 0) return 'Desativado';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest}s`;
  if (rest === 0) return `${minutes}min`;
  return `${minutes}min ${rest}s`;
}

export function formatRelativeDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diff = daysBetween(date, now);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `há ${diff} dias`;
  if (diff < 14) return 'há 1 semana';
  if (diff < 31) return `há ${Math.floor(diff / 7)} semanas`;
  return formatShortDate(iso);
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date
    .toLocaleDateString(LOCALE, {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
    .replace('.', '')
    .replace(/\s+de\s+/g, ' ');
}

export function formatLongDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${formatShortDate(iso)}, ${formatTime(iso)}`;
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Deadlines are stored as YYYY-MM-DD; older goals kept free text. */
export function formatDeadline(value: string): string {
  const parsed = parseLocalDateInput(value);
  if (!parsed) return value;
  return parsed
    .toLocaleDateString(LOCALE, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '');
}

export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${formatNumber(count, 0)} ${count === 1 ? singular : plural}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Case- and accent-insensitive search key ("Tríceps" matches "triceps"). */
export function searchKey(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** "60 kg × 8", "12 reps", "7 km · 1:00:00" or "140 kg × 0" (failed attempt). */
export function formatSetResult(set: CompletedSet): string {
  const distance = set.distanceKm ?? 0;
  const seconds = set.durationSeconds ?? 0;
  if (set.repetitions <= 0 && (distance > 0 || seconds > 0)) {
    const parts: string[] = [];
    if (distance > 0) parts.push(`${formatNumber(distance, 2)} km`);
    if (seconds > 0) parts.push(formatClock(seconds));
    if (set.weightKg > 0) parts.push(`${formatWeight(set.weightKg)} kg`);
    return parts.join(' · ');
  }
  if (set.weightKg <= 0) return `${set.repetitions} reps`;
  return `${formatWeight(set.weightKg)} kg × ${set.repetitions}`;
}
