import type { RepositoryProvider } from '../ports/repositories';
import type {
  Challenge,
  ChallengeParticipant,
  SocialProfile,
} from '../../domain/social/entities';
import {
  calculateRankingValue,
  type RankingActivity,
  type RankingMetric,
} from '../../domain/social/rankings';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import { getTrainingAnalytics } from './trainingAnalytics';

export class ChallengeError extends Error {
  constructor(
    readonly code:
      | 'already_joined'
      | 'forbidden'
      | 'invalid_input'
      | 'not_active'
      | 'not_found'
      | 'not_joined',
    message: string,
  ) {
    super(message);
    this.name = 'ChallengeError';
  }
}

export type ChallengeRankingEntry = {
  isCurrentUser: boolean;
  position: number;
  profile: Pick<
    SocialProfile,
    'avatarUrl' | 'displayName' | 'userId' | 'username'
  >;
  value: number;
};

export type ChallengeView = {
  canFinish: boolean;
  canJoin: boolean;
  canLeave: boolean;
  challenge: Challenge;
  effectiveStatus: Challenge['status'];
  isParticipant: boolean;
  ranking: ChallengeRankingEntry[];
};

type ChallengeDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  previewActivities?: RankingActivity[];
  repositories: RepositoryProvider;
};

export async function getChallengesOverview(
  userId: EntityId,
  dependencies: Omit<ChallengeDependencies, 'generateId'>,
) {
  const challenges =
    await dependencies.repositories.challenges.listChallenges();
  const now = dependencies.clock();
  const analytics = await getTrainingAnalytics(
    {
      period: {
        from: challenges.reduce(
          (earliest, challenge) =>
            challenge.startsAt < earliest ? challenge.startsAt : earliest,
          now,
        ),
        to: now,
      },
      userId,
    },
    dependencies.repositories,
  );
  const ownActivities: RankingActivity[] = analytics.timeline.map((point) => ({
    completedAt: `${point.date}T12:00:00.000Z`,
    userId,
    volume: point.volume,
    workoutCount: point.workoutCount,
  }));
  const activities = [
    ...(dependencies.previewActivities ?? []),
    ...ownActivities,
  ];
  const views = await Promise.all(
    challenges.map((challenge) =>
      toChallengeView(challenge, userId, activities, dependencies),
    ),
  );

  return views.sort((left, right) => {
    const leftActive = left.effectiveStatus === 'active' ? 1 : 0;
    const rightActive = right.effectiveStatus === 'active' ? 1 : 0;
    return (
      rightActive - leftActive ||
      right.challenge.createdAt.localeCompare(left.challenge.createdAt)
    );
  });
}

export async function createChallenge(
  input: {
    creatorUserId: EntityId;
    durationDays: number;
    metric: RankingMetric;
    title: string;
  },
  dependencies: ChallengeDependencies,
) {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 60) {
    throw new ChallengeError(
      'invalid_input',
      'Use um titulo entre 3 e 60 caracteres.',
    );
  }
  if (![7, 30, 90].includes(input.durationDays)) {
    throw new ChallengeError('invalid_input', 'Escolha uma duracao valida.');
  }
  const now = dependencies.clock();
  const challenge: Challenge = {
    createdAt: now,
    creatorUserId: input.creatorUserId,
    endsAt: new Date(
      Date.parse(now) + input.durationDays * 86_400_000,
    ).toISOString(),
    id: dependencies.generateId(),
    metric: input.metric,
    startsAt: now,
    status: 'active',
    title,
    updatedAt: now,
  };
  const participant: ChallengeParticipant = {
    challengeId: challenge.id,
    id: dependencies.generateId(),
    joinedAt: now,
    leftAt: null,
    status: 'active',
    updatedAt: now,
    userId: input.creatorUserId,
  };

  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.challenges.saveChallenge(challenge);
    await dependencies.repositories.challengeParticipants.saveChallengeParticipant(
      participant,
    );
    await enqueue('challenge', challenge.id, challenge, dependencies);
    await enqueue(
      'challenge_participant',
      participant.id,
      participant,
      dependencies,
    );
  });
  return challenge;
}

export async function joinChallenge(
  input: { challengeId: EntityId; userId: EntityId },
  dependencies: ChallengeDependencies,
) {
  const challenge = await requireActiveChallenge(
    input.challengeId,
    dependencies,
  );
  const existing =
    await dependencies.repositories.challengeParticipants.findChallengeParticipant(
      challenge.id,
      input.userId,
    );
  if (existing?.status === 'active') {
    throw new ChallengeError(
      'already_joined',
      'Voce ja participa deste desafio.',
    );
  }
  const now = dependencies.clock();
  const participant: ChallengeParticipant = {
    challengeId: challenge.id,
    id: existing?.id ?? dependencies.generateId(),
    joinedAt: existing?.joinedAt ?? now,
    leftAt: null,
    status: 'active',
    updatedAt: now,
    userId: input.userId,
  };
  await saveParticipant(participant, dependencies);
  return participant;
}

export async function leaveChallenge(
  input: { challengeId: EntityId; userId: EntityId },
  dependencies: ChallengeDependencies,
) {
  await requireActiveChallenge(input.challengeId, dependencies);
  const participant =
    await dependencies.repositories.challengeParticipants.findChallengeParticipant(
      input.challengeId,
      input.userId,
    );
  if (!participant || participant.status !== 'active') {
    throw new ChallengeError('not_joined', 'Voce nao participa deste desafio.');
  }
  const now = dependencies.clock();
  const next: ChallengeParticipant = {
    ...participant,
    leftAt: now,
    status: 'left',
    updatedAt: now,
  };
  await saveParticipant(next, dependencies);
  return next;
}

export async function finishChallenge(
  input: { challengeId: EntityId; userId: EntityId },
  dependencies: ChallengeDependencies,
) {
  const challenge = await requireChallenge(input.challengeId, dependencies);
  if (challenge.creatorUserId !== input.userId) {
    throw new ChallengeError(
      'forbidden',
      'Somente quem criou pode finalizar o desafio.',
    );
  }
  if (challenge.status !== 'active') {
    throw new ChallengeError('not_active', 'Este desafio ja foi encerrado.');
  }
  const next: Challenge = {
    ...challenge,
    status: 'finished',
    updatedAt: dependencies.clock(),
  };
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.challenges.saveChallenge(next);
    await enqueue('challenge', next.id, next, dependencies);
  });
  return next;
}

async function toChallengeView(
  challenge: Challenge,
  userId: EntityId,
  activities: RankingActivity[],
  dependencies: Omit<ChallengeDependencies, 'generateId'>,
): Promise<ChallengeView> {
  const participants = (
    await dependencies.repositories.challengeParticipants.listChallengeParticipants(
      challenge.id,
    )
  ).filter((item) => item.status === 'active');
  const profiles = await Promise.all(
    participants.map((participant) =>
      dependencies.repositories.socialProfiles.findSocialProfileByUserId(
        participant.userId,
      ),
    ),
  );
  const effectiveStatus =
    challenge.status === 'active' &&
    Date.parse(dependencies.clock()) >= Date.parse(challenge.endsAt)
      ? 'finished'
      : challenge.status;
  const ranking = profiles
    .filter((profile): profile is SocialProfile => profile !== null)
    .map((profile) => ({
      isCurrentUser: profile.userId === userId,
      profile: publicProfile(profile),
      value: calculateRankingValue(
        challenge.metric,
        activities.filter((activity) => activity.userId === profile.userId),
        { from: challenge.startsAt, to: challenge.endsAt },
      ),
    }))
    .sort(
      (left, right) =>
        right.value - left.value ||
        left.profile.displayName.localeCompare(
          right.profile.displayName,
          'pt-BR',
        ),
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
  const isParticipant = participants.some((item) => item.userId === userId);

  return {
    canFinish:
      challenge.creatorUserId === userId && effectiveStatus === 'active',
    canJoin: !isParticipant && effectiveStatus === 'active',
    canLeave: isParticipant && effectiveStatus === 'active',
    challenge,
    effectiveStatus,
    isParticipant,
    ranking,
  };
}

async function requireActiveChallenge(
  challengeId: EntityId,
  dependencies: ChallengeDependencies,
) {
  const challenge = await requireChallenge(challengeId, dependencies);
  if (
    challenge.status !== 'active' ||
    Date.parse(dependencies.clock()) >= Date.parse(challenge.endsAt)
  ) {
    throw new ChallengeError('not_active', 'Este desafio ja foi encerrado.');
  }
  return challenge;
}

async function requireChallenge(
  challengeId: EntityId,
  dependencies: Pick<ChallengeDependencies, 'repositories'>,
) {
  const challenge =
    await dependencies.repositories.challenges.findChallengeById(challengeId);
  if (!challenge) {
    throw new ChallengeError('not_found', 'Desafio nao encontrado.');
  }
  return challenge;
}

async function saveParticipant(
  participant: ChallengeParticipant,
  dependencies: ChallengeDependencies,
) {
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.challengeParticipants.saveChallengeParticipant(
      participant,
    );
    await enqueue(
      'challenge_participant',
      participant.id,
      participant,
      dependencies,
    );
  });
}

async function enqueue(
  entityType: 'challenge' | 'challenge_participant',
  entityId: EntityId,
  payload: Challenge | ChallengeParticipant,
  dependencies: ChallengeDependencies,
) {
  const operation: SyncOperation = {
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
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}

function publicProfile(
  profile: SocialProfile,
): ChallengeRankingEntry['profile'] {
  return {
    avatarUrl: profile.avatarUrl,
    displayName: profile.displayName,
    userId: profile.userId,
    username: profile.username,
  };
}
