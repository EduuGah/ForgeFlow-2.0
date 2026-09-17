import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type {
  Exercise,
  PersonalRecord,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
} from '../../domain/training/entities';
import { getTrainingAnalytics } from './trainingAnalytics';

const now = '2026-09-10T12:00:00.000Z';

describe('getTrainingAnalytics', () => {
  it('loads owned completed sessions and returns export-ready analytics', async () => {
    const repositories = createInMemoryRepositories({
      exercises: [exercise],
      personalRecords: [record],
      sessionExercises: [sessionExercise],
      trainingSets: [workingSet, warmupSet],
      workoutSessions: [session, otherUserSession],
    });

    const result = await getTrainingAnalytics(
      {
        period: {
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-30T23:59:59.999Z',
        },
        userId: 'user-1',
      },
      repositories,
    );

    expect(result.summary).toMatchObject({
      personalRecordCount: 1,
      repetitions: 8,
      volume: 640,
      workingSetCount: 1,
      workoutCount: 1,
    });
    expect(result.exercises).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

const exercise: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: null,
  equipment: 'Barra',
  id: 'bench',
  isSystem: true,
  name: 'Supino reto',
  ownerUserId: null,
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Triceps'],
  updatedAt: now,
};

const session: WorkoutSession = {
  completedAt: now,
  createdAt: now,
  deletedAt: null,
  durationSeconds: 3_600,
  id: 'session-1',
  notes: null,
  startedAt: '2026-09-10T11:00:00.000Z',
  status: 'completed',
  updatedAt: now,
  userId: 'user-1',
  workoutId: null,
};

const otherUserSession: WorkoutSession = {
  ...session,
  id: 'session-other',
  userId: 'user-2',
};

const sessionExercise: SessionExercise = {
  createdAt: now,
  deletedAt: null,
  exerciseId: exercise.id,
  id: 'session-exercise-1',
  position: 1,
  sessionId: session.id,
  updatedAt: now,
};

const workingSet: TrainingSet = {
  completedAt: now,
  createdAt: now,
  deletedAt: null,
  id: 'set-1',
  notes: null,
  repetitions: 8,
  restSeconds: 90,
  sessionExerciseId: sessionExercise.id,
  setNumber: 1,
  setType: 'working',
  updatedAt: now,
  weightKg: 80,
};

const warmupSet: TrainingSet = {
  ...workingSet,
  id: 'set-2',
  setNumber: 2,
  setType: 'warmup',
  weightKg: 40,
};

const record: PersonalRecord = {
  achievedAt: now,
  contextWeightKg: null,
  createdAt: now,
  exerciseId: exercise.id,
  id: 'record-1',
  recordType: 'weight',
  sourceSetId: workingSet.id,
  updatedAt: now,
  userId: 'user-1',
  value: 80,
};
