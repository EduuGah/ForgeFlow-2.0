import {
  calculateRankingValue,
  getRankingDateRange,
  type RankingActivity,
} from './rankings';

const activities: RankingActivity[] = [
  {
    completedAt: '2026-09-29T12:00:00.000Z',
    userId: 'user-1',
    volume: 1000,
    workoutCount: 1,
  },
  {
    completedAt: '2026-09-22T12:00:00.000Z',
    userId: 'user-1',
    volume: 800,
    workoutCount: 1,
  },
  {
    completedAt: '2026-08-01T12:00:00.000Z',
    userId: 'user-1',
    volume: 500,
    workoutCount: 1,
  },
];

describe('social ranking metrics', () => {
  const range = getRankingDateRange('30_days', '2026-09-30T23:59:59.999Z');

  it('uses the same period boundaries for volume and frequency', () => {
    expect(calculateRankingValue('volume', activities, range)).toBe(1800);
    expect(calculateRankingValue('frequency', activities, range)).toBe(2);
  });

  it('measures consistency by active week coverage', () => {
    expect(calculateRankingValue('consistency', activities, range)).toBe(40);
  });
});
