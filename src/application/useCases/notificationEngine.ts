import type {
  Notification,
  NotificationEvent,
  NotificationPreferencesSnapshot,
} from '../../domain/notifications/entities';
import {
  exceedsMotivationalRateLimit,
  isNotificationCategoryEnabled,
  nextAllowedDeliveryTime,
} from '../../domain/notifications/rules';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type { RepositoryProvider } from '../ports/repositories';

type NotificationRepositories = Pick<
  RepositoryProvider,
  'notifications' | 'syncOperations'
>;

export type NotificationDecision =
  | { notification: Notification; status: 'created' }
  | {
      notification: null;
      status:
        'duplicate' | 'ineligible' | 'preference_disabled' | 'rate_limited';
    };

export type NotificationEngineDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  isEligible?: (event: NotificationEvent) => boolean;
  repositories: NotificationRepositories;
};

export async function processNotificationEvent(
  input: {
    event: NotificationEvent;
    preferences: NotificationPreferencesSnapshot;
  },
  dependencies: NotificationEngineDependencies,
): Promise<NotificationDecision> {
  const { event, preferences } = input;
  if (dependencies.isEligible && !dependencies.isEligible(event)) {
    return { notification: null, status: 'ineligible' };
  }

  const existing =
    await dependencies.repositories.notifications.listNotifications({
      userId: event.userId,
    });
  if (
    existing.some((notification) => notification.dedupeKey === event.dedupeKey)
  ) {
    return { notification: null, status: 'duplicate' };
  }
  if (!isNotificationCategoryEnabled(event.type, preferences)) {
    return { notification: null, status: 'preference_disabled' };
  }

  const now = dependencies.clock();
  const scheduledFor = nextAllowedDeliveryTime(now, preferences);
  if (
    exceedsMotivationalRateLimit({
      existing,
      now,
      type: event.type,
    })
  ) {
    return { notification: null, status: 'rate_limited' };
  }

  const notification: Notification = {
    archivedAt: null,
    body: event.body.trim(),
    createdAt: now,
    data: event.data,
    dedupeKey: event.dedupeKey,
    deliveryStatus: 'pending',
    expiresAt: event.expiresAt,
    id: dependencies.generateId(),
    readAt: null,
    scheduledFor,
    title: event.title.trim(),
    type: event.type,
    userId: event.userId,
  };
  await queueNotificationSync(notification, dependencies);
  await dependencies.repositories.notifications.saveNotification(notification);

  return { notification, status: 'created' };
}

async function queueNotificationSync(
  notification: Notification,
  dependencies: NotificationEngineDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: notification.id,
    entityType: 'notification',
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: { ...notification },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
