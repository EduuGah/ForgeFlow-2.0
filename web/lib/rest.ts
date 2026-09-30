import type { RestTimerState } from './types';

export const IDLE_REST_TIMER: RestTimerState = {
  status: 'idle',
  endsAt: null,
  remainingMs: 0,
  totalSeconds: 90,
};

/**
 * Deadline-based: the remaining time is derived from `endsAt`, so the timer
 * stays correct when the tab is throttled in the background or reloaded.
 */
export function restRemainingMs(
  timer: RestTimerState,
  now: number = Date.now(),
): number {
  if (timer.status === 'running' && timer.endsAt !== null)
    return Math.max(0, timer.endsAt - now);
  if (timer.status === 'paused') return Math.max(0, timer.remainingMs);
  return 0;
}

export function startRest(
  seconds: number,
  now: number,
  label?: string,
): RestTimerState {
  const safe = Math.max(1, Math.round(seconds));
  return {
    status: 'running',
    endsAt: now + safe * 1000,
    remainingMs: safe * 1000,
    totalSeconds: safe,
    label,
  };
}

export function adjustRest(
  timer: RestTimerState,
  deltaSeconds: number,
  now: number,
): RestTimerState {
  if (timer.status === 'idle') return timer;
  const remaining = Math.max(
    1000,
    restRemainingMs(timer, now) + deltaSeconds * 1000,
  );
  const totalSeconds = Math.max(
    Math.ceil(remaining / 1000),
    timer.totalSeconds + deltaSeconds,
  );
  if (timer.status === 'paused')
    return { ...timer, remainingMs: remaining, totalSeconds };
  return {
    ...timer,
    endsAt: now + remaining,
    remainingMs: remaining,
    totalSeconds,
  };
}

export function toggleRestPause(
  timer: RestTimerState,
  now: number,
): RestTimerState {
  if (timer.status === 'running') {
    return {
      ...timer,
      status: 'paused',
      remainingMs: restRemainingMs(timer, now),
      endsAt: null,
    };
  }
  if (timer.status === 'paused') {
    return { ...timer, status: 'running', endsAt: now + timer.remainingMs };
  }
  return timer;
}

/** Older builds stored `{ isActive, remainingSeconds, ... }` and ticked it every second. */
export function normalizeRestTimer(value: unknown): RestTimerState {
  if (value && typeof value === 'object' && 'status' in value) {
    const timer = value as RestTimerState;
    if (
      timer.status === 'running' &&
      timer.endsAt !== null &&
      timer.endsAt <= Date.now()
    ) {
      return { ...IDLE_REST_TIMER, totalSeconds: timer.totalSeconds };
    }
    return timer;
  }
  return IDLE_REST_TIMER;
}
