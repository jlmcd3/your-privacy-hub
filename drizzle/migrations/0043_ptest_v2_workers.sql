ALTER TABLE public.ptest_reviews
  ADD COLUMN IF NOT EXISTS worker text,
  ADD COLUMN IF NOT EXISTS vendor text;

ALTER TABLE public.ptest_arbitrations
  ADD COLUMN IF NOT EXISTS metrics jsonb;

ALTER TABLE public.ptest_batches
  ADD COLUMN IF NOT EXISTS settings jsonb;

ALTER TABLE public.ptest_fix_items
  ADD COLUMN IF NOT EXISTS fix_class text,
  ADD COLUMN IF NOT EXISTS rule_ref text,
  ADD COLUMN IF NOT EXISTS golden_ref text,
  ADD COLUMN IF NOT EXISTS finding_ids text[];

ALTER TABLE public.ptest_jobs
  ADD COLUMN IF NOT EXISTS golden_id uuid,
  ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE TABLE IF NOT EXISTS public.ptest_golden_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  source text NOT NULL,
  ref text NOT NULL,
  label text NOT NULL,
  intake_data jsonb NOT NULL,
  module text,
  assessment_id text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product, ref)
);

GRANT SELECT ON public.ptest_golden_intakes TO authenticated;
GRANT ALL ON public.ptest_golden_intakes TO service_role;
ALTER TABLE public.ptest_golden_intakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read ptest golden intakes" ON public.ptest_golden_intakes;
CREATE POLICY "Admins can read ptest golden intakes"
ON public.ptest_golden_intakes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ptest_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  golden_id uuid,
  product text NOT NULL,
  assessment_id text,
  run_no integer NOT NULL DEFAULT 1,
  document_hash text,
  document_chars integer,
  report_date text,
  settings jsonb,
  elapsed_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ptest_generations_batch_idx ON public.ptest_generations (batch_id, product);
GRANT SELECT ON public.ptest_generations TO authenticated;
GRANT ALL ON public.ptest_generations TO service_role;
ALTER TABLE public.ptest_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read ptest generations" ON public.ptest_generations;
CREATE POLICY "Admins can read ptest generations"
ON public.ptest_generations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ptest_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  tool_slug text NOT NULL,
  assessment_id text NOT NULL,
  worker text NOT NULL,
  vendor text,
  job_id uuid,
  golden_ref text,
  finding_id text NOT NULL,
  status text NOT NULL,
  drop_reason text,
  kind text,
  severity text,
  confidence text,
  block_key text,
  block_key_b text,
  quote text,
  quote_b text,
  why text,
  intake_key text,
  intake_value text,
  registry_row_id text,
  registry_quote text,
  binding text,
  reanchored boolean NOT NULL DEFAULT false,
  lint_rule text,
  fix_class text,
  rule_ref text,
  class_reason text,
  dedupe_key text,
  merged_id text,
  route text,
  queued boolean NOT NULL DEFAULT false,
  gate_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ptest_findings_batch_idx ON public.ptest_findings (batch_id, tool_slug, assessment_id);
CREATE INDEX IF NOT EXISTS ptest_findings_doc_idx ON public.ptest_findings (tool_slug, assessment_id, status);
CREATE INDEX IF NOT EXISTS ptest_findings_golden_idx ON public.ptest_findings (tool_slug, golden_ref, status);

GRANT SELECT ON public.ptest_findings TO authenticated;
GRANT ALL ON public.ptest_findings TO service_role;

ALTER TABLE public.ptest_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ptest findings" ON public.ptest_findings;
CREATE POLICY "Admins can read ptest findings"
ON public.ptest_findings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_ptest_job(_batch_id uuid, _stale_after interval DEFAULT '15 minutes')
RETURNS SETOF public.ptest_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.ptest_jobs;
BEGIN
  UPDATE public.ptest_jobs
     SET status = 'queued',
         note = 'heartbeat went stale; re-queued'
   WHERE batch_id = _batch_id
     AND status = 'running'
     AND heartbeat_at < now() - _stale_after
     AND attempts < max_attempts;

  SELECT j.* INTO v
    FROM public.ptest_jobs j
   WHERE j.batch_id = _batch_id
     AND j.status = 'queued'
     AND j.attempts < j.max_attempts
     AND (j.kind <> 'arb_document' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.assessment_id = j.assessment_id
              AND d.kind IN ('review', 'review_gpt', 'review_claude')
              AND d.status IN ('queued', 'running')))
     AND (j.kind <> 'classify' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.assessment_id = j.assessment_id
              AND (d.kind = 'lint' OR d.kind LIKE 'review%')
              AND d.status IN ('queued', 'running')))
     AND (j.kind <> 'arb_merge' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.tool_slug = j.tool_slug
              AND d.kind <> 'arb_merge'
              AND d.status IN ('queued', 'running')))
   ORDER BY
     CASE
       WHEN j.kind = 'generate' THEN 0
       WHEN j.kind = 'lint' THEN 1
       WHEN j.kind LIKE 'review%' THEN 2
       WHEN j.kind IN ('classify', 'arb_document') THEN 3
       ELSE 4
     END,
     j.created_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.ptest_jobs
     SET status = 'running',
         attempts = attempts + 1,
         claimed_at = now(),
         heartbeat_at = now()
   WHERE id = v.id
  RETURNING * INTO v;

  RETURN NEXT v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ptest_job(uuid, interval) TO service_role;