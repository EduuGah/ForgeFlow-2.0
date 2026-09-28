import type { SQLiteBindParams, SQLiteDatabase } from 'expo-sqlite';

import type { SQLiteMigrationConnection } from '../migrations/sqliteMigrationExecutor';

export function createExpoSQLiteConnection(
  database: SQLiteDatabase,
): SQLiteMigrationConnection {
  let transactionDepth = 0;

  return {
    execAsync: (sql) => database.execAsync(sql),
    getAllAsync: (sql, params = []) =>
      database.getAllAsync(sql, params as unknown as SQLiteBindParams),
    runAsync: (sql, params = []) =>
      database.runAsync(sql, params as unknown as SQLiteBindParams),
    withTransactionAsync: async <T>(work: () => Promise<T>) => {
      if (transactionDepth > 0) {
        return work();
      }

      let result: T | undefined;
      await database.withTransactionAsync(async () => {
        transactionDepth += 1;
        try {
          result = await work();
        } finally {
          transactionDepth -= 1;
        }
      });
      return result as T;
    },
  };
}
