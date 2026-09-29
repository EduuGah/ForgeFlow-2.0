import { isAuthSession } from './expoSecureSessionStorage';

describe('Expo secure session storage', () => {
  it('accepts a complete session payload', () => {
    expect(
      isAuthSession({
        accessToken: 'opaque-access-token',
        expiresAt: '2026-09-30T00:00:00.000Z',
        refreshToken: 'opaque-refresh-token',
        user: {
          displayName: 'Carlos',
          email: 'user@example.com',
          id: 'user-1',
        },
      }),
    ).toBe(true);
  });

  it.each([
    null,
    {},
    { accessToken: '', expiresAt: 'invalid', refreshToken: '', user: {} },
  ])('rejects malformed persisted data', (value) => {
    expect(isAuthSession(value)).toBe(false);
  });
});
