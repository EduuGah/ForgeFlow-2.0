import { mergeById } from './training';

/** A cloud row: the item lives whole in `data`. */
export interface SyncRow {
  id: string;
  data: Record<string, unknown>;
}

export interface Reconciled<T> {
  /** The collection as it should be on this device. */
  merged: T[];
  /** Items the cloud lacks or has stale/broken: send them (whole) again. */
  upload: T[];
  /** Rows deleted here whose delete never reached the server. */
  deleteAgain: string[];
}

/**
 * Merges one cloud collection into the local one. The cloud wins, except:
 * - ids deleted here (`deletedIds`) stay deleted and are deleted again;
 * - ids changed here but not confirmed (`unsentIds`) keep the local copy;
 * - rows written by older versions' partial updates (no `id` left in `data`)
 *   are rebuilt over the local copy, or dropped when there is none.
 */
export function reconcileCollection<T extends { id: string }>(
  rows: SyncRow[],
  local: T[],
  deletedIds: ReadonlySet<string>,
  unsentIds: ReadonlySet<string>,
): Reconciled<T> {
  const localById = new Map(local.map((item) => [item.id, item]));
  const remote: T[] = [];
  const rebuilt: T[] = [];
  const deleteAgain: string[] = [];

  for (const row of rows) {
    if (deletedIds.has(row.id)) {
      deleteAgain.push(row.id);
      continue;
    }
    const mine = localById.get(row.id);
    if (mine && unsentIds.has(row.id)) continue;
    if (row.data.id === row.id) {
      remote.push(row.data as unknown as T);
    } else if (mine) {
      const fixed = { ...mine, ...row.data, id: row.id } as T;
      remote.push(fixed);
      rebuilt.push(fixed);
    }
  }

  const { merged, localOnly } = mergeById(local, remote, deletedIds);
  return { merged, upload: [...localOnly, ...rebuilt], deleteAgain };
}
