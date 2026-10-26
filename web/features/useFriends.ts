import { useSyncExternalStore } from 'react';
import { actions, getState, useStoreValue } from '../store';
import {
  preferredUsername,
  splitFriendships,
  toUsername,
  usernameVariant,
  type FriendLink,
  type FriendLists,
  type SocialProfile,
} from '../lib/friends';
import {
  SocialError,
  acceptFriendRequest,
  deleteShare,
  getSocialProfile,
  getSocialProfiles,
  listFriendships,
  listIncomingShares,
  removeFriendship,
  saveSocialProfile,
  sendFriendRequest,
  sendShare,
  type IncomingShare,
  type SocialErrorKind,
} from '../social';
import type { ShareKind, SharePayload } from '../lib/sharing';
import { saveSharedRoutines } from './sharedRoutines';

/* ------------------------------------------------------------------ */
/* Shared state: the Social screen, its friend pages and the Profile   */
/* badge read the same lists.                                          */
/* ------------------------------------------------------------------ */

export interface FriendsState {
  /** Whose lists these are; another account starts over. */
  ownerId: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: SocialErrorKind | null;
  me: SocialProfile | null;
  lists: FriendLists;
  /** A username from the profile that someone else already has. */
  takenUsername: string | null;
  /** Routines and folders friends sent, waiting to be saved or declined. */
  inbox: InboxShare[];
  loadedAt: number;
}

export interface InboxShare extends IncomingShare {
  sender: SocialProfile | null;
}

const EMPTY_LISTS: FriendLists = { friends: [], incoming: [], outgoing: [] };

function initialState(ownerId: string | null): FriendsState {
  return {
    ownerId,
    status: 'idle',
    error: null,
    me: null,
    lists: EMPTY_LISTS,
    takenUsername: null,
    inbox: [],
    loadedAt: 0,
  };
}

let friends = initialState(null);
const listeners = new Set<() => void>();

function update(patch: Partial<FriendsState>) {
  friends = { ...friends, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const SIGNED_OUT = initialState(null);

export function useFriends(): FriendsState {
  const uid = useStoreValue((current) => current.currentUser?.uid ?? null);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => friends,
    () => friends,
  );
  // Lists of an account that has since signed out are never shown.
  return snapshot.ownerId === uid ? snapshot : SIGNED_OUT;
}

/** The person's photo, kept only when it fits the public profile. */
function publicPhoto(): string | null {
  const { userProfile, currentUser } = getState();
  const photo = userProfile.photoDataUrl || currentUser?.photoURL || null;
  return photo && photo.length <= 300_000 ? photo : null;
}

/**
 * Creates the public profile on first use and keeps name, photo and username
 * in step with the app profile. A username someone else has is kept as is
 * (the previous one stays) and reported in `takenUsername`.
 */
async function ensureMyProfile(userId: string): Promise<SocialProfile> {
  const { userProfile, currentUser } = getState();
  const name = (userProfile.name || currentUser?.displayName || 'Atleta')
    .trim()
    .slice(0, 60);
  const photoUrl = publicPhoto();
  const existing = await getSocialProfile(userId);

  if (existing) {
    const wanted = toUsername(userProfile.username, '');
    const emailPrefix = currentUser?.email
      ? toUsername(currentUser.email.split('@')[0], '')
      : '';
    const next = { ...existing, name, photoUrl };
    let taken: string | null = null;
    if (wanted === emailPrefix && wanted !== existing.username) {
      // The default e-mail-based username (e.g. a fresh device before its
      // first sync) never goes public: the profile takes the community one.
      actions.updateProfile({ username: existing.username });
    } else if (wanted && wanted !== existing.username) {
      try {
        await saveSocialProfile({ ...next, username: wanted });
        update({ takenUsername: null });
        return { ...next, username: wanted };
      } catch (error) {
        if (!(error instanceof SocialError) || error.kind !== 'taken')
          throw error;
        taken = wanted;
      }
    }
    if (next.name !== existing.name || next.photoUrl !== existing.photoUrl)
      await saveSocialProfile(next);
    update({ takenUsername: taken });
    return next;
  }

  const base = preferredUsername(userProfile, currentUser?.email);
  let username = base;
  for (let attempt = 0; ; attempt++) {
    const created = { userId, username, name, photoUrl, shareStats: true };
    try {
      await saveSocialProfile(created);
      // The app profile shows the same @ as the community.
      if (userProfile.username !== username)
        actions.updateProfile({ username });
      return created;
    } catch (error) {
      const taken = error instanceof SocialError && error.kind === 'taken';
      if (!taken || attempt >= 4) throw error;
      username = usernameVariant(base, attempt);
    }
  }
}

let inFlight: Promise<void> | null = null;

/** Loads (or reloads) the public profile, friends and requests. */
export function refreshFriends(): Promise<void> {
  const user = getState().currentUser;
  if (!user) {
    if (friends.ownerId) friends = initialState(null);
    return Promise.resolve();
  }
  if (friends.ownerId !== user.uid) friends = initialState(user.uid);
  if (inFlight) return inFlight;

  update({ status: friends.me ? friends.status : 'loading', error: null });
  inFlight = (async () => {
    try {
      const me = await ensureMyProfile(user.uid);
      const { rows, profiles } = await listFriendships();
      const inbox = await loadInbox(user.uid, profiles);
      if (getState().currentUser?.uid !== user.uid) return;
      update({
        me,
        lists: splitFriendships(rows, profiles, user.uid),
        inbox,
        status: 'ready',
        error: null,
        loadedAt: Date.now(),
      });
    } catch (error) {
      console.warn('ForgeFlow amigos:', error);
      update({
        status: 'error',
        error: error instanceof SocialError ? error.kind : 'other',
      });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Shares waiting for this person. Optional: if it fails (e.g. the database
 * lacks the newer table), friends still load and the inbox stays empty.
 */
async function loadInbox(
  userId: string,
  known: Map<string, SocialProfile>,
): Promise<InboxShare[]> {
  try {
    const shares = await listIncomingShares(userId);
    const missing = shares
      .map((share) => share.senderId)
      .filter((id) => !known.has(id));
    const extra = await getSocialProfiles([...new Set(missing)]);
    return shares.map((share) => ({
      ...share,
      sender: known.get(share.senderId) ?? extra.get(share.senderId) ?? null,
    }));
  } catch (error) {
    console.warn('ForgeFlow rotinas recebidas:', error);
    return [];
  }
}

/** Reloads unless the lists are fresher than `maxAgeMs`. */
export function refreshFriendsIfStale(maxAgeMs = 60_000): void {
  const user = getState().currentUser;
  if (!user || !getState().isOnline) return;
  if (friends.ownerId === user.uid && Date.now() - friends.loadedAt < maxAgeMs)
    return;
  void refreshFriends();
}

/* ------------------------------------------------------------------ */
/* Actions: each one talks to the server, then reloads the lists.      */
/* ------------------------------------------------------------------ */

export const friendActions = {
  async sendRequest(other: SocialProfile): Promise<void> {
    const user = getState().currentUser;
    if (!user) return;
    try {
      await sendFriendRequest(user.uid, other.userId);
    } finally {
      // Also when it already existed: the lists show what it became.
      await refreshFriends();
    }
  },

  async accept(link: FriendLink): Promise<void> {
    try {
      await acceptFriendRequest(link.id);
    } finally {
      await refreshFriends();
    }
  },

  /** Cancels a sent request, declines a received one or ends a friendship. */
  async remove(link: FriendLink): Promise<void> {
    await removeFriendship(link.id);
    await refreshFriends();
  },

  /** Sends a copy of a routine or folder to a friend. */
  async share(
    friend: SocialProfile,
    kind: ShareKind,
    title: string,
    payload: SharePayload,
  ): Promise<void> {
    const user = getState().currentUser;
    if (!user) return;
    await sendShare(user.uid, friend.userId, kind, title, payload);
  },

  /** Saves what a friend sent as new routines; returns how many. */
  async saveShare(share: InboxShare): Promise<number> {
    const saved = saveSharedRoutines(share);
    update({ inbox: friends.inbox.filter((item) => item.id !== share.id) });
    // Saved locally either way; a failed delete just shows it again later.
    await deleteShare(share.id).catch((error: unknown) =>
      console.warn('ForgeFlow rotinas recebidas:', error),
    );
    return saved;
  },

  async declineShare(share: InboxShare): Promise<void> {
    await deleteShare(share.id);
    update({ inbox: friends.inbox.filter((item) => item.id !== share.id) });
  },

  async setShareStats(shareStats: boolean): Promise<void> {
    const me = friends.me;
    if (!me) return;
    update({ me: { ...me, shareStats } });
    try {
      await saveSocialProfile({ ...me, shareStats });
    } catch (error) {
      update({ me });
      throw error;
    }
  },
};
