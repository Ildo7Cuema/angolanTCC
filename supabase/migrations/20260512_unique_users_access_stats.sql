-- Migration: Atualiza get_access_stats() para contar UTILIZADORES ÚNICOS por período
-- Date: 2026-05-12
--
-- Antes: SELECT count(*) FROM login_logs  → contava cada login (utilizador que
--        entrasse 5 vezes no dia contava como 5 acessos).
-- Agora: SELECT count(DISTINCT user_id)   → conta cada utilizador apenas uma vez
--        por dia / mês / ano.
--
-- O daily_breakdown (gráfico dos últimos 14/30 dias) também passa a representar
-- "utilizadores únicos por dia" em vez de "logins por dia".

CREATE OR REPLACE FUNCTION public.get_access_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_count INT;
  month_count INT;
  year_count INT;
  daily_breakdown json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(DISTINCT user_id) INTO today_count
    FROM public.login_logs
    WHERE logged_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
      AND user_id IS NOT NULL;

  SELECT count(DISTINCT user_id) INTO month_count
    FROM public.login_logs
    WHERE logged_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
      AND user_id IS NOT NULL;

  SELECT count(DISTINCT user_id) INTO year_count
    FROM public.login_logs
    WHERE logged_at >= date_trunc('year', now() AT TIME ZONE 'UTC')
      AND user_id IS NOT NULL;

  SELECT json_agg(d ORDER BY d.date)
  INTO daily_breakdown
  FROM (
    SELECT
      date_trunc('day', logged_at)::date AS date,
      count(DISTINCT user_id) AS count
    FROM public.login_logs
    WHERE logged_at >= now() - INTERVAL '30 days'
      AND user_id IS NOT NULL
    GROUP BY date_trunc('day', logged_at)::date
  ) d;

  RETURN json_build_object(
    'today', today_count,
    'month', month_count,
    'year', year_count,
    'daily_breakdown', coalesce(daily_breakdown, '[]'::json)
  );
END;
$$;
