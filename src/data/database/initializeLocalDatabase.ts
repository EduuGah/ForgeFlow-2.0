import type { SQLiteDatabase } from 'expo-sqlite';

import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';
import { systemExercises } from '../seeds/systemExercises';
import { previewSocialProfiles } from '../seeds/socialProfiles';
import {
  previewChallengeParticipants,
  previewChallenges,
} from '../seeds/challenges';
import {
  previewCompetitionParticipants,
  previewCompetitions,
} from '../seeds/competitions';
import {
  createSQLiteMigrationExecutor,
  type SQLiteMigrationConnection,
} from '../migrations/sqliteMigrationExecutor';
import { localMigrations } from '../migrations/localMigrations';
import { runMigrations } from '../migrations/migrationRunner';
import { createSQLiteRepositories } from '../repositories/sqliteRepositories';
import { createExpoSQLiteConnection } from './expoSQLiteConnection';

export const systemExerciseCatalogVersion = '2026-09-28-v1';
export const socialProfileCatalogVersion = '2026-09-30-v2';
export const challengeCatalogVersion = '2026-09-30-v1';
export const competitionCatalogVersion = '2026-09-30-v1';

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
        const existing =
          await repositories.socialProfiles.findSocialProfileByUserId(
            profile.userId,
          );
        await repositories.socialProfiles.saveSocialProfile(
          existing ? { ...profile, ...existing } : profile,
        );
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
  const challengeSeedState = await repositories.syncState.getSyncState(
    'bootstrap',
    'social_challenges',
  );
  if (challengeSeedState?.serverCursor !== challengeCatalogVersion) {
    await connection.withTransactionAsync(async () => {
      for (const challenge of previewChallenges) {
        const existing = await repositories.challenges.findChallengeById(
          challenge.id,
        );
        if (!existing) await repositories.challenges.saveChallenge(challenge);
      }
      for (const participant of previewChallengeParticipants) {
        const existing =
          await repositories.challengeParticipants.findChallengeParticipant(
            participant.challengeId,
            participant.userId,
          );
        if (!existing) {
          await repositories.challengeParticipants.saveChallengeParticipant(
            participant,
          );
        }
      }
      await repositories.syncState.saveSyncState({
        key: 'social_challenges',
        lastError: null,
        lastSuccessAt: now,
        scope: 'bootstrap',
        serverCursor: challengeCatalogVersion,
      });
    });
  }
  const competitionSeedState = await repositories.syncState.getSyncState(
    'bootstrap',
    'social_competitions',
  );
  if (competitionSeedState?.serverCursor !== competitionCatalogVersion) {
    await connection.withTransactionAsync(async () => {
      for (const competition of previewCompetitions) {
        const existing = await repositories.competitions.findCompetitionById(
          competition.id,
        );
        if (!existing) {
          await repositories.competitions.saveCompetition(competition);
        }
      }
      for (const participant of previewCompetitionParticipants) {
        const existing =
          await repositories.competitionParticipants.findCompetitionParticipant(
            participant.competitionId,
            participant.userId,
          );
        if (!existing) {
          await repositories.competitionParticipants.saveCompetitionParticipant(
            participant,
          );
        }
      }
      await repositories.syncState.saveSyncState({
        key: 'social_competitions',
        lastError: null,
        lastSuccessAt: now,
        scope: 'bootstrap',
        serverCursor: competitionCatalogVersion,
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
