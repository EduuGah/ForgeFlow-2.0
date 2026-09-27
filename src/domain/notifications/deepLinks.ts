const routes = new Set(['goals', 'home', 'profile', 'progress', 'workouts']);

export function notificationDeepLink(
  data: Record<string, unknown> | null | undefined,
) {
  const explicitUrl = data?.url;
  if (typeof explicitUrl === 'string' && isAllowedUrl(explicitUrl)) {
    return explicitUrl;
  }

  const route = data?.route;
  if (typeof route !== 'string') return null;
  const normalized = route.toLowerCase();
  return routes.has(normalized) ? `forgeflow://${normalized}` : null;
}

function isAllowedUrl(value: string) {
  if (!value.startsWith('forgeflow://')) return false;
  const route = value.slice('forgeflow://'.length).split(/[/?#]/)[0];
  return routes.has(route);
}
