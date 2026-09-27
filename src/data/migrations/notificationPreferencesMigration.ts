import type { MigrationDefinition } from './types';

const frequencyModes = "'reduced', 'intelligent', 'frequent'";

export const localNotificationPreferencesMigration = {
  id: '0010_notification_preferences',
  name: 'notification preferences',
  scope: 'local',
  statements: [
    `CREATE TABLE notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      push_enabled INTEGER NOT NULL DEFAULT 0 CHECK (push_enabled IN (0, 1)),
      workouts_enabled INTEGER NOT NULL DEFAULT 1 CHECK (workouts_enabled IN (0, 1)),
      goals_enabled INTEGER NOT NULL DEFAULT 1 CHECK (goals_enabled IN (0, 1)),
      prs_enabled INTEGER NOT NULL DEFAULT 1 CHECK (prs_enabled IN (0, 1)),
      progress_enabled INTEGER NOT NULL DEFAULT 1 CHECK (progress_enabled IN (0, 1)),
      inactivity_enabled INTEGER NOT NULL DEFAULT 1 CHECK (inactivity_enabled IN (0, 1)),
      achievements_enabled INTEGER NOT NULL DEFAULT 1 CHECK (achievements_enabled IN (0, 1)),
      reports_enabled INTEGER NOT NULL DEFAULT 1 CHECK (reports_enabled IN (0, 1)),
      nutrition_enabled INTEGER NOT NULL DEFAULT 0 CHECK (nutrition_enabled IN (0, 1)),
      hydration_enabled INTEGER NOT NULL DEFAULT 0 CHECK (hydration_enabled IN (0, 1)),
      quiet_hours_start TEXT,
      quiet_hours_end TEXT,
      timezone_offset_minutes INTEGER NOT NULL,
      frequency_mode TEXT NOT NULL DEFAULT 'intelligent' CHECK (frequency_mode IN (${frequencyModes})),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
        (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL))
    );`,
    'CREATE INDEX idx_notification_preferences_user_updated ON notification_preferences(user_id, updated_at);',
  ],
} satisfies MigrationDefinition;

export const serverNotificationPreferencesMigration = {
  id: '0010_notification_preferences',
  name: 'notification preferences',
  scope: 'server',
  statements: [
    `CREATE TABLE notification_preferences (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE,
      push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      workouts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      goals_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      prs_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      progress_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      inactivity_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      achievements_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      reports_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      nutrition_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      hydration_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      quiet_hours_start TIME,
      quiet_hours_end TIME,
      timezone_offset_minutes INTEGER NOT NULL,
      frequency_mode TEXT NOT NULL DEFAULT 'intelligent' CHECK (frequency_mode IN (${frequencyModes})),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK ((quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
        (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL))
    );`,
    'CREATE INDEX idx_notification_preferences_user_updated ON notification_preferences(user_id, updated_at);',
  ],
} satisfies MigrationDefinition;
