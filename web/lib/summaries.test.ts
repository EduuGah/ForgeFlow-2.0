import {
  periodSummary,
  repRangeBests,
  summaryShareText,
  yearGrid,
} from './summaries';
import type { CompletedWorkout } from './types';

const now = new Date('2026-10-22T12:00:00');

const workout = (
  completedAt: string,
  fields: Partial<CompletedWorkout> = {},
): CompletedWorkout => ({
  id: completedAt,
  name: 'Treino',
  startedAt: completedAt,
  completedAt,
  durationMinutes: 50,
  totalVolumeKg: 1000,
  totalSets: 10,
  prsAchieved: [],
  exercises: [
    {
      exerciseId: 'supino',
      exerciseName: 'Supino',
      primaryMuscleGroup: 'Peito',
      setsCount: 4,
      bestWeightKg: 80,
      totalVolumeKg: 1000,
    },
  ],
  ...fields,
});

describe('repRangeBests', () => {
  it('keeps the heaviest load done for at least N reps', () => {
    const bests = repRangeBests([
      {
        sets: [
          { type: 'working', weightKg: 100, repetitions: 1 },
          { type: 'working', weightKg: 90, repetitions: 5 },
          { type: 'warmup', weightKg: 120, repetitions: 10 },
        ],
      },
      { sets: [{ type: 'working', weightKg: 70, repetitions: 10 }] },
      { sets: null },
    ]);
    expect(bests).toEqual([
      { reps: 1, weightKg: 100 },
      { reps: 3, weightKg: 90 },
      { reps: 5, weightKg: 90 },
      { reps: 8, weightKg: 70 },
      { reps: 10, weightKg: 70 },
    ]);
  });
});

describe('yearGrid', () => {
  it('lays 53 weeks of 7 days and grades the heaviest days', () => {
    const grid = yearGrid(
      [
        workout('2026-10-21T10:00:00', { totalVolumeKg: 4000 }),
        workout('2026-10-20T10:00:00', { totalVolumeKg: 900 }),
      ],
      now,
    );
    expect(grid).toHaveLength(53);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    const days = grid.flat();
    const on = (iso: string) =>
      days.find((day) => day.date.getTime() === new Date(iso).getTime());
    const wednesday = on('2026-10-21T00:00:00');
    const tuesday = on('2026-10-20T00:00:00');
    expect(wednesday?.level).toBe(4);
    expect(tuesday?.level).toBe(1);
    expect(days.at(-1)?.future).toBe(true);
  });
});

describe('periodSummary', () => {
  it('sums the period and finds the favourites', () => {
    const history = [
      workout('2026-10-21T10:00:00'),
      workout('2026-10-20T10:00:00'),
      workout('2026-10-14T10:00:00'),
    ];
    const week = periodSummary(history, [], 'week', () => undefined, now);
    expect(week).toMatchObject({
      title: 'Esta semana',
      workouts: 2,
      volumeKg: 2000,
      topMuscle: 'Peito',
      topExercise: 'Supino',
      previousWorkouts: 1,
    });
    const month = periodSummary(history, [], 'month', () => undefined, now);
    expect(month.title).toBe('Outubro de 2026');
    expect(month.workouts).toBe(3);
    const text = summaryShareText(week, 'https://forgeflow.app');
    expect(text).toContain('Minha semana de treinos · Esta semana');
    expect(text).toContain('🏋️ 2 treinos');
    expect(text.endsWith('@forgeflow\nhttps://forgeflow.app')).toBe(true);
  });
});
