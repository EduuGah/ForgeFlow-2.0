import type { MigrationDefinition } from './types';

const uploadStatuses = "'pending', 'uploading', 'uploaded', 'failed'";
const queueStatuses = "'pending', 'processing', 'failed', 'completed'";

export const localMediaMigration = {
  id: '0012_media',
  name: 'media and upload queue',
  scope: 'local',
  statements: [
    `CREATE TABLE media (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      local_uri TEXT,
      remote_url TEXT,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
      upload_status TEXT NOT NULL CHECK (upload_status IN (${uploadStatuses})),
      checksum TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (local_uri IS NOT NULL OR remote_url IS NOT NULL)
    );`,
    'CREATE INDEX idx_media_user_updated ON media(user_id, updated_at);',
    'CREATE INDEX idx_media_user_status ON media(user_id, upload_status);',
    `CREATE TABLE media_upload_queue (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN (${queueStatuses})),
      attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
      next_attempt_at TEXT NOT NULL,
      last_attempt_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_media_upload_queue_ready ON media_upload_queue(status, next_attempt_at);',
  ],
} satisfies MigrationDefinition;

export const serverMediaMigration = {
  id: '0012_media',
  name: 'media',
  scope: 'server',
  statements: [
    `CREATE TABLE media (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      local_uri TEXT,
      remote_url TEXT,
      mime_type TEXT NOT NULL,
      size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
      upload_status TEXT NOT NULL CHECK (upload_status IN (${uploadStatuses})),
      checksum TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (local_uri IS NOT NULL OR remote_url IS NOT NULL)
    );`,
    'CREATE INDEX idx_media_user_updated ON media(user_id, updated_at);',
    'CREATE INDEX idx_media_user_status ON media(user_id, upload_status);',
  ],
} satisfies MigrationDefinition;
