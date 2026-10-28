import {
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './dates';
import { formatDurationMinutes, formatNumber, formatWeight } from './format';
import { muscleLabel, recordDate, totalsBetween } from './training';
import type {
  CompletedSet,
  CompletedWorkout,
  PersonalRecordItem,
} from './types';

/* ------------------------------------------------------------------ */
/* Best load per rep range                                             */
/* ------------------------------------------------------------------ */

export const REP_TARGETS = [1, 3, 5, 8, 10, 12] as const;

/**
 * The heaviest working set done for at least N reps, for each N: "5 reps:
 * 90 kg" means some set of 5 or more reps was done with 90 kg.
 */
export function repRangeBests(
  sessions: { sets: CompletedSet[] | null }[],
): { reps: number; weightKg: number }[] {
  const working = sessions.flatMap((session) =>
    (session.sets ?? []).filter(
      (set) =>
        set.type === 'working' && set.repetitions > 0 && set.weightKg > 0,
    ),
  );
  return REP_TARGETS.map((reps) => ({
    reps,
    weightKg: working
      .filter((set) => set.repetitions >= reps)
      .reduce((best, set) => Math.max(best, set.weightKg), 0),
  })).filter((item) => item.weightKg > 0);
}

/* ------------------------------------------------------------------ */
/* The year, day by day                                                */
/* ------------------------------------------------------------------ */

export interface YearDay {
  date: Date;
  volumeKg: number;
  workouts: number;
  /** 0 (rest) to 4 (heaviest days of the year). */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/** 53 Monday-based weeks ending this week, each with its 7 days. */
export function yearGrid(
  history: CompletedWorkout[],
  now: Date = new Date(),
): YearDay[][] {
  const byDay = new Map<number, { volumeKg: number; workouts: number }>();
  for (const workout of history) {
    const day = startOfDay(new Date(workout.completedAt)).getTime();
    const entry = byDay.get(day) ?? { volumeKg: 0, workouts: 0 };
    entry.volumeKg += workout.totalVolumeKg || 0;
    entry.workouts += 1;
    byDay.set(day, entry);
  }
  const first = addDays(startOfWeek(now), -52 * 7);
  const today = startOfDay(now).getTime();
  const days: Omit<YearDay, 'level'>[] = [];
  for (let i = 0; i < 53 * 7; i += 1) {
    const date = addDays(first, i);
    const entry = byDay.get(date.getTime());
    days.push({
      date,
      volumeKg: entry?.volumeKg ?? 0,
      workouts: entry?.workouts ?? 0,
      future: date.getTime() > today,
    });
  }
  const max = Math.max(1, ...days.map((day) => day.volumeKg));
  const weeks: YearDay[][] = [];
  days.forEach((day, index) => {
    const ratio = day.volumeKg / max;
    const level: YearDay['level'] =
      day.workouts === 0
        ? 0
        : ratio > 0.75
          ? 4
          : ratio > 0.5
            ? 3
            : ratio > 0.25
              ? 2
              : 1;
    (weeks[Math.floor(index / 7)] ??= []).push({ ...day, level });
  });
  return weeks;
}

/* ------------------------------------------------------------------ */
/* Day, week and month summaries                                       */
/* ------------------------------------------------------------------ */

export type SummaryPeriod = 'day' | 'week' | 'month';

export interface PeriodSummary {
  period: SummaryPeriod;
  title: string;
  workouts: number;
  durationMinutes: number;
  volumeKg: number;
  sets: number;
  records: number;
  topMuscle: string | null;
  topExercise: string | null;
  /** Workouts of the same span just before, for "vs anterior". */
  previousWorkouts: number;
  previousVolumeKg: number;
}

function bounds(period: SummaryPeriod, now: Date): [Date, Date, Date] {
  if (period === 'day') {
    const start = startOfDay(now);
    return [start, addDays(start, 1), addDays(start, -1)];
  }
  if (period === 'week') {
    const start = startOfWeek(now);
    return [start, addDays(start, 7), addDays(start, -7)];
  }
  const start = startOfMonth(now);
  return [start, addMonths(start, 1), addMonths(start, -1)];
}

export function periodSummary(
  history: CompletedWorkout[],
  records: PersonalRecordItem[],
  period: SummaryPeriod,
  groupOf: (exerciseId: string | undefined) => string | undefined,
  now: Date = new Date(),
): PeriodSummary {
  const [start, end, previousStart] = bounds(period, now);
  const totals = totalsBetween(history, start, end);
  const previous = totalsBetween(history, previousStart, start);
  const inPeriod = history.filter((workout) => {
    const time = Date.parse(workout.completedAt);
    return time >= start.getTime() && time < end.getTime();
  });
  const muscles = new Map<string, number>();
  const exercises = new Map<string, number>();
  for (const workout of inPeriod) {
    for (const exercise of workout.exercises) {
      const group = exercise.primaryMuscleGroup ?? groupOf(exercise.exerciseId);
      if (group)
        muscles.set(group, (muscles.get(group) ?? 0) + exercise.setsCount);
      exercises.set(
        exercise.exerciseName,
        (exercises.get(exercise.exerciseName) ?? 0) + exercise.setsCount,
      );
    }
  }
  const top = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topMuscle = top(muscles);
  return {
    period,
    title:
      period === 'day'
        ? 'Hoje'
        : period === 'week'
          ? 'Esta semana'
          : start
              .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              .replace(/^./, (letter) => letter.toUpperCase()),
    workouts: totals.workouts,
    durationMinutes: totals.durationMinutes,
    volumeKg: totals.volumeKg,
    sets: totals.sets,
    records: records.filter((record) => {
      const time = recordDate(record)?.getTime() ?? 0;
      return time >= start.getTime() && time < end.getTime();
    }).length,
    topMuscle: topMuscle ? muscleLabel(topMuscle) : null,
    topExercise: top(exercises),
    previousWorkouts: previous.workouts,
    previousVolumeKg: previous.volumeKg,
  };
}

const HEADINGS: Record<SummaryPeriod, string> = {
  day: 'Meu treino de hoje',
  week: 'Minha semana de treinos',
  month: 'Meu mês de treinos',
};

/** The summary as text for WhatsApp and friends. */
export function summaryShareText(
  summary: PeriodSummary,
  appUrl?: string,
): string {
  const lines = [
    `${HEADINGS[summary.period]} · ${summary.title}`,
    '',
    `🏋️ ${summary.workouts} ${summary.workouts === 1 ? 'treino' : 'treinos'} · ⏱️ ${formatDurationMinutes(summary.durationMinutes)}`,
    `💪 ${formatWeight(summary.volumeKg)} kg de volume · ${formatNumber(summary.sets, 0)} séries`,
  ];
  if (summary.records > 0)
    lines.push(
      `🏆 ${summary.records} ${summary.records === 1 ? 'recorde pessoal' : 'recordes pessoais'}`,
    );
  if (summary.topMuscle) lines.push(`🔥 Mais treinado: ${summary.topMuscle}`);
  if (summary.topExercise)
    lines.push(`⭐ Exercício do período: ${summary.topExercise}`);
  lines.push('', '@forgeflow');
  if (appUrl) lines.push(appUrl);
  return lines.join('\n');
}
