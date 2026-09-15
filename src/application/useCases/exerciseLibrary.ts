import type {
  Exercise,
  ExerciseFavorite,
} from '../../domain/training/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type { RepositoryProvider } from '../ports/repositories';

export type ExerciseLibraryItem = Exercise & {
  isFavorite: boolean;
};

export type ListExerciseLibraryParams = {
  equipment?: string | null;
  favoritesOnly?: boolean;
  primaryMuscleGroup?: string | null;
  query?: string | null;
  userId: EntityId;
};

export type CreateUserExerciseInput = {
  description?: string | null;
  equipment?: string | null;
  name: string;
  primaryMuscleGroup: string;
  secondaryMuscleGroups?: string[];
  userId: EntityId;
};

export type ToggleExerciseFavoriteInput = {
  exerciseId: EntityId;
  userId: EntityId;
};

type ExerciseLibraryRepositories = Pick<
  RepositoryProvider,
  'exerciseFavorites' | 'exercises' | 'syncOperations'
>;

type MutationDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: ExerciseLibraryRepositories;
};

export class ExerciseLibraryInputError extends Error {
  readonly field: 'exerciseId' | 'name' | 'primaryMuscleGroup';

  constructor(field: ExerciseLibraryInputError['field'], message: string) {
    super(message);
    this.name = 'ExerciseLibraryInputError';
    this.field = field;
  }
}

export async function listExerciseLibrary(
  params: ListExerciseLibraryParams,
  repositories: ExerciseLibraryRepositories,
): Promise<ExerciseLibraryItem[]> {
  const exercises = await repositories.exercises.listExercises({
    equipment: normalizeNullableFilter(params.equipment),
    primaryMuscleGroup: normalizeNullableFilter(params.primaryMuscleGroup),
    query: normalizeNullableFilter(params.query),
    userId: params.userId,
  });
  const favorites = await repositories.exerciseFavorites.listExerciseFavorites({
    exerciseIds: exercises.map((exercise) => exercise.id),
    userId: params.userId,
  });
  const favoriteIds = new Set(favorites.map((favorite) => favorite.exerciseId));

  return exercises
    .map((exercise) => ({
      ...exercise,
      isFavorite: favoriteIds.has(exercise.id),
    }))
    .filter((exercise) => !params.favoritesOnly || exercise.isFavorite)
    .sort(compareExerciseLibraryItems);
}

export async function createUserExercise(
  input: CreateUserExerciseInput,
  dependencies: MutationDependencies,
) {
  const name = validateRequiredText(input.name, 'name');
  const primaryMuscleGroup = validateRequiredText(
    input.primaryMuscleGroup,
    'primaryMuscleGroup',
  );
  const now = dependencies.clock();
  const exercise: Exercise = {
    createdAt: now,
    deletedAt: null,
    description: normalizeNullableText(input.description),
    equipment: normalizeNullableText(input.equipment),
    id: dependencies.generateId(),
    isSystem: false,
    name,
    ownerUserId: input.userId,
    primaryMuscleGroup,
    secondaryMuscleGroups: normalizeSecondaryMuscleGroups(
      input.secondaryMuscleGroups,
    ),
    updatedAt: now,
  };

  await dependencies.repositories.exercises.saveExercise(exercise);
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: exercise.id,
      entityType: 'exercise',
      generateId: dependencies.generateId,
      operationType: 'upsert',
      payload: exercise,
    }),
  );

  return exercise;
}

export async function toggleExerciseFavorite(
  input: ToggleExerciseFavoriteInput,
  dependencies: MutationDependencies,
) {
  if (!input.exerciseId.trim()) {
    throw new ExerciseLibraryInputError('exerciseId', 'Exercise is required.');
  }

  const existingExercise =
    await dependencies.repositories.exercises.findExerciseById(
      input.exerciseId,
    );

  if (
    !existingExercise ||
    existingExercise.deletedAt !== null ||
    (existingExercise.ownerUserId !== null &&
      existingExercise.ownerUserId !== input.userId)
  ) {
    throw new ExerciseLibraryInputError(
      'exerciseId',
      'Exercise is not available for this user.',
    );
  }

  const existingFavorite =
    await dependencies.repositories.exerciseFavorites.findExerciseFavorite(
      input.userId,
      input.exerciseId,
    );

  if (existingFavorite) {
    await dependencies.repositories.exerciseFavorites.deleteExerciseFavorite(
      existingFavorite.id,
    );
    await dependencies.repositories.syncOperations.enqueueSyncOperation(
      createSyncOperation({
        clock: dependencies.clock,
        entityId: existingFavorite.id,
        entityType: 'exercise_favorite',
        generateId: dependencies.generateId,
        operationType: 'delete',
        payload: {
          exerciseId: existingFavorite.exerciseId,
          userId: existingFavorite.userId,
        },
      }),
    );

    return false;
  }

  const favorite: ExerciseFavorite = {
    createdAt: dependencies.clock(),
    exerciseId: input.exerciseId,
    id: dependencies.generateId(),
    userId: input.userId,
  };

  await dependencies.repositories.exerciseFavorites.saveExerciseFavorite(
    favorite,
  );
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createSyncOperation({
      clock: dependencies.clock,
      entityId: favorite.id,
      entityType: 'exercise_favorite',
      generateId: dependencies.generateId,
      operationType: 'upsert',
      payload: favorite,
    }),
  );

  return true;
}

function compareExerciseLibraryItems(
  left: ExerciseLibraryItem,
  right: ExerciseLibraryItem,
) {
  if (left.isFavorite !== right.isFavorite) {
    return left.isFavorite ? -1 : 1;
  }

  if (left.isSystem !== right.isSystem) {
    return left.isSystem ? -1 : 1;
  }

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

function normalizeNullableFilter(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeSecondaryMuscleGroups(values: string[] | undefined) {
  if (!values) {
    return [];
  }

  return values
    .map((value) => value.trim())
    .filter((value, index, array) => value && array.indexOf(value) === index);
}

function validateRequiredText(
  value: string,
  field: ExerciseLibraryInputError['field'],
) {
  const normalized = value.trim();

  if (normalized.length < 2) {
    throw new ExerciseLibraryInputError(
      field,
      `${field} must have at least 2 characters.`,
    );
  }

  return normalized;
}
