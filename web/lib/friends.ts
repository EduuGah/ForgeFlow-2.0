import type { CompletedWorkout, PersonalRecordItem } from './types';

export interface SocialProfile {
  userId: string;
  username: string;
  name: string;
  photoUrl: string | null;
  /** Off: still friends, but they don't see this person's workouts. */
  shareStats: boolean;
}

export interface FriendshipRow {
  id: number;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

/** A friendship seen from one side, with the other person's profile. */
export interface FriendLink {
  id: number;
  other: SocialProfile;
  since: string;
}

export interface FriendLists {
  friends: FriendLink[];
  /** Requests waiting for this person's answer. */
  incoming: FriendLink[];
  /** Requests this person sent that are still unanswered. */
  outgoing: FriendLink[];
}

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/**
 * A valid community handle from free text: lowercase, no accents, only
 * letters, digits, dot, dash and underscore, 3 to 30 characters.
 */
export function toUsername(raw: string, fallback = 'atleta'): string {
  const clean = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
  return clean.length >= 3 ? clean : fallback;
}

/**
 * The handle to claim first. The app's default username is the e-mail prefix,
 * which would let people guess the e-mail, so that one is replaced by the name.
 */
export function preferredUsername(
  profile: { username: string; name: string },
  email: string | null | undefined,
): string {
  const emailPrefix = email ? toUsername(email.split('@')[0]) : null;
  const chosen = toUsername(profile.username, '');
  if (chosen && chosen !== emailPrefix) return chosen;
  return toUsername(profile.name);
}

/** Next candidate when a handle is taken: base + 2 to 4 random digits. */
export function usernameVariant(base: string, attempt: number): string {
  const digits = String(Math.floor(Math.random() * 10 ** (attempt + 2)));
  return `${base.slice(0, 30 - digits.length)}${digits}`;
}

/** Splits the rows the server returns into friends and pending requests. */
export function splitFriendships(
  rows: FriendshipRow[],
  profiles: ReadonlyMap<string, SocialProfile>,
  me: string,
): FriendLists {
  const lists: FriendLists = { friends: [], incoming: [], outgoing: [] };
  for (const row of rows) {
    const otherId = row.requesterId === me ? row.addresseeId : row.requesterId;
    const other = profiles.get(otherId);
    if (!other) continue;
    const link = { id: row.id, other, since: row.createdAt };
    if (row.status === 'accepted') lists.friends.push(link);
    else if (row.addresseeId === me) lists.incoming.push(link);
    else lists.outgoing.push(link);
  }
  const byName = (a: FriendLink, b: FriendLink) =>
    (a.other.name || a.other.username).localeCompare(
      b.other.name || b.other.username,
      'pt-BR',
    );
  lists.friends.sort(byName);
  lists.incoming.sort((a, b) => b.since.localeCompare(a.since));
  lists.outgoing.sort((a, b) => b.since.localeCompare(a.since));
  return lists;
}

/** Where someone stands with this person: drives the button on their card. */
export type Relation =
  | { kind: 'none' }
  | { kind: 'friend'; link: FriendLink }
  | { kind: 'incoming'; link: FriendLink }
  | { kind: 'outgoing'; link: FriendLink };

export function relationTo(lists: FriendLists, userId: string): Relation {
  const find = (links: FriendLink[]) =>
    links.find((link) => link.other.userId === userId);
  const friend = find(lists.friends);
  if (friend) return { kind: 'friend', link: friend };
  const incoming = find(lists.incoming);
  if (incoming) return { kind: 'incoming', link: incoming };
  const outgoing = find(lists.outgoing);
  if (outgoing) return { kind: 'outgoing', link: outgoing };
  return { kind: 'none' };
}

/* ------------------------------------------------------------------ */
/* Invite links                                                        */
/* ------------------------------------------------------------------ */

export const INVITE_PARAM = 'amigo';

export function inviteLink(origin: string, username: string): string {
  return `${origin}/?${INVITE_PARAM}=${encodeURIComponent(username)}`;
}

/** The @handle an invite link carries, if any (and if it is valid). */
export function inviteFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get(INVITE_PARAM);
  if (!value) return null;
  const username = value.trim().replace(/^@/, '').toLowerCase();
  return USERNAME_PATTERN.test(username) ? username : null;
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

export interface RankingEntry {
  userId: string;
  name: string;
  photoUrl: string | null;
  me: boolean;
  workouts: number;
  volumeKg: number;
}

/** Workouts and working-set volume per person since `since`, best first. */
export function buildRanking(
  people: {
    userId: string;
    name: string;
    photoUrl: string | null;
    me: boolean;
    history: CompletedWorkout[];
  }[],
  since: Date,
): RankingEntry[] {
  const from = since.getTime();
  return people
    .map(({ history, ...person }) => {
      let workouts = 0;
      let volumeKg = 0;
      for (const workout of history) {
        const time = Date.parse(workout.completedAt);
        if (Number.isNaN(time) || time < from) continue;
        workouts += 1;
        volumeKg += workout.totalVolumeKg || 0;
      }
      return { ...person, workouts, volumeKg };
    })
    .sort(
      (a, b) =>
        b.volumeKg - a.volumeKg ||
        b.workouts - a.workouts ||
        Number(b.me) - Number(a.me),
    );
}

/* ------------------------------------------------------------------ */
/* Comparing with a friend                                             */
/* ------------------------------------------------------------------ */

export interface BestComparison {
  exerciseId: string;
  exerciseName: string;
  mine: number;
  theirs: number;
}

function heaviest(
  records: PersonalRecordItem[],
): Map<string, PersonalRecordItem> {
  const best = new Map<string, PersonalRecordItem>();
  for (const record of records) {
    if (record.type !== 'weight' || !(record.value > 0)) continue;
    const current = best.get(record.exerciseId);
    if (!current || record.value > current.value)
      best.set(record.exerciseId, record);
  }
  return best;
}

/** Heaviest loads of the exercises both people have records in, top first. */
export function compareBests(
  mine: PersonalRecordItem[],
  theirs: PersonalRecordItem[],
  limit = 8,
): BestComparison[] {
  const myBests = heaviest(mine);
  const theirBests = heaviest(theirs);
  const shared: BestComparison[] = [];
  for (const [exerciseId, record] of myBests) {
    const other = theirBests.get(exerciseId);
    if (!other) continue;
    shared.push({
      exerciseId,
      exerciseName: record.exerciseName,
      mine: record.value,
      theirs: other.value,
    });
  }
  return shared
    .sort(
      (a, b) =>
        Math.max(b.mine, b.theirs) - Math.max(a.mine, a.theirs) ||
        a.exerciseName.localeCompare(b.exerciseName, 'pt-BR'),
    )
    .slice(0, limit);
}
