import type { MigrationDefinition } from './types';

const localStatements = [
  `CREATE TABLE competitions (
    id TEXT PRIMARY KEY,
    creator_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    metric TEXT NOT NULL CHECK (metric IN ('volume', 'frequency', 'consistency')),
    registration_ends_at TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    rules_version INTEGER NOT NULL DEFAULT 1 CHECK (rules_version > 0),
    status TEXT NOT NULL CHECK (status IN ('registration', 'active', 'finished', 'cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (registration_ends_at <= starts_at),
    CHECK (ends_at > starts_at)
  );`,
  'CREATE INDEX idx_competitions_status_period ON competitions(status, starts_at, ends_at);',
  `CREATE TABLE competition_participants (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'left', 'disqualified')),
    joined_at TEXT NOT NULL,
    left_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE (competition_id, user_id)
  );`,
  'CREATE INDEX idx_competition_participants_user ON competition_participants(user_id, status);',
  `CREATE TABLE competition_results (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL UNIQUE REFERENCES competitions(id) ON DELETE CASCADE,
    rules_version INTEGER NOT NULL CHECK (rules_version > 0),
    standings_json TEXT NOT NULL,
    finalized_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
];

const serverStatements = localStatements.map((statement) =>
  statement
    .replaceAll(' TEXT PRIMARY KEY', ' UUID PRIMARY KEY')
    .replaceAll('creator_user_id TEXT', 'creator_user_id UUID')
    .replaceAll('competition_id TEXT', 'competition_id UUID')
    .replaceAll('user_id TEXT', 'user_id UUID')
    .replaceAll('registration_ends_at TEXT', 'registration_ends_at TIMESTAMPTZ')
    .replaceAll('starts_at TEXT', 'starts_at TIMESTAMPTZ')
    .replaceAll('ends_at TEXT', 'ends_at TIMESTAMPTZ')
    .replaceAll('created_at TEXT', 'created_at TIMESTAMPTZ')
    .replaceAll('updated_at TEXT', 'updated_at TIMESTAMPTZ')
    .replaceAll('joined_at TEXT', 'joined_at TIMESTAMPTZ')
    .replaceAll('left_at TEXT', 'left_at TIMESTAMPTZ')
    .replaceAll('finalized_at TEXT', 'finalized_at TIMESTAMPTZ'),
);

export const localCompetitionsMigration = {
  id: '0018_social_competitions',
  name: 'social competitions',
  scope: 'local',
  statements: localStatements,
} satisfies MigrationDefinition;

export const serverCompetitionsMigration = {
  id: '0018_social_competitions',
  name: 'social competitions',
  scope: 'server',
  statements: serverStatements,
} satisfies MigrationDefinition;
