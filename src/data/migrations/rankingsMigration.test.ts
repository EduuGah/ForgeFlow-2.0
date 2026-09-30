import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';
import {
  localRankingsMigration,
  serverRankingsMigration,
} from './rankingsMigration';

describe('rankings migration', () => {
  it('registers an explicit opt-in after social profiles', () => {
    expect(localMigrations.at(-1)).toBe(localRankingsMigration);
    expect(serverMigrations.at(-1)).toBe(serverRankingsMigration);
    const sql = localRankingsMigration.statements.join(' ').toLowerCase();
    expect(sql).toContain('ranking_opt_in integer not null default 0');
    expect(sql).toContain('ranking_opt_in in (0, 1)');
  });
});
