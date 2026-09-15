import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  SyncChangeApplier,
  SyncProtocolRequest,
  SyncProtocolResponse,
  SyncRemoteChange,
  SyncRemoteGateway,
  SyncTransactionRunner,
} from '../ports/sync';
import { synchronizeDevice, SyncRemoteError } from './synchronizeDevice';

const deviceId = 'device-offline-1';
const firstAttemptAt = '2026-09-15T13:00:00.000Z';
const secondAttemptAt = '2026-09-15T13:05:00.000Z';

describe('offline recovery sync behavior', () => {
  it('keeps offline writes pending after network failure and completes them after reconnect', async () => {
    const operation = buildOperation({
      operationId: 'offline-set-operation',
    });
    const repositories = createInMemoryRepositories({
      syncOperations: [operation],
    });
    const remote = new FlakyAcceptedOperationGateway({
      acceptedOperationId: operation.operationId,
      firstError: new SyncRemoteError('Network unavailable', {
        retryable: true,
      }),
      nextCursor: 'cursor-after-reconnect',
    });
    const changes = new RecordingChangeApplier();
    const transaction = new RecordingTransactionRunner();

    await expect(
      synchronizeDevice(
        {
          deviceId,
          now: () => firstAttemptAt,
        },
        {
          changes,
          operations: repositories.syncOperations,
          remote,
          state: repositories.syncState,
          transaction,
        },
      ),
    ).rejects.toThrow('Network unavailable');

    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        attemptCount: 1,
        lastAttemptAt: firstAttemptAt,
        operationId: operation.operationId,
        status: 'pending',
      },
    ]);

    const result = await synchronizeDevice(
      {
        deviceId,
        now: () => secondAttemptAt,
      },
      {
        changes,
        operations: repositories.syncOperations,
        remote,
        state: repositories.syncState,
        transaction,
      },
    );

    await expect(
      repositories.syncOperations.countPendingSyncOperations(),
    ).resolves.toBe(0);
    await expect(
      repositories.syncState.getSyncState('default', 'main'),
    ).resolves.toStrictEqual({
      key: 'main',
      lastError: null,
      lastSuccessAt: secondAttemptAt,
      scope: 'default',
      serverCursor: 'cursor-after-reconnect',
    });
    expect(remote.requests).toHaveLength(2);
    expect(result).toMatchObject({
      acceptedOperationIds: [operation.operationId],
      sentOperationCount: 1,
    });
  });

  it('does not duplicate server records when retrying an operation accepted before a timeout', async () => {
    const operation = buildOperation({
      entityId: 'set-offline-1',
      operationId: 'stable-operation-id',
      payload: { repetitions: 10, weightKg: 80 },
    });
    const repositories = createInMemoryRepositories({
      syncOperations: [operation],
    });
    const remote = new TimeoutAfterApplyGateway();
    const changes = new RecordingChangeApplier();
    const transaction = new RecordingTransactionRunner();

    await expect(
      synchronizeDevice(
        {
          deviceId,
          now: () => firstAttemptAt,
        },
        {
          changes,
          operations: repositories.syncOperations,
          remote,
          state: repositories.syncState,
          transaction,
        },
      ),
    ).rejects.toThrow('Timeout after server apply');

    await synchronizeDevice(
      {
        deviceId,
        now: () => secondAttemptAt,
      },
      {
        changes,
        operations: repositories.syncOperations,
        remote,
        state: repositories.syncState,
        transaction,
      },
    );

    expect(remote.appliedOperationIds).toStrictEqual(['stable-operation-id']);
    expect(remote.serverEntities.size).toBe(1);
    await expect(
      repositories.syncOperations.countPendingSyncOperations(),
    ).resolves.toBe(0);
  });

  it('collapses duplicate operation IDs in the local outbox before sync', async () => {
    const repositories = createInMemoryRepositories();
    const firstPayloadOperation = buildOperation({
      operationId: 'duplicate-operation-id',
      payload: { repetitions: 8 },
    });
    const secondPayloadOperation = buildOperation({
      operationId: 'duplicate-operation-id',
      payload: { repetitions: 9 },
    });

    await repositories.syncOperations.enqueueSyncOperation(
      firstPayloadOperation,
    );
    await repositories.syncOperations.enqueueSyncOperation(
      secondPayloadOperation,
    );

    await expect(
      repositories.syncOperations.countPendingSyncOperations(),
    ).resolves.toBe(1);

    const remote = new RecordingRequestGateway({
      accepted: [{ operationId: 'duplicate-operation-id' }],
      changes: [],
      conflicts: [],
      nextCursor: 'cursor-deduped',
    });

    await synchronizeDevice(
      {
        deviceId,
        now: () => secondAttemptAt,
      },
      {
        changes: new RecordingChangeApplier(),
        operations: repositories.syncOperations,
        remote,
        state: repositories.syncState,
        transaction: new RecordingTransactionRunner(),
      },
    );

    expect(remote.requests[0].operations).toStrictEqual([
      {
        entityId: secondPayloadOperation.entityId,
        entityType: secondPayloadOperation.entityType,
        operationId: 'duplicate-operation-id',
        operationType: secondPayloadOperation.operationType,
        payload: { repetitions: 9 },
      },
    ]);
  });

  it('applies pulled changes once after reconnect and advances the cursor', async () => {
    const repositories = createInMemoryRepositories({
      syncStates: [
        {
          key: 'main',
          lastError: null,
          lastSuccessAt: '2026-09-15T12:00:00.000Z',
          scope: 'default',
          serverCursor: null,
        },
      ],
    });
    const remoteChange: SyncRemoteChange = {
      changedAt: secondAttemptAt,
      entityId: 'workout-from-server',
      entityType: 'workout',
      operationType: 'upsert',
      payload: { name: 'Server workout' },
    };
    const remote = new CursorAwareGateway(remoteChange);
    const changes = new DeduplicatingChangeApplier();
    const transaction = new RecordingTransactionRunner();

    await synchronizeDevice(
      {
        deviceId,
        now: () => firstAttemptAt,
      },
      {
        changes,
        operations: repositories.syncOperations,
        remote,
        state: repositories.syncState,
        transaction,
      },
    );
    await synchronizeDevice(
      {
        deviceId,
        now: () => secondAttemptAt,
      },
      {
        changes,
        operations: repositories.syncOperations,
        remote,
        state: repositories.syncState,
        transaction,
      },
    );

    expect(
      remote.requests.map((request) => request.lastServerCursor),
    ).toStrictEqual([null, 'cursor-after-change']);
    expect(changes.entitiesById.size).toBe(1);
    expect(changes.applyCount).toBe(1);
    await expect(
      repositories.syncState.getSyncState('default', 'main'),
    ).resolves.toMatchObject({
      lastSuccessAt: secondAttemptAt,
      serverCursor: 'cursor-after-change',
    });
  });
});

function buildOperation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    attemptCount: 0,
    createdAt: '2026-09-15T12:30:00.000Z',
    entityId: 'set-offline-1',
    entityType: 'set',
    lastAttemptAt: null,
    lastError: null,
    operationId: 'offline-operation-1',
    operationType: 'upsert',
    payload: { repetitions: 8, weightKg: 75 },
    status: 'pending',
    ...overrides,
  };
}

class FlakyAcceptedOperationGateway implements SyncRemoteGateway {
  readonly requests: SyncProtocolRequest[] = [];
  private failed = false;

  constructor(
    private options: {
      acceptedOperationId: string;
      firstError: Error;
      nextCursor: string;
    },
  ) {}

  async synchronize(request: SyncProtocolRequest) {
    this.requests.push(request);

    if (!this.failed) {
      this.failed = true;
      throw this.options.firstError;
    }

    return {
      accepted: [{ operationId: this.options.acceptedOperationId }],
      changes: [],
      conflicts: [],
      nextCursor: this.options.nextCursor,
    };
  }
}

class TimeoutAfterApplyGateway implements SyncRemoteGateway {
  readonly appliedOperationIds: string[] = [];
  readonly requests: SyncProtocolRequest[] = [];
  readonly serverEntities = new Map<string, Record<string, unknown>>();
  private shouldTimeout = true;

  async synchronize(request: SyncProtocolRequest) {
    this.requests.push(request);

    request.operations.forEach((operation) => {
      if (!this.appliedOperationIds.includes(operation.operationId)) {
        this.appliedOperationIds.push(operation.operationId);
        this.serverEntities.set(operation.entityId, operation.payload);
      }
    });

    if (this.shouldTimeout) {
      this.shouldTimeout = false;
      throw new SyncRemoteError('Timeout after server apply', {
        retryable: true,
      });
    }

    return {
      accepted: request.operations.map((operation) => ({
        operationId: operation.operationId,
      })),
      changes: [],
      conflicts: [],
      nextCursor: 'cursor-after-timeout-retry',
    };
  }
}

class RecordingRequestGateway implements SyncRemoteGateway {
  readonly requests: SyncProtocolRequest[] = [];

  constructor(private response: SyncProtocolResponse) {}

  async synchronize(request: SyncProtocolRequest) {
    this.requests.push(request);

    return this.response;
  }
}

class CursorAwareGateway implements SyncRemoteGateway {
  readonly requests: SyncProtocolRequest[] = [];

  constructor(private change: SyncRemoteChange) {}

  async synchronize(request: SyncProtocolRequest) {
    this.requests.push(request);

    if (request.lastServerCursor === 'cursor-after-change') {
      return {
        accepted: [],
        changes: [],
        conflicts: [],
        nextCursor: 'cursor-after-change',
      };
    }

    return {
      accepted: [],
      changes: [this.change],
      conflicts: [],
      nextCursor: 'cursor-after-change',
    };
  }
}

class RecordingChangeApplier implements SyncChangeApplier {
  readonly changes: SyncRemoteChange[] = [];

  async applyRemoteChanges(changes: SyncRemoteChange[]) {
    this.changes.push(...changes);
  }
}

class DeduplicatingChangeApplier implements SyncChangeApplier {
  applyCount = 0;
  readonly entitiesById = new Map<string, SyncRemoteChange>();

  async applyRemoteChanges(changes: SyncRemoteChange[]) {
    changes.forEach((change) => {
      this.applyCount += 1;
      this.entitiesById.set(change.entityId, change);
    });
  }
}

class RecordingTransactionRunner implements SyncTransactionRunner {
  async runInTransaction<T>(work: () => Promise<T>) {
    return work();
  }
}
