
CREATE TABLE public.quality_loop3_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_slug TEXT NOT NULL,
  assessment_id UUID,
  owner_id UUID,
  run_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phase TEXT NOT NULL DEFAULT 'revise_dummy',
  pass_number INTEGER NOT NULL DEFAULT 1,
  input_spec JSONB,
  dummy_answers JSONB,
  pre_score NUMERIC,
  post_score NUMERIC,
  items_before INTEGER,
  items_after INTEGER,
  items_resolved INTEGER,
  qc_result JSONB,
  error_message TEXT,
  notes TEXT,
  terminal_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.quality_loop3_runs TO authenticated;
GRANT ALL ON public.quality_loop3_runs TO service_role;

ALTER TABLE public.quality_loop3_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all QL3 runs"
  ON public.quality_loop3_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert QL3 runs"
  ON public.quality_loop3_runs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update QL3 runs"
  ON public.quality_loop3_runs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX quality_loop3_runs_tool_created_idx
  ON public.quality_loop3_runs (tool_slug, created_at DESC);

CREATE INDEX quality_loop3_runs_assessment_idx
  ON public.quality_loop3_runs (assessment_id);

CREATE OR REPLACE FUNCTION public.update_ql3_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quality_loop3_runs_updated_at
  BEFORE UPDATE ON public.quality_loop3_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_ql3_runs_updated_at();
