import type { EntityId, ISODateTimeString } from '../shared/types';

export type MediaUploadStatus = 'failed' | 'pending' | 'uploaded' | 'uploading';

export type Media = {
  checksum: string | null;
  createdAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
  id: EntityId;
  localUri: string | null;
  mimeType: string;
  remoteUrl: string | null;
  sizeBytes: number | null;
  updatedAt: ISODateTimeString;
  uploadStatus: MediaUploadStatus;
  userId: EntityId;
};

export type MediaUpload = {
  attemptCount: number;
  createdAt: ISODateTimeString;
  id: EntityId;
  lastAttemptAt: ISODateTimeString | null;
  lastError: string | null;
  mediaId: EntityId;
  nextAttemptAt: ISODateTimeString;
  status: 'completed' | 'failed' | 'pending' | 'processing';
  updatedAt: ISODateTimeString;
};
