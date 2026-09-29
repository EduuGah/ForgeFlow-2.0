import type {
  Friendship,
  SocialProfile,
  UserBlock,
} from '../../domain/social/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type { RepositoryProvider } from '../ports/repositories';

export class FriendsError extends Error {
  constructor(
    readonly code:
      | 'already_friends'
      | 'blocked'
      | 'forbidden'
      | 'invalid_request'
      | 'not_found'
      | 'pending_request'
      | 'self_action',
    message: string,
  ) {
    super(message);
    this.name = 'FriendsError';
  }
}

export type FriendProfileView = {
  canViewWorkoutStats: boolean;
  profile: SocialProfile;
};

export type FriendsOverview = {
  blocked: FriendProfileView[];
  friends: Array<FriendProfileView & { friendshipId: EntityId }>;
  incomingRequests: Array<FriendProfileView & { friendshipId: EntityId }>;
  outgoingRequests: Array<FriendProfileView & { friendshipId: EntityId }>;
  profile: SocialProfile;
};

export type UserSearchResult = FriendProfileView & {
  friendshipId: EntityId | null;
  relationship: 'accepted' | 'incoming' | 'none' | 'outgoing';
};

type FriendsDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: RepositoryProvider;
};

export async function getFriendsOverview(
  userId: EntityId,
  repositories: RepositoryProvider,
): Promise<FriendsOverview> {
  const [profile, friendships, blocks] = await Promise.all([
    requireProfile(userId, repositories),
    repositories.friendships.listFriendships({ userId }),
    repositories.userBlocks.listUserBlocks(userId),
  ]);
  const activeOwnBlocks = blocks.filter(
    (block) => block.blockerUserId === userId && block.deletedAt === null,
  );

  const friends = await mapRelationships(
    friendships.filter((item) => item.status === 'accepted'),
    userId,
    repositories,
  );
  const incomingRequests = await mapRelationships(
    friendships.filter(
      (item) => item.status === 'pending' && item.addresseeUserId === userId,
    ),
    userId,
    repositories,
  );
  const outgoingRequests = await mapRelationships(
    friendships.filter(
      (item) => item.status === 'pending' && item.requesterUserId === userId,
    ),
    userId,
    repositories,
  );
  const blocked = (
    await Promise.all(
      activeOwnBlocks.map((block) =>
        repositories.socialProfiles.findSocialProfileByUserId(
          block.blockedUserId,
        ),
      ),
    )
  )
    .filter((item): item is SocialProfile => item !== null)
    .map((item) => ({ canViewWorkoutStats: false, profile: item }));

  return { blocked, friends, incomingRequests, outgoingRequests, profile };
}

export async function searchUsers(
  input: { query: string; userId: EntityId },
  repositories: RepositoryProvider,
): Promise<UserSearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2) return [];

  const [profiles, friendships, blocks] = await Promise.all([
    repositories.socialProfiles.searchSocialProfiles({
      excludeUserId: input.userId,
      query,
    }),
    repositories.friendships.listFriendships({ userId: input.userId }),
    repositories.userBlocks.listUserBlocks(input.userId),
  ]);
  const blockedIds = new Set(
    blocks
      .filter((block) => block.deletedAt === null)
      .map((block) =>
        block.blockerUserId === input.userId
          ? block.blockedUserId
          : block.blockerUserId,
      ),
  );

  return profiles
    .filter((profile) => !blockedIds.has(profile.userId))
    .map((profile) => {
      const friendship = friendships.find(
        (item) =>
          item.requesterUserId === profile.userId ||
          item.addresseeUserId === profile.userId,
      );
      const relationship = relationshipFor(friendship, input.userId);
      return {
        canViewWorkoutStats:
          profile.sharesWorkoutStats &&
          (!profile.isPrivate || relationship === 'accepted'),
        friendshipId: friendship?.id ?? null,
        profile,
        relationship,
      };
    });
}

export async function sendFriendRequest(
  input: { addresseeUserId: EntityId; requesterUserId: EntityId },
  dependencies: FriendsDependencies,
) {
  if (input.addresseeUserId === input.requesterUserId) {
    throw new FriendsError(
      'self_action',
      'Voce nao pode adicionar a si mesmo.',
    );
  }
  await requireProfile(input.addresseeUserId, dependencies.repositories);
  await assertNotBlocked(
    input.requesterUserId,
    input.addresseeUserId,
    dependencies.repositories,
  );
  const existing =
    await dependencies.repositories.friendships.findFriendshipBetween(
      input.requesterUserId,
      input.addresseeUserId,
    );
  if (existing?.status === 'accepted') {
    throw new FriendsError('already_friends', 'Esta amizade ja foi aceita.');
  }
  if (existing?.status === 'pending') {
    throw new FriendsError('pending_request', 'Ja existe um pedido pendente.');
  }

  const now = dependencies.clock();
  const friendship: Friendship = {
    addresseeUserId: input.addresseeUserId,
    createdAt: existing?.createdAt ?? now,
    id: existing?.id ?? dependencies.generateId(),
    requesterUserId: input.requesterUserId,
    status: 'pending',
    updatedAt: now,
  };
  await saveFriendshipWithSync(friendship, dependencies);
  return friendship;
}

export async function acceptFriendRequest(
  input: { friendshipId: EntityId; userId: EntityId },
  dependencies: FriendsDependencies,
) {
  return respondToFriendRequest(input, 'accepted', dependencies);
}

export async function declineFriendRequest(
  input: { friendshipId: EntityId; userId: EntityId },
  dependencies: FriendsDependencies,
) {
  return respondToFriendRequest(input, 'declined', dependencies);
}

export async function removeFriend(
  input: { friendshipId: EntityId; userId: EntityId },
  dependencies: FriendsDependencies,
) {
  const friendship = await requireFriendship(
    input.friendshipId,
    dependencies.repositories,
  );
  assertParticipant(friendship, input.userId);
  if (friendship.status !== 'accepted') {
    throw new FriendsError('invalid_request', 'A amizade nao esta ativa.');
  }
  const next = {
    ...friendship,
    status: 'removed' as const,
    updatedAt: dependencies.clock(),
  };
  await saveFriendshipWithSync(next, dependencies);
  return next;
}

export async function blockUser(
  input: { blockedUserId: EntityId; blockerUserId: EntityId },
  dependencies: FriendsDependencies,
) {
  if (input.blockedUserId === input.blockerUserId) {
    throw new FriendsError('self_action', 'Voce nao pode bloquear a si mesmo.');
  }
  await requireProfile(input.blockedUserId, dependencies.repositories);
  const existing = await dependencies.repositories.userBlocks.findUserBlock(
    input.blockerUserId,
    input.blockedUserId,
  );
  const now = dependencies.clock();
  const block: UserBlock = {
    blockedUserId: input.blockedUserId,
    blockerUserId: input.blockerUserId,
    createdAt: existing?.createdAt ?? now,
    deletedAt: null,
    id: existing?.id ?? dependencies.generateId(),
    updatedAt: now,
  };
  const friendship =
    await dependencies.repositories.friendships.findFriendshipBetween(
      input.blockerUserId,
      input.blockedUserId,
    );

  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.userBlocks.saveUserBlock(block);
    await dependencies.repositories.syncOperations.enqueueSyncOperation(
      createSyncOperation('user_block', block.id, block, dependencies),
    );
    if (friendship && friendship.status !== 'removed') {
      const removed = {
        ...friendship,
        status: 'removed' as const,
        updatedAt: now,
      };
      await dependencies.repositories.friendships.saveFriendship(removed);
      await dependencies.repositories.syncOperations.enqueueSyncOperation(
        createSyncOperation('friendship', removed.id, removed, dependencies),
      );
    }
  });
  return block;
}

export async function unblockUser(
  input: { blockedUserId: EntityId; blockerUserId: EntityId },
  dependencies: FriendsDependencies,
) {
  const existing = await dependencies.repositories.userBlocks.findUserBlock(
    input.blockerUserId,
    input.blockedUserId,
  );
  if (!existing || existing.deletedAt !== null) {
    throw new FriendsError('not_found', 'Bloqueio nao encontrado.');
  }
  const now = dependencies.clock();
  const next = { ...existing, deletedAt: now, updatedAt: now };
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.userBlocks.saveUserBlock(next);
    await dependencies.repositories.syncOperations.enqueueSyncOperation(
      createSyncOperation('user_block', next.id, next, dependencies),
    );
  });
  return next;
}

export async function updateSocialPrivacy(
  input: {
    isPrivate: boolean;
    sharesWorkoutStats: boolean;
    userId: EntityId;
  },
  dependencies: FriendsDependencies,
) {
  const profile = await requireProfile(input.userId, dependencies.repositories);
  const next = {
    ...profile,
    isPrivate: input.isPrivate,
    sharesWorkoutStats: input.sharesWorkoutStats,
    updatedAt: dependencies.clock(),
  };
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.socialProfiles.saveSocialProfile(next);
    await dependencies.repositories.syncOperations.enqueueSyncOperation(
      createSyncOperation('social_profile', next.userId, next, dependencies),
    );
  });
  return next;
}

async function respondToFriendRequest(
  input: { friendshipId: EntityId; userId: EntityId },
  status: 'accepted' | 'declined',
  dependencies: FriendsDependencies,
) {
  const friendship = await requireFriendship(
    input.friendshipId,
    dependencies.repositories,
  );
  if (friendship.addresseeUserId !== input.userId) {
    throw new FriendsError(
      'forbidden',
      'Somente quem recebeu o pedido pode responder.',
    );
  }
  if (friendship.status !== 'pending') {
    throw new FriendsError('invalid_request', 'O pedido nao esta pendente.');
  }
  await assertNotBlocked(
    friendship.requesterUserId,
    friendship.addresseeUserId,
    dependencies.repositories,
  );
  const next = { ...friendship, status, updatedAt: dependencies.clock() };
  await saveFriendshipWithSync(next, dependencies);
  return next;
}

async function saveFriendshipWithSync(
  friendship: Friendship,
  dependencies: FriendsDependencies,
) {
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.friendships.saveFriendship(friendship);
    await dependencies.repositories.syncOperations.enqueueSyncOperation(
      createSyncOperation(
        'friendship',
        friendship.id,
        friendship,
        dependencies,
      ),
    );
  });
}

function createSyncOperation(
  entityType: 'friendship' | 'social_profile' | 'user_block',
  entityId: EntityId,
  payload: Friendship | SocialProfile | UserBlock,
  dependencies: FriendsDependencies,
): SyncOperation {
  return {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId,
    entityType,
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: { ...payload },
    status: 'pending',
  };
}

async function assertNotBlocked(
  firstUserId: EntityId,
  secondUserId: EntityId,
  repositories: RepositoryProvider,
) {
  const [forward, reverse] = await Promise.all([
    repositories.userBlocks.findUserBlock(firstUserId, secondUserId),
    repositories.userBlocks.findUserBlock(secondUserId, firstUserId),
  ]);
  if (forward?.deletedAt === null || reverse?.deletedAt === null) {
    throw new FriendsError('blocked', 'Esta interacao nao esta disponivel.');
  }
}

function assertParticipant(friendship: Friendship, userId: EntityId) {
  if (
    friendship.requesterUserId !== userId &&
    friendship.addresseeUserId !== userId
  ) {
    throw new FriendsError('forbidden', 'Voce nao participa desta amizade.');
  }
}

async function requireFriendship(
  friendshipId: EntityId,
  repositories: RepositoryProvider,
) {
  const friendship =
    await repositories.friendships.findFriendshipById(friendshipId);
  if (!friendship) {
    throw new FriendsError('not_found', 'Pedido de amizade nao encontrado.');
  }
  return friendship;
}

async function requireProfile(
  userId: EntityId,
  repositories: RepositoryProvider,
) {
  const profile =
    await repositories.socialProfiles.findSocialProfileByUserId(userId);
  if (!profile) {
    throw new FriendsError('not_found', 'Perfil nao encontrado.');
  }
  return profile;
}

async function mapRelationships(
  friendships: Friendship[],
  currentUserId: EntityId,
  repositories: RepositoryProvider,
) {
  const views = await Promise.all(
    friendships.map(async (friendship) => {
      const otherUserId =
        friendship.requesterUserId === currentUserId
          ? friendship.addresseeUserId
          : friendship.requesterUserId;
      const profile =
        await repositories.socialProfiles.findSocialProfileByUserId(
          otherUserId,
        );
      if (!profile) return null;
      return {
        canViewWorkoutStats:
          profile.sharesWorkoutStats &&
          (!profile.isPrivate || friendship.status === 'accepted'),
        friendshipId: friendship.id,
        profile,
      };
    }),
  );
  return views.filter(
    (item): item is NonNullable<typeof item> => item !== null,
  );
}

function relationshipFor(
  friendship: Friendship | undefined,
  currentUserId: EntityId,
): UserSearchResult['relationship'] {
  if (!friendship || ['declined', 'removed'].includes(friendship.status)) {
    return 'none';
  }
  if (friendship.status === 'accepted') return 'accepted';
  return friendship.requesterUserId === currentUserId ? 'outgoing' : 'incoming';
}
