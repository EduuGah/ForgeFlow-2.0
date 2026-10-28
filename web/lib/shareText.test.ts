import { shareDate, workoutShareText } from './shareText';
import type { CompletedWorkout } from './types';

const workout = {
  id: 'w1',
  name: 'Upper B',
  startedAt: new Date(2026, 9, 22, 20, 13).toISOString(),
  completedAt: new Date(2026, 9, 22, 21, 20).toISOString(),
  durationMinutes: 67,
  totalVolumeKg: 0,
  totalSets: 0,
  prsAchieved: [],
  exercises: [
    {
      exerciseName: 'Supino Inclinado (Halter)',
      setsCount: 4,
      bestWeightKg: 60,
      totalVolumeKg: 0,
      sets: [
        { type: 'warmup', weightKg: 40, repetitions: 6 },
        { type: 'working', weightKg: 52, repetitions: 10 },
        { type: 'working', weightKg: 60, repetitions: 4 },
        { type: 'working', weightKg: 60, repetitions: 5 },
      ],
    },
    {
      exerciseName: 'Tríceps na Polia Unilateral (Cabo)',
      setsCount: 2,
      bestWeightKg: 12.5,
      totalVolumeKg: 0,
      sets: [
        { type: 'working', weightKg: 12.5, repetitions: 6 },
        { type: 'working', weightKg: 10, repetitions: 10 },
      ],
    },
    {
      exerciseName: 'Barra fixa',
      setsCount: 1,
      bestWeightKg: 0,
      totalVolumeKg: 0,
      sets: [{ type: 'working', weightKg: 0, repetitions: 12 }],
    },
    {
      exerciseName: 'Esteira',
      setsCount: 1,
      bestWeightKg: 0,
      totalVolumeKg: 0,
      sets: [
        {
          type: 'working',
          weightKg: 0,
          repetitions: 0,
          distanceKm: 2.5,
          durationSeconds: 900,
        },
      ],
    },
    {
      exerciseName: 'Remada antiga',
      setsCount: 3,
      bestWeightKg: 70,
      totalVolumeKg: 0,
    },
  ],
} as CompletedWorkout;

describe('workout as text', () => {
  it('formats the date like the shared model', () => {
    expect(shareDate(new Date(2026, 9, 22, 20, 13).toISOString())).toBe(
      'quinta-feira, out 22, 2026 às 8:13pm',
    );
    expect(shareDate(new Date(2026, 0, 4, 0, 5).toISOString())).toBe(
      'domingo, jan 4, 2026 às 12:05am',
    );
  });

  it('lists every set in the shared model', () => {
    expect(workoutShareText(workout, 'https://forgeflow.app')).toBe(
      [
        'Upper B',
        'quinta-feira, out 22, 2026 às 8:13pm',
        '',
        'Supino Inclinado (Halter)',
        'Série 1: 40 kg x 6 [Aquecimento]',
        'Série 2: 52 kg x 10',
        'Série 3: 60 kg x 4',
        'Série 4: 60 kg x 5',
        '',
        'Tríceps na Polia Unilateral (Cabo)',
        'Série 1: 12.5 kg x 6',
        'Série 2: 10 kg x 10',
        '',
        'Barra fixa',
        'Série 1: 12 reps',
        '',
        'Esteira',
        'Série 1: 2.5 km · 15:00',
        '',
        'Remada antiga',
        '3 séries · melhor 70 kg',
        '',
        '@forgeflow',
        'https://forgeflow.app',
      ].join('\n'),
    );
  });
});
