import type { MigrationDefinition } from './types';

const goalTypes =
  "'body_weight', 'custom', 'exercise_repetitions', 'exercise_volume', 'exercise_weight', 'monthly_workout_count', 'pr_achievement', 'total_volume', 'workout_frequency'";
const goalMetrics =
  "'body_weight_kg', 'custom_value', 'personal_record_count', 'repetitions', 'volume_kg', 'weight_kg', 'workout_count', 'workout_frequency_per_week'";
const goalStatuses =
  "'active', 'behind', 'cancelled', 'completed', 'expired', 'on_track', 'paused'";

export const localGoalsMigration = {
  id: '0005_goals',
  name: 'goals',
  scope: 'local',
  statements: [
    `CREATE TABLE goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN (${goalTypes})),
      title TEXT NOT NULL,
      exercise_id TEXT,
      metric TEXT NOT NULL CHECK (metric IN (${goalMetrics})),
      baseline_value REAL,
      target_value REAL NOT NULL CHECK (target_value >= 0),
      deadline TEXT,
      status TEXT NOT NULL CHECK (status IN (${goalStatuses})),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      deleted_at TEXT,
      CHECK (baseline_value IS NULL OR baseline_value >= 0),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
    );`,
    'CREATE INDEX idx_goals_user_status ON goals(user_id, status);',
    'CREATE INDEX idx_goals_exercise_id ON goals(exercise_id);',
  ],
} satisfies MigrationDefinition;

export const serverGoalsMigration = {
  id: '0005_goals',
  name: 'goals',
  scope: 'server',
  statements: [
    `CREATE TABLE goals (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      type TEXT NOT NULL CHECK (type IN (${goalTypes})),
      title TEXT NOT NULL,
      exercise_id UUID,
      metric TEXT NOT NULL CHECK (metric IN (${goalMetrics})),
      baseline_value NUMERIC(12, 2),
      target_value NUMERIC(12, 2) NOT NULL CHECK (target_value >= 0),
      deadline TIMESTAMPTZ,
      status TEXT NOT NULL CHECK (status IN (${goalStatuses})),
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      completed_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      CHECK (baseline_value IS NULL OR baseline_value >= 0),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
    );`,
    'CREATE INDEX idx_goals_user_status ON goals(user_id, status);',
    'CREATE INDEX idx_goals_exercise_id ON goals(exercise_id);',
  ],
} satisfies MigrationDefinition;
