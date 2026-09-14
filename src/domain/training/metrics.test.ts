import {
  calculateCompletedWorkoutVolume,
  calculateSetVolume,
  isCompletedWorkingSet,
} from './metrics';
import type { TrainingSet } from './entities';

const baseSet: TrainingSet = {
  completedAt: '2026-09-14T12:00:00.000Z',
  createdAt: '2026-09-14T11:59:00.000Z',
  deletedAt: null,
  id: 'set-1',
  notes: null,
  repetitions: 10,
  restSeconds: null,
  sessionExerciseId: 'session-exercise-1',
  setNumber: 1,
  setType: 'working',
  updatedAt: '2026-09-14T12:00:00.000Z',
  weightKg: 80,
};

describe('training metrics', () => {
  it('calculates set volume from weight and repetitions', () => {
    expect(calculateSetVolume({ repetitions: 8, weightKg: 100 })).toBe(800);
  });

  it('accepts only completed working sets for progress calculations', () => {
    expect(isCompletedWorkingSet(baseSet)).toBe(true);
    expect(isCompletedWorkingSet({ ...baseSet, setType: 'warmup' })).toBe(
      false,
    );
    expect(isCompletedWorkingSet({ ...baseSet, completedAt: null })).toBe(
      false,
    );
    expect(isCompletedWorkingSet({ ...baseSet, repetitions: 0 })).toBe(false);
  });

  it('excludes warmups, deleted sets and incomplete sets from workout volume', () => {
    expect(
      calculateCompletedWorkoutVolume([
        baseSet,
        { ...baseSet, id: 'set-2', repetitions: 5, setType: 'warmup' },
        { ...baseSet, id: 'set-3', completedAt: null },
        { ...baseSet, id: 'set-4', deletedAt: '2026-09-14T12:05:00.000Z' },
      ]),
    ).toBe(800);
  });
});
