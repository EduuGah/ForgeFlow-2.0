import {
  localPushDevicesMigration,
  serverPushDevicesMigration,
} from './pushDevicesMigration';

describe('push device migrations', () => {
  it('stores unique active device registrations in both databases', () => {
    for (const migration of [
      localPushDevicesMigration,
      serverPushDevicesMigration,
    ]) {
      const sql = migration.statements.join(' ').replace(/\s+/g, ' ');
      expect(migration.id).toBe('0009_push_devices');
      expect(sql).toContain('CREATE TABLE push_devices');
      expect(sql).toContain('UNIQUE (user_id, expo_push_token)');
      expect(sql).toContain('device_push_token');
      expect(sql).toContain('idx_push_devices_user_active');
    }
  });
});
