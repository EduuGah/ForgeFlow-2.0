import type { MigrationDefinition } from './types';
import { serverAchievementsMigration } from './achievementsMigration';
import { serverNotificationsMigration } from './notificationsMigration';
import { serverPushDevicesMigration } from './pushDevicesMigration';
import { serverNotificationPreferencesMigration } from './notificationPreferencesMigration';
import { serverExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';
import { serverGoalsMigration } from './goalsMigration';
import { serverGoalProgressMigration } from './goalProgressMigration';
import { serverPersonalRecordsMigration } from './personalRecordsMigration';
import { serverMealsMigration } from './mealsMigration';
import { serverMediaMigration } from './mediaMigration';
import { serverHydrationMigration } from './hydrationMigration';

export const serverMigrations = [
  initialServerSchemaMigration,
  serverExerciseFavoritesMigration,
  serverPersonalRecordsMigration,
  serverGoalsMigration,
  serverGoalProgressMigration,
  serverAchievementsMigration,
  serverNotificationsMigration,
  serverPushDevicesMigration,
  serverNotificationPreferencesMigration,
  serverMealsMigration,
  serverMediaMigration,
  serverHydrationMigration,
] satisfies readonly MigrationDefinition[];
