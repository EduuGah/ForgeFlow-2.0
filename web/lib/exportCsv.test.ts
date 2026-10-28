import { workoutsToCsv } from './exportCsv';
import { readWorkoutCsv } from './importCsv';
import type { CompletedWorkout } from './types';

const workout: CompletedWorkout = {
  id: 'w1',
  name: 'Push, "pesado"',
  startedAt: '2026-10-22T23:13:00.000Z',
  completedAt: '2026-10-23T00:20:00.000Z',
  durationMinutes: 67,
  totalVolumeKg: 1120,
  totalSets: 2,
  notes: 'Linha 1\nLinha 2',
  prsAchieved: [],
  exercises: [
    {
      exerciseId: 'supino',
      exerciseName: 'Supino reto com barra',
      setsCount: 2,
      bestWeightKg: 70,
      totalVolumeKg: 1120,
      sets: [
        { type: 'warmup', weightKg: 40, repetitions: 10 },
        { type: 'working', weightKg: 70, repetitions: 8 },
        { type: 'working', weightKg: 70, repetitions: 8, tag: 'failure' },
      ],
    },
  ],
};

describe('workoutsToCsv', () => {
  it('writes one row per set in the Hevy format', () => {
    const csv = workoutsToCsv([workout]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(
      'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe',
    );
    expect(csv).toContain('"Push, ""pesado"""');
    expect(csv).toContain(',warmup,40,10,');
    expect(csv).toContain(',failure,70,8,');
  });

  it('reads back with the importer', () => {
    const parsed = readWorkoutCsv(workoutsToCsv([workout]));
    expect(parsed.workouts).toHaveLength(1);
    const [back] = parsed.workouts;
    expect(back.title).toBe('Push, "pesado"');
    expect(back.exercises[0].sourceName).toBe('Supino reto com barra');
    expect(back.exercises[0].sets).toHaveLength(3);
    expect(new Date(back.startedAt).getTime()).toBe(
      new Date(workout.startedAt).getTime(),
    );
  });
});
