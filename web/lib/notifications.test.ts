import { detectBrowser, installSteps } from './install';
import { mergeFeed, type FeedItem } from './feed';
import { progressBar, workoutProgressNotice } from './workoutProgress';
import { targetOf } from '../features/deepLink';
import type { ActiveWorkoutState, RestTimerState, SetEntry } from './types';

const UA = {
  operaAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 OPR/85.0.4500.0',
  operaMini:
    'Opera/9.80 (Android; Opera Mini/36.2.2254/119.132; U; id) Presto/2.12.423 Version/12.16',
  chrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  firefox:
    'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
};

describe('installing the app', () => {
  it('recognizes the browsers that install from their own menu', () => {
    expect(detectBrowser(UA.operaAndroid)).toBe('opera');
    expect(detectBrowser(UA.operaMini)).toBe('opera-mini');
    expect(detectBrowser(UA.chrome)).toBe('chromium');
    expect(detectBrowser(UA.samsung)).toBe('samsung');
    expect(detectBrowser(UA.iphone)).toBe('ios');
    expect(detectBrowser(UA.firefox)).toBe('firefox');
  });

  it('explains where to tap in Opera', () => {
    expect(installSteps('opera').join(' ')).toMatch(/tela inicial/i);
    expect(installSteps('opera-mini').join(' ')).toMatch(/não instala/);
  });
});

describe('the bell', () => {
  const item = (id: string, createdAt: string): FeedItem => ({
    id,
    kind: 'message',
    title: id,
    body: '',
    createdAt,
    read: false,
  });

  it('never lists the same event twice and keeps the newest first', () => {
    const first = mergeFeed([], [item('a', '2026-10-27T10:00:00Z')]);
    const second = mergeFeed(first.items, [
      item('a', '2026-10-27T10:00:00Z'),
      item('b', '2026-10-27T11:00:00Z'),
      item('b', '2026-10-27T11:00:00Z'),
    ]);
    expect(second.added.map((entry) => entry.id)).toEqual(['b']);
    expect(second.items.map((entry) => entry.id)).toEqual(['b', 'a']);
    expect(mergeFeed(second.items, [item('a', 'x')]).items).toBe(second.items);
  });

  it('keeps only the most recent items', () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      item(`n${i}`, `2026-10-2${i}T00:00:00Z`),
    );
    expect(mergeFeed([], many, 3).items.map((entry) => entry.id)).toEqual([
      'n4',
      'n3',
      'n2',
    ]);
  });
});

describe('notification links', () => {
  it('opens chats, friends, the workout and lists', () => {
    expect(targetOf('chat:abc-123')).toEqual({
      kind: 'route',
      route: { name: 'chat', userId: 'abc-123' },
    });
    expect(targetOf('workout')).toEqual({ kind: 'workout' });
    expect(targetOf('messages')).toEqual({
      kind: 'route',
      route: { name: 'messages' },
    });
  });

  it('ignores anything unknown or malformed', () => {
    expect(targetOf('chat:')).toBeNull();
    expect(targetOf('chat:<script>')).toBeNull();
    expect(targetOf('settings')).toBeNull();
  });
});

describe('workout progress notification', () => {
  const set = (completed: boolean): SetEntry =>
    ({
      id: Math.random().toString(),
      setNumber: 1,
      setType: 'working',
      weightKg: 40,
      repetitions: 10,
      completed,
    }) as SetEntry;
  const workout: ActiveWorkoutState = {
    id: 's',
    name: 'Treino A',
    startedAt: '2026-10-27T10:00:00',
    exercises: [
      {
        key: 'a',
        exerciseId: 'a',
        exerciseName: 'Supino',
        primaryMuscleGroup: 'Peito',
        equipment: null,
        restSeconds: 90,
        sets: [set(true), set(true)],
      },
      {
        key: 'b',
        exerciseId: 'b',
        exerciseName: 'Remada',
        primaryMuscleGroup: 'Costas',
        equipment: null,
        restSeconds: 90,
        sets: [set(false), set(false)],
      },
    ],
  };
  const now = new Date('2026-10-27T10:25:00').getTime();

  it('draws a text progress bar', () => {
    expect(progressBar(0.5)).toBe('▰▰▰▰▰▱▱▱▱▱');
    expect(progressBar(2)).toBe('▰▰▰▰▰▰▰▰▰▰');
    expect(progressBar(Number.NaN)).toBe('▱▱▱▱▱▱▱▱▱▱');
  });

  it('shows progress, time, the rest end and what comes next', () => {
    const resting = {
      status: 'running',
      endsAt: new Date('2026-10-27T10:26:30').getTime(),
    } as RestTimerState;
    const notice = workoutProgressNotice(workout, resting, now);
    expect(notice.title).toBe('Treino A em andamento');
    expect(notice.body.split('\n')).toEqual([
      '▰▰▰▰▰▱▱▱▱▱ 2/4 séries · 25 min',
      'Descanso até 10:26',
      'Agora: Remada',
    ]);
  });
});
