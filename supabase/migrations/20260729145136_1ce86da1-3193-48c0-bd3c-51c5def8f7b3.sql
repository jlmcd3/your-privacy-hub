CREATE TABLE public.replay_harness_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_ids text[] NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  error text
);
REVOKE ALL ON public.replay_harness_jobs FROM anon, authenticated;
GRANT ALL ON public.replay_harness_jobs TO service_role;
ALTER TABLE public.replay_harness_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "harness_jobs_service_role_only" ON public.replay_harness_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.replay_harness_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.replay_harness_jobs(id) ON DELETE CASCADE,
  doc_id text NOT NULL,
  per_doc_result jsonb NOT NULL,
  side_by_side jsonb,
  pass1_usage jsonb,
  assembled_report jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.replay_harness_results FROM anon, authenticated;
GRANT ALL ON public.replay_harness_results TO service_role;
ALTER TABLE public.replay_harness_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "harness_results_service_role_only" ON public.replay_harness_results
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX idx_replay_harness_results_job ON public.replay_harness_results(job_id);