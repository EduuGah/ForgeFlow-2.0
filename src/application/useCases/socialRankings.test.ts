import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import { previewRankingActivities } from '../../data/seeds/rankingActivities';
import { previewSocialProfiles } from '../../data/seeds/socialProfiles';
import { getSocialRanking } from './socialRankings';

describe('social rankings', () => {
  it('includes only opted-in, non-blocked profiles and exposes basic data', async () => {
    const repositories = createInMemoryRepositories({
      socialProfiles: previewSocialProfiles,
      userBlocks: [
        {
          blockedUserId: 'preview-beatriz',
          blockerUserId: 'local-preview-user',
          createdAt: '2026-09-30T12:00:00.000Z',
          deletedAt: null,
          id: 'block-1',
          updatedAt: '2026-09-30T12:00:00.000Z',
        },
      ],
    });
    const ranking = await getSocialRanking(
      { metric: 'volume', period: '30_days', userId: 'local-preview-user' },
      {
        clock: () => '2026-09-30T23:59:59.999Z',
        previewActivities: previewRankingActivities,
        repositories,
      },
    );

    expect(ranking.optedIn).toBe(false);
    expect(ranking.entries.map((entry) => entry.profile.userId)).toEqual([
      'preview-rafael',
      'preview-marina',
    ]);
    expect(ranking.entries[0].profile).toEqual({
      avatarUrl: null,
      displayName: 'Rafael Santos',
      userId: 'preview-rafael',
      username: 'rafa.santos',
    });
  });
});
