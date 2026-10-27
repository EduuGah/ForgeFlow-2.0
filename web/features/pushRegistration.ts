import { getState } from '../store';
import { supabase } from '../supabase';
import {
  dropPushSubscription,
  notificationPermission,
  pushAvailable,
  pushSubscription,
} from '../lib/notify';

/*
 * Notifications with the app closed: this device's push subscription lives in
 * `push_subscriptions`, and the `push` Supabase function (supabase/functions/
 * push) sends to it when a friend does something.
 */

/** Saves this device for push; false when push is unavailable here. */
export async function registerPush(): Promise<boolean> {
  const user = getState().currentUser;
  if (!user) return false;
  const keys = await pushSubscription();
  if (!keys) return false;
  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: keys.endpoint,
    user_id: user.uid,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('ForgeFlow push:', error.message);
    return false;
  }
  return true;
}

/** At startup: keeps an already allowed device registered (keys rotate). */
export function refreshPushRegistration() {
  if (
    getState().currentUser &&
    pushAvailable() &&
    notificationPermission() === 'granted'
  )
    void registerPush();
}

/** Signing out: this device stops getting that account's notifications. */
export async function unregisterPush(): Promise<void> {
  const endpoint = await dropPushSubscription();
  if (!endpoint) return;
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .then(
      () => undefined,
      () => undefined,
    );
}

export type PushEvent =
  | { type: 'message'; id: number }
  | { type: 'request'; id: number }
  | { type: 'accepted'; id: number }
  | { type: 'share'; id: number };

/**
 * Asks the server to notify the other person. Fire-and-forget: the action
 * already happened, and the server checks it really was this person's.
 */
export function pushToFriend(event: PushEvent) {
  void supabase.functions
    .invoke('push', { body: event })
    .then(({ error }) => {
      if (error) console.warn('ForgeFlow push:', error.message);
    })
    .catch(() => undefined);
}
