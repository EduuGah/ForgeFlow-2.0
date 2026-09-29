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
  const displayName = value.trim();
  if (displayName.length < 2 || displayName.length > 80) {
    throw new AuthenticationInputError(
      'displayName',
      'Display name must have between 2 and 80 characters.',
    );
  }
}

function validateEmail(value: string) {
  const email = value.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthenticationInputError('email', 'Enter a valid email address.');
  }
}

function validatePassword(value: string) {
  if (
    value.length < 8 ||
    value.length > 128 ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new AuthenticationInputError(
      'password',
      'Password must have between 8 and 128 characters and no control characters.',
    );
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

function isExpired(session: AuthSession) {
  return Date.parse(session.expiresAt) <= Date.now();
}
