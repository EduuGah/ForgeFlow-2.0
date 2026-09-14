import { getHomeOverview } from '../application/useCases/getHomeOverview';
import { createInMemoryRepositories } from '../data/repositories/inMemoryRepositories';

const LOCAL_PREVIEW_USER_ID = 'local-preview-user';

export function createAppServices() {
  const repositories = createInMemoryRepositories();

  return {
    currentUserId: LOCAL_PREVIEW_USER_ID,
    homeOverview: {
      get: () =>
        getHomeOverview(
          { userId: LOCAL_PREVIEW_USER_ID },
          {
            goals: repositories.goals,
            syncOperations: repositories.syncOperations,
            workoutSessions: repositories.workoutSessions,
            workouts: repositories.workouts,
          },
        ),
    },
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
