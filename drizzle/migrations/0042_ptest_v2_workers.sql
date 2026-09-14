-- DOC 261 (2026-09-14) — /all-ptest v2: evidence-scoped workers, validated
-- findings, the queue gate, batch settings.
--
-- Additive: every column is nullable or defaulted, so batches run under the
-- previous shape (review_gpt / review_claude / arb_document) keep working and
-- keep reading.

-- 1. A review row is now one WORKER run on one VENDOR (W-RECORD/claude,
--    W-LAW/claude, W-LAW/gpt, W-REASON/gpt, or LINT). `reviewer` keeps the
--    label the page reads.
ALTER TABLE public.ptest_reviews
  ADD COLUMN IF NOT EXISTS worker text,
  ADD COLUMN IF NOT EXISTS vendor text;

-- 2. Per-document / per-product metrics (by class × worker × vendor) beside the verdict.
ALTER TABLE public.ptest_arbitrations
  ADD COLUMN IF NOT EXISTS metrics jsonb;

-- 3. The settings a batch ran under (mode, prompt version, vendor map,
--    determinism flags, report date): two batches with different settings are
--    never compared.
ALTER TABLE public.ptest_batches
  ADD COLUMN IF NOT EXISTS settings jsonb;

-- 4. Tracked items carry their class and the rule they bind to.
ALTER TABLE public.ptest_fix_items
  ADD COLUMN IF NOT EXISTS fix_class text,
  ADD COLUMN IF NOT EXISTS rule_ref text,
  ADD COLUMN IF NOT EXISTS golden_ref text,
  ADD COLUMN IF NOT EXISTS finding_ids text[];

-- 4b. Jobs can carry a golden-panel reference and a small payload
--     (the `generate` job: which golden intake to regenerate).
ALTER TABLE public.ptest_jobs
  ADD COLUMN IF NOT EXISTS golden_id uuid,
  ADD COLUMN IF NOT EXISTS payload jsonb;

-- 4c. THE GOLDEN PANEL (doc 261 Stage 0 / §3.5): fixed intakes, regenerated
--     and re-reviewed after every fix batch. `source` is 'fixture' (a
--     *_PERFECT golden case, by id) or 'assessment' (a stored production
--     intake, by assessment id). For risk and cyber — which regenerate a
--     stored row by assessment_id — `assessment_id` is the panel's own
--     cppa_assessments row, created on first use and regenerated in place.
CREATE TABLE IF NOT EXISTS public.ptest_golden_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,                -- cppa-risk | cppa-cyber | cppa-admt
  source text NOT NULL,                 -- fixture | assessment
  ref text NOT NULL,                    -- fixture id or source assessment id
  label text NOT NULL,
  intake_data jsonb NOT NULL,
  module text,                          -- cppa_assessments.module for regeneration
  assessment_id text,                   -- the panel's own row (risk/cyber); null for admt
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

-- 4d. Every regeneration of a golden intake, with its document hash: two rows
--     per golden per batch (the determinism check compares them).
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

-- 5. ONE ROW PER FINDING — validated, dropped (with reason) or unbound — with
--    the evidence the validator checked and the classification/gate outcome.
CREATE TABLE IF NOT EXISTS public.ptest_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  tool_slug text NOT NULL,
  assessment_id text NOT NULL,
  worker text NOT NULL,                 -- W-RECORD | W-LAW | W-REASON | LINT
  vendor text,                          -- claude | gpt | null (lint)
  job_id uuid,
  golden_ref text,                      -- golden intake id when the document came from the panel
  finding_id text NOT NULL,             -- the worker's own id
  status text NOT NULL,                 -- validated | dropped | unbound
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
  -- Stage 4 outcome
  fix_class text,
  rule_ref text,
  class_reason text,
  dedupe_key text,
  merged_id text,
  route text,                           -- fix_list | ceo_sheet | intake_list | observed | lint_backlog
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

-- 6. Claim rules for the v2 job kinds.
--      lint · review_record · review_law_claude · review_law_gpt · review_reason
--      → classify (waits for the document's lint + every review_* job)
--      → arb_merge (waits for every other job of the product)
--    Legacy kinds (review, review_gpt, review_claude, arb_document) keep
--    their rules. Priority: lint, then reviews, then classify, then merge.
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
     -- legacy per-document arbitration waits for BOTH reviewers of that document
     AND (j.kind <> 'arb_document' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.assessment_id = j.assessment_id
              AND d.kind IN ('review', 'review_gpt', 'review_claude')
              AND d.status IN ('queued', 'running')))
     -- v2 classification waits for the document's lint and every worker
     AND (j.kind <> 'classify' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.assessment_id = j.assessment_id
              AND (d.kind = 'lint' OR d.kind LIKE 'review%')
              AND d.status IN ('queued', 'running')))
     -- the merge waits for every other job of its product
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
