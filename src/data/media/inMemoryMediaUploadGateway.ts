import type { MediaUploadGateway } from '../../application/ports/media';

export class InMemoryMediaUploadGateway implements MediaUploadGateway {
  async upload(media: Parameters<MediaUploadGateway['upload']>[0]) {
    if (!media.localUri) throw new Error('Local media file is unavailable.');
    return {
      checksum: null,
      remoteUrl: `https://storage.forgeflow.local/media/${media.id}`,
    };
  }
}
