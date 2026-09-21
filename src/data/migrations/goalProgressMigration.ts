import type { MigrationDefinition } from './types';

const sourceTypes = "'analytics_refresh', 'manual', 'workout_completion'";

export const localGoalProgressMigration = {
  id: '0006_goal_progress_events',
  name: 'goal_progress_events',
  scope: 'local',
  statements: [
    `CREATE TABLE goal_progress_events (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      measured_value REAL NOT NULL,
      progress_percent REAL NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
      recorded_at TEXT NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN (${sourceTypes})),
      source_id TEXT,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_goal_progress_goal_recorded ON goal_progress_events(goal_id, recorded_at);',
  ],
} satisfies MigrationDefinition;

export const serverGoalProgressMigration = {
  id: '0006_goal_progress_events',
  name: 'goal_progress_events',
  scope: 'server',
  statements: [
    `CREATE TABLE goal_progress_events (
      id UUID PRIMARY KEY,
      goal_id UUID NOT NULL,
      measured_value NUMERIC(12, 2) NOT NULL,
      progress_percent NUMERIC(5, 2) NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
      recorded_at TIMESTAMPTZ NOT NULL,
      source_type TEXT NOT NULL CHECK (source_type IN (${sourceTypes})),
      source_id UUID,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_goal_progress_goal_recorded ON goal_progress_events(goal_id, recorded_at);',
  ],
} satisfies MigrationDefinition;
