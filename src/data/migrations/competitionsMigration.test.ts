import {
  localCompetitionsMigration,
  serverCompetitionsMigration,
} from './competitionsMigration';
import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';

describe('social competitions migration', () => {
  it('registers the migration last in both stores', () => {
    expect(localMigrations.at(-1)).toBe(localCompetitionsMigration);
    expect(serverMigrations.at(-1)).toBe(serverCompetitionsMigration);
  });

  it('persists immutable rule versions, participants and final results', () => {
    const sql = localCompetitionsMigration.statements.join(' ');
    expect(sql).toContain('rules_version INTEGER NOT NULL');
    expect(sql).toContain('UNIQUE (competition_id, user_id)');
    expect(sql).toContain('CREATE TABLE competition_results');
    expect(serverCompetitionsMigration.statements.join(' ')).toContain(
      'finalized_at TIMESTAMPTZ',
    );
  });
});
