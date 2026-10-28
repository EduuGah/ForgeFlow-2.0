import { useEffect, useSyncExternalStore } from 'react';
import { getState, useStoreValue } from '../store';
import { isLive, liveSnapshot, type LiveWorkout } from '../lib/friends';
import {
  SocialError,
  endLiveWorkout,
  listLiveWorkouts,
  publishLiveWorkout,
} from '../social';
import { getFriendsState, useFriends } from './useFriends';

/*
 * "Treinando agora": while a workout runs, friends who get this person's
 * workouts see its name and progress. Only for people in the community who
 * share their workouts.
 */

/** Same snapshot again only after this long (keeps it from going quiet). */
const HEARTBEAT_MS = 10 * 60_000;
/** At most one update this often; the latest waits for the next slot. */
let minGapMs = 15_000;

/** Training together: updates go out faster so the partner sees each set. */
export function setLivePace(fast: boolean) {
  minGapMs = fast ? 4_000 : 15_000;
}

let published: { userId: string; key: string; at: number } | null = null;
/** A row may still say "training" (app closed mid-workout, offline finish). */
let mayBeLive = true;
/** The database lacks the table (older schema): stop trying this visit. */
let unavailable = false;
let trailing: ReturnType<typeof setTimeout> | null = null;

function warn(error: unknown) {
  if (error instanceof SocialError && error.kind === 'schema')
    unavailable = true;
  console.warn('ForgeFlow treinando agora:', error);
}

/** Publishes, updates or ends this person's live workout to match the app. */
export function syncLiveWorkout() {
  const { activeWorkout, currentUser, isOnline } = getState();
  const me = getFriendsState().me;
  if (unavailable || !currentUser || !isOnline) return;
  if (!me || me.userId !== currentUser.uid) return;
  const userId = currentUser.uid;

  if (!activeWorkout || !me.shareStats) {
    if (trailing) clearTimeout(trailing);
    trailing = null;
    published = null;
    if (mayBeLive) {
      mayBeLive = false;
      void endLiveWorkout(userId).catch(warn);
    }
    return;
  }

  const snapshot = liveSnapshot(activeWorkout);
  const key = JSON.stringify(snapshot);
  const now = Date.now();
  if (published?.userId === userId) {
    if (published.key === key && now - published.at < HEARTBEAT_MS) return;
    const wait = minGapMs - (now - published.at);
    if (wait > 0) {
      trailing ??= setTimeout(() => {
        trailing = null;
        syncLiveWorkout();
      }, wait);
      return;
    }
  }
  published = { userId, key, at: now };
  mayBeLive = true;
  void publishLiveWorkout(userId, snapshot).catch((error: unknown) => {
    published = null;
    warn(error);
  });
}

/** Mounted once: follows the workout, the profile and the connection. */
export function useLiveWorkoutPublisher() {
  const active = useStoreValue((state) => state.activeWorkout);
  const online = useStoreValue((state) => state.isOnline);
  const friends = useFriends();
  const shareStats = friends.me?.shareStats;
  useEffect(() => {
    syncLiveWorkout();
  }, [active, online, friends.me, shareStats]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(syncLiveWorkout, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [active]);
}

/* ------------------------------------------------------------------ */
/* Friends training now                                                */
/* ------------------------------------------------------------------ */

const EMPTY = new Map<string, LiveWorkout>();
let live: { owner: string | null; byUser: Map<string, LiveWorkout> } = {
  owner: null,
  byUser: EMPTY,
};
let loadedAt = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function refreshLive(owner: string, userIds: string[]) {
  if (unavailable || Date.now() - loadedAt < 20_000) return;
  loadedAt = Date.now();
  try {
    const rows = await listLiveWorkouts(userIds);
    if (getState().currentUser?.uid !== owner) return;
    const now = Date.now();
    live = {
      owner,
      byUser: new Map(
        rows.filter((row) => isLive(row, now)).map((row) => [row.userId, row]),
      ),
    };
    listeners.forEach((listener) => listener());
  } catch (error) {
    warn(error);
  }
}

/**
 * Friends with a workout in progress, by id. Reloads every minute while a
 * screen that shows it is open.
 */
export function useLiveFriends(): Map<string, LiveWorkout> {
  const uid = useStoreValue((state) => state.currentUser?.uid ?? null);
  const friends = useFriends();
  const ids = friends.lists.friends
    .filter((link) => link.other.shareStats)
    .map((link) => link.other.userId)
    .sort()
    .join(',');
  const snapshot = useSyncExternalStore(
    subscribe,
    () => live,
    () => live,
  );

  useEffect(() => {
    if (!uid || !ids) return;
    const load = () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        void refreshLive(uid, ids.split(','));
    };
    load();
    const timer = setInterval(load, 60_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [uid, ids]);

  return snapshot.owner === uid && ids ? snapshot.byUser : EMPTY;
}
