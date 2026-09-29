import type { MigrationDefinition } from './types';

const localStatements = [
  `CREATE TABLE social_profiles (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    is_private INTEGER NOT NULL DEFAULT 1 CHECK (is_private IN (0, 1)),
    shares_workout_stats INTEGER NOT NULL DEFAULT 0 CHECK (shares_workout_stats IN (0, 1)),
    updated_at TEXT NOT NULL
  );`,
  'CREATE INDEX idx_social_profiles_display_name ON social_profiles(display_name COLLATE NOCASE);',
  `CREATE TABLE friendships (
    id TEXT PRIMARY KEY,
    requester_user_id TEXT NOT NULL,
    addressee_user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (requester_user_id <> addressee_user_id)
  );`,
  'CREATE INDEX idx_friendships_requester_status ON friendships(requester_user_id, status, updated_at DESC);',
  'CREATE INDEX idx_friendships_addressee_status ON friendships(addressee_user_id, status, updated_at DESC);',
  `CREATE TABLE user_blocks (
    id TEXT PRIMARY KEY,
    blocker_user_id TEXT NOT NULL,
    blocked_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    CHECK (blocker_user_id <> blocked_user_id),
    UNIQUE (blocker_user_id, blocked_user_id)
  );`,
  'CREATE INDEX idx_user_blocks_blocked_active ON user_blocks(blocked_user_id, deleted_at);',
];

const serverStatements = localStatements.map((statement) =>
  statement
    .replaceAll(' COLLATE NOCASE', '')
    .replaceAll(' TEXT PRIMARY KEY', ' UUID PRIMARY KEY')
    .replaceAll('user_id TEXT', 'user_id UUID')
    .replaceAll('requester_user_id TEXT', 'requester_user_id UUID')
    .replaceAll('addressee_user_id TEXT', 'addressee_user_id UUID')
    .replaceAll('blocker_user_id TEXT', 'blocker_user_id UUID')
    .replaceAll('blocked_user_id TEXT', 'blocked_user_id UUID')
    .replaceAll('created_at TEXT', 'created_at TIMESTAMPTZ')
    .replaceAll('updated_at TEXT', 'updated_at TIMESTAMPTZ')
    .replaceAll('deleted_at TEXT', 'deleted_at TIMESTAMPTZ'),
);

export const localSocialMigration = {
  id: '0015_social_relationships',
  name: 'social profiles and friendships',
  scope: 'local',
  statements: localStatements,
} satisfies MigrationDefinition;

export const serverSocialMigration = {
  id: '0015_social_relationships',
  name: 'social profiles and friendships',
  scope: 'server',
  statements: serverStatements,
} satisfies MigrationDefinition;
