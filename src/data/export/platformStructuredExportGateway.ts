import { Platform, Share } from 'react-native';

import type { StructuredExportGateway } from '../../application/ports/structuredExport';
import type { StructuredExportArtifact } from '../../domain/reports/aiExport';

export class PlatformStructuredExportGateway implements StructuredExportGateway {
  async share(artifact: StructuredExportArtifact) {
    if (Platform.OS === 'web') {
      downloadOnWeb(artifact);
      return 'downloaded' as const;
    }

    const result = await Share.share({
      message: artifact.content,
      title: artifact.fileName,
    });
    return result.action === Share.dismissedAction
      ? ('cancelled' as const)
      : ('shared' as const);
  }
}

function downloadOnWeb(artifact: StructuredExportArtifact) {
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.download = artifact.fileName;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
}
