ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS source_type text;

ALTER TABLE public.enforcement_actions
  DROP CONSTRAINT IF EXISTS enforcement_actions_source_type_chk;

ALTER TABLE public.enforcement_actions
  ADD CONSTRAINT enforcement_actions_source_type_chk
  CHECK (source_type IS NULL OR source_type = ANY (ARRAY[
    'regulator_primary'::text,
    'regulator_press'::text,
    'third_party_tracker'::text,
    'third_party_commentary'::text
  ]));

CREATE INDEX IF NOT EXISTS enforcement_actions_source_type_idx
  ON public.enforcement_actions (source_type);

CREATE INDEX IF NOT EXISTS enforcement_actions_surface_gate_idx
  ON public.enforcement_actions (source_type, verification_status, strat_has_document, authority_class);