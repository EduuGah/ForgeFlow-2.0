import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  Exercise,
  SessionExercise,
  WorkoutSession,
} from '../../domain/training/entities';
import type { RepositoryProvider } from '../ports/repositories';

export type ActiveWorkoutExercise = {
  exerciseId: EntityId;
  exerciseName: string;
  id: EntityId;
  position: number;
};

export type ActiveWorkout = {
  exerciseCount: number;
  exercises: ActiveWorkoutExercise[];
  id: EntityId;
  startedAt: ISODateTimeString;
  status: WorkoutSession['status'];
  workoutId: EntityId | null;
  workoutName: string | null;
};

type WorkoutExecutionRepositories = Pick<
  RepositoryProvider,
  | 'exercises'
  | 'sessionExercises'
  | 'syncOperations'
  | 'workoutSessions'
  | 'workouts'
>;

type WorkoutExecutionDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: WorkoutExecutionRepositories;
};

export class ActiveWorkoutAlreadyExistsError extends Error {
  constructor() {
    super('An active workout already exists.');
    this.name = 'ActiveWorkoutAlreadyExistsError';
  }
}

export class WorkoutExecutionInputError extends Error {
  readonly field: 'workoutId';

  constructor(field: WorkoutExecutionInputError['field'], message: string) {
    super(message);
    this.name = 'WorkoutExecutionInputError';
    this.field = field;
  }
}

export async function getActiveWorkout(
  input: { userId: EntityId },
  repositories: WorkoutExecutionRepositories,
): Promise<ActiveWorkout | null> {
  const session = await repositories.workoutSessions.findActiveWorkoutSession(
    input.userId,
  );

  if (!session) {
    return null;
  }

  return summarizeActiveWorkout(session, repositories);
}

export async function startWorkoutSession(
  input: { userId: EntityId; workoutId: EntityId },
  dependencies: WorkoutExecutionDependencies,
) {
  const activeSession =
    await dependencies.repositories.workoutSessions.findActiveWorkoutSession(
      input.userId,
    );

  if (activeSession) {
    throw new ActiveWorkoutAlreadyExistsError();
  }

  const workout = await requireStartableWorkout(
    input.workoutId,
    input.userId,
    dependencies.repositories,
  );
  const now = dependencies.clock();
  const session: WorkoutSession = {
    completedAt: null,
    createdAt: now,
    deletedAt: null,
    durationSeconds: null,
    id: dependencies.generateId(),
    notes: null,
    startedAt: now,
    status: 'active',
    updatedAt: now,
    userId: input.userId,
    workoutId: workout.id,
  };
  const sessionExercises = workout.exercises
    .filter((exercise) => exercise.deletedAt === null)
    .sort((left, right) => left.position - right.position)
    .map((exercise): SessionExercise => ({
      createdAt: now,
      deletedAt: null,
      exerciseId: exercise.exerciseId,
      id: dependencies.generateId(),
      position: exercise.position,
      sessionId: session.id,
      updatedAt: now,
    }));

  await dependencies.repositories.workoutSessions.saveWorkoutSession(session);
  await Promise.all(
    sessionExercises.map((sessionExercise) =>
      dependencies.repositories.sessionExercises.saveSessionExercise(
        sessionExercise,
      ),
    ),
  );
  await enqueueSessionStart(session, sessionExercises, dependencies);

  return summarizeActiveWorkout(session, dependencies.repositories);
}

export async function abandonActiveWorkout(
  input: { userId: EntityId },
  dependencies: WorkoutExecutionDependencies,
) {
  const activeSession =
    await dependencies.repositories.workoutSessions.findActiveWorkoutSession(
      input.userId,
    );

  if (!activeSession) {
    return null;
  }

  const now = dependencies.clock();
  const nextSession: WorkoutSession = {
    ...activeSession,
    status: 'abandoned',
    updatedAt: now,
  };

  await dependencies.repositories.workoutSessions.saveWorkoutSession(
    nextSession,
  );
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: nextSession.id,
      entityType: 'workout_session',
      generateId: dependencies.generateId,
      operationType: 'upsert',
      payload: nextSession,
    }),
  );

  return nextSession;
}

async function enqueueSessionStart(
  session: WorkoutSession,
  sessionExercises: SessionExercise[],
  dependencies: WorkoutExecutionDependencies,
) {
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: session.id,
      entityType: 'workout_session',
      generateId: dependencies.generateId,
      operationType: 'upsert',
      payload: session,
    }),
  );
  await Promise.all(
    sessionExercises.map((sessionExercise) =>
      dependencies.repositories.syncOperations.enqueueSyncOperation(
        createSyncOperation({
          clock: dependencies.clock,
          entityId: sessionExercise.id,
          entityType: 'session_exercise',
          generateId: dependencies.generateId,
          operationType: 'upsert',
          payload: sessionExercise,
        }),
      ),
    ),
  );
}

function createSyncOperation(
  input: Pick<SyncOperation, 'entityId' | 'entityType' | 'operationType'> & {
    clock: () => ISODateTimeString;
    generateId: () => EntityId;
    payload: Record<string, unknown>;
  },
): SyncOperation {
  return {
    attemptCount: 0,
    createdAt: input.clock(),
    entityId: input.entityId,
    entityType: input.entityType,
    lastAttemptAt: null,
    lastError: null,
    operationId: input.generateId(),
    operationType: input.operationType,
    payload: input.payload,
    status: 'pending',
  };
}

async function loadExercisesById(
  exerciseIds: Set<EntityId>,
  repositories: WorkoutExecutionRepositories,
) {
  const pairs = await Promise.all(
    Array.from(exerciseIds).map(async (exerciseId) => {
      const exercise =
        await repositories.exercises.findExerciseById(exerciseId);

      return exercise ? ([exerciseId, exercise] as const) : null;
    }),
  );

  return new Map(pairs.filter((pair) => pair !== null));
}

async function requireStartableWorkout(
  workoutId: EntityId,
  userId: EntityId,
  repositories: WorkoutExecutionRepositories,
) {
  const workout =
    await repositories.workouts.findWorkoutTemplateById(workoutId);

  if (
    !workout ||
    workout.deletedAt !== null ||
    workout.userId !== userId ||
    workout.isArchived
  ) {
    throw new WorkoutExecutionInputError(
      'workoutId',
      'Workout is not available to start.',
    );
  }

  if (
    workout.exercises.filter((exercise) => exercise.deletedAt === null)
      .length === 0
  ) {
    throw new WorkoutExecutionInputError(
      'workoutId',
      'Workout must have at least one exercise.',
    );
  }

  return workout;
}

async function summarizeActiveWorkout(
  session: WorkoutSession,
  repositories: WorkoutExecutionRepositories,
): Promise<ActiveWorkout> {
  const [workout, sessionExercises] = await Promise.all([
    session.workoutId
      ? repositories.workouts.findWorkoutTemplateById(session.workoutId)
      : Promise.resolve(null),
    repositories.sessionExercises.listSessionExercises({
      sessionId: session.id,
    }),
  ]);
  const exercisesById = await loadExercisesById(
    new Set(sessionExercises.map((exercise) => exercise.exerciseId)),
    repositories,
  );
  const exercises = sessionExercises
    .filter((exercise) => exercise.deletedAt === null)
    .sort((left, right) => left.position - right.position)
    .map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName:
        (exercisesById.get(exercise.exerciseId) as Exercise | undefined)
          ?.name ?? 'Exercicio removido',
      id: exercise.id,
      position: exercise.position,
    }));

  return {
    exerciseCount: exercises.length,
    exercises,
    id: session.id,
    startedAt: session.startedAt,
    status: session.status,
    workoutId: session.workoutId,
    workoutName: workout?.name ?? null,
  };
}
