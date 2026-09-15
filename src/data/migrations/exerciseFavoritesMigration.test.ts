import {
  localExerciseFavoritesMigration,
  serverExerciseFavoritesMigration,
} from './exerciseFavoritesMigration';
import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';

describe('exercise favorites migration', () => {
  it('registers local and server migrations after the core schema', () => {
    expect(localMigrations).toContain(localExerciseFavoritesMigration);
    expect(serverMigrations).toContain(serverExerciseFavoritesMigration);
    expect(localExerciseFavoritesMigration).toMatchObject({
      id: '0003_exercise_favorites',
      name: 'exercise favorites',
      scope: 'local',
    });
    expect(serverExerciseFavoritesMigration).toMatchObject({
      id: '0003_exercise_favorites',
      name: 'exercise favorites',
      scope: 'server',
    });
  });

  it('creates one favorite per user and exercise with relationship indexes', () => {
    const localSql = normalizeSql(localExerciseFavoritesMigration.statements);
    const serverSql = normalizeSql(serverExerciseFavoritesMigration.statements);

    for (const sql of [localSql, serverSql]) {
      expect(sql).toContain('create table exercise_favorites');
      expect(sql).toContain('unique (user_id, exercise_id)');
      expect(sql).toContain(
        'foreign key (user_id) references users(id) on delete cascade',
      );
      expect(sql).toContain(
        'foreign key (exercise_id) references exercises(id) on delete cascade',
      );
      expect(sql).toContain('idx_exercise_favorites_user_id');
      expect(sql).toContain('idx_exercise_favorites_exercise_id');
    }
  });
});

function normalizeSql(statements: readonly string[]) {
  return statements.join('\n').replace(/\s+/g, ' ').toLowerCase();
}
