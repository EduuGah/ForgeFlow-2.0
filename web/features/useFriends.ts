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
  fetchReceivedReactions,
  getSocialProfile,
  getSocialProfiles,
  listFriendships,
  listIncomingShares,
  removeFriendship,
  saveSocialProfile,
  sendFriendRequest,
  sendShare,
  subscribeToMessages,
  unreadBySender,
  type ChatMessage,
  type IncomingShare,
  type SocialErrorKind,
} from '../social';
import type { ShareKind, SharePayload } from '../lib/sharing';
import { saveSharedRoutines } from './sharedRoutines';
import { notify, type NewNotification } from './notificationFeed';
import { pushToFriend } from './pushRegistration';

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
  /** Unread chat messages, by friend. */
  unread: Record<string, number>;
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
    unread: {},
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

/** Outside React: the lists as they are now. */
export function getFriendsState(): FriendsState {
  return friends;
}

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
    listenForMessages(null);
    return Promise.resolve();
  }
  if (friends.ownerId !== user.uid) friends = initialState(user.uid);
  listenForMessages(user.uid);
  if (inFlight) return inFlight;

  update({ status: friends.me ? friends.status : 'loading', error: null });
  inFlight = (async () => {
    try {
      const me = await ensureMyProfile(user.uid);
      const { rows, profiles } = await listFriendships();
      const inbox = await loadInbox(user.uid, profiles);
      const unread = await unreadBySender(user.uid).catch((error: unknown) => {
        console.warn('ForgeFlow mensagens:', error);
        return { counts: friends.unread, latest: {} };
      });
      if (getState().currentUser?.uid !== user.uid) return;
      const before = friends.lists;
      const lists = splitFriendships(rows, profiles, user.uid);
      update({
        me,
        lists,
        inbox,
        unread: openChat ? { ...unread.counts, [openChat]: 0 } : unread.counts,
        status: 'ready',
        error: null,
        loadedAt: Date.now(),
      });
      notifyFriendEvents(before, lists, inbox, unread.latest, profiles);
      notify(await reactionNews(user.uid, profiles), {
        system: 'friendAlerts',
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

/**
 * Reactions friends left since the last look, once each. Optional like the
 * inbox: an older database just has none.
 */
async function reactionNews(
  userId: string,
  profiles: Map<string, SocialProfile>,
): Promise<NewNotification[]> {
  const key = `forgeflow_reactions_seen_${userId}`;
  let since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  try {
    since = localStorage.getItem(key) ?? since;
  } catch {
    // Private mode: the last three days, like a first visit.
  }
  try {
    const found = await fetchReceivedReactions(userId, since);
    if (found.length > 0) {
      try {
        localStorage.setItem(key, found[0].createdAt);
      } catch {
        // The bell skips repeats anyway.
      }
    }
    const { history } = getState();
    return found.map((reaction) => {
      const workout = history.find((item) => item.id === reaction.workoutId);
      return {
        id: `reaction-${reaction.id}-${reaction.emoji}`,
        kind: 'reaction',
        title: `${nameOf(profiles.get(reaction.userId))} reagiu ${reaction.emoji}`,
        body: workout ? `Ao seu treino ${workout.name}` : 'Ao seu treino',
        link: `mine:${reaction.workoutId}`,
        createdAt: reaction.createdAt,
      };
    });
  } catch (error) {
    console.warn('ForgeFlow reações:', error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Chat: one Realtime subscription per signed-in person.               */
/* ------------------------------------------------------------------ */

const messageListeners = new Set<(message: ChatMessage) => void>();
let listeningAs: string | null = null;
let stopListening: (() => void) | null = null;
/** The friend whose conversation is on screen: their messages arrive read. */
let openChat: string | null = null;

function listenForMessages(userId: string | null) {
  if (listeningAs === userId) return;
  stopListening?.();
  stopListening = null;
  listeningAs = userId;
  if (!userId) return;
  stopListening = subscribeToMessages(userId, (message) => {
    if (message.senderId !== openChat) {
      update({
        unread: {
          ...friends.unread,
          [message.senderId]: (friends.unread[message.senderId] ?? 0) + 1,
        },
      });
      notify([messageEvent(message, friendById(message.senderId))], {
        system: 'friendAlerts',
      });
    }
    messageListeners.forEach((listener) => listener(message));
  });
}

function nameOf(profile: SocialProfile | null | undefined): string {
  return profile ? profile.name || `@${profile.username}` : 'Um amigo';
}

function messageEvent(
  message: ChatMessage,
  sender: SocialProfile | null | undefined,
): NewNotification {
  return {
    id: `message-${message.id}`,
    kind: 'message',
    title: `Mensagem de ${nameOf(sender)}`,
    body: message.body,
    link: `chat:${message.senderId}`,
    createdAt: message.createdAt,
  };
}

/**
 * Puts what a reload found in the bell (and on the phone when the app is in
 * the background): requests, accepted requests, routines and messages.
 */
function notifyFriendEvents(
  before: FriendLists,
  after: FriendLists,
  inbox: InboxShare[],
  latestUnread: Record<string, ChatMessage>,
  profiles: Map<string, SocialProfile>,
) {
  // Only requests seen pending here: a reload never lists every friend.
  const wasSent = new Set(before.outgoing.map((link) => link.id));
  notify(
    [
      ...after.incoming.map((link): NewNotification => ({
        id: `request-${link.id}`,
        kind: 'request',
        title: 'Pedido de amizade',
        body: `${nameOf(link.other)} quer ser seu amigo.`,
        link: 'social',
        createdAt: link.since,
      })),
      ...after.friends
        .filter((link) => wasSent.has(link.id))
        .map((link): NewNotification => ({
          id: `friend-${link.id}`,
          kind: 'friend',
          title: 'Pedido aceito',
          body: `Você e ${nameOf(link.other)} agora são amigos.`,
          link: `friend:${link.other.userId}`,
        })),
      ...inbox.map((share): NewNotification => ({
        id: `share-${share.id}`,
        kind: 'share',
        title: `${nameOf(share.sender)} te enviou ${share.kind === 'folder' ? 'uma pasta' : 'uma rotina'}`,
        body: share.title,
        link: 'social',
        createdAt: share.createdAt,
      })),
      ...Object.entries(latestUnread)
        .filter(([sender]) => sender !== openChat)
        .map(([sender, message]) =>
          messageEvent(message, profiles.get(sender)),
        ),
    ],
    { system: 'friendAlerts' },
  );
}

/** Runs for every message that arrives; returns the unsubscribe. */
export function onIncomingMessage(
  listener: (message: ChatMessage) => void,
): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

/** Marks a conversation as on screen (or none), clearing its unread count. */
export function setOpenChat(friendId: string | null) {
  openChat = friendId;
  if (friendId && friends.unread[friendId])
    update({ unread: { ...friends.unread, [friendId]: 0 } });
}

/** The friend whose conversation is on screen, if any. */
export function chatOpenWith(): string | null {
  return openChat;
}

export function friendById(userId: string): SocialProfile | null {
  return (
    friends.lists.friends.find((link) => link.other.userId === userId)?.other ??
    null
  );
}

export function totalUnread(state: FriendsState): number {
  return Object.values(state.unread).reduce((sum, count) => sum + count, 0);
}

/**
 * For badges and chat at startup: reloads (when stale) only for people who
 * already joined the community. Unlike `refreshFriends`, it never creates
 * the public profile; opening Friends does that.
 */
export async function resumeFriends(maxAgeMs = 60_000): Promise<void> {
  const user = getState().currentUser;
  if (!user || !getState().isOnline) return;
  if (friends.ownerId === user.uid && friends.me) {
    listenForMessages(user.uid);
    refreshFriendsIfStale(maxAgeMs);
    return;
  }
  try {
    if (await getSocialProfile(user.uid)) await refreshFriends();
  } catch {
    // Offline or an older database: the Friends screen explains it.
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
      const id = await sendFriendRequest(user.uid, other.userId);
      pushToFriend({ type: 'request', id });
    } finally {
      // Also when it already existed: the lists show what it became.
      await refreshFriends();
    }
  },

  async accept(link: FriendLink): Promise<void> {
    try {
      await acceptFriendRequest(link.id);
      pushToFriend({ type: 'accepted', id: link.id });
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
    const id = await sendShare(user.uid, friend.userId, kind, title, payload);
    pushToFriend({ type: 'share', id });
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
