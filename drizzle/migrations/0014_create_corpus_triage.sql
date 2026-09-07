-- lovable-cron-fallback-reviewed: 288 runs/day; bounded five-minute batch driver created INACTIVE, activated only on operator instruction and stopped when the queue drains.

CREATE TABLE IF NOT EXISTS public.corpus_triage_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  action_id uuid NOT NULL REFERENCES public.enforcement_actions(id) ON DELETE CASCADE,
  model text NOT NULL,
  proposed_subject text,
  proposed_record_class text,
  proposed_usable_for text[] NOT NULL DEFAULT '{}',
  proposed_topic_tags text[] NOT NULL DEFAULT '{}',
  proposed_li_relevance text,
  confidence numeric,
  rationale text,
  raw_head text,
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'unusable', 'error')),
  promoted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.corpus_triage_results TO service_role;
CREATE INDEX IF NOT EXISTS ctr_run_idx ON public.corpus_triage_results (run_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ctr_run_action_uidx ON public.corpus_triage_results (run_id, action_id);
ALTER TABLE public.corpus_triage_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ctr_service_all ON public.corpus_triage_results;
CREATE POLICY ctr_service_all ON public.corpus_triage_results
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS ctr_admin_read ON public.corpus_triage_results;
CREATE POLICY ctr_admin_read ON public.corpus_triage_results
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.corpus_triage_results TO authenticated;

CREATE TABLE IF NOT EXISTS public.corpus_triage_job_state (
  run_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'paused', 'rate_limited')),
  pause_status integer,
  pause_message text,
  paused_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.corpus_triage_job_state TO service_role;
ALTER TABLE public.corpus_triage_job_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ctjs_service_all ON public.corpus_triage_job_state;
CREATE POLICY ctjs_service_all ON public.corpus_triage_job_state
  FOR ALL TO service_role USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.internal_driver_tokens (name) VALUES ('corpus-triage')
ON CONFLICT (name) DO NOTHING;

SELECT cron.schedule(
  'corpus-triage-driver',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/corpus-triage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'x-driver-token', (SELECT token FROM public.internal_driver_tokens WHERE name = 'corpus-triage' LIMIT 1),
      'Authorization', 'Bearer internal-driver'
    ),
    body := jsonb_build_object(
      'action', 'triage_batch',
      'run_id', current_setting('app.settings.corpus_triage_run_id', true),
      'batch_size', 6
    ),
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'corpus-triage-driver'),
  active := false
);