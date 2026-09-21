import type { PersonalRecord } from '../training/entities';
import {
  getBestEstimatedOneRepMaxGrowth,
  getLongestWeeklyWorkoutStreak,
} from './rules';

describe('achievement rules', () => {
  it('counts unique consecutive UTC weeks starting on Monday', () => {
    expect(
      getLongestWeeklyWorkoutStreak([
        '2026-08-31T10:00:00.000Z',
        '2026-09-02T10:00:00.000Z',
        '2026-09-07T10:00:00.000Z',
        '2026-09-14T10:00:00.000Z',
        '2026-09-28T10:00:00.000Z',
      ]),
    ).toBe(3);
  });

  it('uses the first estimated 1RM as baseline and selects the best exercise growth', () => {
    expect(
      getBestEstimatedOneRepMaxGrowth([
        record('bench-start', 'bench', 100, '2026-01-01T00:00:00.000Z'),
        record('bench-current', 'bench', 125, '2026-02-01T00:00:00.000Z'),
        record('squat-start', 'squat', 200, '2026-01-01T00:00:00.000Z'),
        record('squat-current', 'squat', 220, '2026-02-01T00:00:00.000Z'),
      ]),
    ).toEqual({
      baseline: 100,
      current: 125,
      exerciseId: 'bench',
      percent: 25,
    });
  });
});

function record(
  id: string,
  exerciseId: string,
  value: number,
  achievedAt: string,
): PersonalRecord {
  return {
    achievedAt,
    contextWeightKg: null,
    createdAt: achievedAt,
    exerciseId,
    id,
    recordType: 'estimated_1rm',
    sourceSetId: `set-${id}`,
    updatedAt: achievedAt,
    userId: 'user-1',
    value,
  };
}
