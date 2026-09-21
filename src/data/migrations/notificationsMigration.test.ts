import {
  localNotificationsMigration,
  serverNotificationsMigration,
} from './notificationsMigration';

describe('notification migrations', () => {
  it('creates deduplicated notification storage and delivery indexes', () => {
    for (const migration of [
      localNotificationsMigration,
      serverNotificationsMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0008_notifications');
      expect(sql).toContain('CREATE TABLE notifications');
      expect(sql).toContain('UNIQUE (user_id, dedupe_key)');
      expect(sql).toContain('scheduled_for');
      expect(sql).toContain('delivery_status');
      expect(sql).toContain('idx_notifications_user_created');
      expect(sql).toContain('idx_notifications_user_read_created');
    }
  });
});
