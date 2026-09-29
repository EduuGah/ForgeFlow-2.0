import type { EntityId, ISODateTimeString } from '../shared/types';

export type FriendshipStatus = 'accepted' | 'declined' | 'pending' | 'removed';

export type SocialProfile = {
  avatarUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  sharesWorkoutStats: boolean;
  updatedAt: ISODateTimeString;
  userId: EntityId;
  username: string;
};

export type Friendship = {
  addresseeUserId: EntityId;
  createdAt: ISODateTimeString;
  id: EntityId;
  requesterUserId: EntityId;
  status: FriendshipStatus;
  updatedAt: ISODateTimeString;
};

export type UserBlock = {
  blockedUserId: EntityId;
  blockerUserId: EntityId;
  createdAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
  id: EntityId;
  updatedAt: ISODateTimeString;
};
