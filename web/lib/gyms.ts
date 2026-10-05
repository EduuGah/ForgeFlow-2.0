import { addDays, startOfDay } from './dates';
import type { CompletedWorkout, Gym } from './types';

/** Filter for history views: every workout, one gym, or no gym. */
export type GymFilter = 'all' | 'none' | string;

/** A workout's gym, when it still exists (it may be deleted elsewhere). */
export function gymOf(
  workout: Pick<CompletedWorkout, 'gymId'>,
  gyms: Gym[],
): Gym | undefined {
  return workout.gymId
    ? gyms.find((gym) => gym.id === workout.gymId)
    : undefined;
}

export function filterByGym(
  history: CompletedWorkout[],
  gyms: Gym[],
  filter: GymFilter,
): CompletedWorkout[] {
  if (filter === 'all') return history;
  if (filter === 'none')
    return history.filter((workout) => !gymOf(workout, gyms));
  return history.filter((workout) => workout.gymId === filter);
}

/**
 * Gym to pre-fill for a new workout: where this routine was last done, else
 * where the person trained last. `history` is newest first.
 */
export function suggestGymId(
  history: CompletedWorkout[],
  gyms: Gym[],
  templateId?: string,
): string | undefined {
  const known = (workout: CompletedWorkout) => Boolean(gymOf(workout, gyms));
  const sameRoutine = templateId
    ? history.find(
        (workout) => workout.templateId === templateId && known(workout),
      )
    : undefined;
  return (sameRoutine ?? history.find(known))?.gymId;
}

export interface GymSummary {
  gym: Gym;
  workouts: number;
  lastAt: string | null;
}

/** Gyms with how often and how recently they were used, most recent first. */
export function summarizeGyms(
  history: CompletedWorkout[],
  gyms: Gym[],
): GymSummary[] {
  return gyms
    .map((gym) => {
      const visits = history.filter((workout) => workout.gymId === gym.id);
      const lastAt = visits.reduce<string | null>(
        (latest, workout) =>
          !latest || workout.completedAt > latest
            ? workout.completedAt
            : latest,
        null,
      );
      return { gym, workouts: visits.length, lastAt };
    })
    .sort(
      (a, b) =>
        (b.lastAt ?? '').localeCompare(a.lastAt ?? '') ||
        a.gym.name.localeCompare(b.gym.name, 'pt-BR'),
    );
}

export interface GymStats {
  workouts: number;
  totalMinutes: number;
  totalVolumeKg: number;
  totalSets: number;
  /** Personal records set in workouts at this gym. */
  records: number;
  firstAt: string | null;
  lastAt: string | null;
  /** Average workouts per week over the last `weeks` weeks. */
  perWeek: number;
  topExercises: {
    key: string;
    exerciseId?: string;
    name: string;
    sets: number;
    bestWeightKg: number;
  }[];
  topRoutines: { name: string; count: number }[];
}

export function gymStats(
  history: CompletedWorkout[],
  gymId: string,
  now: Date = new Date(),
  weeks = 8,
): GymStats {
  const visits = history.filter((workout) => workout.gymId === gymId);
  const since = addDays(startOfDay(now), -weeks * 7 + 1).getTime();
  const recent = visits.filter(
    (workout) => new Date(workout.completedAt).getTime() >= since,
  ).length;

  const exercises = new Map<string, GymStats['topExercises'][number]>();
  const routines = new Map<string, number>();
  for (const workout of visits) {
    routines.set(workout.name, (routines.get(workout.name) ?? 0) + 1);
    for (const exercise of workout.exercises) {
      const key = exercise.exerciseId ?? exercise.exerciseName.toLowerCase();
      const entry = exercises.get(key) ?? {
        key,
        exerciseId: exercise.exerciseId,
        name: exercise.exerciseName,
        sets: 0,
        bestWeightKg: 0,
      };
      entry.sets += exercise.setsCount;
      entry.bestWeightKg = Math.max(entry.bestWeightKg, exercise.bestWeightKg);
      exercises.set(key, entry);
    }
  }

  const dates = visits.map((workout) => workout.completedAt).sort();
  return {
    workouts: visits.length,
    totalMinutes: visits.reduce((sum, w) => sum + w.durationMinutes, 0),
    totalVolumeKg: visits.reduce((sum, w) => sum + w.totalVolumeKg, 0),
    totalSets: visits.reduce((sum, w) => sum + w.totalSets, 0),
    records: visits.reduce((sum, w) => sum + w.prsAchieved.length, 0),
    firstAt: dates[0] ?? null,
    lastAt: dates.at(-1) ?? null,
    perWeek: Math.round((recent / weeks) * 10) / 10,
    topExercises: [...exercises.values()]
      .filter((entry) => entry.sets > 0)
      .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name))
      .slice(0, 5),
    topRoutines: [...routines.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 3),
  };
}
