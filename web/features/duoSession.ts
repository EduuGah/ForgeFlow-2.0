import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getState, useStoreValue } from '../store';
import type { LiveWorkout, SocialProfile } from '../lib/friends';
import { DEMO_PARTNER, demoLive } from '../lib/duoDemo';
import {
  SocialError,
  fetchPartnerLive,
  inviteDuo,
  listDuos,
  setDuoStatus,
  type DuoSession,
} from '../social';
import { setLivePace } from './liveWorkouts';
import { pushToFriend } from './pushRegistration';
import { friendById, getFriendsState, useFriends } from './useFriends';

export { DEMO_PARTNER };

/*
 * Treinar junto: two friends in a session see each other's workout as it
 * happens (the partner's live_workouts row, polled every few seconds).
 * A simulated partner lets anyone try it without a second account.
 */

interface DuoView {
  owner: string | null;
  /** The person's own session: waiting for the friend, or running. */
  session: DuoSession | null;
  /** A friend's invitation waiting for an answer. */
  invite: DuoSession | null;
  /** The simulated partner, when trying it out. */
  demoStartedAt: number | null;
  partnerLive: LiveWorkout | null;
  /** The database lacks the table: the feature stays quiet. */
  unavailable: boolean;
}

const EMPTY: DuoView = {
  owner: null,
  session: null,
  invite: null,
  demoStartedAt: null,
  partnerLive: null,
  unavailable: false,
};

let view: DuoView = EMPTY;
const listeners = new Set<() => void>();

function update(patch: Partial<DuoView>) {
  view = { ...view, ...patch };
  listeners.forEach((listener) => listener());
}

function me(): string | null {
  return getState().currentUser?.uid ?? null;
}

function partnerIdOf(session: DuoSession | null, self: string | null) {
  if (!session || !self) return null;
  return session.hostId === self ? session.guestId : session.hostId;
}

/** Reads the person's sessions: their own and invitations. */
export async function refreshDuo(): Promise<void> {
  const self = me();
  if (!self || view.unavailable || !navigator.onLine) return;
  if (view.owner !== self) view = { ...EMPTY, owner: self };
  if (view.demoStartedAt !== null) return;
  try {
    const sessions = await listDuos();
    if (me() !== self) return;
    const open = sessions.filter((session) => session.status !== 'ended');
    update({
      session:
        open.find(
          (session) =>
            session.status === 'active' ||
            (session.status === 'invited' && session.hostId === self),
        ) ?? null,
      invite:
        open.find(
          (session) => session.status === 'invited' && session.guestId === self,
        ) ?? null,
    });
  } catch (error) {
    if (error instanceof SocialError && error.kind === 'schema')
      update({ unavailable: true });
    else console.warn('ForgeFlow dupla:', error);
  }
}

async function refreshPartner(): Promise<void> {
  if (view.demoStartedAt !== null) {
    update({ partnerLive: demoLive(view.demoStartedAt, Date.now()) });
    return;
  }
  const partner = partnerIdOf(view.session, me());
  if (!partner || view.session?.status !== 'active') return;
  try {
    update({ partnerLive: await fetchPartnerLive(partner) });
  } catch (error) {
    console.warn('ForgeFlow dupla:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const duoActions = {
  async invite(friend: SocialProfile): Promise<void> {
    const self = me();
    if (!self) return;
    const id = await inviteDuo(self, friend.userId);
    update({
      owner: self,
      demoStartedAt: null,
      partnerLive: null,
      session: {
        id,
        hostId: self,
        guestId: friend.userId,
        status: 'invited',
        createdAt: new Date().toISOString(),
        endedAt: null,
      },
    });
    pushToFriend({ type: 'duo', id });
  },

  startDemo() {
    const self = me() ?? 'guest';
    const startedAt = Date.now();
    update({
      owner: me(),
      demoStartedAt: startedAt,
      partnerLive: demoLive(startedAt, startedAt),
      session: {
        id: -1,
        hostId: self,
        guestId: DEMO_PARTNER.userId,
        status: 'active',
        createdAt: new Date(startedAt).toISOString(),
        endedAt: null,
      },
    });
  },

  async accept(): Promise<void> {
    const invite = view.invite;
    if (!invite) return;
    await setDuoStatus(invite.id, 'active');
    update({
      invite: null,
      demoStartedAt: null,
      session: { ...invite, status: 'active' },
    });
    pushToFriend({ type: 'duo', id: invite.id });
    void refreshPartner();
  },

  async decline(): Promise<void> {
    const invite = view.invite;
    if (!invite) return;
    update({ invite: null });
    await setDuoStatus(invite.id, 'ended').catch(() => undefined);
  },

  async end(): Promise<void> {
    const session = view.session;
    update({ session: null, partnerLive: null, demoStartedAt: null });
    if (session && session.id > 0)
      await setDuoStatus(session.id, 'ended').catch(() => undefined);
  },
};

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDuo() {
  const self = useStoreValue((state) => state.currentUser?.uid ?? null);
  useFriends();
  const snapshot = useSyncExternalStore(
    subscribe,
    () => view,
    () => view,
  );
  const current = snapshot.owner === self ? snapshot : EMPTY;
  const partnerId =
    current.demoStartedAt !== null
      ? DEMO_PARTNER.userId
      : partnerIdOf(current.session, self);
  const inviterId = current.invite?.hostId ?? null;
  return {
    ...current,
    demo: current.demoStartedAt !== null,
    partner:
      partnerId === DEMO_PARTNER.userId
        ? DEMO_PARTNER
        : partnerId
          ? friendById(partnerId)
          : null,
    inviter: inviterId ? friendById(inviterId) : null,
  };
}

/**
 * Mounted once: checks for sessions now and then, follows the partner
 * every few seconds while together, and ends the session when the
 * person's workout ends.
 */
export function useDuoWatcher() {
  const self = useStoreValue((state) => state.currentUser?.uid ?? null);
  const active = useStoreValue((state) => state.activeWorkout !== null);
  const inCommunity = Boolean(useFriends().me);
  const duo = useSyncExternalStore(
    subscribe,
    () => view,
    () => view,
  );
  const together =
    duo.demoStartedAt !== null || duo.session?.status === 'active';
  const waiting = duo.session?.status === 'invited';
  const wasActive = useRef(active);

  useEffect(() => {
    if (!self || !inCommunity) return;
    void refreshDuo();
    const timer = setInterval(
      () => {
        if (document.visibilityState === 'visible') void refreshDuo();
      },
      waiting || together ? 10_000 : 30_000,
    );
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshDuo();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [self, inCommunity, waiting, together]);

  useEffect(() => {
    setLivePace(together);
    if (!together) return;
    void refreshPartner();
    const timer = setInterval(() => void refreshPartner(), 5_000);
    return () => clearInterval(timer);
  }, [together]);

  // The workout ended (finished or discarded): so does the session.
  useEffect(() => {
    if (wasActive.current && !active && (together || waiting))
      void duoActions.end();
    wasActive.current = active;
  }, [active, together, waiting]);
}

/** For the friends picker: friends whose workouts can be followed. */
export function duoCandidates(): SocialProfile[] {
  return getFriendsState()
    .lists.friends.map((link) => link.other)
    .filter((person) => person.shareStats);
}
