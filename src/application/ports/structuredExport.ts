import type { StructuredExportArtifact } from '../../domain/reports/aiExport';

export type StructuredExportResult = 'cancelled' | 'downloaded' | 'shared';

export interface StructuredExportGateway {
  share(artifact: StructuredExportArtifact): Promise<StructuredExportResult>;
}
