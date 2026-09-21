import type { MigrationDefinition } from './types';

const notificationTypes =
  "'achievement_unlocked', 'consistency_milestone', 'goal_behind', 'goal_completed', 'goal_progress', 'hydration_reminder', 'inactivity_threshold', 'new_pr', 'nutrition_reminder', 'report_ready', 'workout_completed'";

export const localNotificationsMigration = {
  id: '0008_notifications',
  name: 'notifications',
  scope: 'local',
  statements: [
    `CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN (${notificationTypes})),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data_json TEXT,
      dedupe_key TEXT NOT NULL,
      delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
      read_at TEXT,
      archived_at TEXT,
      scheduled_for TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      UNIQUE (user_id, dedupe_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);',
    'CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, read_at, created_at);',
  ],
} satisfies MigrationDefinition;

export const serverNotificationsMigration = {
  id: '0008_notifications',
  name: 'notifications',
  scope: 'server',
  statements: [
    `CREATE TABLE notifications (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      type TEXT NOT NULL CHECK (type IN (${notificationTypes})),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data_json JSONB,
      dedupe_key TEXT NOT NULL,
      delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
      read_at TIMESTAMPTZ,
      archived_at TIMESTAMPTZ,
      scheduled_for TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ,
      UNIQUE (user_id, dedupe_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);',
    'CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, read_at, created_at);',
  ],
} satisfies MigrationDefinition;
