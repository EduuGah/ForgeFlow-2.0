import type { SQLiteDatabase } from 'expo-sqlite';

import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';
import { systemExercises } from '../seeds/systemExercises';
import {
  createSQLiteMigrationExecutor,
  type SQLiteMigrationConnection,
} from '../migrations/sqliteMigrationExecutor';
import { localMigrations } from '../migrations/localMigrations';
import { runMigrations } from '../migrations/migrationRunner';
import { createSQLiteRepositories } from '../repositories/sqliteRepositories';
import { createExpoSQLiteConnection } from './expoSQLiteConnection';

export async function initializeLocalDatabase(database: SQLiteDatabase) {
  const connection = createExpoSQLiteConnection(database);

  await initializeLocalStorage(connection);
}

export async function initializeLocalStorage(
  connection: SQLiteMigrationConnection,
) {
  await runMigrations({
    executor: createSQLiteMigrationExecutor(connection),
    migrations: localMigrations,
  });

  const now = new Date().toISOString();
  await connection.runAsync(
    `INSERT INTO users (
      id, email, display_name, avatar_url, timezone, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      timezone = excluded.timezone,
      updated_at = excluded.updated_at`,
    [
      LOCAL_PREVIEW_USER_ID,
      'preview@forgeflow.local',
      'Atleta ForgeFlow',
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      now,
      now,
    ],
  );

  const repositories = createSQLiteRepositories(connection);
  await connection.withTransactionAsync(async () => {
    for (const exercise of systemExercises) {
      await repositories.exercises.saveExercise(exercise);
    }
  });
}
