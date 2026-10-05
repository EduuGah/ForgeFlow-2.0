import { filterByGym, gymStats, suggestGymId, summarizeGyms } from './gyms';
import type { CompletedExercise, CompletedWorkout, Gym } from './types';

const gyms: Gym[] = [
  { id: 'centro', name: 'Centro', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'bairro', name: 'Bairro', createdAt: '2026-01-02T00:00:00.000Z' },
];

const bench = (sets: number, best: number): CompletedExercise => ({
  exerciseId: 'bench',
  exerciseName: 'Supino',
  setsCount: sets,
  bestWeightKg: best,
  totalVolumeKg: sets * best * 8,
});

const workout = (
  id: string,
  completedAt: string,
  extra: Partial<CompletedWorkout> = {},
): CompletedWorkout => ({
  id,
  name: 'Upper A',
  startedAt: completedAt,
  completedAt,
  durationMinutes: 60,
  totalVolumeKg: 1000,
  totalSets: 10,
  exercises: [],
  prsAchieved: [],
  ...extra,
});

// Newest first, like the store keeps it.
const history = [
  workout('w4', '2026-10-04T20:00:00.000Z', { gymId: 'bairro' }),
  workout('w3', '2026-10-02T20:00:00.000Z', {
    gymId: 'centro',
    templateId: 'lower',
    name: 'Lower A',
    prsAchieved: ['Agachamento: Maior peso 100 kg'],
  }),
  workout('w2', '2026-09-30T20:00:00.000Z', { gymId: 'deleted' }),
  workout('w1', '2026-09-28T20:00:00.000Z', {
    gymId: 'centro',
    exercises: [bench(3, 60)],
  }),
  workout('w0', '2026-08-01T20:00:00.000Z', {
    gymId: 'centro',
    exercises: [bench(4, 70)],
  }),
];

describe('gyms', () => {
  it('suggests the gym of the same routine, else the latest gym used', () => {
    expect(suggestGymId(history, gyms, 'lower')).toBe('centro');
    expect(suggestGymId(history, gyms, 'other')).toBe('bairro');
    expect(suggestGymId(history, gyms)).toBe('bairro');
    expect(suggestGymId([], gyms)).toBeUndefined();
    // A deleted gym is never suggested.
    expect(suggestGymId([history[2]], gyms)).toBeUndefined();
  });

  it('filters history by gym, treating deleted gyms as none', () => {
    expect(filterByGym(history, gyms, 'all')).toHaveLength(5);
    expect(filterByGym(history, gyms, 'centro').map((w) => w.id)).toEqual([
      'w3',
      'w1',
      'w0',
    ]);
    expect(filterByGym(history, gyms, 'none').map((w) => w.id)).toEqual(['w2']);
  });

  it('summarizes gyms by most recent visit', () => {
    expect(
      summarizeGyms(history, gyms).map((s) => [s.gym.id, s.workouts]),
    ).toEqual([
      ['bairro', 1],
      ['centro', 3],
    ]);
  });

  it('computes totals, frequency and favourites for one gym', () => {
    const stats = gymStats(history, 'centro', new Date('2026-10-05T12:00:00'));
    expect(stats.workouts).toBe(3);
    expect(stats.totalMinutes).toBe(180);
    expect(stats.records).toBe(1);
    expect(stats.firstAt).toBe('2026-08-01T20:00:00.000Z');
    expect(stats.lastAt).toBe('2026-10-02T20:00:00.000Z');
    // Two visits in the last 8 weeks.
    expect(stats.perWeek).toBe(0.3);
    expect(stats.topExercises).toEqual([
      {
        key: 'bench',
        exerciseId: 'bench',
        name: 'Supino',
        sets: 7,
        bestWeightKg: 70,
      },
    ]);
    expect(stats.topRoutines).toEqual([
      { name: 'Upper A', count: 2 },
      { name: 'Lower A', count: 1 },
    ]);
  });
});
