import type { MigrationDefinition } from './types';
import { initialLocalSchemaMigration } from './initialLocalSchemaMigration';
import { localSyncMetadataMigration } from './localSyncMetadataMigration';

export const localMigrations = [
  initialLocalSchemaMigration,
  localSyncMetadataMigration,
] satisfies readonly MigrationDefinition[];
