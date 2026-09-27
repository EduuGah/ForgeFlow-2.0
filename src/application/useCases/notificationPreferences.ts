import type { RepositoryProvider } from '../ports/repositories';
import type {
  NotificationCategory,
  NotificationPreferences,
  NotificationPreferencesSnapshot,
} from '../../domain/notifications/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';

type NotificationPreferencesRepositories = Pick<
  RepositoryProvider,
  'notificationPreferences' | 'syncOperations'
>;

export type NotificationPreferencesDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: NotificationPreferencesRepositories;
};

export type UpdateNotificationPreferencesInput = Partial<
  Omit<NotificationPreferences, 'createdAt' | 'id' | 'updatedAt' | 'userId'>
> & { userId: EntityId };

export async function getNotificationPreferences(
  input: { timezoneOffsetMinutes: number; userId: EntityId },
  dependencies: NotificationPreferencesDependencies,
) {
  const existing =
    await dependencies.repositories.notificationPreferences.findNotificationPreferences(
      input.userId,
    );
  if (existing) return existing;

  const now = dependencies.clock();
  const preferences: NotificationPreferences = {
    achievementsEnabled: true,
    createdAt: now,
    frequencyMode: 'intelligent',
    goalsEnabled: true,
    hydrationEnabled: false,
    id: dependencies.generateId(),
    inactivityEnabled: true,
    nutritionEnabled: false,
    personalRecordsEnabled: true,
    progressEnabled: true,
    pushEnabled: false,
    quietHoursEnd: '08:00',
    quietHoursStart: '22:00',
    reportsEnabled: true,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    updatedAt: now,
    userId: input.userId,
    workoutsEnabled: true,
  };
  await persist(preferences, dependencies);
  return preferences;
}

export async function updateNotificationPreferences(
  input: UpdateNotificationPreferencesInput,
  dependencies: NotificationPreferencesDependencies,
) {
  const current =
    await dependencies.repositories.notificationPreferences.findNotificationPreferences(
      input.userId,
    );
  if (!current)
    throw new Error('Notification preferences were not initialized.');

  const preferences: NotificationPreferences = {
    ...current,
    ...input,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: dependencies.clock(),
    userId: current.userId,
  };
  validateQuietHours(preferences.quietHoursStart, preferences.quietHoursEnd);
  await persist(preferences, dependencies);
  return preferences;
}

export function toNotificationPreferencesSnapshot(
  preferences: NotificationPreferences,
): NotificationPreferencesSnapshot {
  const enabledCategories: NotificationCategory[] = [];
  const categoryFlags: [NotificationCategory, boolean][] = [
    ['achievements', preferences.achievementsEnabled],
    ['goals', preferences.goalsEnabled],
    ['hydration', preferences.hydrationEnabled],
    ['inactivity', preferences.inactivityEnabled],
    ['nutrition', preferences.nutritionEnabled],
    ['personal_records', preferences.personalRecordsEnabled],
    ['progress', preferences.progressEnabled],
    ['reports', preferences.reportsEnabled],
    ['workouts', preferences.workoutsEnabled],
  ];
  if (preferences.pushEnabled) {
    categoryFlags.forEach(([category, enabled]) => {
      if (enabled) enabledCategories.push(category);
    });
  }

  return {
    enabledCategories,
    frequencyMode: preferences.frequencyMode,
    quietHoursEnd: preferences.quietHoursEnd,
    quietHoursStart: preferences.quietHoursStart,
    timezoneOffsetMinutes: preferences.timezoneOffsetMinutes,
  };
}

function validateQuietHours(start: string | null, end: string | null) {
  if ((start === null) !== (end === null)) {
    throw new Error('Quiet hours require both start and end times.');
  }
  for (const value of [start, end]) {
    if (value !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new Error('Quiet hours must use HH:mm format.');
    }
  }
}

async function persist(
  preferences: NotificationPreferences,
  dependencies: NotificationPreferencesDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: preferences.id,
    entityType: 'notification_preference',
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: { ...preferences },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
  await dependencies.repositories.notificationPreferences.saveNotificationPreferences(
    preferences,
  );
}
