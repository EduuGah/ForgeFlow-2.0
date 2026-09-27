import { localMediaMigration, serverMediaMigration } from './mediaMigration';

describe('media migrations', () => {
  it('stores file references without base64 and keeps the upload queue local', () => {
    const localSql = localMediaMigration.statements
      .join(' ')
      .replace(/\s+/g, ' ');
    const serverSql = serverMediaMigration.statements
      .join(' ')
      .replace(/\s+/g, ' ');

    expect(localMediaMigration.id).toBe('0012_media');
    expect(serverMediaMigration.id).toBe('0012_media');
    for (const sql of [localSql, serverSql]) {
      expect(sql).toContain('CREATE TABLE media');
      expect(sql).toContain('local_uri');
      expect(sql).toContain('remote_url');
      expect(sql).toContain('upload_status');
      expect(sql.toLowerCase()).not.toContain('base64');
    }
    expect(localSql).toContain('CREATE TABLE media_upload_queue');
    expect(localSql).toContain('attempt_count');
    expect(localSql).toContain('next_attempt_at');
    expect(serverSql).not.toContain('media_upload_queue');
  });
});
