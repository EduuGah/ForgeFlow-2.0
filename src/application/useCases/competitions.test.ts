import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import { previewSocialProfiles } from '../../data/seeds/socialProfiles';
import {
  applyAuthoritativeCompetitionResult,
  createCompetition,
  joinCompetition,
} from './competitions';

const now = '2026-09-30T12:00:00.000Z';

describe('social competitions', () => {
  it('creates immutable versioned rules and enrolls the creator', async () => {
    const repositories = createInMemoryRepositories({
      socialProfiles: previewSocialProfiles,
    });
    const competition = await createCompetition(
      {
        creatorUserId: 'local-preview-user',
        durationDays: 30,
        metric: 'volume',
        registrationDays: 3,
        title: 'Liga mensal',
      },
      dependencies(repositories),
    );

    expect(competition).toMatchObject({
      rulesVersion: 1,
      status: 'registration',
    });
    expect(
      await repositories.competitionParticipants.findCompetitionParticipant(
        competition.id,
        'local-preview-user',
      ),
    ).toMatchObject({ status: 'active' });
    expect(await repositories.syncOperations.countPendingSyncOperations()).toBe(
      2,
    );
  });

  it('rejects new participants after the competition starts', async () => {
    const repositories = createInMemoryRepositories({
      competitions: [
        {
          ...competition(),
          registrationEndsAt: '2026-09-29T12:00:00.000Z',
          startsAt: '2026-09-29T12:00:00.000Z',
        },
      ],
      socialProfiles: previewSocialProfiles,
    });
    await expect(
      joinCompetition(
        { competitionId: 'competition-1', userId: 'preview-marina' },
        dependencies(repositories),
      ),
    ).rejects.toMatchObject({ code: 'registration_closed' });
  });

  it('persists only a server-authorized final result matching the rules', async () => {
    const repositories = createInMemoryRepositories({
      competitions: [competition()],
    });
    await applyAuthoritativeCompetitionResult(
      {
        authority: 'server',
        result: {
          competitionId: 'competition-1',
          finalizedAt: now,
          id: 'result-1',
          rulesVersion: 1,
          standings: [{ position: 1, score: 120, userId: 'preview-marina' }],
          updatedAt: now,
        },
      },
      repositories,
    );
    expect(
      await repositories.competitionResults.findCompetitionResult(
        'competition-1',
      ),
    ).toMatchObject({ id: 'result-1' });
    expect(
      await repositories.competitions.findCompetitionById('competition-1'),
    ).toMatchObject({ status: 'finished' });
  });
});

function dependencies(
  repositories: ReturnType<typeof createInMemoryRepositories>,
) {
  let id = 0;
  return { clock: () => now, generateId: () => `id-${++id}`, repositories };
}

function competition() {
  return {
    createdAt: '2026-09-28T12:00:00.000Z',
    creatorUserId: 'local-preview-user',
    endsAt: '2026-11-02T12:00:00.000Z',
    id: 'competition-1',
    metric: 'volume' as const,
    registrationEndsAt: '2026-10-03T12:00:00.000Z',
    rulesVersion: 1,
    startsAt: '2026-10-03T12:00:00.000Z',
    status: 'registration' as const,
    title: 'Liga mensal',
    updatedAt: '2026-09-28T12:00:00.000Z',
  };
}
