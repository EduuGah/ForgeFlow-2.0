// Supabase Edge Function "push": notifies a friend's devices (Web Push) when
// someone messages them, sends or accepts a friend request, sends a routine
// or reacts to one of their workouts. The app calls it right after the action with the person's own
// session; the function re-reads the row and only sends when the caller
// really is the one who did it.
//
// Secrets (Edge Functions › Secrets, or `supabase secrets set`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@forgeflow.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface Notice {
  to: string;
  title: string;
  body: string;
  link: string;
  tag: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  // Who is calling: their own session, never an id from the body.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) return reply({ error: 'unauthorized' }, 401);
  const me = user.id;

  let event: { type?: string; id?: unknown };
  try {
    event = await req.json();
  } catch {
    return reply({ error: 'bad request' }, 400);
  }
  const id = Number(event.id);
  if (!Number.isSafeInteger(id) || id <= 0)
    return reply({ error: 'bad request' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const nameOf = async (userId: string) => {
    const { data } = await admin
      .from('social_profiles')
      .select('name, username')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.name || (data?.username ? `@${data.username}` : 'Um amigo');
  };

  let notice: Notice | null = null;
  switch (event.type) {
    case 'message': {
      const { data } = await admin
        .from('messages')
        .select('sender_id, recipient_id, body')
        .eq('id', id)
        .maybeSingle();
      if (data?.sender_id === me)
        notice = {
          to: data.recipient_id,
          title: `Mensagem de ${await nameOf(me)}`,
          body: String(data.body).slice(0, 160),
          link: `chat:${me}`,
          tag: `chat-${me}`,
        };
      break;
    }
    case 'request': {
      const { data } = await admin
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .eq('id', id)
        .maybeSingle();
      if (data?.requester_id === me && data.status === 'pending')
        notice = {
          to: data.addressee_id,
          title: 'Pedido de amizade',
          body: `${await nameOf(me)} quer ser seu amigo.`,
          link: 'social',
          tag: `request-${id}`,
        };
      break;
    }
    case 'accepted': {
      const { data } = await admin
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .eq('id', id)
        .maybeSingle();
      if (data?.addressee_id === me && data.status === 'accepted')
        notice = {
          to: data.requester_id,
          title: 'Pedido aceito',
          body: `Você e ${await nameOf(me)} agora são amigos.`,
          link: `friend:${me}`,
          tag: `friend-${id}`,
        };
      break;
    }
    case 'share': {
      const { data } = await admin
        .from('shared_routines')
        .select('sender_id, recipient_id, kind, title')
        .eq('id', id)
        .maybeSingle();
      if (data?.sender_id === me)
        notice = {
          to: data.recipient_id,
          title: `${await nameOf(me)} te enviou ${data.kind === 'folder' ? 'uma pasta' : 'uma rotina'}`,
          body: String(data.title).slice(0, 80),
          link: 'social',
          tag: `share-${id}`,
        };
      break;
    }
    case 'reaction': {
      const { data } = await admin
        .from('workout_reactions')
        .select('owner_id, workout_id, user_id, emoji')
        .eq('id', id)
        .maybeSingle();
      if (data?.user_id === me) {
        const { data: workout } = await admin
          .from('history')
          .select('name:data->>name')
          .eq('user_id', data.owner_id)
          .eq('id', data.workout_id)
          .maybeSingle();
        notice = {
          to: data.owner_id,
          title: `${await nameOf(me)} reagiu ${data.emoji}`,
          body: workout?.name
            ? `Ao seu treino ${String(workout.name).slice(0, 60)}`
            : 'Ao seu treino',
          link: `mine:${data.workout_id}`,
          tag: `reaction-${id}`,
        };
      }
      break;
    }
    default:
      return reply({ error: 'unknown type' }, 400);
  }
  if (!notice) return reply({ error: 'forbidden' }, 403);

  const { data: devices } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', notice.to);

  const payload = JSON.stringify({
    title: notice.title,
    body: notice.body,
    tag: notice.tag,
    url: `/?abrir=${encodeURIComponent(notice.link)}`,
  });
  let sent = 0;
  await Promise.all(
    (devices ?? []).map(async (device) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: device.endpoint,
            keys: { p256dh: device.p256dh, auth: device.auth },
          },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
      } catch (error) {
        // Gone for good (app uninstalled, permission removed): forget it.
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await admin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', device.endpoint);
      }
    }),
  );
  return reply({ sent });
});
