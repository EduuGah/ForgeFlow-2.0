import initSqlJs from 'sql.js';

import type { SecureSessionStorage } from '../ports/auth';
import type {
  SyncChangeApplier,
  SyncProtocolRequest,
  SyncRemoteGateway,
} from '../ports/sync';
import { InMemoryAuthRemoteGateway } from '../../data/auth/inMemoryAuthGateway';
import { initializeLocalStorage } from '../../data/database/initializeLocalDatabase';
import { createSQLiteRepositories } from '../../data/repositories/sqliteRepositories';
import { SqlJsConnection } from '../../data/testing/sqlJsConnection';
import type { AuthSession } from '../../domain/auth/entities';
import type { NotificationPreferencesSnapshot } from '../../domain/notifications/entities';
import { registerAccount, restoreSession } from './authenticate';
import { createGoal } from './goalEngine';
import {
  listHydrationHistory,
  recordHydration,
  setHydrationGoal,
} from './hydrationTracking';
import { processNotificationEvent } from './notificationEngine';
import { createMeal, listNutritionJournal } from './nutritionJournal';
import { SyncRemoteError, synchronizeDevice } from './synchronizeDevice';
import { createWorkoutTemplate } from './workoutCrud';
import {
  completeActiveWorkout,
  listCompletedWorkouts,
  logWorkoutSet,
  startWorkoutSession,
} from './workoutExecution';

const startedAt = '2026-09-28T12:00:00.000Z';
const completedAt = '2026-09-28T13:00:00.000Z';

describe('offline end-to-end flow', () => {
  it('survives restart and synchronizes once after reconnecting', async () => {
    const SQL = await initSqlJs();
    const firstDatabase = new SQL.Database();
    const firstConnection = new SqlJsConnection(firstDatabase);
    await initializeLocalStorage(firstConnection);

    const authRemote = new InMemoryAuthRemoteGateway();
    const sessionBacking: { value: AuthSession | null } = { value: null };
    const firstSessionStorage = new RestartableSessionStorage(sessionBacking);
    const session = await registerAccount(
      {
        displayName: 'Atleta Offline',
        email: ' ATLETA@EXAMPLE.COM ',
        password: 'senha-segura',
      },
      { remote: authRemote, storage: firstSessionStorage },
    );
    const userId = session.user.id;
    await insertRegisteredUser(firstConnection, session);

    const repositories = createSQLiteRepositories(firstConnection);
    const exercise = (await repositories.exercises.listExercises())[0];
    let currentTime = startedAt;
    let sequence = 0;
    const clock = () => currentTime;
    const generateId = () => `offline-e2e-${++sequence}`;
    const workout = await createWorkoutTemplate(
      {
        description: 'Criado sem conexao',
        exercises: [
          {
            defaultRestSeconds: 90,
            exerciseId: exercise.id,
            targetRepsMax: 10,
            targetRepsMin: 8,
            targetSets: 2,
          },
        ],
        name: 'Treino offline',
        userId,
      },
      { clock, generateId, repositories },
    );
    const active = await startWorkoutSession(
      { userId, workoutId: workout.id },
      { clock, generateId, repositories },
    );

    await logWorkoutSet(
      {
        repetitions: 10,
        sessionExerciseId: active.exercises[0].id,
        setType: 'warmup',
        userId,
        weightKg: 20,
      },
      { clock, generateId, repositories },
    );
    await logWorkoutSet(
      {
        notes: 'Serie principal',
        repetitions: 8,
        restSeconds: 90,
        sessionExerciseId: active.exercises[0].id,
        setType: 'working',
        userId,
        weightKg: 60,
      },
      { clock, generateId, repositories },
    );

    currentTime = completedAt;
    const completed = await completeActiveWorkout(
      { sessionId: active.id, userId },
      { clock, generateId, repositories },
    );
    const goal = await createGoal(
      {
        deadline: '2026-12-31T23:59:59.000Z',
        exerciseId: exercise.id,
        targetValue: 80,
        title: 'Chegar aos 80 kg',
        type: 'exercise_weight',
        userId,
      },
      { clock, generateId, repositories },
    );
    const meal = await createMeal(
      {
        consumedAt: completedAt,
        kcal: 650,
        mealType: 'lunch',
        notes: 'Pos-treino',
        proteinG: 45,
        userId,
      },
      { clock, generateId, repositories },
    );
    await setHydrationGoal(
      { targetMl: 2500, userId },
      { clock, generateId, repositories },
    );
    const hydration = await recordHydration(
      { amountMl: 500, recordedAt: completedAt, userId },
      { clock, generateId, repositories },
    );
    const notification = await processNotificationEvent(
      {
        event: {
          body: 'Seu treino foi salvo no dispositivo.',
          data: { sessionId: completed.id },
          dedupeKey: `workout:${completed.id}`,
          expiresAt: null,
          occurredAt: completedAt,
          title: 'Treino concluido',
          type: 'workout_completed',
          userId,
        },
        preferences,
      },
      { clock, generateId, repositories },
    );

    const pendingBeforeFailure =
      await repositories.syncOperations.listPendingSyncOperations();
    const remote = new ReconnectingSyncGateway();
    const changes = new RecordingChangeApplier();
    await expect(
      synchronizeDevice(
        { deviceId: 'offline-device', now: clock },
        {
          changes,
          operations: repositories.syncOperations,
          remote,
          state: repositories.syncState,
          transaction: repositories.transaction,
        },
      ),
    ).rejects.toThrow('Network unavailable');

    expect(pendingBeforeFailure.length).toBeGreaterThan(10);
    expect(
      new Set(pendingBeforeFailure.map((item) => item.operationId)).size,
    ).toBe(pendingBeforeFailure.length);

    const persistedBytes = firstDatabase.export();
    firstDatabase.close();

    const reopenedDatabase = new SQL.Database(persistedBytes);
    const reopenedConnection = new SqlJsConnection(reopenedDatabase);
    await initializeLocalStorage(reopenedConnection);
    const reopened = createSQLiteRepositories(reopenedConnection);
    const restartedSessionStorage = new RestartableSessionStorage(
      sessionBacking,
    );

    await expect(
      restoreSession({ remote: authRemote, storage: restartedSessionStorage }),
    ).resolves.toEqual(session);
    await expect(
      listCompletedWorkouts({ userId }, reopened),
    ).resolves.toMatchObject([
      {
        durationSeconds: 3600,
        id: completed.id,
        setCount: 2,
        status: 'completed',
        workingVolume: 480,
      },
    ]);
    await expect(
      reopened.personalRecords.listPersonalRecords({ userId }),
    ).resolves.not.toHaveLength(0);
    await expect(reopened.goals.findGoalById(goal.id)).resolves.toEqual(goal);
    await expect(reopened.meals.findMealById(meal.id)).resolves.toEqual(meal);
    await expect(
      reopened.hydrationEntries.findHydrationEntryById(hydration.id),
    ).resolves.toEqual(hydration);
    await expect(
      reopened.notifications.listNotifications({ userId }),
    ).resolves.toEqual([notification.notification]);

    await expect(
      listNutritionJournal({ userId }, reopened),
    ).resolves.toMatchObject({ totals: { kcal: 650, mealCount: 1 } });
    await expect(
      listHydrationHistory({ userId }, reopened),
    ).resolves.toMatchObject({
      entries: [{ amountMl: 500 }],
      summary: { remainingMl: 2000, totalMl: 500 },
    });

    currentTime = '2026-09-28T13:05:00.000Z';
    const synchronized = await synchronizeDevice(
      { deviceId: 'offline-device', now: clock },
      {
        changes,
        operations: reopened.syncOperations,
        remote,
        state: reopened.syncState,
        transaction: reopened.transaction,
      },
    );
    const repeated = await synchronizeDevice(
      { deviceId: 'offline-device', now: clock },
      {
        changes,
        operations: reopened.syncOperations,
        remote,
        state: reopened.syncState,
        transaction: reopened.transaction,
      },
    );

    expect(synchronized.sentOperationCount).toBe(pendingBeforeFailure.length);
    expect(synchronized.acceptedOperationIds).toHaveLength(
      pendingBeforeFailure.length,
    );
    expect(repeated.sentOperationCount).toBe(0);
    expect(remote.duplicateOperationCount).toBe(0);
    await expect(
      reopened.syncOperations.countPendingSyncOperations(),
    ).resolves.toBe(0);
    await expect(
      reopened.syncState.getSyncState('default', 'main'),
    ).resolves.toMatchObject({
      lastError: null,
      serverCursor: 'cursor-2',
    });

    reopenedDatabase.close();
  });
});

const preferences: NotificationPreferencesSnapshot = {
  enabledCategories: ['workouts'],
  frequencyMode: 'intelligent',
  quietHoursEnd: null,
  quietHoursStart: null,
  timezoneOffsetMinutes: -180,
};

class RestartableSessionStorage implements SecureSessionStorage {
  constructor(private readonly backing: { value: AuthSession | null }) {}

  async clearSession() {
    this.backing.value = null;
  }

  async readSession() {
    return this.backing.value;
  }

  async writeSession(session: AuthSession) {
    this.backing.value = session;
  }
}

class ReconnectingSyncGateway implements SyncRemoteGateway {
  duplicateOperationCount = 0;
  private failedOnce = false;
  private readonly receivedOperationIds = new Set<string>();
  private successfulRequestCount = 0;

  async synchronize(request: SyncProtocolRequest) {
    if (!this.failedOnce) {
      this.failedOnce = true;
      throw new SyncRemoteError('Network unavailable', { retryable: true });
    }

    this.successfulRequestCount += 1;
    for (const operation of request.operations) {
      if (this.receivedOperationIds.has(operation.operationId)) {
        this.duplicateOperationCount += 1;
      }
      this.receivedOperationIds.add(operation.operationId);
    }

    return {
      accepted: request.operations.map((operation) => ({
        operationId: operation.operationId,
      })),
      changes: [],
      conflicts: [],
      nextCursor: `cursor-${this.successfulRequestCount}`,
    };
  }
}

class RecordingChangeApplier implements SyncChangeApplier {
  async applyRemoteChanges() {
    return undefined;
  }
}

async function insertRegisteredUser(
  connection: SqlJsConnection,
  session: AuthSession,
) {
  await connection.runAsync(
    `INSERT INTO users (
      id, email, display_name, avatar_url, timezone, created_at, updated_at
    ) VALUES (?, ?, ?, NULL, ?, ?, ?)`,
    [
      session.user.id,
      session.user.email,
      session.user.displayName,
      'America/Sao_Paulo',
      startedAt,
      startedAt,
    ],
  );
}
