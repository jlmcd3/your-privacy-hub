
-- P-A: Held-out split for quality loop diagnostics.
ALTER TABLE public.quality_run_documents
  ADD COLUMN IF NOT EXISTS scenario_set text;

ALTER TABLE public.quality_findings
  ADD COLUMN IF NOT EXISTS scenario_set text;

ALTER TABLE public.quality_check_results
  ADD COLUMN IF NOT EXISTS tuning_pass_count integer,
  ADD COLUMN IF NOT EXISTS tuning_fail_count integer,
  ADD COLUMN IF NOT EXISTS tuning_fail_rate numeric,
  ADD COLUMN IF NOT EXISTS holdout_pass_count integer,
  ADD COLUMN IF NOT EXISTS holdout_fail_count integer,
  ADD COLUMN IF NOT EXISTS holdout_fail_rate numeric;

ALTER TABLE public.quality_runs
  ADD COLUMN IF NOT EXISTS score_overall_tuning numeric,
  ADD COLUMN IF NOT EXISTS score_overall_holdout numeric;

-- OPTIONAL PILOT: per-fix A/B held-out validation runs (biometric only at first).
CREATE TABLE IF NOT EXISTS public.quality_validate_fix_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool text NOT NULL,
  check_id text NOT NULL,
  run_id uuid,
  requested_by uuid,
  status text NOT NULL DEFAULT 'pending',
  intake_count integer NOT NULL DEFAULT 0,
  baseline_score numeric,
  override_score numeric,
  delta numeric,
  per_intake jsonb,
  system_prompt_override text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT ON public.quality_validate_fix_runs TO authenticated;
GRANT ALL ON public.quality_validate_fix_runs TO service_role;

ALTER TABLE public.quality_validate_fix_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view validate-fix runs"
  ON public.quality_validate_fix_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
