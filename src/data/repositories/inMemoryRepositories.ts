import type { Achievement } from '../../domain/achievements/entities';
import type { Goal, GoalProgressEvent } from '../../domain/goals/entities';
import type { EntityId } from '../../domain/shared/types';
import type { SyncOperation, SyncState } from '../../domain/sync/entities';
import type {
  Exercise,
  ExerciseFavorite,
  PersonalRecord,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';
import type {
  AchievementRepository,
  ExerciseFavoriteRepository,
  ExerciseRepository,
  ListExerciseFavoritesParams,
  ListAchievementsParams,
  GoalRepository,
  GoalProgressEventRepository,
  ListExercisesParams,
  ListGoalsParams,
  ListGoalProgressEventsParams,
  ListSessionExercisesParams,
  ListTrainingSetsParams,
  ListWorkoutSessionsParams,
  ListWorkoutTemplatesParams,
  ListPersonalRecordsParams,
  PersonalRecordRepository,
  RepositoryProvider,
  SessionExerciseRepository,
  SyncOperationRepository,
  SyncStateRepository,
  TrainingSetRepository,
  WorkoutRepository,
  WorkoutSessionRepository,
} from '../../application/ports/repositories';

export type InMemoryRepositorySeed = Partial<{
  achievements: Achievement[];
  exerciseFavorites: ExerciseFavorite[];
  exercises: Exercise[];
  goals: Goal[];
  goalProgressEvents: GoalProgressEvent[];
  personalRecords: PersonalRecord[];
  sessionExercises: SessionExercise[];
  syncOperations: SyncOperation[];
  syncStates: SyncState[];
  trainingSets: TrainingSet[];
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
}>;

class InMemoryForgeFlowRepository
  implements
    AchievementRepository,
    ExerciseRepository,
    ExerciseFavoriteRepository,
    GoalRepository,
    GoalProgressEventRepository,
    PersonalRecordRepository,
    SessionExerciseRepository,
    SyncOperationRepository,
    SyncStateRepository,
    TrainingSetRepository,
    WorkoutRepository,
    WorkoutSessionRepository
{
  private achievements: Achievement[];
  private exerciseFavorites: ExerciseFavorite[];
  private exercises: Exercise[];
  private goals: Goal[];
  private goalProgressEvents: GoalProgressEvent[];
  private personalRecords: PersonalRecord[];
  private sessionExercises: SessionExercise[];
  private syncOperations: SyncOperation[];
  private syncStates: SyncState[];
  private trainingSets: TrainingSet[];
  private workoutSessions: WorkoutSession[];
  private workoutTemplates: WorkoutTemplate[];

  constructor(seed: InMemoryRepositorySeed = {}) {
    this.achievements = seed.achievements ?? [];
    this.exerciseFavorites = seed.exerciseFavorites ?? [];
    this.exercises = seed.exercises ?? [];
    this.goals = seed.goals ?? [];
    this.goalProgressEvents = seed.goalProgressEvents ?? [];
    this.personalRecords = seed.personalRecords ?? [];
    this.sessionExercises = seed.sessionExercises ?? [];
    this.syncOperations = seed.syncOperations ?? [];
    this.syncStates = seed.syncStates ?? [];
    this.trainingSets = seed.trainingSets ?? [];
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

  async findExerciseFavorite(userId: EntityId, exerciseId: EntityId) {
    return clone(
      this.exerciseFavorites.find(
        (favorite) =>
          favorite.userId === userId && favorite.exerciseId === exerciseId,
      ) ?? null,
    );
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
    const equipment = params.equipment?.trim().toLocaleLowerCase();
    const primaryMuscleGroup = params.primaryMuscleGroup
      ?.trim()
      .toLocaleLowerCase();

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

        if (
          query &&
          ![
            exercise.name,
            exercise.description,
            exercise.equipment,
            exercise.primaryMuscleGroup,
            ...exercise.secondaryMuscleGroups,
          ].some((value) => value?.toLocaleLowerCase().includes(query))
        ) {
          return false;
        }

        if (
          equipment &&
          exercise.equipment?.toLocaleLowerCase() !== equipment
        ) {
          return false;
        }

        if (
          primaryMuscleGroup &&
          exercise.primaryMuscleGroup.toLocaleLowerCase() !== primaryMuscleGroup
        ) {
          return false;
        }

        return true;
      }),
    );
  }

  async listAchievements(params: ListAchievementsParams) {
    return clone(
      this.achievements.filter((achievement) => {
        if (achievement.userId !== params.userId) return false;
        if (
          params.achievementTypes &&
          !params.achievementTypes.includes(achievement.achievementType)
        ) {
          return false;
        }
        return true;
      }),
    );
  }

  async listExerciseFavorites(params: ListExerciseFavoritesParams) {
    return clone(
      this.exerciseFavorites.filter((favorite) => {
        if (favorite.userId !== params.userId) {
          return false;
        }

        if (
          params.exerciseIds &&
          !params.exerciseIds.includes(favorite.exerciseId)
        ) {
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

  async listGoalProgressEvents(params: ListGoalProgressEventsParams) {
    return clone(
      this.goalProgressEvents.filter((event) => {
        if (params.goalId && event.goalId !== params.goalId) return false;
        if (params.goalIds && !params.goalIds.includes(event.goalId)) {
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

  async listPersonalRecords(params: ListPersonalRecordsParams) {
    return clone(
      this.personalRecords.filter((record) => {
        if (record.userId !== params.userId) return false;
        if (params.exerciseId && record.exerciseId !== params.exerciseId)
          return false;
        if (params.recordType && record.recordType !== params.recordType)
          return false;
        if (
          params.sourceSetIds &&
          !params.sourceSetIds.includes(record.sourceSetId)
        )
          return false;
        return true;
      }),
    );
  }

  async listSessionExercises(params: ListSessionExercisesParams) {
    return clone(
      this.sessionExercises.filter((sessionExercise) => {
        if (sessionExercise.sessionId !== params.sessionId) {
          return false;
        }

        if (!params.includeDeleted && sessionExercise.deletedAt !== null) {
          return false;
        }

        return true;
      }),
    );
  }

  async listTrainingSets(params: ListTrainingSetsParams) {
    return clone(
      this.trainingSets.filter((set) => {
        if (
          params.sessionExerciseId &&
          set.sessionExerciseId !== params.sessionExerciseId
        ) {
          return false;
        }

        if (
          params.sessionExerciseIds &&
          !params.sessionExerciseIds.includes(set.sessionExerciseId)
        ) {
          return false;
        }

        if (!params.includeDeleted && set.deletedAt !== null) {
          return false;
        }

        return true;
      }),
    );
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

  async deleteExerciseFavorite(id: EntityId) {
    this.exerciseFavorites = this.exerciseFavorites.filter(
      (favorite) => favorite.id !== id,
    );
  }

  async saveExercise(exercise: Exercise) {
    this.exercises = upsertById(this.exercises, exercise, 'id');
  }

  async saveAchievement(achievement: Achievement) {
    this.achievements = upsertByCompositeKey(this.achievements, achievement, [
      'userId',
      'achievementType',
    ]);
  }

  async saveExerciseFavorite(favorite: ExerciseFavorite) {
    this.exerciseFavorites = upsertByCompositeKey(
      this.exerciseFavorites,
      favorite,
      ['userId', 'exerciseId'],
    );
  }

  async saveGoal(goal: Goal) {
    this.goals = upsertById(this.goals, goal, 'id');
  }

  async saveGoalProgressEvent(event: GoalProgressEvent) {
    this.goalProgressEvents = upsertById(this.goalProgressEvents, event, 'id');
  }

  async savePersonalRecord(record: PersonalRecord) {
    this.personalRecords = upsertById(this.personalRecords, record, 'id');
  }

  async saveSessionExercise(sessionExercise: SessionExercise) {
    this.sessionExercises = upsertById(
      this.sessionExercises,
      sessionExercise,
      'id',
    );
  }

  async saveTrainingSet(set: TrainingSet) {
    this.trainingSets = upsertById(this.trainingSets, set, 'id');
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
    achievements: repository,
    exerciseFavorites: repository,
    exercises: repository,
    goals: repository,
    goalProgressEvents: repository,
    personalRecords: repository,
    syncOperations: repository,
    syncState: repository,
    sessionExercises: repository,
    sets: repository,
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
