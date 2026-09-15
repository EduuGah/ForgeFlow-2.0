import type { AuthSession } from '../../domain/auth/entities';

export type RegisterAccountRequest = {
  displayName: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export interface AuthRemoteGateway {
  login(request: LoginRequest): Promise<AuthSession>;
  logout(session: AuthSession): Promise<void>;
  refreshSession(session: AuthSession): Promise<AuthSession>;
  register(request: RegisterAccountRequest): Promise<AuthSession>;
}

export interface SecureSessionStorage {
  clearSession(): Promise<void>;
  readSession(): Promise<AuthSession | null>;
  writeSession(session: AuthSession): Promise<void>;
}
