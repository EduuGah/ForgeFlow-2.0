import type { RepositoryProvider } from '../ports/repositories';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';

export type HomeOverview = {
  activeGoalCount: number;
  activeSession: {
    id: EntityId;
    startedAt: ISODateTimeString;
    workoutId: EntityId | null;
  } | null;
  pendingSyncOperationCount: number;
  savedWorkoutCount: number;
};

export type GetHomeOverviewParams = {
  userId: EntityId;
};

type GetHomeOverviewRepositories = Pick<
  RepositoryProvider,
  'goals' | 'syncOperations' | 'workoutSessions' | 'workouts'
>;

export async function getHomeOverview(
  params: GetHomeOverviewParams,
  repositories: GetHomeOverviewRepositories,
): Promise<HomeOverview> {
  const [activeSession, workouts, activeGoals, pendingSyncOperationCount] =
    await Promise.all([
      repositories.workoutSessions.findActiveWorkoutSession(params.userId),
      repositories.workouts.listWorkoutTemplates(params.userId),
      repositories.goals.listGoals({
        statuses: ['active', 'behind', 'on_track'],
        userId: params.userId,
      }),
      repositories.syncOperations.countPendingSyncOperations(),
    ]);

  return {
    activeGoalCount: activeGoals.length,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          startedAt: activeSession.startedAt,
          workoutId: activeSession.workoutId,
        }
      : null,
    pendingSyncOperationCount,
    savedWorkoutCount: workouts.length,
  };
}
