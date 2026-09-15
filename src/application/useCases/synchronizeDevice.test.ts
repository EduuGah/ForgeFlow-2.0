import type { SyncOperation, SyncState } from '../../domain/sync/entities';
import type {
  SyncChangeApplier,
  SyncProtocolRequest,
  SyncProtocolResponse,
  SyncRemoteGateway,
  SyncTransactionRunner,
} from '../ports/sync';
import { synchronizeDevice, SyncRemoteError } from './synchronizeDevice';
import type {
  SyncOperationRepository,
  SyncStateRepository,
} from '../ports/repositories';

const attemptedAt = '2026-09-15T12:00:00.000Z';

describe('synchronizeDevice', () => {
  it('pushes pending operations with the stored cursor and applies the response transactionally', async () => {
    const operation = buildOperation({ operationId: 'operation-1' });
    const dependencies = createSyncDependencies({
      operations: [operation],
      response: {
        accepted: [{ operationId: operation.operationId }],
        changes: [
          {
            changedAt: '2026-09-15T12:00:01.000Z',
            entityId: 'remote-workout',
            entityType: 'workout',
            operationType: 'upsert',
            payload: { name: 'Remote workout' },
          },
        ],
        conflicts: [],
        nextCursor: 'cursor-2',
      },
      state: {
        key: 'main',
        lastError: null,
        lastSuccessAt: '2026-09-15T11:00:00.000Z',
        scope: 'default',
        serverCursor: 'cursor-1',
      },
    });

    const result = await synchronizeDevice(
      {
        deviceId: 'device-1',
        now: () => attemptedAt,
      },
      dependencies,
    );

    expect(dependencies.remote.requests).toStrictEqual([
      {
        deviceId: 'device-1',
        lastServerCursor: 'cursor-1',
        operations: [
          {
            entityId: operation.entityId,
            entityType: operation.entityType,
            operationId: operation.operationId,
            operationType: operation.operationType,
            payload: operation.payload,
          },
        ],
      },
    ]);
    expect(
      dependencies.operations.operationsById.get('operation-1'),
    ).toMatchObject({
      lastAttemptAt: attemptedAt,
      status: 'completed',
    });
    expect(dependencies.changes.appliedChanges).toHaveLength(1);
    expect(dependencies.state.savedStates.at(-1)).toStrictEqual({
      key: 'main',
      lastError: null,
      lastSuccessAt: attemptedAt,
      scope: 'default',
      serverCursor: 'cursor-2',
    });
    expect(dependencies.transaction.runCount).toBe(1);
    expect(result).toStrictEqual({
      acceptedOperationIds: ['operation-1'],
      appliedChangeCount: 1,
      conflictCount: 0,
      nextCursor: 'cursor-2',
      sentOperationCount: 1,
    });
  });

  it('pulls changes even when there are no pending operations', async () => {
    const dependencies = createSyncDependencies({
      response: {
        accepted: [],
        changes: [],
        conflicts: [],
        nextCursor: 'cursor-next',
      },
    });

    await synchronizeDevice(
      {
        deviceId: 'device-1',
        now: () => attemptedAt,
      },
      dependencies,
    );

    expect(dependencies.remote.requests[0]).toMatchObject({
      lastServerCursor: null,
      operations: [],
    });
    expect(dependencies.state.savedStates.at(-1)?.serverCursor).toBe(
      'cursor-next',
    );
  });

  it('marks non-retryable conflicts as failed without completing retryable conflicts', async () => {
    const retryableOperation = buildOperation({ operationId: 'operation-1' });
    const failedOperation = buildOperation({ operationId: 'operation-2' });
    const dependencies = createSyncDependencies({
      operations: [retryableOperation, failedOperation],
      response: {
        accepted: [],
        changes: [],
        conflicts: [
          {
            code: 'temporary_unavailable',
            entityId: retryableOperation.entityId,
            entityType: retryableOperation.entityType,
            message: 'Retry later',
            operationId: retryableOperation.operationId,
            retryable: true,
          },
          {
            code: 'validation_error',
            entityId: failedOperation.entityId,
            entityType: failedOperation.entityType,
            message: 'Invalid payload',
            operationId: failedOperation.operationId,
            retryable: false,
          },
        ],
        nextCursor: 'cursor-conflict',
      },
    });

    await synchronizeDevice(
      {
        deviceId: 'device-1',
        now: () => attemptedAt,
      },
      dependencies,
    );

    expect(
      dependencies.operations.operationsById.get(
        retryableOperation.operationId,
      ),
    ).toMatchObject({
      attemptCount: 1,
      status: 'pending',
    });
    expect(
      dependencies.operations.operationsById.get(failedOperation.operationId),
    ).toMatchObject({
      lastError: 'validation_error: Invalid payload',
      status: 'failed',
    });
  });

  it('preserves pending operations and stores sync error when the remote call fails', async () => {
    const operation = buildOperation({ operationId: 'operation-1' });
    const dependencies = createSyncDependencies({
      error: new SyncRemoteError('Network unavailable', { retryable: true }),
      operations: [operation],
      state: {
        key: 'main',
        lastError: null,
        lastSuccessAt: '2026-09-15T11:00:00.000Z',
        scope: 'default',
        serverCursor: 'cursor-1',
      },
    });

    await expect(
      synchronizeDevice(
        {
          deviceId: 'device-1',
          now: () => attemptedAt,
        },
        dependencies,
      ),
    ).rejects.toThrow('Network unavailable');

    expect(
      dependencies.operations.operationsById.get('operation-1'),
    ).toMatchObject({
      attemptCount: 1,
      lastAttemptAt: attemptedAt,
      status: 'pending',
    });
    expect(dependencies.state.savedStates.at(-1)).toStrictEqual({
      key: 'main',
      lastError: 'Network unavailable',
      lastSuccessAt: '2026-09-15T11:00:00.000Z',
      scope: 'default',
      serverCursor: 'cursor-1',
    });
  });
});

function buildOperation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    attemptCount: 0,
    createdAt: '2026-09-15T10:00:00.000Z',
    entityId: 'entity-1',
    entityType: 'set',
    lastAttemptAt: null,
    lastError: null,
    operationId: 'operation-1',
    operationType: 'upsert',
    payload: { repetitions: 8 },
    status: 'pending',
    ...overrides,
  };
}

function createSyncDependencies(
  options: {
    error?: Error;
    operations?: SyncOperation[];
    response?: SyncProtocolResponse;
    state?: SyncState | null;
  } = {},
) {
  const operations = new InMemorySyncOperationRepository(
    options.operations ?? [],
  );
  const state = new InMemorySyncStateRepository(options.state ?? null);
  const remote = new RecordingSyncRemoteGateway(
    options.response,
    options.error,
  );
  const changes = new RecordingSyncChangeApplier();
  const transaction = new RecordingSyncTransactionRunner();

  return {
    changes,
    operations,
    remote,
    state,
    transaction,
  };
}

class InMemorySyncOperationRepository implements SyncOperationRepository {
  readonly operationsById = new Map<string, SyncOperation>();

  constructor(operations: SyncOperation[]) {
    operations.forEach((operation) => {
      this.operationsById.set(operation.operationId, operation);
    });
  }

  async countPendingSyncOperations() {
    return [...this.operationsById.values()].filter(
      (operation) => operation.status === 'pending',
    ).length;
  }

  async enqueueSyncOperation(operation: SyncOperation) {
    this.operationsById.set(operation.operationId, operation);
  }

  async listPendingSyncOperations(limit?: number) {
    const pending = [...this.operationsById.values()].filter(
      (operation) => operation.status === 'pending',
    );

    return limit ? pending.slice(0, limit) : pending;
  }

  async markSyncOperationAttempted(operationId: string, attemptedAt: string) {
    const operation = this.get(operationId);
    this.operationsById.set(operationId, {
      ...operation,
      attemptCount: operation.attemptCount + 1,
      lastAttemptAt: attemptedAt,
      lastError: null,
    });
  }

  async markSyncOperationCompleted(operationId: string) {
    const operation = this.get(operationId);
    this.operationsById.set(operationId, {
      ...operation,
      status: 'completed',
    });
  }

  async markSyncOperationFailed(
    operationId: string,
    error: string,
    attemptedAt: string,
  ) {
    const operation = this.get(operationId);
    this.operationsById.set(operationId, {
      ...operation,
      lastAttemptAt: attemptedAt,
      lastError: error,
      status: 'failed',
    });
  }

  private get(operationId: string) {
    const operation = this.operationsById.get(operationId);

    if (!operation) {
      throw new Error(`Missing operation ${operationId}`);
    }

    return operation;
  }
}

class InMemorySyncStateRepository implements SyncStateRepository {
  readonly savedStates: SyncState[] = [];

  constructor(private state: SyncState | null) {}

  async getSyncState() {
    return this.state;
  }

  async saveSyncState(state: SyncState) {
    this.state = state;
    this.savedStates.push(state);
  }
}

class RecordingSyncRemoteGateway implements SyncRemoteGateway {
  readonly requests: SyncProtocolRequest[] = [];

  constructor(
    private response: SyncProtocolResponse = {
      accepted: [],
      changes: [],
      conflicts: [],
      nextCursor: 'cursor-next',
    },
    private error?: Error,
  ) {}

  async synchronize(request: SyncProtocolRequest) {
    this.requests.push(request);

    if (this.error) {
      throw this.error;
    }

    return this.response;
  }
}

class RecordingSyncChangeApplier implements SyncChangeApplier {
  readonly appliedChanges: unknown[] = [];

  async applyRemoteChanges(changes: unknown[]) {
    this.appliedChanges.push(...changes);
  }
}

class RecordingSyncTransactionRunner implements SyncTransactionRunner {
  runCount = 0;

  async runInTransaction<T>(work: () => Promise<T>) {
    this.runCount += 1;

    return work();
  }
}
