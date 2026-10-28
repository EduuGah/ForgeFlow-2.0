import {
  deloadActive,
  deloadSets,
  emptyPlan,
  minuteToTime,
  plannedRoutine,
  readPlan,
  startDeload,
  suggestDeload,
  timeToMinute,
} from './trainingPlan';
import type { CompletedWorkout, WorkoutTemplateItem } from './types';

const thursday = new Date('2026-10-22T12:00:00');

describe('training plan', () => {
  it('reads stored plans defensively', () => {
    const plan = readPlan({
      days: ['a', null, 7, 'b'],
      reminder: { enabled: true, minute: 5000 },
      deloadUntil: 'amanhã',
    });
    expect(plan.days).toEqual(['a', null, null, 'b', null, null, null]);
    expect(plan.reminder).toEqual({ enabled: true, minute: 1080 });
    expect(plan.deloadUntil).toBeNull();
  });

  it("finds today's routine", () => {
    const templates = [{ id: 'push', name: 'Push' }] as WorkoutTemplateItem[];
    const plan = {
      ...emptyPlan(),
      days: [null, null, null, null, 'push', null, null],
    };
    expect(plannedRoutine(plan, templates, thursday)?.name).toBe('Push');
    expect(
      plannedRoutine({ ...plan, days: emptyPlan().days }, templates, thursday),
    ).toBeNull();
  });

  it('runs a deload until Sunday, with half the sets', () => {
    const plan = startDeload(emptyPlan(), thursday);
    expect(plan.deloadUntil).toBe('2026-10-25');
    expect(deloadActive(plan, new Date('2026-10-25T22:00:00'))).toBe(true);
    expect(deloadActive(plan, new Date('2026-10-26T08:00:00'))).toBe(false);
    expect([1, 3, 4, 5].map(deloadSets)).toEqual([1, 2, 2, 3]);
  });

  it('suggests a deload after 6 straight weeks', () => {
    const weekly = Array.from({ length: 6 }, (_, week) => ({
      completedAt: new Date(
        thursday.getTime() - week * 7 * 86_400_000,
      ).toISOString(),
    })) as CompletedWorkout[];
    expect(suggestDeload(weekly, emptyPlan(), thursday)).toBe(true);
    expect(suggestDeload(weekly.slice(0, 5), emptyPlan(), thursday)).toBe(
      false,
    );
    const recent = { ...emptyPlan(), lastDeloadAt: '2026-10-01' };
    expect(suggestDeload(weekly, recent, thursday)).toBe(false);
  });

  it('converts reminder times', () => {
    expect(minuteToTime(18 * 60 + 5)).toBe('18:05');
    expect(timeToMinute('06:30')).toBe(390);
    expect(timeToMinute('25:00')).toBeNull();
  });
});
