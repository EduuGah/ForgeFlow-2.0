import { supabase } from './supabase';
import type { FriendshipRow, SocialProfile } from './lib/friends';
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
