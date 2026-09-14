import type {
  AppliedMigration,
  MigrationDefinition,
  MigrationExecutor,
} from './types';
import {
  calculateMigrationChecksum,
  MigrationChecksumMismatchError,
  runMigrations,
  UnknownAppliedMigrationError,
} from './migrationRunner';

const firstMigration: MigrationDefinition = {
  id: '0001_create_users',
  name: 'create users',
  scope: 'local',
  statements: ['CREATE TABLE users (id TEXT PRIMARY KEY);'],
};

const secondMigration: MigrationDefinition = {
  id: '0002_create_workouts',
  name: 'create workouts',
  scope: 'local',
  statements: ['CREATE TABLE workouts (id TEXT PRIMARY KEY);'],
};

describe('runMigrations', () => {
  it('applies pending migrations in id order', async () => {
    const executor = new RecordingMigrationExecutor();

    const result = await runMigrations({
      executor,
      migrations: [secondMigration, firstMigration],
      now: () => '2026-09-14T12:00:00.000Z',
    });

    expect(executor.didEnsureTable).toBe(true);
    expect(executor.executedStatements).toStrictEqual([
      'CREATE TABLE users (id TEXT PRIMARY KEY);',
      'CREATE TABLE workouts (id TEXT PRIMARY KEY);',
    ]);
    expect(result.applied.map((migration) => migration.id)).toStrictEqual([
      firstMigration.id,
      secondMigration.id,
    ]);
    expect(result.skipped).toStrictEqual([]);
  });

  it('skips applied migrations when checksums still match', async () => {
    const applied = buildAppliedMigration(firstMigration);
    const executor = new RecordingMigrationExecutor([applied]);

    const result = await runMigrations({
      executor,
      migrations: [firstMigration, secondMigration],
      now: () => '2026-09-14T12:05:00.000Z',
    });

    expect(result.skipped).toStrictEqual([applied]);
    expect(result.applied.map((migration) => migration.id)).toStrictEqual([
      secondMigration.id,
    ]);
    expect(executor.executedStatements).toStrictEqual([
      'CREATE TABLE workouts (id TEXT PRIMARY KEY);',
    ]);
  });

  it('fails when an applied migration checksum changes', async () => {
    const executor = new RecordingMigrationExecutor([
      {
        ...buildAppliedMigration(firstMigration),
        checksum: 'changed',
      },
    ]);

    await expect(
      runMigrations({ executor, migrations: [firstMigration] }),
    ).rejects.toBeInstanceOf(MigrationChecksumMismatchError);
  });

  it('fails when the database has a migration missing from code', async () => {
    const executor = new RecordingMigrationExecutor([
      {
        appliedAt: '2026-09-14T12:00:00.000Z',
        checksum: 'abc',
        id: '9999_future_migration',
        name: 'future migration',
      },
    ]);

    await expect(
      runMigrations({ executor, migrations: [] }),
    ).rejects.toBeInstanceOf(UnknownAppliedMigrationError);
  });

  it('rolls back failed migration work', async () => {
    const executor = new RecordingMigrationExecutor();
    executor.failOnStatement = 'CREATE TABLE workouts';

    await expect(
      runMigrations({
        executor,
        migrations: [firstMigration, secondMigration],
      }),
    ).rejects.toThrow('Simulated migration failure');

    expect(
      executor.appliedMigrations.map((migration) => migration.id),
    ).toStrictEqual([firstMigration.id]);
    expect(executor.executedStatements).toStrictEqual([
      'CREATE TABLE users (id TEXT PRIMARY KEY);',
    ]);
  });
});

function buildAppliedMigration(
  migration: MigrationDefinition,
): AppliedMigration {
  return {
    appliedAt: '2026-09-14T12:00:00.000Z',
    checksum: calculateMigrationChecksum(migration),
    id: migration.id,
    name: migration.name,
  };
}

class RecordingMigrationExecutor implements MigrationExecutor {
  appliedMigrations: AppliedMigration[];
  didEnsureTable = false;
  executedStatements: string[] = [];
  failOnStatement: string | null = null;

  constructor(appliedMigrations: AppliedMigration[] = []) {
    this.appliedMigrations = appliedMigrations;
  }

  async ensureMigrationTable() {
    this.didEnsureTable = true;
  }

  async execute(statement: string) {
    if (this.failOnStatement && statement.includes(this.failOnStatement)) {
      throw new Error('Simulated migration failure');
    }

    this.executedStatements.push(statement);
  }

  async getAppliedMigrations() {
    return this.appliedMigrations;
  }

  async recordMigration(migration: AppliedMigration) {
    this.appliedMigrations = [...this.appliedMigrations, migration];
  }

  async runInTransaction<T>(work: () => Promise<T>) {
    const appliedSnapshot = [...this.appliedMigrations];
    const statementSnapshot = [...this.executedStatements];

    try {
      return await work();
    } catch (error) {
      this.appliedMigrations = appliedSnapshot;
      this.executedStatements = statementSnapshot;
      throw error;
    }
  }
}
