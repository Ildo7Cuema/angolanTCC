-- Migration: Tracking de visitas ao site (incluindo utilizadores NÃO cadastrados)
-- Date: 2026-05-12
--
-- Objectivo:
--   Registar QUALQUER acesso ao site (anónimo ou autenticado) para permitir
--   medir visitantes únicos, page views e separar tráfego anónimo vs logado.
--
-- Estratégia:
--   - Cada navegador gera um `visitor_id` (UUID) guardado em localStorage.
--   - Cada navegação/route change insere uma linha em `site_visits`.
--   - Se o utilizador estiver autenticado, `user_id` é preenchido; caso
--     contrário fica NULL → visitante anónimo.
--   - RLS: qualquer um (anon/auth) pode INSERT; apenas admin pode SELECT.

CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  path text,
  user_agent text,
  referer text,
  visited_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON public.site_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON public.site_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_user_id ON public.site_visits(user_id);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa (anónimo ou autenticado) pode registar uma visita.
DROP POLICY IF EXISTS "Anyone can log a visit" ON public.site_visits;
CREATE POLICY "Anyone can log a visit" ON public.site_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Apenas admins podem ler.
DROP POLICY IF EXISTS "Admins can view all visits" ON public.site_visits;
CREATE POLICY "Admins can view all visits" ON public.site_visits
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Função: estatísticas de visitantes (anónimos + autenticados)
CREATE OR REPLACE FUNCTION public.get_visitor_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visitors_today INT;
  visitors_month INT;
  visitors_year INT;
  pageviews_today INT;
  pageviews_month INT;
  anon_today INT;
  anon_month INT;
  daily_breakdown json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Visitantes únicos por visitor_id (anónimos + autenticados)
  SELECT count(DISTINCT visitor_id) INTO visitors_today
    FROM public.site_visits
    WHERE visited_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  SELECT count(DISTINCT visitor_id) INTO visitors_month
    FROM public.site_visits
    WHERE visited_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT count(DISTINCT visitor_id) INTO visitors_year
    FROM public.site_visits
    WHERE visited_at >= date_trunc('year', now() AT TIME ZONE 'UTC');

  -- Total de page views
  SELECT count(*) INTO pageviews_today
    FROM public.site_visits
    WHERE visited_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  SELECT count(*) INTO pageviews_month
    FROM public.site_visits
    WHERE visited_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

  -- Visitantes NÃO cadastrados (sem user_id)
  SELECT count(DISTINCT visitor_id) INTO anon_today
    FROM public.site_visits
    WHERE visited_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
      AND user_id IS NULL;

  SELECT count(DISTINCT visitor_id) INTO anon_month
    FROM public.site_visits
    WHERE visited_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
      AND user_id IS NULL;

  -- Breakdown diário dos últimos 30 dias (visitantes únicos por dia)
  SELECT json_agg(d ORDER BY d.date)
  INTO daily_breakdown
  FROM (
    SELECT
      date_trunc('day', visited_at)::date AS date,
      count(DISTINCT visitor_id) AS count
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days'
    GROUP BY date_trunc('day', visited_at)::date
  ) d;

  RETURN json_build_object(
    'visitors_today', visitors_today,
    'visitors_month', visitors_month,
    'visitors_year', visitors_year,
    'pageviews_today', pageviews_today,
    'pageviews_month', pageviews_month,
    'anon_today', anon_today,
    'anon_month', anon_month,
    'daily_breakdown', coalesce(daily_breakdown, '[]'::json)
  );
END;
$$;
