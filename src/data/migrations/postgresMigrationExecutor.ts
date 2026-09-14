import type { AppliedMigration, MigrationExecutor } from './types';

export type PostgresQueryResult<T> = {
  rows: T[];
};

export type PostgresMigrationConnection = {
  query<T>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<PostgresQueryResult<T>>;
};

type PostgresAppliedMigrationRow = {
  appliedAt: string;
  checksum: string;
  id: string;
  name: string;
};

export function createPostgresMigrationExecutor(
  database: PostgresMigrationConnection,
): MigrationExecutor {
  return {
    ensureMigrationTable: async () => {
      await database.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id text PRIMARY KEY,
          name text NOT NULL,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL
        );
      `);
    },
    execute: async (statement) => {
      await database.query(statement);
    },
    getAppliedMigrations: async () => {
      const result = await database.query<PostgresAppliedMigrationRow>(`
        SELECT
          id,
          name,
          checksum,
          applied_at AS "appliedAt"
        FROM schema_migrations
        ORDER BY id ASC;
      `);

      return result.rows;
    },
    recordMigration: async (migration: AppliedMigration) => {
      await database.query(
        `
          INSERT INTO schema_migrations (id, name, checksum, applied_at)
          VALUES ($1, $2, $3, $4);
        `,
        [migration.id, migration.name, migration.checksum, migration.appliedAt],
      );
    },
    runInTransaction: async (work) => {
      await database.query('BEGIN');

      try {
        const result = await work();
        await database.query('COMMIT');

        return result;
      } catch (error) {
        await database.query('ROLLBACK');
        throw error;
      }
    },
  };
}
