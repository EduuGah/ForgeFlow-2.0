import type { AchievementMetric } from './catalog';
import type { PersonalRecord } from '../training/entities';

export type EstimatedOneRepMaxGrowth = {
  baseline: number;
  current: number;
  exerciseId: string;
  percent: number;
};

export type AchievementMetrics = {
  completedGoalCount: number;
  estimatedOneRepMaxGrowth: EstimatedOneRepMaxGrowth | null;
  personalRecordCount: number;
  trainingVolumeKg: number;
  weeklyStreak: number;
  workoutCount: number;
};

export function achievementMetricValue(
  metric: AchievementMetric,
  metrics: AchievementMetrics,
) {
  switch (metric) {
    case 'completed_goal_count':
      return metrics.completedGoalCount;
    case 'estimated_1rm_growth_percent':
      return metrics.estimatedOneRepMaxGrowth?.percent ?? 0;
    case 'personal_record_count':
      return metrics.personalRecordCount;
    case 'training_volume_kg':
      return metrics.trainingVolumeKg;
    case 'weekly_streak':
      return metrics.weeklyStreak;
    case 'workout_count':
      return metrics.workoutCount;
  }
}

export function getLongestWeeklyWorkoutStreak(completedAt: string[]) {
  const weeks = Array.from(
    new Set(completedAt.map((date) => mondayUtcTimestamp(date))),
  ).sort((left, right) => left - right);
  let longest = 0;
  let current = 0;
  let previous: number | null = null;

  for (const week of weeks) {
    current =
      previous !== null && week - previous === WEEK_MS ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = week;
  }

  return longest;
}

export function getBestEstimatedOneRepMaxGrowth(
  records: PersonalRecord[],
): EstimatedOneRepMaxGrowth | null {
  const groups = new Map<string, PersonalRecord[]>();

  for (const record of records) {
    if (record.recordType !== 'estimated_1rm') continue;
    const exerciseRecords = groups.get(record.exerciseId) ?? [];
    exerciseRecords.push(record);
    groups.set(record.exerciseId, exerciseRecords);
  }

  let best: EstimatedOneRepMaxGrowth | null = null;
  for (const [exerciseId, exerciseRecords] of groups) {
    const sorted = exerciseRecords.sort(
      (left, right) =>
        left.achievedAt.localeCompare(right.achievedAt) ||
        left.id.localeCompare(right.id),
    );
    const baseline = sorted[0]?.value ?? 0;
    if (baseline <= 0 || sorted.length < 2) continue;
    const current = Math.max(...sorted.slice(1).map((record) => record.value));
    const percent = ((current - baseline) / baseline) * 100;

    if (!best || percent > best.percent) {
      best = { baseline, current, exerciseId, percent };
    }
  }

  return best;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function mondayUtcTimestamp(value: string) {
  const date = new Date(value);
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysSinceMonday,
  );
}
