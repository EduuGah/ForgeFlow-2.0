import type { MigrationDefinition } from './types';
import { serverAchievementsMigration } from './achievementsMigration';
import { serverNotificationsMigration } from './notificationsMigration';
import { serverPushDevicesMigration } from './pushDevicesMigration';
import { serverExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';
import { serverGoalsMigration } from './goalsMigration';
import { serverGoalProgressMigration } from './goalProgressMigration';
import { serverPersonalRecordsMigration } from './personalRecordsMigration';

export const serverMigrations = [
  initialServerSchemaMigration,
  serverExerciseFavoritesMigration,
  serverPersonalRecordsMigration,
  serverGoalsMigration,
  serverGoalProgressMigration,
  serverAchievementsMigration,
  serverNotificationsMigration,
  serverPushDevicesMigration,
] satisfies readonly MigrationDefinition[];
