import type {
  Notification,
  NotificationCategory,
  NotificationEventType,
  NotificationPreferencesSnapshot,
} from './entities';

export const DEFAULT_MOTIVATIONAL_DAILY_LIMIT = 3;
export const DEFAULT_MOTIVATIONAL_CATEGORY_INTERVAL_MINUTES = 6 * 60;

export const notificationCategoryByType: Record<
  NotificationEventType,
  NotificationCategory
> = {
  achievement_unlocked: 'achievements',
  consistency_milestone: 'progress',
  goal_behind: 'goals',
  goal_completed: 'goals',
  goal_progress: 'goals',
  hydration_reminder: 'hydration',
  inactivity_threshold: 'inactivity',
  new_pr: 'personal_records',
  nutrition_reminder: 'nutrition',
  report_ready: 'reports',
  workout_completed: 'workouts',
};

const motivationalTypes = new Set<NotificationEventType>([
  'consistency_milestone',
  'goal_behind',
  'goal_progress',
  'hydration_reminder',
  'inactivity_threshold',
  'nutrition_reminder',
]);

export function isNotificationCategoryEnabled(
  type: NotificationEventType,
  preferences: NotificationPreferencesSnapshot,
) {
  return preferences.enabledCategories.includes(
    notificationCategoryByType[type],
  );
}

export function isMotivationalNotification(type: NotificationEventType) {
  return motivationalTypes.has(type);
}

export function nextAllowedDeliveryTime(
  now: string,
  preferences: NotificationPreferencesSnapshot,
) {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return now;

  const start = parseTime(preferences.quietHoursStart);
  const end = parseTime(preferences.quietHoursEnd);
  const nowUtc = new Date(now);
  const localNow = new Date(
    nowUtc.getTime() + preferences.timezoneOffsetMinutes * 60_000,
  );
  const minuteOfDay = localNow.getUTCHours() * 60 + localNow.getUTCMinutes();
  const isQuiet =
    start === end
      ? true
      : start < end
        ? minuteOfDay >= start && minuteOfDay < end
        : minuteOfDay >= start || minuteOfDay < end;

  if (!isQuiet) return now;

  const localDelivery = new Date(localNow);
  localDelivery.setUTCHours(Math.floor(end / 60), end % 60, 0, 0);
  if (localDelivery.getTime() <= localNow.getTime()) {
    localDelivery.setUTCDate(localDelivery.getUTCDate() + 1);
  }

  return new Date(
    localDelivery.getTime() - preferences.timezoneOffsetMinutes * 60_000,
  ).toISOString();
}

export function exceedsMotivationalRateLimit(input: {
  categoryIntervalMinutes?: number;
  dailyLimit?: number;
  existing: Notification[];
  now: string;
  type: NotificationEventType;
}) {
  if (!isMotivationalNotification(input.type)) return false;

  const now = new Date(input.now).getTime();
  const dayStart = now - 24 * 60 * 60 * 1000;
  const intervalStart =
    now -
    (input.categoryIntervalMinutes ??
      DEFAULT_MOTIVATIONAL_CATEGORY_INTERVAL_MINUTES) *
      60_000;
  const motivationalToday = input.existing.filter(
    (notification) =>
      isMotivationalNotification(notification.type) &&
      new Date(notification.createdAt).getTime() > dayStart,
  );
  if (
    motivationalToday.length >=
    (input.dailyLimit ?? DEFAULT_MOTIVATIONAL_DAILY_LIMIT)
  ) {
    return true;
  }

  const category = notificationCategoryByType[input.type];
  return input.existing.some(
    (notification) =>
      notificationCategoryByType[notification.type] === category &&
      isMotivationalNotification(notification.type) &&
      new Date(notification.createdAt).getTime() > intervalStart,
  );
}

function parseTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(`Invalid quiet-hours time: ${value}`);
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
