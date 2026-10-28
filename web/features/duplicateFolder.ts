import { actions, getState } from '../store';
import type { RoutineFolder } from '../lib/types';

/**
 * Copies a folder with everything inside (subfolders and routines) next to
 * the original, named "<name> (cópia)". Returns the new folder's id and how
 * many routines were copied.
 */
export function duplicateFolder(
  folderId: string,
): { id: string; routines: number } | null {
  const { folders, templates } = getState();
  const source = folders.find((folder) => folder.id === folderId);
  if (!source) return null;
  const byOrder = (a: { order?: number }, b: { order?: number }) =>
    (a.order ?? 0) - (b.order ?? 0);
  let routines = 0;

  const copy = (
    folder: RoutineFolder,
    parentId: string | null,
    name: string,
  ): string => {
    const id = actions.createFolder(name, parentId);
    templates
      .filter((template) => template.folderId === folder.id)
      .sort(byOrder)
      .forEach((template) => {
        actions.createTemplate({
          name: template.name,
          description: template.description,
          exercises: template.exercises,
          folderId: id,
        });
        routines += 1;
      });
    folders
      .filter((child) => child.parentId === folder.id)
      .sort(byOrder)
      .forEach((child) => copy(child, id, child.name));
    return id;
  };

  const id = copy(source, source.parentId ?? null, `${source.name} (cópia)`);
  return { id, routines };
}
