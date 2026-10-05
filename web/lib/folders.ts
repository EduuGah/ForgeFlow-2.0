import type { RoutineFolder, WorkoutTemplateItem } from './types';

export interface RoutineGroup {
  /** `null` groups the routines outside any folder. */
  folder: RoutineFolder | null;
  templates: WorkoutTemplateItem[];
}

export function sortFolders(folders: RoutineFolder[]): RoutineFolder[] {
  return [...folders].sort(
    (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
  );
}

/**
 * Folders in their order, each with its routines (in list order), followed
 * by the routines without a folder. Routines pointing to a folder that no
 * longer exists (deleted on another device) count as without a folder.
 */
export function groupRoutines(
  templates: WorkoutTemplateItem[],
  folders: RoutineFolder[],
): RoutineGroup[] {
  const known = new Set(folders.map((folder) => folder.id));
  const ordered = sortRoutines(templates);
  const groups: RoutineGroup[] = sortFolders(folders).map((folder) => ({
    folder,
    templates: ordered.filter((template) => template.folderId === folder.id),
  }));
  const loose = ordered.filter(
    (template) => !template.folderId || !known.has(template.folderId),
  );
  if (loose.length > 0 || groups.length === 0)
    groups.push({ folder: null, templates: loose });
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
    if (
      template.order === update.order &&
      (template.folderId ?? undefined) === update.folderId
    )
      continue;
    const updated: WorkoutTemplateItem = { ...template, order: update.order };
    if (update.folderId) updated.folderId = update.folderId;
    else delete updated.folderId;
    changed.push(updated);
  }
  return changed;
}

/** Moves a folder to `index`, renumbering every folder that changed. */
export function reorderFolder(
  folders: RoutineFolder[],
  id: string,
  index: number,
): { folders: RoutineFolder[]; changed: RoutineFolder[] } | null {
  const ordered = sortFolders(folders);
  const from = ordered.findIndex((folder) => folder.id === id);
  const to = Math.max(0, Math.min(index, ordered.length - 1));
  if (from === -1 || from === to) return null;
  const [moved] = ordered.splice(from, 1);
  ordered.splice(to, 0, moved);
  const changed: RoutineFolder[] = [];
  const renumbered = ordered.map((folder, order) => {
    if (folder.order === order) return folder;
    const updated = { ...folder, order };
    changed.push(updated);
    return updated;
  });
  return { folders: renumbered, changed };
}

export function nextFolderOrder(folders: RoutineFolder[]): number {
  return folders.reduce((max, folder) => Math.max(max, folder.order), -1) + 1;
}

/**
 * Moves a folder one position up or down. Returns every folder with its new
 * `order` (renumbered 0..n so ties from other devices cannot stick) and the
 * ones that changed, or `null` when it is already at the edge.
 */
export function moveFolder(
  folders: RoutineFolder[],
  id: string,
  direction: -1 | 1,
): { folders: RoutineFolder[]; changed: RoutineFolder[] } | null {
  const ordered = sortFolders(folders);
  const index = ordered.findIndex((folder) => folder.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ordered.length) return null;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const changed: RoutineFolder[] = [];
  const renumbered = ordered.map((folder, order) => {
    if (folder.order === order) return folder;
    const updated = { ...folder, order };
    changed.push(updated);
    return updated;
  });
  return { folders: renumbered, changed };
}
