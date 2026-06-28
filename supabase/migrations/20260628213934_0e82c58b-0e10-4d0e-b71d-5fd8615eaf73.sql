CREATE TABLE IF NOT EXISTS public.golden_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  validate_run_id UUID,
  tool TEXT NOT NULL,
  case_id TEXT NOT NULL,
  scenario_set TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'baseline',
  assertions_total INT NOT NULL DEFAULT 0,
  assertions_passed INT NOT NULL DEFAULT 0,
  failed_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS golden_results_run_id_idx ON public.golden_results(run_id);
CREATE INDEX IF NOT EXISTS golden_results_validate_run_id_idx ON public.golden_results(validate_run_id);
CREATE INDEX IF NOT EXISTS golden_results_tool_idx ON public.golden_results(tool);

GRANT SELECT ON public.golden_results TO authenticated;
GRANT ALL ON public.golden_results TO service_role;

ALTER TABLE public.golden_results ENABLE ROW LEVEL SECURITY;

-- Mirror quality_findings policy: only admins can read; service role writes.
CREATE POLICY "Admins read golden_results"
  ON public.golden_results
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));