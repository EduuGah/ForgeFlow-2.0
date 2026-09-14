import type {
  AppliedMigration,
  MigrationDefinition,
  MigrationExecutor,
  MigrationRunResult,
} from './types';

type RunMigrationsOptions = {
  executor: MigrationExecutor;
  migrations: readonly MigrationDefinition[];
  now?: () => string;
};

export class MigrationChecksumMismatchError extends Error {
  constructor(
    readonly migrationId: string,
    readonly expectedChecksum: string,
    readonly actualChecksum: string,
  ) {
    super(
      `Migration ${migrationId} was already applied with checksum ${actualChecksum}, expected ${expectedChecksum}.`,
    );
    Object.setPrototypeOf(this, MigrationChecksumMismatchError.prototype);
  }
}

export class UnknownAppliedMigrationError extends Error {
  constructor(readonly migrationId: string) {
    super(`Database contains unknown applied migration ${migrationId}.`);
    Object.setPrototypeOf(this, UnknownAppliedMigrationError.prototype);
  }
}

export class InvalidMigrationError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidMigrationError.prototype);
  }
}

export async function runMigrations({
  executor,
  migrations,
  now = () => new Date().toISOString(),
}: RunMigrationsOptions): Promise<MigrationRunResult> {
  const orderedMigrations = validateAndOrderMigrations(migrations);

  await executor.ensureMigrationTable();

  const appliedMigrations = await executor.getAppliedMigrations();
  const migrationsById = new Map(
    orderedMigrations.map((migration) => [migration.id, migration]),
  );
  const appliedById = new Map(
    appliedMigrations.map((migration) => [migration.id, migration]),
  );
  const result: MigrationRunResult = {
    applied: [],
    skipped: [],
  };

  for (const appliedMigration of appliedMigrations) {
    const migration = migrationsById.get(appliedMigration.id);

    if (!migration) {
      throw new UnknownAppliedMigrationError(appliedMigration.id);
    }

    const expectedChecksum = calculateMigrationChecksum(migration);

    if (appliedMigration.checksum !== expectedChecksum) {
      throw new MigrationChecksumMismatchError(
        migration.id,
        expectedChecksum,
        appliedMigration.checksum,
      );
    }
  }

  for (const migration of orderedMigrations) {
    const appliedMigration = appliedById.get(migration.id);

    if (appliedMigration) {
      result.skipped.push(appliedMigration);
      continue;
    }

    const nextAppliedMigration: AppliedMigration = {
      appliedAt: now(),
      checksum: calculateMigrationChecksum(migration),
      id: migration.id,
      name: migration.name,
    };

    await executor.runInTransaction(async () => {
      for (const statement of migration.statements) {
        await executor.execute(statement);
      }

      await executor.recordMigration(nextAppliedMigration);
    });

    result.applied.push(nextAppliedMigration);
  }

  return result;
}

export function calculateMigrationChecksum(migration: MigrationDefinition) {
  const payload = JSON.stringify({
    id: migration.id,
    name: migration.name,
    scope: migration.scope,
    statements: migration.statements.map((statement) => statement.trim()),
  });

  let hash = 2166136261;

  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function validateAndOrderMigrations(
  migrations: readonly MigrationDefinition[],
) {
  const ids = new Set<string>();

  for (const migration of migrations) {
    if (!migration.id.trim()) {
      throw new InvalidMigrationError('Migration id cannot be empty.');
    }

    if (!migration.name.trim()) {
      throw new InvalidMigrationError(
        `Migration ${migration.id} name cannot be empty.`,
      );
    }

    if (ids.has(migration.id)) {
      throw new InvalidMigrationError(
        `Duplicate migration id ${migration.id}.`,
      );
    }

    if (migration.statements.length === 0) {
      throw new InvalidMigrationError(
        `Migration ${migration.id} must contain at least one statement.`,
      );
    }

    for (const statement of migration.statements) {
      if (!statement.trim()) {
        throw new InvalidMigrationError(
          `Migration ${migration.id} contains an empty statement.`,
        );
      }
    }

    ids.add(migration.id);
  }

  return [...migrations].sort((left, right) => left.id.localeCompare(right.id));
}
