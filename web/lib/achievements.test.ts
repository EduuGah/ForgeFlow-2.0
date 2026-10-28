import {
  achievements,
  levelOf,
  levelStart,
  longestStreak,
  totalXp,
  workoutXp,
} from './achievements';
import type { CompletedWorkout, GoalItem } from './types';

const workout = (
  completedAt: string,
  fields: Partial<CompletedWorkout> = {},
): CompletedWorkout => ({
  id: completedAt,
  name: 'Treino',
  startedAt: completedAt,
  completedAt,
  durationMinutes: 60,
  totalVolumeKg: 5000,
  totalSets: 20,
  prsAchieved: [],
  exercises: [],
  ...fields,
});

describe('XP and levels', () => {
  it('rewards showing up, sets and records', () => {
    expect(workoutXp(workout('2026-10-01T10:00:00'))).toBe(90);
    expect(
      workoutXp(workout('2026-10-01T10:00:00', { prsAchieved: ['a', 'b'] })),
    ).toBe(150);
    const goals = [{ status: 'completed' }, { status: 'active' }] as GoalItem[];
    expect(totalXp([workout('2026-10-01T10:00:00')], goals)).toBe(190);
  });

  it('grows levels by 100, 200, 300… XP', () => {
    expect([1, 2, 3, 4, 5].map(levelStart)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelOf(0)).toMatchObject({
      level: 1,
      title: 'Iniciante',
      into: 0,
      span: 100,
    });
    expect(levelOf(650)).toMatchObject({ level: 4, into: 50, span: 400 });
    expect(levelOf(levelStart(10)).title).toBe('Atleta');
  });
});

describe('medals', () => {
  it('counts the longest streak of weeks ever', () => {
    const history = [
      '2026-01-05T10:00:00',
      '2026-01-12T10:00:00',
      '2026-01-20T10:00:00',
      '2026-03-02T10:00:00',
    ].map((date) => workout(date));
    expect(longestStreak(history)).toBe(3);
  });

  it('tracks progress toward each medal', () => {
    const history = [
      workout('2026-10-20T06:15:00', {
        prsAchieved: ['x'],
        durationMinutes: 130,
      }),
      workout('2026-10-21T23:00:00'),
    ];
    const list = achievements(history, [], new Date('2026-10-22T12:00:00'));
    const get = (id: string) => list.find((item) => item.id === id);
    expect(get('first')).toMatchObject({ progress: 1, target: 1 });
    expect(get('w10')).toMatchObject({ progress: 2, target: 10 });
    expect(get('early')?.progress).toBe(1);
    expect(get('late')?.progress).toBe(1);
    expect(get('long')?.progress).toBe(120);
    expect(get('r1')?.progress).toBe(1);
  });
});
