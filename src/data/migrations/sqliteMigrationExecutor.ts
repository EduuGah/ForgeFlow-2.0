import type { AppliedMigration, MigrationExecutor } from './types';

export type SQLiteMigrationConnection = {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  runAsync(sql: string, params?: readonly unknown[]): Promise<unknown>;
  withTransactionAsync<T>(work: () => Promise<T>): Promise<T>;
};

type SQLiteAppliedMigrationRow = {
  appliedAt: string;
  checksum: string;
  id: string;
  name: string;
};

export function createSQLiteMigrationExecutor(
  database: SQLiteMigrationConnection,
): MigrationExecutor {
  return {
    ensureMigrationTable: () =>
      database.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
      `),
    execute: (statement) => database.execAsync(statement),
    getAppliedMigrations: () =>
      database.getAllAsync<SQLiteAppliedMigrationRow>(`
        SELECT
          id,
          name,
          checksum,
          applied_at AS appliedAt
        FROM schema_migrations
        ORDER BY id ASC;
      `),
    recordMigration: async (migration: AppliedMigration) => {
      await database.runAsync(
        `
          INSERT INTO schema_migrations (id, name, checksum, applied_at)
          VALUES (?, ?, ?, ?);
        `,
        [migration.id, migration.name, migration.checksum, migration.appliedAt],
      );
    },
    runInTransaction: (work) => database.withTransactionAsync(work),
  };
}
