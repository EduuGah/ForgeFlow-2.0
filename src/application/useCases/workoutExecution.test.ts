import type {
  Exercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../../domain/training/entities';
import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import {
  abandonActiveWorkout,
  ActiveWorkoutAlreadyExistsError,
  getActiveWorkout,
  logWorkoutSet,
  startWorkoutSession,
  WorkoutExecutionInputError,
} from './workoutExecution';

const now = '2026-09-15T15:00:00.000Z';
const later = '2026-09-15T15:45:00.000Z';
const userId = 'user-1';

const benchPress: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: null,
  equipment: 'Barra',
  id: 'exercise-bench-press',
  isSystem: true,
  name: 'Supino reto',
  ownerUserId: null,
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Triceps'],
  updatedAt: now,
};

const squat: Exercise = {
  ...benchPress,
  id: 'exercise-squat',
  name: 'Agachamento livre',
  primaryMuscleGroup: 'Pernas',
};

describe('workout execution use cases', () => {
  it('starts a workout session with exercise snapshots and sync operations', async () => {
    const workout = createWorkoutTemplateFixture();
    const repositories = createInMemoryRepositories({
      exercises: [benchPress, squat],
      workoutTemplates: [workout],
    });
    const ids = [
      'session-1',
      'session-exercise-1',
      'session-exercise-2',
      'operation-session',
      'operation-exercise-1',
      'operation-exercise-2',
    ];

    await expect(
      startWorkoutSession(
        {
          userId,
          workoutId: workout.id,
        },
        {
          clock: () => now,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toStrictEqual({
      exerciseCount: 2,
      exercises: [
        {
          defaultRestSeconds: 90,
          exerciseId: benchPress.id,
          exerciseName: benchPress.name,
          id: 'session-exercise-1',
          position: 0,
          setCount: 0,
          sets: [],
          workingVolume: 0,
        },
        {
          defaultRestSeconds: null,
          exerciseId: squat.id,
          exerciseName: squat.name,
          id: 'session-exercise-2',
          position: 1,
          setCount: 0,
          sets: [],
          workingVolume: 0,
        },
      ],
      id: 'session-1',
      startedAt: now,
      status: 'active',
      workoutId: workout.id,
      workoutName: workout.name,
    });
    await expect(
      repositories.workoutSessions.findActiveWorkoutSession(userId),
    ).resolves.toMatchObject({
      id: 'session-1',
      status: 'active',
      workoutId: workout.id,
    });
    await expect(
      repositories.sessionExercises.listSessionExercises({
        sessionId: 'session-1',
      }),
    ).resolves.toMatchObject([
      {
        exerciseId: benchPress.id,
        id: 'session-exercise-1',
        position: 0,
      },
      {
        exerciseId: squat.id,
        id: 'session-exercise-2',
        position: 1,
      },
    ]);
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        entityId: 'session-1',
        entityType: 'workout_session',
        operationType: 'upsert',
      },
      {
        entityId: 'session-exercise-1',
        entityType: 'session_exercise',
        operationType: 'upsert',
      },
      {
        entityId: 'session-exercise-2',
        entityType: 'session_exercise',
        operationType: 'upsert',
      },
    ]);
  });

  it('logs a completed set in the active workout and enqueues sync', async () => {
    const workout = createWorkoutTemplateFixture();
    const session = createActiveSessionFixture(workout.id);
    const repositories = createInMemoryRepositories({
      exercises: [benchPress],
      sessionExercises: [
        {
          createdAt: now,
          deletedAt: null,
          exerciseId: benchPress.id,
          id: 'session-exercise-1',
          position: 0,
          sessionId: session.id,
          updatedAt: now,
        },
      ],
      workoutSessions: [session],
      workoutTemplates: [workout],
    });
    const ids = ['set-1', 'operation-set'];

    await expect(
      logWorkoutSet(
        {
          notes: 'Top set controlado',
          repetitions: 8,
          restSeconds: 120,
          sessionExerciseId: 'session-exercise-1',
          setType: 'working',
          userId,
          weightKg: 80,
        },
        {
          clock: () => later,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      exercises: [
        {
          defaultRestSeconds: 90,
          id: 'session-exercise-1',
          setCount: 1,
          sets: [
            {
              completedAt: later,
              id: 'set-1',
              notes: 'Top set controlado',
              repetitions: 8,
              restSeconds: 120,
              setNumber: 1,
              setType: 'working',
              volume: 640,
              weightKg: 80,
            },
          ],
          workingVolume: 640,
        },
      ],
    });
    await expect(
      repositories.sets.listTrainingSets({
        sessionExerciseId: 'session-exercise-1',
      }),
    ).resolves.toMatchObject([
      {
        completedAt: later,
        id: 'set-1',
        setNumber: 1,
        setType: 'working',
      },
    ]);
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        entityId: 'set-1',
        entityType: 'set',
        operationType: 'upsert',
      },
    ]);
  });

  it('numbers new sets after existing local sets', async () => {
    const workout = createWorkoutTemplateFixture();
    const session = createActiveSessionFixture(workout.id);
    const repositories = createInMemoryRepositories({
      exercises: [benchPress],
      sessionExercises: [
        {
          createdAt: now,
          deletedAt: null,
          exerciseId: benchPress.id,
          id: 'session-exercise-1',
          position: 0,
          sessionId: session.id,
          updatedAt: now,
        },
      ],
      trainingSets: [
        {
          completedAt: now,
          createdAt: now,
          deletedAt: null,
          id: 'set-1',
          notes: null,
          repetitions: 12,
          restSeconds: null,
          sessionExerciseId: 'session-exercise-1',
          setNumber: 1,
          setType: 'warmup',
          updatedAt: now,
          weightKg: 40,
        },
      ],
      workoutSessions: [session],
      workoutTemplates: [workout],
    });

    await logWorkoutSet(
      {
        repetitions: 10,
        restSeconds: null,
        sessionExerciseId: 'session-exercise-1',
        setType: 'working',
        userId,
        weightKg: 70,
      },
      {
        clock: () => later,
        generateId: () => 'set-2',
        repositories,
      },
    );

    await expect(
      repositories.sets.listTrainingSets({
        sessionExerciseId: 'session-exercise-1',
      }),
    ).resolves.toMatchObject([
      {
        id: 'set-1',
        setNumber: 1,
      },
      {
        id: 'set-2',
        setNumber: 2,
      },
    ]);
  });

  it('rejects invalid set values and exercises outside the active session', async () => {
    const workout = createWorkoutTemplateFixture();
    const session = createActiveSessionFixture(workout.id);
    const repositories = createInMemoryRepositories({
      sessionExercises: [
        {
          createdAt: now,
          deletedAt: null,
          exerciseId: benchPress.id,
          id: 'session-exercise-1',
          position: 0,
          sessionId: session.id,
          updatedAt: now,
        },
      ],
      workoutSessions: [session],
      workoutTemplates: [workout],
    });
    const dependencies = {
      clock: () => later,
      generateId: () => 'set-id',
      repositories,
    };

    await expect(
      logWorkoutSet(
        {
          repetitions: 0,
          sessionExerciseId: 'session-exercise-1',
          setType: 'working',
          userId,
          weightKg: 80,
        },
        dependencies,
      ),
    ).rejects.toThrow(WorkoutExecutionInputError);
    await expect(
      logWorkoutSet(
        {
          repetitions: 8,
          sessionExerciseId: 'other-session-exercise',
          setType: 'working',
          userId,
          weightKg: 80,
        },
        dependencies,
      ),
    ).rejects.toThrow(WorkoutExecutionInputError);
  });

  it('recovers the active workout from local session state', async () => {
    const workout = createWorkoutTemplateFixture();
    const session = createActiveSessionFixture(workout.id);
    const repositories = createInMemoryRepositories({
      exercises: [benchPress],
      sessionExercises: [
        {
          createdAt: now,
          deletedAt: null,
          exerciseId: benchPress.id,
          id: 'session-exercise-1',
          position: 0,
          sessionId: session.id,
          updatedAt: now,
        },
      ],
      workoutSessions: [session],
      workoutTemplates: [workout],
    });

    await expect(
      getActiveWorkout({ userId }, repositories),
    ).resolves.toMatchObject({
      exerciseCount: 1,
      exercises: [
        {
          exerciseName: benchPress.name,
          position: 0,
        },
      ],
      id: session.id,
      status: 'active',
      workoutName: workout.name,
    });
  });

  it('rejects a new session when an active workout already exists', async () => {
    const workout = createWorkoutTemplateFixture();
    const repositories = createInMemoryRepositories({
      workoutSessions: [createActiveSessionFixture(workout.id)],
      workoutTemplates: [workout],
    });

    await expect(
      startWorkoutSession(
        {
          userId,
          workoutId: workout.id,
        },
        {
          clock: () => now,
          generateId: () => 'id',
          repositories,
        },
      ),
    ).rejects.toThrow(ActiveWorkoutAlreadyExistsError);
  });

  it('rejects archived, empty or non-owned workouts', async () => {
    const archivedWorkout = {
      ...createWorkoutTemplateFixture(),
      id: 'archived-workout',
      isArchived: true,
    };
    const emptyWorkout = {
      ...createWorkoutTemplateFixture(),
      exercises: [],
      id: 'empty-workout',
    };
    const otherUserWorkout = {
      ...createWorkoutTemplateFixture(),
      id: 'other-user-workout',
      userId: 'user-2',
    };
    const repositories = createInMemoryRepositories({
      workoutTemplates: [archivedWorkout, emptyWorkout, otherUserWorkout],
    });

    for (const workoutId of [
      archivedWorkout.id,
      emptyWorkout.id,
      otherUserWorkout.id,
    ]) {
      await expect(
        startWorkoutSession(
          {
            userId,
            workoutId,
          },
          {
            clock: () => now,
            generateId: () => 'id',
            repositories,
          },
        ),
      ).rejects.toThrow(WorkoutExecutionInputError);
    }
  });

  it('abandons the active workout without deleting the local session', async () => {
    const workout = createWorkoutTemplateFixture();
    const repositories = createInMemoryRepositories({
      workoutSessions: [createActiveSessionFixture(workout.id)],
      workoutTemplates: [workout],
    });
    const ids = ['operation-abandon'];

    await expect(
      abandonActiveWorkout(
        { userId },
        {
          clock: () => later,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      id: 'session-1',
      status: 'abandoned',
      updatedAt: later,
    });
    await expect(
      repositories.workoutSessions.findActiveWorkoutSession(userId),
    ).resolves.toBeNull();
    await expect(
      repositories.workoutSessions.listWorkoutSessions({
        includeDeleted: true,
        userId,
      }),
    ).resolves.toMatchObject([
      {
        id: 'session-1',
        status: 'abandoned',
      },
    ]);
  });
});

function createActiveSessionFixture(workoutId: string): WorkoutSession {
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
    userId,
    workoutId,
  };
}

function createWorkoutTemplateFixture(): WorkoutTemplate {
  return {
    createdAt: now,
    deletedAt: null,
    description: 'Treino de forca superior',
    exercises: [
      {
        createdAt: now,
        defaultRestSeconds: 90,
        deletedAt: null,
        exerciseId: benchPress.id,
        id: 'workout-exercise-1',
        notes: null,
        position: 0,
        targetRepsMax: 8,
        targetRepsMin: 6,
        targetSets: 4,
        targetWeightKg: 80,
        updatedAt: now,
        workoutId: 'workout-1',
      },
      {
        createdAt: now,
        defaultRestSeconds: null,
        deletedAt: null,
        exerciseId: squat.id,
        id: 'workout-exercise-2',
        notes: null,
        position: 1,
        targetRepsMax: null,
        targetRepsMin: null,
        targetSets: 3,
        targetWeightKg: null,
        updatedAt: now,
        workoutId: 'workout-1',
      },
    ],
    id: 'workout-1',
    isArchived: false,
    name: 'Upper A',
    sortOrder: 1,
    updatedAt: now,
    userId,
  };
}
