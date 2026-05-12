-- Migration: Funil visitante→utilizador + insights detalhados do tráfego
-- Date: 2026-05-12
--
-- 1) claim_visitor_visits(p_visitor_id text)
--    Quando um visitante anónimo se cadastra ou faz login, esta função
--    associa retroactivamente todas as visitas dele (mesmo visitor_id) à
--    conta criada. Isto permite medir o funil "visitou → cadastrou-se".
--
-- 2) get_visitor_details()
--    Devolve insights agregados dos últimos 30 dias:
--      - top_paths: páginas mais vistas
--      - top_referers: origens de tráfego (domínio do referer)
--      - device_breakdown: mobile / tablet / desktop
--      - browser_breakdown: chrome / firefox / safari / edge / opera / outros
--      - recent_visits: últimas 50 visitas (com email do utilizador se logado)
--      - conversion_rate: % de visitantes que se cadastraram
--
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_visitor_visits(p_visitor_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só faz sentido quando há um utilizador autenticado e um visitor_id válido
  IF auth.uid() IS NULL OR p_visitor_id IS NULL OR p_visitor_id = '' THEN
    RETURN;
  END IF;

  UPDATE public.site_visits
    SET user_id = auth.uid()
    WHERE visitor_id = p_visitor_id
      AND user_id IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_visitor_visits(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_visitor_details()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  top_paths json;
  top_referers json;
  device_breakdown json;
  browser_breakdown json;
  recent_visits json;
  total_visitors INT;
  converted_visitors INT;
  conversion_rate numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Top 10 páginas mais visitadas (últimos 30 dias)
  SELECT json_agg(p ORDER BY p.views DESC) INTO top_paths
  FROM (
    SELECT
      path,
      count(*) AS views,
      count(DISTINCT visitor_id) AS visitors
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days'
      AND path IS NOT NULL
    GROUP BY path
    ORDER BY count(*) DESC
    LIMIT 10
  ) p;

  -- Top 10 origens de tráfego (domínio do referer)
  SELECT json_agg(r ORDER BY r.visits DESC) INTO top_referers
  FROM (
    SELECT
      CASE
        WHEN referer IS NULL OR referer = '' THEN 'Directo'
        ELSE regexp_replace(
               coalesce(substring(referer from '://([^/]+)'), 'Directo'),
               '^www\.', ''
             )
      END AS source,
      count(*) AS visits,
      count(DISTINCT visitor_id) AS visitors
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days'
    GROUP BY source
    ORDER BY count(*) DESC
    LIMIT 10
  ) r;

  -- Dispositivos (heurística baseada em user_agent)
  SELECT json_agg(d ORDER BY d.visitors DESC) INTO device_breakdown
  FROM (
    SELECT
      CASE
        WHEN user_agent IS NULL OR user_agent = '' THEN 'Desconhecido'
        WHEN user_agent ~* '(iPad|Tablet)'                THEN 'Tablet'
        WHEN user_agent ~* '(Mobile|Android|iPhone|iPod)' THEN 'Mobile'
        ELSE 'Desktop'
      END AS device,
      count(DISTINCT visitor_id) AS visitors,
      count(*) AS visits
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days'
    GROUP BY device
    ORDER BY count(DISTINCT visitor_id) DESC
  ) d;

  -- Navegadores (a ordem dos CASE é importante: Edge antes de Chrome)
  SELECT json_agg(b ORDER BY b.visitors DESC) INTO browser_breakdown
  FROM (
    SELECT
      CASE
        WHEN user_agent IS NULL OR user_agent = '' THEN 'Desconhecido'
        WHEN user_agent ~* 'Edg/'                   THEN 'Edge'
        WHEN user_agent ~* '(OPR/|Opera)'           THEN 'Opera'
        WHEN user_agent ~* 'Firefox'                THEN 'Firefox'
        WHEN user_agent ~* 'Chrome'                 THEN 'Chrome'
        WHEN user_agent ~* 'Safari'                 THEN 'Safari'
        ELSE 'Outros'
      END AS browser,
      count(DISTINCT visitor_id) AS visitors,
      count(*) AS visits
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days'
    GROUP BY browser
    ORDER BY count(DISTINCT visitor_id) DESC
  ) b;

  -- Últimas 50 visitas (com email do utilizador, se autenticado)
  SELECT json_agg(v ORDER BY v.visited_at DESC) INTO recent_visits
  FROM (
    SELECT
      sv.id,
      sv.visitor_id,
      sv.path,
      sv.referer,
      sv.user_agent,
      sv.visited_at,
      sv.user_id,
      u.email AS user_email
    FROM public.site_visits sv
    LEFT JOIN auth.users u ON u.id = sv.user_id
    ORDER BY sv.visited_at DESC
    LIMIT 50
  ) v;

  -- Funil de conversão (últimos 30 dias)
  SELECT count(DISTINCT visitor_id) INTO total_visitors
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days';

  SELECT count(DISTINCT visitor_id) INTO converted_visitors
    FROM public.site_visits
    WHERE visited_at >= now() - INTERVAL '30 days'
      AND user_id IS NOT NULL;

  IF total_visitors > 0 THEN
    conversion_rate := round((converted_visitors::numeric / total_visitors::numeric) * 100, 1);
  ELSE
    conversion_rate := 0;
  END IF;

  RETURN json_build_object(
    'top_paths',          coalesce(top_paths,         '[]'::json),
    'top_referers',       coalesce(top_referers,      '[]'::json),
    'device_breakdown',   coalesce(device_breakdown,  '[]'::json),
    'browser_breakdown',  coalesce(browser_breakdown, '[]'::json),
    'recent_visits',      coalesce(recent_visits,     '[]'::json),
    'total_visitors',     total_visitors,
    'converted_visitors', converted_visitors,
    'conversion_rate',    conversion_rate
  );
END;
$$;
