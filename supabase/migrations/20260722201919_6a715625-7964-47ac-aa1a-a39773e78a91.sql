
CREATE TABLE IF NOT EXISTS public.quality_coverage_cells (
  tool text NOT NULL,
  sector text NOT NULL,
  posture text NOT NULL,
  branch text NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  PRIMARY KEY (tool, sector, posture, branch)
);
GRANT SELECT ON public.quality_coverage_cells TO authenticated;
GRANT ALL ON public.quality_coverage_cells TO service_role;
ALTER TABLE public.quality_coverage_cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coverage cells readable by admins"
  ON public.quality_coverage_cells FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.quality_campaign_digests
  ADD COLUMN IF NOT EXISTS gate_v2_pass boolean,
  ADD COLUMN IF NOT EXISTS gate_v2_reasons jsonb,
  ADD COLUMN IF NOT EXISTS shadow_score numeric,
  ADD COLUMN IF NOT EXISTS coverage_cells_tagged jsonb;
