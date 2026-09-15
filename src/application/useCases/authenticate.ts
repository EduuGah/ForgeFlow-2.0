import type { AuthSession } from '../../domain/auth/entities';
import type {
  AuthRemoteGateway,
  LoginRequest,
  RegisterAccountRequest,
  SecureSessionStorage,
} from '../ports/auth';

export type AuthDependencies = {
  remote: AuthRemoteGateway;
  storage: SecureSessionStorage;
};

export class AuthenticationInputError extends Error {
  readonly field: 'displayName' | 'email' | 'password';

  constructor(field: AuthenticationInputError['field'], message: string) {
    super(message);
    this.name = 'AuthenticationInputError';
    this.field = field;
  }
}

export async function registerAccount(
  request: RegisterAccountRequest,
  dependencies: AuthDependencies,
) {
  validateDisplayName(request.displayName);
  validateEmail(request.email);
  validatePassword(request.password);

  const session = await dependencies.remote.register({
    ...request,
    displayName: request.displayName.trim(),
    email: normalizeEmail(request.email),
  });

  await dependencies.storage.writeSession(session);

  return session;
}

export async function login(
  request: LoginRequest,
  dependencies: AuthDependencies,
) {
  validateEmail(request.email);

  if (!request.password) {
    throw new AuthenticationInputError('password', 'Password is required.');
  }

  const session = await dependencies.remote.login({
    ...request,
    email: normalizeEmail(request.email),
  });

  await dependencies.storage.writeSession(session);

  return session;
}

export async function restoreSession(dependencies: AuthDependencies) {
  const session = await dependencies.storage.readSession();

  if (!session) {
    return null;
  }

  if (isExpired(session)) {
    const refreshed = await dependencies.remote.refreshSession(session);
    await dependencies.storage.writeSession(refreshed);

    return refreshed;
  }

  return session;
}

export async function logout(dependencies: AuthDependencies) {
  const session = await dependencies.storage.readSession();

  if (session) {
    await dependencies.remote.logout(session);
  }

  await dependencies.storage.clearSession();
}

function validateDisplayName(value: string) {
  if (value.trim().length < 2) {
    throw new AuthenticationInputError(
      'displayName',
      'Display name must have at least 2 characters.',
    );
  }
}

function validateEmail(value: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new AuthenticationInputError('email', 'Enter a valid email address.');
  }
}

function validatePassword(value: string) {
  if (value.length < 8) {
    throw new AuthenticationInputError(
      'password',
      'Password must have at least 8 characters.',
    );
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isExpired(session: AuthSession) {
  return Date.parse(session.expiresAt) <= Date.now();
}
