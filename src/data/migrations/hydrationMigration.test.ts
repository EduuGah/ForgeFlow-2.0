import {
  localHydrationMigration,
  serverHydrationMigration,
} from './hydrationMigration';

describe('hydration migrations', () => {
  it('creates local and server entries, goals and reporting indexes', () => {
    for (const migration of [
      localHydrationMigration,
      serverHydrationMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0013_hydration');
      expect(sql).toContain('CREATE TABLE hydration_entries');
      expect(sql).toContain('CREATE TABLE hydration_goals');
      expect(sql).toContain('amount_ml');
      expect(sql).toContain('recorded_at');
      expect(sql).toContain('target_ml');
      expect(sql).toContain('CHECK (amount_ml > 0)');
      expect(sql).toContain('CHECK (target_ml > 0)');
      expect(sql).toContain('idx_hydration_entries_user_recorded');
      expect(sql).toContain('idx_hydration_entries_user_updated');
    }
  });
});
