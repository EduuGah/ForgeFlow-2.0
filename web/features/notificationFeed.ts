import { useSyncExternalStore } from 'react';
import { getState, useStoreValue } from '../store';
import type { NotificationPrefs } from '../lib/types';
import { showSystemNotification } from '../lib/notify';
import { mergeFeed, type FeedItem, type FeedKind } from '../lib/feed';

/*
 * The bell: what happened while the person was away (friend requests,
 * messages, routines sent, records). Kept per account on this device.
 */

export type { FeedItem, FeedKind } from '../lib/feed';

function storageKey(owner: string | null) {
  return `forgeflow_notifications_${owner ?? 'guest'}`;
}

function load(owner: string | null): FeedItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(owner)) ?? '[]');
    return Array.isArray(raw) ? (raw as FeedItem[]) : [];
  } catch {
    return [];
  }
}

let owner: string | null | undefined;
let items: FeedItem[] = [];
const listeners = new Set<() => void>();

/** Switches to the signed-in account's list (or the guest's). */
function current(): FeedItem[] {
  const uid = getState().currentUser?.uid ?? null;
  if (owner !== uid) {
    owner = uid;
    items = load(uid);
  }
  return items;
}

function save(next: FeedItem[]) {
  items = next;
  try {
    localStorage.setItem(storageKey(owner ?? null), JSON.stringify(next));
  } catch {
    // Kept in memory for this visit.
  }
  listeners.forEach((listener) => listener());
}

export interface NewNotification {
  id: string;
  kind: FeedKind;
  title: string;
  body: string;
  link?: string;
  createdAt?: string;
}

/**
 * Lists events in the bell. With `system`, also shows a phone notification
 * when the app is in the background and that preference is on.
 */
export function notify(
  events: NewNotification[],
  options: { system?: keyof NotificationPrefs } = {},
) {
  if (events.length === 0) return;
  const now = new Date().toISOString();
  const { items: next, added } = mergeFeed(
    current(),
    events.map((event) => ({
      ...event,
      createdAt: event.createdAt ?? now,
      read: false,
    })),
  );
  if (added.length === 0) return;
  save(next);
  const pref = options.system;
  if (
    pref &&
    getState().notificationPrefs[pref] !== false &&
    document.visibilityState === 'hidden'
  ) {
    added.forEach(
      (item) =>
        void showSystemNotification({
          title: item.title,
          body: item.body,
          tag: item.id,
          link: item.link,
        }),
    );
  }
}

export function markAllRead() {
  const list = current();
  if (list.every((item) => item.read)) return;
  save(list.map((item) => (item.read ? item : { ...item, read: true })));
}

export function clearFeed() {
  current();
  save([]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNotificationFeed(): FeedItem[] {
  // Re-reads when the account changes.
  useStoreValue((state) => state.currentUser?.uid ?? null);
  return useSyncExternalStore(subscribe, current, current);
}

export function unreadNotifications(list: FeedItem[]): number {
  return list.filter((item) => !item.read).length;
}
