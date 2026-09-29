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

export function validatePublicEnvironment(input: {
  apiBaseUrl: string | null;
  appEnv: AppEnvironment;
}) {
  if (!input.apiBaseUrl) {
    if (input.appEnv === 'production') {
      throw new Error('EXPO_PUBLIC_API_BASE_URL is required in production.');
    }
    return input;
  }

  let url: URL;
  try {
    url = new URL(input.apiBaseUrl);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid URL.');
  }

  if (input.appEnv === 'production' && url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use HTTPS in production.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.');
  }

  return input;
}

function readPublicEnv(key: string) {
  const globalWithProcess = globalThis as typeof globalThis & {
    process?: {
      env?: PublicEnv;
    };
  };

  return globalWithProcess.process?.env?.[key];
}

export const env = Object.freeze(
  validatePublicEnvironment({
    apiBaseUrl: normalizeOptionalUrl(readPublicEnv('EXPO_PUBLIC_API_BASE_URL')),
    appEnv: resolveAppEnvironment(readPublicEnv('EXPO_PUBLIC_APP_ENV')),
  }),
);
