CREATE TABLE public.quality_score_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name text NOT NULL,
  run_date timestamptz NOT NULL DEFAULT now(),
  quality_run_id uuid REFERENCES public.quality_runs(id) ON DELETE SET NULL,
  overall_score numeric(5,2) NOT NULL,
  accuracy_score numeric(5,2),
  completeness_score numeric(5,2),
  citation_quality_score numeric(5,2),
  regulatory_coverage_score numeric(5,2),
  actionability_score numeric(5,2),
  consistency_score numeric(5,2),
  documents_evaluated integer NOT NULL DEFAULT 0,
  findings_count integer NOT NULL DEFAULT 0,
  agree_count integer NOT NULL DEFAULT 0,
  claude_only_count integer NOT NULL DEFAULT 0,
  gpt_only_count integer NOT NULL DEFAULT 0,
  conflict_count integer NOT NULL DEFAULT 0,
  passed_launch_threshold boolean GENERATED ALWAYS AS (overall_score >= 98.0) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quality_score_ledger_tool_idx ON public.quality_score_ledger(tool_name, run_date DESC);
CREATE INDEX quality_score_ledger_threshold_idx ON public.quality_score_ledger(passed_launch_threshold, tool_name);

GRANT SELECT ON public.quality_score_ledger TO authenticated;
GRANT ALL ON public.quality_score_ledger TO service_role;

ALTER TABLE public.quality_score_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read quality score ledger"
  ON public.quality_score_ledger FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert quality score ledger"
  ON public.quality_score_ledger FOR INSERT
  TO service_role
  WITH CHECK (true);