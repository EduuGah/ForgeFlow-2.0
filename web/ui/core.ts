import { useEffect, useRef, useState } from 'react';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Keeps an element mounted while its exit animation plays. Call `onExited`
 * from `onAnimationEnd`; a timer covers browsers that skip the event.
 */
export function usePresence(open: boolean, exitMs = 360) {
  const [exiting, setExiting] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    setExiting(!open);
  }

  useEffect(() => {
    if (!exiting) return;
    const id = setTimeout(() => setExiting(false), exitMs);
    return () => clearTimeout(id);
  }, [exiting, exitMs]);

  return {
    mounted: open || exiting,
    closing: !open && exiting,
    onExited: () => setExiting(false),
  };
}

/** Wall-clock time refreshed on an interval (render-safe alternative to Date.now()). */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs, enabled]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Back button integration                                             */
/* ------------------------------------------------------------------ */

/*
 * Every open layer (pushed screen, sheet, dialog, active workout) owns one
 * browser history entry, so the Android back button / browser back closes the
 * top layer instead of leaving the app. Layers closed from the UI rewind their
 * entry; those rewinds are batched into one `history.go(-n)` and ignored.
 */
interface Layer {
  onBack: () => void;
}

const layers: Layer[] = [];
let ignoredPops = 0;
let pendingRewind = 0;
let rewindScheduled = false;
let listening = false;

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('popstate', () => {
    if (ignoredPops > 0) {
      ignoredPops -= 1;
      return;
    }
    layers.pop()?.onBack();
  });
}

function scheduleRewind() {
  pendingRewind += 1;
  if (rewindScheduled) return;
  rewindScheduled = true;
  queueMicrotask(() => {
    rewindScheduled = false;
    const steps = pendingRewind;
    pendingRewind = 0;
    if (steps === 0) return;
    ignoredPops += 1;
    window.history.go(-steps);
  });
}

function pushLayer(onBack: () => void): () => void {
  listen();
  const layer: Layer = { onBack };
  layers.push(layer);
  window.history.pushState({ forgeflowLayer: layers.length }, '');
  return () => {
    const index = layers.indexOf(layer);
    if (index === -1) return; // already closed by the back button
    layers.splice(index, 1);
    scheduleRewind();
  };
}

export function useBackLayer(active: boolean, onBack: () => void) {
  const handler = useRef(onBack);
  useEffect(() => {
    handler.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    return pushLayer(() => handler.current());
  }, [active]);
}

/**
 * Intercepts the back button while `active` (e.g. unsaved changes). The
 * guard is consumed by the back press; `onAttempt` receives `rearm` to call
 * if the person decides to stay.
 */
export function useBackGuard(
  active: boolean,
  onAttempt: (rearm: () => void) => void,
) {
  const [generation, setGeneration] = useState(0);
  const handler = useRef(onAttempt);
  useEffect(() => {
    handler.current = onAttempt;
  });
  useEffect(() => {
    if (!active) return;
    return pushLayer(() =>
      handler.current(() => setGeneration((value) => value + 1)),
    );
  }, [active, generation]);
}

/* ------------------------------------------------------------------ */
/* Scroll lock                                                         */
/* ------------------------------------------------------------------ */

let locks = 0;

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    if (locks === 1) document.documentElement.style.overflow = 'hidden';
    return () => {
      locks -= 1;
      if (locks === 0) document.documentElement.style.overflow = '';
    };
  }, [active]);
}

/** Restores focus to whatever was focused before an overlay opened. */
export function useRestoreFocus(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    return () => {
      if (previous && document.contains(previous))
        previous.focus({ preventScroll: true });
    };
  }, [active]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
