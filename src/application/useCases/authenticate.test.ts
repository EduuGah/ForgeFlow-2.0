import type { AuthSession } from '../../domain/auth/entities';
import type {
  AuthRemoteGateway,
  LoginRequest,
  RegisterAccountRequest,
  SecureSessionStorage,
} from '../ports/auth';
import {
  AuthenticationInputError,
  login,
  logout,
  registerAccount,
  restoreSession,
} from './authenticate';

const activeSession = buildSession({
  accessToken: 'access-token',
  expiresAt: '2999-01-01T00:00:00.000Z',
});

describe('authentication use cases', () => {
  it('registers an account and persists the returned session in secure storage', async () => {
    const dependencies = createAuthDependencies({ session: activeSession });

    const session = await registerAccount(
      {
        displayName: '  Carlos  ',
        email: 'USER@Example.COM ',
        password: 'strong-password',
      },
      dependencies,
    );

    expect(dependencies.remote.registerRequests).toStrictEqual([
      {
        displayName: 'Carlos',
        email: 'user@example.com',
        password: 'strong-password',
      },
    ]);
    expect(dependencies.storage.session).toStrictEqual(activeSession);
    expect(session).toBe(activeSession);
  });

  it('logs in with normalized email and persists the session', async () => {
    const dependencies = createAuthDependencies({ session: activeSession });

    await login(
      {
        email: 'USER@Example.COM ',
        password: 'strong-password',
      },
      dependencies,
    );

    expect(dependencies.remote.loginRequests).toStrictEqual([
      {
        email: 'user@example.com',
        password: 'strong-password',
      },
    ]);
    expect(dependencies.storage.session).toStrictEqual(activeSession);
  });

  it('rejects weak registration input before calling the remote gateway', async () => {
    const dependencies = createAuthDependencies({ session: activeSession });

    await expect(
      registerAccount(
        {
          displayName: 'C',
          email: 'not-an-email',
          password: 'short',
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(AuthenticationInputError);

    expect(dependencies.remote.registerRequests).toStrictEqual([]);
    expect(dependencies.storage.session).toBeNull();
  });

  it('restores a valid persisted session without refreshing it', async () => {
    const dependencies = createAuthDependencies({
      initialStoredSession: activeSession,
      session: buildSession({ accessToken: 'new-access-token' }),
    });

    await expect(restoreSession(dependencies)).resolves.toStrictEqual(
      activeSession,
    );

    expect(dependencies.remote.refreshRequests).toStrictEqual([]);
  });

  it('refreshes and persists an expired session during restore', async () => {
    const expiredSession = buildSession({
      accessToken: 'expired-access-token',
      expiresAt: '2000-01-01T00:00:00.000Z',
    });
    const refreshedSession = buildSession({
      accessToken: 'refreshed-access-token',
      expiresAt: '2999-01-01T00:00:00.000Z',
    });
    const dependencies = createAuthDependencies({
      initialStoredSession: expiredSession,
      session: refreshedSession,
    });

    await expect(restoreSession(dependencies)).resolves.toStrictEqual(
      refreshedSession,
    );

    expect(dependencies.remote.refreshRequests).toStrictEqual([expiredSession]);
    expect(dependencies.storage.session).toStrictEqual(refreshedSession);
  });

  it('logs out remotely and clears secure storage', async () => {
    const dependencies = createAuthDependencies({
      initialStoredSession: activeSession,
      session: activeSession,
    });

    await logout(dependencies);

    expect(dependencies.remote.logoutRequests).toStrictEqual([activeSession]);
    expect(dependencies.storage.session).toBeNull();
  });
});

function buildSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-token',
    expiresAt: '2999-01-01T00:00:00.000Z',
    refreshToken: 'refresh-token',
    user: {
      displayName: 'Carlos Eduardo',
      email: 'user@example.com',
      id: 'user-1',
    },
    ...overrides,
  };
}

function createAuthDependencies(options: {
  initialStoredSession?: AuthSession | null;
  session: AuthSession;
}) {
  const remote = new RecordingAuthRemoteGateway(options.session);
  const storage = new RecordingSecureSessionStorage(
    options.initialStoredSession ?? null,
  );

  return {
    remote,
    storage,
  };
}

class RecordingAuthRemoteGateway implements AuthRemoteGateway {
  readonly loginRequests: LoginRequest[] = [];
  readonly logoutRequests: AuthSession[] = [];
  readonly refreshRequests: AuthSession[] = [];
  readonly registerRequests: RegisterAccountRequest[] = [];

  constructor(private session: AuthSession) {}

  async login(request: LoginRequest) {
    this.loginRequests.push(request);

    return this.session;
  }

  async logout(session: AuthSession) {
    this.logoutRequests.push(session);
  }

  async refreshSession(session: AuthSession) {
    this.refreshRequests.push(session);

    return this.session;
  }

  async register(request: RegisterAccountRequest) {
    this.registerRequests.push(request);

    return this.session;
  }
}

class RecordingSecureSessionStorage implements SecureSessionStorage {
  constructor(public session: AuthSession | null) {}

  async clearSession() {
    this.session = null;
  }

  async readSession() {
    return this.session;
  }

  async writeSession(session: AuthSession) {
    this.session = session;
  }
}
