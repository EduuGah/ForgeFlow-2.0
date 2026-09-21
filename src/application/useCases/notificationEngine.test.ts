import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type {
  NotificationEvent,
  NotificationPreferencesSnapshot,
} from '../../domain/notifications/entities';
import { processNotificationEvent } from './notificationEngine';

const now = '2026-09-21T02:00:00.000Z';

describe('notification engine', () => {
  it('persists and queues an eligible event after applying quiet hours', async () => {
    const dependencies = createDependencies();
    const result = await processNotificationEvent(
      { event: event(), preferences },
      dependencies,
    );

    expect(result).toMatchObject({
      notification: { scheduledFor: '2026-09-21T11:00:00.000Z' },
      status: 'created',
    });
    await expect(
      dependencies.repositories.notifications.listNotifications({
        userId: 'user-1',
      }),
    ).resolves.toHaveLength(1);
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
  });

  it('deduplicates repeated events before creating another sync operation', async () => {
    const dependencies = createDependencies();
    await processNotificationEvent(
      { event: event(), preferences },
      dependencies,
    );
    const repeated = await processNotificationEvent(
      { event: event(), preferences },
      dependencies,
    );

    expect(repeated).toEqual({ notification: null, status: 'duplicate' });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
  });

  it('respects disabled categories and event-specific eligibility', async () => {
    const disabled = await processNotificationEvent(
      {
        event: event(),
        preferences: { ...preferences, enabledCategories: [] },
      },
      createDependencies(),
    );
    const ineligible = await processNotificationEvent(
      { event: event(), preferences },
      createDependencies({ isEligible: () => false }),
    );

    expect(disabled.status).toBe('preference_disabled');
    expect(ineligible.status).toBe('ineligible');
  });

  it('rate-limits motivational events but not action-driven events', async () => {
    const repositories = createInMemoryRepositories({
      notifications: [
        ['goal_progress', '2026-09-20T22:00:00.000Z'],
        ['hydration_reminder', '2026-09-20T23:00:00.000Z'],
        ['nutrition_reminder', '2026-09-21T00:00:00.000Z'],
      ].map(([type, createdAt], index) => ({
        archivedAt: null,
        body: 'Body',
        createdAt,
        data: null,
        dedupeKey: `existing-${index}`,
        deliveryStatus: 'pending',
        expiresAt: null,
        id: `existing-${index}`,
        readAt: null,
        scheduledFor: now,
        title: 'Title',
        type: type as
          'goal_progress' | 'hydration_reminder' | 'nutrition_reminder',
        userId: 'user-1',
      })),
    });
    const dependencies = createDependencies({ repositories });

    const limited = await processNotificationEvent(
      {
        event: event({
          dedupeKey: 'inactivity:2026-09-21',
          type: 'inactivity_threshold',
        }),
        preferences,
      },
      dependencies,
    );
    const actionDriven = await processNotificationEvent(
      {
        event: event({
          dedupeKey: 'workout:session-1',
          type: 'workout_completed',
        }),
        preferences,
      },
      dependencies,
    );

    expect(limited.status).toBe('rate_limited');
    expect(actionDriven.status).toBe('created');
  });
});

function createDependencies(
  overrides: Partial<{
    isEligible: () => boolean;
    repositories: ReturnType<typeof createInMemoryRepositories>;
  }> = {},
) {
  let sequence = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++sequence}`,
    repositories: overrides.repositories ?? createInMemoryRepositories(),
    ...(overrides.isEligible ? { isEligible: overrides.isEligible } : {}),
  };
}

function event(overrides: Partial<NotificationEvent> = {}): NotificationEvent {
  return {
    body: 'Voce concluiu seu treino.',
    data: { sessionId: 'session-1' },
    dedupeKey: 'workout:session-1',
    expiresAt: null,
    occurredAt: now,
    title: 'Treino concluido',
    type: 'workout_completed',
    userId: 'user-1',
    ...overrides,
  };
}

const preferences: NotificationPreferencesSnapshot = {
  enabledCategories: [
    'achievements',
    'goals',
    'hydration',
    'inactivity',
    'nutrition',
    'personal_records',
    'progress',
    'reports',
    'workouts',
  ],
  quietHoursEnd: '08:00',
  quietHoursStart: '22:00',
  timezoneOffsetMinutes: -180,
};
