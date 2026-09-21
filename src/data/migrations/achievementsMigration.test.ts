import {
  localAchievementsMigration,
  serverAchievementsMigration,
} from './achievementsMigration';

describe('achievement migrations', () => {
  it('persists one unlock per user and achievement type in both stores', () => {
    for (const migration of [
      localAchievementsMigration,
      serverAchievementsMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0007_achievements');
      expect(sql).toContain('CREATE TABLE achievements');
      expect(sql).toContain('UNIQUE (user_id, achievement_type)');
      expect(sql).toContain('metadata_json');
      expect(sql).toContain('idx_achievements_user_achieved');
    }
  });
});
