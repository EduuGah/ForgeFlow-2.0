import {
  buildRanking,
  inviteFromSearch,
  inviteLink,
  preferredUsername,
  relationTo,
  splitFriendships,
  toUsername,
  usernameVariant,
  USERNAME_PATTERN,
  type FriendshipRow,
  type SocialProfile,
} from './friends';
import type { CompletedWorkout } from './types';

const person = (userId: string, name: string): SocialProfile => ({
  userId,
  username: name.toLowerCase(),
  name,
  photoUrl: null,
  shareStats: true,
});

const profiles = new Map(
  [
    person('me', 'Eu'),
    person('ana', 'Ana'),
    person('bia', 'Bia'),
    person('caio', 'Caio'),
    person('davi', 'Davi'),
  ].map((profile) => [profile.userId, profile]),
);

const row = (
  id: number,
  requesterId: string,
  addresseeId: string,
  status: FriendshipRow['status'],
  createdAt = `2026-10-${10 + id}T10:00:00.000Z`,
): FriendshipRow => ({ id, requesterId, addresseeId, status, createdAt });

describe('usernames', () => {
  it('turns free text into a valid handle', () => {
    expect(toUsername('João Silva')).toBe('joao.silva');
    expect(toUsername('  @Edu_Gah!! ')).toBe('edu_gah');
    expect(toUsername('a')).toBe('atleta');
    expect(toUsername('x'.repeat(40))).toHaveLength(30);
    expect(USERNAME_PATTERN.test(toUsername('Ação & Reação 2'))).toBe(true);
  });

  it('never makes the e-mail prefix public', () => {
    expect(
      preferredUsername(
        { username: 'edugah1809', name: 'Carlos Eduardo' },
        'edugah1809@gmail.com',
      ),
    ).toBe('carlos.eduardo');
    expect(
      preferredUsername(
        { username: 'edu.forja', name: 'Carlos Eduardo' },
        'edugah1809@gmail.com',
      ),
    ).toBe('edu.forja');
  });

  it('builds valid variants when a handle is taken', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const variant = usernameVariant('a'.repeat(30), attempt);
      expect(USERNAME_PATTERN.test(variant)).toBe(true);
    }
  });
});

describe('splitFriendships', () => {
  const lists = splitFriendships(
    [
      row(1, 'me', 'bia', 'accepted'),
      row(2, 'ana', 'me', 'accepted'),
      row(3, 'caio', 'me', 'pending'),
      row(4, 'me', 'davi', 'pending'),
      row(5, 'me', 'ghost', 'pending'),
    ],
    profiles,
    'me',
  );

  it('separates friends, received and sent requests', () => {
    expect(lists.friends.map((link) => link.other.userId)).toEqual([
      'ana',
      'bia',
    ]);
    expect(lists.incoming.map((link) => link.other.userId)).toEqual(['caio']);
    expect(lists.outgoing.map((link) => link.other.userId)).toEqual(['davi']);
  });

  it('skips links to people without a public profile', () => {
    const all = [...lists.friends, ...lists.incoming, ...lists.outgoing];
    expect(all.some((link) => link.other.userId === 'ghost')).toBe(false);
  });

  it('tells where each person stands', () => {
    expect(relationTo(lists, 'ana').kind).toBe('friend');
    expect(relationTo(lists, 'caio').kind).toBe('incoming');
    expect(relationTo(lists, 'davi').kind).toBe('outgoing');
    expect(relationTo(lists, 'zeca').kind).toBe('none');
  });
});

describe('invite links', () => {
  it('round-trips the username through the link', () => {
    const link = inviteLink('https://forgeflow.app', 'carlos.eduardo');
    expect(link).toBe('https://forgeflow.app/?amigo=carlos.eduardo');
    expect(inviteFromSearch(new URL(link).search)).toBe('carlos.eduardo');
  });

  it('ignores missing or invalid handles', () => {
    expect(inviteFromSearch('')).toBeNull();
    expect(inviteFromSearch('?amigo=')).toBeNull();
    expect(inviteFromSearch('?amigo=<script>')).toBeNull();
    expect(inviteFromSearch('?amigo=%40Ana.Lima')).toBe('ana.lima');
  });
});

describe('buildRanking', () => {
  const workout = (completedAt: string, volume: number) =>
    ({ completedAt, totalVolumeKg: volume }) as CompletedWorkout;
  const since = new Date('2026-10-20T00:00:00.000Z');

  it('counts only the period and sorts by volume', () => {
    const ranking = buildRanking(
      [
        {
          userId: 'me',
          name: 'Eu',
          photoUrl: null,
          me: true,
          history: [
            workout('2026-10-21T10:00:00.000Z', 1000),
            workout('2026-10-01T10:00:00.000Z', 9000),
          ],
        },
        {
          userId: 'ana',
          name: 'Ana',
          photoUrl: null,
          me: false,
          history: [
            workout('2026-10-22T10:00:00.000Z', 800),
            workout('2026-10-23T10:00:00.000Z', 700),
          ],
        },
      ],
      since,
    );
    expect(
      ranking.map((entry) => [entry.userId, entry.workouts, entry.volumeKg]),
    ).toEqual([
      ['ana', 2, 1500],
      ['me', 1, 1000],
    ]);
  });
});
