import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { NotificationDeliveryGateway } from '../ports/notifications';
import type { Notification } from '../../domain/notifications/entities';
import {
  cancelLocalNotification,
  registerPushDevice,
  scheduleLocalNotification,
} from './notificationDelivery';

const now = '2026-09-21T12:00:00.000Z';
const userId = 'user-1';

describe('notification delivery', () => {
  it('does not request permission until explicitly authorized', async () => {
    const dependencies = createDependencies({ permission: 'undetermined' });
    const result = await registerPushDevice(
      { requestPermission: false, userId },
      dependencies,
    );

    expect(result.status).toBe('permission_required');
    expect(dependencies.gateway.requestPermission).not.toHaveBeenCalled();
  });

  it('registers and synchronizes a device after contextual permission', async () => {
    const dependencies = createDependencies({ permission: 'undetermined' });
    const result = await registerPushDevice(
      { requestPermission: true, userId },
      dependencies,
    );

    expect(result).toMatchObject({
      device: { expoPushToken: 'ExponentPushToken[test]', platform: 'android' },
      status: 'registered',
    });
    await expect(
      dependencies.repositories.pushDevices.listPushDevices(userId),
    ).resolves.toHaveLength(1);
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
  });

  it('schedules and cancels a local notification without duplicating schedules', async () => {
    const dependencies = createDependencies({ notifications: [notification] });

    const scheduled = await scheduleLocalNotification(
      { notificationId: notification.id, userId },
      dependencies,
    );
    const repeated = await scheduleLocalNotification(
      { notificationId: notification.id, userId },
      dependencies,
    );
    const cancelled = await cancelLocalNotification(
      { notificationId: notification.id, userId },
      dependencies,
    );

    expect(scheduled).toEqual({
      nativeNotificationId: 'native-1',
      status: 'scheduled',
    });
    expect(repeated.status).toBe('already_scheduled');
    expect(cancelled.status).toBe('cancelled');
    expect(
      dependencies.gateway.scheduleLocalNotification,
    ).toHaveBeenCalledTimes(1);
    expect(
      dependencies.gateway.cancelScheduledNotification,
    ).toHaveBeenCalledWith('native-1');
    await expect(
      dependencies.repositories.notifications.listNotifications({ userId }),
    ).resolves.toEqual([
      expect.objectContaining({
        archivedAt: now,
        deliveryStatus: 'sent',
      }),
    ]);
  });

  it('contains native delivery failures and marks the notification failed', async () => {
    const dependencies = createDependencies({
      notifications: [notification],
      scheduleError: true,
    });
    const result = await scheduleLocalNotification(
      { notificationId: notification.id, userId },
      dependencies,
    );

    expect(result.status).toBe('failed');
    await expect(
      dependencies.repositories.notifications.listNotifications({ userId }),
    ).resolves.toEqual([expect.objectContaining({ deliveryStatus: 'failed' })]);
  });
});

function createDependencies(
  input: {
    notifications?: Notification[];
    permission?: 'denied' | 'granted' | 'undetermined' | 'unavailable';
    scheduleError?: boolean;
  } = {},
) {
  let sequence = 0;
  const gateway = {
    cancelScheduledNotification: jest.fn(async () => undefined),
    getPermissionStatus: jest.fn(
      async () => input.permission ?? ('granted' as const),
    ),
    getPushToken: jest.fn(async () => ({
      devicePushToken: 'device-token',
      expoPushToken: 'ExponentPushToken[test]',
      platform: 'android' as const,
    })),
    requestPermission: jest.fn(async () => 'granted' as const),
    scheduleLocalNotification: jest.fn(async () => {
      if (input.scheduleError) throw new Error('Native scheduling failed');
      return 'native-1';
    }),
    subscribeToResponses: jest.fn(() => () => undefined),
  } satisfies NotificationDeliveryGateway;

  return {
    clock: () => now,
    gateway,
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories({
      notifications: input.notifications,
    }),
  };
}

const notification: Notification = {
  archivedAt: null,
  body: 'Seu treino foi concluido.',
  createdAt: now,
  data: { route: 'Home' },
  dedupeKey: 'workout:session-1',
  deliveryStatus: 'pending',
  expiresAt: null,
  id: 'notification-1',
  readAt: null,
  scheduledFor: now,
  title: 'Treino concluido',
  type: 'workout_completed',
  userId,
};
