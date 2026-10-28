// Supabase Edge Function "reminders": the workout reminder. pg_cron calls it
// every 10 minutes (supabase-schema.sql); it notifies, through Web Push,
// everyone whose reminder time has come today, on a day with a routine in
// their weekly plan, and remembers it so a day is never notified twice.
//
// Calling it more often changes nothing, so it runs without a login:
//   supabase functions deploy reminders --no-verify-jwt
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (the same as
// the "push" function). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@forgeflow.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

/** A reminder fires within this many minutes after its time. */
const WINDOW_MINUTES = 30;

interface PlanRow {
  user_id: string;
  plan: { days?: ({ id?: string; name?: string } | null)[] } | null;
  reminder_minute: number;
  time_zone: string;
  last_sent_on: string | null;
}

/** Weekday (0 = Sunday), minute of the day and date where the person is. */
function localNow(timeZone: string, now: Date) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return null;
  }
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    part('weekday'),
  );
  return {
    weekday,
    minute: Number(part('hour')) * 60 + Number(part('minute')),
    date: `${part('year')}-${part('month')}-${part('day')}`,
  };
}

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: plans, error } = await admin
    .from('training_plans')
    .select('user_id, plan, reminder_minute, time_zone, last_sent_on')
    .eq('reminder_enabled', true);
  if (error) return new Response(error.message, { status: 500 });

  const now = new Date();
  let sent = 0;
  for (const row of (plans ?? []) as PlanRow[]) {
    const local = localNow(row.time_zone, now);
    if (!local || local.weekday < 0) continue;
    if (row.last_sent_on === local.date) continue;
    const routine = row.plan?.days?.[local.weekday];
    if (!routine?.name) continue;
    const late = local.minute - row.reminder_minute;
    if (late < 0 || late >= WINDOW_MINUTES) continue;

    // Marked first: a slow push never turns into two reminders.
    await admin
      .from('training_plans')
      .update({ last_sent_on: local.date })
      .eq('user_id', row.user_id);

    const { data: devices } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', row.user_id);
    const payload = JSON.stringify({
      title: 'Hora do treino 💪',
      body: `Hoje é dia de ${String(routine.name).slice(0, 60)}. Bora?`,
      tag: `reminder-${local.date}`,
      url: '/?abrir=home',
    });
    await Promise.all(
      (devices ?? []).map(async (device) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: device.endpoint,
              keys: { p256dh: device.p256dh, auth: device.auth },
            },
            payload,
            { TTL: 60 * 60 * 3 },
          );
          sent += 1;
        } catch (failure) {
          const status = (failure as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410)
            await admin
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', device.endpoint);
        }
      }),
    );
  }
  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
