import type { Exercise } from '../../src/domain/training/entities';
import { searchKey } from './format';
import { muscleLabel } from './training';
import type { CompletedWorkout } from './types';
import { helperGroup } from './weeklySets';

/*
 * The exercise list filter: search, one muscle, one kind of equipment and
 * "favorites"/"recent". With a muscle picked, the exercises where it is only
 * a helper (synergist) come apart from the ones that focus on it.
 */

export type ExerciseOnly = 'all' | 'favorites' | 'recent';

export interface ExerciseFilterState {
  query: string;
  /** A muscle group, or 'all'. */
  muscle: string;
  /** An equipment kind (see `equipmentKind`), or 'all'. */
  equipment: string;
  only: ExerciseOnly;
}

export const EMPTY_FILTER: ExerciseFilterState = {
  query: '',
  muscle: 'all',
  equipment: 'all',
  only: 'all',
};

export const EQUIPMENT_KINDS = [
  'Barra',
  'Halteres',
  'Máquina',
  'Cabo',
  'Smith',
  'Peso corporal',
  'Kettlebell',
  'Elástico',
  'Aparelho de cardio',
  'Outros',
] as const;

/** Catalog and custom equipment names → the kinds the filter offers. */
export function equipmentKinds(equipment: string | null | undefined): string[] {
  const key = searchKey(equipment ?? '');
  if (!key) return ['Outros'];
  if (key.includes('smith')) return ['Smith'];
  if (key === 'barra ou halteres') return ['Barra', 'Halteres'];
  if (key === 'barra fixa' || key === 'paralelas' || key === 'roda abdominal')
    return ['Peso corporal'];
  if (key.startsWith('barra')) return ['Barra'];
  if (key.startsWith('halter')) return ['Halteres'];
  if (key.startsWith('maquina')) return ['Máquina'];
  if (key.startsWith('cabo') || key.includes('polia')) return ['Cabo'];
  if (key.startsWith('peso corporal')) return ['Peso corporal'];
  if (key.startsWith('kettlebell')) return ['Kettlebell'];
  if (key.startsWith('elastico')) return ['Elástico'];
  if (
    [
      'esteira',
      'bicicleta',
      'eliptico',
      'remo',
      'escada',
      'corda',
      'piscina',
    ].some((word) => key.startsWith(word))
  )
    return ['Aparelho de cardio'];
  return ['Outros'];
}

/** Ids of the exercises in the latest workouts, most recent first. */
export function recentExerciseIds(
  history: CompletedWorkout[],
  limit = 40,
): string[] {
  const ids: string[] = [];
  for (const workout of history)
    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId || ids.includes(exercise.exerciseId)) continue;
      ids.push(exercise.exerciseId);
      if (ids.length >= limit) return ids;
    }
  return ids;
}

/** The muscle is a helper of this exercise (not its focus). */
export function helpsWith(exercise: Exercise, muscle: string): boolean {
  return (
    exercise.primaryMuscleGroup !== muscle &&
    exercise.secondaryMuscleGroups.some(
      (name) => name === muscle || helperGroup(name) === muscle,
    )
  );
}

function matchesQuery(
  exercise: Exercise,
  key: string,
  aliases: (id: string) => string[],
): boolean {
  if (!key) return true;
  return (
    searchKey(exercise.name).includes(key) ||
    searchKey(muscleLabel(exercise.primaryMuscleGroup)).includes(key) ||
    searchKey(exercise.equipment ?? '').includes(key) ||
    aliases(exercise.id).some((alias) => searchKey(alias).includes(key))
  );
}

export function filterExercises(
  exercises: Exercise[],
  state: ExerciseFilterState,
  context: {
    favorites: string[];
    recent: string[];
    aliases: (id: string) => string[];
  },
): { main: Exercise[]; synergy: Exercise[] } {
  const key = searchKey(state.query);
  const recentRank = new Map(context.recent.map((id, index) => [id, index]));
  const base = exercises.filter((exercise) => {
    if (state.only === 'favorites' && !context.favorites.includes(exercise.id))
      return false;
    if (state.only === 'recent' && !recentRank.has(exercise.id)) return false;
    if (
      state.equipment !== 'all' &&
      !equipmentKinds(exercise.equipment).includes(state.equipment)
    )
      return false;
    return matchesQuery(exercise, key, context.aliases);
  });
  const order = (a: Exercise, b: Exercise) =>
    state.only === 'recent'
      ? (recentRank.get(a.id) ?? 0) - (recentRank.get(b.id) ?? 0)
      : a.name.localeCompare(b.name, 'pt-BR');

  if (state.muscle === 'all') return { main: base.sort(order), synergy: [] };
  return {
    main: base
      .filter((exercise) => exercise.primaryMuscleGroup === state.muscle)
      .sort(order),
    synergy: base
      .filter((exercise) => helpsWith(exercise, state.muscle))
      .sort(order),
  };
}

/** How many exercises have each value, for the picker's option details. */
export function countBy(
  exercises: Exercise[],
  values: (exercise: Exercise) => string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const exercise of exercises)
    for (const value of values(exercise))
      counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}
