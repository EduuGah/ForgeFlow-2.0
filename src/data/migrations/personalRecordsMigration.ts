import type { MigrationDefinition } from './types';

export const localPersonalRecordsMigration = {
  id: '0004_personal_records',
  name: 'personal records',
  scope: 'local',
  statements: [
    `CREATE TABLE personal_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      record_type TEXT NOT NULL CHECK (
        record_type IN ('weight', 'volume', 'repetitions', 'estimated_1rm')
      ),
      value REAL NOT NULL CHECK (value >= 0),
      context_weight_kg REAL,
      source_set_id TEXT NOT NULL,
      achieved_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (source_set_id) REFERENCES sets(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);',
    'CREATE INDEX idx_personal_records_source_set ON personal_records(source_set_id);',
    `CREATE UNIQUE INDEX personal_records_source_metric_unique
      ON personal_records(
        user_id, source_set_id, record_type, COALESCE(context_weight_kg, -1)
      );`,
  ],
} satisfies MigrationDefinition;

export const serverPersonalRecordsMigration = {
  id: '0004_personal_records',
  name: 'personal records',
  scope: 'server',
  statements: [
    `CREATE TABLE personal_records (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      exercise_id UUID NOT NULL,
      record_type TEXT NOT NULL CHECK (
        record_type IN ('weight', 'volume', 'repetitions', 'estimated_1rm')
      ),
      value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
      context_weight_kg NUMERIC(7, 2),
      source_set_id UUID NOT NULL,
      achieved_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (source_set_id) REFERENCES sets(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_personal_records_user_exercise ON personal_records(user_id, exercise_id);',
    'CREATE INDEX idx_personal_records_source_set ON personal_records(source_set_id);',
    `CREATE UNIQUE INDEX personal_records_source_metric_unique
      ON personal_records(
        user_id, source_set_id, record_type, COALESCE(context_weight_kg, -1)
      );`,
  ],
} satisfies MigrationDefinition;
