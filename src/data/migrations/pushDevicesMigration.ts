import type { MigrationDefinition } from './types';

export const localPushDevicesMigration = {
  id: '0009_push_devices',
  name: 'push devices',
  scope: 'local',
  statements: [
    `CREATE TABLE push_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
      expo_push_token TEXT NOT NULL,
      device_push_token TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      disabled_at TEXT,
      UNIQUE (user_id, expo_push_token),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_push_devices_user_active ON push_devices(user_id, disabled_at);',
  ],
} satisfies MigrationDefinition;

export const serverPushDevicesMigration = {
  id: '0009_push_devices',
  name: 'push devices',
  scope: 'server',
  statements: [
    `CREATE TABLE push_devices (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
      expo_push_token TEXT NOT NULL,
      device_push_token TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      disabled_at TIMESTAMPTZ,
      UNIQUE (user_id, expo_push_token),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_push_devices_user_active ON push_devices(user_id, disabled_at);',
  ],
} satisfies MigrationDefinition;
