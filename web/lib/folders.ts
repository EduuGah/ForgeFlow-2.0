import type { RoutineFolder, WorkoutTemplateItem } from './types';

export interface RoutineGroup {
  /** `null` groups the routines outside any folder. */
  folder: RoutineFolder | null;
  /** Nesting level of the folder (0 = top level, also for `null`). */
  depth: number;
  templates: WorkoutTemplateItem[];
}

function bySiblingOrder(a: RoutineFolder, b: RoutineFolder): number {
  return a.order - b.order || a.createdAt.localeCompare(b.createdAt);
}

/**
 * Parent of every folder (`null` = top level). A parent that no longer
 * exists (deleted on another device) counts as top level. Two devices can
 * also nest A in B and B in A at the same time: such a loop is broken at
 * the folder with the smallest id, so every device shows the same tree.
 */
export function folderParents(
  folders: RoutineFolder[],
): Map<string, string | null> {
  const known = new Set(folders.map((folder) => folder.id));
  const parents = new Map<string, string | null>();
  for (const folder of folders) {
    const parent = folder.parentId;
    parents.set(
      folder.id,
      parent && parent !== folder.id && known.has(parent) ? parent : null,
    );
  }
  const settled = new Set<string>();
  for (const folder of folders) {
    const path: string[] = [];
    let current: string | null = folder.id;
    while (current !== null && !settled.has(current)) {
      const loopStart = path.indexOf(current);
      if (loopStart !== -1) {
        const loop = path.slice(loopStart);
        parents.set(
          loop.reduce((a, b) => (b < a ? b : a)),
          null,
        );
        break;
      }
      path.push(current);
      current = parents.get(current) ?? null;
    }
    path.forEach((id) => settled.add(id));
  }
  return parents;
}

/** Folders directly inside `parentId` (`null` = top level), in order. */
export function childFolders(
  folders: RoutineFolder[],
  parentId: string | null,
  parents = folderParents(folders),
): RoutineFolder[] {
  return folders
    .filter((folder) => (parents.get(folder.id) ?? null) === parentId)
    .sort(bySiblingOrder);
}

export interface FolderNode {
  folder: RoutineFolder;
  depth: number;
}

/** Every folder in tree order (parents before their children), with depth. */
export function flattenFolders(folders: RoutineFolder[]): FolderNode[] {
  const parents = folderParents(folders);
  const nodes: FolderNode[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const folder of childFolders(folders, parentId, parents)) {
      nodes.push({ folder, depth });
      visit(folder.id, depth + 1);
    }
  };
  visit(null, 0);
  return nodes;
}

/** Folders in tree order: each parent is followed by its subfolders. */
export function sortFolders(folders: RoutineFolder[]): RoutineFolder[] {
  return flattenFolders(folders).map((node) => node.folder);
}

/** Ids of every folder below `id` (children, grandchildren…). */
export function folderDescendants(
  folders: RoutineFolder[],
  id: string,
  parents = folderParents(folders),
): Set<string> {
  const found = new Set<string>();
  const visit = (parentId: string) => {
    for (const folder of childFolders(folders, parentId, parents)) {
      found.add(folder.id);
      visit(folder.id);
    }
  };
  visit(id);
  return found;
}

/** Whether folder `id` may move into `parentId` (never into itself or below). */
export function canMoveFolder(
  folders: RoutineFolder[],
  id: string,
  parentId: string | null,
): boolean {
  if (!folders.some((folder) => folder.id === id)) return false;
  if (parentId === null) return true;
  if (parentId === id || !folders.some((folder) => folder.id === parentId))
    return false;
  return !folderDescendants(folders, id).has(parentId);
}

/** The folder and its ancestors, from the top level down. */
export function folderPath(
  folders: RoutineFolder[],
  id: string,
  parents = folderParents(folders),
): RoutineFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: RoutineFolder[] = [];
  let current: string | null = id;
  while (current !== null && byId.has(current)) {
    path.unshift(byId.get(current)!);
    current = parents.get(current) ?? null;
  }
  return path;
}

/** "Academia › Fase 1": a folder's name with its parents, for flat lists. */
export function folderLabel(folders: RoutineFolder[], id: string): string {
  return folderPath(folders, id)
    .map((folder) => folder.name)
    .join(' › ');
}

/**
 * Folders in tree order, each with its routines (in list order), followed
 * by the routines without a folder. Routines pointing to a folder that no
 * longer exists (deleted on another device) count as without a folder.
 */
export function groupRoutines(
  templates: WorkoutTemplateItem[],
  folders: RoutineFolder[],
): RoutineGroup[] {
  const known = new Set(folders.map((folder) => folder.id));
  const ordered = sortRoutines(templates);
  const groups: RoutineGroup[] = flattenFolders(folders).map(
    ({ folder, depth }) => ({
      folder,
      depth,
      templates: ordered.filter((template) => template.folderId === folder.id),
    }),
  );
  const loose = ordered.filter(
    (template) => !template.folderId || !known.has(template.folderId),
  );
  if (loose.length > 0 || groups.length === 0)
    groups.push({ folder: null, depth: 0, templates: loose });
  return groups;
}

/**
 * Routines in their dragged order; routines never dragged keep list order
 * after the ordered ones (a sort is stable).
 */
export function sortRoutines(
  templates: WorkoutTemplateItem[],
): WorkoutTemplateItem[] {
  return [...templates].sort(
    (a, b) =>
      (a.order ?? Number.MAX_SAFE_INTEGER) -
      (b.order ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Key of the group a routine belongs to: its folder id or `LOOSE`. */
export const LOOSE = 'loose';

export function groupKeyOf(
  template: WorkoutTemplateItem,
  folders: RoutineFolder[],
): string {
  return template.folderId &&
    folders.some((folder) => folder.id === template.folderId)
    ? template.folderId
    : LOOSE;
}

/** Applies a folder and order to a routine (no key at all = no folder). */
function withPlace(
  template: WorkoutTemplateItem,
  folderId: string | undefined,
  order: number,
): WorkoutTemplateItem | null {
  if (template.order === order && (template.folderId ?? undefined) === folderId)
    return null;
  const updated: WorkoutTemplateItem = { ...template, order };
  if (folderId) updated.folderId = folderId;
  else delete updated.folderId;
  return updated;
}

/**
 * Places a routine in a folder (or `LOOSE`) at `index`, renumbering the
 * routines of the groups involved. Returns only the routines that changed.
 */
export function placeRoutine(
  templates: WorkoutTemplateItem[],
  folders: RoutineFolder[],
  routineId: string,
  groupKey: string,
  index: number,
): WorkoutTemplateItem[] {
  const routine = templates.find((template) => template.id === routineId);
  if (!routine) return [];
  const source = groupKeyOf(routine, folders);
  const target =
    groupKey === LOOSE || folders.some((folder) => folder.id === groupKey)
      ? groupKey
      : LOOSE;
  const ordered = sortRoutines(templates);
  const members = (key: string) =>
    ordered.filter(
      (template) =>
        template.id !== routineId && groupKeyOf(template, folders) === key,
    );
  const targetList = members(target);
  targetList.splice(
    Math.max(0, Math.min(index, targetList.length)),
    0,
    routine,
  );

  const next = new Map<string, { folderId?: string; order: number }>();
  targetList.forEach((template, order) =>
    next.set(template.id, {
      folderId: target === LOOSE ? undefined : target,
      order,
    }),
  );
  if (source !== target)
    members(source).forEach((template, order) =>
      next.set(template.id, { folderId: template.folderId, order }),
    );

  const changed: WorkoutTemplateItem[] = [];
  for (const template of templates) {
    const update = next.get(template.id);
    if (!update) continue;
    const updated = withPlace(template, update.folderId, update.order);
    if (updated) changed.push(updated);
  }
  return changed;
}

/** Gives `list` the parent `parentId` and orders 0..n; returns what changed. */
function renumberFolders(
  list: RoutineFolder[],
  parentId: string | null,
): RoutineFolder[] {
  const changed: RoutineFolder[] = [];
  list.forEach((folder, order) => {
    if (folder.order === order && (folder.parentId ?? null) === parentId)
      return;
    const updated: RoutineFolder = { ...folder, order };
    if (parentId) updated.parentId = parentId;
    else delete updated.parentId;
    changed.push(updated);
  });
  return changed;
}

function applyFolders(
  folders: RoutineFolder[],
  changed: RoutineFolder[],
): RoutineFolder[] {
  const byId = new Map(changed.map((folder) => [folder.id, folder]));
  return sortFolders(folders.map((folder) => byId.get(folder.id) ?? folder));
}

/**
 * Puts a folder inside `parentId` (`null` = top level) at `index` among
 * the folders already there, renumbering both the old and the new parent.
 * Returns every folder (tree order) and the ones that changed, or `null`
 * when nothing changes or the move would put a folder inside itself.
 */
export function placeFolder(
  folders: RoutineFolder[],
  id: string,
  parentId: string | null,
  index: number,
): { folders: RoutineFolder[]; changed: RoutineFolder[] } | null {
  if (!canMoveFolder(folders, id, parentId)) return null;
  const parents = folderParents(folders);
  const moved = folders.find((folder) => folder.id === id)!;
  const source = parents.get(id) ?? null;
  const siblings = (key: string | null) =>
    childFolders(folders, key, parents).filter((folder) => folder.id !== id);

  const targetList = siblings(parentId);
  targetList.splice(Math.max(0, Math.min(index, targetList.length)), 0, moved);
  const changed = renumberFolders(targetList, parentId);
  if (source !== parentId)
    changed.push(...renumberFolders(siblings(source), source));
  if (changed.length === 0) return null;
  return { folders: applyFolders(folders, changed), changed };
}

export function nextFolderOrder(
  folders: RoutineFolder[],
  parentId: string | null = null,
): number {
  return (
    childFolders(folders, parentId).reduce(
      (max, folder) => Math.max(max, folder.order),
      -1,
    ) + 1
  );
}

/**
 * Moves a folder one position up or down among the folders of the same
 * parent. Returns every folder with its new `order` (renumbered 0..n so ties
 * from other devices cannot stick) and the ones that changed, or `null`
 * when it is already at the edge.
 */
export function moveFolder(
  folders: RoutineFolder[],
  id: string,
  direction: -1 | 1,
): { folders: RoutineFolder[]; changed: RoutineFolder[] } | null {
  const parents = folderParents(folders);
  if (!parents.has(id)) return null;
  const parentId = parents.get(id) ?? null;
  const siblings = childFolders(folders, parentId, parents);
  const target = siblings.findIndex((folder) => folder.id === id) + direction;
  if (target < 0 || target >= siblings.length) return null;
  return placeFolder(folders, id, parentId, target);
}

/** What a folder holds, directly and counting every subfolder. */
export function folderContents(
  templates: WorkoutTemplateItem[],
  folders: RoutineFolder[],
  id: string,
): {
  routines: number;
  subfolders: number;
  allRoutines: number;
  allSubfolders: number;
} {
  const parents = folderParents(folders);
  const below = folderDescendants(folders, id, parents);
  const inside = new Set([id, ...below]);
  return {
    routines: templates.filter((template) => template.folderId === id).length,
    subfolders: childFolders(folders, id, parents).length,
    allRoutines: templates.filter(
      (template) => template.folderId && inside.has(template.folderId),
    ).length,
    allSubfolders: below.size,
  };
}

export interface FolderRemoval {
  /** Folders left, in tree order. */
  folders: RoutineFolder[];
  deletedFolderIds: string[];
  /** Folders that moved up a level or got a new position. */
  changedFolders: RoutineFolder[];
  deletedTemplateIds: string[];
  /** Routines that moved up a level or got a new position. */
  changedTemplates: WorkoutTemplateItem[];
}

/**
 * Deletes a folder. With `withContents` its subfolders and every routine
 * below it go too. Otherwise what it held moves up one level: subfolders
 * take its place among its siblings and routines go after the routines of
 * its parent (or to "Sem pasta" for a top-level folder).
 */
export function removeFolder(
  templates: WorkoutTemplateItem[],
  folders: RoutineFolder[],
  id: string,
  withContents: boolean,
): FolderRemoval | null {
  if (!folders.some((folder) => folder.id === id)) return null;
  const parents = folderParents(folders);

  if (withContents) {
    const gone = new Set([id, ...folderDescendants(folders, id, parents)]);
    return {
      folders: sortFolders(folders.filter((folder) => !gone.has(folder.id))),
      deletedFolderIds: [...gone],
      changedFolders: [],
      deletedTemplateIds: templates
        .filter((template) => template.folderId && gone.has(template.folderId))
        .map((template) => template.id),
      changedTemplates: [],
    };
  }

  const parentId = parents.get(id) ?? null;
  const siblings = childFolders(folders, parentId, parents);
  const at = siblings.findIndex((folder) => folder.id === id);
  const changedFolders = renumberFolders(
    [
      ...siblings.slice(0, at),
      ...childFolders(folders, id, parents),
      ...siblings.slice(at + 1),
    ],
    parentId,
  );
  const left = folders.filter((folder) => folder.id !== id);

  const targetKey = parentId ?? LOOSE;
  const ordered = sortRoutines(templates);
  const changedTemplates = [
    ...ordered.filter(
      (template) => groupKeyOf(template, folders) === targetKey,
    ),
    ...ordered.filter((template) => template.folderId === id),
  ]
    .map((template, order) => withPlace(template, parentId ?? undefined, order))
    .filter((template): template is WorkoutTemplateItem => template !== null);

  return {
    folders: applyFolders(left, changedFolders),
    deletedFolderIds: [id],
    changedFolders,
    deletedTemplateIds: [],
    changedTemplates,
  };
}
