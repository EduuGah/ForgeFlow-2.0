import type { MigrationDefinition } from './types';

const localStatements = [
  `CREATE TABLE hydration_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
    recorded_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  'CREATE INDEX idx_hydration_entries_user_recorded ON hydration_entries(user_id, recorded_at);',
  'CREATE INDEX idx_hydration_entries_user_updated ON hydration_entries(user_id, updated_at);',
  `CREATE TABLE hydration_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    target_ml INTEGER NOT NULL CHECK (target_ml > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
];

const serverStatements = [
  `CREATE TABLE hydration_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  'CREATE INDEX idx_hydration_entries_user_recorded ON hydration_entries(user_id, recorded_at);',
  'CREATE INDEX idx_hydration_entries_user_updated ON hydration_entries(user_id, updated_at);',
  `CREATE TABLE hydration_goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    target_ml INTEGER NOT NULL CHECK (target_ml > 0),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
];

export const localHydrationMigration = {
  id: '0013_hydration',
  name: 'hydration tracking',
  scope: 'local',
  statements: localStatements,
} satisfies MigrationDefinition;

export const serverHydrationMigration = {
  id: '0013_hydration',
  name: 'hydration tracking',
  scope: 'server',
  statements: serverStatements,
} satisfies MigrationDefinition;
