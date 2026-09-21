import type { Goal, GoalStatus } from './entities';

export type GoalProgressEvaluation = {
  completedAt: string | null;
  progressPercent: number;
  status: Extract<
    GoalStatus,
    'active' | 'behind' | 'completed' | 'expired' | 'on_track'
  >;
};

export function evaluateGoalProgress(
  goal: Goal,
  measuredValue: number,
  now: string,
): GoalProgressEvaluation {
  if (!Number.isFinite(measuredValue)) {
    throw new Error('Measured goal value must be finite.');
  }

  const baseline = goal.baselineValue ?? 0;
  const targetDelta = goal.targetValue - baseline;
  const measuredDelta = measuredValue - baseline;
  const reachedTarget =
    targetDelta === 0 ||
    (targetDelta > 0
      ? measuredValue >= goal.targetValue
      : measuredValue <= goal.targetValue);
  const progressPercent = reachedTarget
    ? 100
    : clamp((measuredDelta / targetDelta) * 100, 0, 100);

  if (reachedTarget) {
    return { completedAt: now, progressPercent, status: 'completed' };
  }
  if (goal.deadline && Date.parse(now) > Date.parse(goal.deadline)) {
    return { completedAt: null, progressPercent, status: 'expired' };
  }
  if (!goal.deadline) {
    return { completedAt: null, progressPercent, status: 'active' };
  }

  const totalDuration = Date.parse(goal.deadline) - Date.parse(goal.createdAt);
  const elapsedDuration = Date.parse(now) - Date.parse(goal.createdAt);
  const expectedProgress = clamp(
    (elapsedDuration / totalDuration) * 100,
    0,
    100,
  );

  return {
    completedAt: null,
    progressPercent,
    status: progressPercent + 0.01 >= expectedProgress ? 'on_track' : 'behind',
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
