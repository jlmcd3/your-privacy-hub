
CREATE TABLE public.long_running_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  tool TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by UUID,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  progress TEXT,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.long_running_jobs TO authenticated;
GRANT ALL ON public.long_running_jobs TO service_role;

ALTER TABLE public.long_running_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read long_running_jobs"
ON public.long_running_jobs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_long_running_jobs_kind_status ON public.long_running_jobs (kind, status, started_at DESC);

CREATE TRIGGER update_long_running_jobs_updated_at
BEFORE UPDATE ON public.long_running_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
