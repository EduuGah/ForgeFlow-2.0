import type {
  Exercise,
  WorkoutExercise,
  WorkoutTemplate,
} from '../../domain/training/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type {
  SyncOperation,
  SyncOperationType,
} from '../../domain/sync/entities';
import type { RepositoryProvider } from '../ports/repositories';

export type WorkoutExercisePlanInput = {
  defaultRestSeconds?: number | null;
  exerciseId: EntityId;
  notes?: string | null;
  targetRepsMax?: number | null;
  targetRepsMin?: number | null;
  targetSets?: number | null;
  targetWeightKg?: number | null;
};

export type WorkoutTemplateInput = {
  description?: string | null;
  exercises?: WorkoutExercisePlanInput[];
  name: string;
};

export type WorkoutTemplateSummary = {
  description: string | null;
  exerciseCount: number;
  exercises: {
    defaultRestSeconds: number | null;
    exerciseId: EntityId;
    exerciseName: string;
    id: EntityId;
    notes: string | null;
    position: number;
    targetRepsMax: number | null;
    targetRepsMin: number | null;
    targetSets: number | null;
    targetWeightKg: number | null;
  }[];
  id: EntityId;
  isArchived: boolean;
  name: string;
  updatedAt: ISODateTimeString;
};

type WorkoutCrudRepositories = Pick<
  RepositoryProvider,
  'exercises' | 'syncOperations' | 'workouts'
>;

type WorkoutCrudDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: WorkoutCrudRepositories;
};

export class WorkoutCrudInputError extends Error {
  readonly field: 'exerciseId' | 'name' | 'targetReps' | 'targetValue';

  constructor(field: WorkoutCrudInputError['field'], message: string) {
    super(message);
    this.name = 'WorkoutCrudInputError';
    this.field = field;
  }
}

export class WorkoutNotFoundError extends Error {
  constructor() {
    super('Workout template was not found.');
    this.name = 'WorkoutNotFoundError';
  }
}

export async function listWorkoutTemplateSummaries(
  params: { includeArchived?: boolean; userId: EntityId },
  repositories: WorkoutCrudRepositories,
): Promise<WorkoutTemplateSummary[]> {
  const workouts = await repositories.workouts.listWorkoutTemplates(
    params.userId,
    {
      includeArchived: params.includeArchived,
    },
  );
  const exerciseIds = new Set(
    workouts.flatMap((workout) =>
      workout.exercises
        .filter((exercise) => exercise.deletedAt === null)
        .map((exercise) => exercise.exerciseId),
    ),
  );
  const exercisesById = await loadExercisesById(exerciseIds, repositories);

  return workouts
    .map((workout) => summarizeWorkout(workout, exercisesById))
    .sort(compareWorkoutTemplates);
}

export async function createWorkoutTemplate(
  input: WorkoutTemplateInput & { userId: EntityId },
  dependencies: WorkoutCrudDependencies,
) {
  const now = dependencies.clock();
  const workoutId = dependencies.generateId();
  const workout: WorkoutTemplate = {
    createdAt: now,
    deletedAt: null,
    description: normalizeNullableText(input.description),
    exercises: await buildWorkoutExercises({
      dependencies,
      exercises: input.exercises ?? [],
      now,
      userId: input.userId,
      workoutId,
    }),
    id: workoutId,
    isArchived: false,
    name: validateName(input.name),
    sortOrder: nowToSortOrder(now),
    updatedAt: now,
    userId: input.userId,
  };

  await dependencies.repositories.workouts.saveWorkoutTemplate(workout);
  await enqueueWorkoutUpserts(workout, dependencies);

  return workout;
}

export async function updateWorkoutTemplate(
  input: WorkoutTemplateInput & {
    userId: EntityId;
    workoutId: EntityId;
  },
  dependencies: WorkoutCrudDependencies,
) {
  const existing = await requireOwnedWorkout(
    input.workoutId,
    input.userId,
    dependencies.repositories,
  );
  const now = dependencies.clock();
  const nextExercises = await buildWorkoutExercises({
    dependencies,
    exercises: input.exercises ?? [],
    existingExercises: existing.exercises,
    now,
    userId: input.userId,
    workoutId: existing.id,
  });
  const nextWorkout: WorkoutTemplate = {
    ...existing,
    description: normalizeNullableText(input.description),
    exercises: nextExercises,
    name: validateName(input.name),
    updatedAt: now,
  };

  await dependencies.repositories.workouts.saveWorkoutTemplate(nextWorkout);
  await enqueueWorkoutUpserts(nextWorkout, dependencies);
  await enqueueRemovedWorkoutExercises(existing, nextWorkout, dependencies);

  return nextWorkout;
}

export async function duplicateWorkoutTemplate(
  input: { userId: EntityId; workoutId: EntityId },
  dependencies: WorkoutCrudDependencies,
) {
  const existing = await requireOwnedWorkout(
    input.workoutId,
    input.userId,
    dependencies.repositories,
  );
  const now = dependencies.clock();
  const nextWorkoutId = dependencies.generateId();
  const workout: WorkoutTemplate = {
    ...existing,
    createdAt: now,
    deletedAt: null,
    description: existing.description,
    exercises: existing.exercises
      .filter((exercise) => exercise.deletedAt === null)
      .map((exercise, index) => ({
        ...exercise,
        createdAt: now,
        deletedAt: null,
        id: dependencies.generateId(),
        position: index,
        updatedAt: now,
        workoutId: nextWorkoutId,
      })),
    id: nextWorkoutId,
    isArchived: false,
    name: `${existing.name} copia`,
    sortOrder: nowToSortOrder(now),
    updatedAt: now,
  };

  await dependencies.repositories.workouts.saveWorkoutTemplate(workout);
  await enqueueWorkoutUpserts(workout, dependencies);

  return workout;
}

export async function archiveWorkoutTemplate(
  input: { isArchived: boolean; userId: EntityId; workoutId: EntityId },
  dependencies: WorkoutCrudDependencies,
) {
  const existing = await requireOwnedWorkout(
    input.workoutId,
    input.userId,
    dependencies.repositories,
  );
  const workout = {
    ...existing,
    isArchived: input.isArchived,
    updatedAt: dependencies.clock(),
  };

  await dependencies.repositories.workouts.saveWorkoutTemplate(workout);
  await enqueueWorkoutOperation(workout, 'upsert', dependencies);

  return workout;
}

export async function deleteWorkoutTemplate(
  input: { userId: EntityId; workoutId: EntityId },
  dependencies: WorkoutCrudDependencies,
) {
  const existing = await requireOwnedWorkout(
    input.workoutId,
    input.userId,
    dependencies.repositories,
  );
  const deletedAt = dependencies.clock();
  const workout = {
    ...existing,
    deletedAt,
    exercises: existing.exercises.map((exercise) => ({
      ...exercise,
      deletedAt,
      updatedAt: deletedAt,
    })),
    updatedAt: deletedAt,
  };

  await dependencies.repositories.workouts.saveWorkoutTemplate(workout);
  await enqueueWorkoutOperation(workout, 'delete', dependencies);

  return workout;
}

async function buildWorkoutExercises(input: {
  dependencies: WorkoutCrudDependencies;
  exercises: WorkoutExercisePlanInput[];
  existingExercises?: WorkoutExercise[];
  now: ISODateTimeString;
  userId: EntityId;
  workoutId: EntityId;
}) {
  const uniqueExerciseIds = new Set<EntityId>();

  return Promise.all(
    input.exercises.map(
      async (exerciseInput, index): Promise<WorkoutExercise> => {
        if (uniqueExerciseIds.has(exerciseInput.exerciseId)) {
          throw new WorkoutCrudInputError(
            'exerciseId',
            'Workout cannot contain the same exercise twice.',
          );
        }

        uniqueExerciseIds.add(exerciseInput.exerciseId);
        validatePlan(exerciseInput);
        await requireAvailableExercise(
          exerciseInput.exerciseId,
          input.userId,
          input.dependencies.repositories,
        );

        const existing = input.existingExercises?.find(
          (exercise) => exercise.exerciseId === exerciseInput.exerciseId,
        );

        return {
          createdAt: existing?.createdAt ?? input.now,
          defaultRestSeconds: normalizeOptionalNumber(
            exerciseInput.defaultRestSeconds,
          ),
          deletedAt: null,
          exerciseId: exerciseInput.exerciseId,
          id: existing?.id ?? input.dependencies.generateId(),
          notes: normalizeNullableText(exerciseInput.notes),
          position: index,
          targetRepsMax: normalizeOptionalNumber(exerciseInput.targetRepsMax),
          targetRepsMin: normalizeOptionalNumber(exerciseInput.targetRepsMin),
          targetSets: normalizeOptionalNumber(exerciseInput.targetSets),
          targetWeightKg: normalizeOptionalNumber(exerciseInput.targetWeightKg),
          updatedAt: input.now,
          workoutId: input.workoutId,
        };
      },
    ),
  );
}

function compareWorkoutTemplates(
  left: WorkoutTemplateSummary,
  right: WorkoutTemplateSummary,
) {
  return left.name.localeCompare(right.name);
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

async function enqueueRemovedWorkoutExercises(
  existing: WorkoutTemplate,
  next: WorkoutTemplate,
  dependencies: WorkoutCrudDependencies,
) {
  const nextExerciseIds = new Set(
    next.exercises.map((exercise) => exercise.id),
  );
  const removed = existing.exercises.filter(
    (exercise) =>
      exercise.deletedAt === null && !nextExerciseIds.has(exercise.id),
  );

  await Promise.all(
    removed.map((exercise) =>
      dependencies.repositories.syncOperations.enqueueSyncOperation(
        createSyncOperation({
          clock: dependencies.clock,
          entityId: exercise.id,
          entityType: 'workout_exercise',
          generateId: dependencies.generateId,
          operationType: 'delete',
          payload: { workoutId: existing.id },
        }),
      ),
    ),
  );
}

async function enqueueWorkoutOperation(
  workout: WorkoutTemplate,
  operationType: SyncOperationType,
  dependencies: WorkoutCrudDependencies,
) {
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: workout.id,
      entityType: 'workout',
      generateId: dependencies.generateId,
      operationType,
      payload: serializeWorkout(workout),
    }),
  );
}

async function enqueueWorkoutUpserts(
  workout: WorkoutTemplate,
  dependencies: WorkoutCrudDependencies,
) {
  await enqueueWorkoutOperation(workout, 'upsert', dependencies);
  await Promise.all(
    workout.exercises
      .filter((exercise) => exercise.deletedAt === null)
      .map((exercise) =>
        dependencies.repositories.syncOperations.enqueueSyncOperation(
          createSyncOperation({
            clock: dependencies.clock,
            entityId: exercise.id,
            entityType: 'workout_exercise',
            generateId: dependencies.generateId,
            operationType: 'upsert',
            payload: exercise,
          }),
        ),
      ),
  );
}

async function loadExercisesById(
  exerciseIds: Set<EntityId>,
  repositories: WorkoutCrudRepositories,
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

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeOptionalNumber(value: number | null | undefined) {
  if (typeof value !== 'number') {
    return null;
  }

  return Number.isFinite(value) ? value : null;
}

function nowToSortOrder(value: ISODateTimeString) {
  return Date.parse(value);
}

async function requireAvailableExercise(
  exerciseId: EntityId,
  userId: EntityId,
  repositories: WorkoutCrudRepositories,
) {
  const exercise = await repositories.exercises.findExerciseById(exerciseId);

  if (
    !exercise ||
    exercise.deletedAt !== null ||
    (exercise.ownerUserId !== null && exercise.ownerUserId !== userId)
  ) {
    throw new WorkoutCrudInputError(
      'exerciseId',
      'Exercise is not available for this user.',
    );
  }
}

async function requireOwnedWorkout(
  workoutId: EntityId,
  userId: EntityId,
  repositories: WorkoutCrudRepositories,
) {
  const workout =
    await repositories.workouts.findWorkoutTemplateById(workoutId);

  if (!workout || workout.deletedAt !== null || workout.userId !== userId) {
    throw new WorkoutNotFoundError();
  }

  return workout;
}

function serializeWorkout(workout: WorkoutTemplate) {
  const { exercises: _exercises, ...payload } = workout;

  return payload;
}

function summarizeWorkout(
  workout: WorkoutTemplate,
  exercisesById: Map<EntityId, Exercise>,
): WorkoutTemplateSummary {
  const exercises = workout.exercises
    .filter((exercise) => exercise.deletedAt === null)
    .sort((left, right) => left.position - right.position)
    .map((exercise) => ({
      defaultRestSeconds: exercise.defaultRestSeconds,
      exerciseId: exercise.exerciseId,
      exerciseName:
        exercisesById.get(exercise.exerciseId)?.name ?? 'Exercicio removido',
      id: exercise.id,
      notes: exercise.notes,
      position: exercise.position,
      targetRepsMax: exercise.targetRepsMax,
      targetRepsMin: exercise.targetRepsMin,
      targetSets: exercise.targetSets,
      targetWeightKg: exercise.targetWeightKg,
    }));

  return {
    description: workout.description,
    exerciseCount: exercises.length,
    exercises,
    id: workout.id,
    isArchived: workout.isArchived,
    name: workout.name,
    updatedAt: workout.updatedAt,
  };
}

function validateName(value: string) {
  const normalized = value.trim();

  if (normalized.length < 2) {
    throw new WorkoutCrudInputError(
      'name',
      'Workout name must have at least 2 characters.',
    );
  }

  return normalized;
}

function validatePlan(input: WorkoutExercisePlanInput) {
  const min = normalizeOptionalNumber(input.targetRepsMin);
  const max = normalizeOptionalNumber(input.targetRepsMax);

  if (
    [input.defaultRestSeconds, input.targetSets, min, max, input.targetWeightKg]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => typeof value === 'number' && value < 0)
  ) {
    throw new WorkoutCrudInputError(
      'targetValue',
      'Workout targets cannot be negative.',
    );
  }

  if (min !== null && max !== null && max < min) {
    throw new WorkoutCrudInputError(
      'targetReps',
      'Maximum reps must be greater than minimum reps.',
    );
  }
}
