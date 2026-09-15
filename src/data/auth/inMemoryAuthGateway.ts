import type { AuthSession, AuthUser } from '../../domain/auth/entities';
import type {
  AuthRemoteGateway,
  LoginRequest,
  RegisterAccountRequest,
} from '../../application/ports/auth';

type StoredAccount = {
  password: string;
  user: AuthUser;
};

export class InMemoryAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InMemoryAuthenticationError';
  }
}

export class InMemoryAuthRemoteGateway implements AuthRemoteGateway {
  private accountsByEmail = new Map<string, StoredAccount>();

  async login(request: LoginRequest) {
    const account = this.accountsByEmail.get(request.email);

    if (!account || account.password !== request.password) {
      throw new InMemoryAuthenticationError('Invalid email or password.');
    }

    return buildSession(account.user);
  }

  async logout() {
    return undefined;
  }

  async refreshSession(session: AuthSession) {
    return buildSession(session.user);
  }

  async register(request: RegisterAccountRequest) {
    if (this.accountsByEmail.has(request.email)) {
      throw new InMemoryAuthenticationError('Email is already registered.');
    }

    const user: AuthUser = {
      displayName: request.displayName,
      email: request.email,
      id: `preview-${request.email}`,
    };

    this.accountsByEmail.set(request.email, {
      password: request.password,
      user,
    });

    return buildSession(user);
  }
}

function buildSession(user: AuthUser): AuthSession {
  return {
    accessToken: `preview-access-${user.id}`,
    expiresAt: '2999-01-01T00:00:00.000Z',
    refreshToken: `preview-refresh-${user.id}`,
    user,
  };
}
