import { addDays, startOfDay, startOfWeek, toLocalDateInput } from './dates';
import { computeStreakWeeks } from './training';
import type { CompletedWorkout, WorkoutTemplateItem } from './types';

/*
 * The week's plan: which routine on which weekday, a reminder at a time of
 * day, and deload weeks (half the sets) to recover.
 */

export interface TrainingPlan {
  /** Index 0 = domingo … 6 = sábado: a routine id, or null for rest. */
  days: (string | null)[];
  reminder: { enabled: boolean; minute: number };
  /** Last day (YYYY-MM-DD) of the deload in progress. */
  deloadUntil: string | null;
  /** When the last deload started (YYYY-MM-DD). */
  lastDeloadAt: string | null;
  updatedAt: string;
}

export const WEEKDAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export function emptyPlan(): TrainingPlan {
  return {
    days: [null, null, null, null, null, null, null],
    reminder: { enabled: false, minute: 18 * 60 },
    deloadUntil: null,
    lastDeloadAt: null,
    updatedAt: new Date(0).toISOString(),
  };
}

/** Reads a stored plan, keeping only what makes sense. */
export function readPlan(raw: unknown): TrainingPlan {
  const plan = emptyPlan();
  if (!raw || typeof raw !== 'object') return plan;
  const value = raw as Partial<TrainingPlan>;
  if (Array.isArray(value.days))
    plan.days = plan.days.map((_, index) => {
      const day = value.days?.[index];
      return typeof day === 'string' && day ? day : null;
    });
  const minute = Number(value.reminder?.minute);
  plan.reminder = {
    enabled: value.reminder?.enabled === true,
    minute:
      Number.isInteger(minute) && minute >= 0 && minute < 1440
        ? minute
        : plan.reminder.minute,
  };
  const date = (text: unknown) =>
    typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
  plan.deloadUntil = date(value.deloadUntil);
  plan.lastDeloadAt = date(value.lastDeloadAt);
  if (typeof value.updatedAt === 'string') plan.updatedAt = value.updatedAt;
  return plan;
}

/** Today's routine in the plan, if it still exists. */
export function plannedRoutine(
  plan: TrainingPlan,
  templates: WorkoutTemplateItem[],
  now: Date = new Date(),
): WorkoutTemplateItem | null {
  const id = plan.days[now.getDay()];
  return (id && templates.find((template) => template.id === id)) || null;
}

export function deloadActive(plan: TrainingPlan, now: Date = new Date()) {
  return Boolean(plan.deloadUntil && toLocalDateInput(now) <= plan.deloadUntil);
}

/** A deload until the end of this week (Sunday). */
export function startDeload(
  plan: TrainingPlan,
  now: Date = new Date(),
): TrainingPlan {
  return {
    ...plan,
    deloadUntil: toLocalDateInput(addDays(startOfWeek(now), 6)),
    lastDeloadAt: toLocalDateInput(now),
  };
}

/** Half the working sets, at least one. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.ceil(sets / 2));
}

/**
 * After 6 weeks in a row of training with no deload in the last 6 weeks,
 * suggest one. Not while one is running.
 */
export function suggestDeload(
  history: CompletedWorkout[],
  plan: TrainingPlan,
  now: Date = new Date(),
): boolean {
  if (deloadActive(plan, now)) return false;
  if (computeStreakWeeks(history, now) < 6) return false;
  if (!plan.lastDeloadAt) return true;
  const last = new Date(`${plan.lastDeloadAt}T00:00:00`);
  return startOfDay(now).getTime() - last.getTime() >= 42 * 86_400_000;
}

/** "18:30" ↔ minutes of the day. */
export function minuteToTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function timeToMinute(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const minute = Number(match[1]) * 60 + Number(match[2]);
  return minute >= 0 && minute < 1440 ? minute : null;
}
