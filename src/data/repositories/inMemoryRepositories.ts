import type { Goal } from '../../domain/goals/entities';
import type { EntityId } from '../../domain/shared/types';
import type { SyncOperation, SyncState } from '../../domain/sync/entities';
import type {
  Exercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';
import type {
  ExerciseRepository,
  GoalRepository,
  ListExercisesParams,
  ListGoalsParams,
  ListWorkoutSessionsParams,
  ListWorkoutTemplatesParams,
  RepositoryProvider,
  SyncOperationRepository,
  SyncStateRepository,
  WorkoutRepository,
  WorkoutSessionRepository,
} from '../../application/ports/repositories';

export type InMemoryRepositorySeed = Partial<{
  exercises: Exercise[];
  goals: Goal[];
  syncOperations: SyncOperation[];
  syncStates: SyncState[];
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
}>;

class InMemoryForgeFlowRepository
  implements
    ExerciseRepository,
    GoalRepository,
    SyncOperationRepository,
    SyncStateRepository,
    WorkoutRepository,
    WorkoutSessionRepository
{
  private exercises: Exercise[];
  private goals: Goal[];
  private syncOperations: SyncOperation[];
  private syncStates: SyncState[];
  private workoutSessions: WorkoutSession[];
  private workoutTemplates: WorkoutTemplate[];

  constructor(seed: InMemoryRepositorySeed = {}) {
    this.exercises = seed.exercises ?? [];
    this.goals = seed.goals ?? [];
    this.syncOperations = seed.syncOperations ?? [];
    this.syncStates = seed.syncStates ?? [];
    this.workoutSessions = seed.workoutSessions ?? [];
    this.workoutTemplates = seed.workoutTemplates ?? [];
  }

  async countPendingSyncOperations() {
    return this.syncOperations.filter(
      (operation) => operation.status === 'pending',
    ).length;
  }

  async enqueueSyncOperation(operation: SyncOperation) {
    this.syncOperations = upsertById(
      this.syncOperations,
      operation,
      'operationId',
    );
  }

  async findActiveWorkoutSession(userId: EntityId) {
    const session =
      this.workoutSessions.find(
        (item) =>
          item.userId === userId &&
          item.status === 'active' &&
          item.deletedAt === null,
      ) ?? null;

    return clone(session);
  }

  async findExerciseById(id: EntityId) {
    return clone(this.exercises.find((exercise) => exercise.id === id) ?? null);
  }

  async findGoalById(id: EntityId) {
    return clone(this.goals.find((goal) => goal.id === id) ?? null);
  }

  async findWorkoutTemplateById(id: EntityId) {
    return clone(
      this.workoutTemplates.find((workout) => workout.id === id) ?? null,
    );
  }

  async listExercises(params: ListExercisesParams = {}) {
    const query = params.query?.trim().toLocaleLowerCase();

    return clone(
      this.exercises.filter((exercise) => {
        if (!params.includeDeleted && exercise.deletedAt !== null) {
          return false;
        }

        if (
          params.userId &&
          exercise.ownerUserId !== null &&
          exercise.ownerUserId !== params.userId
        ) {
          return false;
        }

        if (query && !exercise.name.toLocaleLowerCase().includes(query)) {
          return false;
        }

        return true;
      }),
    );
  }

  async listGoals(params: ListGoalsParams) {
    return clone(
      this.goals.filter((goal) => {
        if (goal.userId !== params.userId) {
          return false;
        }

        if (!params.includeDeleted && goal.deletedAt !== null) {
          return false;
        }

        if (params.statuses && !params.statuses.includes(goal.status)) {
          return false;
        }

        return true;
      }),
    );
  }

  async listPendingSyncOperations(limit?: number) {
    const pending = this.syncOperations.filter(
      (operation) => operation.status === 'pending',
    );

    return clone(typeof limit === 'number' ? pending.slice(0, limit) : pending);
  }

  async listWorkoutSessions(params: ListWorkoutSessionsParams) {
    const sessions = this.workoutSessions
      .filter((session) => {
        if (session.userId !== params.userId) {
          return false;
        }

        if (!params.includeDeleted && session.deletedAt !== null) {
          return false;
        }

        return true;
      })
      .slice(0, params.limit);

    return clone(sessions);
  }

  async listWorkoutTemplates(
    userId: EntityId,
    params: ListWorkoutTemplatesParams = {},
  ) {
    return clone(
      this.workoutTemplates.filter((workout) => {
        if (workout.userId !== userId) {
          return false;
        }

        if (!params.includeDeleted && workout.deletedAt !== null) {
          return false;
        }

        if (!params.includeArchived && workout.isArchived) {
          return false;
        }

        return true;
      }),
    );
  }

  async getSyncState(scope: string, key: string) {
    return clone(
      this.syncStates.find(
        (state) => state.scope === scope && state.key === key,
      ) ?? null,
    );
  }

  async markSyncOperationAttempted(operationId: EntityId, attemptedAt: string) {
    this.syncOperations = this.syncOperations.map((operation) =>
      operation.operationId === operationId
        ? {
            ...operation,
            attemptCount: operation.attemptCount + 1,
            lastAttemptAt: attemptedAt,
            lastError: null,
          }
        : operation,
    );
  }

  async markSyncOperationCompleted(operationId: EntityId) {
    this.syncOperations = this.syncOperations.map((operation) =>
      operation.operationId === operationId
        ? { ...operation, status: 'completed' }
        : operation,
    );
  }

  async markSyncOperationFailed(
    operationId: EntityId,
    error: string,
    attemptedAt: string,
  ) {
    this.syncOperations = this.syncOperations.map((operation) =>
      operation.operationId === operationId
        ? {
            ...operation,
            lastAttemptAt: attemptedAt,
            lastError: error,
            status: 'failed',
          }
        : operation,
    );
  }

  async saveExercise(exercise: Exercise) {
    this.exercises = upsertById(this.exercises, exercise, 'id');
  }

  async saveGoal(goal: Goal) {
    this.goals = upsertById(this.goals, goal, 'id');
  }

  async saveSyncState(state: SyncState) {
    this.syncStates = upsertByCompositeKey(this.syncStates, state, [
      'scope',
      'key',
    ]);
  }

  async saveWorkoutSession(session: WorkoutSession) {
    this.workoutSessions = upsertById(this.workoutSessions, session, 'id');
  }

  async saveWorkoutTemplate(workout: WorkoutTemplate) {
    this.workoutTemplates = upsertById(this.workoutTemplates, workout, 'id');
  }
}

export function createInMemoryRepositories(
  seed?: InMemoryRepositorySeed,
): RepositoryProvider {
  const repository = new InMemoryForgeFlowRepository(seed);

  return {
    exercises: repository,
    goals: repository,
    syncOperations: repository,
    syncState: repository,
    workoutSessions: repository,
    workouts: repository,
  };
}

function clone<T>(value: T): T {
  return value === null ? value : (JSON.parse(JSON.stringify(value)) as T);
}

function upsertById<T, TKey extends keyof T>(
  items: T[],
  nextItem: T,
  key: TKey,
) {
  const existingIndex = items.findIndex((item) => item[key] === nextItem[key]);

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item, index) =>
    index === existingIndex ? nextItem : item,
  );
}

function upsertByCompositeKey<T, TKey extends keyof T>(
  items: T[],
  nextItem: T,
  keys: TKey[],
) {
  const existingIndex = items.findIndex((item) =>
    keys.every((key) => item[key] === nextItem[key]),
  );

  if (existingIndex === -1) {
    return [...items, nextItem];
  }

  return items.map((item, index) =>
    index === existingIndex ? nextItem : item,
  );
}
