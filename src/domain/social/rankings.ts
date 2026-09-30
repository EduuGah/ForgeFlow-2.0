import type { EntityId, ISODateTimeString } from '../shared/types';

export type RankingMetric = 'consistency' | 'frequency' | 'volume';
export type RankingPeriod = '30_days' | '90_days' | '365_days';

export type RankingActivity = {
  completedAt: ISODateTimeString;
  userId: EntityId;
  volume: number;
  workoutCount: number;
};

export function calculateRankingValue(
  metric: RankingMetric,
  activities: readonly RankingActivity[],
  period: { from: ISODateTimeString; to: ISODateTimeString },
) {
  const included = activities.filter((activity) => {
    const value = Date.parse(activity.completedAt);
    return value >= Date.parse(period.from) && value <= Date.parse(period.to);
  });
  if (metric === 'volume') {
    return round(included.reduce((total, item) => total + item.volume, 0));
  }
  if (metric === 'frequency') {
    return included.reduce((total, item) => total + item.workoutCount, 0);
  }
  const activeWeeks = new Set(
    included.map((item) => weekKey(item.completedAt)),
  );
  const totalWeeks = Math.max(
    1,
    Math.ceil(
      (Date.parse(period.to) - Date.parse(period.from) + 1) / 604_800_000,
    ),
  );
  return round((activeWeeks.size / totalWeeks) * 100);
}

export function getRankingDateRange(
  period: RankingPeriod,
  now: ISODateTimeString,
) {
  const to = new Date(now);
  const days = period === '30_days' ? 30 : period === '90_days' ? 90 : 365;
  return {
    from: new Date(to.getTime() - (days - 1) * 86_400_000).toISOString(),
    to: to.toISOString(),
  };
}

function weekKey(value: ISODateTimeString) {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
