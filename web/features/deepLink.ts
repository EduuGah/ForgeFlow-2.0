import { useSyncExternalStore } from 'react';
import type { Route } from '../navigation/Navigator';

/*
 * Notifications open the app at "/?abrir=<link>". A link is read once at
 * startup, or comes from the service worker when the app is already open.
 */
const PARAM = 'abrir';

export type DeepTarget = { kind: 'route'; route: Route } | { kind: 'workout' };

/** What a link opens; null for anything unknown. */
export function targetOf(link: string): DeepTarget | null {
  const [kind, id] = link.split(':');
  const valid = (value: string | undefined): value is string =>
    Boolean(value && /^[\w-]{1,80}$/.test(value));
  switch (kind) {
    case 'chat':
      return valid(id)
        ? { kind: 'route', route: { name: 'chat', userId: id } }
        : null;
    case 'friend':
      return valid(id)
        ? { kind: 'route', route: { name: 'friend', userId: id } }
        : null;
    case 'social':
      return { kind: 'route', route: { name: 'social' } };
    case 'workout':
      return { kind: 'workout' };
    case 'mine':
      // One of the person's own finished workouts.
      return valid(id)
        ? { kind: 'route', route: { name: 'workout', workoutId: id } }
        : null;
    case 'messages':
      return { kind: 'route', route: { name: 'messages' } };
    case 'notifications':
      return { kind: 'route', route: { name: 'notifications' } };
    default:
      return null;
  }
}

function linkFromUrl(url: string): string | null {
  try {
    return new URL(url, window.location.origin).searchParams.get(PARAM);
  } catch {
    return null;
  }
}

let pending: string | null = null;
const listeners = new Set<() => void>();

function setPending(link: string | null) {
  pending = link;
  listeners.forEach((listener) => listener());
}

export function captureDeepLink() {
  const link = linkFromUrl(window.location.href);
  if (link) {
    pending = link;
    const url = new URL(window.location.href);
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
  }
  navigator.serviceWorker?.addEventListener('message', (event) => {
    const data = event.data as { type?: string; url?: string } | null;
    if (data?.type !== 'forgeflow-open' || !data.url) return;
    const next = linkFromUrl(data.url);
    if (next) setPending(next);
  });
}

export function useDeepLink(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => pending,
    () => pending,
  );
}

/** Hands the pending link over once (a second call gets null). */
export function takeDeepLink(): string | null {
  const link = pending;
  if (link) setPending(null);
  return link;
}
