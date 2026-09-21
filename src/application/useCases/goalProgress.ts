import type {
  Goal,
  GoalProgressEvent,
  GoalProgressSource,
} from '../../domain/goals/entities';
import { evaluateGoalProgress } from '../../domain/goals/progress';
import { goalTypeDefinitions } from '../../domain/goals/rules';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncEntityType, SyncOperation } from '../../domain/sync/entities';
import type { RepositoryProvider } from '../ports/repositories';
import {
  measureAutomaticGoalValue,
  type GoalMeasurementDependencies,
} from './goalEngine';

type GoalProgressRepositories = Pick<
  RepositoryProvider,
  | 'exercises'
  | 'goalProgressEvents'
  | 'goals'
  | 'personalRecords'
  | 'sessionExercises'
  | 'sets'
  | 'syncOperations'
  | 'workoutSessions'
>;

type GoalProgressDependencies = GoalMeasurementDependencies & {
  generateId: () => EntityId;
  repositories: GoalProgressRepositories;
};

export type GoalProgressView = {
  goal: Goal;
  measuredValue: number | null;
  progressPercent: number;
  recordedAt: ISODateTimeString | null;
};

export class GoalProgressInputError extends Error {
  constructor(
    readonly field: 'goalId' | 'measuredValue',
    message: string,
  ) {
    super(message);
    this.name = 'GoalProgressInputError';
  }
}

export async function recordManualGoalProgress(
  input: { goalId: EntityId; measuredValue: number; userId: EntityId },
  dependencies: GoalProgressDependencies,
) {
  if (!Number.isFinite(input.measuredValue) || input.measuredValue < 0) {
    throw new GoalProgressInputError(
      'measuredValue',
      'Measured value must be a non-negative number.',
    );
  }
  const goal = await requireProgressableGoal(
    input.goalId,
    input.userId,
    dependencies.repositories,
  );
  if (!goalTypeDefinitions[goal.type].manualBaseline) {
    throw new GoalProgressInputError(
      'goalId',
      'This goal is updated from training data.',
    );
  }
  return applyGoalProgress(
    goal,
    input.measuredValue,
    'manual',
    null,
    dependencies,
  );
}

export async function refreshActiveGoalProgress(
  input: {
    sourceId?: EntityId | null;
    sourceType?: Extract<
      GoalProgressSource,
      'analytics_refresh' | 'workout_completion'
    >;
    userId: EntityId;
  },
  dependencies: GoalProgressDependencies,
) {
  const goals = await dependencies.repositories.goals.listGoals({
    statuses: ['active', 'behind', 'on_track'],
    userId: input.userId,
  });
  const events =
    await dependencies.repositories.goalProgressEvents.listGoalProgressEvents({
      goalIds: goals.map((goal) => goal.id),
    });
  const latestEvents = latestEventsByGoal(events);

  return Promise.all(
    goals.map(async (goal) => {
      const definition = goalTypeDefinitions[goal.type];
      const measuredValue = definition.manualBaseline
        ? (latestEvents.get(goal.id)?.measuredValue ?? goal.baselineValue ?? 0)
        : await measureAutomaticGoalValue(
            goal.type,
            goal.exerciseId,
            goal.userId,
            dependencies,
          );
      return applyGoalProgress(
        goal,
        measuredValue,
        input.sourceType ?? 'analytics_refresh',
        input.sourceId ?? null,
        dependencies,
        latestEvents.get(goal.id),
      );
    }),
  );
}

export async function listGoalProgress(
  input: { userId: EntityId },
  repositories: Pick<RepositoryProvider, 'goalProgressEvents' | 'goals'>,
): Promise<GoalProgressView[]> {
  const goals = await repositories.goals.listGoals({ userId: input.userId });
  const events = await repositories.goalProgressEvents.listGoalProgressEvents({
    goalIds: goals.map((goal) => goal.id),
  });
  const latestEvents = latestEventsByGoal(events);

  return goals
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((goal) => {
      const latest = latestEvents.get(goal.id);
      return {
        goal,
        measuredValue: latest?.measuredValue ?? goal.baselineValue,
        progressPercent: latest?.progressPercent ?? 0,
        recordedAt: latest?.recordedAt ?? null,
      };
    });
}

async function applyGoalProgress(
  goal: Goal,
  measuredValue: number,
  sourceType: GoalProgressSource,
  sourceId: EntityId | null,
  dependencies: GoalProgressDependencies,
  knownLatestEvent?: GoalProgressEvent,
): Promise<GoalProgressView> {
  const now = dependencies.clock();
  const evaluation = evaluateGoalProgress(goal, measuredValue, now);
  const latestEvent =
    knownLatestEvent ??
    latestEventForGoal(
      await dependencies.repositories.goalProgressEvents.listGoalProgressEvents(
        { goalId: goal.id },
      ),
    );
  const goalChanged =
    goal.status !== evaluation.status ||
    goal.completedAt !== evaluation.completedAt;
  const eventChanged =
    !latestEvent ||
    latestEvent.measuredValue !== measuredValue ||
    latestEvent.progressPercent !== evaluation.progressPercent ||
    goalChanged;

  if (!eventChanged) {
    return {
      goal,
      measuredValue,
      progressPercent: evaluation.progressPercent,
      recordedAt: latestEvent.recordedAt,
    };
  }

  const event: GoalProgressEvent = {
    goalId: goal.id,
    id: dependencies.generateId(),
    measuredValue,
    progressPercent: evaluation.progressPercent,
    recordedAt: now,
    sourceId,
    sourceType,
  };
  await queueSyncOperation(event, 'goal_progress_event', dependencies);
  await dependencies.repositories.goalProgressEvents.saveGoalProgressEvent(
    event,
  );

  const updatedGoal = goalChanged
    ? {
        ...goal,
        completedAt: evaluation.completedAt,
        status: evaluation.status,
        updatedAt: now,
      }
    : goal;
  if (goalChanged) {
    await queueSyncOperation(updatedGoal, 'goal', dependencies);
    await dependencies.repositories.goals.saveGoal(updatedGoal);
  }

  return {
    goal: updatedGoal,
    measuredValue,
    progressPercent: evaluation.progressPercent,
    recordedAt: now,
  };
}

async function requireProgressableGoal(
  goalId: EntityId,
  userId: EntityId,
  repositories: Pick<RepositoryProvider, 'goals'>,
) {
  const goal = await repositories.goals.findGoalById(goalId);
  if (!goal || goal.deletedAt !== null || goal.userId !== userId) {
    throw new GoalProgressInputError('goalId', 'Goal is not available.');
  }
  if (!['active', 'behind', 'on_track'].includes(goal.status)) {
    throw new GoalProgressInputError(
      'goalId',
      'Paused or finished goals cannot receive progress.',
    );
  }
  return goal;
}

function latestEventsByGoal(events: GoalProgressEvent[]) {
  const latest = new Map<EntityId, GoalProgressEvent>();
  for (const event of events) {
    const current = latest.get(event.goalId);
    if (!current || compareEvents(event, current) > 0) {
      latest.set(event.goalId, event);
    }
  }
  return latest;
}

function latestEventForGoal(events: GoalProgressEvent[]) {
  return events.sort(compareEvents).at(-1);
}

function compareEvents(left: GoalProgressEvent, right: GoalProgressEvent) {
  return (
    left.recordedAt.localeCompare(right.recordedAt) ||
    left.id.localeCompare(right.id)
  );
}

async function queueSyncOperation(
  payload: Goal | GoalProgressEvent,
  entityType: Extract<SyncEntityType, 'goal' | 'goal_progress_event'>,
  dependencies: GoalProgressDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: payload.id,
    entityType,
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload,
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
