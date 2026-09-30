import {
  localChallengesMigration,
  serverChallengesMigration,
} from './challengesMigration';
import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';

describe('social challenges migration', () => {
  it('registers the challenge migration last in both stores', () => {
    expect(localMigrations.at(-1)).toBe(localChallengesMigration);
    expect(serverMigrations.at(-1)).toBe(serverChallengesMigration);
  });

  it('creates challenges and unique participation records', () => {
    const localSql = localChallengesMigration.statements.join(' ');
    const serverSql = serverChallengesMigration.statements.join(' ');

    expect(localSql).toContain('CREATE TABLE challenges');
    expect(localSql).toContain('CREATE TABLE challenge_participants');
    expect(localSql).toContain('UNIQUE (challenge_id, user_id)');
    expect(serverSql).toContain('creator_user_id UUID');
    expect(serverSql).toContain('ends_at TIMESTAMPTZ');
  });
});
