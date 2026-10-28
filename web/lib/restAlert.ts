import { useSyncExternalStore } from 'react';

/*
 * How the end of a rest sounds and feels on this device: a sound made with
 * Web Audio (no audio files), a vibration pattern and an optional 3-2-1
 * tick. Per device, like the theme, so it lives in localStorage.
 */

export type RestSound = 'off' | 'beep' | 'bell' | 'whistle';
export type RestVibration = 'off' | 'short' | 'long';

export interface RestAlertPrefs {
  sound: RestSound;
  vibration: RestVibration;
  /** A short tick in each of the last 3 seconds. */
  countdown: boolean;
}

export const REST_SOUNDS: { value: RestSound; label: string }[] = [
  { value: 'off', label: 'Sem som' },
  { value: 'beep', label: 'Bipe' },
  { value: 'bell', label: 'Sino' },
  { value: 'whistle', label: 'Apito' },
];

export const REST_VIBRATIONS: { value: RestVibration; label: string }[] = [
  { value: 'off', label: 'Sem vibração' },
  { value: 'short', label: 'Curta' },
  { value: 'long', label: 'Longa' },
];

const KEY = 'forgeflow_rest_alert';
const DEFAULTS: RestAlertPrefs = {
  sound: 'beep',
  vibration: 'short',
  countdown: false,
};

function read(): RestAlertPrefs {
  try {
    const raw = JSON.parse(
      localStorage.getItem(KEY) ?? 'null',
    ) as Partial<RestAlertPrefs> | null;
    return {
      sound: REST_SOUNDS.some((item) => item.value === raw?.sound)
        ? (raw?.sound as RestSound)
        : DEFAULTS.sound,
      vibration: REST_VIBRATIONS.some((item) => item.value === raw?.vibration)
        ? (raw?.vibration as RestVibration)
        : DEFAULTS.vibration,
      countdown: raw?.countdown === true,
    };
  } catch {
    return DEFAULTS;
  }
}

let prefs: RestAlertPrefs | null = null;
const listeners = new Set<() => void>();

export function getRestAlertPrefs(): RestAlertPrefs {
  prefs ??= read();
  return prefs;
}

export function setRestAlertPrefs(patch: Partial<RestAlertPrefs>) {
  prefs = { ...getRestAlertPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Kept for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function useRestAlertPrefs(): RestAlertPrefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getRestAlertPrefs,
    getRestAlertPrefs,
  );
}

/* ------------------------------------------------------------------ */
/* Sound                                                               */
/* ------------------------------------------------------------------ */

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return null;
  context ??= new Context();
  return context;
}

/**
 * Browsers only play sound after a tap. Called on taps during the workout
 * (completing a set), so the end of the rest can sound later on its own.
 */
export function primeRestSound() {
  const ctx = audio();
  if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
}

/** One tone: frequency in Hz, start and length in seconds, peak volume. */
function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  length: number,
  {
    type = 'sine',
    volume = 0.25,
    decay = false,
  }: { type?: OscillatorType; volume?: number; decay?: boolean } = {},
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const at = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    at + (decay ? length : Math.max(0.03, length)),
  );
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + length + 0.05);
  return oscillator;
}

export function playRestSound(sound: RestSound = getRestAlertPrefs().sound) {
  const ctx = audio();
  if (!ctx || sound === 'off') return;
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  if (sound === 'beep') {
    tone(ctx, 880, 0, 0.14, { type: 'square', volume: 0.12 });
    tone(ctx, 880, 0.22, 0.14, { type: 'square', volume: 0.12 });
    tone(ctx, 1175, 0.44, 0.24, { type: 'square', volume: 0.12 });
  } else if (sound === 'bell') {
    tone(ctx, 1320, 0, 1.4, { volume: 0.3, decay: true });
    tone(ctx, 660, 0, 1.6, { volume: 0.18, decay: true });
    tone(ctx, 1980, 0, 0.6, { volume: 0.08, decay: true });
  } else {
    const whistle = tone(ctx, 2100, 0, 0.55, { volume: 0.18 });
    // A little warble, like a coach's whistle.
    const wobble = ctx.createOscillator();
    const depth = ctx.createGain();
    wobble.frequency.value = 28;
    depth.gain.value = 90;
    wobble.connect(depth).connect(whistle.frequency);
    wobble.start();
    wobble.stop(ctx.currentTime + 0.6);
  }
}

/** The 3-2-1 tick before the end. */
export function playCountdownTick() {
  const ctx = audio();
  if (!ctx || ctx.state !== 'running') return;
  tone(ctx, 660, 0, 0.07, { type: 'square', volume: 0.07 });
}

const VIBRATIONS: Record<Exclude<RestVibration, 'off'>, number[]> = {
  short: [200],
  long: [400, 150, 400, 150, 400],
};

export function vibrateRestEnd(
  vibration: RestVibration = getRestAlertPrefs().vibration,
) {
  if (vibration === 'off') return;
  try {
    navigator.vibrate?.(VIBRATIONS[vibration]);
  } catch {
    // Vibration is best-effort.
  }
}
