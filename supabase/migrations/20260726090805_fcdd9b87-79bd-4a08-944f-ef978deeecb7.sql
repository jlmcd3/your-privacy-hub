CREATE TABLE public.pattern_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  signature text NOT NULL,
  plan_version text NOT NULL,
  instrument_version text NOT NULL,
  registry_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenario_set text,
  run_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pattern_observations_product_signature_idx
  ON public.pattern_observations (product, signature);
CREATE INDEX pattern_observations_created_at_idx
  ON public.pattern_observations (created_at DESC);

GRANT SELECT ON public.pattern_observations TO authenticated;
GRANT ALL    ON public.pattern_observations TO service_role;

ALTER TABLE public.pattern_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pattern_observations"
  ON public.pattern_observations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));