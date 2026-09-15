import type { Goal, GoalStatus } from '../../domain/goals/entities';
import type { EntityId } from '../../domain/shared/types';
import type { SyncOperation, SyncState } from '../../domain/sync/entities';
import type {
  Exercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';

export type ListExercisesParams = {
  includeDeleted?: boolean;
  query?: string;
  userId?: EntityId;
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

export type ListGoalsParams = {
  includeDeleted?: boolean;
  statuses?: GoalStatus[];
  userId: EntityId;
};

export interface ExerciseRepository {
  findExerciseById(id: EntityId): Promise<Exercise | null>;
  listExercises(params?: ListExercisesParams): Promise<Exercise[]>;
  saveExercise(exercise: Exercise): Promise<void>;
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

export interface GoalRepository {
  findGoalById(id: EntityId): Promise<Goal | null>;
  listGoals(params: ListGoalsParams): Promise<Goal[]>;
  saveGoal(goal: Goal): Promise<void>;
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
  exercises: ExerciseRepository;
  goals: GoalRepository;
  syncOperations: SyncOperationRepository;
  syncState: SyncStateRepository;
  workoutSessions: WorkoutSessionRepository;
  workouts: WorkoutRepository;
};
