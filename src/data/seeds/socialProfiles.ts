import type { SocialProfile } from '../../domain/social/entities';
import { LOCAL_PREVIEW_USER_ID } from '../../config/localPreview';

const updatedAt = '2026-09-29T12:00:00.000Z';

export const previewSocialProfiles: SocialProfile[] = [
  {
    avatarUrl: null,
    bio: 'Treino consistente, progresso real.',
    displayName: 'Usuario ForgeFlow',
    isPrivate: true,
    rankingOptIn: false,
    sharesWorkoutStats: true,
    updatedAt,
    userId: LOCAL_PREVIEW_USER_ID,
    username: 'forgeflow_user',
  },
  {
    avatarUrl: null,
    bio: 'Forca e mobilidade.',
    displayName: 'Marina Costa',
    isPrivate: false,
    rankingOptIn: true,
    sharesWorkoutStats: true,
    updatedAt,
    userId: 'preview-marina',
    username: 'marina.costa',
  },
  {
    avatarUrl: null,
    bio: null,
    displayName: 'Lucas Almeida',
    isPrivate: true,
    rankingOptIn: false,
    sharesWorkoutStats: false,
    updatedAt,
    userId: 'preview-lucas',
    username: 'lucas.almeida',
  },
  {
    avatarUrl: null,
    bio: 'Corrida e musculacao.',
    displayName: 'Beatriz Lima',
    isPrivate: true,
    rankingOptIn: true,
    sharesWorkoutStats: true,
    updatedAt,
    userId: 'preview-beatriz',
    username: 'bia.lima',
  },
  {
    avatarUrl: null,
    bio: 'Um treino de cada vez.',
    displayName: 'Rafael Santos',
    isPrivate: false,
    rankingOptIn: true,
    sharesWorkoutStats: true,
    updatedAt,
    userId: 'preview-rafael',
    username: 'rafa.santos',
  },
];
