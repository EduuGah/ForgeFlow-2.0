import type { EntityId, ISODateTimeString } from '../shared/types';

export type AuthUser = {
  displayName: string;
  email: string;
  id: EntityId;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: ISODateTimeString;
  refreshToken: string;
  user: AuthUser;
};

export type AuthenticatedAccount = {
  session: AuthSession;
  user: AuthUser;
};
