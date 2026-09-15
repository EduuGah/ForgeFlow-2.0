import type { EntityId, ISODateTimeString } from '../shared/types';

export type SyncEntityType =
  | 'body_weight_entry'
  | 'exercise'
  | 'goal'
  | 'hydration_entry'
  | 'meal'
  | 'media'
  | 'notification_preference'
  | 'session_exercise'
  | 'set'
  | 'user'
  | 'user_profile'
  | 'workout'
  | 'workout_exercise'
  | 'workout_session';

export type SyncOperationType = 'delete' | 'upsert';

export type SyncOperationStatus =
  'completed' | 'failed' | 'pending' | 'processing';

export type SyncOperation = {
  attemptCount: number;
  createdAt: ISODateTimeString;
  entityId: EntityId;
  entityType: SyncEntityType;
  lastAttemptAt: ISODateTimeString | null;
  lastError: string | null;
  operationId: EntityId;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  status: SyncOperationStatus;
};

export type SyncState = {
  key: string;
  lastError: string | null;
  lastSuccessAt: ISODateTimeString | null;
  scope: string;
  serverCursor: string | null;
};
