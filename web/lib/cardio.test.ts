import { routineFromSession } from './routineChanges';
import {
  buildCompletedWorkout,
  isCountedSet,
  previousSetsFor,
  summarizeActiveWorkout,
} from './training';
import type { ActiveWorkoutState, SetEntry } from './types';
import { workoutToRoutine } from './workoutToRoutine';

const run = (overrides: Partial<SetEntry> = {}): SetEntry => ({
  id: Math.random().toString(),
  setNumber: 1,
  setType: 'working',
  weightKg: 0,
  repetitions: 0,
  completed: true,
  ...overrides,
});

const session = (sets: SetEntry[]): ActiveWorkoutState => ({
  id: 's',
  name: 'Cardio',
  startedAt: '2026-10-29T10:00:00.000Z',
  exercises: [
    {
      key: 'k',
      exerciseId: 'esteira',
      exerciseName: 'Corrida na esteira',
      primaryMuscleGroup: 'Cardio',
      equipment: 'Esteira',
      restSeconds: 0,
      sets,
    },
  ],
});

describe('cardio sets', () => {
  it('count when they have time or distance', () => {
    expect(isCountedSet(run({ durationSeconds: 1200 }))).toBe(true);
    expect(isCountedSet(run({ distanceKm: 3 }))).toBe(true);
    expect(isCountedSet(run())).toBe(false);
    expect(isCountedSet(run({ durationSeconds: 600, completed: false }))).toBe(
      false,
    );
  });

  it('are saved with the workout, without volume', () => {
    const workout = buildCompletedWorkout(
      session([run({ durationSeconds: 1500, distanceKm: 4.2 }), run()]),
      new Date('2026-10-29T10:30:00.000Z'),
      'w1',
    );
    expect(workout.totalSets).toBe(1);
    expect(workout.totalVolumeKg).toBe(0);
    expect(workout.exercises[0].sets).toEqual([
      {
        type: 'working',
        weightKg: 0,
        repetitions: 0,
        durationSeconds: 1500,
        distanceKm: 4.2,
      },
    ]);
    expect(
      summarizeActiveWorkout(session([run({ durationSeconds: 60 })]))
        .completedSets,
    ).toBe(1);

    // Next time, the last run is the reference.
    expect(
      previousSetsFor([workout], 'esteira', 'Corrida na esteira')?.[0],
    ).toMatchObject({ durationSeconds: 1500, distanceKm: 4.2 });
  });

  it('turn into minutes in the routine', () => {
    const [item] = routineFromSession(
      session([run({ durationSeconds: 1500 }), run({ durationSeconds: 600 })]),
      null,
    );
    expect(item).toMatchObject({ targetSets: 2, targetMinutes: 25 });
    expect(item.targetWeightKg).toBeUndefined();

    const workout = buildCompletedWorkout(
      session([run({ durationSeconds: 1800 })]),
      new Date('2026-10-29T10:40:00.000Z'),
      'w2',
    );
    expect(workoutToRoutine(workout, () => true)[0]).toMatchObject({
      targetSets: 1,
      targetMinutes: 30,
      restSeconds: 0,
    });
  });
});
