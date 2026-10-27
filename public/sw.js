/*
 * ForgeFlow service worker.
 *
 * - App shell (the page and its build files), so the installed app opens with
 *   no connection. The page is network-first, so a deploy shows up on the next
 *   online open; /assets/* have hashed names and never change: cache-first.
 * - Exercise photos (/exercises/*), cache-first, so the demos keep working at
 *   the gym. Keep PHOTOS in sync with web/lib/offlineMedia.ts.
 *
 * - Notifications: shows Web Push messages (sent by the `push` Supabase
 *   function while the app may be closed) and, on tap, opens the app on the
 *   screen the notification is about.
 *
 * Every other request (Supabase, Google sign-in) goes to the network untouched.
 */
const PHOTOS = 'forgeflow-exercise-photos-v1';
const SHELL = 'forgeflow-shell-v1';
const PAGE = '/index.html';
const STATIC = /^\/(assets|icons|fonts)\/|^\/manifest\.webmanifest$/;
/** Builds pile up in the cache; this keeps the last few deploys. */
const MAX_SHELL_ENTRIES = 80;
/** On a weak gym signal, open from the cache instead of waiting. */
const PAGE_TIMEOUT_MS = 4000;

function isHtml(response) {
  return (
    response.ok &&
    (response.headers.get('content-type') || '').includes('text/html')
  );
}

async function trimShell() {
  const cache = await caches.open(SHELL);
  const keys = (await cache.keys()).filter(
    (request) => new URL(request.url).pathname !== PAGE,
  );
  // Oldest first (insertion order).
  const extra = keys.length - MAX_SHELL_ENTRIES;
  await Promise.all(
    keys.slice(0, Math.max(0, extra)).map((key) => cache.delete(key)),
  );
}

/** Stores the page and every file it links, so the first install is enough. */
async function cacheShell() {
  const response = await fetch(PAGE, { cache: 'no-cache' });
  if (!isHtml(response)) return;
  const html = await response.clone().text();
  const cache = await caches.open(SHELL);
  await cache.put(PAGE, response);
  const files = [
    ...html.matchAll(
      /(?:src|href)="(\/(?:assets|icons|fonts)\/[^"]+|\/manifest\.webmanifest)"/g,
    ),
  ].map((match) => match[1]);
  await Promise.all(
    files.map(async (file) => {
      if (!(await cache.match(file))) await cache.add(file).catch(() => {});
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheShell()
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('forgeflow-') && key !== PHOTOS && key !== SHELL,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function openPage(event) {
  const cache = await caches.open(SHELL);
  const network = fetch(event.request).then(async (response) => {
    if (isHtml(response)) {
      await cache.put(PAGE, response.clone());
      await trimShell();
    }
    return response;
  });
  // Keeps the cache update going after a cached answer was already served.
  event.waitUntil(network.catch(() => {}));

  const cached = await cache.match(PAGE);
  if (!cached) return network;
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS),
  );
  return Promise.race([network.catch(() => cached), timeout]);
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(openPage(event));
  } else if (url.pathname.startsWith('/exercises/')) {
    event.respondWith(cacheFirst(PHOTOS, request));
  } else if (STATIC.test(url.pathname)) {
    event.respondWith(cacheFirst(SHELL, request));
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'ForgeFlow';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // The app is on screen: it already shows this itself.
      if (
        windows.some(
          (client) => client.visibilityState === 'visible' && client.focused,
        )
      )
        return;
      await self.registration.showNotification(title, {
        body: data.body || '',
        tag: data.tag,
        renotify: Boolean(data.tag),
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        vibrate: [120, 60, 120],
        data: { url: data.url || '/' },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const open = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (open) {
        // The app is running: let it navigate without reloading.
        await open.focus();
        open.postMessage({ type: 'forgeflow-open', url });
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
