import type { MigrationDefinition } from './types';
import { localExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialLocalSchemaMigration } from './initialLocalSchemaMigration';
import { localSyncMetadataMigration } from './localSyncMetadataMigration';

export const localMigrations = [
  initialLocalSchemaMigration,
  localSyncMetadataMigration,
  localExerciseFavoritesMigration,
] satisfies readonly MigrationDefinition[];
