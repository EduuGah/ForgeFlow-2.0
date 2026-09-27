import {
  localNotificationPreferencesMigration,
  serverNotificationPreferencesMigration,
} from './notificationPreferencesMigration';

describe('notification preferences migrations', () => {
  it('stores user controls locally and on the server', () => {
    for (const migration of [
      localNotificationPreferencesMigration,
      serverNotificationPreferencesMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0010_notification_preferences');
      expect(sql).toContain('CREATE TABLE notification_preferences');
      expect(sql).toContain('user_id');
      expect(sql).toContain('UNIQUE');
      expect(sql).toContain('push_enabled');
      expect(sql).toContain('frequency_mode');
      expect(sql).toContain('quiet_hours_start');
      expect(sql).toContain('quiet_hours_end');
    }
  });
});
