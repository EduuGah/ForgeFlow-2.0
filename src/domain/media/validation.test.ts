import { MAX_LOCAL_IMAGE_BYTES, validateLocalImage } from './validation';

describe('local image validation', () => {
  it('normalizes an allowed image type', () => {
    expect(
      validateLocalImage({ mimeType: ' IMAGE/JPEG ', sizeBytes: 1024 }),
    ).toEqual({
      extension: 'jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('rejects unsupported formats', () => {
    expect(() =>
      validateLocalImage({ mimeType: 'image/svg+xml', sizeBytes: 1024 }),
    ).toThrow('Unsupported image format.');
  });

  it('rejects images over the size limit', () => {
    expect(() =>
      validateLocalImage({
        mimeType: 'image/png',
        sizeBytes: MAX_LOCAL_IMAGE_BYTES + 1,
      }),
    ).toThrow('Image must be 10 MB or smaller.');
  });
});
