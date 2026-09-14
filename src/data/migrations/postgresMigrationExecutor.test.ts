import {
  createPostgresMigrationExecutor,
  type PostgresMigrationConnection,
} from './postgresMigrationExecutor';

describe('createPostgresMigrationExecutor', () => {
  it('creates the server migration ledger and records applied migrations', async () => {
    const connection = createPostgresConnectionStub();
    const executor = createPostgresMigrationExecutor(connection);

    await executor.ensureMigrationTable();
    await executor.recordMigration({
      appliedAt: '2026-09-14T12:00:00.000Z',
      checksum: 'abc123',
      id: '0001_example',
      name: 'example',
    });

    expect(connection.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations'),
      undefined,
    );
    expect(connection.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schema_migrations'),
      ['0001_example', 'example', 'abc123', '2026-09-14T12:00:00.000Z'],
    );
  });

  it('reads applied migrations in order', async () => {
    const connection = createPostgresConnectionStub([
      {
        appliedAt: '2026-09-14T12:00:00.000Z',
        checksum: 'abc123',
        id: '0001_example',
        name: 'example',
      },
    ]);
    const executor = createPostgresMigrationExecutor(connection);

    await expect(executor.getAppliedMigrations()).resolves.toStrictEqual([
      {
        appliedAt: '2026-09-14T12:00:00.000Z',
        checksum: 'abc123',
        id: '0001_example',
        name: 'example',
      },
    ]);
    expect(connection.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('FROM schema_migrations'),
      undefined,
    );
  });

  it('commits successful transactions', async () => {
    const connection = createPostgresConnectionStub();
    const executor = createPostgresMigrationExecutor(connection);

    await expect(executor.runInTransaction(async () => 'done')).resolves.toBe(
      'done',
    );
    expect(connection.queryMock).toHaveBeenNthCalledWith(1, 'BEGIN', undefined);
    expect(connection.queryMock).toHaveBeenLastCalledWith('COMMIT', undefined);
  });

  it('rolls back failed transactions', async () => {
    const connection = createPostgresConnectionStub();
    const executor = createPostgresMigrationExecutor(connection);

    await expect(
      executor.runInTransaction(async () => {
        throw new Error('failure');
      }),
    ).rejects.toThrow('failure');
    expect(connection.queryMock).toHaveBeenNthCalledWith(1, 'BEGIN', undefined);
    expect(connection.queryMock).toHaveBeenLastCalledWith(
      'ROLLBACK',
      undefined,
    );
  });
});

function createPostgresConnectionStub<T>(rows: T[] = []) {
  const queryMock = jest.fn();

  return {
    query: async <TRow>(sql: string, params?: readonly unknown[]) => {
      queryMock(sql, params);

      return {
        rows: rows as unknown as TRow[],
      };
    },
    queryMock,
  } satisfies PostgresMigrationConnection & {
    queryMock: jest.Mock;
  };
}
