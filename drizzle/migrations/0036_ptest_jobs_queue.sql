CREATE TABLE public.ptest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  tool_slug text NOT NULL,
  kind text NOT NULL,
  assessment_id uuid,
  company_name text,
  effort text NOT NULL DEFAULT 'high',
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 2,
  claimed_at timestamptz,
  heartbeat_at timestamptz,
  finished_at timestamptz,
  result_id uuid,
  input_truncated boolean NOT NULL DEFAULT false,
  note text,
  error text,
  run_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ptest_jobs TO authenticated;
GRANT ALL ON public.ptest_jobs TO service_role;

ALTER TABLE public.ptest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read ptest jobs"
ON public.ptest_jobs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ptest_jobs_batch_idx ON public.ptest_jobs (batch_id, status);
CREATE INDEX ptest_jobs_claim_idx ON public.ptest_jobs (status, kind);

ALTER TABLE public.ptest_arbitrations ADD COLUMN IF NOT EXISTS arbitration_scope text NOT NULL DEFAULT 'batch';
ALTER TABLE public.ptest_arbitrations ADD COLUMN IF NOT EXISTS assessment_id uuid;
ALTER TABLE public.ptest_arbitrations ADD COLUMN IF NOT EXISTS parent_job_id uuid;

CREATE OR REPLACE FUNCTION public.claim_ptest_job(_batch_id uuid, _stale_after interval DEFAULT '15 minutes')
RETURNS SETOF public.ptest_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.ptest_jobs;
BEGIN
  -- A job whose worker died mid-flight is re-queued once, never twice.
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
     -- a per-document arbitration waits for that document's review
     AND (j.kind <> 'arb_document' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.assessment_id = j.assessment_id
              AND d.kind = 'review'
              AND d.status IN ('queued', 'running')))
     -- the merge waits for every review and per-document arbitration of its product
     AND (j.kind <> 'arb_merge' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.tool_slug = j.tool_slug
              AND d.kind IN ('review', 'arb_document')
              AND d.status IN ('queued', 'running')))
   ORDER BY (j.kind = 'review') DESC, j.created_at
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