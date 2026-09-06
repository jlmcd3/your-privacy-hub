-- lovable-cron-fallback-reviewed: 720 runs/day; user-required two-minute bounded batch driver is created inactive and stopped after queue drain
CREATE TABLE IF NOT EXISTS public.corpus_classification_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.authority_relevance_profiles(id) ON DELETE CASCADE,
  product text NOT NULL,
  source_table text NOT NULL,
  source_row_id uuid NOT NULL,
  model text NOT NULL,
  pipeline_version text NOT NULL,
  excerpt_chars integer NOT NULL,
  outcome jsonb NOT NULL,
  stage2 jsonb,
  promoted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.corpus_classification_results TO service_role;
CREATE INDEX IF NOT EXISTS ccr_run_idx ON public.corpus_classification_results (run_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ccr_run_profile_uidx ON public.corpus_classification_results (run_id, profile_id);
ALTER TABLE public.corpus_classification_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY ccr_service_all ON public.corpus_classification_results FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.corpus_classification_job_state (
  run_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'paused', 'rate_limited')),
  pause_status integer,
  pause_message text,
  paused_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.corpus_classification_job_state TO service_role;
ALTER TABLE public.corpus_classification_job_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY corpus_classification_job_state_service_all ON public.corpus_classification_job_state FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

SELECT cron.schedule(
  'corpus-classify-driver',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/generate-corpus-relevance-profiles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'action', 'classify_from_db',
      'product', 'lia',
      'run_id', current_setting('app.settings.corpus_classify_run_id', true)
    ),
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'corpus-classify-driver'),
  active := false
);