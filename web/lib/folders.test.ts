import {
  LOOSE,
  canMoveFolder,
  flattenFolders,
  folderContents,
  folderLabel,
  folderParents,
  groupRoutines,
  moveFolder,
  nextFolderOrder,
  placeFolder,
  placeRoutine,
  removeFolder,
} from './folders';
import type { RoutineFolder, WorkoutTemplateItem } from './types';

const folder = (
  id: string,
  order: number,
  parentId?: string,
): RoutineFolder => ({
  id,
  name: id,
  ...(parentId ? { parentId } : {}),
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

/** Tree order as `id:order`, one dash per level. */
const tree = (folders: RoutineFolder[]) =>
  flattenFolders(folders).map(
    ({ folder: f, depth }) => `${'-'.repeat(depth)}${f.id}:${f.order}`,
  );

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
    expect(groupRoutines([], [])).toEqual([
      { folder: null, depth: 0, templates: [] },
    ]);
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

  it('drops a routine into a subfolder', () => {
    const changed = placeRoutine(
      [routine('a', 'gym', 0)],
      [...folders, folder('phase', 0, 'gym')],
      'a',
      'phase',
      0,
    );
    expect(changed).toEqual([
      expect.objectContaining({ id: 'a', folderId: 'phase', order: 0 }),
    ]);
  });

  it('moves folders to any position', () => {
    const result = placeFolder(
      [folder('a', 0), folder('b', 1), folder('c', 2)],
      'a',
      null,
      2,
    );
    expect(result?.folders.map((f) => f.id)).toEqual(['b', 'c', 'a']);
    expect(result?.changed.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
    expect(placeFolder([folder('a', 0)], 'a', null, 0)).toBeNull();
  });
});

describe('nested folders', () => {
  // gym ─┬─ phase-1 ── week-1
  //      └─ phase-2
  // home
  const nested = [
    folder('home', 1),
    folder('phase-2', 1, 'gym'),
    folder('week-1', 0, 'phase-1'),
    folder('gym', 0),
    folder('phase-1', 0, 'gym'),
  ];

  it('lists parents before their children, each level in its own order', () => {
    expect(tree(nested)).toEqual([
      'gym:0',
      '-phase-1:0',
      '--week-1:0',
      '-phase-2:1',
      'home:1',
    ]);
    expect(
      groupRoutines([routine('a', 'week-1')], nested).map((g) => [
        g.folder?.id,
        g.depth,
      ]),
    ).toEqual([
      ['gym', 0],
      ['phase-1', 1],
      ['week-1', 2],
      ['phase-2', 1],
      ['home', 0],
    ]);
    expect(folderLabel(nested, 'week-1')).toBe('gym › phase-1 › week-1');
  });

  it('treats folders without a known parent as top level (old data too)', () => {
    const parents = folderParents([
      folder('old', 0),
      folder('orphan', 1, 'deleted-elsewhere'),
      folder('self', 2, 'self'),
    ]);
    expect([...parents.values()]).toEqual([null, null, null]);
  });

  it('breaks a loop made on two devices the same way everywhere', () => {
    // Device A put x in y while device B put y in x.
    const looped = [
      folder('y', 0, 'x'),
      folder('x', 0, 'y'),
      folder('z', 0, 'y'),
    ];
    const parents = folderParents(looped);
    expect(parents.get('x')).toBeNull();
    expect(parents.get('y')).toBe('x');
    expect(parents.get('z')).toBe('y');
    expect(tree(looped)).toEqual(['x:0', '-y:0', '--z:0']);
    expect(folderParents([...looped].reverse())).toEqual(parents);
  });

  it('never puts a folder inside itself or below itself', () => {
    expect(canMoveFolder(nested, 'gym', 'gym')).toBe(false);
    expect(canMoveFolder(nested, 'gym', 'phase-1')).toBe(false);
    expect(canMoveFolder(nested, 'gym', 'week-1')).toBe(false);
    expect(canMoveFolder(nested, 'gym', 'missing')).toBe(false);
    expect(canMoveFolder(nested, 'gym', 'home')).toBe(true);
    expect(canMoveFolder(nested, 'week-1', null)).toBe(true);
    expect(placeFolder(nested, 'gym', 'week-1', 0)).toBeNull();
    expect(placeFolder(nested, 'phase-1', 'phase-1', 0)).toBeNull();
  });

  it('nests a folder at the end of another and closes the gap it left', () => {
    const result = placeFolder(
      [folder('a', 0), folder('b', 1), folder('c', 2)],
      'a',
      'c',
      Number.MAX_SAFE_INTEGER,
    );
    expect(tree(result!.folders)).toEqual(['b:0', 'c:1', '-a:0']);
    const byId = Object.fromEntries(result!.changed.map((f) => [f.id, f]));
    expect(byId.a).toMatchObject({ parentId: 'c', order: 0 });
    expect(byId.b.order).toBe(0);
    expect(byId.c.order).toBe(1);
  });

  it('moves a subfolder back to the top level without a parent key', () => {
    const result = placeFolder(nested, 'week-1', null, 1);
    expect(tree(result!.folders)).toEqual([
      'gym:0',
      '-phase-1:0',
      '-phase-2:1',
      'week-1:1',
      'home:2',
    ]);
    const week = result!.changed.find((f) => f.id === 'week-1');
    expect(week && 'parentId' in week).toBe(false);
  });

  it('reorders only among folders of the same parent', () => {
    const down = moveFolder(nested, 'phase-1', 1);
    expect(tree(down!.folders)).toEqual([
      'gym:0',
      '-phase-2:0',
      '-phase-1:1',
      '--week-1:0',
      'home:1',
    ]);
    expect(down!.changed.map((f) => f.id).sort()).toEqual([
      'phase-1',
      'phase-2',
    ]);
    // Last of its parent: it does not jump into the next top-level folder.
    expect(moveFolder(nested, 'phase-2', 1)).toBeNull();
    expect(moveFolder(nested, 'week-1', -1)).toBeNull();
    expect(nextFolderOrder(nested, 'gym')).toBe(2);
    expect(nextFolderOrder(nested, 'week-1')).toBe(0);
  });

  describe('deleting', () => {
    const templates = [
      routine('in-gym', 'gym', 0),
      routine('in-phase', 'phase-1', 0),
      routine('in-week', 'week-1', 0),
      routine('loose', undefined, 0),
    ];

    it('counts what a folder holds directly and below', () => {
      expect(folderContents(templates, nested, 'gym')).toEqual({
        routines: 1,
        subfolders: 2,
        allRoutines: 3,
        allSubfolders: 3,
      });
    });

    it('deletes the subfolders and their routines with the folder', () => {
      const result = removeFolder(templates, nested, 'gym', true)!;
      expect(result.deletedFolderIds.sort()).toEqual([
        'gym',
        'phase-1',
        'phase-2',
        'week-1',
      ]);
      expect(result.deletedTemplateIds.sort()).toEqual([
        'in-gym',
        'in-phase',
        'in-week',
      ]);
      expect(tree(result.folders)).toEqual(['home:1']);
      expect(result.changedTemplates).toEqual([]);
    });

    it('moves what a nested folder held up into its parent', () => {
      const result = removeFolder(templates, nested, 'phase-1', false)!;
      expect(result.deletedFolderIds).toEqual(['phase-1']);
      expect(result.deletedTemplateIds).toEqual([]);
      // week-1 takes the place of phase-1, before phase-2.
      expect(tree(result.folders)).toEqual([
        'gym:0',
        '-week-1:0',
        '-phase-2:1',
        'home:1',
      ]);
      expect(result.changedTemplates).toEqual([
        expect.objectContaining({ id: 'in-phase', folderId: 'gym', order: 1 }),
      ]);
    });

    it('moves what a top-level folder held to the top level', () => {
      const result = removeFolder(templates, nested, 'gym', false)!;
      expect(tree(result.folders)).toEqual([
        'phase-1:0',
        '-week-1:0',
        'phase-2:1',
        'home:2',
      ]);
      expect(result.changedFolders.every((f) => !('parentId' in f))).toBe(true);
      const moved = result.changedTemplates.find((t) => t.id === 'in-gym');
      expect(moved).toMatchObject({ order: 1 });
      expect(moved && 'folderId' in moved).toBe(false);
    });

    it('ignores folders that are already gone', () => {
      expect(removeFolder(templates, nested, 'missing', true)).toBeNull();
    });
  });
});
