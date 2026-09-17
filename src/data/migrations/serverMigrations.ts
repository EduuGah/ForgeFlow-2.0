import type { MigrationDefinition } from './types';
import { serverExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';
import { serverPersonalRecordsMigration } from './personalRecordsMigration';

export const serverMigrations = [
  initialServerSchemaMigration,
  serverExerciseFavoritesMigration,
  serverPersonalRecordsMigration,
] satisfies readonly MigrationDefinition[];
