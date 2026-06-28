
CREATE TABLE public.tool_improvement_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_slug text NOT NULL,
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  phase text NOT NULL DEFAULT 'init',
  iteration integer NOT NULL DEFAULT 0,
  max_iterations integer NOT NULL DEFAULT 6,
  target_score numeric NOT NULL DEFAULT 98,
  baseline_score numeric,
  current_score numeric,
  baseline_batch_id uuid,
  current_batch_id uuid,
  top_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_error text,
  quality_run_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT ON public.tool_improvement_cycles TO authenticated;
GRANT ALL ON public.tool_improvement_cycles TO service_role;

ALTER TABLE public.tool_improvement_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read cycles"
  ON public.tool_improvement_cycles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_tool_improvement_cycles_tool ON public.tool_improvement_cycles(tool_slug, started_at DESC);

CREATE TABLE public.quality_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES public.tool_improvement_cycles(id) ON DELETE CASCADE,
  iteration integer NOT NULL DEFAULT 0,
  sample_report_id uuid NOT NULL REFERENCES public.sample_reports(id) ON DELETE CASCADE,
  tool_slug text NOT NULL,
  model text NOT NULL,
  overall_score numeric,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  critical_failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.quality_reviews TO authenticated;
GRANT ALL ON public.quality_reviews TO service_role;

ALTER TABLE public.quality_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read quality reviews"
  ON public.quality_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_quality_reviews_cycle ON public.quality_reviews(cycle_id, iteration);
CREATE INDEX idx_quality_reviews_sample ON public.quality_reviews(sample_report_id);

CREATE OR REPLACE FUNCTION public.tic_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_tic_updated_at
  BEFORE UPDATE ON public.tool_improvement_cycles
  FOR EACH ROW EXECUTE FUNCTION public.tic_touch_updated_at();
