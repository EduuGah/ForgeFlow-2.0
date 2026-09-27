import type {
  MealPhotoCaptureGateway,
  MealPhotoSource,
  MediaUploadGateway,
} from '../ports/media';
import type { RepositoryProvider } from '../ports/repositories';
import type { Media, MediaUpload } from '../../domain/media/entities';
import type { Meal } from '../../domain/nutrition/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type {
  SyncEntityType,
  SyncOperation,
  SyncOperationType,
} from '../../domain/sync/entities';

type MealPhotoRepositories = Pick<
  RepositoryProvider,
  'meals' | 'media' | 'mediaUploads' | 'syncOperations'
>;

export type MealPhotoDependencies = {
  captureGateway: MealPhotoCaptureGateway;
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: MealPhotoRepositories;
  uploadGateway: MediaUploadGateway;
};

export async function attachMealPhoto(
  input: { mealId: EntityId; source: MealPhotoSource; userId: EntityId },
  dependencies: MealPhotoDependencies,
) {
  const meal = await requireMeal(input.mealId, input.userId, dependencies);
  if (meal.photoId) {
    return { media: null, status: 'already_attached' as const };
  }

  const mediaId = dependencies.generateId();
  const asset = await dependencies.captureGateway.capture({
    mediaId,
    source: input.source,
  });
  if (!asset) return { media: null, status: 'cancelled' as const };

  const now = dependencies.clock();
  const media: Media = {
    checksum: null,
    createdAt: now,
    deletedAt: null,
    id: mediaId,
    localUri: asset.localUri,
    mimeType: asset.mimeType,
    remoteUrl: null,
    sizeBytes: asset.sizeBytes,
    updatedAt: now,
    uploadStatus: 'pending',
    userId: input.userId,
  };
  const upload: MediaUpload = {
    attemptCount: 0,
    createdAt: now,
    id: dependencies.generateId(),
    lastAttemptAt: null,
    lastError: null,
    mediaId,
    nextAttemptAt: now,
    status: 'pending',
    updatedAt: now,
  };
  const updatedMeal: Meal = { ...meal, photoId: mediaId, updatedAt: now };

  await dependencies.repositories.media.saveMedia(media);
  await dependencies.repositories.mediaUploads.saveMediaUpload(upload);
  await dependencies.repositories.meals.saveMeal(updatedMeal);
  await queueSync(media, 'media', 'upsert', dependencies);
  await queueSync(updatedMeal, 'meal', 'upsert', dependencies);

  return { media, status: 'attached' as const };
}

export async function listMealPhotos(
  input: { mediaIds: EntityId[]; userId: EntityId },
  repositories: MealPhotoRepositories,
) {
  if (input.mediaIds.length === 0) return [];
  return repositories.media.listMedia({
    ids: input.mediaIds,
    userId: input.userId,
  });
}

export async function processMediaUploadQueue(
  input: { limit?: number },
  dependencies: MealPhotoDependencies,
) {
  const now = dependencies.clock();
  const uploads =
    await dependencies.repositories.mediaUploads.listReadyMediaUploads({
      limit: input.limit ?? 5,
      now,
    });
  const results: { mediaId: EntityId; status: 'failed' | 'uploaded' }[] = [];

  for (const upload of uploads) {
    const media = await dependencies.repositories.media.findMediaById(
      upload.mediaId,
    );
    if (!media || media.deletedAt || !media.localUri) {
      await failUpload(
        upload,
        'Local media file is unavailable.',
        dependencies,
      );
      results.push({ mediaId: upload.mediaId, status: 'failed' });
      continue;
    }

    const processingAt = dependencies.clock();
    const processingUpload: MediaUpload = {
      ...upload,
      attemptCount: upload.attemptCount + 1,
      lastAttemptAt: processingAt,
      lastError: null,
      status: 'processing',
      updatedAt: processingAt,
    };
    await dependencies.repositories.mediaUploads.saveMediaUpload(
      processingUpload,
    );
    await dependencies.repositories.media.saveMedia({
      ...media,
      updatedAt: processingAt,
      uploadStatus: 'uploading',
    });

    try {
      const uploaded = await dependencies.uploadGateway.upload(media);
      const completedAt = dependencies.clock();
      const completedMedia: Media = {
        ...media,
        checksum: uploaded.checksum,
        remoteUrl: uploaded.remoteUrl,
        updatedAt: completedAt,
        uploadStatus: 'uploaded',
      };
      await dependencies.repositories.media.saveMedia(completedMedia);
      await dependencies.repositories.mediaUploads.saveMediaUpload({
        ...processingUpload,
        status: 'completed',
        updatedAt: completedAt,
      });
      await queueSync(completedMedia, 'media', 'upsert', dependencies);
      results.push({ mediaId: media.id, status: 'uploaded' });
    } catch (error) {
      await failUpload(
        processingUpload,
        error instanceof Error ? error.message : 'Media upload failed.',
        dependencies,
      );
      results.push({ mediaId: media.id, status: 'failed' });
    }
  }
  return results;
}

export async function retryMediaUpload(
  input: { mediaId: EntityId; userId: EntityId },
  dependencies: MealPhotoDependencies,
) {
  const media = await dependencies.repositories.media.findMediaById(
    input.mediaId,
  );
  if (!media || media.userId !== input.userId || media.deletedAt) {
    throw new Error('Media not found.');
  }
  const upload =
    await dependencies.repositories.mediaUploads.findMediaUploadByMediaId(
      input.mediaId,
    );
  if (!upload) throw new Error('Media upload not found.');
  const now = dependencies.clock();
  await dependencies.repositories.mediaUploads.saveMediaUpload({
    ...upload,
    nextAttemptAt: now,
    status: 'pending',
    updatedAt: now,
  });
  return processMediaUploadQueue({ limit: 1 }, dependencies);
}

async function failUpload(
  upload: MediaUpload,
  error: string,
  dependencies: MealPhotoDependencies,
) {
  const now = dependencies.clock();
  const attemptCount = Math.max(upload.attemptCount, 1);
  const delayMinutes = Math.min(24 * 60, 5 * 2 ** (attemptCount - 1));
  const nextAttemptAt = new Date(
    new Date(now).getTime() + delayMinutes * 60_000,
  ).toISOString();
  await dependencies.repositories.mediaUploads.saveMediaUpload({
    ...upload,
    attemptCount,
    lastAttemptAt: upload.lastAttemptAt ?? now,
    lastError: error,
    nextAttemptAt,
    status: 'failed',
    updatedAt: now,
  });
  const media = await dependencies.repositories.media.findMediaById(
    upload.mediaId,
  );
  if (media) {
    await dependencies.repositories.media.saveMedia({
      ...media,
      updatedAt: now,
      uploadStatus: 'failed',
    });
  }
}

async function requireMeal(
  mealId: EntityId,
  userId: EntityId,
  dependencies: MealPhotoDependencies,
) {
  const meal = await dependencies.repositories.meals.findMealById(mealId);
  if (!meal || meal.userId !== userId || meal.deletedAt) {
    throw new Error('Meal not found.');
  }
  return meal;
}

async function queueSync(
  payload: Media | Meal,
  entityType: Extract<SyncEntityType, 'meal' | 'media'>,
  operationType: SyncOperationType,
  dependencies: MealPhotoDependencies,
) {
  const operation: SyncOperation = {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: payload.id,
    entityType,
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType,
    payload: { ...payload },
    status: 'pending',
  };
  await dependencies.repositories.syncOperations.enqueueSyncOperation(
    operation,
  );
}
