import type { RepositoryProvider } from '../ports/repositories';
import type {
  Competition,
  CompetitionParticipant,
  CompetitionResult,
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

export class CompetitionError extends Error {
  constructor(
    readonly code:
      | 'already_joined'
      | 'forbidden'
      | 'invalid_input'
      | 'not_found'
      | 'registration_closed',
    message: string,
  ) {
    super(message);
    this.name = 'CompetitionError';
  }
}

type Dependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  previewActivities?: RankingActivity[];
  repositories: RepositoryProvider;
};

export type CompetitionEntry = {
  isCurrentUser: boolean;
  position: number;
  profile: Pick<SocialProfile, 'displayName' | 'userId' | 'username'>;
  score: number;
};

export type CompetitionView = {
  canJoin: boolean;
  canLeave: boolean;
  competition: Competition;
  entries: CompetitionEntry[];
  isParticipant: boolean;
  resultIsFinal: boolean;
  status: Competition['status'];
};

export async function createCompetition(
  input: {
    creatorUserId: EntityId;
    durationDays: number;
    metric: RankingMetric;
    registrationDays: number;
    title: string;
  },
  dependencies: Dependencies,
) {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 60) {
    throw new CompetitionError(
      'invalid_input',
      'Use um titulo entre 3 e 60 caracteres.',
    );
  }
  if (
    ![7, 30, 90].includes(input.durationDays) ||
    ![1, 3, 7].includes(input.registrationDays)
  ) {
    throw new CompetitionError('invalid_input', 'Escolha periodos validos.');
  }
  const now = dependencies.clock();
  const startsAt = addDays(now, input.registrationDays);
  const competition: Competition = {
    createdAt: now,
    creatorUserId: input.creatorUserId,
    endsAt: addDays(startsAt, input.durationDays),
    id: dependencies.generateId(),
    metric: input.metric,
    registrationEndsAt: startsAt,
    rulesVersion: 1,
    startsAt,
    status: 'registration',
    title,
    updatedAt: now,
  };
  const participant = makeParticipant(
    competition.id,
    input.creatorUserId,
    now,
    dependencies.generateId(),
  );
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.competitions.saveCompetition(competition);
    await dependencies.repositories.competitionParticipants.saveCompetitionParticipant(
      participant,
    );
    await enqueue('competition', competition.id, competition, dependencies);
    await enqueue(
      'competition_participant',
      participant.id,
      participant,
      dependencies,
    );
  });
  return competition;
}

export async function joinCompetition(
  input: { competitionId: EntityId; userId: EntityId },
  dependencies: Dependencies,
) {
  const competition = await requireRegistration(
    input.competitionId,
    dependencies,
  );
  const existing =
    await dependencies.repositories.competitionParticipants.findCompetitionParticipant(
      competition.id,
      input.userId,
    );
  if (existing?.status === 'active') {
    throw new CompetitionError(
      'already_joined',
      'Voce ja participa desta competicao.',
    );
  }
  const participant = makeParticipant(
    competition.id,
    input.userId,
    dependencies.clock(),
    existing?.id ?? dependencies.generateId(),
  );
  await saveParticipant(participant, dependencies);
  return participant;
}

export async function leaveCompetition(
  input: { competitionId: EntityId; userId: EntityId },
  dependencies: Dependencies,
) {
  await requireRegistration(input.competitionId, dependencies);
  const participant =
    await dependencies.repositories.competitionParticipants.findCompetitionParticipant(
      input.competitionId,
      input.userId,
    );
  if (!participant || participant.status !== 'active') {
    throw new CompetitionError('not_found', 'Participacao nao encontrada.');
  }
  const now = dependencies.clock();
  const next = {
    ...participant,
    leftAt: now,
    status: 'left' as const,
    updatedAt: now,
  };
  await saveParticipant(next, dependencies);
  return next;
}

export async function getCompetitionsOverview(
  userId: EntityId,
  dependencies: Omit<Dependencies, 'generateId'>,
): Promise<CompetitionView[]> {
  const competitions =
    await dependencies.repositories.competitions.listCompetitions();
  const now = dependencies.clock();
  const from = competitions.reduce(
    (earliest, item) => (item.startsAt < earliest ? item.startsAt : earliest),
    now,
  );
  const analytics = await getTrainingAnalytics(
    { period: { from, to: now }, userId },
    dependencies.repositories,
  );
  const activities: RankingActivity[] = [
    ...(dependencies.previewActivities ?? []),
    ...analytics.timeline.map((point) => ({
      completedAt: `${point.date}T12:00:00.000Z`,
      userId,
      volume: point.volume,
      workoutCount: point.workoutCount,
    })),
  ];
  return Promise.all(
    competitions.map(async (competition) => {
      const [participants, result] = await Promise.all([
        dependencies.repositories.competitionParticipants.listCompetitionParticipants(
          competition.id,
        ),
        dependencies.repositories.competitionResults.findCompetitionResult(
          competition.id,
        ),
      ]);
      const active = participants.filter((item) => item.status === 'active');
      const profiles = await Promise.all(
        active.map((item) =>
          dependencies.repositories.socialProfiles.findSocialProfileByUserId(
            item.userId,
          ),
        ),
      );
      const status = effectiveStatus(competition, now, result);
      const scores =
        result?.standings ??
        active.map((item) => ({
          position: 0,
          score: calculateRankingValue(
            competition.metric,
            activities.filter((activity) => activity.userId === item.userId),
            { from: competition.startsAt, to: competition.endsAt },
          ),
          userId: item.userId,
        }));
      const sorted = [...scores]
        .sort((left, right) => right.score - left.score)
        .map((item, index) => ({
          ...item,
          position: result ? item.position : index + 1,
        }));
      const entries = sorted.flatMap((standing) => {
        const profile = profiles.find(
          (item) => item?.userId === standing.userId,
        );
        return profile
          ? [
              {
                isCurrentUser: profile.userId === userId,
                position: standing.position,
                profile: {
                  displayName: profile.displayName,
                  userId: profile.userId,
                  username: profile.username,
                },
                score: standing.score,
              },
            ]
          : [];
      });
      const isParticipant = active.some((item) => item.userId === userId);
      return {
        canJoin: status === 'registration' && !isParticipant,
        canLeave: status === 'registration' && isParticipant,
        competition,
        entries,
        isParticipant,
        resultIsFinal: result !== null,
        status,
      };
    }),
  );
}

export async function applyAuthoritativeCompetitionResult(
  input: { authority: 'server'; result: CompetitionResult },
  repositories: RepositoryProvider,
) {
  const competition = await repositories.competitions.findCompetitionById(
    input.result.competitionId,
  );
  if (!competition)
    throw new CompetitionError('not_found', 'Competicao nao encontrada.');
  if (competition.rulesVersion !== input.result.rulesVersion) {
    throw new CompetitionError(
      'forbidden',
      'A versao das regras nao corresponde.',
    );
  }
  await repositories.transaction.runInTransaction(async () => {
    await repositories.competitionResults.saveCompetitionResult(input.result);
    await repositories.competitions.saveCompetition({
      ...competition,
      status: 'finished',
      updatedAt: input.result.updatedAt,
    });
  });
}

async function requireRegistration(id: EntityId, dependencies: Dependencies) {
  const competition =
    await dependencies.repositories.competitions.findCompetitionById(id);
  if (!competition)
    throw new CompetitionError('not_found', 'Competicao nao encontrada.');
  if (
    effectiveStatus(competition, dependencies.clock(), null) !== 'registration'
  ) {
    throw new CompetitionError(
      'registration_closed',
      'As inscricoes foram encerradas.',
    );
  }
  return competition;
}

function effectiveStatus(
  competition: Competition,
  now: string,
  result: CompetitionResult | null,
): Competition['status'] {
  if (result || competition.status === 'finished') return 'finished';
  if (competition.status === 'cancelled') return 'cancelled';
  if (Date.parse(now) < Date.parse(competition.startsAt)) return 'registration';
  return 'active';
}

function makeParticipant(
  competitionId: string,
  userId: string,
  now: string,
  id: string,
): CompetitionParticipant {
  return {
    competitionId,
    id,
    joinedAt: now,
    leftAt: null,
    status: 'active',
    updatedAt: now,
    userId,
  };
}

async function saveParticipant(
  participant: CompetitionParticipant,
  dependencies: Dependencies,
) {
  await dependencies.repositories.transaction.runInTransaction(async () => {
    await dependencies.repositories.competitionParticipants.saveCompetitionParticipant(
      participant,
    );
    await enqueue(
      'competition_participant',
      participant.id,
      participant,
      dependencies,
    );
  });
}

async function enqueue(
  entityType: 'competition' | 'competition_participant',
  entityId: string,
  payload: Competition | CompetitionParticipant,
  dependencies: Dependencies,
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

function addDays(value: string, days: number) {
  return new Date(Date.parse(value) + days * 86_400_000).toISOString();
}
