import { localGoalsMigration, serverGoalsMigration } from './goalsMigration';

describe('goals migration', () => {
  it('creates matching local and server goal tables with all supported types', () => {
    for (const migration of [localGoalsMigration, serverGoalsMigration]) {
      const sql = migration.statements
        .join(' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();
      expect(sql).toContain('create table goals');
      expect(sql).toContain("'exercise_weight'");
      expect(sql).toContain("'pr_achievement'");
      expect(sql).toContain("'custom_value'");
      expect(sql).toContain("'workout_frequency_per_week'");
      expect(sql).toContain('check (target_value >= 0)');
      expect(sql).toContain('idx_goals_user_status');
    }
  });
});
