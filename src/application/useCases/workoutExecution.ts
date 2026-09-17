import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  Exercise,
  PersonalRecordType,
  SessionExercise,
  SetType,
  TrainingSet,
  WorkoutSession,
} from '../../domain/training/entities';
import {
  calculateCompletedWorkoutVolume,
  calculateSetVolume,
} from '../../domain/training/metrics';
import type { RepositoryProvider } from '../ports/repositories';
import { createPersonalRecordsForSession } from './personalRecordEngine';

export type ActiveWorkoutSet = {
  completedAt: ISODateTimeString | null;
  id: EntityId;
  notes: string | null;
  personalRecordTypes: PersonalRecordType[];
  repetitions: number;
  restSeconds: number | null;
  setNumber: number;
  setType: SetType;
  volume: number;
  weightKg: number;
};

export type ActiveWorkoutExercise = {
  defaultRestSeconds: number | null;
  exerciseId: EntityId;
  exerciseName: string;
  id: EntityId;
  position: number;
  setCount: number;
  sets: ActiveWorkoutSet[];
  workingVolume: number;
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

export type CompletedWorkout = ActiveWorkout & {
  completedAt: ISODateTimeString;
  durationSeconds: number;
  setCount: number;
  workingVolume: number;
};

type WorkoutExecutionRepositories = Pick<
  RepositoryProvider,
  | 'exercises'
  | 'personalRecords'
  | 'sessionExercises'
  | 'sets'
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
  readonly field:
    | 'repetitions'
    | 'restSeconds'
    | 'sessionExerciseId'
    | 'setType'
    | 'weightKg'
    | 'workoutId';

  constructor(field: WorkoutExecutionInputError['field'], message: string) {
    super(message);
    this.name = 'WorkoutExecutionInputError';
    this.field = field;
  }
}

export type LogWorkoutSetInput = {
  notes?: string | null;
  repetitions: number;
  restSeconds?: number | null;
  sessionExerciseId: EntityId;
  setType: SetType;
  userId: EntityId;
  weightKg: number;
};

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

export async function logWorkoutSet(
  input: LogWorkoutSetInput,
  dependencies: WorkoutExecutionDependencies,
): Promise<ActiveWorkout> {
  validateSetInput(input);

  const activeSession =
    await dependencies.repositories.workoutSessions.findActiveWorkoutSession(
      input.userId,
    );

  if (!activeSession) {
    throw new WorkoutExecutionInputError(
      'sessionExerciseId',
      'Active workout is required to log a set.',
    );
  }

  const sessionExercise = await requireActiveSessionExercise(
    activeSession,
    input.sessionExerciseId,
    dependencies.repositories,
  );
  const existingSets = await dependencies.repositories.sets.listTrainingSets({
    sessionExerciseId: sessionExercise.id,
  });
  const now = dependencies.clock();
  const set: TrainingSet = {
    completedAt: now,
    createdAt: now,
    deletedAt: null,
    id: dependencies.generateId(),
    notes: normalizeNotes(input.notes),
    repetitions: input.repetitions,
    restSeconds: normalizeOptionalInteger(input.restSeconds),
    sessionExerciseId: sessionExercise.id,
    setNumber: getNextSetNumber(existingSets),
    setType: input.setType,
    updatedAt: now,
    weightKg: input.weightKg,
  };

  await dependencies.repositories.sets.saveTrainingSet(set);
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: set.id,
      entityType: 'set',
      generateId: dependencies.generateId,
      operationType: 'upsert',
      payload: set,
    }),
  );

  return summarizeActiveWorkout(activeSession, dependencies.repositories);
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

export async function completeActiveWorkout(
  input: { userId: EntityId; sessionId: EntityId },
  dependencies: WorkoutExecutionDependencies,
): Promise<CompletedWorkout> {
  const sessions =
    await dependencies.repositories.workoutSessions.listWorkoutSessions({
      userId: input.userId,
    });
  const session = sessions.find(
    (item) => item.id === input.sessionId && item.deletedAt === null,
  );
  if (
    !session ||
    (session.status !== 'active' && session.status !== 'completed')
  ) {
    throw new WorkoutExecutionInputError(
      'workoutId',
      'Workout is not available to complete.',
    );
  }
  if (session.status === 'completed') {
    return summarizeCompletedWorkout(session, dependencies.repositories);
  }
  const now = dependencies.clock();
  const completed: WorkoutSession = {
    ...session,
    completedAt: now,
    durationSeconds: Math.max(
      0,
      Math.floor((Date.parse(now) - Date.parse(session.startedAt)) / 1000),
    ),
    status: 'completed',
    updatedAt: now,
  };
  await createPersonalRecordsForSession({ session: completed }, dependencies);
  // Queue first so a failed enqueue leaves the session available for retry.
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: completed.id,
      entityType: 'workout_session',
      generateId: dependencies.generateId,
      operationType: 'upsert',
      payload: completed,
    }),
  );
  await dependencies.repositories.workoutSessions.saveWorkoutSession(completed);
  return summarizeCompletedWorkout(completed, dependencies.repositories);
}

export async function listCompletedWorkouts(
  input: { userId: EntityId },
  repositories: WorkoutExecutionRepositories,
): Promise<CompletedWorkout[]> {
  const sessions =
    await repositories.workoutSessions.listWorkoutSessions(input);
  return Promise.all(
    sessions
      .filter(
        (session) =>
          session.deletedAt === null && session.status === 'completed',
      )
      .sort(
        (left, right) =>
          Date.parse(right.startedAt) - Date.parse(left.startedAt),
      )
      .map((session) => summarizeCompletedWorkout(session, repositories)),
  );
}

async function summarizeCompletedWorkout(
  session: WorkoutSession,
  repositories: WorkoutExecutionRepositories,
): Promise<CompletedWorkout> {
  const summary = await summarizeActiveWorkout(session, repositories);
  return {
    ...summary,
    completedAt: session.completedAt ?? session.updatedAt,
    durationSeconds: session.durationSeconds ?? 0,
    setCount: summary.exercises.reduce(
      (total, exercise) =>
        total + exercise.sets.filter((set) => set.completedAt !== null).length,
      0,
    ),
    workingVolume: summary.exercises.reduce(
      (total, exercise) => total + exercise.workingVolume,
      0,
    ),
  };
}

async function requireActiveSessionExercise(
  activeSession: WorkoutSession,
  sessionExerciseId: EntityId,
  repositories: WorkoutExecutionRepositories,
) {
  const sessionExercises =
    await repositories.sessionExercises.listSessionExercises({
      sessionId: activeSession.id,
    });
  const sessionExercise = sessionExercises.find(
    (exercise) => exercise.id === sessionExerciseId,
  );

  if (!sessionExercise || sessionExercise.deletedAt !== null) {
    throw new WorkoutExecutionInputError(
      'sessionExerciseId',
      'Exercise is not part of the active workout.',
    );
  }

  return sessionExercise;
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

function getNextSetNumber(existingSets: TrainingSet[]) {
  const lastSetNumber = existingSets.reduce(
    (max, set) => Math.max(max, set.setNumber),
    0,
  );

  return lastSetNumber + 1;
}

function normalizeNotes(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  return normalized ? normalized : null;
}

function normalizeOptionalInteger(value: number | null | undefined) {
  return typeof value === 'number' ? value : null;
}

function validateSetInput(input: LogWorkoutSetInput) {
  if (input.setType !== 'warmup' && input.setType !== 'working') {
    throw new WorkoutExecutionInputError(
      'setType',
      'Set type must be warmup or working.',
    );
  }

  if (!Number.isFinite(input.weightKg) || input.weightKg < 0) {
    throw new WorkoutExecutionInputError(
      'weightKg',
      'Weight must be zero or greater.',
    );
  }

  if (!Number.isInteger(input.repetitions) || input.repetitions <= 0) {
    throw new WorkoutExecutionInputError(
      'repetitions',
      'Repetitions must be a positive integer.',
    );
  }

  if (
    input.restSeconds !== null &&
    input.restSeconds !== undefined &&
    (!Number.isInteger(input.restSeconds) || input.restSeconds < 0)
  ) {
    throw new WorkoutExecutionInputError(
      'restSeconds',
      'Rest must be zero or greater when provided.',
    );
  }
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
  const sets = await repositories.sets.listTrainingSets({
    sessionExerciseIds: sessionExercises.map((exercise) => exercise.id),
  });
  const records = await repositories.personalRecords.listPersonalRecords({
    sourceSetIds: sets.map((set) => set.id),
    userId: session.userId,
  });
  const recordTypesBySetId = records.reduce((groups, record) => {
    const types = groups.get(record.sourceSetId) ?? [];
    groups.set(record.sourceSetId, [...types, record.recordType]);
    return groups;
  }, new Map<EntityId, PersonalRecordType[]>());
  const setsBySessionExerciseId = groupSetsBySessionExerciseId(sets);
  const defaultRestSecondsByExerciseId = new Map(
    (workout?.exercises ?? [])
      .filter((exercise) => exercise.deletedAt === null)
      .map((exercise) => [exercise.exerciseId, exercise.defaultRestSeconds]),
  );
  const exercises = sessionExercises
    .filter((exercise) => exercise.deletedAt === null)
    .sort((left, right) => left.position - right.position)
    .map((exercise) => {
      const exerciseSets = (setsBySessionExerciseId.get(exercise.id) ?? [])
        .filter((set) => set.deletedAt === null)
        .sort((left, right) => left.setNumber - right.setNumber);

      return {
        defaultRestSeconds:
          defaultRestSecondsByExerciseId.get(exercise.exerciseId) ?? null,
        exerciseId: exercise.exerciseId,
        exerciseName:
          (exercisesById.get(exercise.exerciseId) as Exercise | undefined)
            ?.name ?? 'Exercicio removido',
        id: exercise.id,
        position: exercise.position,
        setCount: exerciseSets.length,
        sets: exerciseSets.map((set) => ({
          completedAt: set.completedAt,
          id: set.id,
          notes: set.notes,
          personalRecordTypes: recordTypesBySetId.get(set.id) ?? [],
          repetitions: set.repetitions,
          restSeconds: set.restSeconds,
          setNumber: set.setNumber,
          setType: set.setType,
          volume: calculateSetVolume(set),
          weightKg: set.weightKg,
        })),
        workingVolume: calculateCompletedWorkoutVolume(exerciseSets),
      };
    });

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

function groupSetsBySessionExerciseId(sets: TrainingSet[]) {
  return sets.reduce((groups, set) => {
    const current = groups.get(set.sessionExerciseId) ?? [];

    groups.set(set.sessionExerciseId, [...current, set]);

    return groups;
  }, new Map<EntityId, TrainingSet[]>());
}
