import type { ConsolidatedReport, ReportPeriod } from './entities';

export type StructuredAiExport = {
  calculatedMetrics: {
    goals: ConsolidatedReport['goals'];
    hydration: Omit<ConsolidatedReport['hydration'], 'entries'>;
    nutrition: Omit<ConsolidatedReport['nutrition'], 'meals'>;
    training: ConsolidatedReport['training'];
  };
  exportType: 'forgeflow_ai_analysis';
  generatedAt: string;
  interpretations: {
    items: unknown[];
    status: 'not_generated';
  };
  notices: {
    aiIsNotSourceOfTruth: true;
    professionalAdvice: string;
  };
  observedFacts: {
    bodyWeight: ConsolidatedReport['bodyWeight'];
    goals: Pick<
      ConsolidatedReport['goals']['items'][number],
      'deadline' | 'id' | 'metric' | 'targetValue' | 'title' | 'type'
    >[];
    hydrationEntries: ConsolidatedReport['hydration']['entries'];
    meals: ConsolidatedReport['nutrition']['meals'];
  };
  period: ReportPeriod;
  projections: {
    items: unknown[];
    status: 'not_generated';
  };
  schemaVersion: 1;
  subject: {
    userId: string;
  };
};

export type StructuredExportArtifact = {
  content: string;
  fileName: string;
  mimeType: 'application/json';
};
