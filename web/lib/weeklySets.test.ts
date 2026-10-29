import type { CompletedWorkout } from './types';
import {
  setsByGroup,
  toCatchUp,
  trainingDaysLeft,
  weeklySets,
} from './weeklySets';

// Thursday: Monday–Wednesday are gone, 4 days left (Thu–Sun).
const now = new Date('2026-10-29T12:00:00');

const MUSCLES: Record<string, { primary: string; secondary: string[] }> = {
  supino: { primary: 'Peito', secondary: ['Triceps', 'Ombros'] },
  remada: { primary: 'Costas', secondary: ['Biceps', 'Trapezio'] },
  esteira: { primary: 'Cardio', secondary: [] },
};

const workout = (
  completedAt: string,
  exercises: [string, number][],
  cardioMinutes = 0,
): CompletedWorkout => ({
  id: completedAt,
  name: 'Treino',
  startedAt: completedAt,
  completedAt,
  durationMinutes: 60,
  totalVolumeKg: 0,
  totalSets: 0,
  prsAchieved: [],
  exercises: [
    ...exercises.map(([exerciseId, sets]) => ({
      exerciseId,
      exerciseName: exerciseId,
      primaryMuscleGroup: MUSCLES[exerciseId].primary,
      setsCount: sets,
      bestWeightKg: 0,
      totalVolumeKg: 0,
      sets: Array.from({ length: sets }, () => ({
        type: 'working' as const,
        weightKg: 60,
        repetitions: 8,
      })),
    })),
    ...(cardioMinutes
      ? [
          {
            exerciseId: 'esteira',
            exerciseName: 'Esteira',
            primaryMuscleGroup: 'Cardio',
            setsCount: 1,
            bestWeightKg: 0,
            totalVolumeKg: 0,
            sets: [
              {
                type: 'working' as const,
                weightKg: 0,
                repetitions: 0,
                durationSeconds: cardioMinutes * 60,
              },
            ],
          },
        ]
      : []),
  ],
});

const compute = (history: CompletedWorkout[], trainingDays = 4) =>
  weeklySets({
    history,
    active: null,
    musclesOf: (id) => (id ? (MUSCLES[id] ?? null) : null),
    targets: { Peito: 10, Costas: 10, Biceps: 6, Triceps: 6, Ombros: 0 },
    cardioTarget: 150,
    trainingDays,
    now,
  });

describe('weekly sets', () => {
  it('counts 1 for the main muscle and ½ for synergists', () => {
    expect(
      Object.fromEntries(
        setsByGroup({ primary: 'Peito', secondary: ['Triceps', 'Ombros'] }, 4),
      ),
    ).toEqual({ Peito: 4, Triceps: 2, Ombros: 2 });
    // Glutes on a leg exercise belong to the same group: not counted twice.
    expect(
      Object.fromEntries(
        setsByGroup({ primary: 'Pernas', secondary: ['Gluteos'] }, 3),
      ),
    ).toEqual({ Pernas: 3 });
    expect(setsByGroup({ primary: 'Cardio', secondary: [] }, 2).size).toBe(0);
  });

  it('adds up this week only, with cardio minutes apart', () => {
    const week = compute([
      workout('2026-10-27T18:00:00', [['supino', 4]], 30),
      workout('2026-10-28T18:00:00', [['remada', 4]]),
      workout('2026-10-20T18:00:00', [['supino', 10]]), // last week
    ]);
    const byGroup = Object.fromEntries(
      week.groups.map((item) => [item.group, item.done]),
    );
    expect(byGroup).toEqual({ Peito: 4, Costas: 4, Biceps: 2, Triceps: 2 });
    expect(week.groups.map((item) => item.group)).not.toContain('Ombros');
    expect(week.cardio).toEqual({ target: 150, minutes: 30 });
    expect(week.target).toBe(32);
  });

  it('flags what is behind and how much per workout makes up for it', () => {
    const week = compute([workout('2026-10-26T18:00:00', [['supino', 8]])], 2);
    const peito = week.groups.find((item) => item.group === 'Peito')!;
    const costas = week.groups.find((item) => item.group === 'Costas')!;
    expect(peito).toMatchObject({ remaining: 2, status: 'onTrack' });
    expect(costas).toMatchObject({
      remaining: 10,
      status: 'behind',
      perDay: 5,
    });
    expect(toCatchUp(week)[0].group).toBe('Costas');

    const done = compute([workout('2026-10-26T18:00:00', [['supino', 12]])]);
    expect(done.groups.find((item) => item.group === 'Peito')?.status).toBe(
      'done',
    );
  });

  it('counts the training days left from the weekly plan', () => {
    // Plan: Monday, Wednesday, Friday (0 = Sunday).
    const plan = [null, 'a', null, 'b', null, 'c', null];
    expect(trainingDaysLeft(plan, now, false)).toBe(1);
    expect(trainingDaysLeft(null, now, false)).toBe(4);
    expect(trainingDaysLeft(null, now, true)).toBe(3);
  });
});
