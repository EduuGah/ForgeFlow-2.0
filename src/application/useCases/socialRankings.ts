import type { RepositoryProvider } from '../ports/repositories';
import { getTrainingAnalytics } from './trainingAnalytics';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SocialProfile } from '../../domain/social/entities';
import {
  calculateRankingValue,
  getRankingDateRange,
  type RankingActivity,
  type RankingMetric,
  type RankingPeriod,
} from '../../domain/social/rankings';

export type RankingEntry = {
  isCurrentUser: boolean;
  position: number;
  profile: Pick<
    SocialProfile,
    'avatarUrl' | 'displayName' | 'userId' | 'username'
  >;
  value: number;
};

type RankingDependencies = {
  clock: () => ISODateTimeString;
  previewActivities?: RankingActivity[];
  repositories: RepositoryProvider;
};

export async function getSocialRanking(
  input: { metric: RankingMetric; period: RankingPeriod; userId: EntityId },
  dependencies: RankingDependencies,
) {
  const range = getRankingDateRange(input.period, dependencies.clock());
  const [profiles, blocks, analytics] = await Promise.all([
    dependencies.repositories.socialProfiles.searchSocialProfiles({
      excludeUserId: '__none__',
      query: '',
    }),
    dependencies.repositories.userBlocks.listUserBlocks(input.userId),
    getTrainingAnalytics(
      { period: range, userId: input.userId },
      dependencies.repositories,
    ),
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
  const ownActivities: RankingActivity[] = analytics.timeline.map((point) => ({
    completedAt: `${point.date}T12:00:00.000Z`,
    userId: input.userId,
    volume: point.volume,
    workoutCount: point.workoutCount,
  }));
  const activities = [
    ...(dependencies.previewActivities ?? []),
    ...ownActivities,
  ];
  const eligible = profiles.filter(
    (profile) => profile.rankingOptIn && !blockedIds.has(profile.userId),
  );
  const entries = eligible
    .map((profile) => ({
      isCurrentUser: profile.userId === input.userId,
      profile: publicProfile(profile),
      value: calculateRankingValue(
        input.metric,
        activities.filter((item) => item.userId === profile.userId),
        range,
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

  const ownProfile = profiles.find(
    (profile) => profile.userId === input.userId,
  );
  if (!ownProfile) throw new Error('Perfil social nao encontrado.');
  return {
    entries,
    metric: input.metric,
    optedIn: ownProfile.rankingOptIn,
    period: input.period,
    range,
  };
}

function publicProfile(profile: SocialProfile): RankingEntry['profile'] {
  return {
    avatarUrl: profile.avatarUrl,
    displayName: profile.displayName,
    userId: profile.userId,
    username: profile.username,
  };
}
