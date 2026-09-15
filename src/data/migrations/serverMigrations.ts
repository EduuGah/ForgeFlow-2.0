import type { MigrationDefinition } from './types';
import { serverExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';

export const serverMigrations = [
  initialServerSchemaMigration,
  serverExerciseFavoritesMigration,
] satisfies readonly MigrationDefinition[];
