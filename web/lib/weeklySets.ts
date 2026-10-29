import { addDays, startOfWeek } from './dates';
import { hasCardioResult, hasResult, isCardio, muscleLabel } from './training';
import type {
  ActiveWorkoutState,
  CompletedSet,
  CompletedWorkout,
} from './types';

/*
 * Weekly sets per muscle group: the target, what this week already has and
 * what is left, with how to make up for it in the days still ahead. A set
 * counts 1 for the exercise's main group and ½ for each group that only
 * helps (synergist), like the body map.
 */

export const WEEKLY_GROUPS = [
  'Peito',
  'Costas',
  'Pernas',
  'Ombros',
  'Biceps',
  'Triceps',
  'Core',
  'Antebracos',
] as const;

export type WeeklyTargets = Record<string, number>;

export interface WeeklyPreset {
  id: string;
  label: string;
  description: string;
  targets: WeeklyTargets;
}

export const WEEKLY_PRESETS: WeeklyPreset[] = [
  {
    id: 'maintain',
    label: 'Manter',
    description: 'Mínimo para manter o que já tem',
    targets: {
      Peito: 6,
      Costas: 6,
      Pernas: 8,
      Ombros: 6,
      Biceps: 4,
      Triceps: 4,
      Core: 4,
      Antebracos: 0,
    },
  },
  {
    id: 'grow',
    label: 'Hipertrofia',
    description: 'Faixa mais usada para crescer',
    targets: {
      Peito: 10,
      Costas: 12,
      Pernas: 12,
      Ombros: 10,
      Biceps: 8,
      Triceps: 8,
      Core: 6,
      Antebracos: 0,
    },
  },
  {
    id: 'advanced',
    label: 'Avançado',
    description: 'Para quem já treina há anos',
    targets: {
      Peito: 16,
      Costas: 16,
      Pernas: 16,
      Ombros: 14,
      Biceps: 12,
      Triceps: 12,
      Core: 8,
      Antebracos: 6,
    },
  },
];

export const DEFAULT_WEEKLY_TARGETS: WeeklyTargets = WEEKLY_PRESETS[1].targets;
export const DEFAULT_CARDIO_MINUTES = 150;

/** A catalog helper muscle → the weekly group it adds half a set to. */
const HELPER_GROUP: Record<string, string> = {
  Peito: 'Peito',
  Peitoral: 'Peito',
  'Peitoral superior': 'Peito',
  Costas: 'Costas',
  Dorsal: 'Costas',
  Romboides: 'Costas',
  Trapezio: 'Costas',
  Lombar: 'Costas',
  Pernas: 'Pernas',
  Quadriceps: 'Pernas',
  Gluteos: 'Pernas',
  'Posterior de coxa': 'Pernas',
  Adutores: 'Pernas',
  Panturrilhas: 'Pernas',
  Ombros: 'Ombros',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  Antebracos: 'Antebracos',
  Braquiorradial: 'Antebracos',
  Core: 'Core',
  Abdomen: 'Core',
  Obliquos: 'Core',
};

export function helperGroup(name: string): string | null {
  return HELPER_GROUP[name] ?? null;
}

export interface ExerciseMuscles {
  primary: string | null | undefined;
  secondary: string[];
}

/** Sets each group got from `sets` sets of one exercise. */
export function setsByGroup(
  muscles: ExerciseMuscles,
  sets: number,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!(sets > 0) || !muscles.primary || isCardio(muscles.primary)) return out;
  out.set(muscles.primary, sets);
  for (const name of muscles.secondary) {
    const group = helperGroup(name);
    // A helper of the same group (glutes on a leg day) is not counted twice.
    if (!group || group === muscles.primary || out.has(group)) continue;
    out.set(group, sets / 2);
  }
  return out;
}

export type WeeklyStatus = 'done' | 'onTrack' | 'behind';

export interface WeeklyGroup {
  group: string;
  label: string;
  target: number;
  done: number;
  remaining: number;
  status: WeeklyStatus;
  /** Sets per remaining training day that close the gap. */
  perDay: number;
}

export interface WeeklySets {
  groups: WeeklyGroup[];
  target: number;
  done: number;
  /** Training days left this week, today included. */
  daysLeft: number;
  /** `daysLeft` counts the days of the weekly plan (not every day). */
  planned: boolean;
  cardio: { target: number; minutes: number };
}

function cardioSeconds(sets: CompletedSet[] | undefined): number {
  return (sets ?? [])
    .filter(hasCardioResult)
    .reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0);
}

/** Days left this week (Monday–Sunday), today included. */
export function daysLeftInWeek(now: Date): number {
  return 7 - ((now.getDay() + 6) % 7);
}

/**
 * Planned training days from today to Sunday. `plan` is indexed by weekday
 * (0 = Sunday); with nothing planned, every day left counts.
 */
export function trainingDaysLeft(
  plan: (string | null)[] | null,
  now: Date,
  trainedToday: boolean,
): number {
  const left = daysLeftInWeek(now);
  const planned = plan?.some(Boolean) ? plan : null;
  let count = 0;
  for (let i = 0; i < left; i++) {
    const day = addDays(now, i);
    if (i === 0 && trainedToday) continue;
    if (!planned || planned[day.getDay()]) count += 1;
  }
  return count;
}

export function weeklySets({
  history,
  active,
  musclesOf,
  targets,
  cardioTarget,
  trainingDays,
  planned = false,
  now = new Date(),
}: {
  history: CompletedWorkout[];
  active: ActiveWorkoutState | null;
  musclesOf: (exerciseId: string | undefined) => ExerciseMuscles | null;
  targets: WeeklyTargets;
  cardioTarget: number;
  /** Training days left this week (see `trainingDaysLeft`). */
  trainingDays: number;
  planned?: boolean;
  now?: Date;
}): WeeklySets {
  const start = startOfWeek(now).getTime();
  const end = addDays(startOfWeek(now), 7).getTime();
  const done = new Map<string, number>();
  let seconds = 0;
  const add = (muscles: ExerciseMuscles, sets: number) => {
    for (const [group, value] of setsByGroup(muscles, sets))
      done.set(group, (done.get(group) ?? 0) + value);
  };

  for (const workout of history) {
    const at = Date.parse(workout.completedAt);
    if (!(at >= start && at < end)) continue;
    for (const exercise of workout.exercises) {
      const known = musclesOf(exercise.exerciseId);
      const muscles = {
        primary: exercise.primaryMuscleGroup ?? known?.primary,
        secondary: known?.secondary ?? [],
      };
      const working = exercise.sets
        ? exercise.sets.filter(
            (set) => set.type === 'working' && hasResult(set),
          ).length
        : exercise.setsCount;
      seconds += cardioSeconds(exercise.sets);
      add(muscles, working);
    }
  }
  // The workout in progress counts as its sets are done.
  for (const exercise of active?.exercises ?? []) {
    const doneSets = exercise.sets.filter(
      (set) => set.completed && set.setType === 'working' && hasResult(set),
    );
    seconds += doneSets.reduce(
      (sum, set) => sum + (set.durationSeconds ?? 0),
      0,
    );
    add(
      {
        primary: exercise.primaryMuscleGroup,
        secondary: musclesOf(exercise.exerciseId)?.secondary ?? [],
      },
      doneSets.length,
    );
  }

  // Days already gone this week: being "behind" means below the even pace.
  const elapsed = 7 - daysLeftInWeek(now);
  const groups: WeeklyGroup[] = WEEKLY_GROUPS.map((group) => {
    const target = Math.max(0, Math.round(targets[group] ?? 0));
    const value = Math.round((done.get(group) ?? 0) * 2) / 2;
    const remaining = Math.max(0, target - value);
    const status: WeeklyStatus =
      remaining === 0
        ? 'done'
        : value + 0.5 < (target * elapsed) / 7
          ? 'behind'
          : 'onTrack';
    return {
      group,
      label: muscleLabel(group),
      target,
      done: value,
      remaining,
      status,
      perDay:
        remaining > 0 ? Math.ceil(remaining / Math.max(1, trainingDays)) : 0,
    };
  }).filter((item) => item.target > 0);

  return {
    groups,
    target: groups.reduce((sum, item) => sum + item.target, 0),
    done: groups.reduce(
      (sum, item) => sum + Math.min(item.done, item.target),
      0,
    ),
    daysLeft: trainingDays,
    planned,
    cardio: { target: cardioTarget, minutes: Math.round(seconds / 60) },
  };
}

/** Groups to make up for, most behind first. */
export function toCatchUp(week: WeeklySets): WeeklyGroup[] {
  return week.groups
    .filter((item) => item.status === 'behind')
    .sort((a, b) => b.remaining / b.target - a.remaining / a.target);
}
