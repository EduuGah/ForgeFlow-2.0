import type { MigrationDefinition } from './types';

const statement = `ALTER TABLE social_profiles
  ADD COLUMN ranking_opt_in INTEGER NOT NULL DEFAULT 0
  CHECK (ranking_opt_in IN (0, 1));`;

export const localRankingsMigration = {
  id: '0016_social_rankings',
  name: 'social rankings opt in',
  scope: 'local',
  statements: [statement],
} satisfies MigrationDefinition;

export const serverRankingsMigration = {
  id: '0016_social_rankings',
  name: 'social rankings opt in',
  scope: 'server',
  statements: [statement],
} satisfies MigrationDefinition;
