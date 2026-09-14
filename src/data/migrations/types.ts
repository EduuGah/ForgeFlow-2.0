export type MigrationScope = 'local' | 'server';

export type MigrationDefinition = {
  id: string;
  name: string;
  scope: MigrationScope;
  statements: readonly string[];
};

export type AppliedMigration = {
  appliedAt: string;
  checksum: string;
  id: string;
  name: string;
};

export type MigrationExecutor = {
  ensureMigrationTable(): Promise<void>;
  execute(statement: string): Promise<void>;
  getAppliedMigrations(): Promise<AppliedMigration[]>;
  recordMigration(migration: AppliedMigration): Promise<void>;
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
};

export type MigrationRunResult = {
  applied: AppliedMigration[];
  skipped: AppliedMigration[];
};
