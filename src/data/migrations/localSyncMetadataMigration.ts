import type { MigrationDefinition } from './types';

export const localSyncMetadataMigration = {
  id: '0002_sync_metadata',
  name: 'sync metadata and outbox',
  scope: 'local',
  statements: [
    `CREATE TABLE sync_operations (
      operation_id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation_type TEXT NOT NULL CHECK (operation_type IN ('upsert', 'delete')),
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      last_attempt_at TEXT,
      last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'failed', 'completed'))
    );`,
    `CREATE TABLE sync_state (
      scope TEXT NOT NULL,
      key TEXT NOT NULL,
      server_cursor TEXT,
      last_success_at TEXT,
      last_error TEXT,
      PRIMARY KEY (scope, key)
    );`,
    'CREATE INDEX idx_sync_operations_status_created_at ON sync_operations(status, created_at);',
    'CREATE INDEX idx_sync_operations_entity ON sync_operations(entity_type, entity_id);',
  ],
} satisfies MigrationDefinition;
