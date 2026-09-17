import type { MigrationDefinition } from './types';
import { serverExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';
import { serverGoalsMigration } from './goalsMigration';
import { serverPersonalRecordsMigration } from './personalRecordsMigration';

export const serverMigrations = [
  initialServerSchemaMigration,
  serverExerciseFavoritesMigration,
  serverPersonalRecordsMigration,
  serverGoalsMigration,
] satisfies readonly MigrationDefinition[];
