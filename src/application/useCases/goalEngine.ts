import type { Goal, GoalStatus, GoalType } from '../../domain/goals/entities';
import { goalTypeDefinitions } from '../../domain/goals/rules';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type { RepositoryProvider } from '../ports/repositories';
import { getTrainingAnalytics } from './trainingAnalytics';

type GoalRepositories = Pick<
  RepositoryProvider,
  | 'exercises'
  | 'goals'
  | 'personalRecords'
  | 'sessionExercises'
  | 'sets'
  | 'syncOperations'
  | 'workoutSessions'
>;

type GoalDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: GoalRepositories;
};

export type CreateGoalInput = {
  baselineValue?: number | null;
  deadline?: ISODateTimeString | null;
  exerciseId?: EntityId | null;
  targetValue: number;
  title: string;
  type: GoalType;
  userId: EntityId;
};

export type UpdateGoalInput = {
  deadline?: ISODateTimeString | null;
  goalId: EntityId;
  targetValue: number;
  title: string;
  userId: EntityId;
};

export class GoalInputError extends Error {
  constructor(
    readonly field:
      | 'baselineValue'
      | 'deadline'
      | 'exerciseId'
      | 'goalId'
      | 'targetValue'
      | 'title',
    message: string,
  ) {
    super(message);
    this.name = 'GoalInputError';
  }
}

export async function createGoal(
  input: CreateGoalInput,
  dependencies: GoalDependencies,
) {
  validateCommonInput(input, dependencies.clock());
  const definition = goalTypeDefinitions[input.type];
  const exerciseId = definition.exerciseRequired
    ? await requireOwnedOrSystemExercise(
        input.exerciseId,
        input.userId,
        dependencies,
      )
    : null;
  const baselineValue = definition.manualBaseline
    ? requireManualBaseline(input.baselineValue)
    : await captureAutomaticBaseline(
        input.type,
        exerciseId,
        input.userId,
        dependencies,
      );
  const now = dependencies.clock();
  const goal: Goal = {
    baselineValue,
    completedAt: null,
    createdAt: now,
    deadline: normalizeDeadline(input.deadline),
    deletedAt: null,
    exerciseId,
    id: dependencies.generateId(),
    metric: definition.metric,
    status: 'active',
    targetValue: input.targetValue,
    title: input.title.trim(),
    type: input.type,
    updatedAt: now,
    userId: input.userId,
  };

  await saveAndQueue(goal, dependencies);
  return goal;
}

export async function updateGoal(
  input: UpdateGoalInput,
  dependencies: GoalDependencies,
) {
  validateCommonInput(input, dependencies.clock());
  const goal = await requireGoal(input.goalId, input.userId, dependencies);
  if (goal.status === 'cancelled' || goal.status === 'completed') {
    throw new GoalInputError('goalId', 'Finished goals cannot be edited.');
  }
  const updated: Goal = {
    ...goal,
    deadline: normalizeDeadline(input.deadline),
    targetValue: input.targetValue,
    title: input.title.trim(),
    updatedAt: dependencies.clock(),
  };
  await saveAndQueue(updated, dependencies);
  return updated;
}

export async function pauseGoal(
  input: { goalId: EntityId; userId: EntityId },
  dependencies: GoalDependencies,
) {
  return changeGoalStatus(input, 'paused', dependencies);
}

export async function resumeGoal(
  input: { goalId: EntityId; userId: EntityId },
  dependencies: GoalDependencies,
) {
  return changeGoalStatus(input, 'active', dependencies);
}

export async function cancelGoal(
  input: { goalId: EntityId; userId: EntityId },
  dependencies: GoalDependencies,
) {
  return changeGoalStatus(input, 'cancelled', dependencies);
}

export async function listGoals(
  input: { userId: EntityId },
  repositories: Pick<RepositoryProvider, 'goals'>,
) {
  const goals = await repositories.goals.listGoals({ userId: input.userId });
  return goals.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

async function changeGoalStatus(
  input: { goalId: EntityId; userId: EntityId },
  status: Extract<GoalStatus, 'active' | 'cancelled' | 'paused'>,
  dependencies: GoalDependencies,
) {
  const goal = await requireGoal(input.goalId, input.userId, dependencies);
  const allowed =
    status === 'cancelled'
      ? ['active', 'behind', 'on_track', 'paused']
      : status === 'paused'
        ? ['active', 'behind', 'on_track']
        : ['paused'];
  if (!allowed.includes(goal.status)) {
    throw new GoalInputError('goalId', `Goal cannot become ${status}.`);
  }
  const updated = { ...goal, status, updatedAt: dependencies.clock() };
  await saveAndQueue(updated, dependencies);
  return updated;
}

async function captureAutomaticBaseline(
  type: GoalType,
  exerciseId: EntityId | null,
  userId: EntityId,
  dependencies: GoalDependencies,
) {
  const now = dependencies.clock();
  const from = getBaselineStart(type, now);
  const analytics = await getTrainingAnalytics(
    { period: { from, to: now }, userId },
    dependencies.repositories,
  );
  const exercise = exerciseId
    ? analytics.exercises.find((item) => item.exerciseId === exerciseId)
    : null;

  if (type === 'exercise_weight') return exercise?.maxWeightKg ?? 0;
  if (type === 'exercise_repetitions') return exercise?.maxRepetitions ?? 0;
  if (type === 'exercise_volume') {
    return Math.max(
      0,
      ...(exercise?.points.map((point) => point.volume) ?? []),
    );
  }
  if (type === 'workout_frequency') return analytics.summary.frequencyPerWeek;
  if (type === 'monthly_workout_count') return analytics.summary.workoutCount;
  if (type === 'total_volume') return analytics.summary.volume;
  if (type === 'pr_achievement') return analytics.summary.personalRecordCount;
  return 0;
}

function getBaselineStart(type: GoalType, now: ISODateTimeString) {
  const date = new Date(now);
  if (type === 'workout_frequency') {
    date.setDate(date.getDate() - 29);
    return date.toISOString();
  }
  if (type === 'monthly_workout_count') {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
  return '1970-01-01T00:00:00.000Z';
}

async function requireOwnedOrSystemExercise(
  exerciseId: EntityId | null | undefined,
  userId: EntityId,
  dependencies: GoalDependencies,
) {
  if (!exerciseId) {
    throw new GoalInputError(
      'exerciseId',
      'Exercise is required for this goal.',
    );
  }
  const exercise =
    await dependencies.repositories.exercises.findExerciseById(exerciseId);
  if (
    !exercise ||
    exercise.deletedAt !== null ||
    (exercise.ownerUserId && exercise.ownerUserId !== userId)
  ) {
    throw new GoalInputError('exerciseId', 'Exercise is not available.');
  }
  return exerciseId;
}

async function requireGoal(
  goalId: EntityId,
  userId: EntityId,
  dependencies: GoalDependencies,
) {
  const goal = await dependencies.repositories.goals.findGoalById(goalId);
  if (!goal || goal.deletedAt !== null || goal.userId !== userId) {
    throw new GoalInputError('goalId', 'Goal is not available.');
  }
  return goal;
}

function requireManualBaseline(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new GoalInputError(
      'baselineValue',
      'A non-negative baseline is required.',
    );
  }
  return value;
}

function validateCommonInput(
  input: Pick<CreateGoalInput, 'deadline' | 'targetValue' | 'title'>,
  now: ISODateTimeString,
) {
  if (!input.title.trim())
    throw new GoalInputError('title', 'Title is required.');
  if (!Number.isFinite(input.targetValue) || input.targetValue < 0) {
    throw new GoalInputError(
      'targetValue',
      'Target must be a non-negative number.',
    );
  }
  if (input.deadline) {
    const deadline = Date.parse(input.deadline);
    if (Number.isNaN(deadline)) {
      throw new GoalInputError('deadline', 'Deadline must be a valid date.');
    }
    if (deadline <= Date.parse(now)) {
      throw new GoalInputError('deadline', 'Deadline must be in the future.');
    }
  }
}

function normalizeDeadline(value: ISODateTimeString | null | undefined) {
  return value ?? null;
}

async function saveAndQueue(goal: Goal, dependencies: GoalDependencies) {
  await dependencies.repositories.goals.saveGoal(goal);
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    createGoalSyncOperation(goal, dependencies),
  );
}

function createGoalSyncOperation(
  goal: Goal,
  dependencies: GoalDependencies,
): SyncOperation {
  const now = dependencies.clock();
  return {
    attemptCount: 0,
    createdAt: now,
    entityId: goal.id,
    entityType: 'goal',
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: goal,
    status: 'pending',
  };
}
