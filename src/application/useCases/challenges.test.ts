import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import { previewRankingActivities } from '../../data/seeds/rankingActivities';
import { previewSocialProfiles } from '../../data/seeds/socialProfiles';
import {
  createChallenge,
  finishChallenge,
  getChallengesOverview,
  joinChallenge,
  leaveChallenge,
} from './challenges';

const now = '2026-09-30T12:00:00.000Z';

describe('social challenges', () => {
  it('creates a challenge, enrolls its creator and queues both changes', async () => {
    const repositories = createInMemoryRepositories({
      socialProfiles: previewSocialProfiles,
    });
    const dependencies = createDependencies(repositories);

    const challenge = await createChallenge(
      {
        creatorUserId: 'local-preview-user',
        durationDays: 30,
        metric: 'volume',
        title: 'Volume do mes',
      },
      dependencies,
    );

    expect(challenge.endsAt).toBe('2026-10-30T12:00:00.000Z');
    expect(
      await repositories.challengeParticipants.findChallengeParticipant(
        challenge.id,
        'local-preview-user',
      ),
    ).toMatchObject({ status: 'active' });
    expect(await repositories.syncOperations.countPendingSyncOperations()).toBe(
      2,
    );
  });

  it('allows a participant to join and leave an active challenge', async () => {
    const repositories = createInMemoryRepositories({
      challenges: [challenge()],
      socialProfiles: previewSocialProfiles,
    });
    const dependencies = createDependencies(repositories);

    await joinChallenge(
      { challengeId: 'challenge-1', userId: 'preview-marina' },
      dependencies,
    );
    const left = await leaveChallenge(
      { challengeId: 'challenge-1', userId: 'preview-marina' },
      dependencies,
    );

    expect(left).toMatchObject({ leftAt: now, status: 'left' });
    expect(await repositories.syncOperations.countPendingSyncOperations()).toBe(
      2,
    );
  });

  it('calculates the challenge ranking from the shared ranking metrics', async () => {
    const repositories = createInMemoryRepositories({
      challengeParticipants: [
        participant('participant-marina', 'preview-marina'),
        participant('participant-rafael', 'preview-rafael'),
      ],
      challenges: [challenge()],
      socialProfiles: previewSocialProfiles,
    });

    const overview = await getChallengesOverview('local-preview-user', {
      clock: () => now,
      previewActivities: previewRankingActivities,
      repositories,
    });

    expect(overview[0].ranking.map((entry) => entry.profile.userId)).toEqual([
      'preview-marina',
      'preview-rafael',
    ]);
    expect(overview[0].ranking[0].value).toBe(6240);
  });

  it('only lets the creator finish a challenge', async () => {
    const repositories = createInMemoryRepositories({
      challenges: [challenge()],
      socialProfiles: previewSocialProfiles,
    });
    const dependencies = createDependencies(repositories);

    await expect(
      finishChallenge(
        { challengeId: 'challenge-1', userId: 'preview-marina' },
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(
      finishChallenge(
        { challengeId: 'challenge-1', userId: 'local-preview-user' },
        dependencies,
      ),
    ).resolves.toMatchObject({ status: 'finished' });
  });
});

function createDependencies(
  repositories: ReturnType<typeof createInMemoryRepositories>,
) {
  let id = 0;
  return {
    clock: () => now,
    generateId: () => `generated-${++id}`,
    previewActivities: previewRankingActivities,
    repositories,
  };
}

function challenge() {
  return {
    createdAt: '2026-09-29T12:00:00.000Z',
    creatorUserId: 'local-preview-user',
    endsAt: '2026-10-30T12:00:00.000Z',
    id: 'challenge-1',
    metric: 'volume' as const,
    startsAt: '2026-09-29T12:00:00.000Z',
    status: 'active' as const,
    title: 'Volume do mes',
    updatedAt: '2026-09-29T12:00:00.000Z',
  };
}

function participant(id: string, userId: string) {
  return {
    challengeId: 'challenge-1',
    id,
    joinedAt: '2026-09-29T12:00:00.000Z',
    leftAt: null,
    status: 'active' as const,
    updatedAt: '2026-09-29T12:00:00.000Z',
    userId,
  };
}
