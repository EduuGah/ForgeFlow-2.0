import type { MigrationDefinition } from './types';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';

export const serverMigrations = [
  initialServerSchemaMigration,
] satisfies readonly MigrationDefinition[];
