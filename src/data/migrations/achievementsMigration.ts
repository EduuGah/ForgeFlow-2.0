import type { MigrationDefinition } from './types';

export const localAchievementsMigration = {
  id: '0007_achievements',
  name: 'achievements',
  scope: 'local',
  statements: [
    `CREATE TABLE achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_type TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      achieved_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, achievement_type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_achievements_user_achieved ON achievements(user_id, achieved_at);',
  ],
} satisfies MigrationDefinition;

export const serverAchievementsMigration = {
  id: '0007_achievements',
  name: 'achievements',
  scope: 'server',
  statements: [
    `CREATE TABLE achievements (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      achievement_type TEXT NOT NULL,
      metadata_json JSONB NOT NULL,
      achieved_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE (user_id, achievement_type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_achievements_user_achieved ON achievements(user_id, achieved_at);',
  ],
} satisfies MigrationDefinition;
