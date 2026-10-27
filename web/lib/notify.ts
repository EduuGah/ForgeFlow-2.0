/*
 * System notifications. On Android a page cannot use `new Notification()`;
 * they go through the service worker, which also shows Web Push messages
 * that arrive while the app is closed (public/sw.js).
 */

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function notificationPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window))
    return 'unsupported';
  return Notification.permission;
}

export async function askNotificationPermission(): Promise<NotifyPermission> {
  if (notificationPermission() === 'unsupported') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

async function workerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

export interface SystemNotification {
  title: string;
  body: string;
  /** Same tag = replaces the previous one instead of piling up. */
  tag?: string;
  /** Deep link opened on tap, e.g. "chat:<id>" (see features/deepLink). */
  link?: string;
  silent?: boolean;
  /** Buzz again even when replacing a notification with the same tag. */
  renotify?: boolean;
  requireInteraction?: boolean;
}

/** Options the DOM typings lack but browsers support. */
type FullOptions = NotificationOptions & {
  renotify?: boolean;
  vibrate?: number[];
  badge?: string;
};

export function linkUrl(link?: string): string {
  return link ? `/?abrir=${encodeURIComponent(link)}` : '/';
}

/** Shows it when allowed; false when it could not. */
export async function showSystemNotification(
  notification: SystemNotification,
): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false;
  const options: FullOptions = {
    body: notification.body,
    tag: notification.tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/favicon-32.png',
    data: { url: linkUrl(notification.link) },
    silent: notification.silent ?? false,
    renotify: Boolean(notification.tag && notification.renotify),
    requireInteraction: notification.requireInteraction ?? false,
    ...(notification.silent ? {} : { vibrate: [120, 60, 120] }),
  };
  try {
    const registration = await workerRegistration();
    if (registration) {
      await registration.showNotification(notification.title, options);
    } else {
      // Desktop without the worker (dev server): plain notification.
      new Notification(notification.title, options);
    }
    return true;
  } catch {
    return false;
  }
}

export async function closeSystemNotification(tag: string): Promise<void> {
  const registration = await workerRegistration();
  if (!registration) return;
  try {
    const open = await registration.getNotifications({ tag });
    open.forEach((item) => item.close());
  } catch {
    // Nothing to close.
  }
}

/* ------------------------------------------------------------------ */
/* Web Push (notifications with the app closed)                        */
/* ------------------------------------------------------------------ */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  string | undefined;

export function pushAvailable(): boolean {
  return (
    Boolean(VAPID_PUBLIC_KEY) &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'serviceWorker' in navigator
  );
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export interface PushKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * This device's push subscription (created when missing), or null when push
 * is unavailable or not allowed.
 */
export async function pushSubscription(): Promise<PushKeys | null> {
  if (!pushAvailable() || notificationPermission() !== 'granted') return null;
  const registration = await workerRegistration();
  if (!registration) return null;
  try {
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID_PUBLIC_KEY!),
      }));
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
    return {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    };
  } catch {
    return null;
  }
}

/** Stops push on this device (e.g. signing out); returns the old endpoint. */
export async function dropPushSubscription(): Promise<string | null> {
  const registration = await workerRegistration();
  const subscription = await registration?.pushManager
    .getSubscription()
    .catch(() => null);
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => false);
  return endpoint;
}
