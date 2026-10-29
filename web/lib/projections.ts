import {
  addDays,
  addMonths,
  parseLocalDateInput,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toLocalDateInput,
} from './dates';
import { formatNumber, formatShortDate } from './format';
import {
  exerciseSessions,
  goalGoesDown,
  goalReached,
  muscleDistribution,
  totalsBetween,
  type PeriodTotals,
} from './training';
import type {
  CompletedExercise,
  CompletedWorkout,
  GoalItem,
  GoalType,
  PersonalRecordItem,
} from './types';

/*
 * Trends and forecasts: where the numbers are heading if the person keeps
 * the pace of the last weeks. Pure, so they are easy to test.
 */

const DAY = 86_400_000;

export interface Trend {
  /** Change per day. */
  slopePerDay: number;
  /** Value at time 0 (epoch), in the line's own scale. */
  intercept: number;
  /** 0..1: how well the line fits the points. */
  r2: number;
}

/** Least-squares line over (time, value); null without two distinct times. */
export function linearTrend(
  points: { time: number; value: number }[],
): Trend | null {
  if (points.length < 2) return null;
  const xs = points.map((point) => point.time / DAY);
  const ys = points.map((point) => point.value);
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slopePerDay = sxy / sxx;
  return {
    slopePerDay,
    intercept: meanY - slopePerDay * meanX,
    r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy),
  };
}

export function trendAt(trend: Trend, time: number): number {
  return trend.intercept + trend.slopePerDay * (time / DAY);
}

const roundHalf = (value: number) => Math.round(value * 2) / 2;

/** When the line reaches `target`, or null when it never will (flat/down). */
export function dateToReach(
  trend: Trend,
  target: number,
  now: number,
): Date | null {
  const current = trendAt(trend, now);
  if (current >= target) return new Date(now);
  if (!(trend.slopePerDay > 0)) return null;
  return new Date(now + ((target - current) / trend.slopePerDay) * DAY);
}

/* ------------------------------------------------------------------ */
/* Strength                                                            */
/* ------------------------------------------------------------------ */

/** What the strength chart follows per session. */
export type StrengthMetric = 'oneRepMax' | 'weight' | 'volume';

export type TrendDirection = 'up' | 'flat' | 'down';

export interface StrengthTrend {
  exerciseId: string;
  exerciseName: string;
  metric: StrengthMetric;
  /** The metric per session, oldest first. */
  sessions: { date: string; value: number }[];
  latest: number;
  best: number;
  /** Kg per month along the trend; null with fewer than 3 sessions. */
  perMonthKg: number | null;
  /** Null with fewer than 3 sessions. */
  direction: TrendDirection | null;
  /**
   * Where the line points in 4 and 12 weeks: only for load (not volume),
   * only when clearly going up and above the latest session.
   */
  projections: { weeks: number; value: number }[];
  trend: Trend | null;
}

const SESSION_VALUE: Record<
  StrengthMetric,
  (session: ReturnType<typeof exerciseSessions>[number]) => number
> = {
  oneRepMax: (session) => session.bestOneRepMax,
  weight: (session) => session.bestWeightKg,
  volume: (session) => session.volumeKg,
};

export function strengthTrend(
  history: CompletedWorkout[],
  exerciseId: string,
  exerciseName: string,
  now: Date = new Date(),
  windowDays = 180,
  metric: StrengthMetric = 'oneRepMax',
): StrengthTrend | null {
  const since = now.getTime() - windowDays * DAY;
  const read = SESSION_VALUE[metric];
  const sessions = exerciseSessions(history, exerciseId, exerciseName)
    .filter(
      (session) =>
        read(session) > 0 && Date.parse(session.completedAt) >= since,
    )
    .map((session) => ({
      date: session.completedAt,
      value: Math.round(read(session) * 10) / 10,
    }))
    .reverse();
  if (sessions.length === 0) return null;
  const trend =
    sessions.length >= 3
      ? linearTrend(
          sessions.map((session) => ({
            time: Date.parse(session.date),
            value: session.value,
          })),
        )
      : null;
  const latest = sessions[sessions.length - 1].value;
  const best = Math.max(...sessions.map((session) => session.value));
  const perMonth = trend ? trend.slopePerDay * 30 : null;
  // Smaller changes than this are noise: the lift is holding steady.
  const steady = metric === 'volume' ? latest * 0.02 : 0.25;
  const direction: TrendDirection | null =
    perMonth === null
      ? null
      : perMonth >= steady
        ? 'up'
        : perMonth <= -steady
          ? 'down'
          : 'flat';
  const base = trend ? trendAt(trend, now.getTime()) : latest;
  return {
    exerciseId,
    exerciseName,
    metric,
    sessions,
    latest,
    best,
    perMonthKg: perMonth === null ? null : Math.round(perMonth * 10) / 10,
    direction,
    projections:
      trend && direction === 'up' && metric !== 'volume'
        ? [4, 12]
            .map((weeks) => ({
              weeks,
              value: roundHalf(base + trend.slopePerDay * weeks * 7),
            }))
            .filter((item) => item.value > latest)
        : [],
    trend,
  };
}

/** Exercises worth a strength chart: most sessions in the window first. */
export function trackedLifts(
  history: CompletedWorkout[],
  now: Date = new Date(),
  windowDays = 180,
  limit = Infinity,
): { exerciseId: string; exerciseName: string; sessions: number }[] {
  const since = now.getTime() - windowDays * DAY;
  const counts = new Map<
    string,
    { exerciseId: string; exerciseName: string; sessions: number }
  >();
  for (const workout of history) {
    if (Date.parse(workout.completedAt) < since) continue;
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId || !(exercise.bestWeightKg > 0)) continue;
      const entry = counts.get(exercise.exerciseId) ?? {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        sessions: 0,
      };
      entry.sessions += 1;
      counts.set(exercise.exerciseId, entry);
    }
  }
  return [...counts.values()]
    .filter((entry) => entry.sessions >= 2)
    .sort(
      (a, b) =>
        b.sessions - a.sessions ||
        a.exerciseName.localeCompare(b.exerciseName, 'pt-BR'),
    )
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* The month                                                           */
/* ------------------------------------------------------------------ */

export interface MonthForecast {
  soFar: PeriodTotals;
  lastMonth: PeriodTotals;
  /** At this pace, by the end of the month. */
  projectedWorkouts: number;
  projectedVolumeKg: number;
  dayOfMonth: number;
  daysInMonth: number;
}

export function monthForecast(
  history: CompletedWorkout[],
  now: Date = new Date(),
): MonthForecast {
  const start = startOfMonth(now);
  const end = addMonths(start, 1);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / DAY);
  const dayOfMonth = now.getDate();
  const soFar = totalsBetween(history, start, addDays(startOfDay(now), 1));
  const pace = daysInMonth / Math.max(1, dayOfMonth);
  return {
    soFar,
    lastMonth: totalsBetween(history, addMonths(start, -1), start),
    projectedWorkouts: Math.round(soFar.workouts * pace),
    projectedVolumeKg: Math.round(soFar.volumeKg * pace),
    dayOfMonth,
    daysInMonth,
  };
}

/* ------------------------------------------------------------------ */
/* Weekly sets per muscle                                              */
/* ------------------------------------------------------------------ */

export type VolumeZone = 'low' | 'ok' | 'high';

export interface MuscleWeek {
  group: string;
  weeklySets: number;
  zone: VolumeZone;
}

/** Below 10 or above 20 working sets a week per muscle, a common guide. */
export function volumeZone(weeklySets: number): VolumeZone {
  if (weeklySets < 10) return 'low';
  if (weeklySets > 20) return 'high';
  return 'ok';
}

/** Average working sets per week for each muscle over the last `weeks`. */
export function weeklySetsByMuscle(
  history: CompletedWorkout[],
  weeks: number,
  groupOf: (exercise: CompletedExercise) => string | undefined,
  now: Date = new Date(),
): MuscleWeek[] {
  const since = addDays(startOfDay(now), -(weeks * 7 - 1));
  return muscleDistribution(history, since, groupOf).map((share) => {
    const weeklySets = Math.round((share.sets / weeks) * 10) / 10;
    return { group: share.group, weeklySets, zone: volumeZone(weeklySets) };
  });
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export interface GoalInsight {
  tone: 'good' | 'warn' | 'neutral';
  text: string;
}

const WEEK = 7 * DAY;
/** Further than this, "at this pace" stops meaning anything. */
const FAR_MS = 3 * 365 * DAY;

function amount(value: number, unit: string): string {
  return `${formatNumber(value, value < 10 ? 1 : 0)}${unit ? ` ${unit}` : ''}`;
}

/** Trend of the heaviest load per session of one exercise (180 days). */
function loadTrend(
  history: CompletedWorkout[],
  exerciseId: string,
  now: Date,
): Trend | null {
  const since = now.getTime() - 180 * DAY;
  const points = exerciseSessions(history, exerciseId, '')
    .filter(
      (session) =>
        session.bestWeightKg > 0 && Date.parse(session.completedAt) >= since,
    )
    .map((session) => ({
      time: Date.parse(session.completedAt),
      value: session.bestWeightKg,
    }));
  return points.length >= 3 ? linearTrend(points) : null;
}

/**
 * How a goal is going: the pace it needs and, when there is a trend, when it
 * gets there at the current pace. Null for reached goals.
 */
export function goalInsight(
  goal: GoalItem,
  current: number,
  context: {
    history: CompletedWorkout[];
    bodyWeights: { date: string; value: number }[];
  },
  now: Date = new Date(),
): GoalInsight | null {
  if (goal.status === 'completed' || goalReached(goal, current)) return null;
  const nowMs = now.getTime();
  const deadline = goal.deadline ? parseLocalDateInput(goal.deadline) : null;
  // Through the end of the deadline day.
  const deadlineEnd = deadline ? addDays(deadline, 1).getTime() : null;

  if (goal.type === 'frequency') {
    const weekStart = startOfWeek(now);
    const daysLeft = 7 - Math.floor((nowMs - weekStart.getTime()) / DAY);
    const missing = Math.max(0, Math.ceil(goal.targetValue - current));
    const recent =
      totalsBetween(context.history, addDays(weekStart, -28), weekStart)
        .workouts / 4;
    const word = missing === 1 ? 'treino' : 'treinos';
    if (missing > daysLeft)
      return {
        tone: 'warn',
        text: `Nesta semana não fecha mais: faltam ${missing} ${word} em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}. Bora na próxima!`,
      };
    return {
      tone: recent >= goal.targetValue ? 'good' : 'neutral',
      text: `Faltam ${missing} ${word} em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}. Sua média nas últimas 4 semanas: ${formatNumber(recent, 1)} por semana.`,
    };
  }

  let trend: Trend | null = null;
  if (goal.type === 'exercise_weight' && goal.exerciseId)
    trend = loadTrend(context.history, goal.exerciseId, now);
  if (goal.type === 'weight') {
    const since = nowMs - 90 * DAY;
    const points = context.bodyWeights
      .map((point) => ({ time: Date.parse(point.date), value: point.value }))
      .filter((point) => !Number.isNaN(point.time) && point.time >= since);
    trend = points.length >= 3 ? linearTrend(points) : null;
  }

  const down = goalGoesDown(goal);
  const remaining = Math.abs(goal.targetValue - current);
  const weeksLeft = deadlineEnd !== null ? (deadlineEnd - nowMs) / WEEK : null;
  const needed =
    weeksLeft !== null && weeksLeft > 0
      ? `${amount(remaining / weeksLeft, goal.unit)} por semana`
      : null;

  if (weeksLeft !== null && weeksLeft <= 0)
    return { tone: 'warn', text: 'O prazo passou. Que tal definir um novo?' };

  if (trend) {
    const towards = down ? -trend.slopePerDay : trend.slopePerDay;
    if (towards > 0) {
      const eta = nowMs + (remaining / towards) * DAY;
      if (eta - nowMs > FAR_MS)
        return {
          tone: 'warn',
          text: `Avançando, mas devagar demais para prever.${needed ? ` Para o prazo, precisa de ${needed}.` : ''}`,
        };
      const when = formatShortDate(new Date(eta).toISOString());
      if (deadlineEnd === null)
        return {
          tone: 'good',
          text: `No ritmo atual, você chega lá por volta de ${when}.`,
        };
      return eta <= deadlineEnd
        ? {
            tone: 'good',
            text: `No ritmo certo: chega lá por volta de ${when}, antes do prazo.`,
          }
        : {
            tone: 'warn',
            text: `No ritmo atual chega em ${when}, depois do prazo. Precisa de ${needed}.`,
          };
    }
    return {
      tone: 'warn',
      text: `Sem avanço nas últimas semanas.${needed ? ` Para o prazo, precisa de ${needed}.` : ''}`,
    };
  }

  if (needed)
    return { tone: 'neutral', text: `Para chegar no prazo: ${needed}.` };
  return null;
}

export interface GoalSuggestion {
  key: string;
  title: string;
  type: GoalType;
  targetValue: number;
  unit: string;
  exerciseId?: string;
  /** YYYY-MM-DD. */
  deadline?: string;
  why: string;
}

/**
 * Ready-made goals from the person's own numbers: one more workout a week
 * than their recent average, and about 5% more load on their main lifts in
 * 8 weeks. Skips what an active goal already covers.
 */
export function goalSuggestions(
  history: CompletedWorkout[],
  records: PersonalRecordItem[],
  goals: GoalItem[],
  now: Date = new Date(),
): GoalSuggestion[] {
  const active = goals.filter((goal) => goal.status === 'active');
  const suggestions: GoalSuggestion[] = [];

  if (history.length > 0 && !active.some((goal) => goal.type === 'frequency')) {
    const weekStart = startOfWeek(now);
    const recent =
      totalsBetween(history, addDays(weekStart, -28), weekStart).workouts / 4;
    const target = Math.max(2, Math.min(6, Math.round(recent) + 1));
    suggestions.push({
      key: 'frequency',
      title: `Treinar ${target} vezes por semana`,
      type: 'frequency',
      targetValue: target,
      unit: 'treinos/sem',
      why: `Sua média recente é ${formatNumber(recent, 1)} por semana.`,
    });
  }

  const covered = new Set(
    active
      .filter((goal) => goal.type === 'exercise_weight')
      .map((goal) => goal.exerciseId),
  );
  for (const lift of trackedLifts(history, now, 120)) {
    if (suggestions.length >= 3) break;
    if (covered.has(lift.exerciseId)) continue;
    const best = records
      .filter(
        (record) =>
          record.exerciseId === lift.exerciseId && record.type === 'weight',
      )
      .reduce((max, record) => Math.max(max, record.value), 0);
    if (!(best > 0)) continue;
    const target = Math.max(best + 2.5, Math.round((best * 1.05) / 2.5) * 2.5);
    suggestions.push({
      key: `lift-${lift.exerciseId}`,
      title: `${lift.exerciseName} com ${formatNumber(target)} kg`,
      type: 'exercise_weight',
      targetValue: target,
      unit: 'kg',
      exerciseId: lift.exerciseId,
      deadline: toLocalDateInput(addDays(now, 56)),
      why: `Seu recorde é ${formatNumber(best)} kg. Meta para 8 semanas.`,
    });
  }
  return suggestions;
}

/* ------------------------------------------------------------------ */
/* Body weight                                                         */
/* ------------------------------------------------------------------ */

export interface WeightTrend {
  perWeekKg: number;
  in4Weeks: number;
}

/** Kg per week over the last `windowDays` of weigh-ins (3 or more). */
export function weightTrend(
  series: { date: string; value: number }[],
  now: Date = new Date(),
  windowDays = 90,
): WeightTrend | null {
  const since = now.getTime() - windowDays * DAY;
  const points = series
    .map((point) => ({ time: Date.parse(point.date), value: point.value }))
    .filter((point) => !Number.isNaN(point.time) && point.time >= since);
  if (points.length < 3) return null;
  const trend = linearTrend(points);
  if (!trend) return null;
  const current = trendAt(trend, now.getTime());
  return {
    perWeekKg: Math.round(trend.slopePerDay * 7 * 100) / 100,
    in4Weeks: Math.round((current + trend.slopePerDay * 28) * 10) / 10,
  };
}
