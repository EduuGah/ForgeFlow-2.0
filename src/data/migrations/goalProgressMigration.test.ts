import {
  localGoalProgressMigration,
  serverGoalProgressMigration,
} from './goalProgressMigration';

describe('goal progress migrations', () => {
  it('creates equivalent constrained event histories locally and remotely', () => {
    for (const migration of [
      localGoalProgressMigration,
      serverGoalProgressMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0006_goal_progress_events');
      expect(sql).toContain('CREATE TABLE goal_progress_events');
      expect(sql).toContain('FOREIGN KEY (goal_id) REFERENCES goals(id)');
      expect(sql).toContain('progress_percent >= 0');
      expect(sql).toContain('progress_percent <= 100');
      expect(sql).toContain('idx_goal_progress_goal_recorded');
    }
  });
});
