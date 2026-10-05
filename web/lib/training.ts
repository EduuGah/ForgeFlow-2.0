import { calculateEstimatedOneRepMax } from '../../src/domain/training/personalRecords';
import {
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  startOfWeek,
  timestampFromLegacyId,
} from './dates';
import type {
  ActiveExerciseSession,
  ActiveWorkoutState,
  CompletedExercise,
  CompletedSet,
  CompletedWorkout,
  GoalItem,
  HydrationLog,
  MealItem,
  PersonalRecordItem,
  PersonalRecordType,
  SetEntry,
  WorkoutTemplateItem,
} from './types';

/* ------------------------------------------------------------------ */
/* Catalog vocabulary                                                  */
/* ------------------------------------------------------------------ */

export const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Biceps',
  'Triceps',
  'Core',
];

const MUSCLE_LABELS: Record<string, string> = {
  Abdomen: 'Abdômen',
  Antebracos: 'Antebraços',
  Biceps: 'Bíceps',
  Gluteos: 'Glúteos',
  Quadriceps: 'Quadríceps',
  Trapezio: 'Trapézio',
  Triceps: 'Tríceps',
};

const MUSCLE_CODES: Record<string, string> = {
  Peito: 'PEI',
  Costas: 'COS',
  Pernas: 'PER',
  Ombros: 'OMB',
  Biceps: 'BÍC',
  Triceps: 'TRÍ',
  Core: 'CORE',
  Cardio: 'CAR',
};

export function muscleLabel(group: string | null | undefined): string {
  if (!group) return 'Geral';
  return MUSCLE_LABELS[group] ?? group;
}

/** Short stamped code used on exercise "plates". */
export function muscleCode(group: string | null | undefined): string {
  if (!group) return 'FF';
  return MUSCLE_CODES[group] ?? group.slice(0, 3).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Sets & sessions                                                     */
/* ------------------------------------------------------------------ */

export function isCountedSet(
  set: Pick<SetEntry, 'setType' | 'completed' | 'repetitions'>,
): boolean {
  return set.completed && set.setType === 'working' && set.repetitions > 0;
}

export function setVolume(set: {
  weightKg: number;
  repetitions: number;
}): number {
  return Math.max(0, set.weightKg) * Math.max(0, set.repetitions);
}

export function estimateOneRepMax(
  weightKg: number,
  repetitions: number,
): number {
  return calculateEstimatedOneRepMax({ weightKg, repetitions });
}

/** Set labels: warm-ups show "A" (aquecimento), working sets are numbered 1..n. */
export function setLabels(sets: Pick<SetEntry, 'setType'>[]): string[] {
  let working = 0;
  return sets.map((set) => {
    if (set.setType === 'warmup') return 'A';
    working += 1;
    return String(working);
  });
}

export interface LiveSummary {
  volumeKg: number;
  completedSets: number;
  totalSets: number;
  repetitions: number;
}

export function summarizeActiveWorkout(
  active: ActiveWorkoutState | null,
): LiveSummary {
  const summary: LiveSummary = {
    volumeKg: 0,
    completedSets: 0,
    totalSets: 0,
    repetitions: 0,
  };
  if (!active) return summary;
  for (const exercise of active.exercises) {
    for (const set of exercise.sets) {
      summary.totalSets += 1;
      if (isCountedSet(set)) {
        summary.completedSets += 1;
        summary.volumeKg += setVolume(set);
        summary.repetitions += set.repetitions;
      }
    }
  }
  return summary;
}

export function countPendingSets(active: ActiveWorkoutState | null): number {
  if (!active) return 0;
  return active.exercises.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => !set.completed).length,
    0,
  );
}

export function buildCompletedWorkout(
  active: ActiveWorkoutState,
  now: Date,
  id: string,
): CompletedWorkout {
  const startedAt = new Date(active.startedAt);
  const durationMinutes = Math.max(
    1,
    Math.round((now.getTime() - startedAt.getTime()) / 60000),
  );

  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;

  const exercises: CompletedExercise[] = active.exercises
    .map((exercise: ActiveExerciseSession) => {
      const done = exercise.sets.filter(
        (set) => set.completed && set.repetitions > 0,
      );
      const working = done.filter((set) => set.setType === 'working');
      const volume = working.reduce((sum, set) => sum + setVolume(set), 0);
      totalVolumeKg += volume;
      totalSets += working.length;
      totalReps += working.reduce((sum, set) => sum + set.repetitions, 0);

      const completed: CompletedExercise = {
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        setsCount: working.length,
        bestWeightKg: working.reduce(
          (best, set) => Math.max(best, set.weightKg),
          0,
        ),
        totalVolumeKg: volume,
        sets: done.map((set) => ({
          type: set.setType,
          weightKg: set.weightKg,
          repetitions: set.repetitions,
        })),
      };
      const notes = exercise.notes?.trim();
      if (notes) completed.notes = notes;
      return completed;
    })
    .filter((exercise) => (exercise.sets?.length ?? 0) > 0);

  const workout: CompletedWorkout = {
    id,
    name: active.name.trim() || 'Treino',
    startedAt: active.startedAt,
    completedAt: now.toISOString(),
    durationMinutes,
    totalVolumeKg,
    totalSets,
    totalReps,
    exercises,
    prsAchieved: [],
  };
  if (active.templateId) workout.templateId = active.templateId;
  return workout;
}

/* ------------------------------------------------------------------ */
/* Personal records                                                    */
/* ------------------------------------------------------------------ */

export const RECORD_LABELS: Record<PersonalRecordType, string> = {
  weight: 'Maior peso',
  estimated_1rm: 'Melhor 1RM',
  volume: 'Melhor série (volume)',
  repetitions: 'Mais repetições',
};

const TRACKED_RECORDS: PersonalRecordType[] = [
  'weight',
  'estimated_1rm',
  'volume',
];

export function recordDate(record: PersonalRecordItem): Date | null {
  if (record.achievedAt) return new Date(record.achievedAt);
  const parsed = new Date(record.date);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const legacy = timestampFromLegacyId(record.id);
  return legacy ? new Date(legacy) : null;
}

export interface RecordDetection {
  /** Updated record list: one entry per exercise + type. */
  records: PersonalRecordItem[];
  achieved: PersonalRecordItem[];
  /** Ids of superseded records stored under a different (legacy) id. */
  replacedIds: string[];
}

/**
 * A record is new when it beats the previous best for the same exercise and
 * type (the first logged value is a record too, as in the domain rules).
 * Only completed working sets count.
 */
export function detectPersonalRecords(
  workout: CompletedWorkout,
  existing: PersonalRecordItem[],
): RecordDetection {
  const records = [...existing];
  const achieved: PersonalRecordItem[] = [];
  const replacedIds: string[] = [];

  for (const exercise of workout.exercises) {
    if (!exercise.exerciseId || !exercise.sets) continue;
    const working = exercise.sets.filter(
      (set) => set.type === 'working' && set.repetitions > 0,
    );
    if (working.length === 0) continue;

    const candidates: Record<PersonalRecordType, number> = {
      weight: Math.max(...working.map((set) => set.weightKg)),
      estimated_1rm: Math.max(
        ...working.map((set) =>
          estimateOneRepMax(set.weightKg, set.repetitions),
        ),
      ),
      volume: Math.max(...working.map(setVolume)),
      repetitions: 0,
    };

    for (const type of TRACKED_RECORDS) {
      const value = candidates[type];
      if (!(value > 0)) continue;
      const index = records.findIndex(
        (record) =>
          record.exerciseId === exercise.exerciseId && record.type === type,
      );
      const previous = index === -1 ? undefined : records[index];
      if (previous && value <= previous.value) continue;

      const record: PersonalRecordItem = {
        id: recordId(exercise.exerciseId, type),
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        type,
        value: Math.round(value * 10) / 10,
        unit: 'kg',
        date: workout.completedAt,
        achievedAt: workout.completedAt,
        workoutId: workout.id,
      };
      if (index === -1) records.unshift(record);
      else records.splice(index, 1, record);
      if (previous && previous.id !== record.id) replacedIds.push(previous.id);
      achieved.push(record);
    }
  }

  return { records, achieved, replacedIds };
}

/**
 * One document per exercise + record type, so a new record overwrites the
 * previous best instead of piling up stale documents in the cloud.
 */
export function recordId(exerciseId: string, type: PersonalRecordType): string {
  return `pr-${exerciseId}-${type}`;
}

/** Keeps only the best record per exercise + type (legacy data had duplicates). */
export function dedupeRecords(
  records: PersonalRecordItem[],
): PersonalRecordItem[] {
  const best = new Map<string, PersonalRecordItem>();
  for (const record of records) {
    const key = `${record.exerciseId}|${record.type}`;
    const current = best.get(key);
    if (!current || record.value > current.value) best.set(key, record);
  }
  return [...best.values()].sort(
    (a, b) => (recordDate(b)?.getTime() ?? 0) - (recordDate(a)?.getTime() ?? 0),
  );
}

/**
 * Replays the whole history in order, so records reflect every workout even
 * when older sessions arrive later (history import). Workouts without per-set
 * data cannot be replayed and keep what they had.
 */
export function replayRecords(history: CompletedWorkout[]): {
  records: PersonalRecordItem[];
  achievedByWorkout: Map<string, PersonalRecordItem[]>;
} {
  const ordered = [...history].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );
  let records: PersonalRecordItem[] = [];
  const achievedByWorkout = new Map<string, PersonalRecordItem[]>();
  for (const workout of ordered) {
    if (!workout.exercises.some((exercise) => exercise.sets)) continue;
    const detection = detectPersonalRecords(workout, records);
    records = detection.records;
    achievedByWorkout.set(workout.id, detection.achieved);
  }
  return { records, achievedByWorkout };
}

export function describeRecord(record: PersonalRecordItem): string {
  return `${record.exerciseName}: ${RECORD_LABELS[record.type]} ${formatKgPlain(record.value)} kg`;
}

function formatKgPlain(value: number): string {
  return String(Math.round(value * 10) / 10).replace('.', ',');
}

/* ------------------------------------------------------------------ */
/* Dates of logs                                                       */
/* ------------------------------------------------------------------ */

export function hydrationDate(log: HydrationLog): Date | null {
  if (log.loggedAt) return new Date(log.loggedAt);
  const legacy = timestampFromLegacyId(log.id);
  return legacy ? new Date(legacy) : null;
}

export function mealDate(meal: MealItem): Date | null {
  if (meal.loggedAt) return new Date(meal.loggedAt);
  const legacy = timestampFromLegacyId(meal.id);
  return legacy ? new Date(legacy) : null;
}

export function itemsOnDay<T>(
  items: T[],
  getDate: (item: T) => Date | null,
  day: Date,
): T[] {
  const start = startOfDay(day).getTime();
  const end = addDays(startOfDay(day), 1).getTime();
  return items.filter((item) => {
    const date = getDate(item);
    if (!date) return false;
    const time = date.getTime();
    return time >= start && time < end;
  });
}

/* ------------------------------------------------------------------ */
/* Consistency & aggregates                                            */
/* ------------------------------------------------------------------ */

function completedTime(workout: CompletedWorkout): number {
  return new Date(workout.completedAt).getTime();
}

export function sortByCompletedDesc(
  history: CompletedWorkout[],
): CompletedWorkout[] {
  return [...history].sort((a, b) => completedTime(b) - completedTime(a));
}

/**
 * Consecutive Monday-based weeks with at least one workout. The current week
 * does not break the streak while it is still in progress.
 */
export function computeStreakWeeks(
  history: CompletedWorkout[],
  now: Date = new Date(),
): number {
  const trainedWeeks = new Set(
    history.map((w) => startOfWeek(new Date(w.completedAt)).getTime()),
  );
  let cursor = startOfWeek(now);
  if (!trainedWeeks.has(cursor.getTime())) cursor = addDays(cursor, -7);
  let streak = 0;
  while (trainedWeeks.has(cursor.getTime())) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/** Monday..Sunday flags for the current week. */
export function weekTrainingDays(
  history: CompletedWorkout[],
  now: Date = new Date(),
): boolean[] {
  const start = startOfWeek(now);
  const days = Array.from({ length: 7 }, () => false);
  for (const workout of history) {
    const date = new Date(workout.completedAt);
    const diff = Math.floor(
      (startOfDay(date).getTime() - start.getTime()) / 86_400_000,
    );
    if (diff >= 0 && diff < 7) days[diff] = true;
  }
  return days;
}

export interface PeriodTotals {
  workouts: number;
  durationMinutes: number;
  volumeKg: number;
  sets: number;
  repetitions: number;
}

export function totalsBetween(
  history: CompletedWorkout[],
  start: Date,
  end: Date,
): PeriodTotals {
  const totals: PeriodTotals = {
    workouts: 0,
    durationMinutes: 0,
    volumeKg: 0,
    sets: 0,
    repetitions: 0,
  };
  const from = start.getTime();
  const to = end.getTime();
  for (const workout of history) {
    const time = completedTime(workout);
    if (time < from || time >= to) continue;
    totals.workouts += 1;
    totals.durationMinutes += workout.durationMinutes;
    totals.volumeKg += workout.totalVolumeKg;
    totals.sets += workout.totalSets;
    totals.repetitions += workout.totalReps ?? 0;
  }
  return totals;
}

export interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals;
}

/** Current window of `days` ending now vs the equal window right before it. */
export function comparePeriods(
  history: CompletedWorkout[],
  days: number,
  now: Date = new Date(),
): PeriodComparison {
  const end = addDays(startOfDay(now), 1);
  const start = addDays(end, -days);
  const previousStart = addDays(start, -days);
  return {
    current: totalsBetween(history, start, end),
    previous: totalsBetween(history, previousStart, start),
  };
}

/** Relative change; undefined when the previous period is zero. */
export function percentChange(
  current: number,
  previous: number,
): number | undefined {
  if (previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

export type ChartPeriod = '1m' | '3m' | '1y';
export type ChartMetric = 'duration' | 'volume' | 'reps';

export interface ChartBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  value: number;
}

export function metricValue(totals: PeriodTotals, metric: ChartMetric): number {
  if (metric === 'duration') return totals.durationMinutes;
  if (metric === 'volume') return totals.volumeKg;
  return totals.repetitions;
}

export function bucketHistory(
  history: CompletedWorkout[],
  period: ChartPeriod,
  metric: ChartMetric,
  now: Date = new Date(),
): ChartBucket[] {
  const buckets: ChartBucket[] = [];
  if (period === '1y') {
    const first = addMonths(startOfMonth(now), -11);
    for (let i = 0; i < 12; i += 1) {
      const start = addMonths(first, i);
      const end = addMonths(first, i + 1);
      buckets.push({
        key: start.toISOString(),
        label: start
          .toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', ''),
        start,
        end,
        value: metricValue(totalsBetween(history, start, end), metric),
      });
    }
    return buckets;
  }

  const weeks = period === '1m' ? 5 : 13;
  const first = addDays(startOfWeek(now), -7 * (weeks - 1));
  for (let i = 0; i < weeks; i += 1) {
    const start = addDays(first, 7 * i);
    const end = addDays(start, 7);
    buckets.push({
      key: start.toISOString(),
      label: start
        .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
        .replace('.', '')
        .replace(' de ', ' '),
      start,
      end,
      value: metricValue(totalsBetween(history, start, end), metric),
    });
  }
  return buckets;
}

/** One bucket per day for the last `days` days (today included). */
export function bucketDays(
  history: CompletedWorkout[],
  days: number,
  metric: ChartMetric,
  now: Date = new Date(),
): ChartBucket[] {
  const first = addDays(startOfDay(now), -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const start = addDays(first, i);
    const end = addDays(start, 1);
    return {
      key: start.toISOString(),
      label: start
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .replace('.', ''),
      start,
      end,
      value: metricValue(totalsBetween(history, start, end), metric),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Exercises                                                           */
/* ------------------------------------------------------------------ */

function matchesExercise(
  entry: CompletedExercise,
  exerciseId: string,
  exerciseName: string,
): boolean {
  if (entry.exerciseId) return entry.exerciseId === exerciseId;
  return (
    entry.exerciseName.trim().toLowerCase() ===
    exerciseName.trim().toLowerCase()
  );
}

export interface ExerciseSession {
  workoutId: string;
  workoutName: string;
  completedAt: string;
  notes?: string;
  sets: CompletedSet[] | null;
  bestWeightKg: number;
  bestOneRepMax: number;
  volumeKg: number;
}

export function exerciseSessions(
  history: CompletedWorkout[],
  exerciseId: string,
  exerciseName: string,
): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];
  for (const workout of sortByCompletedDesc(history)) {
    const entry = workout.exercises.find((ex) =>
      matchesExercise(ex, exerciseId, exerciseName),
    );
    if (!entry) continue;
    const working =
      entry.sets?.filter(
        (set) => set.type === 'working' && set.repetitions > 0,
      ) ?? [];
    sessions.push({
      workoutId: workout.id,
      workoutName: workout.name,
      completedAt: workout.completedAt,
      notes: entry.notes,
      sets: entry.sets ?? null,
      bestWeightKg: entry.bestWeightKg,
      bestOneRepMax: working.reduce(
        (best, set) =>
          Math.max(best, estimateOneRepMax(set.weightKg, set.repetitions)),
        0,
      ),
      volumeKg: entry.totalVolumeKg,
    });
  }
  return sessions;
}

/** Sets from the most recent session that recorded per-set detail. */
export function previousSetsFor(
  history: CompletedWorkout[],
  exerciseId: string,
  exerciseName: string,
): CompletedSet[] | null {
  // Only lifted sets are a useful reference: a failed attempt (0 reps) or a
  // cardio entry would suggest "0 reps" for the next session.
  for (const session of exerciseSessions(history, exerciseId, exerciseName)) {
    const lifted = session.sets?.filter((set) => set.repetitions > 0) ?? [];
    if (lifted.length > 0) return lifted;
  }
  return null;
}

/**
 * Pairs each current set with the previous session's set of the same type
 * and position (warm-up 1 ↔ warm-up 1, working 2 ↔ working 2), so a routine
 * without warm-ups does not show last session's warm-up as "previous".
 */
export function alignPreviousSets(
  sets: Pick<SetEntry, 'setType'>[],
  previous: CompletedSet[] | null,
): (CompletedSet | null)[] {
  if (!previous) return sets.map(() => null);
  const pools = {
    warmup: previous.filter((set) => set.type === 'warmup'),
    working: previous.filter((set) => set.type === 'working'),
  };
  const used = { warmup: 0, working: 0 };
  return sets.map((set) => {
    const match = pools[set.setType][used[set.setType]] ?? null;
    used[set.setType] += 1;
    return match;
  });
}

export interface MuscleShare {
  group: string;
  sets: number;
}

export function muscleDistribution(
  history: CompletedWorkout[],
  since: Date,
  groupOf: (exercise: CompletedExercise) => string | undefined,
): MuscleShare[] {
  const totals = new Map<string, number>();
  for (const workout of history) {
    if (completedTime(workout) < since.getTime()) continue;
    for (const exercise of workout.exercises) {
      const group = exercise.primaryMuscleGroup ?? groupOf(exercise);
      if (!group) continue;
      totals.set(group, (totals.get(group) ?? 0) + exercise.setsCount);
    }
  }
  return [...totals.entries()]
    .map(([group, sets]) => ({ group, sets }))
    .filter((share) => share.sets > 0)
    .sort((a, b) => b.sets - a.sets);
}

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export function goalCurrentValue(
  goal: GoalItem,
  history: CompletedWorkout[],
  records: PersonalRecordItem[],
  now: Date = new Date(),
): number {
  if (goal.type === 'frequency') {
    const start = startOfWeek(now);
    return totalsBetween(history, start, addDays(start, 7)).workouts;
  }
  if (goal.type === 'exercise_weight' && goal.exerciseId) {
    const best = records
      .filter(
        (record) =>
          record.exerciseId === goal.exerciseId && record.type === 'weight',
      )
      .reduce((max, record) => Math.max(max, record.value), 0);
    return Math.max(best, goal.currentValue);
  }
  return goal.currentValue;
}

export function goalIsAutomatic(goal: GoalItem): boolean {
  return (
    goal.type === 'frequency' ||
    (goal.type === 'exercise_weight' && Boolean(goal.exerciseId))
  );
}

export function goalPercent(current: number, target: number): number {
  if (!(target > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

/* ------------------------------------------------------------------ */
/* Routines                                                            */
/* ------------------------------------------------------------------ */

/** Routine to suggest today: never-done routines first, then the least recent. */
export function suggestNextTemplate(
  templates: WorkoutTemplateItem[],
  history: CompletedWorkout[],
): WorkoutTemplateItem | null {
  if (templates.length === 0) return null;
  const lastDone = new Map<string, number>();
  for (const workout of history) {
    const template = templates.find(
      (t) =>
        (workout.templateId && t.id === workout.templateId) ||
        t.name === workout.name,
    );
    if (!template) continue;
    lastDone.set(
      template.id,
      Math.max(lastDone.get(template.id) ?? 0, completedTime(workout)),
    );
  }
  let best: WorkoutTemplateItem | null = null;
  let bestTime = Infinity;
  for (const template of templates) {
    const time = lastDone.get(template.id) ?? -Infinity;
    if (time < bestTime) {
      best = template;
      bestTime = time;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Data repair                                                         */
/* ------------------------------------------------------------------ */

const CATALOG_PREFIX = '00000000-0000-4000-8000-00000000';

/**
 * Starter routines from earlier versions pointed at the wrong catalog ids
 * (e.g. "Triceps na polia alta (corda)" used the id of "Supino reto com
 * barra"), so records landed on the wrong exercise. Legacy seed name → id.
 */
const LEGACY_SEED_IDS: Record<string, string> = {
  'supino reto com barra': `${CATALOG_PREFIX}1037`,
  'supino inclinado com halteres': `${CATALOG_PREFIX}1041`,
  'desenvolvimento militar': `${CATALOG_PREFIX}1098`,
  'elevacao lateral com halteres': `${CATALOG_PREFIX}1101`,
  'triceps na polia alta (corda)': `${CATALOG_PREFIX}1116`,
  'remada curvada com barra': `${CATALOG_PREFIX}1006`,
  'rosca direta com barra': `${CATALOG_PREFIX}1021`,
  'rosca martelo com halteres': `${CATALOG_PREFIX}1025`,
  'agachamento livre com barra': `${CATALOG_PREFIX}1076`,
  'leg press 45': `${CATALOG_PREFIX}1078`,
  'cadeira extensora': `${CATALOG_PREFIX}1079`,
  'mesa flexora': `${CATALOG_PREFIX}1080`,
  'prancha isometrica': `${CATALOG_PREFIX}1063`,
};

function nameKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function repairExerciseId(
  id: string,
  name: string,
  catalogName: (id: string) => string | undefined,
): string {
  const current = catalogName(id);
  if (current && nameKey(current) === nameKey(name)) return id;
  return LEGACY_SEED_IDS[nameKey(name)] ?? id;
}

export interface RepairResult {
  templates: WorkoutTemplateItem[];
  records: PersonalRecordItem[];
  changedTemplates: WorkoutTemplateItem[];
  changedRecords: PersonalRecordItem[];
}

export function repairExerciseRefs(
  templates: WorkoutTemplateItem[],
  records: PersonalRecordItem[],
  catalogName: (id: string) => string | undefined,
): RepairResult {
  const changedTemplates: WorkoutTemplateItem[] = [];
  const fixedTemplates = templates.map((template) => {
    let changed = false;
    const exercises = template.exercises.map((exercise) => {
      const exerciseId = repairExerciseId(
        exercise.exerciseId,
        exercise.exerciseName,
        catalogName,
      );
      if (exerciseId === exercise.exerciseId) return exercise;
      changed = true;
      return { ...exercise, exerciseId };
    });
    if (!changed) return template;
    const fixed = { ...template, exercises };
    changedTemplates.push(fixed);
    return fixed;
  });

  const changedRecords: PersonalRecordItem[] = [];
  const fixedRecords = records.map((record) => {
    const exerciseId = repairExerciseId(
      record.exerciseId,
      record.exerciseName,
      catalogName,
    );
    if (exerciseId === record.exerciseId) return record;
    const fixed = { ...record, exerciseId };
    changedRecords.push(fixed);
    return fixed;
  });

  return {
    templates: changedTemplates.length > 0 ? fixedTemplates : templates,
    records: changedRecords.length > 0 ? dedupeRecords(fixedRecords) : records,
    changedTemplates,
    changedRecords,
  };
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

export interface MergeResult<T> {
  merged: T[];
  localOnly: T[];
}

/**
 * Union of local and remote documents by id. Remote wins for documents that
 * exist on both sides; local-only documents are kept (and reported so they can
 * be uploaded) instead of being silently dropped; ids deleted locally stay deleted.
 */
export function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[],
  deletedIds: ReadonlySet<string> = new Set(),
): MergeResult<T> {
  const remoteIds = new Set(remote.map((item) => item.id));
  const localOnly = local.filter(
    (item) => !remoteIds.has(item.id) && !deletedIds.has(item.id),
  );
  const merged = [
    ...remote.filter((item) => !deletedIds.has(item.id)),
    ...localOnly,
  ];
  return { merged, localOnly };
}
