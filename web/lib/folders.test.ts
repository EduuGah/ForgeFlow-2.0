import { groupRoutines, moveFolder, nextFolderOrder } from './folders';
import type { RoutineFolder, WorkoutTemplateItem } from './types';

const folder = (id: string, order: number): RoutineFolder => ({
  id,
  name: id,
  order,
  createdAt: `2026-10-0${order + 1}T10:00:00.000Z`,
});

const routine = (id: string, folderId?: string): WorkoutTemplateItem => ({
  id,
  name: id,
  description: '',
  exercises: [],
  ...(folderId ? { folderId } : {}),
});

describe('groupRoutines', () => {
  it('lists folders in order and the routines without folder last', () => {
    const groups = groupRoutines(
      [
        routine('a', 'gym-2'),
        routine('b'),
        routine('c', 'gym-1'),
        routine('d', 'gone'),
      ],
      [folder('gym-2', 1), folder('gym-1', 0)],
    );
    expect(
      groups.map((group) => [
        group.folder?.id ?? null,
        group.templates.map((t) => t.id),
      ]),
    ).toEqual([
      ['gym-1', ['c']],
      ['gym-2', ['a']],
      [null, ['b', 'd']],
    ]);
  });

  it('keeps empty folders and omits the loose group when nothing is loose', () => {
    const groups = groupRoutines(
      [routine('a', 'x')],
      [folder('x', 0), folder('y', 1)],
    );
    expect(groups.map((group) => group.folder?.id)).toEqual(['x', 'y']);
  });

  it('returns one loose group when there are no folders', () => {
    expect(groupRoutines([], [])).toEqual([{ folder: null, templates: [] }]);
  });
});

describe('folder order', () => {
  it('appends new folders after the last one', () => {
    expect(nextFolderOrder([])).toBe(0);
    expect(nextFolderOrder([folder('a', 0), folder('b', 4)])).toBe(5);
  });

  it('swaps neighbours and renumbers only what changed', () => {
    const result = moveFolder(
      [folder('a', 0), folder('b', 1), folder('c', 2)],
      'c',
      -1,
    );
    expect(result?.folders.map((f) => [f.id, f.order])).toEqual([
      ['a', 0],
      ['c', 1],
      ['b', 2],
    ]);
    expect(result?.changed.map((f) => f.id).sort()).toEqual(['b', 'c']);
    expect(moveFolder([folder('a', 0)], 'a', -1)).toBeNull();
    expect(moveFolder([folder('a', 0)], 'missing', 1)).toBeNull();
  });
});
