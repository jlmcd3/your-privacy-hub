CREATE TABLE public.function_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  archetype     text,
  trust_class   text,
  user_id       uuid,
  invoked_by    text,
  status        text NOT NULL DEFAULT 'running',
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  duration_ms   integer,
  source_table  text,
  source_row_id uuid,
  error_message text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX function_runs_fn_time_idx ON public.function_runs(function_name, started_at DESC);
CREATE INDEX function_runs_status_idx  ON public.function_runs(status) WHERE status IN ('error','running');

ALTER TABLE public.function_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.function_runs TO authenticated;
GRANT ALL ON public.function_runs TO service_role;

CREATE POLICY "Admins read function_runs" ON public.function_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages function_runs" ON public.function_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);