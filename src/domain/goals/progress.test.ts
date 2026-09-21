import type { Goal } from './entities';
import { evaluateGoalProgress } from './progress';

const createdAt = '2026-09-01T00:00:00.000Z';
const deadline = '2026-09-11T00:00:00.000Z';

describe('goal progress', () => {
  it('supports increasing and decreasing targets', () => {
    expect(evaluateGoalProgress(goal(), 150, createdAt)).toMatchObject({
      progressPercent: 50,
    });
    expect(
      evaluateGoalProgress(
        goal({ baselineValue: 100, targetValue: 80 }),
        90,
        createdAt,
      ),
    ).toMatchObject({ progressPercent: 50 });
  });

  it('uses elapsed deadline time to identify on-track and behind goals', () => {
    const halfway = '2026-09-06T00:00:00.000Z';
    expect(evaluateGoalProgress(goal(), 160, halfway).status).toBe('on_track');
    expect(evaluateGoalProgress(goal(), 140, halfway).status).toBe('behind');
    expect(
      evaluateGoalProgress(goal(), 100, '2026-09-01T00:00:01.000Z').status,
    ).toBe('on_track');
  });

  it('completes reached goals before evaluating their deadline', () => {
    expect(
      evaluateGoalProgress(goal(), 200, '2026-09-12T00:00:00.000Z'),
    ).toEqual({
      completedAt: '2026-09-12T00:00:00.000Z',
      progressPercent: 100,
      status: 'completed',
    });
  });

  it('expires overdue goals and keeps no-deadline goals active', () => {
    expect(
      evaluateGoalProgress(goal(), 150, '2026-09-12T00:00:00.000Z').status,
    ).toBe('expired');
    expect(
      evaluateGoalProgress(goal({ deadline: null }), 150, deadline).status,
    ).toBe('active');
  });
});

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    baselineValue: 100,
    completedAt: null,
    createdAt,
    deadline,
    deletedAt: null,
    exerciseId: null,
    id: 'goal-1',
    metric: 'custom_value',
    status: 'active',
    targetValue: 200,
    title: 'Meta',
    type: 'custom',
    updatedAt: createdAt,
    userId: 'user-1',
    ...overrides,
  };
}
