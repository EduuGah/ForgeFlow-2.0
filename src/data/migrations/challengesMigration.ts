import type { MigrationDefinition } from './types';

const localStatements = [
  `CREATE TABLE challenges (
    id TEXT PRIMARY KEY,
    creator_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    metric TEXT NOT NULL CHECK (metric IN ('volume', 'frequency', 'consistency')),
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'finished', 'cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (ends_at > starts_at)
  );`,
  'CREATE INDEX idx_challenges_status_end ON challenges(status, ends_at);',
  `CREATE TABLE challenge_participants (
    id TEXT PRIMARY KEY,
    challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'left')),
    joined_at TEXT NOT NULL,
    left_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE (challenge_id, user_id)
  );`,
  'CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id, status);',
];

const serverStatements = localStatements.map((statement) =>
  statement
    .replaceAll(' TEXT PRIMARY KEY', ' UUID PRIMARY KEY')
    .replaceAll('creator_user_id TEXT', 'creator_user_id UUID')
    .replaceAll('challenge_id TEXT', 'challenge_id UUID')
    .replaceAll('user_id TEXT', 'user_id UUID')
    .replaceAll('starts_at TEXT', 'starts_at TIMESTAMPTZ')
    .replaceAll('ends_at TEXT', 'ends_at TIMESTAMPTZ')
    .replaceAll('created_at TEXT', 'created_at TIMESTAMPTZ')
    .replaceAll('updated_at TEXT', 'updated_at TIMESTAMPTZ')
    .replaceAll('joined_at TEXT', 'joined_at TIMESTAMPTZ')
    .replaceAll('left_at TEXT', 'left_at TIMESTAMPTZ'),
);

export const localChallengesMigration = {
  id: '0017_social_challenges',
  name: 'social challenges',
  scope: 'local',
  statements: localStatements,
} satisfies MigrationDefinition;

export const serverChallengesMigration = {
  id: '0017_social_challenges',
  name: 'social challenges',
  scope: 'server',
  statements: serverStatements,
} satisfies MigrationDefinition;
