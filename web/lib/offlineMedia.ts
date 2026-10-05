import { MEDIA_FOLDERS } from '../data/exerciseMedia';

/* Same cache the service worker (public/sw.js) reads from. */
const CACHE = 'forgeflow-exercise-photos-v1';

/** Approximate size of all exercise photos, shown before downloading. */
export const EXERCISE_PHOTOS_MB = 3.4;

function photoUrls(): string[] {
  return MEDIA_FOLDERS.flatMap((folder) => {
    const base = `/exercises/${encodeURIComponent(folder)}`;
    return [`${base}/0.webp`, `${base}/1.webp`];
  });
}

export function offlinePhotosSupported(): boolean {
  return typeof caches !== 'undefined';
}

/** How many photos are already stored for offline use. */
export async function countOfflinePhotos(): Promise<{
  cached: number;
  total: number;
}> {
  const urls = photoUrls();
  if (!offlinePhotosSupported()) return { cached: 0, total: urls.length };
  const cache = await caches.open(CACHE);
  const keys = new Set(
    (await cache.keys()).map((request) => new URL(request.url).pathname),
  );
  return {
    cached: urls.filter((url) => keys.has(url)).length,
    total: urls.length,
  };
}

/** Downloads every exercise photo into the offline cache. */
export async function downloadOfflinePhotos(
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const urls = photoUrls();
  const cache = await caches.open(CACHE);
  let done = 0;
  const queue = [...urls];
  const worker = async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (!(await cache.match(url))) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Falha ao baixar ${url}`);
        await cache.put(url, response);
      }
      done += 1;
      onProgress(done, urls.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}

/** Registers public/sw.js in production builds (dev serves files directly). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Without the worker, photos still load online.
    });
  });
}
