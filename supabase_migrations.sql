-- 1. Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  country text DEFAULT 'Angola',
  province text,
  city text
);

-- Add province/city columns to existing installations
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS city text;

-- Enable RLS for universities
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- Allow public read access to universities
DROP POLICY IF EXISTS "Universities are viewable by everyone" ON public.universities;
CREATE POLICY "Universities are viewable by everyone" ON public.universities
  FOR SELECT USING (true);

-- Allow authenticated users to insert (for admin purposes or testing)
DROP POLICY IF EXISTS "Authenticated users can create universities" ON public.universities;
CREATE POLICY "Authenticated users can create universities" ON public.universities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  
DROP POLICY IF EXISTS "Authenticated users can update universities" ON public.universities;
CREATE POLICY "Authenticated users can update universities" ON public.universities
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Add max_pages to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS max_pages integer DEFAULT 80;

-- 3. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  amount numeric DEFAULT 35000 NOT NULL,
  reference_code text UNIQUE NOT NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'rejeitado')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payments
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update policies 
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
CREATE POLICY "Users can update own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Admin Setup
CREATE TABLE IF NOT EXISTS public.admin_users (
  email text PRIMARY KEY
);

-- Insert the default admin email
INSERT INTO public.admin_users (email) VALUES ('ildocuema@gmail.com') ON CONFLICT DO NOTHING;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.admin_users a ON u.email = a.email
    WHERE u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for admins
DROP POLICY IF EXISTS "Admins can do everything on projects" ON public.projects;
CREATE POLICY "Admins can do everything on projects" ON public.projects
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can do everything on payments" ON public.payments;
CREATE POLICY "Admins can do everything on payments" ON public.payments
  FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can do everything on universities" ON public.universities;
CREATE POLICY "Admins can do everything on universities" ON public.universities
  FOR ALL TO authenticated USING (public.is_admin());

-- Function for Admin Dashboard Statistics
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users INT;
  total_projects INT;
  total_revenue NUMERIC;
  pending_payments INT;
BEGIN
  -- Checks if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT count(*) INTO total_users FROM auth.users;
  SELECT count(*) INTO total_projects FROM public.projects;
  SELECT coalesce(sum(amount), 0) INTO total_revenue FROM public.payments WHERE status = 'pago';
  SELECT count(*) INTO pending_payments FROM public.payments WHERE status = 'pendente';

  RETURN json_build_object(
    'total_users', total_users,
    'total_projects', total_projects,
    'total_revenue', total_revenue,
    'pending_payments', pending_payments
  );
END;
$$;

-- 5. Admin Settings table (period control for dashboard stats)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id integer PRIMARY KEY DEFAULT 1,
  stats_reset_at timestamp with time zone DEFAULT '2020-01-01 00:00:00+00'::timestamptz NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.admin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage settings" ON public.admin_settings;
CREATE POLICY "Admins can manage settings" ON public.admin_settings
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Login logs table (access tracking)
CREATE TABLE IF NOT EXISTS public.login_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  logged_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can log their own logins" ON public.login_logs;
CREATE POLICY "Users can log their own logins" ON public.login_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all login logs" ON public.login_logs;
CREATE POLICY "Admins can view all login logs" ON public.login_logs
  FOR SELECT TO authenticated USING (public.is_admin());

-- Updated get_dashboard_stats: respects the stats_reset_at period
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users INT;
  total_projects INT;
  total_revenue NUMERIC;
  pending_payments INT;
  reset_date timestamp with time zone;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT stats_reset_at INTO reset_date FROM public.admin_settings WHERE id = 1;
  IF reset_date IS NULL THEN
    reset_date := '2020-01-01 00:00:00+00'::timestamptz;
  END IF;

  SELECT count(*) INTO total_users FROM auth.users WHERE created_at >= reset_date;
  SELECT count(*) INTO total_projects FROM public.projects WHERE created_at >= reset_date;
  SELECT coalesce(sum(amount), 0) INTO total_revenue
    FROM public.payments WHERE status = 'pago' AND created_at >= reset_date;
  SELECT count(*) INTO pending_payments
    FROM public.payments WHERE status = 'pendente' AND created_at >= reset_date;

  RETURN json_build_object(
    'total_users', total_users,
    'total_projects', total_projects,
    'total_revenue', total_revenue,
    'pending_payments', pending_payments,
    'stats_since', reset_date
  );
END;
$$;

-- Reset stats period (sets stats_reset_at to now, data is preserved)
CREATE OR REPLACE FUNCTION public.reset_dashboard_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  UPDATE public.admin_settings
    SET stats_reset_at = now(), updated_at = now()
    WHERE id = 1;
END;
$$;

-- Access statistics function (daily/monthly/yearly login counts)
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

  SELECT count(*) INTO today_count
    FROM public.login_logs
    WHERE logged_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

  SELECT count(*) INTO month_count
    FROM public.login_logs
    WHERE logged_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

  SELECT count(*) INTO year_count
    FROM public.login_logs
    WHERE logged_at >= date_trunc('year', now() AT TIME ZONE 'UTC');

  SELECT json_agg(d ORDER BY d.date)
  INTO daily_breakdown
  FROM (
    SELECT
      date_trunc('day', logged_at)::date AS date,
      count(*) AS count
    FROM public.login_logs
    WHERE logged_at >= now() - INTERVAL '30 days'
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

-- 7. Seed universities by province (Angola)
-- Universidades de Luanda
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Universidade Agostinho Neto (UAN)', 'Luanda', 'Luanda', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Universidade_Agostinho_Neto_logo.png/320px-Universidade_Agostinho_Neto_logo.png'),
  ('Universidade Lusíada de Angola (ULA)', 'Luanda', 'Luanda', NULL),
  ('Universidade Metodista de Angola (UMA)', 'Luanda', 'Luanda', NULL),
  ('Universidade Católica de Angola (UCAN)', 'Luanda', 'Luanda', NULL),
  ('Universidade Jean Piaget de Angola', 'Luanda', 'Luanda', NULL),
  ('Universidade Privada de Angola (UPRA)', 'Luanda', 'Luanda', NULL),
  ('Universidade Óscar Ribas (UÓR)', 'Luanda', 'Luanda', NULL),
  ('Universidade de Belas (UNIBELAS)', 'Luanda', 'Luanda', NULL),
  ('Universidade Técnica de Angola (UTANGA)', 'Luanda', 'Luanda', NULL),
  ('Universidade Independente de Angola (UNIA)', 'Luanda', 'Luanda', NULL),
  ('Instituto Superior Politécnico Gregório Semedo (IGS)', 'Luanda', 'Luanda', NULL),
  ('Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)', 'Luanda', 'Luanda', NULL),
  ('Instituto Superior de Ciências Sociais e Relações Internacionais (CISSRI)', 'Luanda', 'Luanda', NULL),
  ('Instituto Superior de Gestão e Administração de Luanda (ISGAL)', 'Luanda', 'Luanda', NULL),
  ('Instituto Superior de Ciências de Educação de Luanda (ISCED-Luanda)', 'Luanda', 'Luanda', NULL),
  ('Instituto Superior de Serviço Social (ISSS)', 'Luanda', 'Luanda', NULL),
  ('Escola Superior Pedagógica do Bengo', 'Luanda', 'Luanda', NULL)
ON CONFLICT DO NOTHING;

-- Universidades da Huíla
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Universidade Mandume ya Ndemofayo (UMN)', 'Huíla', 'Lubango', NULL),
  ('Instituto Superior Politécnico da Huíla (ISPH)', 'Huíla', 'Lubango', NULL),
  ('Instituto Superior de Ciências de Educação da Huíla (ISCED-Huíla)', 'Huíla', 'Lubango', NULL),
  ('Instituto Superior de Tecnologia de Lubango (ISTL)', 'Huíla', 'Lubango', NULL),
  ('Instituto Superior Politécnico Independente da Huíla (ISPIH)', 'Huíla', 'Lubango', NULL)
ON CONFLICT DO NOTHING;

-- Universidades do Huambo
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Universidade José Eduardo dos Santos (UJES) – Huambo', 'Huambo', 'Huambo', NULL),
  ('Instituto Superior de Ciências de Educação do Huambo (ISCED-Huambo)', 'Huambo', 'Huambo', NULL),
  ('Instituto Superior Politécnico do Huambo (ISPH-Huambo)', 'Huambo', 'Huambo', NULL),
  ('Instituto Superior Técnico de Engenharia do Huambo (ISTEH)', 'Huambo', 'Huambo', NULL)
ON CONFLICT DO NOTHING;

-- Universidades de Benguela
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Universidade Katyavala Bwila (UKB)', 'Benguela', 'Benguela', NULL),
  ('Instituto Superior de Ciências de Educação de Benguela (ISCED-Benguela)', 'Benguela', 'Benguela', NULL),
  ('Instituto Superior Politécnico de Benguela (ISPB)', 'Benguela', 'Benguela', NULL),
  ('Instituto Superior de Ciências da Saúde de Benguela (ISCISAB)', 'Benguela', 'Benguela', NULL)
ON CONFLICT DO NOTHING;

-- Universidades do Uíge
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Universidade Kimpa Vita (UKV)', 'Uíge', 'Uíge', NULL),
  ('Instituto Superior de Ciências de Educação do Uíge (ISCED-Uíge)', 'Uíge', 'Uíge', NULL),
  ('Instituto Superior Politécnico do Uíge (ISPU)', 'Uíge', 'Uíge', NULL)
ON CONFLICT DO NOTHING;

-- Universidades do Namibe
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Instituto Superior Politécnico do Namibe (ISPN)', 'Namibe', 'Moçâmedes', NULL),
  ('Instituto Superior de Ciências de Educação do Namibe (ISCED-Namibe)', 'Namibe', 'Moçâmedes', NULL),
  ('Instituto Superior de Tecnologia do Namibe (ISTN)', 'Namibe', 'Moçâmedes', NULL)
ON CONFLICT DO NOTHING;

-- Universidades de Cabinda
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Instituto Superior Politécnico de Cabinda (ISPDC)', 'Cabinda', 'Cabinda', NULL),
  ('Instituto Superior de Ciências de Educação de Cabinda (ISCED-Cabinda)', 'Cabinda', 'Cabinda', NULL)
ON CONFLICT DO NOTHING;

-- Universidades do Cunene
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Universidade Ondjiva (UO)', 'Cunene', 'Ondjiva', NULL),
  ('Instituto Superior Politécnico do Cunene (ISPC)', 'Cunene', 'Ondjiva', NULL)
ON CONFLICT DO NOTHING;

-- Universidades da Lunda Norte/Sul
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Instituto Superior Politécnico do Dundo (ISPD)', 'Lunda Norte', 'Dundo', NULL),
  ('Instituto Superior de Ciências de Educação da Lunda Norte (ISCED-Lunda Norte)', 'Lunda Norte', 'Dundo', NULL)
ON CONFLICT DO NOTHING;

-- Universidades de Malanje
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Instituto Superior Politécnico de Malanje (ISPM)', 'Malanje', 'Malanje', NULL),
  ('Instituto Superior de Ciências de Educação de Malanje (ISCED-Malanje)', 'Malanje', 'Malanje', NULL)
ON CONFLICT DO NOTHING;

-- Universidades do Moxico
INSERT INTO public.universities (name, province, city, logo_url) VALUES
  ('Instituto Superior Politécnico do Moxico (ISPMO)', 'Moxico', 'Luena', NULL),
  ('Instituto Superior de Ciências de Educação do Moxico (ISCED-Moxico)', 'Moxico', 'Luena', NULL)
ON CONFLICT DO NOTHING;
