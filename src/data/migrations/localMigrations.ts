import type { MigrationDefinition } from './types';
import { localExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialLocalSchemaMigration } from './initialLocalSchemaMigration';
import { localGoalsMigration } from './goalsMigration';
import { localGoalProgressMigration } from './goalProgressMigration';
import { localSyncMetadataMigration } from './localSyncMetadataMigration';
import { localPersonalRecordsMigration } from './personalRecordsMigration';

export const localMigrations = [
  initialLocalSchemaMigration,
  localSyncMetadataMigration,
  localExerciseFavoritesMigration,
  localPersonalRecordsMigration,
  localGoalsMigration,
  localGoalProgressMigration,
] satisfies readonly MigrationDefinition[];
