import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';
import type {
  Competition,
  CompetitionParticipant,
} from '../../domain/social/entities';

export const previewCompetitions: Competition[] = [
  {
    createdAt: '2026-09-29T10:00:00.000Z',
    creatorUserId: 'preview-rafael',
    endsAt: '2026-11-02T10:00:00.000Z',
    id: 'preview-competition-consistency',
    metric: 'consistency',
    registrationEndsAt: '2026-10-03T10:00:00.000Z',
    rulesVersion: 1,
    startsAt: '2026-10-03T10:00:00.000Z',
    status: 'registration',
    title: 'Liga da consistencia',
    updatedAt: '2026-09-29T10:00:00.000Z',
  },
];

export const previewCompetitionParticipants: CompetitionParticipant[] = [
  participant('competition-rafael', 'preview-rafael'),
  participant('competition-current', LOCAL_PREVIEW_USER_ID),
];

function participant(id: string, userId: string): CompetitionParticipant {
  return {
    competitionId: 'preview-competition-consistency',
    id,
    joinedAt: '2026-09-29T10:00:00.000Z',
    leftAt: null,
    status: 'active',
    updatedAt: '2026-09-29T10:00:00.000Z',
    userId,
  };
}
