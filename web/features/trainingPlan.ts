import { useSyncExternalStore } from 'react';
import { getState, useStoreValue } from '../store';
import { supabase } from '../supabase';
import { emptyPlan, readPlan, type TrainingPlan } from '../lib/trainingPlan';

/*
 * The weekly plan lives on the device (per account) and, for people signed
 * in, is mirrored to `training_plans` so the "reminders" function can send
 * the workout reminder with the app closed.
 */

function storageKey(owner: string | null) {
  return `forgeflow_plan_${owner ?? 'guest'}`;
}

let owner: string | null | undefined;
let plan: TrainingPlan = emptyPlan();
const listeners = new Set<() => void>();

function current(): TrainingPlan {
  const uid = getState().currentUser?.uid ?? null;
  if (owner !== uid) {
    owner = uid;
    try {
      plan = readPlan(
        JSON.parse(localStorage.getItem(storageKey(uid)) ?? 'null'),
      );
    } catch {
      plan = emptyPlan();
    }
  }
  return plan;
}

function save(next: TrainingPlan) {
  plan = next;
  try {
    localStorage.setItem(storageKey(owner ?? null), JSON.stringify(next));
  } catch {
    // Kept for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function getTrainingPlan(): TrainingPlan {
  return current();
}

export function useTrainingPlan(): TrainingPlan {
  useStoreValue((state) => state.currentUser?.uid ?? null);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    current,
    current,
  );
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Changes the plan here and, shortly after, in the cloud. */
export function updatePlan(change: (plan: TrainingPlan) => TrainingPlan) {
  save({ ...change(current()), updatedAt: new Date().toISOString() });
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushPlan(), 800);
}

function timeZone(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
    );
  } catch {
    return 'America/Sao_Paulo';
  }
}

/** Uploads the plan with the routines' names (the reminder says them). */
export async function pushPlan(): Promise<void> {
  const user = getState().currentUser;
  if (!user || !getState().isOnline) return;
  const local = current();
  const { templates } = getState();
  const { error } = await supabase.from('training_plans').upsert({
    user_id: user.uid,
    plan: {
      days: local.days.map((id) => {
        const template = id && templates.find((item) => item.id === id);
        return template ? { id: template.id, name: template.name } : null;
      }),
      deloadUntil: local.deloadUntil,
      lastDeloadAt: local.lastDeloadAt,
    },
    reminder_enabled: local.reminder.enabled,
    reminder_minute: local.reminder.minute,
    time_zone: timeZone(),
    updated_at: local.updatedAt,
  });
  // An older database without the table: the plan still works on the device.
  if (error) console.warn('ForgeFlow agenda:', error.message);
}

/**
 * At startup: a plan saved on another device wins when it is newer; a
 * newer local one is uploaded (also refreshing the routines' names).
 */
export async function syncPlan(): Promise<void> {
  const user = getState().currentUser;
  if (!user || !getState().isOnline) return;
  const { data, error } = await supabase
    .from('training_plans')
    .select('plan, reminder_enabled, reminder_minute, updated_at')
    .eq('user_id', user.uid)
    .maybeSingle();
  if (error) return;
  const local = current();
  const remote = data as {
    plan: {
      days?: ({ id?: string } | null)[];
      deloadUntil?: string | null;
      lastDeloadAt?: string | null;
    } | null;
    reminder_enabled: boolean;
    reminder_minute: number;
    updated_at: string;
  } | null;
  if (remote && remote.updated_at > local.updatedAt) {
    save(
      readPlan({
        days: (remote.plan?.days ?? []).map((day) => day?.id ?? null),
        reminder: {
          enabled: remote.reminder_enabled,
          minute: remote.reminder_minute,
        },
        deloadUntil: remote.plan?.deloadUntil ?? null,
        lastDeloadAt: remote.plan?.lastDeloadAt ?? null,
        updatedAt: remote.updated_at,
      }),
    );
  } else if (local.updatedAt > new Date(0).toISOString()) {
    await pushPlan();
  }
}
