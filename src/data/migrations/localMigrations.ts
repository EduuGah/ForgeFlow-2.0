import type { MigrationDefinition } from './types';
import { localAchievementsMigration } from './achievementsMigration';
import { localNotificationsMigration } from './notificationsMigration';
import { localPushDevicesMigration } from './pushDevicesMigration';
import { localNotificationPreferencesMigration } from './notificationPreferencesMigration';
import { localExerciseFavoritesMigration } from './exerciseFavoritesMigration';
import { initialLocalSchemaMigration } from './initialLocalSchemaMigration';
import { localGoalsMigration } from './goalsMigration';
import { localGoalProgressMigration } from './goalProgressMigration';
import { localSyncMetadataMigration } from './localSyncMetadataMigration';
import { localPersonalRecordsMigration } from './personalRecordsMigration';
import { localMealsMigration } from './mealsMigration';
import { localMediaMigration } from './mediaMigration';

export const localMigrations = [
  initialLocalSchemaMigration,
  localSyncMetadataMigration,
  localExerciseFavoritesMigration,
  localPersonalRecordsMigration,
  localGoalsMigration,
  localGoalProgressMigration,
  localAchievementsMigration,
  localNotificationsMigration,
  localPushDevicesMigration,
  localNotificationPreferencesMigration,
  localMealsMigration,
  localMediaMigration,
] satisfies readonly MigrationDefinition[];
