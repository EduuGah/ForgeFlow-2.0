import type { MigrationDefinition } from './types';
import { initialLocalSchemaMigration } from './initialLocalSchemaMigration';

export const localMigrations = [
  initialLocalSchemaMigration,
] satisfies readonly MigrationDefinition[];
