import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type {
  LocalMediaAsset,
  MealPhotoCaptureGateway,
} from '../../application/ports/media';
import { validateLocalImage } from '../../domain/media/validation';

export class ExpoMealPhotoGateway implements MealPhotoCaptureGateway {
  async capture(input: Parameters<MealPhotoCaptureGateway['capture']>[0]) {
    if (input.source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error('Camera permission denied.');
    }

    const result =
      input.source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    const inferredMimeType =
      asset.mimeType ?? inferMimeType(asset.fileName ?? asset.uri);
    const validated = validateLocalImage({
      mimeType: inferredMimeType,
      sizeBytes: asset.fileSize ?? null,
    });
    if (Platform.OS === 'web') {
      return {
        localUri: asset.uri,
        mimeType: validated.mimeType,
        sizeBytes: asset.fileSize ?? null,
      } satisfies LocalMediaAsset;
    }

    const directory = new Directory(Paths.document, 'meal-photos');
    directory.create({ idempotent: true, intermediates: true });
    const destination = new File(
      directory,
      `${input.mediaId}.${validated.extension}`,
    );
    await new File(asset.uri).copy(destination, { overwrite: true });

    return {
      localUri: destination.uri,
      mimeType: validated.mimeType,
      sizeBytes: asset.fileSize ?? destination.size ?? null,
    } satisfies LocalMediaAsset;
  }
}

const pickerOptions = {
  allowsEditing: true,
  aspect: [4, 3] as [number, number],
  base64: false,
  mediaTypes: ['images'] as ImagePicker.MediaType[],
  quality: 0.85,
};

function inferMimeType(value: string) {
  const extension = value.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic' || extension === 'heif') return 'image/heic';
  return 'image/jpeg';
}
