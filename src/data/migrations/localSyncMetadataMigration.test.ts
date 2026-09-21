import { localMigrations } from './localMigrations';
import { localSyncMetadataMigration } from './localSyncMetadataMigration';
import { serverMigrations } from './serverMigrations';

describe('local sync metadata migration', () => {
  it('registers after the initial local schema migration', () => {
    expect(localMigrations.map((migration) => migration.id)).toStrictEqual([
      '0001_initial_core_schema',
      '0002_sync_metadata',
      '0003_exercise_favorites',
      '0004_personal_records',
      '0005_goals',
      '0006_goal_progress_events',
    ]);
    expect(localSyncMetadataMigration).toMatchObject({
      id: '0002_sync_metadata',
      name: 'sync metadata and outbox',
      scope: 'local',
    });
  });

  it('creates the local outbox and cursor state tables', () => {
    expect(
      getCreatedTables(localSyncMetadataMigration.statements),
    ).toStrictEqual(['sync_operations', 'sync_state']);
  });

  it('keeps sync metadata local-only', () => {
    const serverSql = normalizeSql(
      serverMigrations.flatMap((migration) => migration.statements),
    );

    expect(serverSql).not.toContain('sync_operations');
    expect(serverSql).not.toContain('sync_state');
  });

  it('enforces idempotent operations and retry state constraints', () => {
    const sql = normalizeSql(localSyncMetadataMigration.statements);

    expect(sql).toContain('operation_id text primary key');
    expect(sql).toContain("operation_type in ('upsert', 'delete')");
    expect(sql).toContain('attempt_count integer not null default 0');
    expect(sql).toContain('check (attempt_count >= 0)');
    expect(sql).toContain(
      "status in ('pending', 'processing', 'failed', 'completed')",
    );
    expect(sql).toContain('last_attempt_at text');
    expect(sql).toContain('last_error text');
  });

  it('stores sync cursors by scope and key', () => {
    const sql = normalizeSql(localSyncMetadataMigration.statements);

    expect(sql).toContain('scope text not null');
    expect(sql).toContain('key text not null');
    expect(sql).toContain('server_cursor text');
    expect(sql).toContain('last_success_at text');
    expect(sql).toContain('primary key (scope, key)');
  });

  it('indexes pending operation lookup and entity lookup paths', () => {
    const sql = normalizeSql(localSyncMetadataMigration.statements);

    expect(sql).toContain(
      'idx_sync_operations_status_created_at on sync_operations(status, created_at)',
    );
    expect(sql).toContain(
      'idx_sync_operations_entity on sync_operations(entity_type, entity_id)',
    );
  });
});

function getCreatedTables(statements: readonly string[]) {
  return statements.flatMap((statement) => {
    const match = statement.match(/CREATE TABLE ([a-z_]+)/i);

    return match ? [match[1]] : [];
  });
}

function normalizeSql(statements: readonly string[]) {
  return statements.join('\n').replace(/\s+/g, ' ').toLowerCase();
}
