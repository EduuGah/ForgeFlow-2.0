import { useMemo } from 'react';
import { findExercise } from '../store';
import {
  regionIntensity,
  regionLoad,
  topRegions,
  type MuscleWork,
} from '../lib/bodyMap';
import { formatNumber } from '../lib/format';
import type {
  ActiveExerciseSession,
  CompletedExercise,
  CompletedWorkout,
} from '../lib/types';
import { BodyMap } from '../ui/BodyMap';
import { cx } from '../ui/core';

/* The body map fed by workouts: the one in progress, a finished one, a week. */

function secondaryOf(exerciseId: string | undefined): string[] {
  return (exerciseId && findExercise(exerciseId)?.secondaryMuscleGroups) || [];
}

function primaryOf(exercise: {
  exerciseId?: string;
  primaryMuscleGroup?: string | null;
}): string | undefined {
  return (
    exercise.primaryMuscleGroup ??
    (exercise.exerciseId
      ? findExercise(exercise.exerciseId)?.primaryMuscleGroup
      : undefined)
  );
}

/** Completed working sets of the workout in progress. */
export function activeMuscleWork(
  exercises: ActiveExerciseSession[],
): MuscleWork[] {
  return exercises.map((exercise) => ({
    primary: primaryOf(exercise),
    secondary: secondaryOf(exercise.exerciseId),
    sets: exercise.sets.filter(
      (set) => set.completed && set.setType === 'working',
    ).length,
  }));
}

function completedWork(exercise: CompletedExercise): MuscleWork {
  return {
    primary: primaryOf(exercise),
    secondary: secondaryOf(exercise.exerciseId),
    sets: exercise.setsCount,
  };
}

/** Working sets of finished workouts since `since` (all when omitted). */
export function historyMuscleWork(
  workouts: CompletedWorkout[],
  since?: Date,
): MuscleWork[] {
  const from = since?.getTime() ?? -Infinity;
  return workouts
    .filter((workout) => Date.parse(workout.completedAt) >= from)
    .flatMap((workout) => workout.exercises.map(completedWork));
}

/**
 * The map with the most worked muscles next to it. `full` is how many sets
 * light a muscle completely (a workout ~6, a week ~12).
 */
export function MuscleMapCard({
  work,
  full,
  height = 150,
  empty,
  className,
}: {
  work: MuscleWork[];
  full: number;
  height?: number;
  /** Shown instead of the list while nothing was worked. */
  empty?: string;
  className?: string;
}) {
  const { intensity, top } = useMemo(() => {
    const load = regionLoad(work);
    return { intensity: regionIntensity(load, full), top: topRegions(load, 5) };
  }, [work, full]);
  const label =
    top.length > 0
      ? `Músculos trabalhados: ${top.map((item) => item.label).join(', ')}`
      : 'Nenhum músculo trabalhado ainda';

  return (
    <div className={cx('flex items-center gap-3', className)}>
      <BodyMap intensity={intensity} height={height} label={label} />
      <div className="min-w-0 flex-1">
        {top.length === 0 ? (
          <p className="text-footnote text-ink-2">
            {empty ?? 'Conclua séries para ver os músculos acenderem.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {top.map((item) => (
              <li
                key={item.region}
                className="text-footnote flex items-baseline justify-between gap-2"
              >
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 text-ink-2 tabular">
                  {formatNumber(item.sets, item.sets % 1 ? 1 : 0)}{' '}
                  {item.sets === 1 ? 'série' : 'séries'}
                </span>
              </li>
            ))}
            <li className="text-micro pt-0.5 text-ink-3">
              Músculos de sinergia contam meia série
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
