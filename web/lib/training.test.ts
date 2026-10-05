import { timestampFromLegacyId } from './dates';
import {
  adjustRest,
  normalizeRestTimer,
  restRemainingMs,
  startRest,
  toggleRestPause,
} from './rest';
import {
  alignPreviousSets,
  buildCompletedWorkout,
  computeStreakWeeks,
  dedupeRecords,
  detectPersonalRecords,
  goalCurrentValue,
  hydrationDate,
  itemsOnDay,
  mergeById,
  previousSetsFor,
  repairExerciseRefs,
  setLabels,
  suggestNextTemplate,
  summarizeActiveWorkout,
  weekTrainingDays,
} from './training';
import type {
  ActiveWorkoutState,
  CompletedWorkout,
  GoalItem,
  HydrationLog,
  PersonalRecordItem,
} from './types';

const BENCH = '00000000-0000-4000-8000-000000001017';

function activeWorkout(): ActiveWorkoutState {
  return {
    id: 'session-1',
    name: 'Upper A',
    templateId: 'tmpl-1',
    startedAt: '2026-09-21T20:00:00.000Z',
    exercises: [
      {
        exerciseId: BENCH,
        exerciseName: 'Supino reto com barra',
        primaryMuscleGroup: 'Peito',
        equipment: 'Barra',
        restSeconds: 90,
        notes: '  pegada fechada  ',
        sets: [
          {
            id: 'a',
            setNumber: 1,
            setType: 'warmup',
            weightKg: 40,
            repetitions: 10,
            completed: true,
          },
          {
            id: 'b',
            setNumber: 2,
            setType: 'working',
            weightKg: 60,
            repetitions: 8,
            completed: true,
          },
          {
            id: 'c',
            setNumber: 3,
            setType: 'working',
            weightKg: 62.5,
            repetitions: 6,
            completed: true,
          },
          {
            id: 'd',
            setNumber: 4,
            setType: 'working',
            weightKg: 100,
            repetitions: 5,
            completed: false,
          },
        ],
      },
    ],
  };
}

function workoutOn(
  iso: string,
  overrides: Partial<CompletedWorkout> = {},
): CompletedWorkout {
  return {
    id: `hist-${iso}`,
    name: 'Treino',
    startedAt: iso,
    completedAt: iso,
    durationMinutes: 60,
    totalVolumeKg: 1000,
    totalSets: 10,
    exercises: [],
    prsAchieved: [],
    ...overrides,
  };
}

describe('active workout metrics', () => {
  it('labels warm-ups as A and numbers only working sets', () => {
    expect(setLabels(activeWorkout().exercises[0].sets)).toEqual([
      'A',
      '1',
      '2',
      '3',
    ]);
  });

  it('excludes warm-ups and unfinished sets from live volume', () => {
    const summary = summarizeActiveWorkout(activeWorkout());
    expect(summary.volumeKg).toBe(60 * 8 + 62.5 * 6);
    expect(summary.completedSets).toBe(2);
    expect(summary.totalSets).toBe(4);
  });
});

describe('buildCompletedWorkout', () => {
  it('keeps per-set detail and working-set totals', () => {
    const workout = buildCompletedWorkout(
      activeWorkout(),
      new Date('2026-09-21T21:30:00.000Z'),
      'hist-1',
    );
    expect(workout.durationMinutes).toBe(90);
    expect(workout.totalVolumeKg).toBe(855);
    expect(workout.totalSets).toBe(2);
    expect(workout.totalReps).toBe(14);
    expect(workout.templateId).toBe('tmpl-1');
    expect(workout.exercises[0].notes).toBe('pegada fechada');
    expect(workout.exercises[0].sets).toEqual([
      { type: 'warmup', weightKg: 40, repetitions: 10 },
      { type: 'working', weightKg: 60, repetitions: 8 },
      { type: 'working', weightKg: 62.5, repetitions: 6 },
    ]);
  });

  it('drops exercises without completed sets', () => {
    const active = activeWorkout();
    active.exercises[0].sets = active.exercises[0].sets.map((set) => ({
      ...set,
      completed: false,
    }));
    expect(
      buildCompletedWorkout(active, new Date(), 'x').exercises,
    ).toHaveLength(0);
  });
});

describe('detectPersonalRecords', () => {
  const workout = buildCompletedWorkout(
    activeWorkout(),
    new Date('2026-09-21T21:30:00.000Z'),
    'hist-1',
  );

  it('ignores warm-up sets and records weight, 1RM and set volume', () => {
    const { achieved } = detectPersonalRecords(workout, []);
    const byType = Object.fromEntries(
      achieved.map((record) => [record.type, record.value]),
    );
    expect(byType.weight).toBe(62.5);
    expect(byType.volume).toBe(480);
    expect(byType.estimated_1rm).toBe(76);
  });

  it('only reports values that beat the previous best and reuses a stable id', () => {
    const first = detectPersonalRecords(workout, []);
    const again = detectPersonalRecords(workout, first.records);
    expect(again.achieved).toHaveLength(0);
    expect(new Set(first.records.map((record) => record.id)).size).toBe(
      first.records.length,
    );
  });

  it('reports legacy record ids that were superseded', () => {
    const legacy: PersonalRecordItem = {
      id: 'pr-1726000000000-00000000',
      exerciseId: BENCH,
      exerciseName: 'Supino',
      type: 'weight',
      value: 50,
      unit: 'kg',
      date: 'Hoje',
    };
    const result = detectPersonalRecords(workout, [legacy]);
    expect(result.replacedIds).toEqual([legacy.id]);
    expect(
      result.records.filter((record) => record.type === 'weight'),
    ).toHaveLength(1);
  });

  it('dedupes legacy duplicates keeping the best value', () => {
    const base = {
      exerciseId: BENCH,
      exerciseName: 'Supino',
      type: 'weight' as const,
      unit: 'kg',
      date: 'Hoje',
    };
    const deduped = dedupeRecords([
      { ...base, id: 'pr-1', value: 60 },
      { ...base, id: 'pr-2', value: 65 },
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].value).toBe(65);
  });
});

describe('history helpers', () => {
  it('returns the previous per-set performance for an exercise', () => {
    const workout = buildCompletedWorkout(
      activeWorkout(),
      new Date('2026-09-21T21:30:00.000Z'),
      'hist-1',
    );
    expect(
      previousSetsFor([workout], BENCH, 'Supino reto com barra')?.[1],
    ).toEqual({
      type: 'working',
      weightKg: 60,
      repetitions: 8,
    });
  });

  it('ignores failed attempts and cardio entries as "previous"', () => {
    const base = buildCompletedWorkout(
      activeWorkout(),
      new Date('2026-09-21T21:30:00.000Z'),
      'hist-1',
    );
    const workout = {
      ...base,
      exercises: base.exercises.map((exercise) => ({
        ...exercise,
        sets: [
          {
            type: 'working' as const,
            weightKg: 140,
            repetitions: 0,
            tag: 'failure' as const,
          },
          ...(exercise.sets ?? []),
        ],
      })),
    };
    const previous = previousSetsFor([workout], BENCH, 'Supino reto com barra');
    expect(previous?.every((set) => set.repetitions > 0)).toBe(true);
    expect(previous?.[0].weightKg).not.toBe(140);
  });

  it('pairs previous sets by type and position', () => {
    const previous = [
      { type: 'warmup' as const, weightKg: 40, repetitions: 10 },
      { type: 'working' as const, weightKg: 60, repetitions: 8 },
      { type: 'working' as const, weightKg: 62.5, repetitions: 6 },
    ];
    const aligned = alignPreviousSets(
      [
        { setType: 'working' },
        { setType: 'working' },
        { setType: 'working' },
        { setType: 'warmup' },
      ],
      previous,
    );
    expect(aligned.map((set) => set?.weightKg ?? null)).toEqual([
      60,
      62.5,
      null,
      40,
    ]);
  });

  it('counts consecutive training weeks without breaking on the current week', () => {
    const now = new Date(2026, 8, 30, 12); // Wednesday
    const history = [
      workoutOn(new Date(2026, 8, 24, 18).toISOString()), // last week
      workoutOn(new Date(2026, 8, 16, 18).toISOString()), // two weeks ago
      workoutOn(new Date(2026, 8, 1, 18).toISOString()), // gap before this
    ];
    expect(computeStreakWeeks(history, now)).toBe(2);
    expect(
      computeStreakWeeks(
        [workoutOn(new Date(2026, 8, 29, 7).toISOString()), ...history],
        now,
      ),
    ).toBe(3);
    expect(computeStreakWeeks([], now)).toBe(0);
  });

  it('flags trained days of the current Monday-based week', () => {
    const now = new Date(2026, 8, 30, 12);
    const days = weekTrainingDays(
      [workoutOn(new Date(2026, 8, 28, 9).toISOString())],
      now,
    );
    expect(days).toEqual([true, false, false, false, false, false, false]);
  });

  it('suggests the routine done least recently, never-done first', () => {
    const templates = [
      { id: 't1', name: 'A', description: '', exercises: [] },
      { id: 't2', name: 'B', description: '', exercises: [] },
    ];
    const history = [
      workoutOn('2026-09-20T10:00:00.000Z', { templateId: 't1', name: 'A' }),
    ];
    expect(suggestNextTemplate(templates, history)?.id).toBe('t2');
  });
});

describe('daily logs', () => {
  it('recovers the date of legacy logs from their id', () => {
    expect(timestampFromLegacyId('h-1727712000000')).toBe(1727712000000);
    expect(timestampFromLegacyId('goal-1')).toBeNull();
  });

  it('only counts logs from the requested day', () => {
    const today = new Date(2026, 8, 30, 15);
    const logs: HydrationLog[] = [
      {
        id: 'h-a',
        amountMl: 250,
        timestamp: '10:00',
        loggedAt: new Date(2026, 8, 30, 10).toISOString(),
      },
      {
        id: 'h-b',
        amountMl: 500,
        timestamp: '22:00',
        loggedAt: new Date(2026, 8, 29, 22).toISOString(),
      },
      {
        id: `h-${new Date(2026, 8, 30, 8).getTime()}`,
        amountMl: 300,
        timestamp: '08:00',
      },
    ];
    const todays = itemsOnDay(logs, hydrationDate, today);
    expect(todays.map((log) => log.amountMl)).toEqual([250, 300]);
  });
});

describe('goals', () => {
  it('derives frequency goals from the current week', () => {
    const goal: GoalItem = {
      id: 'g',
      title: '4x',
      type: 'frequency',
      currentValue: 0,
      targetValue: 4,
      unit: 'treinos/sem',
      status: 'active',
    };
    const now = new Date(2026, 8, 30, 12);
    const history = [
      workoutOn(new Date(2026, 8, 29, 9).toISOString()),
      workoutOn(new Date(2026, 8, 30, 9).toISOString()),
      workoutOn(new Date(2026, 8, 20, 9).toISOString()),
    ];
    expect(goalCurrentValue(goal, history, [], now)).toBe(2);
  });

  it('derives linked exercise goals from weight records', () => {
    const goal: GoalItem = {
      id: 'g',
      title: 'Supino 100',
      type: 'exercise_weight',
      currentValue: 0,
      targetValue: 100,
      unit: 'kg',
      status: 'active',
      exerciseId: BENCH,
    };
    const record: PersonalRecordItem = {
      id: 'r',
      exerciseId: BENCH,
      exerciseName: 'Supino',
      type: 'weight',
      value: 82.5,
      unit: 'kg',
      date: '2026-09-21',
    };
    expect(goalCurrentValue(goal, [], [record])).toBe(82.5);
  });
});

describe('mergeById', () => {
  it('keeps local-only items, prefers remote copies and respects pending deletes', () => {
    const local = [
      { id: '1', v: 'local' },
      { id: '2', v: 'offline' },
      { id: '3', v: 'deleted' },
    ];
    const remote = [
      { id: '1', v: 'remote' },
      { id: '3', v: 'remote' },
    ];
    const { merged, localOnly } = mergeById(local, remote, new Set(['3']));
    expect(merged).toEqual([
      { id: '1', v: 'remote' },
      { id: '2', v: 'offline' },
    ]);
    expect(localOnly).toEqual([{ id: '2', v: 'offline' }]);
  });
});

describe('rest timer', () => {
  it('derives remaining time from the deadline', () => {
    const timer = startRest(90, 1_000);
    expect(restRemainingMs(timer, 31_000)).toBe(60_000);
    expect(restRemainingMs(timer, 200_000)).toBe(0);
  });

  it('pauses, resumes and adjusts without losing time', () => {
    const paused = toggleRestPause(startRest(60, 0), 20_000);
    expect(restRemainingMs(paused, 999_999)).toBe(40_000);
    const resumed = toggleRestPause(paused, 100_000);
    expect(restRemainingMs(resumed, 110_000)).toBe(30_000);
    expect(restRemainingMs(adjustRest(resumed, 15, 110_000), 110_000)).toBe(
      45_000,
    );
    expect(restRemainingMs(adjustRest(resumed, -120, 110_000), 110_000)).toBe(
      1_000,
    );
  });

  it('migrates the old ticking timer shape to idle', () => {
    expect(
      normalizeRestTimer({ isActive: true, remainingSeconds: 30 }).status,
    ).toBe('idle');
  });
});

describe('repairExerciseRefs', () => {
  const catalog: Record<string, string> = {
    '00000000-0000-4000-8000-000000001037': 'Supino reto com barra',
    '00000000-0000-4000-8000-000000001017': 'Remada na maquina',
  };
  const lookup = (id: string) => catalog[id];

  it('moves legacy seed routines and records to the right catalog exercise', () => {
    const templates = [
      {
        id: 'tmpl-1',
        name: 'A',
        description: '',
        exercises: [
          {
            exerciseId: '00000000-0000-4000-8000-000000001017',
            exerciseName: 'Supino reto com barra',
            targetSets: 4,
            targetReps: 8,
            restSeconds: 90,
          },
        ],
      },
    ];
    const records: PersonalRecordItem[] = [
      {
        id: 'pr-1',
        exerciseId: '00000000-0000-4000-8000-000000001037',
        exerciseName: 'Triceps na polia alta (corda)',
        type: 'weight',
        value: 25,
        unit: 'kg',
        date: 'Hoje',
      },
    ];
    const result = repairExerciseRefs(templates, records, lookup);
    expect(result.templates[0].exercises[0].exerciseId).toBe(
      '00000000-0000-4000-8000-000000001037',
    );
    expect(result.records[0].exerciseId).toBe(
      '00000000-0000-4000-8000-000000001116',
    );
    expect(result.changedTemplates).toHaveLength(1);
    expect(result.changedRecords).toHaveLength(1);
  });

  it('keeps ids whose catalog name matches, including real "Remada na maquina" records', () => {
    const records: PersonalRecordItem[] = [
      {
        id: 'pr-2',
        exerciseId: '00000000-0000-4000-8000-000000001017',
        exerciseName: 'Remada na máquina',
        type: 'weight',
        value: 50,
        unit: 'kg',
        date: 'Hoje',
      },
    ];
    const result = repairExerciseRefs([], records, lookup);
    expect(result.changedRecords).toHaveLength(0);
    expect(result.records).toBe(records);
  });
});
