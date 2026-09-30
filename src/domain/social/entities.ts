import type { EntityId, ISODateTimeString } from '../shared/types';
import type { RankingMetric } from './rankings';

export type ChallengeStatus = 'active' | 'cancelled' | 'finished';
export type ChallengeParticipantStatus = 'active' | 'left';

export type Challenge = {
  createdAt: ISODateTimeString;
  creatorUserId: EntityId;
  endsAt: ISODateTimeString;
  id: EntityId;
  metric: RankingMetric;
  startsAt: ISODateTimeString;
  status: ChallengeStatus;
  title: string;
  updatedAt: ISODateTimeString;
};

export type ChallengeParticipant = {
  challengeId: EntityId;
  id: EntityId;
  joinedAt: ISODateTimeString;
  leftAt: ISODateTimeString | null;
  status: ChallengeParticipantStatus;
  updatedAt: ISODateTimeString;
  userId: EntityId;
};

export type FriendshipStatus = 'accepted' | 'declined' | 'pending' | 'removed';

export type SocialProfile = {
  avatarUrl: string | null;
  bio: string | null;
  displayName: string;
  isPrivate: boolean;
  rankingOptIn: boolean;
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
