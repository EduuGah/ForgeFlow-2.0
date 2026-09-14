import { createSQLiteMigrationExecutor } from './sqliteMigrationExecutor';
import type { SQLiteMigrationConnection } from './sqliteMigrationExecutor';

describe('createSQLiteMigrationExecutor', () => {
  it('creates the local migration ledger and records applied migrations', async () => {
    const connection = createSQLiteConnectionStub();
    const executor = createSQLiteMigrationExecutor(connection);

    await executor.ensureMigrationTable();
    await executor.recordMigration({
      appliedAt: '2026-09-14T12:00:00.000Z',
      checksum: 'abc123',
      id: '0001_example',
      name: 'example',
    });

    expect(connection.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'),
    );
    expect(connection.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      ['0001_example', 'example', 'abc123', '2026-09-14T12:00:00.000Z'],
    );
  });

  it('reads applied migrations in order', async () => {
    const connection = createSQLiteConnectionStub([
      {
        appliedAt: '2026-09-14T12:00:00.000Z',
        checksum: 'abc123',
        id: '0001_example',
        name: 'example',
      },
    ]);
    const executor = createSQLiteMigrationExecutor(connection);

    await expect(executor.getAppliedMigrations()).resolves.toStrictEqual([
      {
        appliedAt: '2026-09-14T12:00:00.000Z',
        checksum: 'abc123',
        id: '0001_example',
        name: 'example',
      },
    ]);
    expect(connection.getAllAsyncMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM schema_migrations'),
      undefined,
    );
  });

  it('delegates transactions to the SQLite connection', async () => {
    const connection = createSQLiteConnectionStub();
    const executor = createSQLiteMigrationExecutor(connection);

    await expect(executor.runInTransaction(async () => 'done')).resolves.toBe(
      'done',
    );
    expect(connection.withTransactionAsyncMock).toHaveBeenCalledTimes(1);
  });
});

function createSQLiteConnectionStub<T>(rows: T[] = []) {
  const getAllAsyncMock = jest.fn();
  const withTransactionAsyncMock = jest.fn();

  return {
    execAsync: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    getAllAsync: async <TRow>(sql: string, params?: readonly unknown[]) => {
      getAllAsyncMock(sql, params);

      return rows as unknown as TRow[];
    },
    getAllAsyncMock,
    runAsync: jest
      .fn<Promise<unknown>, [string, readonly unknown[] | undefined]>()
      .mockResolvedValue(undefined),
    withTransactionAsync: async <TResult>(work: () => Promise<TResult>) => {
      withTransactionAsyncMock(work);

      return work();
    },
    withTransactionAsyncMock,
  } satisfies SQLiteMigrationConnection & {
    getAllAsyncMock: jest.Mock;
    withTransactionAsyncMock: jest.Mock;
  };
}
