import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import {
  deleteHydrationEntry,
  getHydrationReminderContext,
  listHydrationHistory,
  recordHydration,
  setHydrationGoal,
} from './hydrationTracking';

const now = '2026-09-27T18:00:00.000Z';

describe('hydration tracking', () => {
  it('records water offline and queues synchronization', async () => {
    const dependencies = createDependencies();
    const entry = await recordHydration(
      {
        amountMl: 350,
        recordedAt: '2026-09-27T15:30:00.000Z',
        userId: 'user-1',
      },
      dependencies,
    );

    expect(entry).toMatchObject({ amountMl: 350, userId: 'user-1' });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
  });

  it('lists daily history newest first and calculates goal progress', async () => {
    const dependencies = createDependencies();
    await setHydrationGoal({ targetMl: 2000, userId: 'user-1' }, dependencies);
    await recordHydration(
      {
        amountMl: 500,
        recordedAt: '2026-09-27T12:00:00.000Z',
        userId: 'user-1',
      },
      dependencies,
    );
    await recordHydration(
      {
        amountMl: 350,
        recordedAt: '2026-09-27T20:00:00.000Z',
        userId: 'user-1',
      },
      dependencies,
    );

    await expect(
      listHydrationHistory(
        {
          from: '2026-09-27T00:00:00.000Z',
          to: '2026-09-27T23:59:59.999Z',
          userId: 'user-1',
        },
        dependencies.repositories,
      ),
    ).resolves.toMatchObject({
      entries: [
        { amountMl: 350, recordedAt: '2026-09-27T20:00:00.000Z' },
        { amountMl: 500, recordedAt: '2026-09-27T12:00:00.000Z' },
      ],
      summary: {
        entryCount: 2,
        progress: 0.425,
        remainingMl: 1150,
        totalMl: 850,
      },
    });
  });

  it('provides deterministic reminder data and disables it at the target', async () => {
    const dependencies = createDependencies();
    await setHydrationGoal({ targetMl: 500, userId: 'user-1' }, dependencies);
    await recordHydration(
      { amountMl: 500, recordedAt: now, userId: 'user-1' },
      dependencies,
    );

    await expect(
      getHydrationReminderContext(
        {
          from: '2026-09-27T00:00:00.000Z',
          to: '2026-09-27T23:59:59.999Z',
          userId: 'user-1',
        },
        dependencies.repositories,
      ),
    ).resolves.toEqual({
      lastRecordedAt: now,
      remainingMl: 0,
      shouldRemind: false,
      targetMl: 500,
      totalMl: 500,
    });
  });

  it('validates input and preserves deleted entries as tombstones', async () => {
    const dependencies = createDependencies();
    await expect(
      recordHydration(
        { amountMl: 0, recordedAt: now, userId: 'user-1' },
        dependencies,
      ),
    ).rejects.toThrow('maior que zero');
    const entry = await recordHydration(
      { amountMl: 250, recordedAt: now, userId: 'user-1' },
      dependencies,
    );
    await deleteHydrationEntry(
      { entryId: entry.id, userId: 'user-1' },
      dependencies,
    );

    await expect(
      dependencies.repositories.hydrationEntries.listHydrationEntries({
        userId: 'user-1',
      }),
    ).resolves.toEqual([]);
    await expect(
      dependencies.repositories.hydrationEntries.findHydrationEntryById(
        entry.id,
      ),
    ).resolves.toMatchObject({ deletedAt: now });
  });
});

function createDependencies() {
  let sequence = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories(),
  };
}
