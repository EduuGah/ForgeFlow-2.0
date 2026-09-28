import type { GoalMetric, GoalStatus, GoalType } from '../goals/entities';
import type { HydrationEntry } from '../hydration/entities';
import type { Meal, NutritionTotals } from '../nutrition/entities';
import type { EntityId, ISODateTimeString } from '../shared/types';
import type { TrainingAnalytics } from '../training/analytics';

export type ReportPeriod = {
  from: ISODateTimeString;
  to: ISODateTimeString;
};

export type ConsolidatedReport = {
  bodyWeight: {
    entries: {
      recordedAt: ISODateTimeString;
      weightKg: number;
    }[];
    status: 'available' | 'unavailable';
  };
  generatedAt: ISODateTimeString;
  goals: {
    activeCount: number;
    behindCount: number;
    completedCount: number;
    items: {
      deadline: ISODateTimeString | null;
      id: EntityId;
      measuredValue: number | null;
      metric: GoalMetric;
      progressPercent: number;
      status: GoalStatus;
      targetValue: number;
      title: string;
      type: GoalType;
    }[];
    totalCount: number;
  };
  hydration: {
    averageDailyMl: number;
    daily: { date: string; totalMl: number }[];
    entries: HydrationEntry[];
    goalDaysReached: number | null;
    targetMl: number | null;
    totalMl: number;
  };
  nutrition: {
    averageDailyKcal: number;
    daily: ({ date: string } & NutritionTotals)[];
    meals: Meal[];
    totals: NutritionTotals;
  };
  period: ReportPeriod;
  schemaVersion: 1;
  training: TrainingAnalytics;
  userId: EntityId;
};
