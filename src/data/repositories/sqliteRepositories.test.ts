import initSqlJs, { type SqlJsStatic } from 'sql.js';

import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';
import type { Goal, GoalProgressEvent } from '../../domain/goals/entities';
import type {
  HydrationEntry,
  HydrationGoal,
} from '../../domain/hydration/entities';
import type { Meal } from '../../domain/nutrition/entities';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  PersonalRecord,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';
import { initializeLocalStorage } from '../database/initializeLocalDatabase';
import { SqlJsConnection } from '../testing/sqlJsConnection';
import { createSQLiteRepositories } from './sqliteRepositories';

const now = '2026-09-28T12:00:00.000Z';

describe('SQLite repositories', () => {
  let SQL: SqlJsStatic;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  it('reopens an active workout, its sets, and the pending outbox', async () => {
    const firstDatabase = new SQL.Database();
    const firstConnection = new SqlJsConnection(firstDatabase);
    await initializeLocalStorage(firstConnection);
    const repositories = createSQLiteRepositories(firstConnection);
    const exercise = (await repositories.exercises.listExercises())[0];
    const workout = createWorkout(exercise.id);
    const session = createSession(workout.id);
    const sessionExercise = createSessionExercise(session.id, exercise.id);
    const set = createSet(sessionExercise.id);
    const operation = createSyncOperation(set);
    const personalRecord = createPersonalRecord(set.id, exercise.id);
    const goal = createGoal(exercise.id);
    const goalProgress = createGoalProgress(goal.id, session.id);
    const meal = createMeal();
    const hydrationGoal = createHydrationGoal();
    const hydrationEntry = createHydrationEntry();

    await repositories.transaction.runInTransaction(async () => {
      await repositories.workouts.saveWorkoutTemplate(workout);
      await repositories.workoutSessions.saveWorkoutSession(session);
      await repositories.sessionExercises.saveSessionExercise(sessionExercise);
      await repositories.sets.saveTrainingSet(set);
      await repositories.personalRecords.savePersonalRecord(personalRecord);
      await repositories.goals.saveGoal(goal);
      await repositories.goalProgressEvents.saveGoalProgressEvent(goalProgress);
      await repositories.meals.saveMeal(meal);
      await repositories.hydrationGoals.saveHydrationGoal(hydrationGoal);
      await repositories.hydrationEntries.saveHydrationEntry(hydrationEntry);
      await repositories.syncOperations.enqueueSyncOperation(operation);
    });

    const seededExerciseCount = (await repositories.exercises.listExercises())
      .length;
    const persistedBytes = firstDatabase.export();
    firstDatabase.close();

    const reopenedDatabase = new SQL.Database(persistedBytes);
    const reopenedConnection = new SqlJsConnection(reopenedDatabase);
    await initializeLocalStorage(reopenedConnection);
    const reopened = createSQLiteRepositories(reopenedConnection);

    await expect(
      reopened.workouts.findWorkoutTemplateById(workout.id),
    ).resolves.toEqual(workout);
    await expect(
      reopened.workoutSessions.findActiveWorkoutSession(LOCAL_PREVIEW_USER_ID),
    ).resolves.toEqual(session);
    await expect(
      reopened.sessionExercises.listSessionExercises({
        sessionId: session.id,
      }),
    ).resolves.toEqual([sessionExercise]);
    await expect(
      reopened.sets.listTrainingSets({
        sessionExerciseId: sessionExercise.id,
      }),
    ).resolves.toEqual([set]);
    await expect(
      reopened.syncOperations.listPendingSyncOperations(),
    ).resolves.toEqual([operation]);
    await expect(
      reopened.personalRecords.listPersonalRecords({
        userId: LOCAL_PREVIEW_USER_ID,
      }),
    ).resolves.toEqual([personalRecord]);
    await expect(
      reopened.goals.listGoals({ userId: LOCAL_PREVIEW_USER_ID }),
    ).resolves.toEqual([goal]);
    await expect(
      reopened.goalProgressEvents.listGoalProgressEvents({ goalId: goal.id }),
    ).resolves.toEqual([goalProgress]);
    await expect(
      reopened.meals.listMeals({ userId: LOCAL_PREVIEW_USER_ID }),
    ).resolves.toEqual([meal]);
    await expect(
      reopened.hydrationGoals.findHydrationGoalByUserId(LOCAL_PREVIEW_USER_ID),
    ).resolves.toEqual(hydrationGoal);
    await expect(
      reopened.hydrationEntries.listHydrationEntries({
        userId: LOCAL_PREVIEW_USER_ID,
      }),
    ).resolves.toEqual([hydrationEntry]);
    await expect(reopened.exercises.listExercises()).resolves.toHaveLength(
      seededExerciseCount,
    );

    reopenedDatabase.close();
  });

  it('rolls back entity writes when a transaction fails', async () => {
    const database = new SQL.Database();
    const connection = new SqlJsConnection(database);
    await initializeLocalStorage(connection);
    const repositories = createSQLiteRepositories(connection);
    const session = createSession(null);

    await expect(
      repositories.transaction.runInTransaction(async () => {
        await repositories.workoutSessions.saveWorkoutSession(session);
        throw new Error('simulated interruption');
      }),
    ).rejects.toThrow('simulated interruption');

    await expect(
      repositories.workoutSessions.findActiveWorkoutSession(
        LOCAL_PREVIEW_USER_ID,
      ),
    ).resolves.toBeNull();
    database.close();
  });

  it('skips the unchanged system exercise seed on later startups', async () => {
    const database = new SQL.Database();
    const connection = new SqlJsConnection(database);
    await initializeLocalStorage(connection);
    const run = jest.spyOn(connection, 'runAsync');

    await initializeLocalStorage(connection);

    expect(
      run.mock.calls.filter(([sql]) => sql.includes('INSERT INTO exercises')),
    ).toHaveLength(0);
    database.close();
  });

  it('uses indexed SQL pagination for completed workout history', async () => {
    const database = new SQL.Database();
    const connection = new SqlJsConnection(database);
    await initializeLocalStorage(connection);
    const repositories = createSQLiteRepositories(connection);

    await repositories.transaction.runInTransaction(async () => {
      for (let index = 0; index < 45; index += 1) {
        await repositories.workoutSessions.saveWorkoutSession({
          ...createSession(null),
          completedAt: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
          durationSeconds: 1800,
          id: `history-${index}`,
          startedAt: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
          status: 'completed',
        });
      }
      await repositories.workoutSessions.saveWorkoutSession({
        ...createSession(null),
        id: 'active-session',
      });
    });

    const page = await repositories.workoutSessions.listWorkoutSessions({
      limit: 20,
      offset: 20,
      statuses: ['completed'],
      userId: LOCAL_PREVIEW_USER_ID,
    });
    const queryPlan = await connection.getAllAsync<{ detail: string }>(
      `EXPLAIN QUERY PLAN
       SELECT * FROM workout_sessions
       WHERE user_id = ? AND deleted_at IS NULL AND status IN (?)
       ORDER BY started_at DESC LIMIT ? OFFSET ?`,
      [LOCAL_PREVIEW_USER_ID, 'completed', 20, 20],
    );

    expect(page).toHaveLength(20);
    expect(page[0].id).toBe('history-24');
    expect(queryPlan.map((row) => row.detail).join(' ')).toContain(
      'idx_workout_sessions_user_status_started',
    );
    database.close();
  });
});

function createWorkout(exerciseId: string): WorkoutTemplate {
  return {
    createdAt: now,
    deletedAt: null,
    description: 'Treino persistente',
    exercises: [
      {
        createdAt: now,
        defaultRestSeconds: 90,
        deletedAt: null,
        exerciseId,
        id: 'workout-exercise-1',
        notes: 'Controle a descida',
        position: 0,
        targetRepsMax: 10,
        targetRepsMin: 8,
        targetSets: 3,
        targetWeightKg: 60,
        updatedAt: now,
        workoutId: 'workout-1',
      },
    ],
    id: 'workout-1',
    isArchived: false,
    name: 'Upper A',
    sortOrder: 1,
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
  };
}

function createSession(workoutId: string | null): WorkoutSession {
  return {
    completedAt: null,
    createdAt: now,
    deletedAt: null,
    durationSeconds: null,
    id: 'session-1',
    notes: null,
    startedAt: now,
    status: 'active',
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
    workoutId,
  };
}

function createSessionExercise(
  sessionId: string,
  exerciseId: string,
): SessionExercise {
  return {
    createdAt: now,
    deletedAt: null,
    exerciseId,
    id: 'session-exercise-1',
    position: 0,
    sessionId,
    updatedAt: now,
  };
}

function createSet(sessionExerciseId: string): TrainingSet {
  return {
    completedAt: now,
    createdAt: now,
    deletedAt: null,
    id: 'set-1',
    notes: 'Boa tecnica',
    repetitions: 8,
    restSeconds: 90,
    sessionExerciseId,
    setNumber: 1,
    setType: 'working',
    updatedAt: now,
    weightKg: 60,
  };
}

function createSyncOperation(set: TrainingSet): SyncOperation {
  return {
    attemptCount: 0,
    createdAt: now,
    entityId: set.id,
    entityType: 'set',
    lastAttemptAt: null,
    lastError: null,
    operationId: 'operation-1',
    operationType: 'upsert',
    payload: set,
    status: 'pending',
  };
}

function createPersonalRecord(
  sourceSetId: string,
  exerciseId: string,
): PersonalRecord {
  return {
    achievedAt: now,
    contextWeightKg: null,
    createdAt: now,
    exerciseId,
    id: 'personal-record-1',
    recordType: 'weight',
    sourceSetId,
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
    value: 60,
  };
}

function createGoal(exerciseId: string): Goal {
  return {
    baselineValue: 60,
    completedAt: null,
    createdAt: now,
    deadline: '2026-12-31T23:59:59.000Z',
    deletedAt: null,
    exerciseId,
    id: 'goal-1',
    metric: 'weight_kg',
    status: 'active',
    targetValue: 80,
    title: 'Supino com 80 kg',
    type: 'exercise_weight',
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
  };
}

function createGoalProgress(
  goalId: string,
  sourceId: string,
): GoalProgressEvent {
  return {
    goalId,
    id: 'goal-progress-1',
    measuredValue: 60,
    progressPercent: 0,
    recordedAt: now,
    sourceId,
    sourceType: 'workout_completion',
  };
}

function createMeal(): Meal {
  return {
    carbsG: 70,
    consumedAt: now,
    createdAt: now,
    deletedAt: null,
    fatG: 15,
    id: 'meal-1',
    kcal: 650,
    mealType: 'lunch',
    notes: 'Pos-treino',
    photoId: null,
    proteinG: 45,
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
  };
}

function createHydrationGoal(): HydrationGoal {
  return {
    createdAt: now,
    deletedAt: null,
    id: 'hydration-goal-1',
    targetMl: 2500,
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
  };
}

function createHydrationEntry(): HydrationEntry {
  return {
    amountMl: 500,
    createdAt: now,
    deletedAt: null,
    id: 'hydration-entry-1',
    recordedAt: now,
    updatedAt: now,
    userId: LOCAL_PREVIEW_USER_ID,
  };
}
