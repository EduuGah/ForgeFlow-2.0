export const MAX_LOCAL_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ['image/heic', 'heic'],
  ['image/heif', 'heif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaValidationError';
  }
}

export function validateLocalImage(input: {
  mimeType: string;
  sizeBytes: number | null;
}) {
  const mimeType = input.mimeType.trim().toLowerCase();
  const extension = ALLOWED_IMAGE_TYPES.get(mimeType);

  if (!extension) {
    throw new MediaValidationError('Unsupported image format.');
  }
  if (input.sizeBytes !== null && input.sizeBytes > MAX_LOCAL_IMAGE_BYTES) {
    throw new MediaValidationError('Image must be 10 MB or smaller.');
  }
  if (input.sizeBytes !== null && input.sizeBytes < 0) {
    throw new MediaValidationError('Invalid image size.');
  }

  return { extension, mimeType };
}
