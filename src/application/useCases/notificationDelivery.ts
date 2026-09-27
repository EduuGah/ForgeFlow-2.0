import type { NotificationDeliveryGateway } from '../ports/notifications';
import type { RepositoryProvider } from '../ports/repositories';
import type {
  Notification,
  PushDeviceRegistration,
} from '../../domain/notifications/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncEntityType, SyncOperation } from '../../domain/sync/entities';

type NotificationDeliveryRepositories = Pick<
  RepositoryProvider,
  'notifications' | 'pushDevices' | 'syncOperations'
>;

export type NotificationDeliveryDependencies = {
  clock: () => ISODateTimeString;
  gateway: NotificationDeliveryGateway;
  generateId: () => EntityId;
  repositories: NotificationDeliveryRepositories;
};

export type RegisterPushDeviceResult =
  | { device: PushDeviceRegistration; status: 'registered' }
  | {
      device: null;
      status: 'denied' | 'failed' | 'permission_required' | 'unavailable';
    };

export async function registerPushDevice(
  input: { requestPermission: boolean; userId: EntityId },
  dependencies: NotificationDeliveryDependencies,
): Promise<RegisterPushDeviceResult> {
  try {
    let permission = await dependencies.gateway.getPermissionStatus();
    if (permission === 'unavailable') {
      return { device: null, status: 'unavailable' };
    }
    if (permission === 'undetermined' && !input.requestPermission) {
      return { device: null, status: 'permission_required' };
    }
    if (permission !== 'granted' && input.requestPermission) {
      permission = await dependencies.gateway.requestPermission();
    }
    if (permission !== 'granted') {
      return { device: null, status: 'denied' };
    }

    const token = await dependencies.gateway.getPushToken();
    if (!token) return { device: null, status: 'unavailable' };

    const now = dependencies.clock();
    const existing = (
      await dependencies.repositories.pushDevices.listPushDevices(input.userId)
    ).find((device) => device.expoPushToken === token.expoPushToken);
    const device: PushDeviceRegistration = {
      createdAt: existing?.createdAt ?? now,
      devicePushToken: token.devicePushToken,
      disabledAt: null,
      expoPushToken: token.expoPushToken,
      id: existing?.id ?? dependencies.generateId(),
      platform: token.platform,
      updatedAt: now,
      userId: input.userId,
    };
    await queueSync(device, 'push_device', dependencies);
    await dependencies.repositories.pushDevices.savePushDevice(device);
    return { device, status: 'registered' };
  } catch {
    return { device: null, status: 'failed' };
  }
}

export async function scheduleLocalNotification(
  input: { notificationId: EntityId; userId: EntityId },
  dependencies: NotificationDeliveryDependencies,
) {
  const notification = await findOwnedNotification(input, dependencies);
  if (!notification)
    return { nativeNotificationId: null, status: 'not_found' as const };
  if (notification.deliveryStatus === 'sent') {
    return {
      nativeNotificationId: getNativeNotificationId(notification),
      status: 'already_scheduled' as const,
    };
  }

  try {
    const nativeNotificationId =
      await dependencies.gateway.scheduleLocalNotification(notification);
    const updated: Notification = {
      ...notification,
      data: {
        ...(notification.data ?? {}),
        nativeNotificationId,
      },
      deliveryStatus: 'sent',
    };
    await queueSync(updated, 'notification', dependencies);
    await dependencies.repositories.notifications.saveNotification(updated);
    return { nativeNotificationId, status: 'scheduled' as const };
  } catch {
    const failed = { ...notification, deliveryStatus: 'failed' as const };
    await queueSync(failed, 'notification', dependencies);
    await dependencies.repositories.notifications.saveNotification(failed);
    return { nativeNotificationId: null, status: 'failed' as const };
  }
}

export async function cancelLocalNotification(
  input: { notificationId: EntityId; userId: EntityId },
  dependencies: NotificationDeliveryDependencies,
) {
  const notification = await findOwnedNotification(input, dependencies);
  if (!notification) return { status: 'not_found' as const };
  const nativeNotificationId = getNativeNotificationId(notification);
  if (!nativeNotificationId) return { status: 'not_scheduled' as const };

  try {
    await dependencies.gateway.cancelScheduledNotification(
      nativeNotificationId,
    );
    const archived = {
      ...notification,
      archivedAt: dependencies.clock(),
    };
    await queueSync(archived, 'notification', dependencies);
    await dependencies.repositories.notifications.saveNotification(archived);
    return { status: 'cancelled' as const };
  } catch {
    return { status: 'failed' as const };
  }
}

async function findOwnedNotification(
  input: { notificationId: EntityId; userId: EntityId },
  dependencies: NotificationDeliveryDependencies,
) {
  return (
    (
      await dependencies.repositories.notifications.listNotifications({
        id: input.notificationId,
        userId: input.userId,
      })
    )[0] ?? null
  );
}

function getNativeNotificationId(notification: Notification) {
  const value = notification.data?.nativeNotificationId;
  return typeof value === 'string' ? value : null;
}

async function queueSync(
  payload: Notification | PushDeviceRegistration,
  entityType: Extract<SyncEntityType, 'notification' | 'push_device'>,
  dependencies: NotificationDeliveryDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: payload.id,
    entityType,
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: { ...payload },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
