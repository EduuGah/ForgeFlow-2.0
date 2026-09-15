import {
  AuthenticationRequiredError,
  authorizeServerMutation,
  OwnershipViolationError,
} from './ownership';

describe('authorizeServerMutation', () => {
  it('requires an authenticated principal', () => {
    expect(() =>
      authorizeServerMutation({
        entityType: 'workout',
        payload: { name: 'Upper body' },
        principal: null,
      }),
    ).toThrow(AuthenticationRequiredError);
  });

  it('derives ownership from the authenticated principal instead of client payload', () => {
    const result = authorizeServerMutation({
      entityType: 'workout',
      payload: {
        name: 'Upper body',
        userId: 'user-1',
        user_id: 'user-1',
      },
      principal: { userId: 'user-1' },
    });

    expect(result).toStrictEqual({
      ownerUserId: 'user-1',
      payload: {
        name: 'Upper body',
      },
    });
  });

  it('rejects payload user_id that does not match the authenticated user', () => {
    expect(() =>
      authorizeServerMutation({
        entityType: 'workout_session',
        payload: {
          status: 'completed',
          user_id: 'user-2',
        },
        principal: { userId: 'user-1' },
      }),
    ).toThrow(OwnershipViolationError);
  });

  it('rejects payload owner_user_id that does not match the authenticated user', () => {
    expect(() =>
      authorizeServerMutation({
        entityType: 'exercise',
        payload: {
          name: 'Private exercise',
          owner_user_id: 'user-2',
        },
        principal: { userId: 'user-1' },
      }),
    ).toThrow(OwnershipViolationError);
  });

  it('rejects mutation against an existing record owned by another user', () => {
    expect(() =>
      authorizeServerMutation({
        entityType: 'goal',
        existingRecord: {
          ownerUserId: 'user-2',
        },
        payload: {
          title: 'Bench press goal',
        },
        principal: { userId: 'user-1' },
      }),
    ).toThrow(OwnershipViolationError);
  });

  it('rejects mutation against an existing global record without user ownership', () => {
    expect(() =>
      authorizeServerMutation({
        entityType: 'exercise',
        existingRecord: {
          ownerUserId: null,
        },
        payload: {
          name: 'System exercise edit',
        },
        principal: { userId: 'user-1' },
      }),
    ).toThrow(OwnershipViolationError);
  });

  it('allows mutation against an existing record owned by the authenticated user', () => {
    expect(
      authorizeServerMutation({
        entityType: 'set',
        existingRecord: {
          ownerUserId: 'user-1',
        },
        payload: {
          repetitions: 8,
          weightKg: 90,
        },
        principal: { userId: 'user-1' },
      }),
    ).toStrictEqual({
      ownerUserId: 'user-1',
      payload: {
        repetitions: 8,
        weightKg: 90,
      },
    });
  });
});
