import {
  LOOSE,
  groupRoutines,
  moveFolder,
  nextFolderOrder,
  placeRoutine,
  reorderFolder,
} from './folders';
import type { RoutineFolder, WorkoutTemplateItem } from './types';

const folder = (id: string, order: number): RoutineFolder => ({
  id,
  name: id,
  order,
  createdAt: `2026-10-0${order + 1}T10:00:00.000Z`,
});

const routine = (
  id: string,
  folderId?: string,
  order?: number,
): WorkoutTemplateItem => ({
  id,
  name: id,
  description: '',
  exercises: [],
  ...(folderId ? { folderId } : {}),
  ...(order !== undefined ? { order } : {}),
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

describe('dragging routines', () => {
  const folders = [folder('gym', 0), folder('home', 1)];

  it('sorts routines by their dragged order, untouched ones after', () => {
    const groups = groupRoutines(
      [routine('a', 'gym'), routine('b', 'gym', 1), routine('c', 'gym', 0)],
      folders,
    );
    expect(groups[0].templates.map((t) => t.id)).toEqual(['c', 'b', 'a']);
  });

  it('reorders inside a folder and renumbers only what changed', () => {
    const templates = [
      routine('a', 'gym', 0),
      routine('b', 'gym', 1),
      routine('c', 'gym', 2),
    ];
    const changed = placeRoutine(templates, folders, 'c', 'gym', 0);
    expect(changed.map((t) => [t.id, t.order])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 0],
    ]);
    expect(placeRoutine(templates, folders, 'b', 'gym', 1)).toEqual([]);
  });

  it('moves a routine to another folder and closes the gap it left', () => {
    const templates = [
      routine('a', 'gym', 0),
      routine('b', 'gym', 1),
      routine('c', 'gym', 2),
      routine('x', 'home', 0),
    ];
    const changed = placeRoutine(templates, folders, 'a', 'home', 1);
    const byId = Object.fromEntries(changed.map((t) => [t.id, t]));
    expect(byId.a).toMatchObject({ folderId: 'home', order: 1 });
    expect(byId.b.order).toBe(0);
    expect(byId.c.order).toBe(1);
    expect(byId.x).toBeUndefined();
  });

  it('takes a routine out of its folder', () => {
    const changed = placeRoutine(
      [routine('a', 'gym', 0), routine('l')],
      folders,
      'a',
      LOOSE,
      5,
    );
    const a = changed.find((t) => t.id === 'a');
    expect(a?.folderId).toBeUndefined();
    expect('folderId' in (a ?? {})).toBe(false);
    expect(a?.order).toBe(1);
  });

  it('moves folders to any position', () => {
    const result = reorderFolder(
      [folder('a', 0), folder('b', 1), folder('c', 2)],
      'a',
      2,
    );
    expect(result?.folders.map((f) => f.id)).toEqual(['b', 'c', 'a']);
    expect(result?.changed.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
    expect(reorderFolder([folder('a', 0)], 'a', 0)).toBeNull();
  });
});
