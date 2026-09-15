import type { Exercise, WorkoutTemplate } from '../../domain/training/entities';
import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import {
  archiveWorkoutTemplate,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  listWorkoutTemplateSummaries,
  updateWorkoutTemplate,
  WorkoutCrudInputError,
  WorkoutNotFoundError,
} from './workoutCrud';

const now = '2026-09-15T13:00:00.000Z';
const later = '2026-09-15T14:00:00.000Z';
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
  secondaryMuscleGroups: ['Gluteos'],
};

const otherUserExercise: Exercise = {
  ...benchPress,
  id: 'exercise-private',
  isSystem: false,
  name: 'Exercicio privado',
  ownerUserId: 'user-2',
};

describe('workout CRUD use cases', () => {
  it('creates a workout template with planned exercises and sync operations', async () => {
    const repositories = createInMemoryRepositories({
      exercises: [benchPress, squat],
    });
    const ids = [
      'workout-1',
      'workout-exercise-1',
      'workout-exercise-2',
      'operation-workout',
      'operation-exercise-1',
      'operation-exercise-2',
    ];

    await expect(
      createWorkoutTemplate(
        {
          description: 'Treino de forca superior',
          exercises: [
            {
              defaultRestSeconds: 120,
              exerciseId: benchPress.id,
              targetRepsMax: 8,
              targetRepsMin: 6,
              targetSets: 4,
              targetWeightKg: 80,
            },
            {
              exerciseId: squat.id,
              targetSets: 3,
            },
          ],
          name: 'Upper A',
          userId,
        },
        {
          clock: () => now,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      description: 'Treino de forca superior',
      exercises: [
        {
          exerciseId: benchPress.id,
          position: 0,
          targetRepsMax: 8,
          targetRepsMin: 6,
          targetSets: 4,
        },
        {
          exerciseId: squat.id,
          position: 1,
          targetSets: 3,
        },
      ],
      id: 'workout-1',
      name: 'Upper A',
      userId,
    });
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        entityId: 'workout-1',
        entityType: 'workout',
        operationType: 'upsert',
      },
      {
        entityId: 'workout-exercise-1',
        entityType: 'workout_exercise',
        operationType: 'upsert',
      },
      {
        entityId: 'workout-exercise-2',
        entityType: 'workout_exercise',
        operationType: 'upsert',
      },
    ]);
  });

  it('lists workout summaries with resolved exercise names', async () => {
    const workout = createWorkoutFixture();
    const repositories = createInMemoryRepositories({
      exercises: [benchPress, squat],
      workoutTemplates: [workout],
    });

    await expect(
      listWorkoutTemplateSummaries({ userId }, repositories),
    ).resolves.toStrictEqual([
      {
        description: workout.description,
        exerciseCount: 2,
        exercises: [
          {
            defaultRestSeconds: 90,
            exerciseId: benchPress.id,
            exerciseName: benchPress.name,
            id: 'workout-exercise-1',
            notes: null,
            position: 0,
            targetRepsMax: 8,
            targetRepsMin: 6,
            targetSets: 4,
            targetWeightKg: 80,
          },
          {
            defaultRestSeconds: null,
            exerciseId: squat.id,
            exerciseName: squat.name,
            id: 'workout-exercise-2',
            notes: null,
            position: 1,
            targetRepsMax: null,
            targetRepsMin: null,
            targetSets: 3,
            targetWeightKg: null,
          },
        ],
        id: workout.id,
        isArchived: false,
        name: workout.name,
        updatedAt: workout.updatedAt,
      },
    ]);
  });

  it('updates workout metadata, reorders exercises and enqueues removed exercise deletes', async () => {
    const workout = createWorkoutFixture();
    const repositories = createInMemoryRepositories({
      exercises: [benchPress, squat],
      workoutTemplates: [workout],
    });
    const ids = ['operation-workout', 'operation-kept', 'operation-delete'];

    await expect(
      updateWorkoutTemplate(
        {
          description: null,
          exercises: [
            {
              exerciseId: squat.id,
              targetRepsMax: 12,
              targetRepsMin: 10,
              targetSets: 5,
            },
          ],
          name: 'Lower A',
          userId,
          workoutId: workout.id,
        },
        {
          clock: () => later,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      description: null,
      exercises: [
        {
          exerciseId: squat.id,
          id: 'workout-exercise-2',
          position: 0,
          targetRepsMax: 12,
          targetRepsMin: 10,
          targetSets: 5,
        },
      ],
      name: 'Lower A',
      updatedAt: later,
    });
    await expect(
      repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toMatchObject([
      {
        entityId: workout.id,
        entityType: 'workout',
        operationType: 'upsert',
      },
      {
        entityId: 'workout-exercise-2',
        entityType: 'workout_exercise',
        operationType: 'upsert',
      },
      {
        entityId: 'workout-exercise-1',
        entityType: 'workout_exercise',
        operationType: 'delete',
      },
    ]);
  });

  it('duplicates an owned workout with new identifiers', async () => {
    const workout = createWorkoutFixture();
    const repositories = createInMemoryRepositories({
      exercises: [benchPress, squat],
      workoutTemplates: [workout],
    });
    const ids = [
      'workout-copy',
      'copy-exercise-1',
      'copy-exercise-2',
      'operation-workout',
      'operation-exercise-1',
      'operation-exercise-2',
    ];

    await expect(
      duplicateWorkoutTemplate(
        {
          userId,
          workoutId: workout.id,
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
          id: 'copy-exercise-1',
          workoutId: 'workout-copy',
        },
        {
          id: 'copy-exercise-2',
          workoutId: 'workout-copy',
        },
      ],
      id: 'workout-copy',
      name: 'Upper A copia',
    });
  });

  it('archives and soft-deletes workouts owned by the user', async () => {
    const workout = createWorkoutFixture();
    const repositories = createInMemoryRepositories({
      exercises: [benchPress, squat],
      workoutTemplates: [workout],
    });
    const ids = ['operation-archive', 'operation-delete'];

    await expect(
      archiveWorkoutTemplate(
        {
          isArchived: true,
          userId,
          workoutId: workout.id,
        },
        {
          clock: () => later,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      isArchived: true,
      updatedAt: later,
    });
    await expect(
      deleteWorkoutTemplate(
        {
          userId,
          workoutId: workout.id,
        },
        {
          clock: () => later,
          generateId: () => ids.shift() ?? 'fallback-id',
          repositories,
        },
      ),
    ).resolves.toMatchObject({
      deletedAt: later,
      exercises: [
        {
          deletedAt: later,
        },
        {
          deletedAt: later,
        },
      ],
    });
    await expect(
      repositories.workouts.listWorkoutTemplates(userId),
    ).resolves.toStrictEqual([]);
  });

  it('rejects invalid workouts and another user private exercises', async () => {
    const repositories = createInMemoryRepositories({
      exercises: [otherUserExercise],
    });

    await expect(
      createWorkoutTemplate(
        {
          exercises: [{ exerciseId: otherUserExercise.id }],
          name: 'Private exercise plan',
          userId,
        },
        {
          clock: () => now,
          generateId: () => 'id',
          repositories,
        },
      ),
    ).rejects.toThrow(WorkoutCrudInputError);
    await expect(
      updateWorkoutTemplate(
        {
          exercises: [],
          name: 'Missing',
          userId,
          workoutId: 'missing-workout',
        },
        {
          clock: () => now,
          generateId: () => 'id',
          repositories,
        },
      ),
    ).rejects.toThrow(WorkoutNotFoundError);
  });
});

function createWorkoutFixture(): WorkoutTemplate {
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
