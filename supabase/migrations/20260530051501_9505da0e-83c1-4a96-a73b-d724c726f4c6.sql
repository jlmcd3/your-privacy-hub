CREATE TABLE IF NOT EXISTS public.primary_source_fetch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued',
  dry_run boolean NOT NULL DEFAULT false,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  queried integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  extracted_verbatim integer NOT NULL DEFAULT 0,
  extracted_unverified integer NOT NULL DEFAULT 0,
  fetched_partial integer NOT NULL DEFAULT 0,
  fetch_failed integer NOT NULL DEFAULT 0,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT ON public.primary_source_fetch_runs TO authenticated;
GRANT ALL ON public.primary_source_fetch_runs TO service_role;

ALTER TABLE public.primary_source_fetch_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view fetch runs" ON public.primary_source_fetch_runs;
CREATE POLICY "Admins can view fetch runs"
ON public.primary_source_fetch_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_primary_source_fetch_runs_started_at
  ON public.primary_source_fetch_runs (started_at DESC);