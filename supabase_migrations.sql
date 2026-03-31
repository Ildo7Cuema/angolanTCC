-- 1. Create universities table
CREATE TABLE IF NOT EXISTS public.universities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  country text DEFAULT 'Angola'
);

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
  amount numeric DEFAULT 55000 NOT NULL,
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
