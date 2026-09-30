import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';
import type {
  Challenge,
  ChallengeParticipant,
} from '../../domain/social/entities';

export const previewChallenges: Challenge[] = [
  {
    createdAt: '2026-09-28T10:00:00.000Z',
    creatorUserId: 'preview-marina',
    endsAt: '2026-10-28T10:00:00.000Z',
    id: 'preview-challenge-volume',
    metric: 'volume',
    startsAt: '2026-09-28T10:00:00.000Z',
    status: 'active',
    title: '30 dias de volume',
    updatedAt: '2026-09-28T10:00:00.000Z',
  },
];

export const previewChallengeParticipants: ChallengeParticipant[] = [
  participant('preview-participant-marina', 'preview-marina'),
  participant('preview-participant-rafael', 'preview-rafael'),
  participant('preview-participant-current', LOCAL_PREVIEW_USER_ID),
];

function participant(id: string, userId: string): ChallengeParticipant {
  return {
    challengeId: 'preview-challenge-volume',
    id,
    joinedAt: '2026-09-28T10:00:00.000Z',
    leftAt: null,
    status: 'active',
    updatedAt: '2026-09-28T10:00:00.000Z',
    userId,
  };
}
