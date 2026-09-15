import type { SecureSessionStorage } from '../../application/ports/auth';
import type { AuthSession } from '../../domain/auth/entities';

export class MemorySecureSessionStorage implements SecureSessionStorage {
  private session: AuthSession | null = null;

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
