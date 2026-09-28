import { localMigrations } from './localMigrations';
import {
  localPerformanceIndexesMigration,
  serverPerformanceIndexesMigration,
} from './performanceIndexesMigration';
import { serverMigrations } from './serverMigrations';

describe('performance index migrations', () => {
  it('adds the high-volume read indexes to local and server schemas', () => {
    expect(localMigrations).toContain(localPerformanceIndexesMigration);
    expect(serverMigrations).toContain(serverPerformanceIndexesMigration);

    for (const migration of [
      localPerformanceIndexesMigration,
      serverPerformanceIndexesMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0014_performance_indexes');
      expect(sql).toContain(
        'workout_sessions(user_id, status, started_at DESC)',
      );
      expect(sql).toContain('workout_sessions(user_id, status, completed_at)');
      expect(sql).toContain(
        'sets(session_exercise_id, deleted_at, set_number)',
      );
      expect(sql).toContain(
        'personal_records(user_id, exercise_id, record_type, achieved_at)',
      );
    }
  });
});
