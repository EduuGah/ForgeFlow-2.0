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
 * top layer instead of leaving the app.
 *
 * History traversal (`history.go`) is asynchronous while `pushState` is not,
 * so entries are never pushed or rewound directly: layers change, then one
 * reconcile pass brings the history depth (tracked in `history.state`) to the
 * number of open layers, waiting for any traversal in flight to land first.
 * Without this, a layer closing while another opens (a sheet that starts the
 * workout, finishing a workout into its summary) raced and could rewind past
 * the app's own first entry.
 */
interface Layer {
  onBack: () => void;
}

const layers: Layer[] = [];
let depth = 0;
let traversing = false;
let traversalTimer: ReturnType<typeof setTimeout> | null = null;
let reconcileScheduled = false;
let listening = false;

function depthOf(state: unknown): number {
  const value = (state as { forgeflowLayer?: unknown } | null)?.forgeflowLayer;
  return typeof value === 'number' && value > 0 ? value : 0;
}

function finishTraversal() {
  traversing = false;
  if (traversalTimer) clearTimeout(traversalTimer);
  traversalTimer = null;
}

function reconcile() {
  reconcileScheduled = false;
  if (traversing) return;
  const target = layers.length;
  while (depth < target) {
    depth += 1;
    window.history.pushState({ forgeflowLayer: depth }, '');
  }
  if (depth > target) {
    traversing = true;
    window.history.go(target - depth);
    // Safety net: if the traversal is swallowed, trust the current entry.
    traversalTimer = setTimeout(() => {
      finishTraversal();
      depth = depthOf(window.history.state);
      scheduleReconcile();
    }, 1000);
  }
}

function scheduleReconcile() {
  if (reconcileScheduled) return;
  reconcileScheduled = true;
  queueMicrotask(reconcile);
}

function listen() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  depth = depthOf(window.history.state);
  window.addEventListener('popstate', (event) => {
    const landed = depthOf(event.state);
    if (traversing) {
      // Our own rewind arrived.
      finishTraversal();
      depth = landed;
      scheduleReconcile();
      return;
    }
    // The person pressed back (possibly several steps): close that many layers.
    const steps = Math.max(0, depth - landed);
    depth = landed;
    for (let i = 0; i < steps; i += 1) layers.pop()?.onBack();
    scheduleReconcile();
  });
}

function pushLayer(onBack: () => void): () => void {
  listen();
  const layer: Layer = { onBack };
  layers.push(layer);
  scheduleReconcile();
  return () => {
    const index = layers.indexOf(layer);
    if (index === -1) return; // already closed by the back button
    layers.splice(index, 1);
    scheduleReconcile();
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
