-- ============================================================
-- ForgeFlow 2.0 - Schema do Banco de Dados no Supabase
-- ============================================================
-- Como usar:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique em "SQL Editor"
-- 3. Clique em "New Query", cole todo este código e clique em "Run" (ou Ctrl+Enter)
-- ============================================================

-- 1. Tabela de Perfil do Atleta
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

-- 2. Tabela de Academias
CREATE TABLE IF NOT EXISTS public.gyms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Pastas de Rotinas
CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Fichas / Rotinas (Templates)
CREATE TABLE IF NOT EXISTS public.templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Histórico de Treinos Concluídos
CREATE TABLE IF NOT EXISTS public.history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Recordes Pessoais (PRs)
CREATE TABLE IF NOT EXISTS public.prs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Metas
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Registros de Hidratação
CREATE TABLE IF NOT EXISTS public.hydration (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Refeições / Nutrição
CREATE TABLE IF NOT EXISTS public.meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Exercícios Customizados
CREATE TABLE IF NOT EXISTS public.custom_exercises (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Tabela de Medidas Corporais
CREATE TABLE IF NOT EXISTS public.measurements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- Índices para busca ultra-rápida por usuário
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_gyms_user_id ON public.gyms(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.history(user_id);
CREATE INDEX IF NOT EXISTS idx_prs_user_id ON public.prs(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_hydration_user_id ON public.hydration(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_exercises_user_id ON public.custom_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON public.measurements(user_id);

-- ============================================================
-- Políticas de Segurança (Row Level Security - RLS)
-- Garante que cada usuário acesse exclusivamente seus dados
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles', 'gyms', 'folders', 'templates', 'history',
    'prs', 'goals', 'hydration', 'meals', 'custom_exercises', 'measurements'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Usuários acessam apenas seus dados" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Usuários acessam apenas seus dados" ON public.%I FOR ALL USING (user_id = auth.uid()::text OR user_id = coalesce(auth.uid()::text, user_id)) WITH CHECK (user_id = auth.uid()::text OR user_id = coalesce(auth.uid()::text, user_id))',
      tbl
    );
  END LOOP;
END $$;
