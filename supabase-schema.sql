-- ============================================================
-- ForgeFlow 2.0 - Schema do Banco de Dados no Supabase
-- ============================================================
-- Como usar:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique em "SQL Editor"
-- 3. Clique em "New Query", cole todo este código e clique em "Run" (ou Ctrl+Enter)
--
-- Pode ser executado de novo a qualquer momento: cria o que falta e atualiza
-- bancos criados por versões anteriores deste arquivo sem apagar dados.
-- ============================================================

-- 1. Tabela de Perfil do Atleta (uma linha por usuário: id = user_id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  username TEXT,
  email TEXT,
  bio TEXT,
  experience TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  main_goal TEXT,
  streak_weeks INTEGER DEFAULT 0,
  photo_data_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabelas de documentos (o app guarda cada item inteiro em "data").
--    A chave é (user_id, id): ids como "pr-<exercício>-<tipo>" se repetem
--    entre usuários e não podem colidir.
CREATE TABLE IF NOT EXISTS public.gyms (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.templates (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.history (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.prs (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.hydration (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.meals (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.measurements (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, id)
);

-- ============================================================
-- Atualização de bancos antigos: a chave primária era só "id", então dois
-- usuários com o mesmo id (ex.: recorde no mesmo exercício) colidiam e a
-- sincronização do segundo falhava para sempre.
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'gyms', 'folders', 'templates', 'history', 'prs',
    'goals', 'hydration', 'meals', 'custom_exercises', 'measurements'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', tbl)::regclass
        AND contype = 'p'
        AND array_length(conkey, 1) = 1
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', tbl, tbl || '_pkey');
      EXECUTE format('ALTER TABLE public.%I ADD PRIMARY KEY (user_id, id)', tbl);
    END IF;
  END LOOP;
END $$;

-- O perfil só pode usar o próprio id do usuário (impede "reservar" o id de outro).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_is_user_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_is_user_id CHECK (id = user_id);
  END IF;
END $$;

-- ============================================================
-- Políticas de Segurança (Row Level Security - RLS)
-- Só usuários logados, e cada um exclusivamente com os próprios dados.
--
-- A versão anterior usava "user_id = coalesce(auth.uid()::text, user_id)":
-- sem login, auth.uid() é nulo e a condição vira "user_id = user_id", ou seja,
-- qualquer pessoa com a chave pública (que vai no app) lia e apagava os
-- dados de TODOS os usuários. Rodar este arquivo substitui essa política.
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles', 'gyms', 'folders', 'templates', 'history',
    'prs', 'goals', 'hydration', 'meals', 'custom_exercises', 'measurements'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Usuários acessam apenas seus dados" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Usuários acessam apenas seus dados" ON public.%I FOR ALL TO authenticated USING (user_id = (select auth.uid())::text) WITH CHECK (user_id = (select auth.uid())::text)',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- Keep-alive: o plano gratuito pausa o projeto após ~7 dias sem atividade.
-- O GitHub Action (.github/workflows/supabase-keepalive.yml) e o próprio app
-- chamam keep_alive() todo dia, que grava um horário no banco — atividade
-- real no Postgres, não só uma consulta de configuração.
-- A tabela não tem políticas: ninguém lê ou escreve nela diretamente.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.keep_alive (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);
ALTER TABLE public.keep_alive ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.keep_alive(p_source TEXT DEFAULT 'unknown')
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.keep_alive (id, pinged_at, source)
  VALUES (1, now(), left(p_source, 40))
  ON CONFLICT (id) DO UPDATE
    SET pinged_at = excluded.pinged_at, source = excluded.source
  RETURNING pinged_at;
$$;

REVOKE ALL ON FUNCTION public.keep_alive(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keep_alive(TEXT) TO anon, authenticated;

-- ============================================================
-- Amizades
-- ============================================================

-- Perfil público: só o necessário para alguém te encontrar (nunca o e-mail).
CREATE TABLE IF NOT EXISTS public.social_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT NOT NULL CHECK (username ~ '^[a-z0-9._-]{3,30}$'),
  name TEXT NOT NULL DEFAULT '' CHECK (char_length(name) <= 60),
  photo_url TEXT CHECK (char_length(photo_url) <= 300000),
  -- Desligado: amigos continuam amigos, mas não veem seus treinos.
  share_stats BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS social_profiles_username_key
  ON public.social_profiles (username);

-- Pedido nasce "pending"; só quem recebeu pode aceitar. Os dois lados podem
-- apagar (cancelar, recusar ou desfazer a amizade).
CREATE TABLE IF NOT EXISTS public.friendships (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES public.social_profiles (user_id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES public.social_profiles (user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id)
);
-- Um único vínculo por dupla, seja quem for que pediu.
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_key ON public.friendships (
  least(requester_id, addressee_id), greatest(requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id);

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis públicos visíveis para quem está logado" ON public.social_profiles;
CREATE POLICY "Perfis públicos visíveis para quem está logado" ON public.social_profiles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Cada um edita o próprio perfil público" ON public.social_profiles;
CREATE POLICY "Cada um edita o próprio perfil público" ON public.social_profiles
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

DROP POLICY IF EXISTS "Participantes veem o vínculo" ON public.friendships;
CREATE POLICY "Participantes veem o vínculo" ON public.friendships
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text IN (requester_id, addressee_id));
DROP POLICY IF EXISTS "Pedido sai em seu nome e pendente" ON public.friendships;
CREATE POLICY "Pedido sai em seu nome e pendente" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = (select auth.uid())::text
    AND status = 'pending'
    AND accepted_at IS NULL
  );
DROP POLICY IF EXISTS "Só o destinatário aceita" ON public.friendships;
CREATE POLICY "Só o destinatário aceita" ON public.friendships
  FOR UPDATE TO authenticated
  USING (addressee_id = (select auth.uid())::text AND status = 'pending')
  WITH CHECK (addressee_id = (select auth.uid())::text AND status = 'accepted');
DROP POLICY IF EXISTS "Participantes desfazem o vínculo" ON public.friendships;
CREATE POLICY "Participantes desfazem o vínculo" ON public.friendships
  FOR DELETE TO authenticated
  USING ((select auth.uid())::text IN (requester_id, addressee_id));

-- Ao aceitar, só o status e a data mudam: trocar quem pediu criaria uma
-- amizade com alguém que nunca concordou.
REVOKE UPDATE ON public.friendships FROM anon, authenticated;
GRANT UPDATE (status, accepted_at) ON public.friendships TO authenticated;

-- Amigo aceito, que compartilha os treinos, pode LER histórico e recordes.
CREATE OR REPLACE FUNCTION public.is_friend_sharing(p_owner TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = (select auth.uid())::text AND f.addressee_id = p_owner)
        OR (f.addressee_id = (select auth.uid())::text AND f.requester_id = p_owner)
      )
  )
  AND COALESCE(
    (SELECT share_stats FROM public.social_profiles WHERE user_id = p_owner),
    false
  );
$$;
REVOKE ALL ON FUNCTION public.is_friend_sharing(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_friend_sharing(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Amigos veem os treinos" ON public.history;
CREATE POLICY "Amigos veem os treinos" ON public.history
  FOR SELECT TO authenticated USING (public.is_friend_sharing(user_id));
DROP POLICY IF EXISTS "Amigos veem os recordes" ON public.prs;
CREATE POLICY "Amigos veem os recordes" ON public.prs
  FOR SELECT TO authenticated USING (public.is_friend_sharing(user_id));

-- Busca por nome ou @usuário (o termo é tratado como texto, nunca como padrão).
CREATE OR REPLACE FUNCTION public.search_people(p_query TEXT)
RETURNS SETOF public.social_profiles
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH q AS (
    SELECT lower(btrim(btrim(p_query), '@')) AS term
  ), pattern AS (
    SELECT term,
      '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%' AS p
    FROM q
  )
  SELECT s.* FROM public.social_profiles s, pattern
  WHERE char_length(pattern.term) >= 2
    AND s.user_id <> (select auth.uid())::text
    AND (s.username ILIKE pattern.p OR s.name ILIKE pattern.p)
  ORDER BY (s.username = pattern.term) DESC, s.username
  LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.search_people(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_people(TEXT) TO authenticated;

-- ============================================================
-- Rotinas compartilhadas entre amigos
-- Quem envia manda uma cópia (rotina ou pasta); quem recebe salva nas
-- próprias rotinas ou recusa. Só entre amigos aceitos.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.shared_routines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES public.social_profiles (user_id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES public.social_profiles (user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('routine', 'folder')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  payload JSONB NOT NULL CHECK (pg_column_size(payload) <= 200000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX IF NOT EXISTS shared_routines_recipient_idx
  ON public.shared_routines (recipient_id);
ALTER TABLE public.shared_routines ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.are_friends(p_other TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = (select auth.uid())::text AND f.addressee_id = p_other)
        OR (f.addressee_id = (select auth.uid())::text AND f.requester_id = p_other)
      )
  );
$$;
REVOKE ALL ON FUNCTION public.are_friends(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.are_friends(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Remetente e destinatário veem o envio" ON public.shared_routines;
CREATE POLICY "Remetente e destinatário veem o envio" ON public.shared_routines
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text IN (sender_id, recipient_id));
DROP POLICY IF EXISTS "Envio só para amigos e em seu nome" ON public.shared_routines;
CREATE POLICY "Envio só para amigos e em seu nome" ON public.shared_routines
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())::text
    AND public.are_friends(recipient_id)
  );
DROP POLICY IF EXISTS "Remetente e destinatário apagam o envio" ON public.shared_routines;
CREATE POLICY "Remetente e destinatário apagam o envio" ON public.shared_routines
  FOR DELETE TO authenticated
  USING ((select auth.uid())::text IN (sender_id, recipient_id));
-- Sem política de UPDATE: um envio não muda depois de feito.

-- ============================================================
-- Chat entre amigos
-- Só amigos aceitos trocam mensagens; só quem recebe marca como lida.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES public.social_profiles (user_id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES public.social_profiles (user_id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CHECK (sender_id <> recipient_id)
);
-- Conversa de uma dupla em ordem, e as não lidas de cada pessoa.
CREATE INDEX IF NOT EXISTS messages_pair_idx ON public.messages (
  least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at
);
CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON public.messages (recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quem conversa vê as mensagens" ON public.messages;
CREATE POLICY "Quem conversa vê as mensagens" ON public.messages
  FOR SELECT TO authenticated
  USING ((select auth.uid())::text IN (sender_id, recipient_id));
DROP POLICY IF EXISTS "Mensagem só para amigos e em seu nome" ON public.messages;
CREATE POLICY "Mensagem só para amigos e em seu nome" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())::text
    AND read_at IS NULL
    AND public.are_friends(recipient_id)
  );
DROP POLICY IF EXISTS "Quem recebe marca como lida" ON public.messages;
CREATE POLICY "Quem recebe marca como lida" ON public.messages
  FOR UPDATE TO authenticated
  USING (recipient_id = (select auth.uid())::text)
  WITH CHECK (recipient_id = (select auth.uid())::text);
-- Ao marcar como lida, só a data muda (o texto e os participantes, nunca).
REVOKE UPDATE ON public.messages FROM anon, authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

-- Mensagens chegam na hora (Realtime), quando o projeto tem a publicação.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ============================================================
-- Notificações com o app fechado (Web Push)
-- Cada aparelho que ativou as notificações; a função "push"
-- (supabase/functions/push) envia para eles.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint TEXT PRIMARY KEY CHECK (char_length(endpoint) <= 1000),
  user_id TEXT NOT NULL,
  p256dh TEXT NOT NULL CHECK (char_length(p256dh) <= 200),
  auth TEXT NOT NULL CHECK (char_length(auth) <= 100),
  user_agent TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cada um cuida dos próprios aparelhos" ON public.push_subscriptions;
CREATE POLICY "Cada um cuida dos próprios aparelhos" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = (select auth.uid())::text)
  WITH CHECK (user_id = (select auth.uid())::text);

-- ============================================================
-- Excluir dados e conta (Configurações › Excluir dados)
-- Sempre de quem está logado; nunca recebem o id de fora.
-- ============================================================

-- Treinos, rotinas, recordes, metas, medidas, hidratação, nutrição e perfil.
-- Mantém o login, o @ e os amigos.
CREATE OR REPLACE FUNCTION public.delete_my_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me TEXT := (select auth.uid())::text;
  tbl TEXT;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'É preciso estar logado' USING ERRCODE = '42501';
  END IF;
  FOREACH tbl IN ARRAY ARRAY[
    'gyms', 'folders', 'templates', 'history', 'prs', 'goals',
    'hydration', 'meals', 'custom_exercises', 'measurements', 'profiles'
  ]
  LOOP
    EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', tbl) USING me;
  END LOOP;
  -- Rotinas que enviou ou que esperam por você também são dados seus.
  DELETE FROM public.shared_routines WHERE me IN (sender_id, recipient_id);
  -- E as conversas (dos dois lados: uma conversa pela metade não serve).
  DELETE FROM public.messages WHERE me IN (sender_id, recipient_id);
  -- E os aparelhos que recebiam notificações.
  DELETE FROM public.push_subscriptions WHERE user_id = me;
END;
$$;

-- Tudo acima, mais o @, as amizades e o próprio login. Não dá para desfazer.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me TEXT := (select auth.uid())::text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'É preciso estar logado' USING ERRCODE = '42501';
  END IF;
  PERFORM public.delete_my_data();
  -- As amizades saem junto (ON DELETE CASCADE).
  DELETE FROM public.social_profiles WHERE user_id = me;
  DELETE FROM auth.users WHERE id = me::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
