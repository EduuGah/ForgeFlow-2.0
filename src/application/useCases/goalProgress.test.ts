import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { Goal } from '../../domain/goals/entities';
import type {
  Exercise,
  SessionExercise,
  TrainingSet,
  WorkoutSession,
} from '../../domain/training/entities';
import {
  GoalProgressInputError,
  listGoalProgress,
  recordManualGoalProgress,
  refreshActiveGoalProgress,
} from './goalProgress';

const now = '2026-09-06T00:00:00.000Z';
const userId = 'user-1';

describe('goal progress tracking', () => {
  it('records manual progress and derives on-track status from the deadline', async () => {
    const dependencies = createDependencies({ goals: [goal()] });
    const result = await recordManualGoalProgress(
      { goalId: 'goal-1', measuredValue: 160, userId },
      dependencies,
    );

    expect(result).toMatchObject({
      measuredValue: 160,
      progressPercent: 60,
      goal: { status: 'on_track' },
    });
    await expect(
      dependencies.repositories.goalProgressEvents.listGoalProgressEvents({
        goalId: 'goal-1',
      }),
    ).resolves.toHaveLength(1);
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(2);
  });

  it('completes a goal once and rejects progress after completion', async () => {
    const dependencies = createDependencies({ goals: [goal()] });
    const completed = await recordManualGoalProgress(
      { goalId: 'goal-1', measuredValue: 210, userId },
      dependencies,
    );

    expect(completed.goal).toMatchObject({
      completedAt: now,
      status: 'completed',
    });
    await expect(
      recordManualGoalProgress(
        { goalId: 'goal-1', measuredValue: 220, userId },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(GoalProgressInputError);
    await expect(
      dependencies.repositories.goalProgressEvents.listGoalProgressEvents({
        goalId: 'goal-1',
      }),
    ).resolves.toHaveLength(1);
  });

  it('refreshes automatic exercise progress and deduplicates equal results', async () => {
    const dependencies = createDependencies({
      exercises: [exercise],
      goals: [
        goal({
          baselineValue: 40,
          deadline: null,
          exerciseId: exercise.id,
          metric: 'weight_kg',
          targetValue: 100,
          type: 'exercise_weight',
        }),
      ],
      sessionExercises: [sessionExercise],
      trainingSets: [trainingSet],
      workoutSessions: [session],
    });

    await refreshActiveGoalProgress({ userId }, dependencies);
    await refreshActiveGoalProgress({ userId }, dependencies);
    const views = await listGoalProgress({ userId }, dependencies.repositories);

    expect(views[0]).toMatchObject({
      measuredValue: 80,
      progressPercent: 66.66666666666666,
      goal: { status: 'active' },
    });
    await expect(
      dependencies.repositories.goalProgressEvents.listGoalProgressEvents({
        goalId: 'goal-1',
      }),
    ).resolves.toHaveLength(1);
  });

  it('expires overdue active goals but leaves paused goals untouched', async () => {
    const dependencies = createDependencies({
      goals: [
        goal({ deadline: '2026-09-05T23:59:59.999Z' }),
        goal({ id: 'paused', status: 'paused' }),
      ],
    });

    await refreshActiveGoalProgress({ userId }, dependencies);

    await expect(
      dependencies.repositories.goals.findGoalById('goal-1'),
    ).resolves.toMatchObject({ status: 'expired' });
    await expect(
      dependencies.repositories.goals.findGoalById('paused'),
    ).resolves.toMatchObject({ status: 'paused' });
  });
});

function createDependencies(
  seed: Parameters<typeof createInMemoryRepositories>[0],
) {
  let sequence = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories(seed),
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    baselineValue: 100,
    completedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    deadline: '2026-09-11T00:00:00.000Z',
    deletedAt: null,
    exerciseId: null,
    id: 'goal-1',
    metric: 'custom_value',
    status: 'active',
    targetValue: 200,
    title: 'Meta',
    type: 'custom',
    updatedAt: '2026-09-01T00:00:00.000Z',
    userId,
    ...overrides,
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
  completedAt: now,
  createdAt: now,
  deletedAt: null,
  durationSeconds: 3_600,
  id: 'session',
  notes: null,
  startedAt: '2026-09-05T23:00:00.000Z',
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
  completedAt: now,
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
