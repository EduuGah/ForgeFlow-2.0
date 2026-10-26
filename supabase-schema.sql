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
