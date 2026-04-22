-- 1. Role enum + table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages roles"
  ON public.user_roles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Extend ingestion_runs
ALTER TABLE public.ingestion_runs
  ADD COLUMN IF NOT EXISTS job_name TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS fetched INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enriched INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_job_time
  ON public.ingestion_runs (job_name, run_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status
  ON public.ingestion_runs (status, run_at DESC);

-- 3. Admin read access on ingestion_runs
CREATE POLICY "Admins can read ingestion runs"
  ON public.ingestion_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
