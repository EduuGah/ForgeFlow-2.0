import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import {
  getNotificationPreferences,
  toNotificationPreferencesSnapshot,
  updateNotificationPreferences,
} from './notificationPreferences';

describe('notification preferences', () => {
  it('creates low-noise defaults and queues them for synchronization', async () => {
    const dependencies = createDependencies();
    const preferences = await getNotificationPreferences(
      { timezoneOffsetMinutes: -180, userId: 'user-1' },
      dependencies,
    );

    expect(preferences).toMatchObject({
      frequencyMode: 'intelligent',
      hydrationEnabled: false,
      nutritionEnabled: false,
      pushEnabled: false,
      quietHoursEnd: '08:00',
      quietHoursStart: '22:00',
      workoutsEnabled: true,
    });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
    expect(
      toNotificationPreferencesSnapshot(preferences).enabledCategories,
    ).toEqual([]);
  });

  it('persists category, frequency and quiet-hour updates offline', async () => {
    const dependencies = createDependencies();
    const current = await getNotificationPreferences(
      { timezoneOffsetMinutes: -180, userId: 'user-1' },
      dependencies,
    );
    const updated = await updateNotificationPreferences(
      {
        frequencyMode: 'frequent',
        goalsEnabled: false,
        pushEnabled: true,
        quietHoursEnd: null,
        quietHoursStart: null,
        userId: 'user-1',
      },
      dependencies,
    );

    expect(updated.id).toBe(current.id);
    expect(updated.frequencyMode).toBe('frequent');
    expect(
      toNotificationPreferencesSnapshot(updated).enabledCategories,
    ).not.toContain('goals');
    await expect(
      dependencies.repositories.notificationPreferences.findNotificationPreferences(
        'user-1',
      ),
    ).resolves.toEqual(updated);
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(2);
  });

  it('rejects partial or malformed quiet hours', async () => {
    const dependencies = createDependencies();
    await getNotificationPreferences(
      { timezoneOffsetMinutes: 0, userId: 'user-1' },
      dependencies,
    );

    await expect(
      updateNotificationPreferences(
        { quietHoursEnd: null, quietHoursStart: '25:00', userId: 'user-1' },
        dependencies,
      ),
    ).rejects.toThrow('both start and end');
  });
});

function createDependencies() {
  let sequence = 0;
  return {
    clock: () => '2026-09-27T12:00:00.000Z',
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories(),
  };
}
