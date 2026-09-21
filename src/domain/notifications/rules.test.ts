import type { Notification } from './entities';
import { exceedsMotivationalRateLimit, nextAllowedDeliveryTime } from './rules';

describe('notification rules', () => {
  it('reschedules overnight quiet-hours delivery to 08:00 local time', () => {
    expect(
      nextAllowedDeliveryTime('2026-09-21T02:00:00.000Z', {
        enabledCategories: ['goals'],
        quietHoursEnd: '08:00',
        quietHoursStart: '22:00',
        timezoneOffsetMinutes: -180,
      }),
    ).toBe('2026-09-21T11:00:00.000Z');
  });

  it('keeps delivery immediate outside quiet hours', () => {
    const now = '2026-09-21T15:00:00.000Z';
    expect(
      nextAllowedDeliveryTime(now, {
        enabledCategories: ['goals'],
        quietHoursEnd: '08:00',
        quietHoursStart: '22:00',
        timezoneOffsetMinutes: -180,
      }),
    ).toBe(now);
  });

  it('limits motivational volume but exempts action-driven events', () => {
    const existing = [
      notification(
        'goal-progress-1',
        'goal_progress',
        '2026-09-21T08:00:00.000Z',
      ),
      notification(
        'hydration-1',
        'hydration_reminder',
        '2026-09-21T09:00:00.000Z',
      ),
      notification(
        'nutrition-1',
        'nutrition_reminder',
        '2026-09-21T10:00:00.000Z',
      ),
    ];

    expect(
      exceedsMotivationalRateLimit({
        existing,
        now: '2026-09-21T12:00:00.000Z',
        type: 'inactivity_threshold',
      }),
    ).toBe(true);
    expect(
      exceedsMotivationalRateLimit({
        existing,
        now: '2026-09-21T12:00:00.000Z',
        type: 'workout_completed',
      }),
    ).toBe(false);
  });

  it('enforces a six-hour interval within a motivational category', () => {
    expect(
      exceedsMotivationalRateLimit({
        existing: [
          notification(
            'goal-progress-1',
            'goal_progress',
            '2026-09-21T08:00:00.000Z',
          ),
        ],
        now: '2026-09-21T12:00:00.000Z',
        type: 'goal_behind',
      }),
    ).toBe(true);
  });
});

function notification(
  dedupeKey: string,
  type: Notification['type'],
  createdAt: string,
): Notification {
  return {
    archivedAt: null,
    body: 'Body',
    createdAt,
    data: null,
    dedupeKey,
    deliveryStatus: 'pending',
    expiresAt: null,
    id: dedupeKey,
    readAt: null,
    scheduledFor: createdAt,
    title: 'Title',
    type,
    userId: 'user-1',
  };
}
