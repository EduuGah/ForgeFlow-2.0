import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { Goal } from '../../domain/goals/entities';
import type {
  PersonalRecord,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
} from '../../domain/training/entities';
import { evaluateAchievements, listAchievementCatalog } from './achievements';

const now = '2026-09-21T12:00:00.000Z';
const userId = 'user-1';

describe('achievement evaluation', () => {
  it('unlocks all eligible tiers once and queues them for offline sync', async () => {
    const seed = buildSeed();
    const repositories = createInMemoryRepositories(seed);
    let sequence = 0;
    const dependencies = {
      clock: () => now,
      generateId: () => `generated-${++sequence}`,
      repositories,
    };

    const firstEvaluation = await evaluateAchievements(
      { userId },
      dependencies,
    );
    const secondEvaluation = await evaluateAchievements(
      { userId },
      dependencies,
    );
    const catalog = await listAchievementCatalog({ userId }, repositories);

    expect(firstEvaluation.map((item) => item.achievementType)).toEqual([
      'first_workout',
      'first_personal_record',
      'workout_streak_3_weeks',
      'workout_count_10',
      'volume_10000_kg',
      'goals_completed_1',
      'estimated_1rm_growth_5',
      'estimated_1rm_growth_10',
      'estimated_1rm_growth_25',
    ]);
    expect(secondEvaluation).toEqual([]);
    expect(catalog.filter((item) => item.achievement)).toHaveLength(9);
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(9);
    await expect(
      repositories.achievements.listAchievements({ userId }),
    ).resolves.toHaveLength(9);
  });
});

function buildSeed() {
  const completedAt = [
    '2026-09-01T12:00:00.000Z',
    '2026-09-02T12:00:00.000Z',
    '2026-09-03T12:00:00.000Z',
    '2026-09-07T12:00:00.000Z',
    '2026-09-08T12:00:00.000Z',
    '2026-09-09T12:00:00.000Z',
    '2026-09-14T12:00:00.000Z',
    '2026-09-15T12:00:00.000Z',
    '2026-09-16T12:00:00.000Z',
    '2026-09-17T12:00:00.000Z',
  ];
  const workoutSessions = completedAt.map(workoutSession);
  const sessionExercises = workoutSessions.map(sessionExercise);
  const trainingSets = sessionExercises.map(trainingSet);

  return {
    goals: [completedGoal],
    personalRecords,
    sessionExercises,
    trainingSets,
    workoutSessions,
  };
}

function workoutSession(completedAt: string, index: number): WorkoutSession {
  return {
    completedAt,
    createdAt: completedAt,
    deletedAt: null,
    durationSeconds: 3_600,
    id: `session-${index}`,
    notes: null,
    startedAt: completedAt,
    status: 'completed',
    updatedAt: completedAt,
    userId,
    workoutId: null,
  };
}

function sessionExercise(
  session: WorkoutSession,
  index: number,
): SessionExercise {
  return {
    createdAt: session.completedAt ?? now,
    deletedAt: null,
    exerciseId: 'bench',
    id: `session-exercise-${index}`,
    position: 1,
    sessionId: session.id,
    updatedAt: session.completedAt ?? now,
  };
}

function trainingSet(exercise: SessionExercise, index: number): TrainingSet {
  return {
    completedAt: exercise.createdAt,
    createdAt: exercise.createdAt,
    deletedAt: null,
    id: `set-${index}`,
    notes: null,
    repetitions: 10,
    restSeconds: 90,
    sessionExerciseId: exercise.id,
    setNumber: 1,
    setType: 'working',
    updatedAt: exercise.createdAt,
    weightKg: 100,
  };
}

const completedGoal: Goal = {
  baselineValue: 0,
  completedAt: now,
  createdAt: now,
  deadline: null,
  deletedAt: null,
  exerciseId: null,
  id: 'goal-1',
  metric: 'custom_value',
  status: 'completed',
  targetValue: 1,
  title: 'Primeira meta',
  type: 'custom',
  updatedAt: now,
  userId,
};

const personalRecords: PersonalRecord[] = [
  personalRecord('record-1', 'estimated_1rm', 100, '2026-09-01T12:00:00.000Z'),
  personalRecord('record-2', 'estimated_1rm', 125, '2026-09-17T12:00:00.000Z'),
];

function personalRecord(
  id: string,
  recordType: PersonalRecord['recordType'],
  value: number,
  achievedAt: string,
): PersonalRecord {
  return {
    achievedAt,
    contextWeightKg: null,
    createdAt: achievedAt,
    exerciseId: 'bench',
    id,
    recordType,
    sourceSetId: `source-${id}`,
    updatedAt: achievedAt,
    userId,
    value,
  };
}
