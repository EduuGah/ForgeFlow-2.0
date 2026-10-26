import { INVITE_PARAM, inviteFromSearch } from '../lib/friends';

/*
 * An invite link (/?amigo=<username>) is read once at startup and kept in
 * sessionStorage, so it survives the Google sign-in redirect in the same tab.
 */
const KEY = 'forgeflow_invite';

export function captureInvite() {
  try {
    const username = inviteFromSearch(window.location.search);
    if (!username) return;
    sessionStorage.setItem(KEY, username);
    const url = new URL(window.location.href);
    url.searchParams.delete(INVITE_PARAM);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Storage unavailable: the link still opens the app.
  }
}

export function peekInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearInvite() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
