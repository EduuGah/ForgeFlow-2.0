import type {
  ActiveWorkoutState,
  TemplateExercise,
  WorkoutTemplateItem,
} from './types';

const DEFAULT_REST_SECONDS = 90;

/**
 * The routine this session would become: its exercises in order, with the
 * warm-up and working sets it ended with. Targets already in the routine are
 * kept; exercises that came in during the session take the first working set.
 */
export function routineFromSession(
  session: ActiveWorkoutState,
  template: WorkoutTemplateItem | null,
): TemplateExercise[] {
  const before = new Map(
    (template?.exercises ?? []).map((item) => [item.exerciseId, item]),
  );
  return session.exercises.map((exercise) => {
    const known = before.get(exercise.exerciseId);
    const warmupSets = exercise.sets.filter(
      (set) => set.setType === 'warmup',
    ).length;
    const working = exercise.sets.filter((set) => set.setType !== 'warmup');
    // The first set actually done says more than one left empty.
    const first =
      working.find((set) => set.completed && set.repetitions > 0) ?? working[0];
    const weight = known ? known.targetWeightKg : first?.weightKg;
    // A swapped-in exercise inherits the goal of the slot it took.
    const repsMax = known ? known.targetRepsMax : exercise.targetReps?.max;
    return {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      targetSets: Math.max(1, working.length),
      ...(warmupSets > 0 ? { warmupSets } : {}),
      targetReps:
        known?.targetReps ??
        exercise.targetReps?.min ??
        (first?.repetitions || 10),
      ...(repsMax ? { targetRepsMax: repsMax } : {}),
      ...(weight ? { targetWeightKg: weight } : {}),
      restSeconds:
        exercise.restSeconds ?? known?.restSeconds ?? DEFAULT_REST_SECONDS,
    };
  });
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * What changed from the routine to the session, in short sentences; empty
 * when nothing worth saving did (targets and loads are not "changes").
 */
export function describeRoutineChanges(
  before: TemplateExercise[],
  after: TemplateExercise[],
): string[] {
  const changes: string[] = [];
  const beforeIds = new Set(before.map((item) => item.exerciseId));
  const afterIds = new Set(after.map((item) => item.exerciseId));
  const removed = before.filter((item) => !afterIds.has(item.exerciseId));
  const added = after.filter((item) => !beforeIds.has(item.exerciseId));

  // Pairs of one out and one in read as a swap.
  const swaps = Math.min(removed.length, added.length);
  for (let i = 0; i < swaps; i++)
    changes.push(
      `Trocou ${removed[i].exerciseName} por ${added[i].exerciseName}`,
    );
  removed
    .slice(swaps)
    .forEach((item) => changes.push(`Tirou ${item.exerciseName}`));
  added
    .slice(swaps)
    .forEach((item) => changes.push(`Incluiu ${item.exerciseName}`));

  const previous = new Map(before.map((item) => [item.exerciseId, item]));
  for (const item of after) {
    const old = previous.get(item.exerciseId);
    if (!old) continue;
    if (old.targetSets !== item.targetSets)
      changes.push(
        `${item.exerciseName}: ${old.targetSets} → ${plural(item.targetSets, 'série', 'séries')}`,
      );
    const oldWarmups = old.warmupSets ?? 0;
    const newWarmups = item.warmupSets ?? 0;
    if (oldWarmups !== newWarmups)
      changes.push(
        `${item.exerciseName}: ${oldWarmups} → ${plural(newWarmups, 'aquecimento', 'aquecimentos')}`,
      );
  }

  const keptBefore = before
    .map((item) => item.exerciseId)
    .filter((id) => afterIds.has(id));
  const keptAfter = after
    .map((item) => item.exerciseId)
    .filter((id) => beforeIds.has(id));
  if (keptBefore.join('|') !== keptAfter.join('|'))
    changes.push('Mudou a ordem dos exercícios');

  return changes;
}
