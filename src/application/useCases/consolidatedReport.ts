import type { RepositoryProvider } from '../ports/repositories';
import type {
  ConsolidatedReport,
  ReportPeriod,
} from '../../domain/reports/entities';
import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { Meal, NutritionTotals } from '../../domain/nutrition/entities';
import { listGoalProgress } from './goalProgress';
import { listHydrationHistory } from './hydrationTracking';
import { listNutritionJournal } from './nutritionJournal';
import { getTrainingAnalytics } from './trainingAnalytics';

type ReportRepositories = Pick<
  RepositoryProvider,
  | 'exercises'
  | 'goalProgressEvents'
  | 'goals'
  | 'hydrationEntries'
  | 'hydrationGoals'
  | 'meals'
  | 'personalRecords'
  | 'sessionExercises'
  | 'sets'
  | 'syncOperations'
  | 'workoutSessions'
>;

export type ConsolidatedReportDependencies = {
  clock: () => ISODateTimeString;
  repositories: ReportRepositories;
};

export async function buildConsolidatedReport(
  input: {
    period: ReportPeriod;
    timezoneOffsetMinutes: number;
    userId: EntityId;
  },
  dependencies: ConsolidatedReportDependencies,
): Promise<ConsolidatedReport> {
  validatePeriod(input.period);
  const [training, goals, nutrition, hydration] = await Promise.all([
    getTrainingAnalytics(
      { period: input.period, userId: input.userId },
      dependencies.repositories,
    ),
    listGoalProgress({ userId: input.userId }, dependencies.repositories),
    listNutritionJournal(
      { ...input.period, userId: input.userId },
      dependencies.repositories,
    ),
    listHydrationHistory(
      { ...input.period, userId: input.userId },
      dependencies.repositories,
    ),
  ]);
  const period = training.period;
  const dayCount = inclusiveDayCount(period);
  const nutritionDaily = groupMealsByDay(
    nutrition.meals,
    input.timezoneOffsetMinutes,
  );
  const hydrationDaily = groupHydrationByDay(
    hydration.entries,
    input.timezoneOffsetMinutes,
  );
  const targetMl = hydration.summary.goal?.targetMl ?? null;

  return {
    bodyWeight: { entries: [], status: 'unavailable' },
    generatedAt: dependencies.clock(),
    goals: {
      activeCount: goals.filter((item) =>
        ['active', 'on_track'].includes(item.goal.status),
      ).length,
      behindCount: goals.filter((item) => item.goal.status === 'behind').length,
      completedCount: goals.filter((item) => item.goal.status === 'completed')
        .length,
      items: goals.map((item) => ({
        deadline: item.goal.deadline,
        id: item.goal.id,
        measuredValue: item.measuredValue,
        metric: item.goal.metric,
        progressPercent: item.progressPercent,
        status: item.goal.status,
        targetValue: item.goal.targetValue,
        title: item.goal.title,
        type: item.goal.type,
      })),
      totalCount: goals.length,
    },
    hydration: {
      averageDailyMl: roundMetric(hydration.summary.totalMl / dayCount),
      daily: hydrationDaily,
      entries: hydration.entries,
      goalDaysReached:
        targetMl === null
          ? null
          : hydrationDaily.filter((day) => day.totalMl >= targetMl).length,
      targetMl,
      totalMl: hydration.summary.totalMl,
    },
    nutrition: {
      averageDailyKcal: roundMetric(nutrition.totals.kcal / dayCount),
      daily: nutritionDaily,
      meals: nutrition.meals,
      totals: nutrition.totals,
    },
    period,
    schemaVersion: 1,
    training,
    userId: input.userId,
  };
}

function groupMealsByDay(meals: Meal[], timezoneOffsetMinutes: number) {
  const days = new Map<string, NutritionTotals>();
  for (const meal of meals) {
    const date = localDateKey(meal.consumedAt, timezoneOffsetMinutes);
    const totals = days.get(date) ?? emptyNutritionTotals();
    totals.carbsG += meal.carbsG ?? 0;
    totals.fatG += meal.fatG ?? 0;
    totals.kcal += meal.kcal;
    totals.mealCount += 1;
    totals.proteinG += meal.proteinG ?? 0;
    days.set(date, totals);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, totals]) => ({
      carbsG: roundMetric(totals.carbsG),
      date,
      fatG: roundMetric(totals.fatG),
      kcal: roundMetric(totals.kcal),
      mealCount: totals.mealCount,
      proteinG: roundMetric(totals.proteinG),
    }));
}

function groupHydrationByDay(
  entries: { amountMl: number; recordedAt: string }[],
  timezoneOffsetMinutes: number,
) {
  const days = new Map<string, number>();
  for (const entry of entries) {
    const date = localDateKey(entry.recordedAt, timezoneOffsetMinutes);
    days.set(date, (days.get(date) ?? 0) + entry.amountMl);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, totalMl]) => ({ date, totalMl }));
}

function localDateKey(timestamp: string, timezoneOffsetMinutes: number) {
  return new Date(
    new Date(timestamp).getTime() + timezoneOffsetMinutes * 60_000,
  )
    .toISOString()
    .slice(0, 10);
}

function inclusiveDayCount(period: ReportPeriod) {
  return Math.max(
    1,
    Math.ceil(
      (Date.parse(period.to) - Date.parse(period.from) + 1) / 86_400_000,
    ),
  );
}

function validatePeriod(period: ReportPeriod) {
  const from = Date.parse(period.from);
  const to = Date.parse(period.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) {
    throw new Error('Informe um periodo valido para o relatorio.');
  }
}

function emptyNutritionTotals(): NutritionTotals {
  return { carbsG: 0, fatG: 0, kcal: 0, mealCount: 0, proteinG: 0 };
}

function roundMetric(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
