import type { Database, SqlValue } from 'sql.js';

import type { SQLiteMigrationConnection } from '../migrations/sqliteMigrationExecutor';

export class SqlJsConnection implements SQLiteMigrationConnection {
  private transactionDepth = 0;

  constructor(private readonly database: Database) {}

  async execAsync(sql: string) {
    this.database.run(sql);
  }

  async getAllAsync<T>(sql: string, params: readonly unknown[] = []) {
    const statement = this.database.prepare(sql);
    try {
      statement.bind(toSqlValues(params));
      const rows: T[] = [];
      while (statement.step()) rows.push(statement.getAsObject() as T);
      return rows;
    } finally {
      statement.free();
    }
  }

  async runAsync(sql: string, params: readonly unknown[] = []) {
    this.database.run(sql, toSqlValues(params));
  }

  async withTransactionAsync<T>(work: () => Promise<T>) {
    if (this.transactionDepth > 0) return work();

    this.database.run('BEGIN');
    this.transactionDepth += 1;
    try {
      const result = await work();
      this.database.run('COMMIT');
      return result;
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    } finally {
      this.transactionDepth -= 1;
    }
  }
}

function toSqlValues(values: readonly unknown[]) {
  return values.map((value) => value as SqlValue);
}
