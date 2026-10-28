/* The bell's list: pure helpers (see features/notificationFeed). */

export type FeedKind =
  | 'message'
  | 'request'
  | 'friend'
  | 'share'
  | 'record'
  | 'goal'
  | 'reaction'
  | 'comment'
  | 'group';

export interface FeedItem {
  /** Stable per event, so the same event is never listed twice. */
  id: string;
  kind: FeedKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Deep link opened on tap (see features/deepLink). */
  link?: string;
}

const MAX_ITEMS = 60;

/** Adds items not seen before, newest first; returns the ones added. */
export function mergeFeed(
  existing: FeedItem[],
  incoming: FeedItem[],
  max = MAX_ITEMS,
): { items: FeedItem[]; added: FeedItem[] } {
  const known = new Set(existing.map((item) => item.id));
  const added = incoming.filter((item) => {
    if (known.has(item.id)) return false;
    known.add(item.id);
    return true;
  });
  if (added.length === 0) return { items: existing, added };
  const merged = [...added, ...existing]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, max);
  return { items: merged, added };
}
