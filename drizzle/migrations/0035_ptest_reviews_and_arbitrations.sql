-- /all-ptest — deep-review and arbitration artefacts.
-- batch_id references the existing static_stress_batches id used by the
-- Claude-intake harness; no new batch table is introduced.

CREATE TABLE IF NOT EXISTS public.ptest_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  tool_slug text NOT NULL,
  assessment_id text NOT NULL,
  company_name text,
  reviewer text NOT NULL,
  model text,
  effort text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  double_check text,
  overall text,
  usage jsonb,
  dropped_unlocatable integer NOT NULL DEFAULT 0,
  error text,
  prompt_version text,
  run_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ptest_reviews_batch_idx ON public.ptest_reviews (batch_id, tool_slug, created_at);

GRANT SELECT ON public.ptest_reviews TO authenticated;
GRANT ALL ON public.ptest_reviews TO service_role;

ALTER TABLE public.ptest_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ptest reviews"
ON public.ptest_reviews FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ptest_arbitrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid,
  tool_slug text NOT NULL,
  model text,
  effort text,
  fix_list jsonb NOT NULL DEFAULT '[]'::jsonb,
  ceo_sheet jsonb NOT NULL DEFAULT '[]'::jsonb,
  dropped jsonb NOT NULL DEFAULT '[]'::jsonb,
  double_check text,
  summary text,
  findings_in integer NOT NULL DEFAULT 0,
  input_truncated boolean NOT NULL DEFAULT false,
  prompt_version text,
  usage jsonb,
  error text,
  run_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ptest_arbitrations_batch_idx ON public.ptest_arbitrations (batch_id, tool_slug, created_at);

GRANT SELECT ON public.ptest_arbitrations TO authenticated;
GRANT ALL ON public.ptest_arbitrations TO service_role;

ALTER TABLE public.ptest_arbitrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ptest arbitrations"
ON public.ptest_arbitrations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));