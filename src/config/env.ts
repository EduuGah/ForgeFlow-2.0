const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

type PublicEnv = Record<string, string | undefined>;

export function resolveAppEnvironment(
  value: string | undefined,
): AppEnvironment {
  return APP_ENVIRONMENTS.some((environment) => environment === value)
    ? (value as AppEnvironment)
    : 'development';
}

export function normalizeOptionalUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

function readPublicEnv(key: string) {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: {
      env?: PublicEnv;
    };
  };

  return globalWithProcess.process?.env?.[key];
}

export const env = Object.freeze({
  apiBaseUrl: normalizeOptionalUrl(readPublicEnv('EXPO_PUBLIC_API_BASE_URL')),
  appEnv: resolveAppEnvironment(readPublicEnv('EXPO_PUBLIC_APP_ENV')),
});
