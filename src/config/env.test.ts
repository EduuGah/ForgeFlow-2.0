import { normalizeOptionalUrl, resolveAppEnvironment } from './env';

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
});
