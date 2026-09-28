import type { StructuredExportGateway } from '../ports/structuredExport';
import type { ConsolidatedReport } from '../../domain/reports/entities';
import {
  buildStructuredAiExport,
  createStructuredExportArtifact,
  shareStructuredAiExport,
} from './structuredAiExport';

describe('structured AI export', () => {
  it('separates observed facts, calculated metrics and empty AI output areas', () => {
    const document = buildStructuredAiExport(report);

    expect(document).toMatchObject({
      calculatedMetrics: {
        goals: report.goals,
        training: report.training,
      },
      exportType: 'forgeflow_ai_analysis',
      interpretations: { items: [], status: 'not_generated' },
      observedFacts: {
        hydrationEntries: report.hydration.entries,
        meals: report.nutrition.meals,
      },
      projections: { items: [], status: 'not_generated' },
      schemaVersion: 1,
    });
    expect(document.calculatedMetrics.hydration).not.toHaveProperty('entries');
    expect(document.calculatedMetrics.nutrition).not.toHaveProperty('meals');
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });

  it('does not invoke the gateway until the user sharing action runs', async () => {
    const share = jest.fn().mockResolvedValue('shared');
    const gateway: StructuredExportGateway = { share };
    const document = buildStructuredAiExport(report);
    const artifact = createStructuredExportArtifact(document);

    expect(share).not.toHaveBeenCalled();
    expect(artifact.fileName).toBe(
      'forgeflow-ai-export-2026-09-01-2026-09-30.json',
    );
    expect(JSON.parse(artifact.content)).toEqual(document);

    await expect(shareStructuredAiExport(document, gateway)).resolves.toBe(
      'shared',
    );
    expect(share).toHaveBeenCalledTimes(1);
  });
});

const report = {
  bodyWeight: { entries: [], status: 'unavailable' },
  generatedAt: '2026-09-28T12:00:00.000Z',
  goals: {
    activeCount: 0,
    behindCount: 0,
    completedCount: 0,
    items: [],
    totalCount: 0,
  },
  hydration: {
    averageDailyMl: 250,
    daily: [{ date: '2026-09-10', totalMl: 500 }],
    entries: [],
    goalDaysReached: null,
    targetMl: null,
    totalMl: 500,
  },
  nutrition: {
    averageDailyKcal: 300,
    daily: [
      {
        carbsG: 20,
        date: '2026-09-10',
        fatG: 10,
        kcal: 600,
        mealCount: 1,
        proteinG: 40,
      },
    ],
    meals: [],
    totals: { carbsG: 20, fatG: 10, kcal: 600, mealCount: 1, proteinG: 40 },
  },
  period: {
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-30T23:59:59.999Z',
  },
  schemaVersion: 1,
  training: {
    comparisons: {
      durationSeconds: { current: 0, percentageChange: null, previous: 0 },
      repetitions: { current: 0, percentageChange: null, previous: 0 },
      volume: { current: 0, percentageChange: null, previous: 0 },
      workoutCount: { current: 0, percentageChange: null, previous: 0 },
    },
    exercises: [],
    period: {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-30T23:59:59.999Z',
    },
    personalRecords: { estimated_1rm: 0, repetitions: 0, volume: 0, weight: 0 },
    previousPeriod: {
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z',
    },
    summary: {
      durationSeconds: 0,
      frequencyPerWeek: 0,
      personalRecordCount: 0,
      repetitions: 0,
      volume: 0,
      workingSetCount: 0,
      workoutCount: 0,
    },
    timeline: [],
  },
  userId: 'user-1',
} satisfies ConsolidatedReport;
