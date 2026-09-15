import type {
  Exercise,
  ExerciseFavorite,
} from '../../domain/training/entities';
import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import {
  createUserExercise,
  ExerciseLibraryInputError,
  listExerciseLibrary,
  toggleExerciseFavorite,
} from './exerciseLibrary';

const now = '2026-09-15T12:00:00.000Z';
const userId = 'user-1';

const benchPress: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: 'Horizontal press with a barbell.',
  equipment: 'Barra',
  id: 'exercise-bench-press',
  isSystem: true,
  name: 'Supino reto',
  ownerUserId: null,
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Triceps', 'Ombros'],
  updatedAt: now,
};

const squat: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: 'Compound lower-body movement.',
  equipment: 'Barra',
  id: 'exercise-squat',
  isSystem: true,
  name: 'Agachamento livre',
  ownerUserId: null,
  primaryMuscleGroup: 'Pernas',
  secondaryMuscleGroups: ['Gluteos'],
  updatedAt: now,
};

const customExercise: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: null,
  equipment: 'Halteres',
  id: 'exercise-custom',
  isSystem: false,
  name: 'Crucifixo inclinado',
  ownerUserId: userId,
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: [],
  updatedAt: now,
};

const otherUserExercise: Exercise = {
  ...customExercise,
  id: 'exercise-other-user',
  name: 'Exercicio privado',
  ownerUserId: 'user-2',
};

const favorite: ExerciseFavorite = {
  createdAt: now,
  exerciseId: customExercise.id,
  id: 'favorite-1',
  userId,
};

describe('exercise library use cases', () => {
  it('lists system and current-user exercises while hiding another user records', async () => {
    const repositories = createInMemoryRepositories({
      exerciseFavorites: [favorite],
      exercises: [benchPress, squat, customExercise, otherUserExercise],
    });

    await expect(
      listExerciseLibrary({ userId }, repositories),
    ).resolves.toMatchObject([
      {
        id: customExercise.id,
        isFavorite: true,
      },
      {
        id: squat.id,
        isFavorite: false,
      },
      {
        id: benchPress.id,
        isFavorite: false,
      },
    ]);
  });

  it('filters by query, primary muscle group, equipment and favorites', async () => {
    const repositories = createInMemoryRepositories({
      exerciseFavorites: [favorite],
      exercises: [benchPress, squat, customExercise],
    });

    await expect(
      listExerciseLibrary(
        {
          equipment: 'Halteres',
          favoritesOnly: true,
          primaryMuscleGroup: 'Peito',
          query: 'inclinado',
          userId,
        },
        repositories,
      ),
    ).resolves.toMatchObject([
      {
        id: customExercise.id,
        isFavorite: true,
      },
    ]);
  });

  it('creates a user exercise locally and enqueues an idempotent sync operation', async () => {
    const repositories = createInMemoryRepositories();
    const ids = ['exercise-1', 'operation-1'];

    await expect(
      createUserExercise(
        {
          description: 'Cable row variation',
          equipment: 'Cabo',
          name: 'Remada baixa',
          primaryMuscleGroup: 'Costas',
          secondaryMuscleGroups: ['Biceps', 'Biceps', ' '],
          userId,
        },
        {
          clock: () => now,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      id: 'exercise-1',
      name: 'Remada baixa',
      ownerUserId: userId,
      secondaryMuscleGroups: ['Biceps'],
    });

    await expect(
      repositories.exercises.findExerciseById('exercise-1'),
    ).resolves.toMatchObject({
      id: 'exercise-1',
      ownerUserId: userId,
    });
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        entityId: 'exercise-1',
        entityType: 'exercise',
        operationId: 'operation-1',
        operationType: 'upsert',
      },
    ]);
  });

  it('toggles favorites locally and enqueues sync operations', async () => {
    const repositories = createInMemoryRepositories({
      exercises: [benchPress],
    });
    const ids = ['favorite-1', 'operation-1', 'operation-2'];
    const dependencies = {
      clock: () => now,
      generateId: () => ids.shift() ?? 'fallback-id',
      repositories,
    };

    await expect(
      toggleExerciseFavorite(
        {
          exerciseId: benchPress.id,
          userId,
        },
        dependencies,
      ),
    ).resolves.toBe(true);
    await expect(
      toggleExerciseFavorite(
        {
          exerciseId: benchPress.id,
          userId,
        },
        dependencies,
      ),
    ).resolves.toBe(false);
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        entityId: 'favorite-1',
        entityType: 'exercise_favorite',
        operationId: 'operation-1',
        operationType: 'upsert',
      },
      {
        entityId: 'favorite-1',
        entityType: 'exercise_favorite',
        operationId: 'operation-2',
        operationType: 'delete',
      },
    ]);
  });

  it('rejects favorite toggles for another user private exercise', async () => {
    const repositories = createInMemoryRepositories({
      exercises: [otherUserExercise],
    });

    await expect(
      toggleExerciseFavorite(
        {
          exerciseId: otherUserExercise.id,
          userId,
        },
        {
          clock: () => now,
          generateId: () => 'id',
          repositories,
        },
      ),
    ).rejects.toThrow(ExerciseLibraryInputError);
  });
});
