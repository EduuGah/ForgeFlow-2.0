import type { Media } from '../../domain/media/entities';
import type { EntityId } from '../../domain/shared/types';

export type MealPhotoSource = 'camera' | 'library';

export type LocalMediaAsset = {
  localUri: string;
  mimeType: string;
  sizeBytes: number | null;
};

export interface MealPhotoCaptureGateway {
  capture(input: {
    mediaId: EntityId;
    source: MealPhotoSource;
  }): Promise<LocalMediaAsset | null>;
}

export interface MediaUploadGateway {
  upload(media: Media): Promise<{ checksum: string | null; remoteUrl: string }>;
}
