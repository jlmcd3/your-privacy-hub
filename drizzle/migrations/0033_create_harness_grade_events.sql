CREATE TABLE public.harness_grade_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text NOT NULL,
  tool_slug text,
  kind text NOT NULL,
  job_key text NOT NULL,
  ok boolean,
  claude_score numeric,
  gpt_score numeric,
  batch_started_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX harness_grade_events_dedupe
  ON public.harness_grade_events (batch_id, kind, job_key);
CREATE INDEX harness_grade_events_batch_idx
  ON public.harness_grade_events (batch_id, created_at DESC);

GRANT SELECT, INSERT ON public.harness_grade_events TO authenticated;
GRANT ALL ON public.harness_grade_events TO service_role;

ALTER TABLE public.harness_grade_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read harness grade events"
  ON public.harness_grade_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert harness grade events"
  ON public.harness_grade_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());