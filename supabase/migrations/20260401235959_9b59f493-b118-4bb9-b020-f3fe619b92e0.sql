CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL,
  inserted integer DEFAULT 0,
  skipped integer DEFAULT 0,
  summaries_generated integer DEFAULT 0,
  enrichment_failed_429 integer DEFAULT 0,
  enrichment_failed_other integer DEFAULT 0
);

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.ingestion_runs FOR ALL USING (false);

CREATE POLICY "Service role manages ingestion_runs" ON public.ingestion_runs FOR ALL TO service_role USING (true) WITH CHECK (true);