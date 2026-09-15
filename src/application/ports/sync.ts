import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type {
  SyncEntityType,
  SyncOperationType,
} from '../../domain/sync/entities';

export type SyncRequestOperation = {
  entityId: EntityId;
  entityType: SyncEntityType;
  operationId: EntityId;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
};

export type SyncProtocolRequest = {
  deviceId: EntityId;
  lastServerCursor: string | null;
  operations: SyncRequestOperation[];
};

export type SyncAcceptedOperation = {
  operationId: EntityId;
};

export type SyncConflict = {
  code: string;
  entityId: EntityId;
  entityType: SyncEntityType;
  message: string;
  operationId: EntityId;
  retryable: boolean;
};

export type SyncRemoteChange = {
  changedAt: ISODateTimeString;
  entityId: EntityId;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
};

export type SyncProtocolResponse = {
  accepted: SyncAcceptedOperation[];
  changes: SyncRemoteChange[];
  conflicts: SyncConflict[];
  nextCursor: string;
};

export interface SyncRemoteGateway {
  synchronize(request: SyncProtocolRequest): Promise<SyncProtocolResponse>;
}

export interface SyncChangeApplier {
  applyRemoteChanges(changes: SyncRemoteChange[]): Promise<void>;
}

export interface SyncTransactionRunner {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
