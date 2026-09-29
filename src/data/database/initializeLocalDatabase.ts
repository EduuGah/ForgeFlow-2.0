import type { SQLiteDatabase } from 'expo-sqlite';

import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';
import { systemExercises } from '../seeds/systemExercises';
import { previewSocialProfiles } from '../seeds/socialProfiles';
import {
  createSQLiteMigrationExecutor,
  type SQLiteMigrationConnection,
} from '../migrations/sqliteMigrationExecutor';
import { localMigrations } from '../migrations/localMigrations';
import { runMigrations } from '../migrations/migrationRunner';
import { createSQLiteRepositories } from '../repositories/sqliteRepositories';
import { createExpoSQLiteConnection } from './expoSQLiteConnection';

export const systemExerciseCatalogVersion = '2026-09-28-v1';
export const socialProfileCatalogVersion = '2026-09-29-v1';

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
  const socialSeedState = await repositories.syncState.getSyncState(
    'bootstrap',
    'social_profiles',
  );
  if (socialSeedState?.serverCursor !== socialProfileCatalogVersion) {
    await connection.withTransactionAsync(async () => {
      for (const profile of previewSocialProfiles) {
        await repositories.socialProfiles.saveSocialProfile(profile);
      }
      await repositories.syncState.saveSyncState({
        key: 'social_profiles',
        lastError: null,
        lastSuccessAt: now,
        scope: 'bootstrap',
        serverCursor: socialProfileCatalogVersion,
      });
    });
  }
  const seedState = await repositories.syncState.getSyncState(
    'bootstrap',
    'system_exercises',
  );
  if (seedState?.serverCursor === systemExerciseCatalogVersion) return;

  await connection.withTransactionAsync(async () => {
    for (const exercise of systemExercises) {
      await repositories.exercises.saveExercise(exercise);
    }
    await repositories.syncState.saveSyncState({
      key: 'system_exercises',
      lastError: null,
      lastSuccessAt: now,
      scope: 'bootstrap',
      serverCursor: systemExerciseCatalogVersion,
    });
  });
}
