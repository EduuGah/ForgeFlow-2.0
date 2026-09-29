import {
  normalizeOptionalUrl,
  resolveAppEnvironment,
  validatePublicEnvironment,
} from './env';

describe('environment config', () => {
  it('falls back to development for missing or unknown app environments', () => {
    expect(resolveAppEnvironment(undefined)).toBe('development');
    expect(resolveAppEnvironment('preview')).toBe('development');
  });

  it('accepts supported app environments', () => {
    expect(resolveAppEnvironment('development')).toBe('development');
    expect(resolveAppEnvironment('staging')).toBe('staging');
    expect(resolveAppEnvironment('production')).toBe('production');
  });

  it('normalizes optional public URLs', () => {
    expect(normalizeOptionalUrl(undefined)).toBeNull();
    expect(normalizeOptionalUrl('   ')).toBeNull();
    expect(normalizeOptionalUrl('https://api.forgeflow.app///')).toBe(
      'https://api.forgeflow.app',
    );
  });

  it('requires an HTTPS API URL in production', () => {
    expect(() =>
      validatePublicEnvironment({ apiBaseUrl: null, appEnv: 'production' }),
    ).toThrow('required in production');
    expect(() =>
      validatePublicEnvironment({
        apiBaseUrl: 'http://api.forgeflow.app',
        appEnv: 'production',
      }),
    ).toThrow('must use HTTPS');
    expect(
      validatePublicEnvironment({
        apiBaseUrl: 'https://api.forgeflow.app',
        appEnv: 'production',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.forgeflow.app',
      appEnv: 'production',
    });
  });

  it('rejects malformed and non-HTTP API URLs', () => {
    expect(() =>
      validatePublicEnvironment({ apiBaseUrl: 'not-a-url', appEnv: 'staging' }),
    ).toThrow('valid URL');
    expect(() =>
      validatePublicEnvironment({
        apiBaseUrl: 'file:///tmp/server',
        appEnv: 'development',
      }),
    ).toThrow('HTTP or HTTPS');
  });
});
