import type { EntityId, ISODateTimeString } from '../shared/types';

export type NotificationEventType =
  | 'achievement_unlocked'
  | 'consistency_milestone'
  | 'goal_behind'
  | 'goal_completed'
  | 'goal_progress'
  | 'hydration_reminder'
  | 'inactivity_threshold'
  | 'new_pr'
  | 'nutrition_reminder'
  | 'report_ready'
  | 'workout_completed';

export type NotificationCategory =
  | 'achievements'
  | 'goals'
  | 'hydration'
  | 'inactivity'
  | 'nutrition'
  | 'personal_records'
  | 'progress'
  | 'reports'
  | 'workouts';

export type NotificationEvent = {
  body: string;
  data: Record<string, number | string> | null;
  dedupeKey: string;
  expiresAt: ISODateTimeString | null;
  occurredAt: ISODateTimeString;
  title: string;
  type: NotificationEventType;
  userId: EntityId;
};

export type Notification = {
  archivedAt: ISODateTimeString | null;
  body: string;
  createdAt: ISODateTimeString;
  data: Record<string, number | string> | null;
  dedupeKey: string;
  deliveryStatus: 'failed' | 'pending' | 'sent';
  expiresAt: ISODateTimeString | null;
  id: EntityId;
  readAt: ISODateTimeString | null;
  scheduledFor: ISODateTimeString;
  title: string;
  type: NotificationEventType;
  userId: EntityId;
};

export type NotificationPreferencesSnapshot = {
  enabledCategories: NotificationCategory[];
  quietHoursEnd: string | null;
  quietHoursStart: string | null;
  timezoneOffsetMinutes: number;
};
