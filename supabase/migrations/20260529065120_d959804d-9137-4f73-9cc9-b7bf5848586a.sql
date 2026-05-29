CREATE TABLE IF NOT EXISTS public.ingest_run_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode TEXT NOT NULL,
  source_group TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  inserted INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  per_source JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ingest_run_log TO authenticated;
GRANT ALL ON public.ingest_run_log TO service_role;

ALTER TABLE public.ingest_run_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ingest run log"
  ON public.ingest_run_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ingest_run_log_started_at ON public.ingest_run_log (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingest_run_log_mode ON public.ingest_run_log (mode, started_at DESC);