import { supabase } from './supabase';
import {
  LIVE_QUIET_MS,
  isReactionEmoji,
  type FriendshipRow,
  type LiveWorkout,
  type ReactionEmoji,
  type SocialProfile,
  type WorkoutReaction,
} from './lib/friends';
import type { CompletedWorkout, PersonalRecordItem } from './lib/types';
import {
  readSharePayload,
  type ShareKind,
  type SharePayload,
} from './lib/sharing';

/* Friends live only in the cloud: every call here needs a connection. */

export type SocialErrorKind = 'schema' | 'taken' | 'exists' | 'gone' | 'other';

export class SocialError extends Error {
  constructor(
    message: string,
    readonly kind: SocialErrorKind,
  ) {
    super(message);
  }
}

function fail(error: { code?: string; message: string }): never {
  const code = error.code ?? '';
  // Missing table/function: supabase-schema.sql was not run after this update.
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(code))
    throw new SocialError(error.message, 'schema');
  if (code === '23505') throw new SocialError(error.message, 'taken');
  throw new SocialError(error.message, 'other');
}

interface ProfileRow {
  user_id: string;
  username: string;
  name: string;
  photo_url: string | null;
  share_stats: boolean;
}

function fromRow(row: ProfileRow): SocialProfile {
  return {
    userId: row.user_id,
    username: row.username,
    name: row.name,
    photoUrl: row.photo_url,
    shareStats: row.share_stats,
  };
}

export async function getSocialProfile(
  userId: string,
): Promise<SocialProfile | null> {
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) fail(error);
  return data ? fromRow(data as ProfileRow) : null;
}

export async function findByUsername(
  username: string,
): Promise<SocialProfile | null> {
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (error) fail(error);
  return data ? fromRow(data as ProfileRow) : null;
}

/** Throws a `taken` SocialError when someone else has the username. */
export async function saveSocialProfile(profile: SocialProfile): Promise<void> {
  const { error } = await supabase.from('social_profiles').upsert({
    user_id: profile.userId,
    username: profile.username,
    name: profile.name.slice(0, 60),
    photo_url: profile.photoUrl,
    share_stats: profile.shareStats,
    updated_at: new Date().toISOString(),
  });
  if (error) fail(error);
}

export async function searchPeople(query: string): Promise<SocialProfile[]> {
  const { data, error } = await supabase.rpc('search_people', {
    p_query: query,
  });
  if (error) fail(error);
  return ((data as ProfileRow[] | null) ?? []).map(fromRow);
}

export async function listFriendships(): Promise<{
  rows: FriendshipRow[];
  profiles: Map<string, SocialProfile>;
}> {
  // RLS returns only the rows this person takes part in.
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at');
  if (error) fail(error);
  const rows: FriendshipRow[] = (
    (data as
      | {
          id: number;
          requester_id: string;
          addressee_id: string;
          status: 'pending' | 'accepted';
          created_at: string;
        }[]
      | null) ?? []
  ).map((row) => ({
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    createdAt: row.created_at,
  }));

  const ids = [
    ...new Set(rows.flatMap((row) => [row.requesterId, row.addresseeId])),
  ];
  const profiles = new Map<string, SocialProfile>();
  if (ids.length > 0) {
    const result = await supabase
      .from('social_profiles')
      .select('*')
      .in('user_id', ids);
    if (result.error) fail(result.error);
    ((result.data as ProfileRow[] | null) ?? []).forEach((row) =>
      profiles.set(row.user_id, fromRow(row)),
    );
  }
  return { rows, profiles };
}

/** Throws an `exists` SocialError when the two already have a link. */
export async function sendFriendRequest(
  me: string,
  otherId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('friendships')
    .insert({ requester_id: me, addressee_id: otherId })
    .select('id')
    .single();
  if (error?.code === '23505') throw new SocialError(error.message, 'exists');
  if (error) fail(error);
  return (data as { id: number }).id;
}

/** Throws a `gone` SocialError when the request was cancelled meanwhile. */
export async function acceptFriendRequest(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) fail(error);
  if (!data || data.length === 0)
    throw new SocialError('Pedido não encontrado', 'gone');
}

/** Cancels, declines or ends a friendship. */
export async function removeFriendship(id: number): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', id);
  if (error) fail(error);
}

/**
 * Workouts of the given friends since `since`, newest first. RLS returns
 * nothing for people who are not friends or who stopped sharing.
 */
export async function fetchFriendWorkouts(
  userIds: string[],
  since: Date,
): Promise<Map<string, CompletedWorkout[]>> {
  const byUser = new Map<string, CompletedWorkout[]>(
    userIds.map((id) => [id, []]),
  );
  if (userIds.length === 0) return byUser;
  const { data, error } = await supabase
    .from('history')
    .select('user_id, data')
    .in('user_id', userIds)
    .gte('data->>completedAt', since.toISOString())
    .limit(500);
  if (error) fail(error);
  for (const row of (data as
    | {
        user_id: string;
        data: CompletedWorkout;
      }[]
    | null) ?? []) {
    if (row.data && Array.isArray(row.data.exercises))
      byUser.get(row.user_id)?.push(row.data);
  }
  byUser.forEach((list) =>
    list.sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
  );
  return byUser;
}

export async function fetchFriendRecords(
  userId: string,
): Promise<PersonalRecordItem[]> {
  const { data, error } = await supabase
    .from('prs')
    .select('data')
    .eq('user_id', userId);
  if (error) fail(error);
  return ((data as { data: PersonalRecordItem }[] | null) ?? [])
    .map((row) => row.data)
    .filter((record) => record && typeof record.value === 'number');
}

/* ------------------------------------------------------------------ */
/* Routines sent between friends                                       */
/* ------------------------------------------------------------------ */

export interface IncomingShare {
  id: number;
  senderId: string;
  kind: ShareKind;
  title: string;
  payload: SharePayload;
  createdAt: string;
}

/** RLS only accepts it when the two are friends. */
export async function sendShare(
  me: string,
  recipientId: string,
  kind: ShareKind,
  title: string,
  payload: SharePayload,
): Promise<number> {
  const { data, error } = await supabase
    .from('shared_routines')
    .insert({
      sender_id: me,
      recipient_id: recipientId,
      kind,
      title: title.trim().slice(0, 80) || 'Rotina',
      payload,
    })
    .select('id')
    .single();
  if (error) fail(error);
  return (data as { id: number }).id;
}

/** What friends sent to this person; unreadable payloads are skipped. */
export async function listIncomingShares(me: string): Promise<IncomingShare[]> {
  const { data, error } = await supabase
    .from('shared_routines')
    .select('id, sender_id, kind, title, payload, created_at')
    .eq('recipient_id', me)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) fail(error);
  const shares: IncomingShare[] = [];
  for (const row of (data as
    | {
        id: number;
        sender_id: string;
        kind: ShareKind;
        title: string;
        payload: unknown;
        created_at: string;
      }[]
    | null) ?? []) {
    const payload = readSharePayload(row.payload);
    if (!payload) continue;
    shares.push({
      id: row.id,
      senderId: row.sender_id,
      kind: row.kind === 'folder' ? 'folder' : 'routine',
      title: row.title,
      payload,
      createdAt: row.created_at,
    });
  }
  return shares;
}

/** Done with it: saved or declined. */
export async function deleteShare(id: number): Promise<void> {
  const { error } = await supabase
    .from('shared_routines')
    .delete()
    .eq('id', id);
  if (error) fail(error);
}

export async function getSocialProfiles(
  ids: string[],
): Promise<Map<string, SocialProfile>> {
  const profiles = new Map<string, SocialProfile>();
  if (ids.length === 0) return profiles;
  const { data, error } = await supabase
    .from('social_profiles')
    .select('*')
    .in('user_id', ids);
  if (error) fail(error);
  ((data as ProfileRow[] | null) ?? []).forEach((row) =>
    profiles.set(row.user_id, fromRow(row)),
  );
  return profiles;
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  id: number;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

interface MessageRow {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

function fromMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/** The latest messages between two people, oldest first. */
export async function listConversation(
  me: string,
  friendId: string,
  limit = 200,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${me})`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) fail(error);
  return ((data as MessageRow[] | null) ?? []).map(fromMessageRow).reverse();
}

/** RLS only accepts it between friends. */
export async function sendMessage(
  me: string,
  friendId: string,
  body: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: me, recipient_id: friendId, body: body.trim() })
    .select('*')
    .single();
  if (error) fail(error);
  return fromMessageRow(data as MessageRow);
}

export async function markConversationRead(
  me: string,
  friendId: string,
): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', me)
    .eq('sender_id', friendId)
    .is('read_at', null);
  if (error) fail(error);
}

/** Unread messages per sender. */
/** Unread messages per sender, and the latest one from each. */
export async function unreadBySender(me: string): Promise<{
  counts: Record<string, number>;
  latest: Record<string, ChatMessage>;
}> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('recipient_id', me)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) fail(error);
  const counts: Record<string, number> = {};
  const latest: Record<string, ChatMessage> = {};
  for (const row of (data as MessageRow[] | null) ?? []) {
    counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1;
    latest[row.sender_id] ??= fromMessageRow(row);
  }
  return { counts, latest };
}

/**
 * Calls `onMessage` for every message sent to this person while subscribed
 * (Supabase Realtime; RLS decides what arrives). Returns the unsubscribe.
 */
export function subscribeToMessages(
  me: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`messages-to-${me}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${me}`,
      },
      (payload) => onMessage(fromMessageRow(payload.new as MessageRow)),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Calls `onRead` when the other person reads a message this one sent. */
export function subscribeToReadReceipts(
  me: string,
  onRead: (message: ChatMessage) => void,
): () => void {
  const channel = supabase
    .channel(`messages-from-${me}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${me}`,
      },
      (payload) => onRead(fromMessageRow(payload.new as MessageRow)),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export interface ConversationSummary {
  friendId: string;
  last: ChatMessage;
  unread: number;
}

/** Latest message with each person, newest conversation first. */
export async function listConversations(
  me: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) fail(error);
  const byFriend = new Map<string, ConversationSummary>();
  for (const row of (data as MessageRow[] | null) ?? []) {
    const message = fromMessageRow(row);
    const friendId =
      message.senderId === me ? message.recipientId : message.senderId;
    const summary = byFriend.get(friendId) ?? {
      friendId,
      last: message,
      unread: 0,
    };
    if (message.recipientId === me && !message.readAt) summary.unread += 1;
    byFriend.set(friendId, summary);
  }
  return [...byFriend.values()];
}

/* ------------------------------------------------------------------ */
/* Training now                                                        */
/* ------------------------------------------------------------------ */

interface LiveRow {
  user_id: string;
  name: string;
  started_at: string;
  done_sets: number;
  total_sets: number;
  current_exercise: string | null;
  ended_at: string | null;
  updated_at: string;
}

/** Shows friends this person's workout in progress (or updates it). */
export async function publishLiveWorkout(
  me: string,
  live: Pick<
    LiveWorkout,
    'name' | 'startedAt' | 'doneSets' | 'totalSets' | 'currentExercise'
  >,
): Promise<void> {
  const { error } = await supabase.from('live_workouts').upsert({
    user_id: me,
    name: live.name,
    started_at: live.startedAt,
    done_sets: live.doneSets,
    total_sets: live.totalSets,
    current_exercise: live.currentExercise,
    ended_at: null,
    updated_at: new Date().toISOString(),
  });
  if (error) fail(error);
}

/** The workout ended (finished or discarded). */
export async function endLiveWorkout(me: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('live_workouts')
    .update({ ended_at: now, updated_at: now })
    .eq('user_id', me);
  if (error) fail(error);
}

/** Friends' latest workouts in progress (RLS: only friends who share). */
export async function listLiveWorkouts(
  userIds: string[],
): Promise<LiveWorkout[]> {
  if (userIds.length === 0) return [];
  const since = new Date(Date.now() - LIVE_QUIET_MS).toISOString();
  const { data, error } = await supabase
    .from('live_workouts')
    .select('*')
    .in('user_id', userIds)
    .is('ended_at', null)
    .gte('updated_at', since);
  if (error) fail(error);
  return ((data as LiveRow[] | null) ?? []).map((row) => ({
    userId: row.user_id,
    name: row.name,
    startedAt: row.started_at,
    doneSets: row.done_sets,
    totalSets: row.total_sets,
    currentExercise: row.current_exercise,
    endedAt: row.ended_at,
    updatedAt: row.updated_at,
  }));
}

/** Load records of several friends in one call, by person. */
export async function fetchRecordsOf(
  userIds: string[],
): Promise<Map<string, PersonalRecordItem[]>> {
  const byUser = new Map<string, PersonalRecordItem[]>(
    userIds.map((id) => [id, []]),
  );
  if (userIds.length === 0) return byUser;
  const { data, error } = await supabase
    .from('prs')
    .select('user_id, data')
    .in('user_id', userIds)
    .limit(2000);
  if (error) fail(error);
  for (const row of (data as
    { user_id: string; data: PersonalRecordItem }[] | null) ?? []) {
    if (row.data && typeof row.data.value === 'number')
      byUser.get(row.user_id)?.push(row.data);
  }
  return byUser;
}

/* ------------------------------------------------------------------ */
/* Reactions                                                           */
/* ------------------------------------------------------------------ */

interface ReactionRow {
  id: number;
  owner_id: string;
  workout_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

function fromReactionRows(rows: ReactionRow[] | null): WorkoutReaction[] {
  const reactions: WorkoutReaction[] = [];
  for (const row of rows ?? []) {
    if (!isReactionEmoji(row.emoji)) continue;
    reactions.push({
      id: row.id,
      ownerId: row.owner_id,
      workoutId: row.workout_id,
      userId: row.user_id,
      emoji: row.emoji,
      createdAt: row.created_at,
    });
  }
  return reactions;
}

/** Reactions to the given workouts of the given people. */
export async function fetchReactions(
  ownerIds: string[],
  workoutIds: string[],
): Promise<WorkoutReaction[]> {
  if (ownerIds.length === 0 || workoutIds.length === 0) return [];
  const { data, error } = await supabase
    .from('workout_reactions')
    .select('*')
    .in('owner_id', ownerIds)
    .in('workout_id', workoutIds)
    .limit(1000);
  if (error) fail(error);
  return fromReactionRows(data as ReactionRow[] | null);
}

/** Reactions friends left on this person's workouts since `since`. */
export async function fetchReceivedReactions(
  me: string,
  since: string,
): Promise<WorkoutReaction[]> {
  const { data, error } = await supabase
    .from('workout_reactions')
    .select('*')
    .eq('owner_id', me)
    .gt('created_at', since)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) fail(error);
  return fromReactionRows(data as ReactionRow[] | null);
}

/**
 * Reacts to a friend's workout, or changes the emoji. Returns the reaction
 * id and whether it is new (only new ones notify the friend).
 */
export async function setReaction(
  me: string,
  ownerId: string,
  workoutId: string,
  emoji: ReactionEmoji,
): Promise<{ id: number; created: boolean }> {
  // Only the emoji can change (column grants), so no upsert here.
  const changed = await supabase
    .from('workout_reactions')
    .update({ emoji, created_at: new Date().toISOString() })
    .eq('owner_id', ownerId)
    .eq('workout_id', workoutId)
    .eq('user_id', me)
    .select('id');
  if (changed.error) fail(changed.error);
  const existing = (changed.data as { id: number }[] | null)?.[0];
  if (existing) return { id: existing.id, created: false };
  const { data, error } = await supabase
    .from('workout_reactions')
    .insert({ owner_id: ownerId, workout_id: workoutId, user_id: me, emoji })
    .select('id')
    .single();
  if (error) fail(error);
  return { id: (data as { id: number }).id, created: true };
}

export async function removeReaction(
  me: string,
  ownerId: string,
  workoutId: string,
): Promise<void> {
  const { error } = await supabase
    .from('workout_reactions')
    .delete()
    .eq('owner_id', ownerId)
    .eq('workout_id', workoutId)
    .eq('user_id', me);
  if (error) fail(error);
}
