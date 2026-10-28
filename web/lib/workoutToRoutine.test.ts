import { workoutToRoutine } from './workoutToRoutine';
import type { CompletedWorkout } from './types';

describe('workoutToRoutine', () => {
  it('keeps exercises, sets and typical reps, never the loads', () => {
    const workout = {
      exercises: [
        {
          exerciseId: 'supino',
          exerciseName: 'Supino',
          setsCount: 3,
          bestWeightKg: 100,
          totalVolumeKg: 2400,
          sets: [
            { type: 'warmup', weightKg: 40, repetitions: 10 },
            { type: 'working', weightKg: 100, repetitions: 8 },
            { type: 'working', weightKg: 100, repetitions: 8 },
            { type: 'working', weightKg: 100, repetitions: 6 },
          ],
        },
        {
          exerciseId: 'antigo',
          exerciseName: 'Sem detalhe',
          setsCount: 4,
          bestWeightKg: 50,
          totalVolumeKg: 1000,
        },
        {
          exerciseName: 'Importado sem id',
          setsCount: 2,
          bestWeightKg: 0,
          totalVolumeKg: 0,
        },
      ],
    } as CompletedWorkout;
    expect(workoutToRoutine(workout, () => true)).toEqual([
      {
        exerciseId: 'supino',
        exerciseName: 'Supino',
        targetSets: 3,
        warmupSets: 1,
        targetReps: 8,
        restSeconds: 90,
      },
      {
        exerciseId: 'antigo',
        exerciseName: 'Sem detalhe',
        targetSets: 4,
        targetReps: 10,
        restSeconds: 90,
      },
    ]);
    expect(workoutToRoutine(workout, (id) => id === 'supino')).toHaveLength(1);
  });
});
