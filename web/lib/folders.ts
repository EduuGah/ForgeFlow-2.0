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
  const groups: RoutineGroup[] = sortFolders(folders).map((folder) => ({
    folder,
    templates: templates.filter((template) => template.folderId === folder.id),
  }));
  const loose = templates.filter(
    (template) => !template.folderId || !known.has(template.folderId),
  );
  if (loose.length > 0 || groups.length === 0)
    groups.push({ folder: null, templates: loose });
  return groups;
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
