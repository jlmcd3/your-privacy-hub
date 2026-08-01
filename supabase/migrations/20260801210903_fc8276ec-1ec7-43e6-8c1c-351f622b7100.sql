ALTER TABLE public.enforcement_actions
  ADD COLUMN IF NOT EXISTS authority_class text,
  ADD COLUMN IF NOT EXISTS strat_has_document boolean,
  ADD COLUMN IF NOT EXISTS strat_url_wellformed boolean,
  ADD COLUMN IF NOT EXISTS strat_subject_usable boolean,
  ADD COLUMN IF NOT EXISTS strat_date_parseable boolean,
  ADD COLUMN IF NOT EXISTS stratified_at timestamptz;

CREATE INDEX IF NOT EXISTS enforcement_actions_authority_class_idx
  ON public.enforcement_actions (authority_class);
CREATE INDEX IF NOT EXISTS enforcement_actions_strat_idx
  ON public.enforcement_actions (authority_class, verification_status, strat_has_document);