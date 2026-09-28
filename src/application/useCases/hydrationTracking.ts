import type { RepositoryProvider } from '../ports/repositories';
import type {
  HydrationEntry,
  HydrationGoal,
  HydrationReminderContext,
  HydrationSummary,
} from '../../domain/hydration/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type {
  SyncOperation,
  SyncOperationType,
} from '../../domain/sync/entities';

type HydrationRepositories = Pick<
  RepositoryProvider,
  'hydrationEntries' | 'hydrationGoals' | 'syncOperations'
>;

export type HydrationDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: HydrationRepositories;
};

export class HydrationInputError extends Error {}

export async function recordHydration(
  input: {
    amountMl: number;
    recordedAt: ISODateTimeString;
    userId: EntityId;
  },
  dependencies: HydrationDependencies,
) {
  validateTimestamp(input.recordedAt);
  const now = dependencies.clock();
  const entry: HydrationEntry = {
    amountMl: positiveMl(input.amountMl, 'A quantidade'),
    createdAt: now,
    deletedAt: null,
    id: dependencies.generateId(),
    recordedAt: input.recordedAt,
    updatedAt: now,
    userId: input.userId,
  };
  await dependencies.repositories.hydrationEntries.saveHydrationEntry(entry);
  await queueSync(entry, 'hydration_entry', 'upsert', dependencies);
  return entry;
}

export async function deleteHydrationEntry(
  input: { entryId: EntityId; userId: EntityId },
  dependencies: HydrationDependencies,
) {
  const existing =
    await dependencies.repositories.hydrationEntries.findHydrationEntryById(
      input.entryId,
    );
  if (!existing || existing.userId !== input.userId || existing.deletedAt) {
    throw new Error('Hydration entry not found.');
  }
  const now = dependencies.clock();
  const deleted = { ...existing, deletedAt: now, updatedAt: now };
  await dependencies.repositories.hydrationEntries.saveHydrationEntry(deleted);
  await queueSync(deleted, 'hydration_entry', 'delete', dependencies);
  return deleted;
}

export async function setHydrationGoal(
  input: { targetMl: number | null; userId: EntityId },
  dependencies: HydrationDependencies,
) {
  const existing =
    await dependencies.repositories.hydrationGoals.findHydrationGoalByUserId(
      input.userId,
      true,
    );
  const now = dependencies.clock();
  if (input.targetMl === null) {
    if (!existing || existing.deletedAt) return null;
    const deleted = { ...existing, deletedAt: now, updatedAt: now };
    await dependencies.repositories.hydrationGoals.saveHydrationGoal(deleted);
    await queueSync(deleted, 'hydration_goal', 'delete', dependencies);
    return null;
  }
  const goal: HydrationGoal = {
    createdAt: existing?.createdAt ?? now,
    deletedAt: null,
    id: existing?.id ?? dependencies.generateId(),
    targetMl: positiveMl(input.targetMl, 'A meta'),
    updatedAt: now,
    userId: input.userId,
  };
  await dependencies.repositories.hydrationGoals.saveHydrationGoal(goal);
  await queueSync(goal, 'hydration_goal', 'upsert', dependencies);
  return goal;
}

export async function listHydrationHistory(
  input: {
    from?: ISODateTimeString;
    to?: ISODateTimeString;
    userId: EntityId;
  },
  repositories: HydrationRepositories,
) {
  const entries =
    await repositories.hydrationEntries.listHydrationEntries(input);
  const goal = await repositories.hydrationGoals.findHydrationGoalByUserId(
    input.userId,
  );
  const totalMl = entries.reduce((total, entry) => total + entry.amountMl, 0);
  const summary: HydrationSummary = {
    entryCount: entries.length,
    goal,
    progress: goal ? Math.min(totalMl / goal.targetMl, 1) : null,
    remainingMl: goal ? Math.max(goal.targetMl - totalMl, 0) : null,
    totalMl,
  };
  return { entries, summary };
}

export async function getHydrationReminderContext(
  input: {
    from: ISODateTimeString;
    to: ISODateTimeString;
    userId: EntityId;
  },
  repositories: HydrationRepositories,
): Promise<HydrationReminderContext> {
  const { entries, summary } = await listHydrationHistory(input, repositories);
  return {
    lastRecordedAt: entries[0]?.recordedAt ?? null,
    remainingMl: summary.remainingMl,
    shouldRemind: summary.goal !== null && (summary.remainingMl ?? 0) > 0,
    targetMl: summary.goal?.targetMl ?? null,
    totalMl: summary.totalMl,
  };
}

function positiveMl(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new HydrationInputError(
      `${label} deve ser um numero inteiro maior que zero.`,
    );
  }
  return value;
}

function validateTimestamp(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    throw new HydrationInputError('Informe uma data e horario validos.');
  }
}

async function queueSync(
  payload: HydrationEntry | HydrationGoal,
  entityType: 'hydration_entry' | 'hydration_goal',
  operationType: SyncOperationType,
  dependencies: HydrationDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: payload.id,
    entityType,
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType,
    payload: { ...payload },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
