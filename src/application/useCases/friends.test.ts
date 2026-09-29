import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { SocialProfile } from '../../domain/social/entities';
import {
  acceptFriendRequest,
  blockUser,
  FriendsError,
  getFriendsOverview,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from './friends';

const now = '2026-09-29T12:00:00.000Z';

describe('friends', () => {
  it('searches only basic name fields and respects private workout data', async () => {
    const dependencies = createDependencies();

    await expect(
      searchUsers(
        { query: 'private', userId: 'user-1' },
        dependencies.repositories,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        canViewWorkoutStats: false,
        profile: expect.objectContaining({ userId: 'user-2' }),
        relationship: 'none',
      }),
    ]);
    await expect(
      searchUsers(
        { query: 'hidden@example.com', userId: 'user-1' },
        dependencies.repositories,
      ),
    ).resolves.toEqual([]);
  });

  it('persists request acceptance and queues both offline mutations', async () => {
    const dependencies = createDependencies();
    const request = await sendFriendRequest(
      { addresseeUserId: 'user-2', requesterUserId: 'user-1' },
      dependencies,
    );
    await acceptFriendRequest(
      { friendshipId: request.id, userId: 'user-2' },
      dependencies,
    );

    await expect(
      getFriendsOverview('user-1', dependencies.repositories),
    ).resolves.toMatchObject({
      friends: [
        {
          canViewWorkoutStats: true,
          friendshipId: request.id,
          profile: { userId: 'user-2' },
        },
      ],
    });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(2);
  });

  it('rejects third-party acceptance and friendship removal', async () => {
    const dependencies = createDependencies();
    const request = await sendFriendRequest(
      { addresseeUserId: 'user-2', requesterUserId: 'user-1' },
      dependencies,
    );

    await expect(
      acceptFriendRequest(
        { friendshipId: request.id, userId: 'user-3' },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<FriendsError>>({ code: 'forbidden' });
    await acceptFriendRequest(
      { friendshipId: request.id, userId: 'user-2' },
      dependencies,
    );
    await expect(
      removeFriend(
        { friendshipId: request.id, userId: 'user-3' },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<FriendsError>>({ code: 'forbidden' });
  });

  it('removes an active friendship when either participant blocks the other', async () => {
    const dependencies = createDependencies();
    const request = await sendFriendRequest(
      { addresseeUserId: 'user-2', requesterUserId: 'user-1' },
      dependencies,
    );
    await acceptFriendRequest(
      { friendshipId: request.id, userId: 'user-2' },
      dependencies,
    );
    await blockUser(
      { blockedUserId: 'user-2', blockerUserId: 'user-1' },
      dependencies,
    );

    await expect(
      dependencies.repositories.friendships.findFriendshipById(request.id),
    ).resolves.toMatchObject({ status: 'removed' });
    await expect(
      searchUsers(
        { query: 'private', userId: 'user-1' },
        dependencies.repositories,
      ),
    ).resolves.toEqual([]);
    await expect(
      sendFriendRequest(
        { addresseeUserId: 'user-1', requesterUserId: 'user-2' },
        dependencies,
      ),
    ).rejects.toMatchObject<Partial<FriendsError>>({ code: 'blocked' });
  });
});

function createDependencies() {
  let id = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++id}`,
    repositories: createInMemoryRepositories({ socialProfiles: profiles }),
  };
}

const profiles: SocialProfile[] = [
  createProfile('user-1', 'Owner', 'owner', false, true),
  createProfile('user-2', 'Private Athlete', 'private.athlete', true, true),
  createProfile('user-3', 'Third Person', 'third.person', true, false),
];

function createProfile(
  userId: string,
  displayName: string,
  username: string,
  isPrivate: boolean,
  sharesWorkoutStats: boolean,
): SocialProfile {
  return {
    avatarUrl: null,
    bio: null,
    displayName,
    isPrivate,
    sharesWorkoutStats,
    updatedAt: now,
    userId,
    username,
  };
}
