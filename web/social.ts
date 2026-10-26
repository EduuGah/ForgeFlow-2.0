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
): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: me, addressee_id: otherId });
  if (error?.code === '23505') throw new SocialError(error.message, 'exists');
  if (error) fail(error);
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
): Promise<void> {
  const { error } = await supabase.from('shared_routines').insert({
    sender_id: me,
    recipient_id: recipientId,
    kind,
    title: title.trim().slice(0, 80) || 'Rotina',
    payload,
  });
  if (error) fail(error);
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
