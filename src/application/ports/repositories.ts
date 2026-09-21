import type {
  Goal,
  GoalProgressEvent,
  GoalStatus,
} from '../../domain/goals/entities';
import type { EntityId } from '../../domain/shared/types';
import type { SyncOperation, SyncState } from '../../domain/sync/entities';
import type {
  Exercise,
  ExerciseFavorite,
  PersonalRecord,
  PersonalRecordType,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';

export type ListExercisesParams = {
  equipment?: string;
  includeDeleted?: boolean;
  primaryMuscleGroup?: string;
  query?: string;
  userId?: EntityId;
};

export type ListExerciseFavoritesParams = {
  exerciseIds?: EntityId[];
  userId: EntityId;
};

export type ListWorkoutTemplatesParams = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type ListWorkoutSessionsParams = {
  includeDeleted?: boolean;
  limit?: number;
  userId: EntityId;
};

export type ListSessionExercisesParams = {
  includeDeleted?: boolean;
  sessionId: EntityId;
};

export type ListTrainingSetsParams = {
  includeDeleted?: boolean;
  sessionExerciseId?: EntityId;
  sessionExerciseIds?: EntityId[];
};

export type ListPersonalRecordsParams = {
  exerciseId?: EntityId;
  recordType?: PersonalRecordType;
  sourceSetIds?: EntityId[];
  userId: EntityId;
};

export type ListGoalsParams = {
  includeDeleted?: boolean;
  statuses?: GoalStatus[];
  userId: EntityId;
};

export type ListGoalProgressEventsParams = {
  goalId?: EntityId;
  goalIds?: EntityId[];
};

export interface ExerciseRepository {
  findExerciseById(id: EntityId): Promise<Exercise | null>;
  listExercises(params?: ListExercisesParams): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<void>;
}

export interface ExerciseFavoriteRepository {
  deleteExerciseFavorite(id: EntityId): Promise<void>;
  findExerciseFavorite(
    userId: EntityId,
    exerciseId: EntityId,
  ): Promise<ExerciseFavorite | null>;
  listExerciseFavorites(
    params: ListExerciseFavoritesParams,
  ): Promise<ExerciseFavorite[]>;
  saveExerciseFavorite(favorite: ExerciseFavorite): Promise<void>;
}

export interface WorkoutRepository {
  findWorkoutTemplateById(id: EntityId): Promise<WorkoutTemplate | null>;
  listWorkoutTemplates(
    userId: EntityId,
    params?: ListWorkoutTemplatesParams,
  ): Promise<WorkoutTemplate[]>;
  saveWorkoutTemplate(workout: WorkoutTemplate): Promise<void>;
}

export interface WorkoutSessionRepository {
  findActiveWorkoutSession(userId: EntityId): Promise<WorkoutSession | null>;
  listWorkoutSessions(
    params: ListWorkoutSessionsParams,
  ): Promise<WorkoutSession[]>;
  saveWorkoutSession(session: WorkoutSession): Promise<void>;
}

export interface SessionExerciseRepository {
  listSessionExercises(
    params: ListSessionExercisesParams,
  ): Promise<SessionExercise[]>;
  saveSessionExercise(sessionExercise: SessionExercise): Promise<void>;
}

export interface TrainingSetRepository {
  listTrainingSets(params: ListTrainingSetsParams): Promise<TrainingSet[]>;
  saveTrainingSet(set: TrainingSet): Promise<void>;
}

export interface PersonalRecordRepository {
  listPersonalRecords(
    params: ListPersonalRecordsParams,
  ): Promise<PersonalRecord[]>;
  savePersonalRecord(record: PersonalRecord): Promise<void>;
}

export interface GoalRepository {
  findGoalById(id: EntityId): Promise<Goal | null>;
  listGoals(params: ListGoalsParams): Promise<Goal[]>;
  saveGoal(goal: Goal): Promise<void>;
}

export interface GoalProgressEventRepository {
  listGoalProgressEvents(
    params: ListGoalProgressEventsParams,
  ): Promise<GoalProgressEvent[]>;
  saveGoalProgressEvent(event: GoalProgressEvent): Promise<void>;
}

export interface SyncOperationRepository {
  countPendingSyncOperations(): Promise<number>;
  enqueueSyncOperation(operation: SyncOperation): Promise<void>;
  listPendingSyncOperations(limit?: number): Promise<SyncOperation[]>;
  markSyncOperationAttempted(
    operationId: EntityId,
    attemptedAt: string,
  ): Promise<void>;
  markSyncOperationCompleted(operationId: EntityId): Promise<void>;
  markSyncOperationFailed(
    operationId: EntityId,
    error: string,
    attemptedAt: string,
  ): Promise<void>;
}

export interface SyncStateRepository {
  getSyncState(scope: string, key: string): Promise<SyncState | null>;
  saveSyncState(state: SyncState): Promise<void>;
}

export type RepositoryProvider = {
  exerciseFavorites: ExerciseFavoriteRepository;
  exercises: ExerciseRepository;
  goals: GoalRepository;
  goalProgressEvents: GoalProgressEventRepository;
  personalRecords: PersonalRecordRepository;
  syncOperations: SyncOperationRepository;
  syncState: SyncStateRepository;
  sessionExercises: SessionExerciseRepository;
  sets: TrainingSetRepository;
  workoutSessions: WorkoutSessionRepository;
  workouts: WorkoutRepository;
};
