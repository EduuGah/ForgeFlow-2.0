import type { CompletedWorkout, TemplateExercise } from './types';

/*
 * A finished workout (a friend's, usually) turned into a routine: the same
 * exercises, sets and reps. Loads stay out — they were someone else's.
 */

function typicalReps(reps: number[]): number {
  if (reps.length === 0) return 10;
  const sorted = [...reps].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export function workoutToRoutine(
  workout: CompletedWorkout,
  knows: (exerciseId: string) => boolean,
): TemplateExercise[] {
  return workout.exercises
    .filter((exercise) => exercise.exerciseId && knows(exercise.exerciseId))
    .map((exercise) => {
      const working =
        exercise.sets?.filter(
          (set) => set.type === 'working' && set.repetitions > 0,
        ) ?? [];
      const warmups =
        exercise.sets?.filter((set) => set.type === 'warmup').length ?? 0;
      return {
        exerciseId: exercise.exerciseId as string,
        exerciseName: exercise.exerciseName,
        targetSets: Math.max(1, working.length || exercise.setsCount),
        ...(warmups > 0 ? { warmupSets: warmups } : {}),
        targetReps: typicalReps(working.map((set) => set.repetitions)),
        restSeconds: 90,
      };
    });
}
