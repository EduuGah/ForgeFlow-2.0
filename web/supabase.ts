import {
  createClient,
  type SupabaseClient,
  type User as SupabaseAuthUser,
} from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://vuotoadogfazkycjfbrv.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_VAKlxNcHT0eDW_SFdXXJxQ_MfhxBios';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export interface AppUser {
  id: string;
  uid: string; // Alias for id so existing store logic works seamlessly
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export function toAppUser(
  user: SupabaseAuthUser | null | undefined,
): AppUser | null {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    uid: user.id,
    email: user.email,
    displayName:
      (meta.full_name as string) ||
      (meta.name as string) ||
      (user.email ? user.email.split('@')[0] : 'Atleta'),
    photoURL: (meta.avatar_url as string) || (meta.picture as string) || null,
  };
}

/* ------------------------------------------------------------------ */
/* Auth Helpers                                                       */
/* ------------------------------------------------------------------ */

export function isLoginDismissed(error: unknown): boolean {
  const msg = (error as { message?: string })?.message?.toLowerCase() || '';
  return msg.includes('user cancelled') || msg.includes('popup closed');
}

export function describeLoginError(error: unknown): {
  title: string;
  description?: string;
} {
  const msg = (error as { message?: string })?.message || String(error);
  if (msg.includes('provider is not enabled')) {
    return {
      title: 'Provedor Google não ativado no Supabase',
      description:
        'Ative o provedor Google em Authentication › Providers no painel do Supabase, ou crie uma conta com E-mail/Senha.',
    };
  }
  if (msg.includes('Invalid login credentials')) {
    return {
      title: 'E-mail ou senha incorretos',
      description: 'Verifique os dados digitados e tente novamente.',
    };
  }
  return {
    title: 'Erro de autenticação',
    description: msg,
  };
}

export async function loginWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo:
        typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  if (error) throw error;
}

export async function logoutSupabase(): Promise<void> {
  await supabase.auth.signOut();
}

export function onAuthStateChanged(
  callback: (user: AppUser | null) => void,
): () => void {
  // Check initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    callback(toAppUser(session?.user));
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAppUser(session?.user));
  });

  return () => {
    subscription.unsubscribe();
  };
}

/* ------------------------------------------------------------------ */
/* Supabase Data Sync Helpers                                         */
/* ------------------------------------------------------------------ */

export async function supabaseSetDocument(
  table: string,
  id: string,
  userId: string,
  data: object,
): Promise<void> {
  const { error } = await supabase.from(table).upsert({
    id,
    user_id: userId,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn(`[Supabase] Erro ao salvar em ${table}:`, error.message);
    throw error;
  }
}

export async function supabaseDeleteDocument(
  table: string,
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) {
    console.warn(`[Supabase] Erro ao excluir de ${table}:`, error.message);
    throw error;
  }
}

export async function supabaseFetchCollection<T>(
  table: string,
  userId: string,
): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('data')
    .eq('user_id', userId);
  if (error) {
    console.warn(`[Supabase] Erro ao buscar ${table}:`, error.message);
    throw error;
  }
  if (!data) return [];
  return data.map((row: { data: unknown }) => row.data as T);
}

export async function supabaseSetProfile(
  userId: string,
  profile: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    user_id: userId,
    name: profile.name,
    username: profile.username,
    email: profile.email,
    bio: profile.bio,
    experience: profile.experience,
    weight_kg: profile.weightKg,
    height_cm: profile.heightCm,
    main_goal: profile.mainGoal,
    streak_weeks: profile.streakWeeks,
    photo_data_url: profile.photoDataUrl,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('[Supabase] Erro ao salvar perfil:', error.message);
    throw error;
  }
}

export async function supabaseGetProfile(
  userId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('[Supabase] Erro ao buscar perfil:', error.message);
    return null;
  }
  if (!data) return null;
  return {
    name: data.name,
    username: data.username,
    email: data.email,
    bio: data.bio,
    experience: data.experience,
    weightKg: data.weight_kg,
    heightCm: data.height_cm,
    mainGoal: data.main_goal,
    streakWeeks: data.streak_weeks,
    photoDataUrl: data.photo_data_url,
  };
}

/* ------------------------------------------------------------------ */
/* Keep-Alive Mechanism                                               */
/* ------------------------------------------------------------------ */

const PING_STORAGE_KEY = 'forgeflow_supabase_last_ping';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function keepAliveSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const lastPingStr = localStorage.getItem(PING_STORAGE_KEY);
  const now = Date.now();

  if (lastPingStr) {
    const lastPingTime = new Date(lastPingStr).getTime();
    if (now - lastPingTime < ONE_DAY_MS) {
      return true;
    }
  }

  try {
    // Calling auth/v1/settings or getSession resets Supabase's 7-day inactivity counter
    await supabase.auth.getSession();
    localStorage.setItem(PING_STORAGE_KEY, new Date(now).toISOString());
    return true;
  } catch (error) {
    console.warn('[ForgeFlow] Supabase keep-alive ping falhou:', error);
    return false;
  }
}
