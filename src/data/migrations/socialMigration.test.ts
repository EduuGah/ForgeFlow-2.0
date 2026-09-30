import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';
import { localSocialMigration, serverSocialMigration } from './socialMigration';

describe('social relationships migration', () => {
  it('registers after the performance indexes in both stores', () => {
    expect(localMigrations).toContain(localSocialMigration);
    expect(serverMigrations).toContain(serverSocialMigration);
  });

  it('persists profiles, friendships and blocks with privacy constraints', () => {
    const localSql = normalize(localSocialMigration.statements);
    const serverSql = normalize(serverSocialMigration.statements);

    for (const sql of [localSql, serverSql]) {
      expect(sql).toContain('create table social_profiles');
      expect(sql).toContain('create table friendships');
      expect(sql).toContain('create table user_blocks');
      expect(sql).toContain(
        "status in ('pending', 'accepted', 'declined', 'removed')",
      );
      expect(sql).toContain('check (requester_user_id <> addressee_user_id)');
      expect(sql).toContain('unique (blocker_user_id, blocked_user_id)');
    }
    expect(serverSql).toContain('user_id uuid primary key');
    expect(serverSql).not.toContain('collate nocase');
  });
});

function normalize(statements: readonly string[]) {
  return statements.join('\n').replace(/\s+/g, ' ').toLowerCase();
}
