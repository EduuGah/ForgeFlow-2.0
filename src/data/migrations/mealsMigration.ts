import type { MigrationDefinition } from './types';

const mealTypes = "'breakfast', 'lunch', 'dinner', 'snack', 'supper', 'other'";

export const localMealsMigration = {
  id: '0011_meals',
  name: 'nutrition meals',
  scope: 'local',
  statements: [
    `CREATE TABLE meals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK (meal_type IN (${mealTypes})),
      consumed_at TEXT NOT NULL,
      kcal REAL NOT NULL CHECK (kcal > 0),
      protein_g REAL CHECK (protein_g IS NULL OR protein_g >= 0),
      carbs_g REAL CHECK (carbs_g IS NULL OR carbs_g >= 0),
      fat_g REAL CHECK (fat_g IS NULL OR fat_g >= 0),
      photo_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_meals_user_consumed ON meals(user_id, consumed_at);',
    'CREATE INDEX idx_meals_user_updated ON meals(user_id, updated_at);',
  ],
} satisfies MigrationDefinition;

export const serverMealsMigration = {
  id: '0011_meals',
  name: 'nutrition meals',
  scope: 'server',
  statements: [
    `CREATE TABLE meals (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      meal_type TEXT NOT NULL CHECK (meal_type IN (${mealTypes})),
      consumed_at TIMESTAMPTZ NOT NULL,
      kcal NUMERIC NOT NULL CHECK (kcal > 0),
      protein_g NUMERIC CHECK (protein_g IS NULL OR protein_g >= 0),
      carbs_g NUMERIC CHECK (carbs_g IS NULL OR carbs_g >= 0),
      fat_g NUMERIC CHECK (fat_g IS NULL OR fat_g >= 0),
      photo_id UUID,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_meals_user_consumed ON meals(user_id, consumed_at);',
    'CREATE INDEX idx_meals_user_updated ON meals(user_id, updated_at);',
  ],
} satisfies MigrationDefinition;
