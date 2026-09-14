import type { TrainingSet } from './entities';

type SetForVolume = Pick<TrainingSet, 'repetitions' | 'weightKg'>;

type SetForProgress = Pick<
  TrainingSet,
  'completedAt' | 'deletedAt' | 'repetitions' | 'setType' | 'weightKg'
>;

export function calculateSetVolume(set: SetForVolume) {
  return set.weightKg * set.repetitions;
}

export function isCompletedWorkingSet(set: SetForProgress) {
  return (
    set.deletedAt === null &&
    set.completedAt !== null &&
    set.setType === 'working' &&
    set.weightKg >= 0 &&
    set.repetitions > 0
  );
}

export function calculateCompletedWorkoutVolume(
  sets: readonly SetForProgress[],
) {
  return sets
    .filter(isCompletedWorkingSet)
    .reduce((total, set) => total + calculateSetVolume(set), 0);
}
