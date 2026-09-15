import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  SyncOperationRepository,
  SyncStateRepository,
} from '../ports/repositories';
import type {
  SyncChangeApplier,
  SyncConflict,
  SyncProtocolRequest,
  SyncRemoteGateway,
  SyncRequestOperation,
  SyncTransactionRunner,
} from '../ports/sync';

export const defaultSyncScope = 'default';
export const defaultSyncStateKey = 'main';

export type SynchronizeDeviceParams = {
  batchSize?: number;
  deviceId: EntityId;
  now?: () => ISODateTimeString;
  scope?: string;
  stateKey?: string;
};

export type SynchronizeDeviceDependencies = {
  changes: SyncChangeApplier;
  operations: SyncOperationRepository;
  remote: SyncRemoteGateway;
  state: SyncStateRepository;
  transaction: SyncTransactionRunner;
};

export type SynchronizeDeviceResult = {
  acceptedOperationIds: EntityId[];
  appliedChangeCount: number;
  conflictCount: number;
  nextCursor: string;
  sentOperationCount: number;
};

export class SyncRemoteError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable: boolean }) {
    super(message);
    this.name = 'SyncRemoteError';
    this.retryable = options.retryable;
  }
}

export async function synchronizeDevice(
  params: SynchronizeDeviceParams,
  dependencies: SynchronizeDeviceDependencies,
): Promise<SynchronizeDeviceResult> {
  const now = params.now ?? (() => new Date().toISOString());
  const attemptedAt = now();
  const scope = params.scope ?? defaultSyncScope;
  const stateKey = params.stateKey ?? defaultSyncStateKey;
  const [syncState, pendingOperations] = await Promise.all([
    dependencies.state.getSyncState(scope, stateKey),
    dependencies.operations.listPendingSyncOperations(params.batchSize),
  ]);

  await Promise.all(
    pendingOperations.map((operation) =>
      dependencies.operations.markSyncOperationAttempted(
        operation.operationId,
        attemptedAt,
      ),
    ),
  );

  const request = buildSyncProtocolRequest({
    deviceId: params.deviceId,
    lastServerCursor: syncState?.serverCursor ?? null,
    operations: pendingOperations,
  });

  try {
    const response = await dependencies.remote.synchronize(request);

    await dependencies.transaction.runInTransaction(async () => {
      await Promise.all(
        response.accepted.map((accepted) =>
          dependencies.operations.markSyncOperationCompleted(
            accepted.operationId,
          ),
        ),
      );

      await Promise.all(
        response.conflicts.map((conflict) =>
          handleConflict(conflict, dependencies.operations, attemptedAt),
        ),
      );

      await dependencies.changes.applyRemoteChanges(response.changes);

      await dependencies.state.saveSyncState({
        key: stateKey,
        lastError: null,
        lastSuccessAt: attemptedAt,
        scope,
        serverCursor: response.nextCursor,
      });
    });

    return {
      acceptedOperationIds: response.accepted.map(
        (accepted) => accepted.operationId,
      ),
      appliedChangeCount: response.changes.length,
      conflictCount: response.conflicts.length,
      nextCursor: response.nextCursor,
      sentOperationCount: pendingOperations.length,
    };
  } catch (error) {
    await dependencies.state.saveSyncState({
      key: stateKey,
      lastError: getErrorMessage(error),
      lastSuccessAt: syncState?.lastSuccessAt ?? null,
      scope,
      serverCursor: syncState?.serverCursor ?? null,
    });

    throw error;
  }
}

function buildSyncProtocolRequest(params: {
  deviceId: EntityId;
  lastServerCursor: string | null;
  operations: SyncOperation[];
}): SyncProtocolRequest {
  return {
    deviceId: params.deviceId,
    lastServerCursor: params.lastServerCursor,
    operations: params.operations.map(toRequestOperation),
  };
}

function toRequestOperation(operation: SyncOperation): SyncRequestOperation {
  return {
    entityId: operation.entityId,
    entityType: operation.entityType,
    operationId: operation.operationId,
    operationType: operation.operationType,
    payload: operation.payload,
  };
}

async function handleConflict(
  conflict: SyncConflict,
  operations: SyncOperationRepository,
  attemptedAt: string,
) {
  if (conflict.retryable) {
    return;
  }

  await operations.markSyncOperationFailed(
    conflict.operationId,
    `${conflict.code}: ${conflict.message}`,
    attemptedAt,
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown sync error';
}
