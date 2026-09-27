import { notificationDeepLink } from './deepLinks';

describe('notification deep links', () => {
  it('builds links only for known application routes', () => {
    expect(notificationDeepLink({ route: 'Goals' })).toBe('forgeflow://goals');
    expect(notificationDeepLink({ url: 'forgeflow://workouts' })).toBe(
      'forgeflow://workouts',
    );
    expect(notificationDeepLink({ route: 'admin' })).toBeNull();
    expect(notificationDeepLink({ url: 'https://example.com' })).toBeNull();
  });
});
