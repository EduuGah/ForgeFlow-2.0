import type {
  StructuredAiExport,
  StructuredExportArtifact,
} from '../../domain/reports/aiExport';
import type { ConsolidatedReport } from '../../domain/reports/entities';
import type { StructuredExportGateway } from '../ports/structuredExport';

const PROFESSIONAL_ADVICE_NOTICE =
  'Analises de treino e nutricao geradas por IA nao substituem a orientacao de profissionais de saude, nutricao ou educacao fisica.';

export function buildStructuredAiExport(
  report: ConsolidatedReport,
): StructuredAiExport {
  return {
    calculatedMetrics: {
      goals: report.goals,
      hydration: omitEntries(report.hydration),
      nutrition: omitMeals(report.nutrition),
      training: report.training,
    },
    exportType: 'forgeflow_ai_analysis',
    generatedAt: report.generatedAt,
    interpretations: { items: [], status: 'not_generated' },
    notices: {
      aiIsNotSourceOfTruth: true,
      professionalAdvice: PROFESSIONAL_ADVICE_NOTICE,
    },
    observedFacts: {
      bodyWeight: report.bodyWeight,
      goals: report.goals.items.map(
        ({ deadline, id, metric, targetValue, title, type }) => ({
          deadline,
          id,
          metric,
          targetValue,
          title,
          type,
        }),
      ),
      hydrationEntries: report.hydration.entries,
      meals: report.nutrition.meals,
    },
    period: report.period,
    projections: { items: [], status: 'not_generated' },
    schemaVersion: 1,
    subject: { userId: report.userId },
  };
}

export function createStructuredExportArtifact(
  document: StructuredAiExport,
): StructuredExportArtifact {
  return {
    content: JSON.stringify(document, null, 2),
    fileName: `forgeflow-ai-export-${document.period.from.slice(0, 10)}-${document.period.to.slice(0, 10)}.json`,
    mimeType: 'application/json',
  };
}

export async function shareStructuredAiExport(
  document: StructuredAiExport,
  gateway: StructuredExportGateway,
) {
  return gateway.share(createStructuredExportArtifact(document));
}

function omitEntries(hydration: ConsolidatedReport['hydration']) {
  const { entries: _entries, ...metrics } = hydration;
  return metrics;
}

function omitMeals(nutrition: ConsolidatedReport['nutrition']) {
  const { meals: _meals, ...metrics } = nutrition;
  return metrics;
}
