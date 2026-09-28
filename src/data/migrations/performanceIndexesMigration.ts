import type { MigrationDefinition } from './types';

const commonIndexes = [
  `CREATE INDEX idx_workout_sessions_user_status_started
    ON workout_sessions(user_id, status, started_at DESC);`,
  `CREATE INDEX idx_workout_sessions_user_status_completed
    ON workout_sessions(user_id, status, completed_at);`,
  `CREATE INDEX idx_session_exercises_session_active_position
    ON session_exercises(session_id, deleted_at, position);`,
  `CREATE INDEX idx_sets_session_active_number
    ON sets(session_exercise_id, deleted_at, set_number);`,
  `CREATE INDEX idx_workout_exercises_workout_active_position
    ON workout_exercises(workout_id, deleted_at, position);`,
  `CREATE INDEX idx_personal_records_user_exercise_type_achieved
    ON personal_records(user_id, exercise_id, record_type, achieved_at);`,
  `CREATE INDEX idx_goals_user_deleted_status_created
    ON goals(user_id, deleted_at, status, created_at DESC);`,
] as const;

export const localPerformanceIndexesMigration = {
  id: '0014_performance_indexes',
  name: 'performance indexes',
  scope: 'local',
  statements: commonIndexes,
} satisfies MigrationDefinition;

export const serverPerformanceIndexesMigration = {
  id: '0014_performance_indexes',
  name: 'performance indexes',
  scope: 'server',
  statements: commonIndexes,
} satisfies MigrationDefinition;
