import type { Goal } from '../../domain/goals/entities';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';
import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import { getHomeOverview } from './getHomeOverview';

const now = '2026-09-14T12:00:00.000Z';
const userId = 'user-1';

const workout: WorkoutTemplate = {
  createdAt: now,
  deletedAt: null,
  description: null,
  exercises: [],
  id: 'workout-1',
  isArchived: false,
  name: 'Upper A',
  sortOrder: 1,
  updatedAt: now,
  userId,
};

const session: WorkoutSession = {
  completedAt: null,
  createdAt: now,
  deletedAt: null,
  durationSeconds: null,
  id: 'session-1',
  notes: null,
  startedAt: now,
  status: 'active',
  updatedAt: now,
  userId,
  workoutId: workout.id,
};

const goal: Goal = {
  baselineValue: 80,
  completedAt: null,
  createdAt: now,
  deadline: null,
  deletedAt: null,
  exerciseId: null,
  id: 'goal-1',
  metric: 'weight_kg',
  status: 'active',
  targetValue: 100,
  title: 'Supino 100kg',
  type: 'exercise_weight',
  updatedAt: now,
  userId,
};

const syncOperation: SyncOperation = {
  attemptCount: 0,
  createdAt: now,
  entityId: workout.id,
  entityType: 'workout',
  lastAttemptAt: null,
  lastError: null,
  operationId: 'sync-1',
  operationType: 'upsert',
  payload: {},
  status: 'pending',
};

describe('getHomeOverview', () => {
  it('summarizes data through repository ports', async () => {
    const repositories = createInMemoryRepositories({
      goals: [goal],
      syncOperations: [syncOperation],
      workoutSessions: [session],
      workoutTemplates: [workout],
    });

    await expect(
      getHomeOverview({ userId }, repositories),
    ).resolves.toStrictEqual({
      activeGoalCount: 1,
      activeSession: {
        id: session.id,
        startedAt: session.startedAt,
        workoutId: session.workoutId,
      },
      pendingSyncOperationCount: 1,
      savedWorkoutCount: 1,
    });
  });
});
