import * as SecureStore from 'expo-secure-store';

import type { SecureSessionStorage } from '../../application/ports/auth';
import type { AuthSession } from '../../domain/auth/entities';

const SESSION_KEY = 'forgeflow.auth.session.v1';

export class ExpoSecureSessionStorage implements SecureSessionStorage {
  async clearSession() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }

  async readSession() {
    const value = await SecureStore.getItemAsync(SESSION_KEY);
    if (!value) return null;

    try {
      const session: unknown = JSON.parse(value);
      if (isAuthSession(session)) return session;
    } catch {
      // Corrupt or obsolete session data must never escape the storage boundary.
    }

    await this.clearSession();
    return null;
  }

  async writeSession(session: AuthSession) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      keychainService: 'com.forgeflow.auth',
    });
  }
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  const user = session.user;

  return Boolean(
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === 'string' &&
    session.refreshToken.length > 0 &&
    typeof session.expiresAt === 'string' &&
    Number.isFinite(Date.parse(session.expiresAt)) &&
    user &&
    typeof user.id === 'string' &&
    user.id.length > 0 &&
    typeof user.displayName === 'string' &&
    typeof user.email === 'string',
  );
}
