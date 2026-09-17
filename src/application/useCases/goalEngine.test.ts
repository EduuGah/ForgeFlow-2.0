import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type {
  Exercise,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
} from '../../domain/training/entities';
import type { GoalType } from '../../domain/goals/entities';
import {
  cancelGoal,
  createGoal,
  GoalInputError,
  pauseGoal,
  resumeGoal,
  updateGoal,
} from './goalEngine';

const now = '2026-09-16T12:00:00.000Z';
const userId = 'user-1';

describe('goal engine', () => {
  it('captures an exercise baseline, starts active and queues synchronization', async () => {
    const dependencies = createDependencies();
    const goal = await createGoal(
      {
        deadline: '2026-12-01T00:00:00.000Z',
        exerciseId: exercise.id,
        targetValue: 100,
        title: 'Supino com 100 kg',
        type: 'exercise_weight',
        userId,
      },
      dependencies,
    );

    expect(goal).toMatchObject({
      baselineValue: 80,
      exerciseId: exercise.id,
      metric: 'weight_kg',
      status: 'active',
      targetValue: 100,
    });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(1);
  });

  it.each<GoalType>([
    'body_weight',
    'custom',
    'exercise_repetitions',
    'exercise_volume',
    'exercise_weight',
    'monthly_workout_count',
    'pr_achievement',
    'total_volume',
    'workout_frequency',
  ])('creates the supported %s goal type', async (type) => {
    const dependencies = createDependencies();
    const goal = await createGoal(
      {
        baselineValue:
          type === 'body_weight' || type === 'custom' ? 10 : undefined,
        exerciseId: type.startsWith('exercise_') ? exercise.id : undefined,
        targetValue: 20,
        title: `Goal ${type}`,
        type,
        userId,
      },
      dependencies,
    );
    expect(goal.type).toBe(type);
    expect(goal.status).toBe('active');
    expect(goal.baselineValue).not.toBeNull();
  });

  it('preserves baseline and identity while editing and changing lifecycle status', async () => {
    const dependencies = createDependencies();
    const created = await createGoal(
      {
        baselineValue: 82,
        targetValue: 78,
        title: 'Peso corporal',
        type: 'body_weight',
        userId,
      },
      dependencies,
    );
    const edited = await updateGoal(
      {
        goalId: created.id,
        targetValue: 77,
        title: 'Peso corporal atualizado',
        userId,
      },
      dependencies,
    );
    expect(edited).toMatchObject({
      baselineValue: 82,
      metric: created.metric,
      targetValue: 77,
      type: created.type,
    });

    const paused = await pauseGoal(
      { goalId: created.id, userId },
      dependencies,
    );
    expect(paused.status).toBe('paused');
    const resumed = await resumeGoal(
      { goalId: created.id, userId },
      dependencies,
    );
    expect(resumed.status).toBe('active');
    const cancelled = await cancelGoal(
      { goalId: created.id, userId },
      dependencies,
    );
    expect(cancelled.status).toBe('cancelled');
  });

  it('rejects missing manual baselines, missing exercises and past deadlines', async () => {
    const dependencies = createDependencies();
    await expect(
      createGoal(
        { targetValue: 10, title: 'Custom', type: 'custom', userId },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(GoalInputError);
    await expect(
      createGoal(
        {
          targetValue: 10,
          title: 'Weight',
          type: 'exercise_weight',
          userId,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ field: 'exerciseId' });
    await expect(
      createGoal(
        {
          baselineValue: 0,
          deadline: '2026-01-01T00:00:00.000Z',
          targetValue: 10,
          title: 'Past',
          type: 'custom',
          userId,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ field: 'deadline' });
    await expect(
      createGoal(
        {
          baselineValue: 0,
          deadline: 'not-a-date',
          targetValue: 10,
          title: 'Invalid deadline',
          type: 'custom',
          userId,
        },
        dependencies,
      ),
    ).rejects.toMatchObject({ field: 'deadline' });
  });
});

function createDependencies() {
  let sequence = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories({
      exercises: [exercise],
      sessionExercises: [sessionExercise],
      trainingSets: [trainingSet],
      workoutSessions: [session],
    }),
  };
}

const exercise: Exercise = {
  createdAt: now,
  deletedAt: null,
  description: null,
  equipment: 'Barra',
  id: 'bench',
  isSystem: true,
  name: 'Supino reto',
  ownerUserId: null,
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Triceps'],
  updatedAt: now,
};

const session: WorkoutSession = {
  completedAt: '2026-09-10T12:00:00.000Z',
  createdAt: now,
  deletedAt: null,
  durationSeconds: 3_600,
  id: 'session',
  notes: null,
  startedAt: '2026-09-10T11:00:00.000Z',
  status: 'completed',
  updatedAt: now,
  userId,
  workoutId: null,
};

const sessionExercise: SessionExercise = {
  createdAt: now,
  deletedAt: null,
  exerciseId: exercise.id,
  id: 'session-exercise',
  position: 1,
  sessionId: session.id,
  updatedAt: now,
};

const trainingSet: TrainingSet = {
  completedAt: session.completedAt,
  createdAt: now,
  deletedAt: null,
  id: 'set',
  notes: null,
  repetitions: 8,
  restSeconds: 90,
  sessionExerciseId: sessionExercise.id,
  setNumber: 1,
  setType: 'working',
  updatedAt: now,
  weightKg: 80,
};
