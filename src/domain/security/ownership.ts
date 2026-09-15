import type { EntityId } from '../shared/types';
import type { SyncEntityType } from '../sync/entities';

export type AuthenticatedPrincipal = {
  userId: EntityId;
};

export type ExistingOwnedRecord = {
  ownerUserId: EntityId | null;
};

export type ServerMutationAuthorizationInput = {
  entityType: SyncEntityType;
  existingRecord?: ExistingOwnedRecord | null;
  payload: Record<string, unknown>;
  principal: AuthenticatedPrincipal | null;
};

export type AuthorizedServerMutation = {
  ownerUserId: EntityId;
  payload: Record<string, unknown>;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication is required.');
    this.name = 'AuthenticationRequiredError';
  }
}

export class OwnershipViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OwnershipViolationError';
  }
}

const USER_OWNERSHIP_FIELDS = [
  'userId',
  'user_id',
  'ownerUserId',
  'owner_user_id',
];

export function authorizeServerMutation(
  input: ServerMutationAuthorizationInput,
): AuthorizedServerMutation {
  const principal = requireAuthenticatedPrincipal(input.principal);
  assertExistingRecordOwnership(principal, input.existingRecord);
  assertPayloadDoesNotClaimAnotherUser(principal, input.payload);

  return {
    ownerUserId: principal.userId,
    payload: stripClientOwnershipFields(input.payload),
  };
}

export function requireAuthenticatedPrincipal(
  principal: AuthenticatedPrincipal | null,
) {
  if (!principal) {
    throw new AuthenticationRequiredError();
  }

  return principal;
}

function assertExistingRecordOwnership(
  principal: AuthenticatedPrincipal,
  record: ExistingOwnedRecord | null | undefined,
) {
  if (!record) {
    return;
  }

  if (record.ownerUserId === principal.userId) {
    return;
  }

  throw new OwnershipViolationError(
    'Authenticated user does not own this record.',
  );
}

function assertPayloadDoesNotClaimAnotherUser(
  principal: AuthenticatedPrincipal,
  payload: Record<string, unknown>,
) {
  for (const field of USER_OWNERSHIP_FIELDS) {
    const value = payload[field];

    if (typeof value === 'string' && value !== principal.userId) {
      throw new OwnershipViolationError(
        `Client payload cannot claim ${field} for another user.`,
      );
    }
  }
}

function stripClientOwnershipFields(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([key]) => !USER_OWNERSHIP_FIELDS.includes(key),
    ),
  );
}
