import type { MigrationDefinition } from './types';

export const localExerciseFavoritesMigration = {
  id: '0003_exercise_favorites',
  name: 'exercise favorites',
  scope: 'local',
  statements: [
    `CREATE TABLE exercise_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, exercise_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_exercise_favorites_user_id ON exercise_favorites(user_id);',
    'CREATE INDEX idx_exercise_favorites_exercise_id ON exercise_favorites(exercise_id);',
  ],
} satisfies MigrationDefinition;

export const serverExerciseFavoritesMigration = {
  id: '0003_exercise_favorites',
  name: 'exercise favorites',
  scope: 'server',
  statements: [
    `CREATE TABLE exercise_favorites (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL,
      exercise_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      UNIQUE (user_id, exercise_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX idx_exercise_favorites_user_id ON exercise_favorites(user_id);',
    'CREATE INDEX idx_exercise_favorites_exercise_id ON exercise_favorites(exercise_id);',
  ],
} satisfies MigrationDefinition;
