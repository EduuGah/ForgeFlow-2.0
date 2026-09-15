import {
  login,
  logout,
  registerAccount,
  restoreSession,
} from '../application/useCases/authenticate';
import { getHomeOverview } from '../application/useCases/getHomeOverview';
import { InMemoryAuthRemoteGateway } from '../data/auth/inMemoryAuthGateway';
import { MemorySecureSessionStorage } from '../data/auth/memorySecureSessionStorage';
import { createInMemoryRepositories } from '../data/repositories/inMemoryRepositories';

const LOCAL_PREVIEW_USER_ID = 'local-preview-user';

export function createAppServices() {
  const authRemote = new InMemoryAuthRemoteGateway();
  const authStorage = new MemorySecureSessionStorage();
  const repositories = createInMemoryRepositories();
  const authDependencies = {
    remote: authRemote,
    storage: authStorage,
  };

  return {
    auth: {
      login: (email: string, password: string) =>
        login({ email, password }, authDependencies),
      logout: () => logout(authDependencies),
      register: (displayName: string, email: string, password: string) =>
        registerAccount({ displayName, email, password }, authDependencies),
      restoreSession: () => restoreSession(authDependencies),
    },
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
