import { useSyncExternalStore } from 'react';

const DONE_KEY = 'forgeflow_v2_tutorial_done';

function readDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

/** The walkthrough opens by itself once, and again on request from Settings. */
let open = typeof window !== 'undefined' && !readDone();
const listeners = new Set<() => void>();

function set(next: boolean) {
  open = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTutorialOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

export const tutorial = {
  show: () => set(true),
  finish: () => {
    try {
      localStorage.setItem(DONE_KEY, '1');
    } catch {
      // Storage unavailable: the tutorial simply shows again next time.
    }
    set(false);
  },
};
