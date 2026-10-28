import type {
  ActiveWorkoutState,
  CompletedWorkout,
  PersonalRecordItem,
} from './types';

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

export type RankingMetric =
  'volume' | 'workouts' | 'minutes' | 'sets' | 'records';

export interface RankingEntry {
  userId: string;
  name: string;
  photoUrl: string | null;
  me: boolean;
  workouts: number;
  volumeKg: number;
  minutes: number;
  sets: number;
  records: number;
}

export function rankingValue(entry: RankingEntry, metric: RankingMetric) {
  if (metric === 'workouts') return entry.workouts;
  if (metric === 'minutes') return entry.minutes;
  if (metric === 'sets') return entry.sets;
  if (metric === 'records') return entry.records;
  return entry.volumeKg;
}

/** Totals per person since `since`, best first by `metric`. */
export function buildRanking(
  people: {
    userId: string;
    name: string;
    photoUrl: string | null;
    me: boolean;
    history: CompletedWorkout[];
  }[],
  since: Date,
  metric: RankingMetric = 'volume',
): RankingEntry[] {
  const from = since.getTime();
  return people
    .map(({ history, ...person }) => {
      const entry = {
        ...person,
        workouts: 0,
        volumeKg: 0,
        minutes: 0,
        sets: 0,
        records: 0,
      };
      for (const workout of history) {
        const time = Date.parse(workout.completedAt);
        if (Number.isNaN(time) || time < from) continue;
        entry.workouts += 1;
        entry.volumeKg += workout.totalVolumeKg || 0;
        entry.minutes += workout.durationMinutes || 0;
        entry.sets += workout.totalSets || 0;
        entry.records += workout.prsAchieved?.length ?? 0;
      }
      return entry;
    })
    .sort(
      (a, b) =>
        rankingValue(b, metric) - rankingValue(a, metric) ||
        b.volumeKg - a.volumeKg ||
        b.workouts - a.workouts ||
        Number(b.me) - Number(a.me),
    );
}

export interface ExerciseBoard {
  exerciseId: string;
  exerciseName: string;
  /** Heaviest load per person, best first. */
  entries: { userId: string; valueKg: number }[];
}

/**
 * One leaderboard per exercise that at least `minPeople` people have a load
 * record in; the most disputed exercises first.
 */
export function exerciseBoards(
  people: { userId: string; records: PersonalRecordItem[] }[],
  minPeople = 2,
): ExerciseBoard[] {
  const boards = new Map<string, ExerciseBoard>();
  for (const person of people) {
    for (const [exerciseId, record] of heaviest(person.records)) {
      const board = boards.get(exerciseId) ?? {
        exerciseId,
        exerciseName: record.exerciseName,
        entries: [],
      };
      board.entries.push({ userId: person.userId, valueKg: record.value });
      boards.set(exerciseId, board);
    }
  }
  return [...boards.values()]
    .filter((board) => board.entries.length >= minPeople)
    .map((board) => ({
      ...board,
      entries: board.entries.sort((a, b) => b.valueKg - a.valueKg),
    }))
    .sort(
      (a, b) =>
        b.entries.length - a.entries.length ||
        a.exerciseName.localeCompare(b.exerciseName, 'pt-BR'),
    );
}

/* ------------------------------------------------------------------ */
/* Training now                                                        */
/* ------------------------------------------------------------------ */

export interface LiveWorkout {
  userId: string;
  name: string;
  startedAt: string;
  doneSets: number;
  totalSets: number;
  currentExercise: string | null;
  endedAt: string | null;
  updatedAt: string;
}

/** Quiet this long (app closed mid-workout), it no longer counts as now. */
export const LIVE_QUIET_MS = 90 * 60_000;
const LIVE_LONGEST_MS = 5 * 60 * 60_000;

export function isLive(live: LiveWorkout, now: number = Date.now()): boolean {
  if (live.endedAt) return false;
  const updated = Date.parse(live.updatedAt);
  const started = Date.parse(live.startedAt);
  if (Number.isNaN(updated) || Number.isNaN(started)) return false;
  return now - updated < LIVE_QUIET_MS && now - started < LIVE_LONGEST_MS;
}

/** What friends see of a workout in progress. */
export function liveSnapshot(
  workout: ActiveWorkoutState,
): Pick<
  LiveWorkout,
  'name' | 'startedAt' | 'doneSets' | 'totalSets' | 'currentExercise'
> {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const current = workout.exercises.find((exercise) =>
    exercise.sets.some((set) => !set.completed),
  );
  return {
    name: workout.name.trim().slice(0, 80) || 'Treino',
    startedAt: workout.startedAt,
    doneSets: Math.min(500, sets.filter((set) => set.completed).length),
    totalSets: Math.min(500, sets.length),
    currentExercise: current ? current.exerciseName.slice(0, 80) : null,
  };
}

/** "Upper B · 5/12 séries · 34 min". */
export function liveLabel(live: LiveWorkout, now: number = Date.now()): string {
  const minutes = Math.max(
    0,
    Math.floor((now - Date.parse(live.startedAt)) / 60_000),
  );
  const parts = [live.name];
  if (live.totalSets > 0)
    parts.push(`${live.doneSets}/${live.totalSets} séries`);
  parts.push(`${minutes} min`);
  return parts.join(' · ');
}

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

export const REACTIONS = ['🔥', '💪', '👏', '🏆'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export interface WorkoutReaction {
  id: number;
  ownerId: string;
  workoutId: string;
  userId: string;
  emoji: ReactionEmoji;
  createdAt: string;
}

export function isReactionEmoji(value: unknown): value is ReactionEmoji {
  return (REACTIONS as readonly unknown[]).includes(value);
}

export function reactionKey(ownerId: string, workoutId: string): string {
  return `${ownerId}/${workoutId}`;
}

/** How many of each emoji, in the fixed order, leaving out the unused. */
export function reactionCounts(
  reactions: WorkoutReaction[],
): { emoji: ReactionEmoji; count: number }[] {
  return REACTIONS.map((emoji) => ({
    emoji,
    count: reactions.filter((reaction) => reaction.emoji === emoji).length,
  })).filter((item) => item.count > 0);
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
