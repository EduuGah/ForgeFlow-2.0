import { initialLocalSchemaMigration } from './initialLocalSchemaMigration';
import { initialServerSchemaMigration } from './initialServerSchemaMigration';
import { localMigrations } from './localMigrations';
import { serverMigrations } from './serverMigrations';

const expectedCoreTables = [
  'users',
  'user_profiles',
  'exercises',
  'workouts',
  'workout_exercises',
  'workout_sessions',
  'session_exercises',
  'sets',
];

describe('initial schema migrations', () => {
  it('registers the local and server core schema migrations', () => {
    expect(localMigrations[0]).toBe(initialLocalSchemaMigration);
    expect(serverMigrations).toStrictEqual([initialServerSchemaMigration]);

    expect(initialLocalSchemaMigration).toMatchObject({
      id: '0001_initial_core_schema',
      name: 'initial core schema',
      scope: 'local',
    });
    expect(initialServerSchemaMigration).toMatchObject({
      id: '0001_initial_core_schema',
      name: 'initial core schema',
      scope: 'server',
    });
  });

  it('creates the documented core training tables in both stores', () => {
    expect(
      getCreatedTables(initialLocalSchemaMigration.statements),
    ).toStrictEqual(expectedCoreTables);
    expect(
      getCreatedTables(initialServerSchemaMigration.statements),
    ).toStrictEqual(expectedCoreTables);
  });

  it('keeps sync metadata out of the FF-004 schema', () => {
    const localSql = normalizeSql(initialLocalSchemaMigration.statements);
    const serverSql = normalizeSql(initialServerSchemaMigration.statements);

    expect(localSql).not.toContain('sync_operations');
    expect(localSql).not.toContain('sync_state');
    expect(serverSql).not.toContain('sync_operations');
    expect(serverSql).not.toContain('sync_state');
  });

  it('adds ownership, relationship and ordering constraints', () => {
    const localSql = normalizeSql(initialLocalSchemaMigration.statements);
    const serverSql = normalizeSql(initialServerSchemaMigration.statements);

    for (const sql of [localSql, serverSql]) {
      expect(sql).toContain(
        'foreign key (user_id) references users(id) on delete cascade',
      );
      expect(sql).toContain(
        'foreign key (workout_id) references workouts(id) on delete cascade',
      );
      expect(sql).toContain(
        'foreign key (session_id) references workout_sessions(id) on delete cascade',
      );
      expect(sql).toContain('unique (workout_id, position)');
      expect(sql).toContain('unique (session_id, position)');
      expect(sql).toContain('unique (session_exercise_id, set_number)');
      expect(sql).toContain("status in ('active', 'completed', 'abandoned')");
      expect(sql).toContain("set_type in ('warmup', 'working')");
    }
  });

  it('indexes expected offline and sync access paths', () => {
    const localSql = normalizeSql(initialLocalSchemaMigration.statements);
    const serverSql = normalizeSql(initialServerSchemaMigration.statements);

    for (const sql of [localSql, serverSql]) {
      expect(sql).toContain('idx_workouts_user_id');
      expect(sql).toContain('idx_workouts_user_id_updated_at');
      expect(sql).toContain('idx_workout_exercises_workout_id');
      expect(sql).toContain('idx_workout_sessions_user_id');
      expect(sql).toContain('idx_workout_sessions_user_id_updated_at');
      expect(sql).toContain('idx_session_exercises_session_id');
      expect(sql).toContain('idx_sets_session_exercise_id');
    }
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
