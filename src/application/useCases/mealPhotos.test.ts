import type {
  MealPhotoCaptureGateway,
  MediaUploadGateway,
} from '../ports/media';
import { createInMemoryRepositories } from '../../data/repositories/inMemoryRepositories';
import type { Meal } from '../../domain/nutrition/entities';
import {
  attachMealPhoto,
  listMealPhotos,
  processMediaUploadQueue,
  retryMediaUpload,
} from './mealPhotos';

const now = '2026-09-27T20:00:00.000Z';
const meal: Meal = {
  carbsG: null,
  consumedAt: now,
  createdAt: now,
  deletedAt: null,
  fatG: null,
  id: 'meal-1',
  kcal: 500,
  mealType: 'dinner',
  notes: null,
  photoId: null,
  proteinG: null,
  updatedAt: now,
  userId: 'user-1',
};

describe('meal photos', () => {
  it('copies a selected image, associates it offline and queues upload', async () => {
    const dependencies = createDependencies();
    const result = await attachMealPhoto(
      { mealId: meal.id, source: 'library', userId: meal.userId },
      dependencies,
    );

    expect(result).toMatchObject({
      media: {
        localUri: 'file:///documents/meal-photo.jpg',
        remoteUrl: null,
        uploadStatus: 'pending',
      },
      status: 'attached',
    });
    const savedMeal = await dependencies.repositories.meals.findMealById(
      meal.id,
    );
    expect(savedMeal?.photoId).toBe(result.media?.id);
    await expect(
      dependencies.repositories.mediaUploads.findMediaUploadByMediaId(
        result.media!.id,
      ),
    ).resolves.toMatchObject({ attemptCount: 0, status: 'pending' });
    await expect(
      dependencies.repositories.syncOperations.listPendingSyncOperations(),
    ).resolves.toHaveLength(2);
  });

  it('does not change the meal when selection is cancelled', async () => {
    const dependencies = createDependencies({ cancelled: true });
    await expect(
      attachMealPhoto(
        { mealId: meal.id, source: 'camera', userId: meal.userId },
        dependencies,
      ),
    ).resolves.toEqual({ media: null, status: 'cancelled' });
    await expect(
      dependencies.repositories.meals.findMealById(meal.id),
    ).resolves.toEqual(meal);
  });

  it('keeps the local meal after failure and supports a later retry', async () => {
    let shouldFail = true;
    const dependencies = createDependencies({
      upload: async () => {
        if (shouldFail) throw new Error('Network unavailable');
        return {
          checksum: 'checksum-1',
          remoteUrl: 'https://storage.example/media-1.jpg',
        };
      },
    });
    const attached = await attachMealPhoto(
      { mealId: meal.id, source: 'library', userId: meal.userId },
      dependencies,
    );
    const mediaId = attached.media!.id;

    await expect(processMediaUploadQueue({}, dependencies)).resolves.toEqual([
      { mediaId, status: 'failed' },
    ]);
    await expect(
      dependencies.repositories.meals.findMealById(meal.id),
    ).resolves.toMatchObject({ id: meal.id, photoId: mediaId });
    await expect(
      dependencies.repositories.media.findMediaById(mediaId),
    ).resolves.toMatchObject({
      localUri: 'file:///documents/meal-photo.jpg',
      remoteUrl: null,
      uploadStatus: 'failed',
    });

    shouldFail = false;
    await expect(
      retryMediaUpload({ mediaId, userId: meal.userId }, dependencies),
    ).resolves.toEqual([{ mediaId, status: 'uploaded' }]);
    await expect(
      listMealPhotos(
        { mediaIds: [mediaId], userId: meal.userId },
        dependencies.repositories,
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        checksum: 'checksum-1',
        remoteUrl: 'https://storage.example/media-1.jpg',
        uploadStatus: 'uploaded',
      }),
    ]);
  });
});

function createDependencies(
  input: {
    cancelled?: boolean;
    upload?: MediaUploadGateway['upload'];
  } = {},
) {
  let sequence = 0;
  const captureGateway: MealPhotoCaptureGateway = {
    capture: jest.fn(async () =>
      input.cancelled
        ? null
        : {
            localUri: 'file:///documents/meal-photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 2048,
          },
    ),
  };
  const uploadGateway: MediaUploadGateway = {
    upload:
      input.upload ??
      (async () => ({
        checksum: null,
        remoteUrl: 'https://storage.example/media.jpg',
      })),
  };
  return {
    captureGateway,
    clock: () => now,
    generateId: () => `generated-${++sequence}`,
    repositories: createInMemoryRepositories({ meals: [meal] }),
    uploadGateway,
  };
}
